import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, getDocs, doc, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import MediaCard from '../components/MediaCard';
import AddToListModal from '../components/AddToListModal';
import { showToast } from '../components/Toast';
import { fetchWithEnglishTitles, getTitle, API_KEY, fetchTvEpisodeCount } from '../utils/tmdbUtils';
import { FaFilter, FaSortAmountDown, FaTimes, FaChevronDown, FaChevronUp } from 'react-icons/fa';

// Genre mappings for TMDB API
const MOVIE_GENRES = [
  { id: 28, name: 'Aksiyon' },
  { id: 12, name: 'Macera' },
  { id: 16, name: 'Animasyon' },
  { id: 35, name: 'Komedi' },
  { id: 80, name: 'Suç' },
  { id: 99, name: 'Belgesel' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Aile' },
  { id: 14, name: 'Fantastik' },
  { id: 36, name: 'Tarih' },
  { id: 27, name: 'Korku' },
  { id: 10402, name: 'Müzik' },
  { id: 9648, name: 'Gizem' },
  { id: 10749, name: 'Romantik' },
  { id: 878, name: 'Bilim Kurgu' },
  { id: 53, name: 'Gerilim' },
  { id: 10752, name: 'Savaş' },
  { id: 37, name: 'Western' },
];

const TV_GENRES = [
  { id: 10759, name: 'Aksiyon & Macera' },
  { id: 16, name: 'Animasyon' },
  { id: 35, name: 'Komedi' },
  { id: 80, name: 'Suç' },
  { id: 99, name: 'Belgesel' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Aile' },
  { id: 10762, name: 'Çocuk' },
  { id: 9648, name: 'Gizem' },
  { id: 10763, name: 'Haber' },
  { id: 10764, name: 'Reality' },
  { id: 10765, name: 'Bilim Kurgu & Fantastik' },
  { id: 10766, name: 'Pembe Dizi' },
  { id: 10767, name: 'Talk Show' },
  { id: 10768, name: 'Savaş & Politik' },
  { id: 37, name: 'Western' },
];

// Sort options for TMDB discover API
const SORT_OPTIONS = [
  { value: 'popularity.desc', label: 'Popülerlik (Yüksek)' },
  { value: 'popularity.asc', label: 'Popülerlik (Düşük)' },
  { value: 'vote_average.desc', label: 'Puan (Yüksek)' },
  { value: 'vote_average.asc', label: 'Puan (Düşük)' },
  { value: 'primary_release_date.desc', label: 'Tarih (Yeni)' },
  { value: 'primary_release_date.asc', label: 'Tarih (Eski)' },
  { value: 'revenue.desc', label: 'Hasılat (Yüksek)' },
];

// Language options
const LANGUAGES = [
  { code: '', name: 'Tüm Diller' },
  { code: 'en', name: 'İngilizce' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'ko', name: 'Korece' },
  { code: 'ja', name: 'Japonca' },
  { code: 'fr', name: 'Fransızca' },
  { code: 'de', name: 'Almanca' },
  { code: 'es', name: 'İspanyolca' },
  { code: 'it', name: 'İtalyanca' },
  { code: 'hi', name: 'Hintçe' },
  { code: 'zh', name: 'Çince' },
];

// Generate year options
const generateYears = () => {
  const years = [];
  const currentYear = new Date().getFullYear();
  for (let year = currentYear + 1; year >= 1900; year--) {
    years.push(year);
  }
  return years;
};

const YEARS = generateYears();

// Default filters
const getDefaultFilters = () => ({
  genres: [],
  yearFrom: '',
  yearTo: '',
  minRating: '',
  sortBy: 'popularity.desc',
  language: '',
  status: '', // TV specific: returning series, ended, etc.
});

const Discover = ({ type = 'movie' }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Core state
  const [results, setResults] = useState([]);
  const [userList, setUserList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  // Filter state
  const [filters, setFilters] = useState(getDefaultFilters());
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Ref for infinite scroll sentinel
  const sentinelRef = useRef(null);
  const observerRef = useRef(null);
  
  // Previous type tracking to detect navigation
  const prevTypeRef = useRef(type);

  const mediaType = type === 'series' ? 'tv' : type;
  const genres = mediaType === 'movie' ? MOVIE_GENRES : TV_GENRES;

  // BUG 3 FIX: Reset filters when navigating between Movies/Series tabs
  useEffect(() => {
    if (prevTypeRef.current !== type) {
      // User switched tabs - reset everything
      setFilters(getDefaultFilters());
      setResults([]);
      setCurrentPage(1);
      setTotalPages(0);
      setHasMore(true);
      // Clear URL params
      setSearchParams({});
      prevTypeRef.current = type;
    }
  }, [type, setSearchParams]);

  // Initialize filters from URL params
  useEffect(() => {
    const genresParam = searchParams.get('genres');
    const yearFromParam = searchParams.get('yearFrom');
    const yearToParam = searchParams.get('yearTo');
    const minRatingParam = searchParams.get('minRating');
    const sortByParam = searchParams.get('sortBy');
    const languageParam = searchParams.get('language');
    const statusParam = searchParams.get('status');
    
    if (genresParam || yearFromParam || yearToParam || minRatingParam || sortByParam || languageParam || statusParam) {
      setFilters({
        genres: genresParam ? genresParam.split(',').map(Number) : [],
        yearFrom: yearFromParam || '',
        yearTo: yearToParam || '',
        minRating: minRatingParam || '',
        sortBy: sortByParam || 'popularity.desc',
        language: languageParam || '',
        status: statusParam || '',
      });
    }
  }, [searchParams]);

  // FIX 2: Fetch data on initial load - always use discover endpoint with infinite scroll grid
  useEffect(() => {
    fetchUserList();
    fetchResults(1, true);
  }, [mediaType]);

  // Sync filters to URL
  const syncFiltersToUrl = useCallback((newFilters) => {
    const params = new URLSearchParams();
    
    if (newFilters.genres.length > 0) {
      params.set('genres', newFilters.genres.join(','));
    }
    if (newFilters.yearFrom) params.set('yearFrom', newFilters.yearFrom);
    if (newFilters.yearTo) params.set('yearTo', newFilters.yearTo);
    if (newFilters.minRating) params.set('minRating', newFilters.minRating);
    if (newFilters.sortBy && newFilters.sortBy !== 'popularity.desc') {
      params.set('sortBy', newFilters.sortBy);
    }
    if (newFilters.language) params.set('language', newFilters.language);
    if (newFilters.status) params.set('status', newFilters.status);
    
    setSearchParams(params);
  }, [setSearchParams]);

  // Infinite scroll with IntersectionObserver
  const currentPageRef = useRef(currentPage);
  currentPageRef.current = currentPage;
  
  useEffect(() => {
    if (!sentinelRef.current) return;
    
    // Cleanup previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
          fetchResults(currentPageRef.current + 1, false);
        }
      },
      { rootMargin: '200px' }
    );
    
    observerRef.current.observe(sentinelRef.current);
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loadingMore, loading]);

  // FIX 2: Single fetch function for infinite scroll grid (always uses /discover endpoint)
  const fetchResults = async (page = 1, reset = false) => {
    if (page === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    
    try {
      const params = {
        sort_by: filters.sortBy,
        page: page,
        'vote_count.gte': 50,
      };
      
      // Genre filter
      if (filters.genres.length > 0) {
        params.with_genres = filters.genres.join(',');
      }
      
      // Year range filter
      if (mediaType === 'movie') {
        if (filters.yearFrom) {
          params['primary_release_date.gte'] = `${filters.yearFrom}-01-01`;
        }
        if (filters.yearTo) {
          params['primary_release_date.lte'] = `${filters.yearTo}-12-31`;
        }
      } else {
        if (filters.yearFrom) {
          params['first_air_date.gte'] = `${filters.yearFrom}-01-01`;
        }
        if (filters.yearTo) {
          params['first_air_date.lte'] = `${filters.yearTo}-12-31`;
        }
      }
      
      // Minimum rating filter
      if (filters.minRating) {
        params['vote_average.gte'] = filters.minRating;
      }
      
      // Language filter
      if (filters.language) {
        params.with_original_language = filters.language;
      }
      
      // TV status filter
      if (mediaType === 'tv' && filters.status) {
        params.with_status = filters.status;
      }
      
      const data = await fetchWithEnglishTitles(
        `https://api.themoviedb.org/3/discover/${mediaType}`,
        params
      );
      
      setCurrentPage(page);
      setTotalPages(data.total_pages);
      setHasMore(page < data.total_pages);
      
      if (reset || page === 1) {
        setResults(data.results);
      } else {
        setResults(prev => [...prev, ...data.results]);
      }
    } catch (error) {
      console.error("Veri çekme hatası:", error);
      showToast("Sonuçlar yüklenirken bir hata oluştu", "error");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchUserList = async () => {
    if (!auth.currentUser) return;
    try {
      const q = query(
        collection(db, "watchlist"),
        where("uid", "==", auth.currentUser.uid)
      );
      const snapshot = await getDocs(q);
      const list = [];
      snapshot.forEach(doc => list.push({ ...doc.data(), docId: doc.id }));
      setUserList(list);
    } catch (error) {
      console.error("Liste çekme hatası:", error);
    }
  };

  // FIX 2: Apply filters - always fetch from discover endpoint
  const applyFilters = () => {
    syncFiltersToUrl(filters);
    setResults([]);
    setCurrentPage(1);
    fetchResults(1, true);
  };

  // FIX 2: Clear all filters - reset to default popularity sort
  const clearFilters = () => {
    const defaultFilters = getDefaultFilters();
    setFilters(defaultFilters);
    setResults([]);
    setCurrentPage(1);
    setSearchParams({});
    fetchResults(1, true);
  };

  // Toggle genre selection
  const toggleGenre = (genreId) => {
    setFilters(prev => ({
      ...prev,
      genres: prev.genres.includes(genreId)
        ? prev.genres.filter(id => id !== genreId)
        : [...prev.genres, genreId]
    }));
  };

  // Count active filters
  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.genres.length > 0) count++;
    if (filters.yearFrom || filters.yearTo) count++;
    if (filters.minRating) count++;
    if (filters.language) count++;
    if (filters.status) count++;
    if (filters.sortBy !== 'popularity.desc') count++;
    return count;
  };

  const isInList = (tmdbId) => {
    return userList.some(item => item.tmdbId === tmdbId && item.mediaType === mediaType);
  };

  // Modal açma fonksiyonu
  const openAddModal = (item, itemType) => {
    if (!auth.currentUser) {
      navigate('/login');
      return;
    }
    
    if (isInList(item.id)) {
      showToast("Bu yapım zaten listenizde!", "info");
      return;
    }
    
    setSelectedItem(item);
    setShowAddModal(true);
  };

  // Listeye ekleme fonksiyonu
  const addToList = async ({ status, customListId, userRating, startDate, endDate, notes }) => {
    if (!selectedItem || !auth.currentUser) return;

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

      const docRef = await addDoc(collection(db, "watchlist"), {
        uid: auth.currentUser.uid,
        tmdbId: selectedItem.id,
        mediaType: mediaType,
        title: title,
        poster: selectedItem.poster_path || null,
        backdrop: selectedItem.backdrop_path || null,
        rating: selectedItem.vote_average || null,
        releaseDate: releaseDate || null,
        genres: selectedItem.genre_ids || [],
        runtime: mediaType === 'movie' ? (selectedItem.runtime || null) : null,
        episodeCount: episodeCount,
        seasonCount: seasonCount,
        status: status,
        userRating: userRating || null,
        progress: (status === 'completed' && mediaType === 'tv' && episodeCount) ? episodeCount : 0,
        notes: notes || '',
        startDate: startDate || null,
        endDate: endDate || null,
        rewatchCount: 0,
        favorite: false,
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

      setUserList(prev => [...prev, { tmdbId: selectedItem.id, mediaType }]);
      showToast(`"${title}" listenize eklendi!`, "success");
      setShowAddModal(false);
      setSelectedItem(null);
    } catch (error) {
      console.error("Ekleme hatası:", error);
      showToast("Ekleme başarısız oldu", "error");
    }
  };

  if (loading && !loadingMore) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p>Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="discover-page">
      <div className="page-header">
        <h1>{mediaType === 'movie' ? '🎬 Filmler' : '📺 Diziler'}</h1>
      </div>

      {/* BUG 2 FIX: Comprehensive Filter Panel */}
      <div className="discover-filter-panel">
        <div 
          className="filter-panel-header"
          onClick={() => setFiltersExpanded(!filtersExpanded)}
        >
          <div className="filter-header-left">
            <FaFilter className="filter-icon" />
            <span>Filtreler</span>
            {getActiveFilterCount() > 0 && (
              <span className="filter-count-badge">{getActiveFilterCount()}</span>
            )}
          </div>
          <button className="filter-toggle-btn">
            {filtersExpanded ? <FaChevronUp /> : <FaChevronDown />}
          </button>
        </div>

        {filtersExpanded && (
          <div className="filter-panel-content">
            {/* Genre Selection */}
            <div className="filter-section">
              <label className="filter-label">🎭 Türler</label>
              <div className="genre-chips">
                {genres.map(genre => (
                  <button
                    key={genre.id}
                    className={`genre-chip ${filters.genres.includes(genre.id) ? 'selected' : ''}`}
                    onClick={() => toggleGenre(genre.id)}
                  >
                    {genre.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Year Range */}
            <div className="filter-section filter-row">
              <div className="filter-item">
                <label className="filter-label">📅 Yıl Aralığı</label>
                <div className="year-range">
                  <select
                    value={filters.yearFrom}
                    onChange={(e) => setFilters(prev => ({ ...prev, yearFrom: e.target.value }))}
                    className="filter-select"
                  >
                    <option value="">Başlangıç</option>
                    {YEARS.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  <span className="year-separator">—</span>
                  <select
                    value={filters.yearTo}
                    onChange={(e) => setFilters(prev => ({ ...prev, yearTo: e.target.value }))}
                    className="filter-select"
                  >
                    <option value="">Bitiş</option>
                    {YEARS.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Minimum Rating */}
              <div className="filter-item">
                <label className="filter-label">⭐ Minimum Puan</label>
                <select
                  value={filters.minRating}
                  onChange={(e) => setFilters(prev => ({ ...prev, minRating: e.target.value }))}
                  className="filter-select"
                >
                  <option value="">Tümü</option>
                  <option value="9">9+ ⭐⭐⭐⭐⭐</option>
                  <option value="8">8+ ⭐⭐⭐⭐</option>
                  <option value="7">7+ ⭐⭐⭐</option>
                  <option value="6">6+ ⭐⭐</option>
                  <option value="5">5+ ⭐</option>
                </select>
              </div>

              {/* Sort By */}
              <div className="filter-item">
                <label className="filter-label"><FaSortAmountDown /> Sıralama</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                  className="filter-select"
                >
                  {SORT_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Language and Status */}
            <div className="filter-section filter-row">
              {/* Language */}
              <div className="filter-item">
                <label className="filter-label">🌍 Dil</label>
                <select
                  value={filters.language}
                  onChange={(e) => setFilters(prev => ({ ...prev, language: e.target.value }))}
                  className="filter-select"
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                  ))}
                </select>
              </div>

              {/* TV Status (only for series) */}
              {mediaType === 'tv' && (
                <div className="filter-item">
                  <label className="filter-label">📺 Dizi Durumu</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="filter-select"
                  >
                    <option value="">Tümü</option>
                    <option value="0">Devam Ediyor</option>
                    <option value="1">Yayında</option>
                    <option value="2">Pilot</option>
                    <option value="3">Üretimde</option>
                    <option value="4">İptal Edildi</option>
                    <option value="5">Sona Erdi</option>
                  </select>
                </div>
              )}
            </div>

            {/* Filter Actions */}
            <div className="filter-actions">
              <button 
                className="filter-apply-btn"
                onClick={applyFilters}
              >
                Filtreleri Uygula
              </button>
              {getActiveFilterCount() > 0 && (
                <button 
                  className="filter-clear-btn"
                  onClick={clearFilters}
                >
                  <FaTimes /> Temizle
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Active Filter Tags */}
      {getActiveFilterCount() > 0 && (
        <div className="active-filters">
          {filters.genres.length > 0 && (
            <div className="active-filter-tag">
              🎭 {filters.genres.length} tür seçili
              <button type="button" onClick={() => setFilters(prev => ({ ...prev, genres: [] }))}>
                <FaTimes />
              </button>
            </div>
          )}
          {(filters.yearFrom || filters.yearTo) && (
            <div className="active-filter-tag">
              📅 {filters.yearFrom || '...'} - {filters.yearTo || '...'}
              <button type="button" onClick={() => setFilters(prev => ({ ...prev, yearFrom: '', yearTo: '' }))}>
                <FaTimes />
              </button>
            </div>
          )}
          {filters.minRating && (
            <div className="active-filter-tag">
              ⭐ {filters.minRating}+
              <button type="button" onClick={() => setFilters(prev => ({ ...prev, minRating: '' }))}>
                <FaTimes />
              </button>
            </div>
          )}
          {filters.language && (
            <div className="active-filter-tag">
              🌍 {LANGUAGES.find(l => l.code === filters.language)?.name}
              <button type="button" onClick={() => setFilters(prev => ({ ...prev, language: '' }))}>
                <FaTimes />
              </button>
            </div>
          )}
          {filters.sortBy !== 'popularity.desc' && (
            <div className="active-filter-tag">
              📊 {SORT_OPTIONS.find(s => s.value === filters.sortBy)?.label}
              <button type="button" onClick={() => setFilters(prev => ({ ...prev, sortBy: 'popularity.desc' }))}>
                <FaTimes />
              </button>
            </div>
          )}
        </div>
      )}

      {/* FIX 2: Single Infinite Scroll Grid (no category rows) */}
      <section className="media-section">
        {results.length > 0 ? (
          <>
            <div className="media-grid">
              {results.map((item, index) => (
                <MediaCard
                  key={`${item.id}-${index}`}
                  item={item}
                  type={mediaType}
                  onAddToList={openAddModal}
                  isInList={isInList(item.id)}
                />
              ))}
            </div>
            
            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="scroll-sentinel" style={{ minHeight: '20px' }}>
              {loadingMore && (
                <div className="loading-more">
                  <div className="loader-small"></div>
                  <span>Daha fazla yükleniyor...</span>
                </div>
              )}
            </div>
            
            {!hasMore && results.length > 0 && (
              <div className="end-of-results">
                <p>Tüm sonuçlar gösterildi 🎬</p>
              </div>
            )}
          </>
        ) : !loading ? (
          <div className="no-results">
            <p>🔍 Sonuç bulunamadı</p>
            <button type="button" onClick={clearFilters}>Filtreleri Temizle</button>
          </div>
        ) : null}
      </section>

      {/* Add to List Modal */}
      <AddToListModal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setSelectedItem(null); }}
        onConfirm={addToList}
        item={selectedItem}
        type={mediaType}
        title={mediaType === 'movie' ? selectedItem?.title : selectedItem?.name}
      />
    </div>
  );
};

export default Discover;
