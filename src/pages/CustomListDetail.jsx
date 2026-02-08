import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { doc, onSnapshot, updateDoc, arrayRemove, increment, getDoc, collection, query, where, getDocs, arrayUnion } from 'firebase/firestore';
import { FaArrowLeft, FaStar, FaTrash, FaExchangeAlt, FaFilter, FaTimes, FaFilm, FaTv, FaSort, FaEdit } from 'react-icons/fa';
import { showToast } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import RatingModal from '../components/RatingModal';
import StatusModal from '../components/StatusModal';

const IMAGE_PATH = "https://image.tmdb.org/t/p/w500";

const CustomListDetail = () => {
  const { listId } = useParams();
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [otherLists, setOtherLists] = useState([]);
  
  // Filters
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('addedDesc');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmData, setConfirmData] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [watchlistItem, setWatchlistItem] = useState(null); // Ana listedeki karşılığı

  useEffect(() => {
    if (!listId || !auth.currentUser) {
      setLoading(false);
      return;
    }

    // Liste detayını dinle
    const unsubscribe = onSnapshot(doc(db, "customLists", listId), (snapshot) => {
      if (snapshot.exists()) {
        setList({ id: snapshot.id, ...snapshot.data() });
      } else {
        showToast("Liste bulunamadı", "error");
        navigate('/profile');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [listId, navigate]);

  // Diğer listeleri çek (taşıma için)
  useEffect(() => {
    if (!auth.currentUser) return;

    const fetchOtherLists = async () => {
      try {
        const q = query(
          collection(db, "customLists"),
          where("uid", "==", auth.currentUser.uid)
        );
        const snapshot = await getDocs(q);
        const lists = [];
        snapshot.forEach(doc => {
          if (doc.id !== listId) {
            lists.push({ id: doc.id, ...doc.data() });
          }
        });
        setOtherLists(lists);
      } catch (error) {
        console.error("Listeler çekilemedi:", error);
      }
    };

    fetchOtherLists();
  }, [listId]);

  // Filtrelenmiş ve sıralanmış öğeler
  const filteredItems = useMemo(() => {
    if (!list?.items) return [];
    
    let result = [...list.items];
    
    // Tip filtresi
    if (typeFilter !== 'all') {
      result = result.filter(item => item.mediaType === typeFilter);
    }
    
    // Arama
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => item.title?.toLowerCase().includes(query));
    }
    
    // Sıralama
    switch (sortBy) {
      case 'titleAsc':
        result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        break;
      case 'titleDesc':
        result.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
        break;
      case 'addedAsc':
        // Ekleme sırasına göre (ters)
        result.reverse();
        break;
      default:
        // addedDesc - varsayılan sıra
        break;
    }
    
    return result;
  }, [list?.items, typeFilter, sortBy, searchQuery]);

  // Öğeyi listeden kaldır
  const handleRemoveItem = (item) => {
    setConfirmData({
      title: 'Listeden Kaldır',
      message: `"${item.title}" bu listeden kaldırılsın mı?`,
      onConfirm: () => removeItem(item)
    });
    setShowConfirm(true);
  };

  const removeItem = async (item) => {
    try {
      await updateDoc(doc(db, "customLists", listId), {
        items: arrayRemove(item),
        itemCount: increment(-1)
      });
      showToast(`"${item.title}" listeden kaldırıldı`, "success");
    } catch (error) {
      console.error("Kaldırma hatası:", error);
      showToast("Kaldırma başarısız", "error");
    }
    setShowConfirm(false);
  };

  // Öğeyi başka listeye taşı
  const openMoveModal = (item) => {
    setSelectedItem(item);
    setShowMoveModal(true);
  };

  const moveToList = async (targetListId) => {
    if (!selectedItem || !targetListId) return;
    
    try {
      // Hedef listeden bilgi al
      const targetListDoc = await getDoc(doc(db, "customLists", targetListId));
      const targetList = targetListDoc.data();
      
      // Zaten o listede mi kontrol et
      const alreadyExists = targetList.items?.some(
        i => i.tmdbId === selectedItem.tmdbId && i.mediaType === selectedItem.mediaType
      );
      
      if (alreadyExists) {
        showToast("Bu öğe zaten o listede var", "warning");
        return;
      }
      
      // Mevcut listeden kaldır
      await updateDoc(doc(db, "customLists", listId), {
        items: arrayRemove(selectedItem),
        itemCount: increment(-1)
      });
      
      // Hedef listeye ekle
      await updateDoc(doc(db, "customLists", targetListId), {
        items: arrayUnion(selectedItem),
        itemCount: increment(1)
      });
      
      showToast(`"${selectedItem.title}" taşındı`, "success");
      setShowMoveModal(false);
      setSelectedItem(null);
    } catch (error) {
      console.error("Taşıma hatası:", error);
      showToast("Taşıma başarısız", "error");
    }
  };

  // Öğeyi kopyala (taşımadan ekle)
  const copyToList = async (targetListId) => {
    if (!selectedItem || !targetListId) return;
    
    try {
      const targetListDoc = await getDoc(doc(db, "customLists", targetListId));
      const targetList = targetListDoc.data();
      
      const alreadyExists = targetList.items?.some(
        i => i.tmdbId === selectedItem.tmdbId && i.mediaType === selectedItem.mediaType
      );
      
      if (alreadyExists) {
        showToast("Bu öğe zaten o listede var", "warning");
        return;
      }
      
      await updateDoc(doc(db, "customLists", targetListId), {
        items: arrayUnion(selectedItem),
        itemCount: increment(1)
      });
      
      showToast(`"${selectedItem.title}" kopyalandı`, "success");
      setShowMoveModal(false);
      setSelectedItem(null);
    } catch (error) {
      console.error("Kopyalama hatası:", error);
      showToast("Kopyalama başarısız", "error");
    }
  };

  // Puanlama/Durum düzenleme için ana listedeki öğeyi bul
  const openEditModal = async (item, modalType) => {
    try {
      // Ana listeden bu öğeyi bul
      const q = query(
        collection(db, "watchlist"),
        where("uid", "==", auth.currentUser.uid),
        where("tmdbId", "==", item.tmdbId),
        where("mediaType", "==", item.mediaType)
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        showToast("Bu öğe ana listede bulunamadı", "warning");
        return;
      }
      
      const watchlistDoc = snapshot.docs[0];
      setWatchlistItem({ docId: watchlistDoc.id, ...watchlistDoc.data() });
      setSelectedItem(item);
      
      if (modalType === 'rating') {
        setShowRatingModal(true);
      } else {
        setShowStatusModal(true);
      }
    } catch (error) {
      console.error("Öğe bulunamadı:", error);
      showToast("İşlem başarısız", "error");
    }
  };

  // Ana listedeki öğeyi güncelle
  const updateWatchlistItem = async (updates) => {
    if (!watchlistItem?.docId) return;
    try {
      await updateDoc(doc(db, "watchlist", watchlistItem.docId), {
        ...updates,
        updatedAt: new Date()
      });
      showToast('Güncellendi', 'success');
      setShowRatingModal(false);
      setShowStatusModal(false);
      setWatchlistItem(null);
      setSelectedItem(null);
    } catch (error) {
      console.error("Güncelleme hatası:", error);
      showToast('Güncelleme başarısız', 'error');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p>Yükleniyor...</p>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="error-container">
        <h2>Liste bulunamadı</h2>
        <Link to="/profile" className="btn-back">Geri Dön</Link>
      </div>
    );
  }

  return (
    <div className="custom-list-detail-page">
      {/* Header */}
      <div className="list-detail-header" style={{ '--list-color': list.color || '#6366f1' }}>
        <Link to="/profile" className="back-btn">
          <FaArrowLeft /> Listelerime Dön
        </Link>
        
        <div className="list-info">
          <span className="list-emoji-large">{list.emoji || '📋'}</span>
          <div className="list-meta">
            <h1>{list.name}</h1>
            <p>{list.items?.length || 0} öğe</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="list-detail-filters">
        <div className="filter-group">
          <div className="search-box">
            <input
              type="text"
              placeholder="Liste içinde ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="clear-search">
                <FaTimes />
              </button>
            )}
          </div>
        </div>
        
        <div className="filter-group">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">Tüm Tipler</option>
            <option value="movie">🎬 Filmler</option>
            <option value="tv">📺 Diziler</option>
          </select>
          
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="addedDesc">Son Eklenen</option>
            <option value="addedAsc">İlk Eklenen</option>
            <option value="titleAsc">A-Z</option>
            <option value="titleDesc">Z-A</option>
          </select>
        </div>
      </div>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="empty-list-state">
          {list.items?.length === 0 ? (
            <>
              <span className="empty-icon">📭</span>
              <h3>Bu liste henüz boş</h3>
              <p>Film ve dizileri keşfederken bu listeye ekleyebilirsiniz.</p>
              <Link to="/discover" className="btn-explore">Keşfet</Link>
            </>
          ) : (
            <>
              <span className="empty-icon">🔍</span>
              <h3>Sonuç bulunamadı</h3>
              <p>Farklı filtreler deneyin.</p>
            </>
          )}
        </div>
      ) : (
        <div className="list-items-grid">
          {filteredItems.map((item, index) => (
            <div key={`${item.tmdbId}-${index}`} className="list-item-card">
              <Link to={`/${item.mediaType}/${item.tmdbId}`} className="item-poster">
                <img 
                  src={item.poster ? IMAGE_PATH + item.poster : 'https://via.placeholder.com/200x300?text=No+Image'} 
                  alt={item.title}
                  loading="lazy"
                />
                <span className="media-type-badge">
                  {item.mediaType === 'movie' ? <FaFilm /> : <FaTv />}
                </span>
              </Link>
              
              <div className="item-info">
                <Link to={`/${item.mediaType}/${item.tmdbId}`} className="item-title">
                  {item.title}
                </Link>
                
                <div className="item-actions">
                  <button 
                    className="btn-edit-status"
                    onClick={() => openEditModal(item, 'status')}
                    title="Durum Düzenle"
                  >
                    <FaEdit />
                  </button>
                  <button 
                    className="btn-rate"
                    onClick={() => openEditModal(item, 'rating')}
                    title="Puanla"
                  >
                    <FaStar />
                  </button>
                  <button 
                    className="btn-move"
                    onClick={() => openMoveModal(item)}
                    title="Taşı/Kopyala"
                  >
                    <FaExchangeAlt />
                  </button>
                  <button 
                    className="btn-remove"
                    onClick={() => handleRemoveItem(item)}
                    title="Listeden Kaldır"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Move/Copy Modal */}
      {showMoveModal && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowMoveModal(false)}>
          <div className="modal-content move-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowMoveModal(false)}>
              <FaTimes />
            </button>
            
            <h3>Taşı veya Kopyala</h3>
            <p className="modal-subtitle">"{selectedItem.title}"</p>
            
            {otherLists.length === 0 ? (
              <div className="no-lists-message">
                <p>Başka listeniz yok. Yeni liste oluşturun.</p>
                <Link to="/profile" className="btn-create" onClick={() => setShowMoveModal(false)}>
                  Yeni Liste Oluştur
                </Link>
              </div>
            ) : (
              <div className="target-lists">
                {otherLists.map(targetList => (
                  <div key={targetList.id} className="target-list-item">
                    <div className="target-list-info">
                      <span className="list-emoji">{targetList.emoji || '📋'}</span>
                      <span className="list-name">{targetList.name}</span>
                      <span className="list-count">({targetList.itemCount || 0})</span>
                    </div>
                    <div className="target-list-actions">
                      <button 
                        className="btn-copy"
                        onClick={() => copyToList(targetList.id)}
                      >
                        Kopyala
                      </button>
                      <button 
                        className="btn-move-to"
                        onClick={() => moveToList(targetList.id)}
                      >
                        Taşı
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirm && confirmData && (
        <ConfirmModal
          isOpen={showConfirm}
          title={confirmData.title}
          message={confirmData.message}
          onConfirm={confirmData.onConfirm}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      {/* Rating Modal */}
      <RatingModal
        isOpen={showRatingModal}
        onClose={() => { setShowRatingModal(false); setSelectedItem(null); setWatchlistItem(null); }}
        onSave={(rating) => updateWatchlistItem({ userRating: rating })}
        currentRating={watchlistItem?.userRating || 0}
        title={selectedItem?.title || ''}
      />

      {/* Status Modal */}
      <StatusModal
        isOpen={showStatusModal}
        onClose={() => { setShowStatusModal(false); setSelectedItem(null); setWatchlistItem(null); }}
        onSave={(data) => updateWatchlistItem(data)}
        currentStatus={watchlistItem?.status}
        currentProgress={watchlistItem?.progress || 0}
        currentNotes={watchlistItem?.notes || ''}
        title={selectedItem?.title || ''}
        totalEpisodes={watchlistItem?.episodeCount}
        mediaType={watchlistItem?.mediaType || 'movie'}
      />
    </div>
  );
};

export default CustomListDetail;
