import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { FaSearch, FaUser, FaFilm, FaTv, FaHome, FaBars, FaTimes, FaCompass } from 'react-icons/fa';

const Navbar = ({ user }) => {
  const [searchKey, setSearchKey] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchKey.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchKey)}`);
      setSearchKey('');
      setMobileMenuOpen(false);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <span className="logo-icon">🎬</span>
          <span className="logo-text">Flixary</span>
        </Link>

        <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <FaTimes /> : <FaBars />}
        </button>

        <div className={`navbar-menu ${mobileMenuOpen ? 'active' : ''}`}>
          <div className="nav-links">
            <Link to="/" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
              <FaHome /> Ana Sayfa
            </Link>
            <Link to="/discover" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
              <FaCompass /> Keşfet
            </Link>
            <Link to="/movies" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
              <FaFilm /> Filmler
            </Link>
            <Link to="/series" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
              <FaTv /> Diziler
            </Link>
          </div>

          <form onSubmit={handleSearch} className="navbar-search">
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

          {user && (
            <div className="navbar-user">
              <Link to="/profile" className="user-avatar" onClick={() => setMobileMenuOpen(false)}>
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
                  🚪 Çıkış Yap
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
