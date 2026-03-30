import React, { useState, useEffect, useRef } from 'react';
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

const Home = () => {
  const navigate = useNavigate();
  // FIX 3 & 4: Each row has its own state with items, page, hasMore, loading
  const [trendingMoviesData, setTrendingMoviesData] = useState({ items: [], page: 1, hasMore: true, loading: false });
  const [trendingSeriesData, setTrendingSeriesData] = useState({ items: [], page: 1, hasMore: true, loading: false });
  const [popularMoviesData, setPopularMoviesData] = useState({ items: [], page: 1, hasMore: true, loading: false });
  const [popularSeriesData, setPopularSeriesData] = useState({ items: [], page: 1, hasMore: true, loading: false });
  const [topRatedMoviesData, setTopRatedMoviesData] = useState({ items: [], page: 1, hasMore: true, loading: false });
  const [topRatedSeriesData, setTopRatedSeriesData] = useState({ items: [], page: 1, hasMore: true, loading: false });
  const [upcomingMoviesData, setUpcomingMoviesData] = useState({ items: [], page: 1, hasMore: true, loading: false });
  const [onAirSeriesData, setOnAirSeriesData] = useState({ items: [], page: 1, hasMore: true, loading: false });
  
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

  // FIX 3: Fetch all rows including new ones
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

      setTrendingMoviesData({ items: trendingMovies.results, page: 1, hasMore: trendingMovies.total_pages > 1, loading: false });
      setTrendingSeriesData({ items: trendingSeries.results, page: 1, hasMore: trendingSeries.total_pages > 1, loading: false });
      setPopularMoviesData({ items: popularMovies.results, page: 1, hasMore: popularMovies.total_pages > 1, loading: false });
      setPopularSeriesData({ items: popularSeries.results, page: 1, hasMore: popularSeries.total_pages > 1, loading: false });
      setTopRatedMoviesData({ items: topRatedMovies.results, page: 1, hasMore: topRatedMovies.total_pages > 1, loading: false });
      setTopRatedSeriesData({ items: topRatedSeries.results, page: 1, hasMore: topRatedSeries.total_pages > 1, loading: false });
      setUpcomingMoviesData({ items: upcomingMovies.results, page: 1, hasMore: upcomingMovies.total_pages > 1, loading: false });
      setOnAirSeriesData({ items: onAirSeries.results, page: 1, hasMore: onAirSeries.total_pages > 1, loading: false });
      
      // Select random featured item from trending
      const allTrending = [...trendingMovies.results.slice(0, 5), ...trendingSeries.results.slice(0, 5)];
      const randomIndex = Math.floor(Math.random() * allTrending.length);
      const featured = allTrending[randomIndex];
      featured.media_type = trendingMovies.results.includes(featured) ? 'movie' : 'tv';
      setFeaturedItem(featured);
      
    } catch (error) {
      console.error("Veri çekme hatası:", error);
    } finally {
      setLoading(false);
    }
  };

  // FIX 4: Function to fetch more items for any row
  const fetchMoreForRow = async (endpoint, data, setData) => {
    if (!data.hasMore || data.loading) return;
    
    setData(prev => ({ ...prev, loading: true }));
    
    try {
      const nextPage = data.page + 1;
      const response = await fetchWithEnglishTitles(endpoint, { page: nextPage });
      setData(prev => ({
        items: [...prev.items, ...response.results],
        page: nextPage,
        hasMore: nextPage < response.total_pages,
        loading: false
      }));
    } catch (error) {
      console.error("Daha fazla yükleme hatası:", error);
      setData(prev => ({ ...prev, loading: false }));
    }
  };

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

  // FIX 1 & 4: Reusable Infinite Horizontal Row with proper arrow navigation
  const InfiniteHorizontalRow = ({ rowKey, title, icon, data, setData, endpoint, mediaType, seeAllLink }) => {
    const rowRef = useRef(null);
    const [scrollPosition, setScrollPosition] = useState(0);
    const [maxScroll, setMaxScroll] = useState(0);
    const SCROLL_AMOUNT = 800;
    const FETCH_THRESHOLD = 6;

    useEffect(() => {
      const updateMaxScroll = () => {
        if (rowRef.current) {
          setMaxScroll(rowRef.current.scrollWidth - rowRef.current.clientWidth);
        }
      };
      updateMaxScroll();
      window.addEventListener('resize', updateMaxScroll);
      return () => window.removeEventListener('resize', updateMaxScroll);
    }, [data.items.length]);

    const handleScroll = () => {
      if (rowRef.current) {
        setScrollPosition(rowRef.current.scrollLeft);
      }
    };

    // FIX 1: Proper button with type="button" and event prevention
    const scrollLeft = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (rowRef.current) {
        rowRef.current.scrollBy({ left: -SCROLL_AMOUNT, behavior: 'smooth' });
      }
    };

    // FIX 1: Proper button with type="button" and event prevention
    const scrollRight = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (rowRef.current) {
        rowRef.current.scrollBy({ left: SCROLL_AMOUNT, behavior: 'smooth' });
        
        // Check if we need to fetch more items
        const cardWidth = 180;
        const visibleCards = Math.floor(rowRef.current.clientWidth / cardWidth);
        const currentIndex = Math.floor((rowRef.current.scrollLeft + SCROLL_AMOUNT) / cardWidth);
        const remainingCards = data.items.length - currentIndex - visibleCards;
        
        if (remainingCards < FETCH_THRESHOLD && data.hasMore && !data.loading) {
          fetchMoreForRow(endpoint, data, setData);
        }
      }
    };

    const canScrollLeft = scrollPosition > 0;
    const canScrollRight = scrollPosition < maxScroll || data.hasMore;

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
          {canScrollLeft && (
            <button 
              type="button"
              className="row-arrow row-arrow-left"
              onClick={scrollLeft}
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
            {data.items.map((item) => (
              <MediaCard
                key={`${rowKey}-${item.id}`}
                item={item}
                type={mediaType}
                onAddToList={openAddModal}
                isInList={isInList(item.id, mediaType)}
              />
            ))}
            {data.loading && (
              <div className="row-loading-indicator">
                <div className="loader-small"></div>
              </div>
            )}
          </div>
          {canScrollRight && (
            <button 
              type="button"
              className="row-arrow row-arrow-right"
              onClick={scrollRight}
              aria-label="Sağa kaydır"
            >
              <FaChevronRight />
            </button>
          )}
        </div>
      </section>
    );
  };

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
        key="trending-movies"
        rowKey="trending-movies"
        title="Trend Filmler"
        icon={<FaFire className="trend-icon" />}
        data={trendingMoviesData}
        setData={setTrendingMoviesData}
        endpoint="https://api.themoviedb.org/3/trending/movie/day"
        mediaType="movie"
        seeAllLink="/movies"
      />

      {/* Popular Movies - FIX 3: New row */}
      <InfiniteHorizontalRow
        key="popular-movies"
        rowKey="popular-movies"
        title="Popüler Filmler"
        icon={<FaPlay className="section-icon popular" />}
        data={popularMoviesData}
        setData={setPopularMoviesData}
        endpoint="https://api.themoviedb.org/3/movie/popular"
        mediaType="movie"
        seeAllLink="/movies"
      />

      {/* Top Rated Movies - FIX 3: New row */}
      <InfiniteHorizontalRow
        key="top-rated-movies"
        rowKey="top-rated-movies"
        title="En Çok Beğenilen Filmler"
        icon={<FaStar className="section-icon top" />}
        data={topRatedMoviesData}
        setData={setTopRatedMoviesData}
        endpoint="https://api.themoviedb.org/3/movie/top_rated"
        mediaType="movie"
        seeAllLink="/movies"
      />

      {/* Upcoming Movies - FIX 3: New row */}
      <InfiniteHorizontalRow
        key="upcoming-movies"
        rowKey="upcoming-movies"
        title="Yakında Vizyonda"
        icon={<FaCalendar className="section-icon upcoming" />}
        data={upcomingMoviesData}
        setData={setUpcomingMoviesData}
        endpoint="https://api.themoviedb.org/3/movie/upcoming"
        mediaType="movie"
        seeAllLink="/movies"
      />

      {/* Trend Diziler */}
      <InfiniteHorizontalRow
        key="trending-series"
        rowKey="trending-series"
        title="Trend Diziler"
        icon={<FaFire className="trend-icon" />}
        data={trendingSeriesData}
        setData={setTrendingSeriesData}
        endpoint="https://api.themoviedb.org/3/trending/tv/day"
        mediaType="tv"
        seeAllLink="/series"
      />

      {/* Popular Series - FIX 3: New row */}
      <InfiniteHorizontalRow
        key="popular-series"
        rowKey="popular-series"
        title="Popüler Diziler"
        icon={<FaPlay className="section-icon popular" />}
        data={popularSeriesData}
        setData={setPopularSeriesData}
        endpoint="https://api.themoviedb.org/3/tv/popular"
        mediaType="tv"
        seeAllLink="/series"
      />

      {/* Top Rated Series - FIX 3: New row */}
      <InfiniteHorizontalRow
        key="top-rated-series"
        rowKey="top-rated-series"
        title="En Çok Beğenilen Diziler"
        icon={<FaStar className="section-icon top" />}
        data={topRatedSeriesData}
        setData={setTopRatedSeriesData}
        endpoint="https://api.themoviedb.org/3/tv/top_rated"
        mediaType="tv"
        seeAllLink="/series"
      />

      {/* On Air Series - FIX 3: New row */}
      <InfiniteHorizontalRow
        key="on-air-series"
        rowKey="on-air-series"
        title="Şu Anda Yayında"
        icon={<FaCalendar className="section-icon upcoming" />}
        data={onAirSeriesData}
        setData={setOnAirSeriesData}
        endpoint="https://api.themoviedb.org/3/tv/on_the_air"
        mediaType="tv"
        seeAllLink="/series"
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