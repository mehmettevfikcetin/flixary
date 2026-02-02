import React, { useState } from 'react';
import { auth, googleProvider } from './firebase';
import { signInWithPopup } from 'firebase/auth';
import { FaGoogle, FaPlay, FaStar, FaList, FaChartBar, FaHeart, FaFilm } from 'react-icons/fa';

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error(error);
      alert("Giriş yapılamadı: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    { icon: <FaFilm />, title: 'Takip Et', desc: 'Film ve dizilerini takip et' },
    { icon: <FaStar />, title: 'Puanla', desc: '10 üzerinden değerlendir' },
    { icon: <FaList />, title: 'Listele', desc: 'Özel listeler oluştur' },
    { icon: <FaChartBar />, title: 'İstatistik', desc: 'İzleme istatistiklerini gör' },
  ];

  return (
    <div className="login-page">
      {/* Animated Background */}
      <div className="login-bg">
        <div className="floating-cards">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`floating-card card-${i + 1}`}>
              <div className="card-placeholder"></div>
            </div>
          ))}
        </div>
        <div className="gradient-overlay"></div>
      </div>

      <div className="login-wrapper">
        <div className="login-content">
          {/* Logo Section */}
          <div className="login-logo">
            <div className="logo-icon-large">
              <FaPlay className="play-icon" />
            </div>
            <h1>Flixary</h1>
            <p className="tagline">Film ve Dizi Takip Platformu</p>
          </div>

          {/* Features */}
          <div className="login-features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon">{feature.icon}</div>
                <div className="feature-text">
                  <h3>{feature.title}</h3>
                  <p>{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Login Box */}
          <div className="login-box">
            <h2>Hemen Başla</h2>
            <p>Ücretsiz hesap oluştur ve izleme deneyimini kişiselleştir</p>
            
            <button 
              onClick={handleGoogleLogin} 
              className="google-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="btn-loading">
                  <span className="spinner-small"></span>
                  Giriş yapılıyor...
                </span>
              ) : (
                <>
                  <FaGoogle className="google-icon" />
                  <span>Google ile Devam Et</span>
                </>
              )}
            </button>

            <p className="guest-text">
              <FaHeart className="heart-icon" /> Binlerce kullanıcı Flixary'i tercih ediyor
            </p>
          </div>

          {/* Stats */}
          <div className="login-stats">
            <div className="stat">
              <span className="stat-number">10K+</span>
              <span className="stat-label">Kullanıcı</span>
            </div>
            <div className="stat">
              <span className="stat-number">500K+</span>
              <span className="stat-label">Film & Dizi</span>
            </div>
            <div className="stat">
              <span className="stat-number">1M+</span>
              <span className="stat-label">Değerlendirme</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;