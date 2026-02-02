import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import MediaCard from '../components/MediaCard';
import FilterBar from '../components/FilterBar';
import { FaSearch, FaSpinner } from 'react-icons/fa';

const API_KEY = "44b7633393c97b1370a03d9a7414f7b1";

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

  const performSearch = async (query, pageNum = 1) => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      let endpoint = `https://api.themoviedb.org/3/search/${searchType}`;
      
      const { data } = await axios.get(endpoint, {
        params: {
          api_key: API_KEY,
          query: query,
          language: 'tr-TR',
          page: pageNum
        }
      });

      // Multi search için sonuçları filtrele (sadece film ve dizi)
      let filteredResults = data.results;
      if (searchType === 'multi') {
        filteredResults = data.results.filter(
          item => item.media_type === 'movie' || item.media_type === 'tv'
        );
      }

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

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchKey.trim()) {
      setSearchParams({ q: searchKey });
      performSearch(searchKey, 1);
    }
  };

  const handleTypeChange = (type) => {
    setSearchType(type);
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

  const addToList = async (item, type, status = 'planned') => {
    if (!auth.currentUser) {
      alert("Lütfen önce giriş yapın!");
      return;
    }

    const mediaType = type === 'movie' ? 'movie' : 'tv';
    const title = mediaType === 'movie' ? item.title : item.name;
    const releaseDate = mediaType === 'movie' ? item.release_date : item.first_air_date;

    // Zaten listede mi kontrol et
    if (isInList(item.id, mediaType)) {
      alert("Bu yapım zaten listenizde!");
      return;
    }

    try {
      await addDoc(collection(db, "watchlist"), {
        uid: auth.currentUser.uid,
        tmdbId: item.id,
        mediaType: mediaType,
        title: title,
        poster: item.poster_path,
        backdrop: item.backdrop_path,
        rating: item.vote_average,
        releaseDate: releaseDate,
        genres: item.genre_ids || [],
        status: status,
        userRating: null,
        progress: 0,
        notes: '',
        startDate: null,
        endDate: null,
        rewatchCount: 0,
        favorite: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Local listeyi güncelle
      setUserList(prev => [...prev, { tmdbId: item.id, mediaType }]);
      alert(`"${title}" listenize eklendi!`);
    } catch (error) {
      console.error("Ekleme hatası:", error);
      alert("Bir hata oluştu!");
    }
  };

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
        </div>
      </div>

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
                    onAddToList={addToList}
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
    </div>
  );
};

export default Search;
