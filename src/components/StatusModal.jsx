import React, { useState } from 'react';
import { FaTimes, FaEye, FaCheck, FaCalendar, FaPause, FaTimesCircle } from 'react-icons/fa';

const StatusModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  currentStatus = '', 
  currentProgress = 0,
  currentNotes = '',
  title,
  totalEpisodes = null,
  mediaType = 'movie'
}) => {
  const [status, setStatus] = useState(currentStatus);
  const [progress, setProgress] = useState(currentProgress);
  const [notes, setNotes] = useState(currentNotes);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  if (!isOpen) return null;

  const statuses = [
    { value: 'watching', label: 'İzliyorum', icon: <FaEye />, color: '#3498db' },
    { value: 'completed', label: 'Tamamladım', icon: <FaCheck />, color: '#2ecc71' },
    { value: 'planned', label: 'Planlıyorum', icon: <FaCalendar />, color: '#9b59b6' },
    { value: 'onhold', label: 'Beklemede', icon: <FaPause />, color: '#f39c12' },
    { value: 'dropped', label: 'Bıraktım', icon: <FaTimesCircle />, color: '#e74c3c' },
  ];

  const handleSave = () => {
    onSave({
      status,
      progress,
      notes,
      startDate,
      endDate
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content status-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <FaTimes />
        </button>
        
        <h3>Liste Durumu</h3>
        <p className="modal-title">{title}</p>
        
        <div className="status-options">
          {statuses.map((s) => (
            <button
              key={s.value}
              className={`status-btn ${status === s.value ? 'active' : ''}`}
              style={{ '--status-color': s.color }}
              onClick={() => setStatus(s.value)}
            >
              {s.icon}
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        {mediaType === 'tv' && (
          <div className="progress-section">
            <label>İlerleme (Bölüm)</label>
            <div className="progress-input">
              <input
                type="number"
                min="0"
                max={totalEpisodes || 999}
                value={progress}
                onChange={(e) => setProgress(parseInt(e.target.value) || 0)}
              />
              <span>/ {totalEpisodes || '?'}</span>
            </div>
            {totalEpisodes && (
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${(progress / totalEpisodes) * 100}%` }}
                />
              </div>
            )}
          </div>
        )}

        <div className="dates-section">
          <div className="date-input">
            <label>Başlangıç Tarihi</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="date-input">
            <label>Bitiş Tarihi</label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="notes-section">
          <label>Notlar</label>
          <textarea
            placeholder="Bu yapım hakkında notlarını yaz..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>
        
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>İptal</button>
          <button className="btn-save" onClick={handleSave}>Kaydet</button>
        </div>
      </div>
    </div>
  );
};

export default StatusModal;
