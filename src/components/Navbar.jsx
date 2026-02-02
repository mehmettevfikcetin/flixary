import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { FaSearch, FaUser, FaFilm, FaTv, FaHome, FaBars, FaTimes, FaCompass, FaSignOutAlt } from 'react-icons/fa';

const Navbar = ({ user }) => {
  const [searchKey, setSearchKey] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchKey.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchKey)}`);
      setSearchKey('');
      setMobileMenuOpen(false);
      setShowMobileSearch(false);
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
          {/* Mobile Search Toggle */}
          <button 
            className="mobile-search-btn"
            onClick={() => setShowMobileSearch(!showMobileSearch)}
          >
            <FaSearch />
          </button>
          
          {/* Mobile Menu Toggle */}
          <button 
            className="mobile-menu-btn" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>

        {/* User Avatar - Desktop */}
        {user && (
          <div className="navbar-user desktop-user">
            <Link to="/profile" className="user-avatar">
              <img src={user.photoURL || 'https://via.placeholder.com/40'} alt="Avatar" />
            </Link>
            <div className="user-dropdown">
              <Link to="/profile">
                <FaUser /> Profilim
              </Link>
              <Link to="/lists">
                📋 Listelerim
              </Link>
              <button onClick={() => auth.signOut()}>
                <FaSignOutAlt /> Çıkış Yap
              </button>
            </div>
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
      <div className={`mobile-menu ${mobileMenuOpen ? 'active' : ''}`}>
        <div className="mobile-menu-content">
          {user && (
            <div className="mobile-user-info">
              <img src={user.photoURL || 'https://via.placeholder.com/50'} alt="Avatar" />
              <div>
                <span className="user-name">{user.displayName}</span>
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
                <Link to="/profile" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
                  <FaUser /> Profilim
                </Link>
                <button className="mobile-nav-link logout" onClick={() => { auth.signOut(); setMobileMenuOpen(false); }}>
                  <FaSignOutAlt /> Çıkış Yap
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
