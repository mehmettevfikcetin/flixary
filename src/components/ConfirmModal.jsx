import React from 'react';
import { FaTimes, FaExclamationTriangle } from 'react-icons/fa';

const ConfirmModal = ({ 
  isOpen, 
  title = 'Onay', 
  message, 
  onConfirm, 
  onCancel,
  confirmText = 'Evet',
  cancelText = 'İptal',
  type = 'warning' // warning, danger, info
}) => {
  if (!isOpen) return null;

  const typeColors = {
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6'
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onCancel}>
          <FaTimes />
        </button>
        
        <div className="confirm-icon" style={{ color: typeColors[type] }}>
          <FaExclamationTriangle />
        </div>
        
        <h3>{title}</h3>
        <p className="confirm-message">{message}</p>
        
        <div className="confirm-actions">
          <button className="btn-cancel" onClick={onCancel}>
            {cancelText}
          </button>
          <button 
            className={`btn-confirm btn-${type}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
