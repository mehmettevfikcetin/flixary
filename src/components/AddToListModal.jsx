import React, { useState, useEffect } from 'react';
import { FaTimes, FaEye, FaCheck, FaCalendar, FaPause, FaTimesCircle, FaPlus, FaListUl } from 'react-icons/fa';
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

  const handleConfirm = () => {
    setLoading(true);
    onConfirm({
      status: selectedStatus,
      customListId: selectedList
    });
    setLoading(false);
  };

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
