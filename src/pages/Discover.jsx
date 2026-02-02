import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, getDocs, doc, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import MediaCard from '../components/MediaCard';
import AddToListModal from '../components/AddToListModal';
import { showToast } from '../components/Toast';
import { FaFire, FaStar, FaPlay, FaCalendar } from 'react-icons/fa';

const API_KEY = "44b7633393c97b1370a03d9a7414f7b1";

const Discover = ({ type = 'movie' }) => {
  const [trending, setTrending] = useState([]);
  const [popular, setPopular] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [userList, setUserList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeGenre, setActiveGenre] = useState(null);
  const [genreResults, setGenreResults] = useState([]);
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const mediaType = type === 'series' ? 'tv' : type;

  const genres = mediaType === 'movie' ? [
    { id: 28, name: 'Aksiyon' },
    { id: 12, name: 'Macera' },
    { id: 16, name: 'Animasyon' },
    { id: 35, name: 'Komedi' },
    { id: 80, name: 'Suç' },
    { id: 99, name: 'Belgesel' },
    { id: 18, name: 'Drama' },
    { id: 27, name: 'Korku' },
    { id: 878, name: 'Bilim Kurgu' },
    { id: 53, name: 'Gerilim' },
  ] : [
    { id: 10759, name: 'Aksiyon & Macera' },
    { id: 16, name: 'Animasyon' },
    { id: 35, name: 'Komedi' },
    { id: 80, name: 'Suç' },
    { id: 99, name: 'Belgesel' },
    { id: 18, name: 'Drama' },
    { id: 10765, name: 'Bilim Kurgu & Fantastik' },
    { id: 9648, name: 'Gizem' },
  ];

  useEffect(() => {
    fetchAllData();
    fetchUserList();
  }, [mediaType]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [trendingRes, popularRes, topRatedRes, upcomingRes] = await Promise.all([
        axios.get(`https://api.themoviedb.org/3/trending/${mediaType}/week`, {
          params: { api_key: API_KEY, language: 'tr-TR' }
        }),
        axios.get(`https://api.themoviedb.org/3/${mediaType}/popular`, {
          params: { api_key: API_KEY, language: 'tr-TR' }
        }),
        axios.get(`https://api.themoviedb.org/3/${mediaType}/top_rated`, {
          params: { api_key: API_KEY, language: 'tr-TR' }
        }),
        mediaType === 'movie' 
          ? axios.get(`https://api.themoviedb.org/3/movie/upcoming`, {
              params: { api_key: API_KEY, language: 'tr-TR' }
            })
          : axios.get(`https://api.themoviedb.org/3/tv/on_the_air`, {
              params: { api_key: API_KEY, language: 'tr-TR' }
            })
      ]);

      setTrending(trendingRes.data.results.slice(0, 10));
      setPopular(popularRes.data.results.slice(0, 10));
      setTopRated(topRatedRes.data.results.slice(0, 10));
      setUpcoming(upcomingRes.data.results.slice(0, 10));
    } catch (error) {
      console.error("Veri çekme hatası:", error);
    } finally {
      setLoading(false);
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

  const fetchByGenre = async (genreId) => {
    setActiveGenre(genreId);
    try {
      const { data } = await axios.get(`https://api.themoviedb.org/3/discover/${mediaType}`, {
        params: {
          api_key: API_KEY,
          language: 'tr-TR',
          with_genres: genreId,
          sort_by: 'popularity.desc'
        }
      });
      setGenreResults(data.results);
    } catch (error) {
      console.error("Tür arama hatası:", error);
    }
  };

  const isInList = (tmdbId) => {
    return userList.some(item => item.tmdbId === tmdbId && item.mediaType === mediaType);
  };

  // Modal açma fonksiyonu
  const openAddModal = (item, itemType) => {
    if (!auth.currentUser) {
      showToast("Lütfen önce giriş yapın!", "warning");
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
  const addToList = async ({ status, customListId }) => {
    if (!selectedItem) return;

    // Anime kontrolü
    const isAnime = selectedItem.genre_ids?.includes(16) && selectedItem.original_language === 'ja';
    const title = mediaType === 'movie' 
      ? (isAnime ? selectedItem.original_title || selectedItem.title : selectedItem.title)
      : (isAnime ? selectedItem.original_name || selectedItem.name : selectedItem.name);
    const releaseDate = mediaType === 'movie' ? selectedItem.release_date : selectedItem.first_air_date;

    try {
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

      setUserList(prev => [...prev, { tmdbId: selectedItem.id, mediaType }]);
      showToast(`"${title}" listenize eklendi!`, "success");
      setShowAddModal(false);
      setSelectedItem(null);
    } catch (error) {
      console.error("Ekleme hatası:", error);
      showToast("Ekleme başarısız oldu", "error");
    }
  };

  const MediaSection = ({ title, icon, items }) => (
    <section className="media-section">
      <h2>{icon} {title}</h2>
      <div className="media-row">
        {items.map(item => (
          <MediaCard
            key={item.id}
            item={item}
            type={mediaType}
            onAddToList={openAddModal}
            isInList={isInList(item.id)}
          />
        ))}
      </div>
    </section>
  );

  if (loading) {
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

      {/* Tür Seçici */}
      <div className="genre-selector">
        <h3>🎭 Türler</h3>
        <div className="genre-tags">
          {genres.map(genre => (
            <button
              key={genre.id}
              className={`genre-tag ${activeGenre === genre.id ? 'active' : ''}`}
              onClick={() => fetchByGenre(genre.id)}
            >
              {genre.name}
            </button>
          ))}
          {activeGenre && (
            <button className="genre-tag clear" onClick={() => setActiveGenre(null)}>
              ✕ Temizle
            </button>
          )}
        </div>
      </div>

      {/* Tür Sonuçları */}
      {activeGenre && genreResults.length > 0 && (
        <section className="media-section genre-results">
          <h2>📂 Tür Sonuçları</h2>
          <div className="media-grid">
            {genreResults.map(item => (
              <MediaCard
                key={item.id}
                item={item}
                type={mediaType}
                onAddToList={openAddModal}
                isInList={isInList(item.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Ana Bölümler */}
      {!activeGenre && (
        <>
          <MediaSection 
            title="Bu Hafta Trend" 
            icon={<FaFire className="section-icon trend" />} 
            items={trending} 
          />
          <MediaSection 
            title="Popüler" 
            icon={<FaPlay className="section-icon popular" />} 
            items={popular} 
          />
          <MediaSection 
            title="En Çok Beğenilen" 
            icon={<FaStar className="section-icon top" />} 
            items={topRated} 
          />
          <MediaSection 
            title={mediaType === 'movie' ? 'Yakında' : 'Yayında'} 
            icon={<FaCalendar className="section-icon upcoming" />} 
            items={upcoming} 
          />
        </>
      )}

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
