import React, { useState } from 'react';
import { auth, googleProvider } from './firebase';
import { signInWithPopup } from 'firebase/auth';
import { FaGoogle, FaFilm, FaTv, FaStar, FaList, FaChartLine, FaHeart } from 'react-icons/fa';

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page-new">
      {/* Animated Background */}
      <div className="login-bg-new">
        <div className="bg-gradient"></div>
        <div className="bg-pattern"></div>
        <div className="floating-icons">
          <span className="float-icon" style={{ top: '10%', left: '5%', animationDelay: '0s' }}>🎬</span>
          <span className="float-icon" style={{ top: '20%', right: '10%', animationDelay: '1s' }}>🎭</span>
          <span className="float-icon" style={{ top: '60%', left: '8%', animationDelay: '2s' }}>🍿</span>
          <span className="float-icon" style={{ top: '70%', right: '5%', animationDelay: '3s' }}>📺</span>
          <span className="float-icon" style={{ top: '40%', left: '3%', animationDelay: '4s' }}>⭐</span>
          <span className="float-icon" style={{ top: '85%', right: '15%', animationDelay: '5s' }}>🎥</span>
        </div>
      </div>

      <div className="login-container-new">
        {/* Left Side - Branding */}
        <div className="login-branding">
          <div className="brand-content">
            <div className="brand-logo">
              <img src="/logo.png" alt="Flixary" className="brand-logo-img" />
              <h1>Flixary</h1>
            </div>
            <p className="brand-tagline">Film ve Dizi Takip Platformu</p>
            
            <div className="brand-features">
              <div className="brand-feature">
                <div className="bf-icon"><FaFilm /></div>
                <div className="bf-text">
                  <h4>Takip Et</h4>
                  <p>Tüm film ve dizilerini tek yerden takip et</p>
                </div>
              </div>
              <div className="brand-feature">
                <div className="bf-icon"><FaStar /></div>
                <div className="bf-text">
                  <h4>Puanla</h4>
                  <p>İzlediklerini değerlendir ve notlar ekle</p>
                </div>
              </div>
              <div className="brand-feature">
                <div className="bf-icon"><FaList /></div>
                <div className="bf-text">
                  <h4>Listele</h4>
                  <p>Özel listeler oluştur ve düzenle</p>
                </div>
              </div>
              <div className="brand-feature">
                <div className="bf-icon"><FaChartLine /></div>
                <div className="bf-text">
                  <h4>İstatistik</h4>
                  <p>İzleme alışkanlıklarını analiz et</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="login-form-side">
          <div className="login-card-new">
            <div className="login-header">
              <h2>Hoş Geldin!</h2>
              <p>Hesabına giriş yap veya yeni hesap oluştur</p>
            </div>

            <button 
              onClick={handleGoogleLogin} 
              className="google-btn-new"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="btn-loading-new">
                  <span className="spinner"></span>
                  Giriş yapılıyor...
                </span>
              ) : (
                <>
                  <FaGoogle />
                  <span>Google ile Giriş Yap</span>
                </>
              )}
            </button>

            <div className="login-divider-new">
              <span>veya</span>
            </div>

            <div className="social-proof">
              <div className="proof-avatars">
                <div className="avatar" style={{ background: '#3b82f6' }}>T</div>
                <div className="avatar" style={{ background: '#8b5cf6' }}>A</div>
                <div className="avatar" style={{ background: '#ec4899' }}>M</div>
                <div className="avatar" style={{ background: '#10b981' }}>+</div>
              </div>
              <p><strong>10.000+</strong> kullanıcı Flixary'i tercih ediyor</p>
            </div>

            <div className="login-stats-new">
              <div className="stat-item">
                <FaFilm />
                <span>500K+ Film</span>
              </div>
              <div className="stat-item">
                <FaTv />
                <span>100K+ Dizi</span>
              </div>
              <div className="stat-item">
                <FaHeart />
                <span>1M+ Liste</span>
              </div>
            </div>
          </div>

          <p className="login-footer">
            Giriş yaparak <a href="#">Kullanım Şartları</a>'nı kabul etmiş olursunuz.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;