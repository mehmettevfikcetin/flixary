import React from 'react';
import { FaFilter, FaSortAmountDown } from 'react-icons/fa';

const FilterBar = ({ 
  filters, 
  setFilters, 
  showStatusFilter = true,
  showTypeFilter = true 
}) => {
  const genres = [
    { id: 28, name: 'Aksiyon' },
    { id: 12, name: 'Macera' },
    { id: 16, name: 'Animasyon' },
    { id: 35, name: 'Komedi' },
    { id: 80, name: 'Suç' },
    { id: 99, name: 'Belgesel' },
    { id: 18, name: 'Drama' },
    { id: 10751, name: 'Aile' },
    { id: 14, name: 'Fantastik' },
    { id: 36, name: 'Tarih' },
    { id: 27, name: 'Korku' },
    { id: 10402, name: 'Müzik' },
    { id: 9648, name: 'Gizem' },
    { id: 10749, name: 'Romantik' },
    { id: 878, name: 'Bilim Kurgu' },
    { id: 53, name: 'Gerilim' },
    { id: 10752, name: 'Savaş' },
    { id: 37, name: 'Western' },
  ];

  const years = [];
  const currentYear = new Date().getFullYear();
  for (let year = currentYear; year >= 1950; year--) {
    years.push(year);
  }

  const sortOptions = [
    { value: 'addedDesc', label: 'Eklenme (Yeni)' },
    { value: 'addedAsc', label: 'Eklenme (Eski)' },
    { value: 'ratingDesc', label: 'Puan (Yüksek)' },
    { value: 'ratingAsc', label: 'Puan (Düşük)' },
    { value: 'titleAsc', label: 'İsim (A-Z)' },
    { value: 'titleDesc', label: 'İsim (Z-A)' },
    { value: 'yearDesc', label: 'Yıl (Yeni)' },
    { value: 'yearAsc', label: 'Yıl (Eski)' },
    { value: 'userRatingDesc', label: 'Puanım (Yüksek)' },
    { value: 'userRatingAsc', label: 'Puanım (Düşük)' },
  ];

  return (
    <div className="filter-bar">
      <div className="filter-group">
        <FaFilter className="filter-icon" />
        
        {showTypeFilter && (
          <select
            value={filters.type || 'all'}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="filter-select"
          >
            <option value="all">Tümü</option>
            <option value="movie">Filmler</option>
            <option value="tv">Diziler</option>
          </select>
        )}

        {showStatusFilter && (
          <select
            value={filters.status || 'all'}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="filter-select"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="watching">İzleniyor</option>
            <option value="completed">Tamamlandı</option>
            <option value="planned">Planlandı</option>
            <option value="onhold">Beklemede</option>
            <option value="dropped">Bırakıldı</option>
          </select>
        )}

        <select
          value={filters.genre || ''}
          onChange={(e) => setFilters({ ...filters, genre: e.target.value })}
          className="filter-select"
        >
          <option value="">Tüm Türler</option>
          {genres.map((genre) => (
            <option key={genre.id} value={genre.id}>
              {genre.name}
            </option>
          ))}
        </select>

        <select
          value={filters.year || ''}
          onChange={(e) => setFilters({ ...filters, year: e.target.value })}
          className="filter-select"
        >
          <option value="">Tüm Yıllar</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>

        <select
          value={filters.minRating || ''}
          onChange={(e) => setFilters({ ...filters, minRating: e.target.value })}
          className="filter-select"
        >
          <option value="">Min. Puan</option>
          {[9, 8, 7, 6, 5, 4, 3, 2, 1].map((rating) => (
            <option key={rating} value={rating}>
              {rating}+ ⭐
            </option>
          ))}
        </select>
      </div>

      <div className="sort-group">
        <FaSortAmountDown className="sort-icon" />
        <select
          value={filters.sort || 'addedDesc'}
          onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
          className="filter-select"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {(filters.status !== 'all' || filters.genre || filters.year || filters.minRating) && (
        <button 
          className="clear-filters"
          onClick={() => setFilters({ type: filters.type, sort: filters.sort, status: 'all' })}
        >
          Filtreleri Temizle
        </button>
      )}
    </div>
  );
};

export default FilterBar;
