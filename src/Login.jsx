import React from 'react';
import { auth, googleProvider } from './firebase';
import { signInWithPopup } from 'firebase/auth';
import { FaGoogle, FaFilm, FaTv, FaList, FaStar } from 'react-icons/fa';

const Login = () => {
  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error(error);
      alert("Giriş yapılamadı: " + error.message);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>🎬 WatchList</h1>
          <p>Film ve Dizi Takip Platformun</p>
        </div>

        <div className="login-features">
          <div className="feature">
            <FaFilm className="feature-icon" />
            <span>Filmlerini Takip Et</span>
          </div>
          <div className="feature">
            <FaTv className="feature-icon" />
            <span>Dizilerini Yönet</span>
          </div>
          <div className="feature">
            <FaList className="feature-icon" />
            <span>Listeler Oluştur</span>
          </div>
          <div className="feature">
            <FaStar className="feature-icon" />
            <span>Puanla ve Değerlendir</span>
          </div>
        </div>
        
        <button onClick={handleGoogleLogin} className="google-btn">
          <FaGoogle /> Google ile Giriş Yap
        </button>

        <p className="login-footer">
          Ücretsiz hesap oluştur ve izleme deneyimini kişiselleştir
        </p>
      </div>
    </div>
  );
};

export default Login;