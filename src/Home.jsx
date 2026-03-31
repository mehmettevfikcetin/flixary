import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db, auth } from './firebase';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import MediaCard from './components/MediaCard';
import AddToListModal from './components/AddToListModal';
import { showToast } from './components/Toast';
import { fetchWithEnglishTitles, getTitle, API_KEY, fetchTvEpisodeCount } from './utils/tmdbUtils';
import { FaFire, FaStar, FaFilm, FaTv, FaArrowRight, FaClock, FaChartLine, FaPlay, FaCalendar, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const IMAGE_PATH = "https://image.tmdb.org/t/p/w500";
const BACKDROP_PATH = "https://image.tmdb.org/t/p/original";

// TMDB enforces a hard limit of 500 pages
const TMDB_MAX_PAGES = 500;

/**
 * InfiniteHorizontalRow - EXTRACTED AND MEMOIZED COMPONENT
 * 
 * CRITICAL: This component MUST be defined OUTSIDE the Home component to prevent
 * unmounting/remounting on every Home re-render. Inner function components cause
 * React to lose component identity, destroying all internal state including scroll
 * position and loaded items.
 * 
 * This was the ROOT CAUSE of the page reload/reset bug.
 */
const InfiniteHorizontalRow = memo(function InfiniteHorizontalRow({
  rowKey,
  title,
  icon,
  data,
  onFetchMore,
  mediaType,
  seeAllLink,
  onAddToList,
  isInList
}) {
  // Scroll container ref - stable across renders, never stored in state
  const rowRef = useRef(null);
  
  // Store onFetchMore in a ref to avoid dependency issues and re-renders
  const onFetchMoreRef = useRef(onFetchMore);
  useEffect(() => {
    onFetchMoreRef.current = onFetchMore;
  }, [onFetchMore]);
  
  // Track scroll state for button visibility
  const [scrollState, setScrollState] = useState({ canScrollLeft: false, canScrollRight: true });
  
  const SCROLL_AMOUNT = 800;
  const FETCH_THRESHOLD = 6;

  // Update scroll capabilities - uses useCallback for stability
  const updateScrollState = useCallback(() => {
    if (!rowRef.current) return;
    
    const container = rowRef.current;
    const maxScroll = container.scrollWidth - container.clientWidth;
    const currentScroll = container.scrollLeft;
    
    // Check if we can fetch more based on pagination limits
    const hasMoreToFetch = data.hasMore && 
                           data.page < data.totalPages && 
                           data.page < TMDB_MAX_PAGES;
    
    setScrollState({
      canScrollLeft: currentScroll > 5, // Small threshold to avoid floating point issues
      canScrollRight: currentScroll < maxScroll - 5 || hasMoreToFetch
    });
  }, [data.hasMore, data.page, data.totalPages]);

  // Update scroll state when items change or on resize
  useEffect(() => {
    updateScrollState();
    window.addEventListener('resize', updateScrollState);
    return () => window.removeEventListener('resize', updateScrollState);
  }, [updateScrollState, data.items.length]);

  // Handle scroll events - updates state for button visibility
  const handleScroll = useCallback(() => {
    updateScrollState();
  }, [updateScrollState]);

  // Left scroll handler with mandatory event prevention
  const handleScrollLeft = useCallback((e) => {
    // MANDATORY - prevent any form submission or navigation
    e.preventDefault();
    e.stopPropagation();
    
    // Use scrollBy for simple, stable scrolling
    if (rowRef.current) {
      rowRef.current.scrollBy({ left: -SCROLL_AMOUNT, behavior: 'smooth' });
    }
  }, []);

  // Right scroll handler with event prevention and fetch logic
  // Uses refs for data values to avoid callback identity changes triggering re-renders
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);
  
  const handleScrollRight = useCallback((e) => {
    // MANDATORY - prevent any form submission or navigation
    e.preventDefault();
    e.stopPropagation();
    
    if (!rowRef.current) return;
    
    const container = rowRef.current;
    
    // Use scrollBy for simple, stable scrolling
    container.scrollBy({ left: SCROLL_AMOUNT, behavior: 'smooth' });
    
    // Read current data from ref to avoid stale closure issues
    const currentData = dataRef.current;
    
    // Check if we need to fetch more items
    const cardWidth = 180;
    const visibleCards = Math.floor(container.clientWidth / cardWidth);
    const currentIndex = Math.floor((container.scrollLeft + SCROLL_AMOUNT) / cardWidth);
    const remainingCards = currentData.items.length - currentIndex - visibleCards;
    
    // Only fetch if within TMDB pagination limits
    const canFetchMore = currentData.hasMore && 
                         !currentData.loading && 
                         currentData.page < currentData.totalPages && 
                         currentData.page < TMDB_MAX_PAGES;
    
    if (remainingCards < FETCH_THRESHOLD && canFetchMore) {
      onFetchMoreRef.current();
    }
  }, []); // Empty deps - uses refs for all dynamic values

  // Calculate if we've reached the pagination boundary
  const isAtPaginationLimit = data.page >= data.totalPages || data.page >= TMDB_MAX_PAGES;

  return (
    <section className="content-section">
      <div className="section-header">
        <h2>{icon} {title}</h2>
        {seeAllLink && (
          <Link to={seeAllLink} className="see-all">
            Tümünü Gör <FaArrowRight />
          </Link>
        )}
      </div>
      <div className="horizontal-row-container">
        {scrollState.canScrollLeft && (
          <button 
            type="button"
            className="row-arrow row-arrow-left"
            onClick={handleScrollLeft}
            aria-label="Sola kaydır"
          >
            <FaChevronLeft />
          </button>
        )}
        <div 
          className="media-row" 
          ref={rowRef}
          onScroll={handleScroll}
        >
          {data.items.map((item, index) => (
            <MediaCard
              key={`${rowKey}-${item.id}-${index}`}
              item={item}
              type={mediaType}
              onAddToList={onAddToList}
              isInList={isInList(item.id, mediaType)}
            />
          ))}
          {data.loading && (
            <div className="row-loading-indicator">
              <div className="loader-small"></div>
            </div>
          )}
        </div>
        {scrollState.canScrollRight && (
          <button 
            type="button"
            className="row-arrow row-arrow-right"
            onClick={handleScrollRight}
            disabled={isAtPaginationLimit}
            style={isAtPaginationLimit ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
            aria-label="Sağa kaydır"
          >
            <FaChevronRight />
          </button>
        )}
      </div>
    </section>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo - only re-render when data actually changes
  // This prevents re-renders caused by callback reference changes
  return (
    prevProps.rowKey === nextProps.rowKey &&
    prevProps.title === nextProps.title &&
    prevProps.mediaType === nextProps.mediaType &&
    prevProps.seeAllLink === nextProps.seeAllLink &&
    prevProps.data.items === nextProps.data.items &&
    prevProps.data.page === nextProps.data.page &&
    prevProps.data.totalPages === nextProps.data.totalPages &&
    prevProps.data.hasMore === nextProps.data.hasMore &&
    prevProps.data.loading === nextProps.data.loading
  );
});

const Home = () => {
  const navigate = useNavigate();
  // FIX 2: Each row state now includes totalPages for proper pagination boundary handling
  const [trendingMoviesData, setTrendingMoviesData] = useState({ items: [], page: 1, totalPages: 1, hasMore: true, loading: false });
  const [trendingSeriesData, setTrendingSeriesData] = useState({ items: [], page: 1, totalPages: 1, hasMore: true, loading: false });
  const [popularMoviesData, setPopularMoviesData] = useState({ items: [], page: 1, totalPages: 1, hasMore: true, loading: false });
  const [popularSeriesData, setPopularSeriesData] = useState({ items: [], page: 1, totalPages: 1, hasMore: true, loading: false });
  const [topRatedMoviesData, setTopRatedMoviesData] = useState({ items: [], page: 1, totalPages: 1, hasMore: true, loading: false });
  const [topRatedSeriesData, setTopRatedSeriesData] = useState({ items: [], page: 1, totalPages: 1, hasMore: true, loading: false });
  const [upcomingMoviesData, setUpcomingMoviesData] = useState({ items: [], page: 1, totalPages: 1, hasMore: true, loading: false });
  const [onAirSeriesData, setOnAirSeriesData] = useState({ items: [], page: 1, totalPages: 1, hasMore: true, loading: false });
  
  const [featuredItem, setFeaturedItem] = useState(null);
  const [watchingList, setWatchingList] = useState([]);
  const [recentlyAdded, setRecentlyAdded] = useState([]);
  const [userList, setUserList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedType, setSelectedType] = useState('movie');

  useEffect(() => {
    fetchAllRows();
    const cleanup = fetchUserLists();
    return cleanup;
  }, []);

  // FIX 2: Fetch all rows including new ones - now stores totalPages for pagination limits
  const fetchAllRows = async () => {
    try {
      const [
        trendingMovies, trendingSeries,
        popularMovies, popularSeries,
        topRatedMovies, topRatedSeries,
        upcomingMovies, onAirSeries
      ] = await Promise.all([
        fetchWithEnglishTitles('https://api.themoviedb.org/3/trending/movie/day', { page: 1 }),
        fetchWithEnglishTitles('https://api.themoviedb.org/3/trending/tv/day', { page: 1 }),
        fetchWithEnglishTitles('https://api.themoviedb.org/3/movie/popular', { page: 1 }),
        fetchWithEnglishTitles('https://api.themoviedb.org/3/tv/popular', { page: 1 }),
        fetchWithEnglishTitles('https://api.themoviedb.org/3/movie/top_rated', { page: 1 }),
        fetchWithEnglishTitles('https://api.themoviedb.org/3/tv/top_rated', { page: 1 }),
        fetchWithEnglishTitles('https://api.themoviedb.org/3/movie/upcoming', { page: 1 }),
        fetchWithEnglishTitles('https://api.themoviedb.org/3/tv/on_the_air', { page: 1 })
      ]);

      // FIX 2: Store totalPages capped at TMDB_MAX_PAGES for each row
      const capTotalPages = (tp) => Math.min(tp || 1, TMDB_MAX_PAGES);
      
      setTrendingMoviesData({ items: trendingMovies.results, page: 1, totalPages: capTotalPages(trendingMovies.total_pages), hasMore: trendingMovies.total_pages > 1, loading: false });
      setTrendingSeriesData({ items: trendingSeries.results, page: 1, totalPages: capTotalPages(trendingSeries.total_pages), hasMore: trendingSeries.total_pages > 1, loading: false });
      setPopularMoviesData({ items: popularMovies.results, page: 1, totalPages: capTotalPages(popularMovies.total_pages), hasMore: popularMovies.total_pages > 1, loading: false });
      setPopularSeriesData({ items: popularSeries.results, page: 1, totalPages: capTotalPages(popularSeries.total_pages), hasMore: popularSeries.total_pages > 1, loading: false });
      setTopRatedMoviesData({ items: topRatedMovies.results, page: 1, totalPages: capTotalPages(topRatedMovies.total_pages), hasMore: topRatedMovies.total_pages > 1, loading: false });
      setTopRatedSeriesData({ items: topRatedSeries.results, page: 1, totalPages: capTotalPages(topRatedSeries.total_pages), hasMore: topRatedSeries.total_pages > 1, loading: false });
      setUpcomingMoviesData({ items: upcomingMovies.results, page: 1, totalPages: capTotalPages(upcomingMovies.total_pages), hasMore: upcomingMovies.total_pages > 1, loading: false });
      setOnAirSeriesData({ items: onAirSeries.results, page: 1, totalPages: capTotalPages(onAirSeries.total_pages), hasMore: onAirSeries.total_pages > 1, loading: false });
      
      // Select random featured item from trending
      const allTrending = [...trendingMovies.results.slice(0, 5), ...trendingSeries.results.slice(0, 5)];
      const randomIndex = Math.floor(Math.random() * allTrending.length);
      const featured = allTrending[randomIndex];
      featured.media_type = trendingMovies.results.includes(featured) ? 'movie' : 'tv';
      setFeaturedItem(featured);
      
    } catch (error) {
      console.error("[Flixary] Initial data fetch failed:", error);
    } finally {
      setLoading(false);
    }
  };

  // FIX 2 & 4: Function to fetch more items with pagination guards and safe error handling
  // Uses functional setState to always read latest state, avoiding stale closures
  const fetchMoreForRow = useCallback(async (endpoint, getDataRef, setData) => {
    // Get current data from ref to ensure fresh state
    const data = getDataRef.current;
    
    // Guard against fetching beyond TMDB limits
    if (data.loading) return;
    if (!data.hasMore) return;
    if (data.page >= data.totalPages) return;
    if (data.page >= TMDB_MAX_PAGES) return;
    
    setData(prev => ({ ...prev, loading: true }));
    
    try {
      const nextPage = data.page + 1;
      const response = await fetchWithEnglishTitles(endpoint, { page: nextPage });
      
      // Calculate if there are more pages, respecting TMDB's 500 limit
      const cappedTotalPages = Math.min(response.total_pages || 1, TMDB_MAX_PAGES);
      const canFetchMore = nextPage < cappedTotalPages;
      
      setData(prev => ({
        items: [...prev.items, ...response.results],
        page: nextPage,
        totalPages: cappedTotalPages,
        hasMore: canFetchMore,
        loading: false
      }));
    } catch (error) {
      // Silent error handling - NEVER reset items or page state
      if (error.name === 'AbortError' || error.name === 'CanceledError') {
        return;
      }
      console.error("[Flixary] Carousel fetch error:", error);
      setData(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const fetchUserLists = () => {
    if (!auth.currentUser) return () => {};

    // Kullanıcının tüm listesi
    const allQuery = query(
      collection(db, "watchlist"),
      where("uid", "==", auth.currentUser.uid)
    );

    const unsubAll = onSnapshot(allQuery, (snapshot) => {
      const items = [];
      snapshot.forEach(doc => items.push({ ...doc.data(), docId: doc.id }));
      setUserList(items);
      
      // İzleniyor listesi
      setWatchingList(items.filter(i => i.status === 'watching'));
      
      // Son eklenenler
      const sorted = [...items].sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return dateB - dateA;
      });
      setRecentlyAdded(sorted.slice(0, 6));
    });

    return () => unsubAll();
  };

  const isInList = (tmdbId, mediaType) => {
    return userList.some(item => item.tmdbId === tmdbId && item.mediaType === mediaType);
  };

  // Modal açma fonksiyonu
  const openAddModal = (item, type) => {
    if (!auth.currentUser) {
      navigate('/login');
      return;
    }
    
    const mediaType = type === 'movie' ? 'movie' : 'tv';
    if (isInList(item.id, mediaType)) {
      showToast("Bu yapım zaten listenizde!", "info");
      return;
    }
    
    setSelectedItem(item);
    setSelectedType(type);
    setShowAddModal(true);
  };

  // Listeye ekleme fonksiyonu
  const addToList = async ({ status, customListId, userRating, startDate, endDate, notes }) => {
    if (!selectedItem) return;
    
    const mediaType = selectedType === 'movie' ? 'movie' : 'tv';
    
    // Başlık seçimi: İngilizce > Orijinal > Türkçe
    const title = getTitle(selectedItem, mediaType);
    
    const releaseDate = mediaType === 'movie' ? selectedItem.release_date : selectedItem.first_air_date;

    try {
      // Dizi ise bölüm sayısını çek
      let episodeCount = null;
      let seasonCount = null;
      if (mediaType === 'tv') {
        const tvDetails = await fetchTvEpisodeCount(selectedItem.id);
        episodeCount = tvDetails.episodeCount;
        seasonCount = tvDetails.seasonCount;
      }

      // Ana listeye ekle
      const docRef = await addDoc(collection(db, "watchlist"), {
        uid: auth.currentUser.uid,
        tmdbId: selectedItem.id,
        mediaType: mediaType,
        title: title,
        poster: selectedItem.poster_path,
        backdrop: selectedItem.backdrop_path,
        rating: selectedItem.vote_average,
        releaseDate: releaseDate,
        genres: selectedItem.genre_ids || [],
        runtime: mediaType === 'movie' ? selectedItem.runtime : null,
        episodeCount: episodeCount,
        seasonCount: seasonCount,
        status: status,
        userRating: userRating || null,
        progress: (status === 'completed' && mediaType === 'tv' && episodeCount) ? episodeCount : 0,
        notes: notes || '',
        startDate: startDate || null,
        endDate: endDate || null,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Özel listeye de ekle
      if (customListId) {
        await updateDoc(doc(db, "customLists", customListId), {
          items: arrayUnion({
            docId: docRef.id,
            tmdbId: selectedItem.id,
            mediaType: mediaType,
            title: title,
            poster: selectedItem.poster_path
          }),
          itemCount: increment(1)
        });
      }
      
      showToast(`"${title}" listenize eklendi!`, "success");
      setShowAddModal(false);
      setSelectedItem(null);
    } catch (error) {
      console.error("Ekleme hatası:", error);
      showToast("Ekleme başarısız oldu", "error");
    }
  };

  // Stable callback for isInList check (passed to memoized component)
  const isInListCallback = useCallback((tmdbId, mediaType) => {
    return userList.some(item => item.tmdbId === tmdbId && item.mediaType === mediaType);
  }, [userList]);

  // Refs to hold current data state - allows stable callbacks that read fresh data
  const trendingMoviesRef = useRef(trendingMoviesData);
  const trendingSeriesRef = useRef(trendingSeriesData);
  const popularMoviesRef = useRef(popularMoviesData);
  const popularSeriesRef = useRef(popularSeriesData);
  const topRatedMoviesRef = useRef(topRatedMoviesData);
  const topRatedSeriesRef = useRef(topRatedSeriesData);
  const upcomingMoviesRef = useRef(upcomingMoviesData);
  const onAirSeriesRef = useRef(onAirSeriesData);

  // Keep refs in sync with state
  useEffect(() => { trendingMoviesRef.current = trendingMoviesData; }, [trendingMoviesData]);
  useEffect(() => { trendingSeriesRef.current = trendingSeriesData; }, [trendingSeriesData]);
  useEffect(() => { popularMoviesRef.current = popularMoviesData; }, [popularMoviesData]);
  useEffect(() => { popularSeriesRef.current = popularSeriesData; }, [popularSeriesData]);
  useEffect(() => { topRatedMoviesRef.current = topRatedMoviesData; }, [topRatedMoviesData]);
  useEffect(() => { topRatedSeriesRef.current = topRatedSeriesData; }, [topRatedSeriesData]);
  useEffect(() => { upcomingMoviesRef.current = upcomingMoviesData; }, [upcomingMoviesData]);
  useEffect(() => { onAirSeriesRef.current = onAirSeriesData; }, [onAirSeriesData]);

  // Stable fetch callbacks - never change identity, use refs to access current data
  const fetchMoreTrendingMovies = useCallback(() => {
    fetchMoreForRow('https://api.themoviedb.org/3/trending/movie/day', trendingMoviesRef, setTrendingMoviesData);
  }, [fetchMoreForRow]);

  const fetchMoreTrendingSeries = useCallback(() => {
    fetchMoreForRow('https://api.themoviedb.org/3/trending/tv/day', trendingSeriesRef, setTrendingSeriesData);
  }, [fetchMoreForRow]);

  const fetchMorePopularMovies = useCallback(() => {
    fetchMoreForRow('https://api.themoviedb.org/3/movie/popular', popularMoviesRef, setPopularMoviesData);
  }, [fetchMoreForRow]);

  const fetchMorePopularSeries = useCallback(() => {
    fetchMoreForRow('https://api.themoviedb.org/3/tv/popular', popularSeriesRef, setPopularSeriesData);
  }, [fetchMoreForRow]);

  const fetchMoreTopRatedMovies = useCallback(() => {
    fetchMoreForRow('https://api.themoviedb.org/3/movie/top_rated', topRatedMoviesRef, setTopRatedMoviesData);
  }, [fetchMoreForRow]);

  const fetchMoreTopRatedSeries = useCallback(() => {
    fetchMoreForRow('https://api.themoviedb.org/3/tv/top_rated', topRatedSeriesRef, setTopRatedSeriesData);
  }, [fetchMoreForRow]);

  const fetchMoreUpcomingMovies = useCallback(() => {
    fetchMoreForRow('https://api.themoviedb.org/3/movie/upcoming', upcomingMoviesRef, setUpcomingMoviesData);
  }, [fetchMoreForRow]);

  const fetchMoreOnAirSeries = useCallback(() => {
    fetchMoreForRow('https://api.themoviedb.org/3/tv/on_the_air', onAirSeriesRef, setOnAirSeriesData);
  }, [fetchMoreForRow]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p>Yükleniyor...</p>
      </div>
    );
  }

  const title = featuredItem ? getTitle(featuredItem, featuredItem?.media_type) : '';
  const mediaType = featuredItem?.media_type;

  return (
    <div className="home-page">
      {/* Hero Section */}
      {featuredItem && (
        <section className="hero-section">
          <div 
            className="hero-backdrop"
            style={{ 
              backgroundImage: featuredItem.backdrop_path 
                ? `url(${BACKDROP_PATH}${featuredItem.backdrop_path})` 
                : 'none'
            }}
          >
            <div className="hero-overlay" />
          </div>
          <div className="hero-content">
            <span className="hero-badge">
              {mediaType === 'movie' ? '🎬 Film' : '📺 Dizi'} • Trend
            </span>
            <h1 className="hero-title">{title}</h1>
            <p className="hero-overview">
              {featuredItem.overview?.slice(0, 200)}
              {featuredItem.overview?.length > 200 ? '...' : ''}
            </p>
            <div className="hero-meta">
              <span><FaStar className="star" /> {featuredItem.vote_average?.toFixed(1)}</span>
              <span>{featuredItem.release_date?.split('-')[0] || featuredItem.first_air_date?.split('-')[0]}</span>
            </div>
            <div className="hero-actions">
              <Link to={`/${mediaType}/${featuredItem.id}`} className="btn-primary">
                Detayları Gör
              </Link>
              <button 
                className="btn-secondary"
                onClick={() => openAddModal(featuredItem, mediaType)}
              >
                + Listeye Ekle
              </button>
            </div>
          </div>
        </section>
      )}

      {/* İzlemeye Devam Et */}
      {watchingList.length > 0 && (
        <section className="content-section watching-section">
          <div className="section-header">
            <h2><FaClock /> İzlemeye Devam Et</h2>
            <Link to="/profile" className="see-all">
              Tümünü Gör <FaArrowRight />
            </Link>
          </div>
          <div className="media-row">
            {watchingList.map(item => (
              <Link 
                to={`/${item.mediaType}/${item.tmdbId}`} 
                key={item.docId} 
                className="watching-card"
              >
                <img 
                  src={item.poster ? IMAGE_PATH + item.poster : 'https://via.placeholder.com/200x300'} 
                  alt={item.title}
                />
                <div className="watching-info">
                  <span className="watching-title">{item.title}</span>
                  {item.mediaType === 'tv' && item.progress > 0 && (
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ 
                          width: item.episodeCount 
                            ? `${(item.progress / item.episodeCount) * 100}%` 
                            : '0%' 
                        }}
                      />
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Son Eklenenler */}
      {recentlyAdded.length > 0 && (
        <section className="content-section">
          <div className="section-header">
            <h2><FaChartLine /> Listeme Son Eklenenler</h2>
            <Link to="/profile" className="see-all">
              Tümünü Gör <FaArrowRight />
            </Link>
          </div>
          <div className="media-row">
            {recentlyAdded.map(item => (
              <Link 
                to={`/${item.mediaType}/${item.tmdbId}`} 
                key={item.docId} 
                className="recent-card"
              >
                <img 
                  src={item.poster ? IMAGE_PATH + item.poster : 'https://via.placeholder.com/200x300'} 
                  alt={item.title}
                />
                <div className="recent-info">
                  <span className="media-type-badge">
                    {item.mediaType === 'movie' ? '🎬' : '📺'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Trend Filmler */}
      <InfiniteHorizontalRow
        rowKey="trending-movies"
        title="Trend Filmler"
        icon={<FaFire className="trend-icon" />}
        data={trendingMoviesData}
        onFetchMore={fetchMoreTrendingMovies}
        mediaType="movie"
        seeAllLink="/movies"
        onAddToList={openAddModal}
        isInList={isInListCallback}
      />

      {/* Popular Movies */}
      <InfiniteHorizontalRow
        rowKey="popular-movies"
        title="Popüler Filmler"
        icon={<FaPlay className="section-icon popular" />}
        data={popularMoviesData}
        onFetchMore={fetchMorePopularMovies}
        mediaType="movie"
        seeAllLink="/movies"
        onAddToList={openAddModal}
        isInList={isInListCallback}
      />

      {/* Top Rated Movies */}
      <InfiniteHorizontalRow
        rowKey="top-rated-movies"
        title="En Çok Beğenilen Filmler"
        icon={<FaStar className="section-icon top" />}
        data={topRatedMoviesData}
        onFetchMore={fetchMoreTopRatedMovies}
        mediaType="movie"
        seeAllLink="/movies"
        onAddToList={openAddModal}
        isInList={isInListCallback}
      />

      {/* Upcoming Movies */}
      <InfiniteHorizontalRow
        rowKey="upcoming-movies"
        title="Yakında Vizyonda"
        icon={<FaCalendar className="section-icon upcoming" />}
        data={upcomingMoviesData}
        onFetchMore={fetchMoreUpcomingMovies}
        mediaType="movie"
        seeAllLink="/movies"
        onAddToList={openAddModal}
        isInList={isInListCallback}
      />

      {/* Trend Diziler */}
      <InfiniteHorizontalRow
        rowKey="trending-series"
        title="Trend Diziler"
        icon={<FaFire className="trend-icon" />}
        data={trendingSeriesData}
        onFetchMore={fetchMoreTrendingSeries}
        mediaType="tv"
        seeAllLink="/series"
        onAddToList={openAddModal}
        isInList={isInListCallback}
      />

      {/* Popular Series */}
      <InfiniteHorizontalRow
        rowKey="popular-series"
        title="Popüler Diziler"
        icon={<FaPlay className="section-icon popular" />}
        data={popularSeriesData}
        onFetchMore={fetchMorePopularSeries}
        mediaType="tv"
        seeAllLink="/series"
        onAddToList={openAddModal}
        isInList={isInListCallback}
      />

      {/* Top Rated Series */}
      <InfiniteHorizontalRow
        rowKey="top-rated-series"
        title="En Çok Beğenilen Diziler"
        icon={<FaStar className="section-icon top" />}
        data={topRatedSeriesData}
        onFetchMore={fetchMoreTopRatedSeries}
        mediaType="tv"
        seeAllLink="/series"
        onAddToList={openAddModal}
        isInList={isInListCallback}
      />

      {/* On Air Series */}
      <InfiniteHorizontalRow
        rowKey="on-air-series"
        title="Şu Anda Yayında"
        icon={<FaCalendar className="section-icon upcoming" />}
        data={onAirSeriesData}
        onFetchMore={fetchMoreOnAirSeries}
        mediaType="tv"
        seeAllLink="/series"
        onAddToList={openAddModal}
        isInList={isInListCallback}
      />

      {/* Keşfet CTA */}
      <section className="discover-cta">
        <div className="cta-content">
          <h2>Daha fazlasını keşfet</h2>
          <p>Binlerce film ve dizi arasından seçim yap</p>
          <div className="cta-buttons">
            <Link to="/movies" className="cta-btn movies">
              <FaFilm /> Filmler
            </Link>
            <Link to="/series" className="cta-btn series">
              <FaTv /> Diziler
            </Link>
          </div>
        </div>
      </section>

      {/* Add to List Modal */}
      <AddToListModal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setSelectedItem(null); }}
        onConfirm={addToList}
        item={selectedItem}
        type={selectedType}
        title={selectedType === 'movie' ? selectedItem?.title : selectedItem?.name}
      />
    </div>
  );
};

export default Home;