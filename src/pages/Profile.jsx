import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, addDoc, getDoc, setDoc } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';
import { FaStar, FaEdit, FaTrash, FaEye, FaCheck, FaCalendar, FaPause, FaTimes, FaPlus, FaListUl, FaCamera, FaUserFriends } from 'react-icons/fa';
import FilterBar from '../components/FilterBar';
import RatingModal from '../components/RatingModal';
import StatusModal from '../components/StatusModal';
import StatsCard from '../components/StatsCard';
import ConfirmModal from '../components/ConfirmModal';
import { showToast } from '../components/Toast';

const BANNER_PLACEHOLDER = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&h=300&fit=crop";
const BANNER_OPTIONS = [
  "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&h=300&fit=crop",
  "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&h=300&fit=crop",
  "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=1200&h=300&fit=crop",
  "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1200&h=300&fit=crop",
  "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1200&h=300&fit=crop",
  "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=1200&h=300&fit=crop",
  "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=1200&h=300&fit=crop",
  "https://images.unsplash.com/photo-1542204165-65bf26472b9b?w=1200&h=300&fit=crop"
];

const IMAGE_PATH = "https://image.tmdb.org/t/p/w500";

const Profile = () => {
  const navigate = useNavigate();
  const [watchlist, setWatchlist] = useState([]);
  const [filters, setFilters] = useState({ 
    type: 'all', 
    status: 'all', 
    sort: 'addedDesc',
    genre: '',
    year: '',
    minRating: ''
  });
  const [activeTab, setActiveTab] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  
  // Özel listeler
  const [customLists, setCustomLists] = useState([]);
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListEmoji, setNewListEmoji] = useState('📋');
  const [newListColor, setNewListColor] = useState('#6366f1');
  const [activeListTab, setActiveListTab] = useState('watchlist'); // 'watchlist' or list id
  
  // Confirm modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmData, setConfirmData] = useState(null);
  
  // Banner
  const [userBanner, setUserBanner] = useState(BANNER_PLACEHOLDER);
  const [showBannerModal, setShowBannerModal] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    const q = query(
      collection(db, "watchlist"),
      where("uid", "==", auth.currentUser.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = [];
      snapshot.forEach((doc) => items.push({ ...doc.data(), docId: doc.id }));
      setWatchlist(items);
    });
    
    return () => unsubscribe();
  }, []);

  // Özel listeleri çek
  useEffect(() => {
    if (!auth.currentUser) return;
    
    const q = query(
      collection(db, "customLists"),
      where("uid", "==", auth.currentUser.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lists = [];
      snapshot.forEach((doc) => lists.push({ id: doc.id, ...doc.data() }));
      setCustomLists(lists);
    });
    
    return () => unsubscribe();
  }, []);

  // Yeni liste oluştur
  const createCustomList = async () => {
    if (!newListName.trim()) {
      showToast('Liste adı boş olamaz', 'error');
      return;
    }
    
    try {
      await addDoc(collection(db, "customLists"), {
        uid: auth.currentUser.uid,
        name: newListName,
        emoji: newListEmoji,
        color: newListColor,
        itemCount: 0,
        items: [],
        createdAt: new Date()
      });
      showToast(`"${newListName}" listesi oluşturuldu`, 'success');
      setNewListName('');
      setNewListEmoji('📋');
      setShowCreateListModal(false);
    } catch (error) {
      console.error("Liste oluşturma hatası:", error);
      showToast('Liste oluşturulamadı', 'error');
    }
  };

  // Özel listeyi sil
  const handleDeleteList = (listId, listName) => {
    setConfirmData({
      title: 'Listeyi Sil',
      message: `"${listName}" listesi ve içindeki tüm öğeler kalıcı olarak silinecek. Devam etmek istiyor musunuz?`,
      onConfirm: () => deleteCustomList(listId)
    });
    setShowConfirmModal(true);
  };

  const deleteCustomList = async (listId) => {
    try {
      await deleteDoc(doc(db, "customLists", listId));
      showToast('Liste silindi', 'success');
      if (activeListTab === listId) setActiveListTab('watchlist');
    } catch (error) {
      showToast('Liste silinemedi', 'error');
    }
    setShowConfirmModal(false);
  };

  // Kullanıcı banner'ını yükle
  useEffect(() => {
    const fetchUserBanner = async () => {
      if (!auth.currentUser) return;
      try {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists() && userDoc.data().bannerURL) {
          setUserBanner(userDoc.data().bannerURL);
        }
      } catch (error) {
        console.error("Banner yüklenemedi:", error);
      }
    };
    fetchUserBanner();
  }, []);

  // Banner'ı güncelle
  const updateBanner = async (bannerURL) => {
    try {
      await setDoc(doc(db, "users", auth.currentUser.uid), {
        bannerURL: bannerURL,
        updatedAt: new Date()
      }, { merge: true });
      setUserBanner(bannerURL);
      showToast('Banner güncellendi!', 'success');
      setShowBannerModal(false);
    } catch (error) {
      console.error("Banner güncellenemedi:", error);
      showToast('Banner güncellenemedi', 'error');
    }
  };

  // İstatistikleri hesapla
  const stats = useMemo(() => {
    const totalMovies = watchlist.filter(i => i.mediaType === 'movie').length;
    const totalSeries = watchlist.filter(i => i.mediaType === 'tv').length;
    const watchingCount = watchlist.filter(i => i.status === 'watching').length;
    const completedCount = watchlist.filter(i => i.status === 'completed').length;
    const plannedCount = watchlist.filter(i => i.status === 'planned').length;
    const droppedCount = watchlist.filter(i => i.status === 'dropped').length;
    const onholdCount = watchlist.filter(i => i.status === 'onhold').length;
    
    // İzleme süresi (film dakika + dizi bölüm * 45dk tahmini)
    const completedMovies = watchlist.filter(i => i.status === 'completed' && i.mediaType === 'movie');
    const completedSeries = watchlist.filter(i => i.status === 'completed' && i.mediaType === 'tv');
    const movieTime = completedMovies.reduce((acc, m) => acc + (m.runtime || 120), 0);
    const seriesTime = completedSeries.reduce((acc, s) => acc + ((s.episodeCount || 10) * 45), 0);
    const totalWatchTime = movieTime + seriesTime;
    
    // Ortalama puan
    const ratedItems = watchlist.filter(i => i.userRating);
    const averageRating = ratedItems.length 
      ? ratedItems.reduce((acc, i) => acc + i.userRating, 0) / ratedItems.length 
      : 0;

    // Tür dağılımı
    const genreCounts = {};
    watchlist.forEach(item => {
      item.genres?.forEach(genreId => {
        genreCounts[genreId] = (genreCounts[genreId] || 0) + 1;
      });
    });

    const genreNames = {
      28: 'Aksiyon', 12: 'Macera', 16: 'Animasyon', 35: 'Komedi', 
      80: 'Suç', 99: 'Belgesel', 18: 'Drama', 10751: 'Aile', 
      14: 'Fantastik', 36: 'Tarih', 27: 'Korku', 10402: 'Müzik',
      9648: 'Gizem', 10749: 'Romantik', 878: 'Bilim Kurgu', 
      53: 'Gerilim', 10752: 'Savaş', 37: 'Western'
    };

    const genreDistribution = Object.entries(genreCounts)
      .map(([id, count]) => ({ id, name: genreNames[id] || 'Diğer', count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalMovies,
      totalSeries,
      watchingCount,
      completedCount,
      plannedCount,
      droppedCount,
      onholdCount,
      totalWatchTime,
      averageRating,
      totalRated: ratedItems.length,
      genreDistribution
    };
  }, [watchlist]);

  // Filtrelenmiş liste
  const filteredList = useMemo(() => {
    let result = [...watchlist];
    
    // Tip filtresi
    if (filters.type !== 'all') {
      result = result.filter(i => i.mediaType === filters.type);
    }
    
    // Durum filtresi (tab veya dropdown)
    const statusFilter = activeTab !== 'all' ? activeTab : filters.status;
    if (statusFilter !== 'all') {
      result = result.filter(i => i.status === statusFilter);
    }
    
    // Tür filtresi
    if (filters.genre) {
      result = result.filter(i => i.genres?.includes(parseInt(filters.genre)));
    }
    
    // Yıl filtresi
    if (filters.year) {
      result = result.filter(i => {
        const year = i.releaseDate ? new Date(i.releaseDate).getFullYear() : null;
        return year === parseInt(filters.year);
      });
    }
    
    // Minimum puan filtresi
    if (filters.minRating) {
      result = result.filter(i => i.rating >= parseFloat(filters.minRating));
    }
    
    // Sıralama
    switch (filters.sort) {
      case 'addedDesc':
        result.sort((a, b) => new Date(b.createdAt?.toDate?.() || b.createdAt) - new Date(a.createdAt?.toDate?.() || a.createdAt));
        break;
      case 'addedAsc':
        result.sort((a, b) => new Date(a.createdAt?.toDate?.() || a.createdAt) - new Date(b.createdAt?.toDate?.() || b.createdAt));
        break;
      case 'ratingDesc':
        result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'ratingAsc':
        result.sort((a, b) => (a.rating || 0) - (b.rating || 0));
        break;
      case 'userRatingDesc':
        result.sort((a, b) => (b.userRating || 0) - (a.userRating || 0));
        break;
      case 'userRatingAsc':
        result.sort((a, b) => (a.userRating || 0) - (b.userRating || 0));
        break;
      case 'titleAsc':
        result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        break;
      case 'titleDesc':
        result.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
        break;
      case 'yearDesc':
        result.sort((a, b) => {
          const yearA = a.releaseDate ? new Date(a.releaseDate).getFullYear() : 0;
          const yearB = b.releaseDate ? new Date(b.releaseDate).getFullYear() : 0;
          return yearB - yearA;
        });
        break;
      case 'yearAsc':
        result.sort((a, b) => {
          const yearA = a.releaseDate ? new Date(a.releaseDate).getFullYear() : 0;
          const yearB = b.releaseDate ? new Date(b.releaseDate).getFullYear() : 0;
          return yearA - yearB;
        });
        break;
      default:
        break;
    }
    
    return result;
  }, [watchlist, filters, activeTab]);

  const updateItem = async (updates) => {
    if (!selectedItem?.docId) return;
    try {
      await updateDoc(doc(db, "watchlist", selectedItem.docId), {
        ...updates,
        updatedAt: new Date()
      });
      showToast('Güncellendi', 'success');
    } catch (error) {
      console.error("Güncelleme hatası:", error);
      showToast('Güncelleme başarısız', 'error');
    }
  };

  const handleDeleteItem = (item) => {
    setConfirmData({
      title: 'Listeden Kaldır',
      message: `"${item.title}" listeden kaldırılsın mı?`,
      onConfirm: () => deleteItem(item)
    });
    setShowConfirmModal(true);
  };

  const deleteItem = async (item) => {
    try {
      await deleteDoc(doc(db, "watchlist", item.docId));
      showToast('Listeden kaldırıldı', 'success');
    } catch (error) {
      console.error("Silme hatası:", error);
      showToast('Silme başarısız', 'error');
    }
    setShowConfirmModal(false);
  };

  // Özel liste detay sayfasına git
  const openCustomList = (listId) => {
    navigate(`/list/${listId}`);
  };

  const statusIcons = {
    watching: <FaEye />,
    completed: <FaCheck />,
    planned: <FaCalendar />,
    onhold: <FaPause />,
    dropped: <FaTimes />
  };

  const statusLabels = {
    watching: 'İzleniyor',
    completed: 'Tamamlandı',
    planned: 'Planlandı',
    onhold: 'Beklemede',
    dropped: 'Bırakıldı'
  };

  const statusColors = {
    watching: '#3498db',
    completed: '#2ecc71',
    planned: '#9b59b6',
    onhold: '#f39c12',
    dropped: '#e74c3c'
  };

  const user = auth.currentUser;

  return (
    <div className="profile-page">
      {/* Profil Header */}
      <div className="profile-header">
        <div 
          className="profile-banner"
          style={{ backgroundImage: `url(${userBanner})` }}
        >
          <button 
            className="banner-edit-btn"
            onClick={() => setShowBannerModal(true)}
            title="Banner Değiştir"
          >
            <FaCamera /> Banner Değiştir
          </button>
        </div>
        <div className="profile-info">
          <img 
            src={user?.photoURL || 'https://via.placeholder.com/120'} 
            alt="Avatar" 
            className="profile-avatar"
          />
          <div className="profile-details">
            <h1>{user?.displayName || 'Kullanıcı'}</h1>
            <p className="profile-email">{user?.email}</p>
            <p className="profile-joined">
              Katılım: {user?.metadata?.creationTime 
                ? new Date(user.metadata.creationTime).toLocaleDateString('tr-TR')
                : 'N/A'
              }
            </p>
            <Link to="/users" className="find-friends-btn">
              <FaUserFriends /> Kullanıcı Ara
            </Link>
          </div>
        </div>
      </div>

      {/* İstatistikler */}
      <StatsCard stats={stats} />

      {/* Durum Sekmeleri */}
      <div className="status-tabs">
        <button 
          className={activeTab === 'all' ? 'active' : ''} 
          onClick={() => setActiveTab('all')}
        >
          📋 Tümü ({watchlist.length})
        </button>
        <button 
          className={activeTab === 'watching' ? 'active' : ''} 
          onClick={() => setActiveTab('watching')}
        >
          👁️ İzleniyor ({stats.watchingCount})
        </button>
        <button 
          className={activeTab === 'completed' ? 'active' : ''} 
          onClick={() => setActiveTab('completed')}
        >
          ✅ Tamamlandı ({stats.completedCount})
        </button>
        <button 
          className={activeTab === 'planned' ? 'active' : ''} 
          onClick={() => setActiveTab('planned')}
        >
          📅 Planlandı ({stats.plannedCount})
        </button>
        <button 
          className={activeTab === 'onhold' ? 'active' : ''} 
          onClick={() => setActiveTab('onhold')}
        >
          ⏸️ Beklemede ({stats.onholdCount})
        </button>
        <button 
          className={activeTab === 'dropped' ? 'active' : ''} 
          onClick={() => setActiveTab('dropped')}
        >
          ❌ Bırakıldı ({stats.droppedCount})
        </button>
      </div>

      {/* Özel Listeler Bölümü */}
      <div className="custom-lists-section">
        <div className="custom-lists-header">
          <h3><FaListUl /> Listelerim</h3>
          <button 
            className="btn-create-list"
            onClick={() => setShowCreateListModal(true)}
          >
            <FaPlus /> Yeni Liste
          </button>
        </div>
        
        {customLists.length > 0 && (
          <div className="custom-lists-grid">
            {customLists.map(list => (
              <div 
                key={list.id} 
                className="custom-list-card"
                onClick={() => openCustomList(list.id)}
                style={{ '--list-color': list.color }}
              >
                <span className="list-emoji">{list.emoji}</span>
                <span className="list-name">{list.name}</span>
                <span className="list-count">{list.itemCount || 0}</span>
                <button 
                  className="btn-delete-list"
                  onClick={(e) => { e.stopPropagation(); handleDeleteList(list.id, list.name); }}
                >
                  <FaTrash />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filtreler */}
      <FilterBar 
        filters={filters} 
        setFilters={setFilters}
        showStatusFilter={false}
      />

      {/* Görünüm Değiştirici */}
      <div className="view-controls">
        <button 
          className={viewMode === 'grid' ? 'active' : ''} 
          onClick={() => setViewMode('grid')}
        >
          🔲 Izgara
        </button>
        <button 
          className={viewMode === 'list' ? 'active' : ''} 
          onClick={() => setViewMode('list')}
        >
          📝 Liste
        </button>
        <span className="result-count">{filteredList.length} sonuç</span>
      </div>

      {/* Liste */}
      {filteredList.length === 0 ? (
        <div className="empty-state">
          <h3>Liste boş</h3>
          <p>Henüz bu kategoride bir şey yok.</p>
          <Link to="/" className="btn-explore">Keşfet</Link>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="watchlist-grid">
          {filteredList.map(item => (
            <div key={item.docId} className="watchlist-card">
              <Link to={`/${item.mediaType}/${item.tmdbId}`} className="card-image">
                <img 
                  src={item.poster ? IMAGE_PATH + item.poster : 'https://via.placeholder.com/200x300?text=No+Image'} 
                  alt={item.title}
                  loading="lazy"
                />
                <div 
                  className="status-indicator" 
                  style={{ backgroundColor: statusColors[item.status] }}
                />
                {item.userRating && (
                  <div className="user-rating-badge">
                    <FaStar /> {item.userRating}
                  </div>
                )}
              </Link>
              <div className="card-content">
                <Link to={`/${item.mediaType}/${item.tmdbId}`} className="card-title">
                  {item.title}
                </Link>
                <div className="card-meta">
                  <span className="media-type">
                    {item.mediaType === 'movie' ? '🎬' : '📺'}
                  </span>
                  <span className="tmdb-rating">
                    ⭐ {item.rating?.toFixed(1) || 'N/A'}
                  </span>
                </div>
                <div className="card-actions">
                  <button 
                    className="btn-edit"
                    onClick={() => { setSelectedItem(item); setShowStatusModal(true); }}
                  >
                    <FaEdit />
                  </button>
                  <button 
                    className="btn-rate"
                    onClick={() => { setSelectedItem(item); setShowRatingModal(true); }}
                  >
                    <FaStar />
                  </button>
                  <button 
                    className="btn-delete"
                    onClick={() => handleDeleteItem(item)}
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="watchlist-list">
          {filteredList.map(item => (
            <div key={item.docId} className="watchlist-list-item">
              <Link to={`/${item.mediaType}/${item.tmdbId}`} className="list-item-poster">
                <img 
                  src={item.poster ? IMAGE_PATH + item.poster : 'https://via.placeholder.com/60x90?text=No'} 
                  alt={item.title}
                />
              </Link>
              <div className="list-item-info">
                <Link to={`/${item.mediaType}/${item.tmdbId}`} className="list-item-title">
                  {item.title}
                </Link>
                <div className="list-item-meta">
                  <span>{item.mediaType === 'movie' ? 'Film' : 'Dizi'}</span>
                  <span>⭐ {item.rating?.toFixed(1) || 'N/A'}</span>
                  {item.releaseDate && (
                    <span>{new Date(item.releaseDate).getFullYear()}</span>
                  )}
                </div>
              </div>
              <div 
                className="list-item-status"
                style={{ color: statusColors[item.status] }}
              >
                {statusIcons[item.status]} {statusLabels[item.status]}
              </div>
              <div className="list-item-rating">
                {item.userRating ? (
                  <span className="rated"><FaStar /> {item.userRating}/10</span>
                ) : (
                  <span className="not-rated">Puanlanmadı</span>
                )}
              </div>
              <div className="list-item-actions">
                <button onClick={() => { setSelectedItem(item); setShowStatusModal(true); }}>
                  <FaEdit />
                </button>
                <button onClick={() => { setSelectedItem(item); setShowRatingModal(true); }}>
                  <FaStar />
                </button>
                <button onClick={() => handleDeleteItem(item)}>
                  <FaTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modallar */}
      <RatingModal
        isOpen={showRatingModal}
        onClose={() => { setShowRatingModal(false); setSelectedItem(null); }}
        onSave={(rating) => updateItem({ userRating: rating })}
        currentRating={selectedItem?.userRating || 0}
        title={selectedItem?.title || ''}
      />

      <StatusModal
        isOpen={showStatusModal}
        onClose={() => { setShowStatusModal(false); setSelectedItem(null); }}
        onSave={(data) => updateItem(data)}
        currentStatus={selectedItem?.status}
        currentProgress={selectedItem?.progress || 0}
        currentNotes={selectedItem?.notes || ''}
        title={selectedItem?.title || ''}
        totalEpisodes={selectedItem?.episodeCount}
        mediaType={selectedItem?.mediaType || 'movie'}
      />

      {/* Liste Oluşturma Modalı */}
      {showCreateListModal && (
        <div className="modal-overlay" onClick={() => setShowCreateListModal(false)}>
          <div className="modal-content create-list-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowCreateListModal(false)}>
              <FaTimes />
            </button>
            
            <h3>Yeni Liste Oluştur</h3>
            
            <div className="form-group">
              <label>Liste Adı</label>
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Örn: Favori Filmlerim"
                maxLength={30}
              />
            </div>
            
            <div className="form-group">
              <label>Emoji Seç</label>
              <div className="emoji-picker">
                {['📋', '🎬', '📺', '⭐', '❤️', '🔥', '🎭', '🎪', '🎯', '🏆', '💎', '🌟', '🎪', '👀', '🍿'].map(emoji => (
                  <button
                    key={emoji}
                    className={`emoji-btn ${newListEmoji === emoji ? 'active' : ''}`}
                    onClick={() => setNewListEmoji(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="form-group">
              <label>Renk Seç</label>
              <div className="color-picker">
                {['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#06b6d4'].map(color => (
                  <button
                    key={color}
                    className={`color-btn ${newListColor === color ? 'active' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewListColor(color)}
                  />
                ))}
              </div>
            </div>
            
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowCreateListModal(false)}>İptal</button>
              <button className="btn-save" onClick={createCustomList}>Oluştur</button>
            </div>
          </div>
        </div>
      )}

      {/* Banner Seçme Modalı */}
      {showBannerModal && (
        <div className="modal-overlay" onClick={() => setShowBannerModal(false)}>
          <div className="modal-content banner-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowBannerModal(false)}>
              <FaTimes />
            </button>
            
            <h3><FaCamera /> Banner Seç</h3>
            <p className="modal-subtitle">Profiliniz için bir arka plan görseli seçin</p>
            
            <div className="banner-options-grid">
              {BANNER_OPTIONS.map((banner, index) => (
                <button
                  key={index}
                  className={`banner-option ${userBanner === banner ? 'active' : ''}`}
                  onClick={() => updateBanner(banner)}
                >
                  <img src={banner} alt={`Banner ${index + 1}`} />
                </button>
              ))}
            </div>
            
            <div className="custom-banner-input">
              <label>Veya özel URL girin:</label>
              <div className="url-input-group">
                <input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  id="customBannerUrl"
                />
                <button 
                  className="btn-apply"
                  onClick={() => {
                    const url = document.getElementById('customBannerUrl').value;
                    if (url) updateBanner(url);
                  }}
                >
                  Uygula
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirmModal && confirmData && (
        <ConfirmModal
          isOpen={showConfirmModal}
          title={confirmData.title}
          message={confirmData.message}
          onConfirm={confirmData.onConfirm}
          onCancel={() => setShowConfirmModal(false)}
          type="danger"
          confirmText="Evet, Sil"
        />
      )}
    </div>
  );
};

export default Profile;
