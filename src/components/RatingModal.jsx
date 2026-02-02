import React, { useState } from 'react';
import { FaStar, FaTimes } from 'react-icons/fa';

const RatingModal = ({ isOpen, onClose, onSave, currentRating = 0, title }) => {
  const [rating, setRating] = useState(currentRating);
  const [hover, setHover] = useState(0);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(rating);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content rating-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <FaTimes />
        </button>
        
        <h3>Puanla</h3>
        <p className="rating-title">{title}</p>
        
        <div className="star-rating">
          {[...Array(10)].map((_, index) => {
            const ratingValue = index + 1;
            return (
              <button
                key={index}
                className={`star-btn ${ratingValue <= (hover || rating) ? 'active' : ''}`}
                onClick={() => setRating(ratingValue)}
                onMouseEnter={() => setHover(ratingValue)}
                onMouseLeave={() => setHover(0)}
              >
                <FaStar />
              </button>
            );
          })}
        </div>
        
        <div className="rating-value">
          {rating > 0 ? (
            <>
              <span className="big-rating">{rating}</span>
              <span className="rating-max">/10</span>
            </>
          ) : (
            <span className="no-rating">Henüz puanlanmadı</span>
          )}
        </div>

        <div className="rating-labels">
          {rating === 1 && <span>😞 Berbat</span>}
          {rating === 2 && <span>😕 Çok Kötü</span>}
          {rating === 3 && <span>😐 Kötü</span>}
          {rating === 4 && <span>🙁 Vasat Altı</span>}
          {rating === 5 && <span>😶 Vasat</span>}
          {rating === 6 && <span>🙂 Fena Değil</span>}
          {rating === 7 && <span>😊 İyi</span>}
          {rating === 8 && <span>😃 Çok İyi</span>}
          {rating === 9 && <span>🤩 Harika</span>}
          {rating === 10 && <span>🏆 Başyapıt</span>}
        </div>
        
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>İptal</button>
          <button className="btn-save" onClick={handleSave}>Kaydet</button>
        </div>
      </div>
    </div>
  );
};

export default RatingModal;
