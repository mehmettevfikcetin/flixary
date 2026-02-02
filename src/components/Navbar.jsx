import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { FaSearch, FaUser, FaFilm, FaTv, FaHome, FaBars, FaTimes, FaCompass, FaSignOutAlt, FaCog } from 'react-icons/fa';

const Navbar = ({ user }) => {
  const [searchKey, setSearchKey] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

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

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo" onClick={() => setMobileMenuOpen(false)}>
          <span className="logo-icon">🎬</span>
          <span className="logo-text">Flixary</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="navbar-center">
          <div className="nav-links">
            <Link to="/" className="nav-link">
              <FaHome /> <span>Ana Sayfa</span>
            </Link>
            <Link to="/discover" className="nav-link">
              <FaCompass /> <span>Keşfet</span>
            </Link>
            <Link to="/movies" className="nav-link">
              <FaFilm /> <span>Filmler</span>
            </Link>
            <Link to="/series" className="nav-link">
              <FaTv /> <span>Diziler</span>
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
            className="mobile-search-btn"
            onClick={() => setShowMobileSearch(!showMobileSearch)}
          >
            <FaSearch />
          </button>
          
          <button 
            className="mobile-menu-btn" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>

        {/* User Avatar - Desktop with Click Dropdown */}
        {user && (
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

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="mobile-menu active">
          <div className="mobile-menu-content">
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
              <Link to="/discover" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
                <FaCompass /> Keşfet
              </Link>
              <Link to="/movies" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
                <FaFilm /> Filmler
              </Link>
              <Link to="/series" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
                <FaTv /> Diziler
              </Link>
              {user && (
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
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
