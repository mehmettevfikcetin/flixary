import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaStar, FaPlus, FaCheck, FaEye, FaCalendar, FaPause, FaTimes } from 'react-icons/fa';

const IMAGE_PATH = "https://image.tmdb.org/t/p/w500";

const MediaCard = ({ item, type = 'movie', onAddToList, isInList, userRating, status }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  
  // Anime tespiti: Japonca ve Animasyon türü
  // TMDB'de anime genre_id 16 (Animation) ve original_language 'ja' (Japanese)
  const isAnime = (item.genre_ids?.includes(16) && item.original_language === 'ja') || 
                  (item.original_language === 'ja' && (item.genre_ids?.includes(16) || type === 'tv'));
  
  // Anime için İngilizce/orijinal isim kullan, yoksa Türkçe
  const getDisplayTitle = () => {
    if (type === 'movie') {
      if (isAnime && item.original_title && item.original_title !== item.title) {
        return item.original_title;
      }
      return item.title || item.original_title;
    } else {
      if (isAnime && item.original_name && item.original_name !== item.name) {
        return item.original_name;
      }
      return item.name || item.original_name;
    }
  };
  
  const title = getDisplayTitle();
  
  const releaseDate = type === 'movie' ? item.release_date : item.first_air_date;
  const year = releaseDate ? new Date(releaseDate).getFullYear() : 'N/A';
  
  // Dışarı tıklandığında menüyü kapat
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const statusColors = {
    watching: '#3b82f6',
    completed: '#10b981',
    planned: '#8b5cf6',
    dropped: '#ef4444',
    onhold: '#f59e0b'
  };

  const statusLabels = {
    watching: 'İzleniyor',
    completed: 'Tamamlandı',
    planned: 'Planlandı',
    dropped: 'Bırakıldı',
    onhold: 'Beklemede'
  };

  const statusOptions = [
    { value: 'watching', label: 'İzliyorum', icon: <FaEye />, color: '#3b82f6' },
    { value: 'completed', label: 'Tamamladım', icon: <FaCheck />, color: '#10b981' },
    { value: 'planned', label: 'Planlıyorum', icon: <FaCalendar />, color: '#8b5cf6' },
    { value: 'onhold', label: 'Beklemede', icon: <FaPause />, color: '#f59e0b' },
    { value: 'dropped', label: 'Bıraktım', icon: <FaTimes />, color: '#ef4444' },
  ];

  const handleAddClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isInList) return;
    setShowMenu(true);
  };

  const handleStatusSelect = (selectedStatus) => {
    if (onAddToList) {
      onAddToList(item, type, selectedStatus);
    }
    setShowMenu(false);
  };

  return (
    <div className="media-card" ref={menuRef}>
      <Link to={`/${type}/${item.id}`} className="card-image-wrapper">
        <img
          src={item.poster_path ? IMAGE_PATH + item.poster_path : 'https://via.placeholder.com/200x300?text=No+Image'}
          alt={title}
          loading="lazy"
        />
        <div className="card-overlay">
          <div className="card-rating">
            <FaStar className="star-icon" />
            <span>{item.vote_average ? item.vote_average.toFixed(1) : 'N/A'}</span>
          </div>
          {userRating && (
            <div className="user-rating">
              <span>⭐ {userRating}/10</span>
            </div>
          )}
        </div>
        {status && (
          <div className="status-badge" style={{ backgroundColor: statusColors[status] }}>
            {statusLabels[status]}
          </div>
        )}
      </Link>
      
      <div className="card-info">
        <Link to={`/${type}/${item.id}`} className="card-title">
          {title}
        </Link>
        <span className="card-year">{year}</span>
        
        <div className="card-actions">
          {isInList ? (
            <Link to="/profile" className="btn-in-list">
              <FaCheck /> Listemde
            </Link>
          ) : (
            <button className="btn-add" onClick={handleAddClick}>
              <FaPlus /> Ekle
            </button>
          )}
        </div>

        {showMenu && !isInList && (
          <div className="card-dropdown" onClick={(e) => e.stopPropagation()}>
            <div className="dropdown-header">Listeye Ekle</div>
            {statusOptions.map((opt) => (
              <button 
                key={opt.value}
                className="dropdown-item"
                onClick={() => handleStatusSelect(opt.value)}
                style={{ '--item-color': opt.color }}
              >
                <span className="dropdown-icon" style={{ color: opt.color }}>{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaCard;
