import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db, auth } from './firebase';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import axios from 'axios';
import MediaCard from './components/MediaCard';
import AddToListModal from './components/AddToListModal';
import { showToast } from './components/Toast';
import { FaFire, FaStar, FaFilm, FaTv, FaArrowRight, FaClock, FaChartLine } from 'react-icons/fa';

const API_KEY = "44b7633393c97b1370a03d9a7414f7b1";
const IMAGE_PATH = "https://image.tmdb.org/t/p/w500";
const BACKDROP_PATH = "https://image.tmdb.org/t/p/original";

const Home = () => {
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [trendingSeries, setTrendingSeries] = useState([]);
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
    fetchTrending();
    const cleanup = fetchUserLists();
    return cleanup;
  }, []);

  const fetchTrending = async () => {
    try {
      const [moviesRes, seriesRes] = await Promise.all([
        axios.get('https://api.themoviedb.org/3/trending/movie/day', {
          params: { api_key: API_KEY, language: 'tr-TR' }
        }),
        axios.get('https://api.themoviedb.org/3/trending/tv/day', {
          params: { api_key: API_KEY, language: 'tr-TR' }
        })
      ]);

      setTrendingMovies(moviesRes.data.results.slice(0, 8));
      setTrendingSeries(seriesRes.data.results.slice(0, 8));
      
      // Rastgele bir featured item seç
      const allTrending = [...moviesRes.data.results.slice(0, 5), ...seriesRes.data.results.slice(0, 5)];
      const randomIndex = Math.floor(Math.random() * allTrending.length);
      const featured = allTrending[randomIndex];
      featured.media_type = moviesRes.data.results.includes(featured) ? 'movie' : 'tv';
      setFeaturedItem(featured);
      
    } catch (error) {
      console.error("Trend çekme hatası:", error);
    } finally {
      setLoading(false);
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
      showToast("Lütfen önce giriş yapın!", "warning");
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
  const addToList = async ({ status, customListId }) => {
    if (!selectedItem) return;
    
    const mediaType = selectedType === 'movie' ? 'movie' : 'tv';
    
    // Başlık seçimi: Latin harfi olmayan isimleri engelle
    const isLatin = (str) => /^[\u0000-\u024F\u1E00-\u1EFF\u2C60-\u2C7F\s\d\W]+$/.test(str);
    const trTitle = mediaType === 'movie' ? selectedItem.title : selectedItem.name;
    const origTitle = mediaType === 'movie' ? selectedItem.original_title : selectedItem.original_name;
    const title = (trTitle && isLatin(trTitle)) ? trTitle : (origTitle && isLatin(origTitle)) ? origTitle : trTitle || origTitle;
    
    const releaseDate = mediaType === 'movie' ? selectedItem.release_date : selectedItem.first_air_date;

    try {
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
        status: status,
        userRating: null,
        progress: 0,
        notes: '',
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

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p>Yükleniyor...</p>
      </div>
    );
  }

  const title = featuredItem?.title || featuredItem?.name;
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
      <section className="content-section">
        <div className="section-header">
          <h2><FaFire className="trend-icon" /> Trend Filmler</h2>
          <Link to="/movies" className="see-all">
            Tümünü Gör <FaArrowRight />
          </Link>
        </div>
        <div className="media-row">
          {trendingMovies.map(movie => (
            <MediaCard 
              key={movie.id} 
              item={movie} 
              type="movie"
              onAddToList={openAddModal}
              isInList={isInList(movie.id, 'movie')}
            />
          ))}
        </div>
      </section>

      {/* Trend Diziler */}
      <section className="content-section">
        <div className="section-header">
          <h2><FaFire className="trend-icon" /> Trend Diziler</h2>
          <Link to="/series" className="see-all">
            Tümünü Gör <FaArrowRight />
          </Link>
        </div>
        <div className="media-row">
          {trendingSeries.map(series => (
            <MediaCard 
              key={series.id} 
              item={series} 
              type="tv"
              onAddToList={openAddModal}
              isInList={isInList(series.id, 'tv')}
            />
          ))}
        </div>
      </section>

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