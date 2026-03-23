import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, getDocs, doc, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import MediaCard from '../components/MediaCard';
import AddToListModal from '../components/AddToListModal';
import { showToast } from '../components/Toast';
import { fetchWithEnglishTitles, getTitle, API_KEY, fetchTvEpisodeCount } from '../utils/tmdbUtils';
import { FaSearch, FaSpinner, FaFilter, FaTimes } from 'react-icons/fa';

const GENRES = {
  movie: [
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
  ],
  tv: [
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
    { id: 10765, name: 'Bilim Kurgu & Fantazi' },
    { id: 10766, name: 'Pembe Dizi' },
    { id: 10767, name: 'Talk Show' },
    { id: 10768, name: 'Savaş & Politik' },
    { id: 37, name: 'Western' },
  ]
};

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  
  const [searchKey, setSearchKey] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState('multi'); // multi, movie, tv
  const [userList, setUserList] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filtreler
  const [showFilters, setShowFilters] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [minRating, setMinRating] = useState('');
  const [sortBy, setSortBy] = useState('popularity.desc');
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedItemType, setSelectedItemType] = useState('movie');

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
    fetchUserList();
  }, []);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q && q !== searchKey) {
      setSearchKey(q);
      performSearch(q);
    }
  }, [searchParams]);

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

  const performSearch = async (queryText, pageNum = 1, typeOverride = null) => {
    if (!queryText.trim()) return;
    
    const activeType = typeOverride || searchType;
    setLoading(true);
    try {
      const data = await fetchWithEnglishTitles(
        `https://api.themoviedb.org/3/search/${activeType}`,
        { query: queryText, page: pageNum }
      );

      // Multi search için sonuçları filtrele (sadece film ve dizi)
      let filteredResults = data.results;
      if (activeType === 'multi') {
        filteredResults = data.results.filter(
          item => item.media_type === 'movie' || item.media_type === 'tv'
        );
      } else {
        // movie veya tv aramasında API media_type döndürmez, manuel ekle
        filteredResults = data.results.map(item => ({
          ...item,
          media_type: activeType
        }));
      }

      // Filtreleri uygula
      filteredResults = applyFilters(filteredResults);

      if (pageNum === 1) {
        setResults(filteredResults);
      } else {
        setResults(prev => [...prev, ...filteredResults]);
      }
      
      setTotalPages(data.total_pages);
      setPage(pageNum);
    } catch (error) {
      console.error("Arama hatası:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (items) => {
    let filtered = [...items];
    
    // Tür filtresi
    if (selectedGenre) {
      filtered = filtered.filter(item => 
        item.genre_ids?.includes(parseInt(selectedGenre))
      );
    }
    
    // Yıl filtresi
    if (selectedYear) {
      filtered = filtered.filter(item => {
        const date = item.release_date || item.first_air_date;
        return date?.startsWith(selectedYear);
      });
    }
    
    // Puan filtresi
    if (minRating) {
      filtered = filtered.filter(item => 
        item.vote_average >= parseFloat(minRating)
      );
    }
    
    // Sıralama
    if (sortBy) {
      filtered.sort((a, b) => {
        switch (sortBy) {
          case 'popularity.desc':
            return (b.popularity || 0) - (a.popularity || 0);
          case 'popularity.asc':
            return (a.popularity || 0) - (b.popularity || 0);
          case 'vote_average.desc':
            return (b.vote_average || 0) - (a.vote_average || 0);
          case 'vote_average.asc':
            return (a.vote_average || 0) - (b.vote_average || 0);
          case 'release_date.desc':
            const dateB = b.release_date || b.first_air_date || '';
            const dateA = a.release_date || a.first_air_date || '';
            return dateB.localeCompare(dateA);
          case 'release_date.asc':
            const dateA2 = a.release_date || a.first_air_date || '';
            const dateB2 = b.release_date || b.first_air_date || '';
            return dateA2.localeCompare(dateB2);
          default:
            return 0;
        }
      });
    }
    
    return filtered;
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchKey.trim()) {
      setSearchParams({ q: searchKey });
      performSearch(searchKey, 1);
    }
  };

  const handleTypeChange = (type) => {
    setSearchType(type);
    setSelectedGenre('');
    if (searchKey.trim()) {
      performSearch(searchKey, 1, type);
    }
  };

  const handleApplyFilters = () => {
    if (searchKey.trim()) {
      performSearch(searchKey, 1);
    }
  };

  const handleClearFilters = () => {
    setSelectedGenre('');
    setSelectedYear('');
    setMinRating('');
    setSortBy('popularity.desc');
    if (searchKey.trim()) {
      performSearch(searchKey, 1);
    }
  };

  const loadMore = () => {
    if (page < totalPages) {
      performSearch(searchKey, page + 1);
    }
  };

  const isInList = (tmdbId, mediaType) => {
    return userList.some(item => item.tmdbId === tmdbId && item.mediaType === mediaType);
  };

  // Modal açma fonksiyonu
  const openAddModal = (item, type) => {
    if (!auth.currentUser) {
      showToast("Lütfen önce giriş yapın!", 'warning');
      return;
    }

    const mediaType = type === 'movie' ? 'movie' : 'tv';
    
    if (isInList(item.id, mediaType)) {
      showToast("Bu yapım zaten listenizde!", 'info');
      return;
    }
    
    setSelectedItem(item);
    setSelectedItemType(type);
    setShowAddModal(true);
  };

  // Listeye ekleme fonksiyonu
  const addToList = async ({ status, customListId, userRating, startDate, endDate, notes }) => {
    if (!selectedItem || !auth.currentUser) return;

    const mediaType = selectedItemType === 'movie' ? 'movie' : 'tv';
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

      // Local listeyi güncelle
      setUserList(prev => [...prev, { tmdbId: selectedItem.id, mediaType }]);
      showToast(`"${title}" listenize eklendi!`, 'success');
      setShowAddModal(false);
      setSelectedItem(null);
    } catch (error) {
      console.error("Ekleme hatası:", error);
      showToast("Bir hata oluştu!", 'error');
    }
  };

  // Yıl seçenekleri
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 50 }, (_, i) => currentYear - i);

  // Aktif tür için türler
  const genreList = searchType === 'movie' ? GENRES.movie : 
                    searchType === 'tv' ? GENRES.tv : 
                    [...GENRES.movie]; // multi için film türlerini kullan

  return (
    <div className="search-page">
      <div className="search-header">
        <h1><FaSearch /> Arama</h1>
        
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Film veya dizi ara..."
            value={searchKey}
            onChange={(e) => setSearchKey(e.target.value)}
          />
          <button type="submit" disabled={loading}>
            {loading ? <FaSpinner className="spinner" /> : <FaSearch />}
          </button>
        </form>

        <div className="search-type-tabs">
          <button 
            className={searchType === 'multi' ? 'active' : ''} 
            onClick={() => handleTypeChange('multi')}
          >
            🔍 Tümü
          </button>
          <button 
            className={searchType === 'movie' ? 'active' : ''} 
            onClick={() => handleTypeChange('movie')}
          >
            🎬 Filmler
          </button>
          <button 
            className={searchType === 'tv' ? 'active' : ''} 
            onClick={() => handleTypeChange('tv')}
          >
            📺 Diziler
          </button>
          <button 
            className={`filter-toggle ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <FaFilter /> Filtreler
          </button>
        </div>
      </div>

      {/* Filtre Paneli */}
      {showFilters && (
        <div className="search-filters">
          <div className="filter-item">
            <label>Tür</label>
            <select 
              className="filter-select"
              value={selectedGenre} 
              onChange={(e) => setSelectedGenre(e.target.value)}
            >
              <option value="">Tüm Türler</option>
              {genreList.map(genre => (
                <option key={genre.id} value={genre.id}>{genre.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-item">
            <label>Yıl</label>
            <select 
              className="filter-select"
              value={selectedYear} 
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="">Tüm Yıllar</option>
              {yearOptions.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div className="filter-item">
            <label>Minimum Puan</label>
            <select 
              className="filter-select"
              value={minRating} 
              onChange={(e) => setMinRating(e.target.value)}
            >
              <option value="">Hepsi</option>
              <option value="9">9+ Muhteşem</option>
              <option value="8">8+ Çok İyi</option>
              <option value="7">7+ İyi</option>
              <option value="6">6+ Ortalama</option>
              <option value="5">5+ Vasat</option>
            </select>
          </div>

          <div className="filter-item">
            <label>Sıralama</label>
            <select 
              className="filter-select"
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="popularity.desc">En Popüler</option>
              <option value="popularity.asc">En Az Popüler</option>
              <option value="vote_average.desc">En Yüksek Puan</option>
              <option value="vote_average.asc">En Düşük Puan</option>
              <option value="release_date.desc">En Yeni</option>
              <option value="release_date.asc">En Eski</option>
            </select>
          </div>

          <div className="filter-actions">
            <button className="filter-apply-btn" onClick={handleApplyFilters}>
              Uygula
            </button>
            <button className="filter-clear-btn" onClick={handleClearFilters}>
              <FaTimes /> Temizle
            </button>
          </div>
        </div>
      )}

      {loading && results.length === 0 ? (
        <div className="loading-container">
          <div className="loader"></div>
          <p>Aranıyor...</p>
        </div>
      ) : results.length === 0 ? (
        <div className="empty-state">
          <h3>🔍 Film veya dizi arayın</h3>
          <p>Arama kutusuna bir şeyler yazarak başlayın.</p>
        </div>
      ) : (
        <>
          <div className="search-results">
            <h2>Sonuçlar ({results.length})</h2>
            <div className="results-grid">
              {results.map(item => {
                const mediaType = item.media_type || searchType;
                const type = mediaType === 'movie' ? 'movie' : 'tv';
                return (
                  <MediaCard
                    key={`${type}-${item.id}`}
                    item={item}
                    type={type}
                    onAddToList={openAddModal}
                    isInList={isInList(item.id, type)}
                  />
                );
              })}
            </div>
          </div>

          {page < totalPages && (
            <div className="load-more">
              <button onClick={loadMore} disabled={loading}>
                {loading ? 'Yükleniyor...' : 'Daha Fazla Yükle'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Add to List Modal */}
      <AddToListModal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setSelectedItem(null); }}
        onConfirm={addToList}
        item={selectedItem}
        type={selectedItemType}
        title={selectedItemType === 'movie' ? selectedItem?.title : selectedItem?.name}
      />
    </div>
  );
};

export default Search;
