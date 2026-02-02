import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaStar, FaPlus, FaCheck, FaEllipsisV, FaEye, FaCalendar, FaPause, FaTimes, FaListUl } from 'react-icons/fa';

const IMAGE_PATH = "https://image.tmdb.org/t/p/w500";

const MediaCard = ({ item, type = 'movie', onAddToList, isInList, userRating, status, userLists = [] }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showListSelect, setShowListSelect] = useState(false);
  const menuRef = useRef(null);
  
  const title = type === 'movie' ? item.title : item.name;
  const releaseDate = type === 'movie' ? item.release_date : item.first_air_date;
  const year = releaseDate ? new Date(releaseDate).getFullYear() : 'N/A';
  
  // Dışarı tıklandığında menüyü kapat
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
        setShowListSelect(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const statusOptions = [
    { value: 'watching', label: 'İzliyorum', icon: <FaEye />, color: '#3498db' },
    { value: 'completed', label: 'Tamamladım', icon: <FaCheck />, color: '#2ecc71' },
    { value: 'planned', label: 'Planlıyorum', icon: <FaCalendar />, color: '#9b59b6' },
    { value: 'onhold', label: 'Beklemede', icon: <FaPause />, color: '#f39c12' },
    { value: 'dropped', label: 'Bıraktım', icon: <FaTimes />, color: '#e74c3c' },
  ];

  const handleAddClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(true);
  };

  const handleStatusSelect = (selectedStatus) => {
    if (onAddToList) {
      onAddToList(item, type, selectedStatus);
    }
    setShowMenu(false);
  };

  const handleMenuToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(!showMenu);
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
            <button className="btn-in-list" onClick={handleMenuToggle}>
              <FaCheck /> Listemde
            </button>
          ) : (
            <button className="btn-add" onClick={handleAddClick}>
              <FaPlus /> Ekle
            </button>
          )}
          
          <button className="btn-menu" onClick={handleMenuToggle}>
            <FaEllipsisV />
          </button>
        </div>

        {showMenu && (
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
            {userLists && userLists.length > 0 && (
              <>
                <div className="dropdown-divider"></div>
                <div className="dropdown-header">Özel Listeler</div>
                {userLists.map((list) => (
                  <button 
                    key={list.id}
                    className="dropdown-item"
                    onClick={() => {
                      onAddToList && onAddToList(item, type, 'planned', list.id);
                      setShowMenu(false);
                    }}
                  >
                    <span className="dropdown-icon"><FaListUl /></span>
                    <span>{list.name}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaCard;
