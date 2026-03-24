import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs, arrayUnion, increment } from 'firebase/firestore';
import axios from 'axios';
import { FaStar, FaPlay, FaClock, FaCalendar, FaPlus, FaCheck, FaEdit, FaTrash, FaArrowLeft } from 'react-icons/fa';
import RatingModal from '../components/RatingModal';
import StatusModal from '../components/StatusModal';
import AddToListModal from '../components/AddToListModal';
import MediaCard from '../components/MediaCard';
import { showToast } from '../components/Toast';
import { fetchWithEnglishTitles, fetchDetailWithEnglishTitle, getTitle, API_KEY } from '../utils/tmdbUtils';

const IMAGE_PATH = "https://image.tmdb.org/t/p/w500";
const BACKDROP_PATH = "https://image.tmdb.org/t/p/original";

const MediaDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // URL path'inden type'ı belirle
  const type = location.pathname.startsWith('/movie') ? 'movie' : 'tv';
  
  const [media, setMedia] = useState(null);
  const [credits, setCredits] = useState({ cast: [], crew: [] });
  const [similar, setSimilar] = useState([]);
  const [videos, setVideos] = useState([]);
  const [userEntry, setUserEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSimilar, setSelectedSimilar] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchMediaDetails();
    checkUserEntry();
  }, [type, id]);

  const fetchMediaDetails = async () => {
    try {
      setLoading(true);
      const mediaType = type;
      
      // Ana detaylar (tr-TR + en-US paralel)
      const { trData: mediaData, enData: enMediaData } = await fetchDetailWithEnglishTitle(
        `https://api.themoviedb.org/3/${mediaType}/${id}`
      );
      // İngilizce başlığı enjekte et
      mediaData.en_title = enMediaData.title || null;
      mediaData.en_name = enMediaData.name || null;
      setMedia(mediaData);

      // Oyuncular ve ekip
      const { data: creditsData } = await axios.get(
        `https://api.themoviedb.org/3/${mediaType}/${id}/credits`,
        { params: { api_key: API_KEY } }
      );
      setCredits(creditsData);

      // Önerilen yapımlar (recommendations daha iyi sonuç verir)
      try {
        const recommendData = await fetchWithEnglishTitles(
          `https://api.themoviedb.org/3/${mediaType}/${id}/recommendations`
        );
        
        // Eğer recommendations boşsa similar'a bak
        if (recommendData.results.length > 0) {
          setSimilar(recommendData.results.slice(0, 8));
        } else {
          const similarData = await fetchWithEnglishTitles(
            `https://api.themoviedb.org/3/${mediaType}/${id}/similar`
          );
          setSimilar(similarData.results.slice(0, 8));
        }
      } catch {
        setSimilar([]);
      }

      // Videolar (fragmanlar)
      const { data: videosData } = await axios.get(
        `https://api.themoviedb.org/3/${mediaType}/${id}/videos`,
        { params: { api_key: API_KEY } }
      );
      setVideos(videosData.results.filter(v => v.site === 'YouTube'));

    } catch (error) {
      console.error("Detay çekme hatası:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkUserEntry = async () => {
    if (!auth.currentUser) return;
    try {
      const q = query(
        collection(db, "watchlist"),
        where("uid", "==", auth.currentUser.uid),
        where("tmdbId", "==", parseInt(id)),
        where("mediaType", "==", type === 'series' ? 'tv' : type)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        setUserEntry({ ...doc.data(), docId: doc.id });
      } else {
        setUserEntry(null);
      }
    } catch (error) {
      console.error("Kullanıcı verisi kontrol hatası:", error);
    }
  };

  const addToList = async (status = 'planned') => {
    if (!auth.currentUser || !media) return;
    
    const mediaType = type === 'series' ? 'tv' : type;
    // Başlık seçimi: İngilizce > Orijinal > Türkçe
    const title = getTitle(media, mediaType);
    const releaseDate = mediaType === 'movie' ? media.release_date : media.first_air_date;
    
    try {
      const docRef = await addDoc(collection(db, "watchlist"), {
        uid: auth.currentUser.uid,
        tmdbId: media.id,
        mediaType: mediaType,
        title: title,
        poster: media.poster_path,
        backdrop: media.backdrop_path,
        rating: media.vote_average,
        releaseDate: releaseDate,
        genres: media.genres?.map(g => g.id) || [],
        runtime: mediaType === 'movie' ? media.runtime : null,
        episodeCount: mediaType === 'tv' ? media.number_of_episodes : null,
        seasonCount: mediaType === 'tv' ? media.number_of_seasons : null,
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
      
      setUserEntry({ ...media, docId: docRef.id, status, userRating: null });
      showToast(`"${title}" listenize eklendi!`, 'success');
    } catch (error) {
      console.error("Ekleme hatası:", error);
      showToast('Ekleme başarısız', 'error');
    }
  };

  const updateEntry = async (updates) => {
    if (!userEntry?.docId) return;
    try {
      await updateDoc(doc(db, "watchlist", userEntry.docId), {
        ...updates,
        updatedAt: new Date()
      });
      setUserEntry({ ...userEntry, ...updates });
      showToast('Güncellendi', 'success');
    } catch (error) {
      console.error("Güncelleme hatası:", error);
      showToast('Güncelleme başarısız', 'error');
    }
  };

  const removeFromList = async () => {
    if (!userEntry?.docId) return;
    if (!confirm("Bu yapımı listenizden kaldırmak istediğinize emin misiniz?")) return;
    
    try {
      await deleteDoc(doc(db, "watchlist", userEntry.docId));
      setUserEntry(null);
      showToast('Listeden kaldırıldı', 'success');
    } catch (error) {
      console.error("Silme hatası:", error);
      showToast('Silme başarısız', 'error');
    }
  };

  const handleStatusSave = (data) => {
    updateEntry(data);
  };

  const handleRatingSave = (rating) => {
    updateEntry({ userRating: rating });
  };

  // Benzer yapımlar için modal aç
  const openAddModal = (item, itemType) => {
    if (!auth.currentUser) {
      showToast('Lütfen giriş yapın', 'error');
      return;
    }
    setSelectedSimilar({ item, type: itemType });
    setShowAddModal(true);
  };

  // Benzer yapımları listeye ekleme fonksiyonu (modal onayı)
  const addSimilarConfirm = async (modalData) => {
    if (!auth.currentUser || !selectedSimilar) return;

    const { item, type: itemType } = selectedSimilar;
    const mediaType = itemType === 'series' ? 'tv' : itemType;
    const title = getTitle(item, mediaType);
    const releaseDate = mediaType === 'movie' ? item.release_date : item.first_air_date;

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
        runtime: null,
        episodeCount: null,
        seasonCount: null,
        status: modalData.status,
        userRating: modalData.userRating,
        progress: 0,
        notes: modalData.notes || '',
        startDate: modalData.startDate,
        endDate: modalData.endDate,
        rewatchCount: 0,
        favorite: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Özel listeye de ekle
      if (modalData.customListId) {
        await updateDoc(doc(db, "customLists", modalData.customListId), {
          items: arrayUnion({
            tmdbId: item.id,
            mediaType: mediaType,
            addedAt: new Date()
          }),
          itemCount: increment(1),
          updatedAt: new Date()
        });
      }

      showToast(`"${title}" listenize eklendi!`, 'success');
      setShowAddModal(false);
      setSelectedSimilar(null);
    } catch (error) {
      console.error("Ekleme hatası:", error);
      showToast('Ekleme başarısız', 'error');
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

  if (!media) {
    return (
      <div className="error-container">
        <h2>İçerik bulunamadı</h2>
        <button onClick={() => navigate(-1)}>Geri Dön</button>
      </div>
    );
  }

  const mediaType = type === 'series' ? 'tv' : type;
  const title = getTitle(media, mediaType);
  const releaseDate = mediaType === 'movie' ? media.release_date : media.first_air_date;
  const year = releaseDate ? new Date(releaseDate).getFullYear() : 'N/A';
  const runtime = mediaType === 'movie' 
    ? `${media.runtime} dk` 
    : `${media.number_of_seasons} Sezon, ${media.number_of_episodes} Bölüm`;

  const trailer = videos.find(v => v.type === 'Trailer') || videos[0];
  const director = credits.crew?.find(c => c.job === 'Director');

  const statusLabels = {
    watching: '👁️ İzleniyor',
    completed: '✅ Tamamlandı',
    planned: '📅 Planlandı',
    onhold: '⏸️ Beklemede',
    dropped: '❌ Bırakıldı'
  };

  return (
    <div className="media-detail">
      {/* Backdrop */}
      <div 
        className="detail-backdrop"
        style={{ 
          backgroundImage: media.backdrop_path 
            ? `url(${BACKDROP_PATH}${media.backdrop_path})` 
            : 'none'
        }}
      >
        <div className="backdrop-overlay" />
      </div>

      <div className="detail-content">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Geri
        </button>

        <div className="detail-main">
          {/* Poster */}
          <div className="detail-poster">
            <img 
              src={media.poster_path ? IMAGE_PATH + media.poster_path : 'https://via.placeholder.com/300x450?text=No+Image'} 
              alt={title} 
            />
            
            {/* Aksiyon Butonları */}
            <div className="detail-actions">
              {userEntry ? (
                <>
                  <button className="btn-status active" onClick={() => setShowStatusModal(true)}>
                    <FaEdit /> {statusLabels[userEntry.status]}
                  </button>
                  <button className="btn-rating" onClick={() => setShowRatingModal(true)}>
                    <FaStar /> {userEntry.userRating ? `${userEntry.userRating}/10` : 'Puanla'}
                  </button>
                  <button className="btn-remove" onClick={removeFromList}>
                    <FaTrash /> Kaldır
                  </button>
                </>
              ) : (
                <button className="btn-add-large" onClick={() => addToList()}>
                  <FaPlus /> Listeme Ekle
                </button>
              )}
              
              {trailer && (
                <a 
                  href={`https://www.youtube.com/watch?v=${trailer.key}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-trailer"
                >
                  <FaPlay /> Fragman İzle
                </a>
              )}
            </div>
          </div>

          {/* Bilgiler */}
          <div className="detail-info">
            <h1 className="detail-title">{title}</h1>
            
            <div className="detail-meta">
              <span className="meta-item">
                <FaCalendar /> {year}
              </span>
              <span className="meta-item">
                <FaClock /> {runtime}
              </span>
              <span className="meta-item rating">
                <FaStar /> {media.vote_average?.toFixed(1)} / 10
              </span>
            </div>

            <div className="detail-genres">
              {media.genres?.map(genre => (
                <span key={genre.id} className="genre-badge">{genre.name}</span>
              ))}
            </div>

            {media.tagline && (
              <p className="detail-tagline">"{media.tagline}"</p>
            )}

            {/* Sekmeler */}
            <div className="detail-tabs">
              <button 
                className={activeTab === 'overview' ? 'active' : ''} 
                onClick={() => setActiveTab('overview')}
              >
                Özet
              </button>
              <button 
                className={activeTab === 'cast' ? 'active' : ''} 
                onClick={() => setActiveTab('cast')}
              >
                Oyuncular
              </button>
              {mediaType === 'tv' && (
                <button 
                  className={activeTab === 'seasons' ? 'active' : ''} 
                  onClick={() => setActiveTab('seasons')}
                >
                  Sezonlar
                </button>
              )}
            </div>

            {/* Sekme İçerikleri */}
            <div className="tab-content">
              {activeTab === 'overview' && (
                <div className="overview-tab">
                  <p className="detail-overview">{media.overview || 'Açıklama bulunamadı.'}</p>
                  
                  {director && (
                    <p className="detail-director">
                      <strong>Yönetmen:</strong> {director.name}
                    </p>
                  )}

                  {mediaType === 'tv' && media.created_by?.length > 0 && (
                    <p className="detail-creator">
                      <strong>Yaratıcı:</strong> {media.created_by.map(c => c.name).join(', ')}
                    </p>
                  )}

                  {media.production_companies?.length > 0 && (
                    <p className="detail-production">
                      <strong>Yapımcı:</strong> {media.production_companies.map(c => c.name).join(', ')}
                    </p>
                  )}
                </div>
              )}

              {activeTab === 'cast' && (
                <div className="cast-tab">
                  <div className="cast-grid">
                    {credits.cast?.slice(0, 12).map(person => (
                      <div key={person.id} className="cast-card">
                        <img 
                          src={person.profile_path 
                            ? IMAGE_PATH + person.profile_path 
                            : 'https://via.placeholder.com/100x150?text=No+Photo'
                          } 
                          alt={person.name}
                        />
                        <div className="cast-info">
                          <span className="cast-name">{person.name}</span>
                          <span className="cast-character">{person.character}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'seasons' && mediaType === 'tv' && (
                <div className="seasons-tab">
                  {media.seasons?.map(season => (
                    <div key={season.id} className="season-card">
                      <img 
                        src={season.poster_path 
                          ? IMAGE_PATH + season.poster_path 
                          : 'https://via.placeholder.com/100x150?text=No+Image'
                        }
                        alt={season.name}
                      />
                      <div className="season-info">
                        <h4>{season.name}</h4>
                        <p>{season.episode_count} Bölüm</p>
                        {season.air_date && (
                          <p className="season-date">
                            {new Date(season.air_date).getFullYear()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Benzer Yapımlar */}
        {similar.length > 0 && (
          <div className="similar-section">
            <h3>Benzer Yapımlar</h3>
            <div className="similar-grid">
              {similar.map(item => (
                <MediaCard
                  key={item.id}
                  item={item}
                  type={mediaType}
                  onAddToList={openAddModal}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modallar */}
      <RatingModal
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        onSave={handleRatingSave}
        currentRating={userEntry?.userRating || 0}
        title={title}
      />

      <StatusModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        onSave={handleStatusSave}
        currentStatus={userEntry?.status}
        currentProgress={userEntry?.progress || 0}
        currentNotes={userEntry?.notes || ''}
        title={title}
        totalEpisodes={media.number_of_episodes}
        mediaType={mediaType}
      />

      <AddToListModal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setSelectedSimilar(null); }}
        onConfirm={addSimilarConfirm}
        item={selectedSimilar?.item}
        type={selectedSimilar?.type}
        title={selectedSimilar ? getTitle(selectedSimilar.item, selectedSimilar.type) : ''}
      />
    </div>
  );
};

export default MediaDetail;
