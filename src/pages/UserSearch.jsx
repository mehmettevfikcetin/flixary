import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, limit, orderBy, setDoc, deleteDoc, updateDoc, arrayUnion, increment, addDoc } from 'firebase/firestore';
import { FaSearch, FaUser, FaFilm, FaTv, FaEye, FaCheck, FaCalendar, FaPause, FaTimes, FaStar, FaArrowLeft, FaShare, FaCopy, FaAt, FaUserPlus, FaUserMinus, FaClone } from 'react-icons/fa';
import { showToast } from '../components/Toast';

const IMAGE_PATH = "https://image.tmdb.org/t/p/w500";
const BANNER_PLACEHOLDER = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&h=300&fit=crop";

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

const UserProfile = () => {
  const { userId } = useParams();
  const [userProfile, setUserProfile] = useState(null);
  const [userWatchlist, setUserWatchlist] = useState([]);
  const [userCustomLists, setUserCustomLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedList, setSelectedList] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [showFollowModal, setShowFollowModal] = useState(null); // 'followers' | 'following' | null
  
  // Bu benim profilim mi?
  const isOwnProfile = auth.currentUser?.uid === userId;

  useEffect(() => {
    if (userId) {
      fetchUserProfile();
      if (auth.currentUser && !isOwnProfile) {
        checkFollowStatus();
      }
    }
  }, [userId]);

  // Takip durumunu kontrol et
  const checkFollowStatus = async () => {
    if (!auth.currentUser) return;
    try {
      const followDoc = await getDoc(doc(db, "follows", `${auth.currentUser.uid}_${userId}`));
      setIsFollowing(followDoc.exists());
    } catch (error) {
      console.error("Takip durumu kontrol hatası:", error);
    }
  };

  // Takip et / Takipten çık
  const toggleFollow = async () => {
    if (!auth.currentUser) {
      showToast("Lütfen önce giriş yapın", "warning");
      return;
    }

    const followId = `${auth.currentUser.uid}_${userId}`;
    
    try {
      if (isFollowing) {
        // Takipten çık
        await deleteDoc(doc(db, "follows", followId));
        setIsFollowing(false);
        setFollowersCount(prev => Math.max(0, prev - 1));
        showToast("Takipten çıkıldı", "success");
      } else {
        // Takip et
        await setDoc(doc(db, "follows", followId), {
          followerId: auth.currentUser.uid,
          followingId: userId,
          createdAt: new Date()
        });
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
        showToast(`${userProfile?.displayName || 'Kullanıcı'} takip edildi`, "success");
      }
    } catch (error) {
      console.error("Takip hatası:", error);
      showToast("İşlem başarısız", "error");
    }
  };

  // Listeyi kopyala
  const copyListToMyProfile = async (listToCopy) => {
    if (!auth.currentUser) {
      showToast("Lütfen önce giriş yapın", "warning");
      return;
    }

    try {
      // Yeni liste oluştur
      const newList = {
        uid: auth.currentUser.uid,
        name: `${listToCopy.name} (${userProfile?.displayName || 'Kopyalanan'})`,
        emoji: listToCopy.emoji || '📋',
        color: listToCopy.color || '#3db4f2',
        itemCount: listToCopy.items?.length || 0,
        items: listToCopy.items || [],
        copiedFrom: userId,
        createdAt: new Date()
      };

      await addDoc(collection(db, "customLists"), newList);
      showToast(`"${listToCopy.name}" listenize kopyalandı!`, "success");
    } catch (error) {
      console.error("Liste kopyalama hatası:", error);
      showToast("Liste kopyalanamadı", "error");
    }
  };

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
      
      // Takipçi sayısını al
      const followersQuery = query(
        collection(db, "follows"),
        where("followingId", "==", userId)
      );
      const followersSnapshot = await getDocs(followersQuery);
      setFollowersCount(followersSnapshot.size);
      
      // Takip edilen sayısını al
      const followingQuery = query(
        collection(db, "follows"),
        where("followerId", "==", userId)
      );
      const followingSnapshot = await getDocs(followingQuery);
      setFollowingCount(followingSnapshot.size);
      
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
      
      // Kullanıcının özel listelerini al
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

  const copyProfileLink = () => {
    const link = userProfile.username 
      ? `${window.location.origin}/u/${userProfile.username}`
      : `${window.location.origin}/user/${userId}`;
    navigator.clipboard.writeText(link);
    showToast("Profil linki kopyalandı!", "success");
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
          <button className="share-profile-btn" onClick={copyProfileLink} title="Profili Paylaş">
            <FaShare /> Paylaş
          </button>
        </div>
        
        <div className="user-profile-info">
          <img 
            src={userProfile.photoURL || 'https://via.placeholder.com/120'} 
            alt={userProfile.displayName} 
            className="user-avatar-large"
          />
          <div className="user-details">
            <h1>{userProfile.displayName || 'Kullanıcı'}</h1>
            {userProfile.username && (
              <span className="user-username">@{userProfile.username}</span>
            )}
            {userProfile.bio && <p className="user-bio">{userProfile.bio}</p>}
            
            <div className="user-profile-actions">
              {isOwnProfile ? (
                <Link to="/settings" className="btn-edit-profile">
                  Profili Düzenle
                </Link>
              ) : (
                <>
                  <button 
                    className={`btn-follow ${isFollowing ? 'following' : ''}`}
                    onClick={toggleFollow}
                  >
                    {isFollowing ? <><FaUserMinus /> Takipten Çık</> : <><FaUserPlus /> Takip Et</>}
                  </button>
                  <button className="btn-share-small" onClick={copyProfileLink}>
                    <FaCopy /> Kopyala
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="user-stats-bar">
        <button className="stat-item clickable" onClick={() => setShowFollowModal('followers')}>
          <span className="stat-value">{followersCount}</span>
          <span className="stat-label">Takipçi</span>
        </button>
        <button className="stat-item clickable" onClick={() => setShowFollowModal('following')}>
          <span className="stat-value">{followingCount}</span>
          <span className="stat-label">Takip</span>
        </button>
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
      </div>

      {/* Follow List Modal */}
      <FollowListModal
        isOpen={showFollowModal !== null}
        onClose={() => setShowFollowModal(null)}
        userId={userId}
        type={showFollowModal}
        title={showFollowModal === 'followers' ? 'Takipçiler' : 'Takip Edilenler'}
      />

      {/* Custom Lists */}
      {userCustomLists.length > 0 && (
        <div className="user-custom-lists-section">
          <h3>📋 Listeler {!isOwnProfile && <span className="copy-hint">(Listeye tıklayarak kopyalayabilirsiniz)</span>}</h3>
          <div className="user-lists-row">
            <button
              className={`user-list-chip ${selectedList === null ? 'active' : ''}`}
              onClick={() => { setSelectedList(null); setActiveTab('all'); }}
            >
              Tümü
            </button>
            {userCustomLists.map(list => (
              <div key={list.id} className="user-list-chip-wrapper">
                <button
                  className={`user-list-chip ${selectedList === list.id ? 'active' : ''}`}
                  onClick={() => { setSelectedList(list.id); setActiveTab(null); }}
                  style={{ '--list-color': list.color }}
                >
                  {list.emoji} {list.name} ({list.itemCount || 0})
                </button>
                {!isOwnProfile && (
                  <button 
                    className="copy-list-btn"
                    onClick={(e) => { e.stopPropagation(); copyListToMyProfile(list); }}
                    title="Listeyi kopyala"
                  >
                    <FaClone />
                  </button>
                )}
              </div>
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
      const usersRef = collection(db, "users");
      const queryLower = searchQuery.toLowerCase().replace('@', '');
      const users = [];
      
      // Önce username ile tam eşleşme ara
      const usernameQuery = query(
        usersRef,
        where("username", "==", queryLower)
      );
      const usernameSnapshot = await getDocs(usernameQuery);
      
      usernameSnapshot.forEach(doc => {
        if (doc.id !== auth.currentUser?.uid) {
          users.push({ id: doc.id, ...doc.data() });
        }
      });
      
      // Eğer username ile bulunamadıysa, displayName ile ara
      if (users.length === 0) {
        const allUsersSnapshot = await getDocs(usersRef);
        
        allUsersSnapshot.forEach(doc => {
          const data = doc.data();
          if (doc.id === auth.currentUser?.uid) return;
          
          const displayName = (data.displayName || '').toLowerCase();
          const username = (data.username || '').toLowerCase();
          const email = (data.email || '').toLowerCase();
          
          if (
            displayName.includes(queryLower) || 
            username.includes(queryLower) ||
            email.split('@')[0].includes(queryLower)
          ) {
            // Duplicate kontrolü
            if (!users.find(u => u.id === doc.id)) {
              users.push({ id: doc.id, ...data });
            }
          }
        });
      }
      
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
          <FaAt className="search-icon" />
          <input
            type="text"
            placeholder="@kullaniciadi veya isim ile ara..."
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
                    {user.username && <span className="user-result-username">@{user.username}</span>}
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
            <li>Kullanıcı adını @ ile arayın (örn: @filmcitevfik)</li>
            <li>İsim veya kullanıcı adı ile arama yapabilirsiniz</li>
            <li>Profilleri görüntüleyerek listelerini keşfedin</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export { UserProfile, UserSearch };
export default UserSearch;

// Username ile profil yönlendirme bileşeni
export const UserProfileByUsername = () => {
  const { username } = useParams();
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const findUserByUsername = async () => {
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("username", "==", username.toLowerCase()));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          setNotFound(true);
        } else {
          setUserId(snapshot.docs[0].id);
        }
      } catch (error) {
        console.error("Kullanıcı bulunamadı:", error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      findUserByUsername();
    }
  }, [username]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p>Kullanıcı aranıyor...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="error-container">
        <h2>@{username} bulunamadı</h2>
        <p>Bu kullanıcı adına sahip bir kullanıcı yok.</p>
        <Link to="/users" className="btn-back">Kullanıcı Ara</Link>
      </div>
    );
  }

  if (userId) {
    return <Navigate to={`/user/${userId}`} replace />;
  }

  return null;
};
