import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, addDoc, getDoc, setDoc, arrayRemove, arrayUnion, increment, getDocs } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';
import { FaStar, FaEdit, FaTrash, FaEye, FaCheck, FaCalendar, FaPause, FaTimes, FaPlus, FaListUl, FaCamera, FaFolderPlus, FaComment } from 'react-icons/fa';
import FilterBar from '../components/FilterBar';
import RatingModal from '../components/RatingModal';
import StatusModal from '../components/StatusModal';
import StatsCard from '../components/StatsCard';
import ConfirmModal from '../components/ConfirmModal';
import { showToast } from '../components/Toast';
import { fetchTvEpisodeCount } from '../utils/tmdbUtils';

// Takipçi/Takip Edilen Listesi Modal
const FollowListModal = ({ isOpen, onClose, userId, type, title }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && userId) {
      fetchFollowList();
    }
  }, [isOpen, userId, type]);

  const fetchFollowList = async () => {
    setLoading(true);
    try {
      let followQuery;
      if (type === 'followers') {
        followQuery = query(collection(db, "follows"), where("followingId", "==", userId));
      } else {
        followQuery = query(collection(db, "follows"), where("followerId", "==", userId));
      }
      
      const snapshot = await getDocs(followQuery);
      const userIds = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        userIds.push(type === 'followers' ? data.followerId : data.followingId);
      });

      // Kullanıcı bilgilerini al
      const usersData = [];
      for (const uid of userIds) {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
          usersData.push({ id: userDoc.id, ...userDoc.data() });
        }
      }
      setUsers(usersData);
    } catch (error) {
      console.error("Takip listesi yüklenemedi:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content follow-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}><FaTimes /></button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div className="loading-container" style={{ minHeight: '200px' }}>
              <div className="loader"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="empty-follow-list">
              <p>{type === 'followers' ? 'Henüz takipçi yok' : 'Henüz kimse takip edilmiyor'}</p>
            </div>
          ) : (
            <div className="follow-list">
              {users.map(user => (
                <Link 
                  to={`/user/${user.id}`} 
                  key={user.id} 
                  className="follow-list-item"
                  onClick={onClose}
                >
                  <img 
                    src={user.photoURL || 'https://via.placeholder.com/40'} 
                    alt={user.displayName}
                  />
                  <div className="follow-user-info">
                    <span className="follow-user-name">{user.displayName || 'Kullanıcı'}</span>
                    {user.username && <span className="follow-user-username">@{user.username}</span>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Özel Listeye Ekleme Modal
const AddToCustomListModal = ({ isOpen, onClose, item, customLists, onAdd }) => {
  const [selectedListId, setSelectedListId] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !item) return null;

  // Zaten bu öğeyi içeren listeleri bul
  const listsContainingItem = customLists.filter(list => 
    list.items?.some(i => i.tmdbId === item.tmdbId && i.mediaType === item.mediaType)
  );

  const handleAdd = async () => {
    if (!selectedListId) {
      showToast('Lütfen bir liste seçin', 'warning');
      return;
    }

    setLoading(true);
    try {
      const selectedList = customLists.find(l => l.id === selectedListId);
      
      // Zaten listede var mı kontrol et
      const alreadyInList = selectedList.items?.some(
        i => i.tmdbId === item.tmdbId && i.mediaType === item.mediaType
      );

      if (alreadyInList) {
        showToast('Bu içerik zaten bu listede mevcut', 'warning');
        setLoading(false);
        return;
      }

      // Listeye ekle
      const newItem = {
        tmdbId: item.tmdbId,
        mediaType: item.mediaType,
        title: item.title,
        poster: item.poster,
        rating: item.rating,
        releaseDate: item.releaseDate,
        userRating: item.userRating,
        status: item.status,
        addedAt: new Date()
      };

      await updateDoc(doc(db, "customLists", selectedListId), {
        items: arrayUnion(newItem),
        itemCount: increment(1)
      });

      showToast(`"${item.title}" listeye eklendi`, 'success');
      onClose();
    } catch (error) {
      console.error("Listeye ekleme hatası:", error);
      showToast('Listeye eklenemedi', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content add-to-list-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><FaTimes /></button>
        
        <h3><FaFolderPlus /> Listeye Ekle</h3>
        <p className="modal-subtitle">{item.title}</p>

        {listsContainingItem.length > 0 && (
          <div className="already-in-lists">
            <span>Zaten şu listelerde:</span>
            <div className="list-tags">
              {listsContainingItem.map(list => (
                <span key={list.id} className="list-tag" style={{ backgroundColor: list.color }}>
                  {list.emoji} {list.name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="available-lists">
          <h4>Eklenecek Liste Seç</h4>
          {customLists.length === 0 ? (
            <p className="no-lists-msg">Henüz özel liste oluşturmadınız.</p>
          ) : (
            <div className="lists-select-grid">
              {customLists
                .filter(list => !listsContainingItem.some(l => l.id === list.id))
                .map(list => (
                  <button
                    key={list.id}
                    className={`list-select-btn ${selectedListId === list.id ? 'selected' : ''}`}
                    onClick={() => setSelectedListId(list.id)}
                    style={{ '--list-color': list.color }}
                  >
                    <span className="list-emoji">{list.emoji}</span>
                    <span className="list-name">{list.name}</span>
                    <span className="list-count">{list.itemCount || 0}</span>
                  </button>
                ))
              }
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>İptal</button>
          <button 
            className="btn-save" 
            onClick={handleAdd} 
            disabled={loading || !selectedListId}
          >
            {loading ? 'Ekleniyor...' : 'Listeye Ekle'}
          </button>
        </div>
      </div>
    </div>
  );
};

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

  // StatusModal açılırken episode count eksikse TMDB'den çek (sadece state'te tut, Firestore'a kaydetmeyi Save butonuna bırak)
  const openStatusModal = async (item) => {
    setSelectedItem(item);
    if (item.mediaType === 'tv' && !item.episodeCount && item.tmdbId) {
      try {
        const tvDetails = await fetchTvEpisodeCount(item.tmdbId);
        if (tvDetails.episodeCount) {
          // Sadece state'i güncelle - Firestore'a kaydetme (kullanıcı Save'e bastığında kaydedilecek)
          setSelectedItem(prev => ({ 
            ...prev, 
            episodeCount: tvDetails.episodeCount, 
            seasonCount: tvDetails.seasonCount,
            _episodeCountFetched: true // API'den çekildiğini işaretle
          }));
        }
      } catch (err) {
        console.error('Bölüm sayısı çekilemedi:', err);
      }
    }
    setShowStatusModal(true);
  };
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
  
  // Takipçi/Takip
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [showFollowModal, setShowFollowModal] = useState(null);
  
  // Özel listeye ekleme modal
  const [showAddToListModal, setShowAddToListModal] = useState(false);
  const [itemToAddToList, setItemToAddToList] = useState(null);

  // Not popup
  const [notePopupId, setNotePopupId] = useState(null);

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

  // Kullanıcı banner'ını ve takip istatistiklerini yükle
  useEffect(() => {
    const fetchUserData = async () => {
      if (!auth.currentUser) return;
      try {
        // Banner
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists() && userDoc.data().bannerURL) {
          setUserBanner(userDoc.data().bannerURL);
        }
        
        // Takipçi sayısı
        const followersQuery = query(
          collection(db, "follows"),
          where("followingId", "==", auth.currentUser.uid)
        );
        const followersSnapshot = await getDocs(followersQuery);
        setFollowersCount(followersSnapshot.size);
        
        // Takip edilen sayısı
        const followingQuery = query(
          collection(db, "follows"),
          where("followerId", "==", auth.currentUser.uid)
        );
        const followingSnapshot = await getDocs(followingQuery);
        setFollowingCount(followingSnapshot.size);
      } catch (error) {
        console.error("Veri yüklenemedi:", error);
      }
    };
    fetchUserData();
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
      // Eğer episodeCount API'den çekilmişse onu da kaydet
      const finalUpdates = { ...updates, updatedAt: new Date() };
      if (selectedItem._episodeCountFetched && selectedItem.episodeCount) {
        finalUpdates.episodeCount = selectedItem.episodeCount;
        finalUpdates.seasonCount = selectedItem.seasonCount;
      }
      
      await updateDoc(doc(db, "watchlist", selectedItem.docId), finalUpdates);
      showToast('Güncellendi', 'success');
    } catch (error) {
      console.error("Güncelleme hatası:", error);
      showToast('Güncelleme başarısız', 'error');
    }
  };

  const handleDeleteItem = (item) => {
    setConfirmData({
      title: 'Listeden Kaldır',
      message: `"${item.title}" ana listeden ve tüm özel listelerden kaldırılacak. Devam etmek istiyor musunuz?`,
      onConfirm: () => deleteItem(item)
    });
    setShowConfirmModal(true);
  };

  const deleteItem = async (item) => {
    try {
      // Ana listeden sil
      await deleteDoc(doc(db, "watchlist", item.docId));
      
      // Tüm özel listelerden de sil (tmdbId ve mediaType eşleşmesi ile)
      for (const customList of customLists) {
        const itemInList = customList.items?.find(
          i => i.tmdbId === item.tmdbId && i.mediaType === item.mediaType
        );
        if (itemInList) {
          await updateDoc(doc(db, "customLists", customList.id), {
            items: arrayRemove(itemInList),
            itemCount: increment(-1)
          });
        }
      }
      
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
            <div className="profile-name-row">
              <h1>{user?.displayName || 'Kullanıcı'}</h1>
              <div className="profile-follow-stats">
                <button 
                  className="follow-stat-btn"
                  onClick={() => setShowFollowModal('followers')}
                >
                  <span className="follow-count">{followersCount}</span>
                  <span className="follow-label">Takipçi</span>
                </button>
                <button 
                  className="follow-stat-btn"
                  onClick={() => setShowFollowModal('following')}
                >
                  <span className="follow-count">{followingCount}</span>
                  <span className="follow-label">Takip</span>
                </button>
              </div>
            </div>
            <p className="profile-email">{user?.email}</p>
            <p className="profile-joined">
              Katılım: {user?.metadata?.creationTime 
                ? new Date(user.metadata.creationTime).toLocaleDateString('tr-TR')
                : 'N/A'
              }
            </p>
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
                  {item.notes && item.notes.trim() && (
                    <div className="card-note-wrapper">
                      <button 
                        className="note-indicator-btn"
                        title="Notu göster"
                        onClick={() => setNotePopupId(notePopupId === item.docId ? null : item.docId)}
                      >
                        <FaComment />
                      </button>
                      {notePopupId === item.docId && (
                        <div className="note-popup">
                          <div className="note-popup-header">
                            <span>📝 Not</span>
                            <button onClick={() => setNotePopupId(null)}><FaTimes /></button>
                          </div>
                          <p className="note-popup-text">{item.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="card-actions">
                  <button 
                    className="btn-edit"
                    onClick={() => openStatusModal(item)}
                    title="Düzenle"
                  >
                    <FaEdit />
                  </button>
                  <button 
                    className="btn-rate"
                    onClick={() => { setSelectedItem(item); setShowRatingModal(true); }}
                    title="Puanla"
                  >
                    <FaStar />
                  </button>
                  <button 
                    className="btn-add-to-list"
                    onClick={() => { setItemToAddToList(item); setShowAddToListModal(true); }}
                    title="Özel Listeye Ekle"
                  >
                    <FaFolderPlus />
                  </button>
                  <button 
                    className="btn-delete"
                    onClick={() => handleDeleteItem(item)}
                    title="Sil"
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
              {item.notes && item.notes.trim() ? (
                <div className="list-item-note-wrapper">
                  <button 
                    className="note-indicator-btn"
                    title="Notu göster"
                    onClick={() => setNotePopupId(notePopupId === item.docId ? null : item.docId)}
                  >
                    <FaComment />
                  </button>
                  {notePopupId === item.docId && (
                    <div className="note-popup">
                      <div className="note-popup-header">
                        <span>📝 Not</span>
                        <button onClick={() => setNotePopupId(null)}><FaTimes /></button>
                      </div>
                      <p className="note-popup-text">{item.notes}</p>
                    </div>
                  )}
                </div>
              ) : <div />}
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
                <button onClick={() => openStatusModal(item)} title="Düzenle">
                  <FaEdit />
                </button>
                <button onClick={() => { setSelectedItem(item); setShowRatingModal(true); }} title="Puanla">
                  <FaStar />
                </button>
                <button onClick={() => { setItemToAddToList(item); setShowAddToListModal(true); }} title="Özel Listeye Ekle">
                  <FaFolderPlus />
                </button>
                <button onClick={() => handleDeleteItem(item)} title="Sil">
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

      {/* Follow List Modal */}
      <FollowListModal
        isOpen={showFollowModal !== null}
        onClose={() => setShowFollowModal(null)}
        userId={auth.currentUser?.uid}
        type={showFollowModal}
        title={showFollowModal === 'followers' ? 'Takipçiler' : 'Takip Edilenler'}
      />

      {/* Add to Custom List Modal */}
      <AddToCustomListModal
        isOpen={showAddToListModal}
        onClose={() => { setShowAddToListModal(false); setItemToAddToList(null); }}
        item={itemToAddToList}
        customLists={customLists}
      />
    </div>
  );
};

export default Profile;
