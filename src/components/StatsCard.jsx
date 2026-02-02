import React from 'react';
import { FaFilm, FaTv, FaClock, FaStar, FaCalendarCheck, FaChartPie } from 'react-icons/fa';

const StatsCard = ({ stats }) => {
  const { 
    totalMovies = 0, 
    totalSeries = 0, 
    totalEpisodes = 0,
    watchingCount = 0,
    completedCount = 0,
    plannedCount = 0,
    droppedCount = 0,
    onholdCount = 0,
    totalWatchTime = 0,
    averageRating = 0,
    totalRated = 0,
    genreDistribution = []
  } = stats;

  const formatWatchTime = (minutes) => {
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const mins = minutes % 60;
    
    if (days > 0) {
      return `${days}g ${hours}s ${mins}d`;
    } else if (hours > 0) {
      return `${hours}s ${mins}d`;
    }
    return `${mins}d`;
  };

  const totalItems = totalMovies + totalSeries;

  return (
    <div className="stats-container">
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">
            <FaFilm />
          </div>
          <div className="stat-info">
            <span className="stat-value">{totalMovies}</span>
            <span className="stat-label">Film</span>
          </div>
        </div>

        <div className="stat-card secondary">
          <div className="stat-icon">
            <FaTv />
          </div>
          <div className="stat-info">
            <span className="stat-value">{totalSeries}</span>
            <span className="stat-label">Dizi</span>
          </div>
        </div>

        <div className="stat-card tertiary">
          <div className="stat-icon">
            <FaClock />
          </div>
          <div className="stat-info">
            <span className="stat-value">{formatWatchTime(totalWatchTime)}</span>
            <span className="stat-label">İzleme Süresi</span>
          </div>
        </div>

        <div className="stat-card quaternary">
          <div className="stat-icon">
            <FaStar />
          </div>
          <div className="stat-info">
            <span className="stat-value">{averageRating.toFixed(1)}</span>
            <span className="stat-label">Ort. Puan ({totalRated})</span>
          </div>
        </div>
      </div>

      <div className="status-breakdown">
        <h4><FaChartPie /> Durum Dağılımı</h4>
        <div className="status-bars">
          <div className="status-bar-item">
            <div className="status-bar-label">
              <span>👁️ İzleniyor</span>
              <span>{watchingCount}</span>
            </div>
            <div className="status-bar">
              <div 
                className="status-bar-fill watching" 
                style={{ width: totalItems ? `${(watchingCount / totalItems) * 100}%` : '0%' }}
              />
            </div>
          </div>

          <div className="status-bar-item">
            <div className="status-bar-label">
              <span>✅ Tamamlandı</span>
              <span>{completedCount}</span>
            </div>
            <div className="status-bar">
              <div 
                className="status-bar-fill completed" 
                style={{ width: totalItems ? `${(completedCount / totalItems) * 100}%` : '0%' }}
              />
            </div>
          </div>

          <div className="status-bar-item">
            <div className="status-bar-label">
              <span>📅 Planlandı</span>
              <span>{plannedCount}</span>
            </div>
            <div className="status-bar">
              <div 
                className="status-bar-fill planned" 
                style={{ width: totalItems ? `${(plannedCount / totalItems) * 100}%` : '0%' }}
              />
            </div>
          </div>

          <div className="status-bar-item">
            <div className="status-bar-label">
              <span>⏸️ Beklemede</span>
              <span>{onholdCount}</span>
            </div>
            <div className="status-bar">
              <div 
                className="status-bar-fill onhold" 
                style={{ width: totalItems ? `${(onholdCount / totalItems) * 100}%` : '0%' }}
              />
            </div>
          </div>

          <div className="status-bar-item">
            <div className="status-bar-label">
              <span>❌ Bırakıldı</span>
              <span>{droppedCount}</span>
            </div>
            <div className="status-bar">
              <div 
                className="status-bar-fill dropped" 
                style={{ width: totalItems ? `${(droppedCount / totalItems) * 100}%` : '0%' }}
              />
            </div>
          </div>
        </div>
      </div>

      {genreDistribution.length > 0 && (
        <div className="genre-distribution">
          <h4>🎭 Favori Türler</h4>
          <div className="genre-tags">
            {genreDistribution.slice(0, 8).map((genre, index) => (
              <span key={genre.id} className="genre-tag" style={{ opacity: 1 - (index * 0.1) }}>
                {genre.name} ({genre.count})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StatsCard;
