import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { X, MessageCircle, Send, Phone, MapPin, Hash, Calendar, Trash2, Printer, Package } from 'lucide-react';
import { motion } from 'framer-motion';

const OrderDetailsModal = ({ order, isDelivered, onClose }) => {
  const { addNote, deleteOrder, updateOrder, archiveOrder } = useData();
  const { users } = useAuth();
  const [noteText, setNoteText] = useState('');

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    addNote(order.id, noteText);
    setNoteText('');
  };

  const handleToggleMissing = () => {
    updateOrder(order.id, { 
      hasMissingItems: !order.hasMissingItems, 
      missingNotes: !order.hasMissingItems ? order.missingNotes : '' 
    });
  };

  const handleMissingNotesChange = (e) => {
    updateOrder(order.id, { missingNotes: e.target.value });
  };

  const handleItemStatusChange = (index, newStatus) => {
    const newItems = [...(order.items || [])];
    newItems[index] = { ...newItems[index], status: newStatus };
    
    // Check if all items are ready. If not, auto-flag hasMissingItems. If yes, unflag it.
    const allReady = newItems.every(i => i.status === 'ready');
    
    updateOrder(order.id, { 
      items: newItems,
      hasMissingItems: !allReady,
      missingNotes: !allReady ? (order.missingNotes || 'يوجد منتجات لم تجهز بعد') : ''
    });
  };

  const creatorColor = users.find(u => u.id === order.createdBy)?.color || 'var(--border-color)';
  const creatorName = users.find(u => u.id === order.createdBy)?.name || 'مجهول';

  // Formatting for whatsapp link
  const cleanMobile = order.mobile.replace(/[^0-9]/g, '');
  const waNumber = cleanMobile.startsWith('0') ? `2${cleanMobile}` : cleanMobile;
  const waLink = `https://wa.me/${waNumber}?text=مرحباً، بخصوص أوردر الحكاية (كنيسة ${order.church})...`;

  const handleDelete = () => {
    if(window.confirm('هل أنت متأكد من حذف هذا الأوردر؟')) {
      deleteOrder(order.id);
      onClose();
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, 
      backgroundColor: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 1000, padding: '20px'
    }}>
      <motion.div 
        className="card"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ 
          width: '100%', maxWidth: '800px', height: '80vh',
          display: 'flex', flexDirection: 'column',
          position: 'relative', overflow: 'hidden'
        }}
      >
        {/* Invoice Print Layout */}
        <div className="print-only" style={{ padding: '40px', direction: 'rtl', color: 'black' }}>
          <h1 style={{ textAlign: 'center', marginBottom: '10px' }}>بوليصة شحن</h1>
          <h2 style={{ textAlign: 'center', marginBottom: '40px', color: '#666' }}>الحكاية - Al Hkaya</h2>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1.2rem', marginBottom: '24px' }}>
            <tbody>
              <tr>
                <td style={{ border: '2px solid black', padding: '12px', fontWeight: 'bold', width: '30%' }}>اسم العميل:</td>
                <td style={{ border: '2px solid black', padding: '12px' }}>{order.name}</td>
              </tr>
              <tr>
                <td style={{ border: '2px solid black', padding: '12px', fontWeight: 'bold' }}>رقم الموبايل:</td>
                <td style={{ border: '2px solid black', padding: '12px' }}>{order.mobile}</td>
              </tr>
              <tr>
                <td style={{ border: '2px solid black', padding: '12px', fontWeight: 'bold' }}>المحافظة / العنوان:</td>
                <td style={{ border: '2px solid black', padding: '12px' }}>{order.governorate} - {order.address}</td>
              </tr>
            </tbody>
          </table>

          <h3 style={{ marginBottom: '10px' }}>تفاصيل الطلب:</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1.2rem', marginBottom: '24px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0' }}>
                <th style={{ border: '2px solid black', padding: '12px', textAlign: 'right' }}>الصنف</th>
                <th style={{ border: '2px solid black', padding: '12px', textAlign: 'right', width: '20%' }}>سعر الوحدة</th>
                <th style={{ border: '2px solid black', padding: '12px', textAlign: 'right', width: '20%' }}>العدد</th>
                <th style={{ border: '2px solid black', padding: '12px', textAlign: 'right', width: '20%' }}>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.map((item, index) => (
                <tr key={index}>
                  <td style={{ border: '2px solid black', padding: '12px', fontWeight: 'bold' }}>{item.workshop}</td>
                  <td style={{ border: '2px solid black', padding: '12px', fontWeight: 'bold' }}>{item.unitPrice || 0}</td>
                  <td style={{ border: '2px solid black', padding: '12px', fontWeight: 'bold' }}>{item.quantity}</td>
                  <td style={{ border: '2px solid black', padding: '12px', fontWeight: 'bold' }}>{(item.unitPrice || 0) * (item.quantity || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1.2rem', marginBottom: '40px' }}>
            <tbody>
              <tr>
                <td style={{ border: '2px solid black', padding: '12px', fontWeight: 'bold', width: '25%' }}>الإجمالي:</td>
                <td style={{ border: '2px solid black', padding: '12px', fontWeight: 'bold', width: '25%' }}>{order.totalAmount || 0} ج.م</td>
                <td style={{ border: '2px solid black', padding: '12px', fontWeight: 'bold', width: '25%' }}>الخصم:</td>
                <td style={{ border: '2px solid black', padding: '12px', fontWeight: 'bold', width: '25%' }}>{order.discount || 0} ج.م</td>
              </tr>
              <tr>
                <td style={{ border: '2px solid black', padding: '12px', fontWeight: 'bold' }}>المدفوع (عربون):</td>
                <td style={{ border: '2px solid black', padding: '12px', fontWeight: 'bold' }}>{order.paidAmount || 0} ج.م</td>
                <td style={{ border: '2px solid black', padding: '12px', fontWeight: 'bold', color: order.remainingAmount > 0 ? 'red' : 'green' }}>الباقي عند الاستلام:</td>
                <td style={{ border: '2px solid black', padding: '12px', fontWeight: 'bold', color: order.remainingAmount > 0 ? 'red' : 'green' }}>{order.remainingAmount || 0} ج.م</td>
              </tr>
            </tbody>
          </table>
          <p style={{ textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold', marginTop: '40px' }}>
            شكراً لتعاملكم معنا!
          </p>
        </div>

        {/* Screen Layout */}
        <div className="no-print" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Header */}
          <div style={{ 
            padding: '24px', borderBottom: '1px solid var(--border-color)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            borderTop: `4px solid ${creatorColor}`
          }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <h2 className="heading-lg">{order.name}</h2>
              <span className="tag" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                {creatorName}
              </span>
            </div>
            <p className="text-body" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <span>{order.church}</span>
              <span style={{ color: 'var(--text-muted)' }}>|</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                {new Date(order.createdAt).toLocaleString('ar-EG', { dateStyle: 'long', timeStyle: 'short' })}
              </span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <a 
              href={waLink} 
              target="_blank" 
              rel="noreferrer"
              className="btn btn-primary"
              style={{ backgroundColor: '#25D366', boxShadow: '0 4px 14px rgba(37, 211, 102, 0.4)' }}
            >
              <Phone size={18} />
              واتساب
            </a>
            <button 
              onClick={() => window.print()}
              className="btn btn-secondary"
            >
              <Printer size={18} />
              طباعة
            </button>
            {isDelivered && (
              <button 
                onClick={() => {
                  if(window.confirm('هل أنت متأكد من أرشفة هذا الأوردر؟')) {
                    archiveOrder(order.id);
                    onClose();
                  }
                }}
                className="btn btn-primary"
                style={{ backgroundColor: 'var(--color-mira)', color: 'white' }}
              >
                <Package size={18} />
                أرشفة الأوردر
              </button>
            )}
            <button 
              onClick={handleDelete}
              className="btn btn-secondary"
              style={{ color: 'var(--color-marina)', borderColor: 'rgba(248, 113, 113, 0.3)' }}
            >
              <Trash2 size={18} />
            </button>
            <button onClick={onClose} className="btn btn-secondary" style={{ padding: '12px' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          
          {/* Notes Sidebar (Now 35%) */}
          <div style={{ width: '35%', borderLeft: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageCircle size={20} color="var(--text-secondary)" />
              <h3 className="heading-md" style={{ fontSize: '1.1rem' }}>الملاحظات</h3>
            </div>
            
            <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {order.orderNotes && (
                <div style={{ 
                  background: 'rgba(255, 255, 255, 0.7)', 
                  padding: '16px', borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--border-color)',
                  marginBottom: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>تفاصيل الأوردر (من الواتساب)</span>
                  </div>
                  <div style={{ 
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.6',
                    fontSize: '0.95rem',
                    color: 'var(--text-secondary)'
                  }}>
                    {order.orderNotes}
                  </div>
                </div>
              )}

              {order.notes?.length === 0 && !order.orderNotes ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px' }}>
                  لا توجد ملاحظات بعد.
                </div>
              ) : (
                order.notes?.map(note => (
                  <div key={note.id} style={{ 
                    background: 'white', 
                    padding: '16px', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{note.createdBy}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{new Date(note.timestamp).toLocaleString('ar-EG')}</span>
                    </div>
                    <p style={{ lineHeight: 1.5 }}>{note.text}</p>
                  </div>
                ))
              )}
            </div>

            <div style={{ padding: '24px', borderTop: '1px solid var(--border-color)', background: 'white' }}>
              <form onSubmit={handleAddNote} style={{ display: 'flex', gap: '12px' }}>
                <input 
                  type="text" 
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="input-field" 
                  placeholder="اكتب ملاحظة..." 
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn btn-primary" disabled={!noteText.trim()}>
                  <Send size={18} />
                </button>
              </form>
            </div>
          </div>

          {/* Details Main Area (Now flex: 1) */}
          <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
            
            {/* Missing Items Banner */}
            <div style={{ 
              marginBottom: '32px', 
              background: order.hasMissingItems ? 'rgba(248, 113, 113, 0.1)' : 'var(--bg-secondary)', 
              padding: '20px', 
              borderRadius: '12px', 
              border: `2px dashed ${order.hasMissingItems ? 'var(--color-marina)' : 'var(--border-color)'}`,
              transition: 'all 0.3s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input 
                  type="checkbox" 
                  checked={order.hasMissingItems || false} 
                  onChange={handleToggleMissing} 
                  id="missingItems" 
                  style={{ width: '24px', height: '24px', cursor: 'pointer' }} 
                />
                <label htmlFor="missingItems" style={{ fontSize: '1.1rem', fontWeight: 'bold', color: order.hasMissingItems ? 'var(--color-marina)' : 'var(--text-primary)', cursor: 'pointer' }}>
                  يوجد نواقص في الأوردر ⚠️
                </label>
              </div>
              {order.hasMissingItems && (
                <div style={{ marginTop: '16px' }}>
                  <input 
                    type="text" 
                    value={order.missingNotes || ''} 
                    onChange={handleMissingNotesChange} 
                    className="input-field" 
                    placeholder="ما هي النواقص؟ (مثال: كارت حضور في التصميم)" 
                    style={{ borderColor: 'var(--color-marina)', backgroundColor: 'white' }} 
                  />
                </div>
              )}
            </div>

            <h3 className="heading-md" style={{ marginBottom: '24px', fontSize: '1.3rem' }}>تجهيز الأوردر</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <span className="text-small" style={{ display: 'block', marginBottom: '8px' }}>المنتجات المطلوبة</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {order.items?.map((item, index) => (
                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid var(--border-color)', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{item.workshop}</span>
                        <select 
                          value={item.status || 'new'}
                          onChange={(e) => handleItemStatusChange(index, e.target.value)}
                          className="input-field"
                          style={{ padding: '4px 8px', fontSize: '0.85rem', width: 'auto', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                        >
                          <option value="new">🆕 جديد</option>
                          <option value="design">🎨 في التصميم</option>
                          <option value="printing">🖨️ في المطبعة</option>
                          <option value="ready">✅ جاهز (كنيسة)</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                        <span>{item.unitPrice || 0} ج.م × {item.quantity} قطع</span>
                        <span style={{ color: 'var(--color-marina)', fontWeight: 'bold' }}>{(item.unitPrice || 0) * (item.quantity || 0)} ج.م</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <span className="text-small" style={{ display: 'block', marginBottom: '12px' }}>الحسابيات</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'white', borderRadius: '6px' }}>
                      <span>الإجمالي</span>
                      <span style={{ fontWeight: 'bold' }}>{order.totalAmount || 0} ج.م</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'white', borderRadius: '6px' }}>
                      <span>الخصم</span>
                      <span style={{ fontWeight: 'bold' }}>{order.discount || 0} ج.م</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'white', borderRadius: '6px' }}>
                      <span>تم دفع</span>
                      <span style={{ fontWeight: 'bold' }}>{order.paidAmount || 0} ج.م</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-primary)', borderRadius: '8px', border: '2px solid var(--border-color)', marginTop: '8px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>الباقي</span>
                      <span style={{ fontWeight: 'bold', fontSize: '1.3rem', color: (order.remainingAmount || 0) > 0 ? 'var(--color-marina)' : 'var(--state-delivered)' }}>
                        {order.remainingAmount || 0} ج.م
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <span className="text-small" style={{ display: 'block', marginBottom: '12px' }}>معلومات التوصيل</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'white', padding: '12px', borderRadius: '8px' }}>
                      <Phone size={18} color="var(--text-secondary)" />
                      <span dir="ltr" style={{ fontWeight: 600 }}>{order.mobile}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'white', padding: '12px', borderRadius: '8px' }}>
                      <MapPin size={18} color="var(--text-secondary)" />
                      <span style={{ fontWeight: 600 }}>{order.governorate} - {order.address}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'white', padding: '12px', borderRadius: '8px', color: 'var(--color-marina)' }}>
                      <Calendar size={18} />
                      <span style={{ fontWeight: 600 }}>الديد لاين: {order.deadline}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default OrderDetailsModal;
