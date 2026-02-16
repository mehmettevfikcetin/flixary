import React, { useState, useEffect } from 'react';
import { FaTimes, FaEye, FaCheck, FaCalendar, FaPause, FaTimesCircle, FaPlus, FaListUl, FaStar, FaStarHalfAlt, FaMinus } from 'react-icons/fa';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const AddToListModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  item, 
  type,
  title 
}) => {
  const [selectedStatus, setSelectedStatus] = useState('planned');
  const [selectedList, setSelectedList] = useState(null);
  const [customLists, setCustomLists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [ratingInput, setRatingInput] = useState('0');

  const statuses = [
    { value: 'watching', label: 'İzliyorum', icon: <FaEye />, color: '#3b82f6' },
    { value: 'completed', label: 'Tamamladım', icon: <FaCheck />, color: '#10b981' },
    { value: 'planned', label: 'Planlıyorum', icon: <FaCalendar />, color: '#8b5cf6' },
    { value: 'onhold', label: 'Beklemede', icon: <FaPause />, color: '#f59e0b' },
    { value: 'dropped', label: 'Bıraktım', icon: <FaTimesCircle />, color: '#ef4444' },
  ];

  useEffect(() => {
    if (isOpen && auth.currentUser) {
      fetchCustomLists();
      setSelectedStatus('planned');
      setUserRating(0);
      setHoverRating(0);
      setRatingInput('0');
      setSelectedList(null);
    }
  }, [isOpen]);

  const fetchCustomLists = async () => {
    try {
      const q = query(
        collection(db, "customLists"),
        where("uid", "==", auth.currentUser.uid)
      );
      const snapshot = await getDocs(q);
      const lists = [];
      snapshot.forEach(doc => lists.push({ id: doc.id, ...doc.data() }));
      setCustomLists(lists);
    } catch (error) {
      console.error("Liste çekme hatası:", error);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm({
        status: selectedStatus,
        customListId: selectedList,
        userRating: selectedStatus === 'completed' && userRating > 0 ? userRating : null
      });
    } catch (e) {
      // error handled by parent
    } finally {
      setLoading(false);
    }
  };

  const handleStarClick = (starIndex, isHalf) => {
    const newRating = isHalf ? starIndex + 0.5 : starIndex + 1;
    setUserRating(newRating);
    setRatingInput(newRating.toString());
  };

  const handleRatingInputChange = (e) => {
    const value = e.target.value;
    setRatingInput(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 10) {
      const rounded = Math.round(numValue * 2) / 2;
      setUserRating(rounded);
    }
  };

  const handleRatingInputBlur = () => {
    setRatingInput(userRating.toString());
  };

  const getStarType = (starIndex, currentValue) => {
    const starNumber = starIndex + 1;
    if (currentValue >= starNumber) return 'full';
    if (currentValue >= starNumber - 0.5) return 'half';
    return 'empty';
  };

  const getRatingLabel = (r) => {
    if (r === 0) return '';
    if (r <= 1) return '😞 Berbat';
    if (r <= 2) return '😕 Çok Kötü';
    if (r <= 3) return '😐 Kötü';
    if (r <= 4) return '🙁 Vasat Altı';
    if (r <= 5) return '😶 Vasat';
    if (r <= 6) return '🙂 Fena Değil';
    if (r <= 7) return '😊 İyi';
    if (r <= 8) return '😃 Çok İyi';
    if (r <= 9) return '🤩 Harika';
    return '🏆 Başyapıt';
  };

  const displayRating = hoverRating || userRating;

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content add-list-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <FaTimes />
        </button>
        
        <h3>Listeye Ekle</h3>
        <p className="modal-subtitle">{title}</p>
        
        <div className="add-list-section">
          <h4>Durum Seç</h4>
          <div className="status-grid">
            {statuses.map((s) => (
              <button
                key={s.value}
                className={`status-option ${selectedStatus === s.value ? 'active' : ''}`}
                style={{ '--status-color': s.color }}
                onClick={() => setSelectedStatus(s.value)}
              >
                {s.icon}
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tamamladım seçildiğinde puan verme alanı */}
        {selectedStatus === 'completed' && (
          <div className="add-list-section rating-section">
            <h4><FaStar style={{ color: '#ffc107' }} /> Puanla (İsteğe Bağlı)</h4>
            <div className="inline-rating-container">
              <div className="star-rating small">
                {[...Array(10)].map((_, index) => {
                  const starType = getStarType(index, displayRating);
                  return (
                    <div 
                      key={index} 
                      className="star-wrapper"
                      onMouseLeave={() => setHoverRating(0)}
                    >
                      <div 
                        className="star-half left"
                        onMouseEnter={() => setHoverRating(index + 0.5)}
                        onClick={() => handleStarClick(index, true)}
                      />
                      <div 
                        className="star-half right"
                        onMouseEnter={() => setHoverRating(index + 1)}
                        onClick={() => handleStarClick(index, false)}
                      />
                      <div className={`star-display ${starType}`}>
                        {starType === 'half' ? (
                          <FaStarHalfAlt className="star-icon" />
                        ) : (
                          <FaStar className="star-icon" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="inline-rating-input">
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  value={ratingInput}
                  onChange={handleRatingInputChange}
                  onBlur={handleRatingInputBlur}
                  className="rating-input"
                />
                <span className="rating-max-label">/ 10</span>
              </div>
              {userRating > 0 && (
                <div className="rating-label">{getRatingLabel(userRating)}</div>
              )}
            </div>
          </div>
        )}

        {customLists.length > 0 && (
          <div className="add-list-section">
            <h4>Özel Listeye Ekle (İsteğe Bağlı)</h4>
            <div className="custom-lists-grid">
              <button
                className={`custom-list-option ${selectedList === null ? 'active' : ''}`}
                onClick={() => setSelectedList(null)}
              >
                <FaListUl />
                <span>Sadece Ana Liste</span>
              </button>
              {customLists.map((list) => (
                <button
                  key={list.id}
                  className={`custom-list-option ${selectedList === list.id ? 'active' : ''}`}
                  onClick={() => setSelectedList(list.id)}
                  style={{ '--list-color': list.color || '#6366f1' }}
                >
                  <span className="list-emoji">{list.emoji || '📋'}</span>
                  <span>{list.name}</span>
                  <span className="list-count">{list.itemCount || 0}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>İptal</button>
          <button className="btn-save" onClick={handleConfirm} disabled={loading}>
            {loading ? 'Ekleniyor...' : 'Listeye Ekle'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddToListModal;
