import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaStar, FaPlus, FaCheck, FaEllipsisV } from 'react-icons/fa';

const IMAGE_PATH = "https://image.tmdb.org/t/p/w500";

const MediaCard = ({ item, type = 'movie', onAddToList, isInList, userRating, status }) => {
  const [showMenu, setShowMenu] = useState(false);
  
  const title = type === 'movie' ? item.title : item.name;
  const releaseDate = type === 'movie' ? item.release_date : item.first_air_date;
  const year = releaseDate ? new Date(releaseDate).getFullYear() : 'N/A';
  
  const statusColors = {
    watching: '#3498db',
    completed: '#2ecc71',
    planned: '#9b59b6',
    dropped: '#e74c3c',
    onhold: '#f39c12'
  };

  const statusLabels = {
    watching: 'İzleniyor',
    completed: 'Tamamlandı',
    planned: 'Planlandı',
    dropped: 'Bırakıldı',
    onhold: 'Beklemede'
  };

  return (
    <div className="media-card">
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
              <span>Senin Puanın: {userRating}/10</span>
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
            <button className="btn-in-list" onClick={() => setShowMenu(!showMenu)}>
              <FaCheck /> Listemde
            </button>
          ) : (
            <button className="btn-add" onClick={() => onAddToList && onAddToList(item, type)}>
              <FaPlus /> Ekle
            </button>
          )}
          
          <button className="btn-menu" onClick={() => setShowMenu(!showMenu)}>
            <FaEllipsisV />
          </button>
        </div>

        {showMenu && (
          <div className="card-dropdown">
            <button onClick={() => { onAddToList && onAddToList(item, type, 'watching'); setShowMenu(false); }}>
              👁️ İzliyorum
            </button>
            <button onClick={() => { onAddToList && onAddToList(item, type, 'completed'); setShowMenu(false); }}>
              ✅ Tamamladım
            </button>
            <button onClick={() => { onAddToList && onAddToList(item, type, 'planned'); setShowMenu(false); }}>
              📅 Planlıyorum
            </button>
            <button onClick={() => { onAddToList && onAddToList(item, type, 'onhold'); setShowMenu(false); }}>
              ⏸️ Beklemede
            </button>
            <button onClick={() => { onAddToList && onAddToList(item, type, 'dropped'); setShowMenu(false); }}>
              ❌ Bıraktım
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaCard;
