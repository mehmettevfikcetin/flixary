import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { showToast } from '../components/Toast';
import { FaUser, FaSave, FaArrowLeft, FaPalette, FaBell, FaShieldAlt, FaCheck, FaTimes, FaShare, FaCopy, FaDownload, FaDatabase } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const Settings = () => {
  const user = auth.currentUser;
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [usernameStatus, setUsernameStatus] = useState(null); // 'available', 'taken', 'checking', 'invalid'
  const [originalUsername, setOriginalUsername] = useState('');

  useEffect(() => {
    fetchUserSettings();
  }, []);

  const fetchUserSettings = async () => {
    if (!user) return;
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setBio(data.bio || '');
        if (data.displayName) setDisplayName(data.displayName);
        if (data.username) {
          setUsername(data.username);
          setOriginalUsername(data.username);
        }
      }
    } catch (error) {
      console.error("Ayarlar yüklenemedi:", error);
    }
  };

  // Username doğrulama ve kontrol
  const validateUsername = (value) => {
    // Sadece küçük harf, rakam ve alt çizgi
    const regex = /^[a-z0-9_]{3,20}$/;
    return regex.test(value);
  };

  const checkUsernameAvailability = async (value) => {
    if (!value || value === originalUsername) {
      setUsernameStatus(null);
      return;
    }

    if (!validateUsername(value)) {
      setUsernameStatus('invalid');
      return;
    }

    setUsernameStatus('checking');
    
    try {
      const q = query(collection(db, "users"), where("username", "==", value.toLowerCase()));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setUsernameStatus('available');
      } else {
        setUsernameStatus('taken');
      }
    } catch (error) {
      console.error("Username kontrol hatası:", error);
      setUsernameStatus(null);
    }
  };

  // Debounced username check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (username && username !== originalUsername) {
        checkUsernameAvailability(username.toLowerCase());
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [username]);

  const handleSaveProfile = async () => {
    if (!user) return;
    
    // Username kontrolü
    if (username && username !== originalUsername) {
      if (!validateUsername(username.toLowerCase())) {
        showToast("Kullanıcı adı geçersiz. 3-20 karakter, sadece küçük harf, rakam ve _ kullanın.", "error");
        return;
      }
      if (usernameStatus === 'taken') {
        showToast("Bu kullanıcı adı zaten alınmış", "error");
        return;
      }
    }
    
    setLoading(true);
    
    try {
      // Firebase Auth profilini güncelle
      await updateProfile(user, {
        displayName: displayName
      });
      
      // Firestore'da kullanıcı bilgilerini kaydet
      await setDoc(doc(db, "users", user.uid), {
        displayName: displayName,
        username: username.toLowerCase().trim(),
        bio: bio,
        email: user.email,
        photoURL: user.photoURL,
        updatedAt: new Date()
      }, { merge: true });
      
      setOriginalUsername(username.toLowerCase());
      showToast("Profil güncellendi!", "success");
    } catch (error) {
      console.error("Güncelleme hatası:", error);
      showToast("Güncelleme başarısız", "error");
    } finally {
      setLoading(false);
    }
  };

  const copyProfileLink = () => {
    if (!username) {
      showToast("Önce bir kullanıcı adı belirleyin", "warning");
      return;
    }
    const link = `${window.location.origin}/u/${username}`;
    navigator.clipboard.writeText(link);
    showToast("Profil linki kopyalandı!", "success");
  };

  const tabs = [
    { id: 'profile', label: 'Profil', icon: <FaUser /> },
    { id: 'data', label: 'Verilerim', icon: <FaDatabase /> },
    { id: 'appearance', label: 'Görünüm', icon: <FaPalette /> },
    { id: 'privacy', label: 'Gizlilik', icon: <FaShieldAlt /> },
  ];

  // Liste export fonksiyonu
  const exportUserData = async (format = 'json') => {
    try {
      showToast("Veriler hazırlanıyor...", "info");
      
      // Watchlist'i çek
      const watchlistQuery = query(
        collection(db, "watchlist"),
        where("uid", "==", user.uid)
      );
      const watchlistSnapshot = await getDocs(watchlistQuery);
      const watchlist = [];
      watchlistSnapshot.forEach(doc => {
        const data = doc.data();
        watchlist.push({
          title: data.title,
          mediaType: data.mediaType,
          status: data.status,
          userRating: data.userRating,
          tmdbId: data.tmdbId,
          addedAt: data.createdAt?.toDate?.()?.toISOString() || null
        });
      });

      // Özel listeleri çek
      const customListsQuery = query(
        collection(db, "customLists"),
        where("uid", "==", user.uid)
      );
      const customListsSnapshot = await getDocs(customListsQuery);
      const customLists = [];
      customListsSnapshot.forEach(doc => {
        const data = doc.data();
        customLists.push({
          name: data.name,
          emoji: data.emoji,
          itemCount: data.itemCount,
          items: data.items?.map(i => ({ title: i.title, mediaType: i.mediaType })) || []
        });
      });

      const exportData = {
        exportDate: new Date().toISOString(),
        user: {
          displayName: user.displayName,
          username: username
        },
        stats: {
          totalItems: watchlist.length,
          movies: watchlist.filter(i => i.mediaType === 'movie').length,
          series: watchlist.filter(i => i.mediaType === 'tv').length,
          customLists: customLists.length
        },
        watchlist,
        customLists
      };

      if (format === 'json') {
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `flixary-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === 'csv') {
        // CSV formatı - sadece watchlist
        const headers = ['Başlık', 'Tür', 'Durum', 'Puan', 'TMDB ID', 'Eklenme Tarihi'];
        const statusLabels = { watching: 'İzleniyor', completed: 'Tamamlandı', planned: 'Planlandı', onhold: 'Beklemede', dropped: 'Bırakıldı' };
        const rows = watchlist.map(item => [
          `"${item.title}"`,
          item.mediaType === 'movie' ? 'Film' : 'Dizi',
          statusLabels[item.status] || item.status,
          item.userRating || '-',
          item.tmdbId,
          item.addedAt ? new Date(item.addedAt).toLocaleDateString('tr-TR') : '-'
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `flixary-watchlist-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }

      showToast("Veriler başarıyla indirildi!", "success");
    } catch (error) {
      console.error("Export hatası:", error);
      showToast("Export başarısız", "error");
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <Link to="/profile" className="back-btn">
          <FaArrowLeft /> Geri
        </Link>
        <h1>⚙️ Ayarlar</h1>
      </div>

      <div className="settings-container">
        {/* Sidebar */}
        <div className="settings-sidebar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="settings-content">
          {activeTab === 'profile' && (
            <div className="settings-section">
              <h2>Profil Bilgileri</h2>
              
              <div className="profile-photo-section">
                <img 
                  src={user?.photoURL || 'https://via.placeholder.com/100'} 
                  alt="Profil" 
                  className="profile-photo-large"
                />
                <div className="photo-info">
                  <p>Profil fotoğrafınız Google hesabınızdan alınmaktadır.</p>
                </div>
              </div>

              <div className="form-group">
                <label>Görünen Ad</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Görünen adınız"
                  maxLength={30}
                />
                <span className="char-count">{displayName.length}/30</span>
              </div>

              <div className="form-group">
                <label>Kullanıcı Adı (Benzersiz)</label>
                <div className="username-input-wrapper">
                  <span className="username-prefix">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="kullanici_adi"
                    maxLength={20}
                    className={usernameStatus ? `status-${usernameStatus}` : ''}
                  />
                  {usernameStatus && (
                    <span className={`username-status ${usernameStatus}`}>
                      {usernameStatus === 'checking' && '⏳'}
                      {usernameStatus === 'available' && <FaCheck />}
                      {usernameStatus === 'taken' && <FaTimes />}
                      {usernameStatus === 'invalid' && <FaTimes />}
                    </span>
                  )}
                </div>
                <span className="helper-text">
                  {usernameStatus === 'available' && '✓ Bu kullanıcı adı müsait'}
                  {usernameStatus === 'taken' && '✗ Bu kullanıcı adı alınmış'}
                  {usernameStatus === 'invalid' && '✗ 3-20 karakter, sadece küçük harf, rakam ve _'}
                  {!usernameStatus && 'Profilinizi paylaşmak için benzersiz bir kullanıcı adı belirleyin'}
                </span>
              </div>

              {username && originalUsername && (
                <div className="share-profile-section">
                  <label>Profil Linki</label>
                  <div className="share-link-box">
                    <span className="share-link">{window.location.origin}/u/{username}</span>
                    <button className="btn-copy-link" onClick={copyProfileLink}>
                      <FaCopy /> Kopyala
                    </button>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>E-posta</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="disabled"
                />
                <span className="helper-text">E-posta değiştirilemez</span>
              </div>

              <div className="form-group">
                <label>Hakkında</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Kendiniz hakkında bir şeyler yazın..."
                  maxLength={200}
                  rows={4}
                />
                <span className="char-count">{bio.length}/200</span>
              </div>

              <button 
                className="save-btn"
                onClick={handleSaveProfile}
                disabled={loading}
              >
                {loading ? 'Kaydediliyor...' : <><FaSave /> Kaydet</>}
              </button>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="settings-section">
              <h2>Görünüm Ayarları</h2>
              <div className="coming-soon">
                <span>🎨</span>
                <p>Tema ve görünüm ayarları yakında eklenecek!</p>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="settings-section">
              <h2>Verilerimi Dışa Aktar</h2>
              <p className="section-description">
                Tüm izleme listenizi ve özel listelerinizi bilgisayarınıza indirin.
              </p>
              
              <div className="export-options">
                <div className="export-card">
                  <div className="export-icon">📄</div>
                  <div className="export-info">
                    <h4>JSON Formatı</h4>
                    <p>Tüm verileriniz, özel listeler dahil. Yedekleme ve aktarım için ideal.</p>
                  </div>
                  <button className="export-btn" onClick={() => exportUserData('json')}>
                    <FaDownload /> İndir
                  </button>
                </div>
                
                <div className="export-card">
                  <div className="export-icon">📊</div>
                  <div className="export-info">
                    <h4>CSV Formatı</h4>
                    <p>Excel ve tablolama programlarıyla uyumlu. Sadece ana liste.</p>
                  </div>
                  <button className="export-btn" onClick={() => exportUserData('csv')}>
                    <FaDownload /> İndir
                  </button>
                </div>
              </div>
              
              <div className="data-info-box">
                <h4>📌 Bilgilendirme</h4>
                <ul>
                  <li>Verileriniz sadece sizin cihazınıza indirilir</li>
                  <li>JSON formatı tüm detayları içerir</li>
                  <li>CSV formatı Excel'de açılabilir</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="settings-section">
              <h2>Gizlilik Ayarları</h2>
              <div className="coming-soon">
                <span>🔒</span>
                <p>Gizlilik ayarları yakında eklenecek!</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
