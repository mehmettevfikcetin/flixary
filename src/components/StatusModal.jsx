import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaEye, FaCheck, FaCalendar, FaPause, FaTimesCircle, FaMinus, FaPlus, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const StatusModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  currentStatus = '', 
  currentProgress = 0,
  currentNotes = '',
  currentStartDate = '',
  currentEndDate = '',
  title,
  totalEpisodes = null,
  mediaType = 'movie'
}) => {
  const [status, setStatus] = useState(currentStatus);
  const [progress, setProgress] = useState(currentProgress);
  const [notes, setNotes] = useState(currentNotes);
  const [startDate, setStartDate] = useState(currentStartDate);
  const [endDate, setEndDate] = useState(currentEndDate);
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());

  useEffect(() => {
    if (isOpen) {
      setStatus(currentStatus);
      setProgress(currentProgress);
      setNotes(currentNotes);
      setStartDate(currentStartDate || '');
      setEndDate(currentEndDate || '');
    }
  }, [isOpen, currentStatus, currentProgress, currentNotes, currentStartDate, currentEndDate]);

  if (!isOpen) return null;

  const statuses = [
    { value: 'watching', label: 'İzliyorum', icon: <FaEye />, color: '#3b82f6' },
    { value: 'completed', label: 'Tamamladım', icon: <FaCheck />, color: '#10b981' },
    { value: 'planned', label: 'Planlıyorum', icon: <FaCalendar />, color: '#8b5cf6' },
    { value: 'onhold', label: 'Beklemede', icon: <FaPause />, color: '#f59e0b' },
    { value: 'dropped', label: 'Bıraktım', icon: <FaTimesCircle />, color: '#ef4444' },
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

  const incrementProgress = () => {
    const max = totalEpisodes || 999;
    setProgress(prev => Math.min(prev + 1, max));
  };

  const decrementProgress = () => {
    setProgress(prev => Math.max(prev - 1, 0));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleDateSelect = (day, isStart) => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    if (isStart) {
      setStartDate(dateStr);
      setShowStartCalendar(false);
    } else {
      setEndDate(dateStr);
      setShowEndCalendar(false);
    }
  };

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const renderCalendar = (isStart) => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];
    const today = new Date();
    const selectedDate = isStart ? startDate : endDate;
    
    // Empty cells for days before the first day
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isSelected = selectedDate === dateStr;
      const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
      
      days.push(
        <button
          key={day}
          type="button"
          className={`calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
          onClick={() => handleDateSelect(day, isStart)}
        >
          {day}
        </button>
      );
    }
    
    const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
                        'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    
    return (
      <div className="modern-calendar">
        <div className="calendar-header">
          <button 
            type="button"
            className="calendar-nav-btn"
            onClick={() => setCalendarDate(new Date(year, month - 1, 1))}
          >
            <FaChevronLeft />
          </button>
          <span className="calendar-title">{monthNames[month]} {year}</span>
          <button 
            type="button"
            className="calendar-nav-btn"
            onClick={() => setCalendarDate(new Date(year, month + 1, 1))}
          >
            <FaChevronRight />
          </button>
        </div>
        <div className="calendar-weekdays">
          {['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'].map(d => (
            <div key={d} className="weekday">{d}</div>
          ))}
        </div>
        <div className="calendar-days">
          {days}
        </div>
        <div className="calendar-actions">
          <button 
            type="button" 
            className="calendar-today-btn"
            onClick={() => {
              const today = new Date();
              setCalendarDate(today);
              const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
              if (isStart) setStartDate(dateStr);
              else setEndDate(dateStr);
            }}
          >
            Bugün
          </button>
          <button 
            type="button" 
            className="calendar-clear-btn"
            onClick={() => {
              if (isStart) {
                setStartDate('');
                setShowStartCalendar(false);
              } else {
                setEndDate('');
                setShowEndCalendar(false);
              }
            }}
          >
            Temizle
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content status-modal modern" onClick={(e) => e.stopPropagation()}>
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
          <div className="progress-section modern">
            <label>İlerleme (Bölüm)</label>
            <div className="progress-input-container">
              <button 
                type="button"
                className="progress-btn decrement"
                onClick={decrementProgress}
                disabled={progress <= 0}
              >
                <FaMinus />
              </button>
              <div className="progress-display">
                <input
                  type="number"
                  min="0"
                  max={totalEpisodes || 999}
                  value={progress}
                  onChange={(e) => setProgress(parseInt(e.target.value) || 0)}
                  className="progress-input"
                />
                <span className="progress-total">/ {totalEpisodes || '?'}</span>
              </div>
              <button 
                type="button"
                className="progress-btn increment"
                onClick={incrementProgress}
                disabled={totalEpisodes && progress >= totalEpisodes}
              >
                <FaPlus />
              </button>
            </div>
            {totalEpisodes && (
              <div className="progress-bar-container">
                <div className="progress-bar modern">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${Math.min((progress / totalEpisodes) * 100, 100)}%` }}
                  />
                </div>
                <span className="progress-percentage">
                  {Math.round((progress / totalEpisodes) * 100)}%
                </span>
              </div>
            )}
          </div>
        )}

        <div className="dates-section modern">
          <div className="date-input-container">
            <label>Başlangıç Tarihi</label>
            <div className="date-picker-wrapper">
              <button 
                type="button"
                className="date-picker-btn"
                onClick={() => {
                  setShowStartCalendar(!showStartCalendar);
                  setShowEndCalendar(false);
                  if (startDate) {
                    setCalendarDate(new Date(startDate));
                  } else {
                    setCalendarDate(new Date());
                  }
                }}
              >
                <FaCalendar />
                <span>{startDate ? formatDate(startDate) : 'Tarih Seç'}</span>
              </button>
              {showStartCalendar && renderCalendar(true)}
            </div>
          </div>
          <div className="date-input-container">
            <label>Bitiş Tarihi</label>
            <div className="date-picker-wrapper">
              <button 
                type="button"
                className="date-picker-btn"
                onClick={() => {
                  setShowEndCalendar(!showEndCalendar);
                  setShowStartCalendar(false);
                  if (endDate) {
                    setCalendarDate(new Date(endDate));
                  } else {
                    setCalendarDate(new Date());
                  }
                }}
              >
                <FaCalendar />
                <span>{endDate ? formatDate(endDate) : 'Tarih Seç'}</span>
              </button>
              {showEndCalendar && renderCalendar(false)}
            </div>
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
