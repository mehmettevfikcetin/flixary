import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { FaSearch, FaUser, FaFilm, FaTv, FaEye, FaCheck, FaCalendar, FaPause, FaTimes, FaStar, FaArrowLeft } from 'react-icons/fa';
import { showToast } from '../components/Toast';

const IMAGE_PATH = "https://image.tmdb.org/t/p/w500";
const BANNER_PLACEHOLDER = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&h=300&fit=crop";

const UserProfile = () => {
  const { userId } = useParams();
  const [userProfile, setUserProfile] = useState(null);
  const [userWatchlist, setUserWatchlist] = useState([]);
  const [userCustomLists, setUserCustomLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedList, setSelectedList] = useState(null);
  
  // Bu benim profilim mi?
  const isOwnProfile = auth.currentUser?.uid === userId;

  useEffect(() => {
    if (userId) {
      fetchUserProfile();
    }
  }, [userId]);

  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      // Kullanıcı bilgilerini al
      const userDoc = await getDoc(doc(db, "users", userId));
      
      if (!userDoc.exists()) {
        showToast("Kullanıcı bulunamadı", "error");
        setLoading(false);
        return;
      }
      
      setUserProfile({ id: userDoc.id, ...userDoc.data() });
      
      // Kullanıcının izleme listesini al
      const watchlistQuery = query(
        collection(db, "watchlist"),
        where("uid", "==", userId)
      );
      const watchlistSnapshot = await getDocs(watchlistQuery);
      const watchlistItems = [];
      watchlistSnapshot.forEach(doc => {
        watchlistItems.push({ docId: doc.id, ...doc.data() });
      });
      setUserWatchlist(watchlistItems);
      
      // Kullanıcının özel listelerini al (sadece public olanları gelecekte)
      const listsQuery = query(
        collection(db, "customLists"),
        where("uid", "==", userId)
      );
      const listsSnapshot = await getDocs(listsQuery);
      const lists = [];
      listsSnapshot.forEach(doc => {
        lists.push({ id: doc.id, ...doc.data() });
      });
      setUserCustomLists(lists);
      
    } catch (error) {
      console.error("Profil yüklenemedi:", error);
      showToast("Profil yüklenemedi", "error");
    } finally {
      setLoading(false);
    }
  };

  // İstatistikler
  const stats = useMemo(() => {
    const totalMovies = userWatchlist.filter(i => i.mediaType === 'movie').length;
    const totalSeries = userWatchlist.filter(i => i.mediaType === 'tv').length;
    const watchingCount = userWatchlist.filter(i => i.status === 'watching').length;
    const completedCount = userWatchlist.filter(i => i.status === 'completed').length;
    const plannedCount = userWatchlist.filter(i => i.status === 'planned').length;
    
    const ratedItems = userWatchlist.filter(i => i.userRating);
    const averageRating = ratedItems.length 
      ? ratedItems.reduce((acc, i) => acc + i.userRating, 0) / ratedItems.length 
      : 0;

    return { totalMovies, totalSeries, watchingCount, completedCount, plannedCount, averageRating };
  }, [userWatchlist]);

  // Filtrelenmiş liste
  const filteredList = useMemo(() => {
    if (selectedList) {
      const list = userCustomLists.find(l => l.id === selectedList);
      return list?.items || [];
    }
    
    if (activeTab === 'all') return userWatchlist;
    return userWatchlist.filter(item => item.status === activeTab);
  }, [userWatchlist, activeTab, selectedList, userCustomLists]);

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

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p>Profil yükleniyor...</p>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="error-container">
        <h2>Kullanıcı bulunamadı</h2>
        <Link to="/users" className="btn-back">Geri Dön</Link>
      </div>
    );
  }

  return (
    <div className="user-profile-page">
      {/* Banner & Profile Info */}
      <div className="user-profile-header">
        <div 
          className="user-banner"
          style={{ 
            backgroundImage: `url(${userProfile.bannerURL || BANNER_PLACEHOLDER})`
          }}
        >
          <div className="banner-overlay" />
        </div>
        
        <div className="user-profile-info">
          <img 
            src={userProfile.photoURL || 'https://via.placeholder.com/120'} 
            alt={userProfile.displayName} 
            className="user-avatar-large"
          />
          <div className="user-details">
            <h1>{userProfile.displayName || 'Kullanıcı'}</h1>
            {userProfile.bio && <p className="user-bio">{userProfile.bio}</p>}
            
            {isOwnProfile && (
              <Link to="/settings" className="btn-edit-profile">
                Profili Düzenle
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="user-stats-bar">
        <div className="stat-item">
          <span className="stat-value">{stats.totalMovies}</span>
          <span className="stat-label">Film</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.totalSeries}</span>
          <span className="stat-label">Dizi</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.completedCount}</span>
          <span className="stat-label">Tamamlandı</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.watchingCount}</span>
          <span className="stat-label">İzleniyor</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.averageRating.toFixed(1)}</span>
          <span className="stat-label">Ort. Puan</span>
        </div>
      </div>

      {/* Custom Lists */}
      {userCustomLists.length > 0 && (
        <div className="user-custom-lists-section">
          <h3>📋 Listeler</h3>
          <div className="user-lists-row">
            <button
              className={`user-list-chip ${selectedList === null ? 'active' : ''}`}
              onClick={() => { setSelectedList(null); setActiveTab('all'); }}
            >
              Tümü
            </button>
            {userCustomLists.map(list => (
              <button
                key={list.id}
                className={`user-list-chip ${selectedList === list.id ? 'active' : ''}`}
                onClick={() => { setSelectedList(list.id); setActiveTab(null); }}
                style={{ '--list-color': list.color }}
              >
                {list.emoji} {list.name} ({list.itemCount || 0})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Status Tabs */}
      {!selectedList && (
        <div className="status-tabs user-status-tabs">
          <button 
            className={activeTab === 'all' ? 'active' : ''} 
            onClick={() => setActiveTab('all')}
          >
            📋 Tümü ({userWatchlist.length})
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
        </div>
      )}

      {/* List Content */}
      {filteredList.length === 0 ? (
        <div className="empty-state">
          <h3>Henüz içerik yok</h3>
          <p>Bu kategoride henüz bir şey bulunmuyor.</p>
        </div>
      ) : (
        <div className="user-watchlist-grid">
          {filteredList.map((item, index) => (
            <Link 
              to={`/${item.mediaType}/${item.tmdbId}`} 
              key={item.docId || `${item.tmdbId}-${index}`}
              className="user-watchlist-card"
            >
              <div className="card-poster">
                <img 
                  src={item.poster ? IMAGE_PATH + item.poster : 'https://via.placeholder.com/200x300?text=No+Image'} 
                  alt={item.title}
                  loading="lazy"
                />
                {item.status && (
                  <div 
                    className="status-indicator" 
                    style={{ backgroundColor: statusColors[item.status] }}
                    title={statusLabels[item.status]}
                  />
                )}
                {item.userRating && (
                  <div className="user-rating-badge">
                    <FaStar /> {item.userRating}
                  </div>
                )}
              </div>
              <div className="card-info">
                <span className="card-title">{item.title}</span>
                <span className="card-type">
                  {item.mediaType === 'movie' ? '🎬 Film' : '📺 Dizi'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

// Kullanıcı Arama Sayfası
const UserSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setSearched(true);
    
    try {
      // Kullanıcı adına göre ara (displayName içinde)
      // Not: Firestore'da tam metin araması yok, bu yüzden tüm kullanıcıları çekip filtreliyoruz
      // Büyük ölçekli uygulamalarda Algolia veya Elasticsearch kullanılmalı
      const usersRef = collection(db, "users");
      const snapshot = await getDocs(usersRef);
      
      const users = [];
      const queryLower = searchQuery.toLowerCase();
      
      snapshot.forEach(doc => {
        const data = doc.data();
        // Kendi profilimi gösterme
        if (doc.id === auth.currentUser?.uid) return;
        
        // displayName veya email'de ara
        const displayName = (data.displayName || '').toLowerCase();
        const email = (data.email || '').toLowerCase();
        
        if (displayName.includes(queryLower) || email.split('@')[0].includes(queryLower)) {
          users.push({ id: doc.id, ...data });
        }
      });
      
      setSearchResults(users);
      
      if (users.length === 0) {
        showToast("Kullanıcı bulunamadı", "info");
      }
    } catch (error) {
      console.error("Arama hatası:", error);
      showToast("Arama başarısız", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      searchUsers();
    }
  };

  return (
    <div className="user-search-page">
      <div className="user-search-header">
        <h1><FaSearch /> Kullanıcı Ara</h1>
        <p>Arkadaşlarını bul ve listelerini keşfet</p>
      </div>

      <div className="user-search-box">
        <div className="search-input-wrapper">
          <FaUser className="search-icon" />
          <input
            type="text"
            placeholder="Kullanıcı adı veya e-posta ile ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button 
            className="btn-search"
            onClick={searchUsers}
            disabled={loading || !searchQuery.trim()}
          >
            {loading ? 'Arıyor...' : 'Ara'}
          </button>
        </div>
      </div>

      {/* Sonuçlar */}
      {searched && (
        <div className="user-search-results">
          {loading ? (
            <div className="loading-container">
              <div className="loader"></div>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="no-results">
              <FaUser className="no-results-icon" />
              <h3>Kullanıcı bulunamadı</h3>
              <p>"{searchQuery}" ile eşleşen kullanıcı yok.</p>
            </div>
          ) : (
            <div className="user-results-grid">
              {searchResults.map(user => (
                <Link to={`/user/${user.id}`} key={user.id} className="user-result-card">
                  <img 
                    src={user.photoURL || 'https://via.placeholder.com/80'} 
                    alt={user.displayName}
                    className="user-result-avatar"
                  />
                  <div className="user-result-info">
                    <h4>{user.displayName || 'Kullanıcı'}</h4>
                    {user.bio && <p className="user-result-bio">{user.bio.slice(0, 60)}...</p>}
                  </div>
                  <span className="view-profile-btn">Profili Gör</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* İpucu */}
      {!searched && (
        <div className="search-tips">
          <h3>💡 İpuçları</h3>
          <ul>
            <li>Arkadaşının kullanıcı adını veya e-posta adresini yazın</li>
            <li>Profilleri görüntüleyerek listelerini keşfedin</li>
            <li>İlham almak için başkalarının izleme listelerine göz atın</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export { UserProfile, UserSearch };
export default UserSearch;
