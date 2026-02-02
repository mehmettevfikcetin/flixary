import React, { useState, useEffect } from 'react';
import { FaStar, FaTimes, FaStarHalfAlt, FaMinus, FaPlus } from 'react-icons/fa';

const RatingModal = ({ isOpen, onClose, onSave, currentRating = 0, title }) => {
  const [rating, setRating] = useState(currentRating);
  const [hover, setHover] = useState(0);
  const [inputValue, setInputValue] = useState(currentRating.toString());

  useEffect(() => {
    if (isOpen) {
      setRating(currentRating);
      setInputValue(currentRating.toString());
    }
  }, [isOpen, currentRating]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(rating);
    onClose();
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 10) {
      // 0.5'in katlarına yuvarla
      const rounded = Math.round(numValue * 2) / 2;
      setRating(rounded);
    }
  };

  const handleInputBlur = () => {
    setInputValue(rating.toString());
  };

  const incrementRating = () => {
    const newRating = Math.min(10, rating + 0.5);
    setRating(newRating);
    setInputValue(newRating.toString());
  };

  const decrementRating = () => {
    const newRating = Math.max(0, rating - 0.5);
    setRating(newRating);
    setInputValue(newRating.toString());
  };

  const handleStarClick = (starIndex, isHalf) => {
    const newRating = isHalf ? starIndex + 0.5 : starIndex + 1;
    setRating(newRating);
    setInputValue(newRating.toString());
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

  const getStarType = (starIndex, currentValue) => {
    const starNumber = starIndex + 1;
    if (currentValue >= starNumber) return 'full';
    if (currentValue >= starNumber - 0.5) return 'half';
    return 'empty';
  };

  const displayRating = hover || rating;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content rating-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <FaTimes />
        </button>
        
        <h3>Puanla</h3>
        <p className="rating-title">{title}</p>
        
        {/* Star Rating */}
        <div className="star-rating-container">
          <div className="star-rating">
            {[...Array(10)].map((_, index) => {
              const starType = getStarType(index, displayRating);
              return (
                <div 
                  key={index} 
                  className="star-wrapper"
                  onMouseLeave={() => setHover(0)}
                >
                  {/* Sol yarı - 0.5 puan */}
                  <div 
                    className="star-half left"
                    onMouseEnter={() => setHover(index + 0.5)}
                    onClick={() => handleStarClick(index, true)}
                  />
                  {/* Sağ yarı - 1 puan */}
                  <div 
                    className="star-half right"
                    onMouseEnter={() => setHover(index + 1)}
                    onClick={() => handleStarClick(index, false)}
                  />
                  {/* Yıldız görüntüsü */}
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
        </div>
        
        {/* Manuel Puan Girişi */}
        <div className="rating-input-container">
          <button className="rating-adjust-btn" onClick={decrementRating}>
            <FaMinus />
          </button>
          <div className="rating-input-wrapper">
            <input
              type="number"
              min="0"
              max="10"
              step="0.5"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              className="rating-input"
            />
            <span className="rating-max-label">/ 10</span>
          </div>
          <button className="rating-adjust-btn" onClick={incrementRating}>
            <FaPlus />
          </button>
        </div>

        {/* Slider */}
        <div className="rating-slider-container">
          <input
            type="range"
            min="0"
            max="10"
            step="0.5"
            value={rating}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setRating(val);
              setInputValue(val.toString());
            }}
            className="rating-slider"
            style={{
              background: `linear-gradient(to right, #ffc107 0%, #ffc107 ${rating * 10}%, #2a3a4f ${rating * 10}%, #2a3a4f 100%)`
            }}
          />
          <div className="slider-labels">
            <span>0</span>
            <span>5</span>
            <span>10</span>
          </div>
        </div>

        <div className="rating-label">
          {getRatingLabel(rating)}
        </div>
        
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>İptal</button>
          <button className="btn-save" onClick={handleSave} disabled={rating === 0}>
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
};

export default RatingModal;
