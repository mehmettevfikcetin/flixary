import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { showToast } from '../components/Toast';
import { FaUser, FaSave, FaArrowLeft, FaPalette, FaBell, FaShieldAlt } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const Settings = () => {
  const user = auth.currentUser;
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

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
      }
    } catch (error) {
      console.error("Ayarlar yüklenemedi:", error);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      // Firebase Auth profilini güncelle
      await updateProfile(user, {
        displayName: displayName
      });
      
      // Firestore'da kullanıcı bilgilerini kaydet
      await setDoc(doc(db, "users", user.uid), {
        displayName: displayName,
        bio: bio,
        email: user.email,
        photoURL: user.photoURL,
        updatedAt: new Date()
      }, { merge: true });
      
      showToast("Profil güncellendi!", "success");
    } catch (error) {
      console.error("Güncelleme hatası:", error);
      showToast("Güncelleme başarısız", "error");
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profil', icon: <FaUser /> },
    { id: 'appearance', label: 'Görünüm', icon: <FaPalette /> },
    { id: 'notifications', label: 'Bildirimler', icon: <FaBell /> },
    { id: 'privacy', label: 'Gizlilik', icon: <FaShieldAlt /> },
  ];

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
                <label>Kullanıcı Adı</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Kullanıcı adınız"
                  maxLength={30}
                />
                <span className="char-count">{displayName.length}/30</span>
              </div>

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

          {activeTab === 'notifications' && (
            <div className="settings-section">
              <h2>Bildirim Ayarları</h2>
              <div className="coming-soon">
                <span>🔔</span>
                <p>Bildirim ayarları yakında eklenecek!</p>
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
