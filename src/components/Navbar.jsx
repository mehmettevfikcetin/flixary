import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { auth } from '../firebase';
import { FaSearch, FaUser, FaFilm, FaTv, FaHome, FaBars, FaTimes, FaSignOutAlt, FaCog, FaUserFriends } from 'react-icons/fa';

const Navbar = ({ user }) => {
  const [searchKey, setSearchKey] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Menü açıkken body scroll'u kapat
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Dışarı tıklandığında dropdown'u kapat
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchKey.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchKey)}`);
      setSearchKey('');
      setMobileMenuOpen(false);
      setShowMobileSearch(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setShowUserDropdown(false);
      setMobileMenuOpen(false);
    } catch (error) {
      console.error("Çıkış hatası:", error);
    }
  };

  const toggleMobileMenu = () => {
    console.log('Mobile menu toggled:', !mobileMenuOpen);
    setMobileMenuOpen(prev => !prev);
  };

  // Mobile Menu Portal
  const MobileMenuPortal = () => {
    if (!mobileMenuOpen) return null;
    
    return createPortal(
      <div 
        className="mobile-menu-overlay"
        style={{
          position: 'fixed',
          top: '70px',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'var(--bg-primary)',
          zIndex: 9999,
          overflowY: 'auto',
          display: 'block'
        }}
      >
        <div className="mobile-menu-content" style={{ padding: '1.5rem' }}>
          {user && (
            <div className="mobile-user-info">
              <img src={user.photoURL || 'https://via.placeholder.com/50'} alt="Avatar" />
              <div>
                <span className="user-name">{user.displayName || 'Kullanıcı'}</span>
                <span className="user-email">{user.email}</span>
              </div>
            </div>
          )}
          
          <div className="mobile-nav-links">
            <Link to="/" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
              <FaHome /> Ana Sayfa
            </Link>
            <Link to="/movies" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
              <FaFilm /> Filmler
            </Link>
            <Link to="/series" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
              <FaTv /> Diziler
            </Link>
            <Link to="/users" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
              <FaUserFriends /> Kullanıcı Ara
            </Link>
            {user ? (
              <>
                <div className="mobile-nav-divider"></div>
                <Link to="/profile" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
                  <FaUser /> Profilim
                </Link>
                <Link to="/settings" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
                  <FaCog /> Ayarlar
                </Link>
                <button className="mobile-nav-link logout" onClick={handleLogout}>
                  <FaSignOutAlt /> Çıkış Yap
                </button>
              </>
            ) : (
              <>
                <div className="mobile-nav-divider"></div>
                <Link to="/login" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
                  <FaUser /> Giriş Yap
                </Link>
              </>
            )}
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-container">
          <Link to="/" className="navbar-logo" onClick={() => setMobileMenuOpen(false)}>
            <img src="/logo.png" alt="Flixary" className="navbar-logo-img" />
            <span className="logo-text">Flixary</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="navbar-center">
            <div className="nav-links">
              <Link to="/" className="nav-link">
                <FaHome /> <span>Ana Sayfa</span>
              </Link>
              <Link to="/movies" className="nav-link">
                <FaFilm /> <span>Filmler</span>
              </Link>
              <Link to="/series" className="nav-link">
                <FaTv /> <span>Diziler</span>
              </Link>
              <Link to="/users" className="nav-link">
                <FaUserFriends /> <span>Kullanıcılar</span>
              </Link>
            </div>
          </div>

          {/* Desktop Search */}
          <form onSubmit={handleSearch} className="navbar-search desktop-search">
            <input
              type="text"
              placeholder="Film veya dizi ara..."
              value={searchKey}
              onChange={(e) => setSearchKey(e.target.value)}
            />
            <button type="submit">
              <FaSearch />
            </button>
          </form>

          {/* Mobile Controls */}
          <div className="mobile-controls">
            <button 
              type="button"
              className="mobile-search-btn"
              onClick={() => {
                setShowMobileSearch(!showMobileSearch);
                setMobileMenuOpen(false);
              }}
              aria-label="Ara"
            >
              <FaSearch />
            </button>
            
            <button 
              type="button"
              className="mobile-menu-btn" 
              onClick={() => {
                toggleMobileMenu();
                setShowMobileSearch(false);
              }}
              aria-label="Menü"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <FaTimes /> : <FaBars />}
            </button>
          </div>

          {/* User Avatar - Desktop with Click Dropdown */}
          {user ? (
            <div className="navbar-user desktop-user" ref={dropdownRef}>
              <button 
                className="user-avatar-btn"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
              >
                <img src={user.photoURL || 'https://via.placeholder.com/40'} alt="Avatar" />
              </button>
              {showUserDropdown && (
                <div className="user-dropdown show">
                  <div className="dropdown-user-info">
                    <img src={user.photoURL || 'https://via.placeholder.com/40'} alt="Avatar" />
                    <div>
                      <span className="dropdown-user-name">{user.displayName || 'Kullanıcı'}</span>
                      <span className="dropdown-user-email">{user.email}</span>
                    </div>
                  </div>
                  <div className="dropdown-divider"></div>
                  <Link to="/profile" onClick={() => setShowUserDropdown(false)}>
                    <FaUser /> Profilim
                  </Link>
                  <Link to="/profile" onClick={() => setShowUserDropdown(false)}>
                    📋 Listelerim
                  </Link>
                  <Link to="/settings" onClick={() => setShowUserDropdown(false)}>
                    <FaCog /> Ayarlar
                  </Link>
                  <div className="dropdown-divider"></div>
                  <button onClick={handleLogout} className="logout-btn">
                    <FaSignOutAlt /> Çıkış Yap
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="navbar-login-btn desktop-user">
              Giriş Yap
            </Link>
          )}
        </div>

        {/* Mobile Search Bar */}
        {showMobileSearch && (
          <div className="mobile-search-bar">
            <form onSubmit={handleSearch}>
              <input
                type="text"
                placeholder="Film veya dizi ara..."
                value={searchKey}
                onChange={(e) => setSearchKey(e.target.value)}
                autoFocus
              />
              <button type="submit">
                <FaSearch />
              </button>
            </form>
          </div>
        )}
      </nav>
      
      {/* Mobile Menu - Portal */}
      <MobileMenuPortal />
    </>
  );
};

export default Navbar;
