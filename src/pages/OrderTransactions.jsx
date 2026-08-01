import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Search } from 'lucide-react';
import OrderDetailsModal from '../components/OrderDetailsModal';

const OrderTransactions = () => {
  const { orders } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Filter orders: >= 2026-08-01
  const targetDate = new Date('2026-08-01T00:00:00Z');

  const filteredOrders = Object.values(orders).filter(order => {
    if (!order.createdAt) return false;
    const orderDate = new Date(order.createdAt);
    if (orderDate < targetDate) return false;
    if (searchQuery && !order.name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  let totalValue = 0;
  let totalDeposit = 0;
  let totalRemaining = 0;

  filteredOrders.forEach(order => {
    totalValue += (Number(order.totalAmount) || 0);
    totalDeposit += (Number(order.paidAmount) || 0);
    totalRemaining += (Number(order.remainingAmount) || 0);
  });

  return (
    <div className="fade-in" style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="heading-lg" style={{ color: 'var(--text-primary)' }}>المعاملات</h1>
          <p className="text-secondary" style={{ marginTop: '8px' }}>التفاصيل المالية للأوردرات بداية من شهر 8 / 2026</p>
        </div>
        <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
          <Search size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="بحث باسم العميل..." 
            className="input-field" 
            style={{ paddingRight: '40px', width: '100%' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
              <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>التاريخ</th>
              <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>العميل / الأوردر</th>
              <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>الكنيسة</th>
              <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>المنتجات</th>
              <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>إجمالي الأوردر</th>
              <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>الديبوزت (مدفوع)</th>
              <th style={{ padding: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>المتبقي</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filteredOrders.map(order => {
                const itemsString = order.items?.map(i => `${i.workshop} (${i.quantity})`).join('، ') || '-';
                const orderDate = new Date(order.createdAt).toLocaleDateString('ar-EG');
                
                return (
                  <motion.tr 
                    key={order.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{ borderBottom: '1px solid var(--border-color)' }}
                  >
                    <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{orderDate}</td>
                    <td style={{ padding: '16px', fontWeight: 600, color: 'var(--color-mira)', cursor: 'pointer' }} onClick={() => setSelectedOrder(order)}>{order.name}</td>
                    <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{order.church}</td>
                    <td style={{ padding: '16px', fontSize: '0.9rem' }}>{itemsString}</td>
                    <td style={{ padding: '16px', fontWeight: 'bold' }}>{(Number(order.totalAmount) || 0).toLocaleString()} ج.م</td>
                    <td style={{ padding: '16px', fontWeight: 'bold', color: 'var(--color-marina)' }}>{(Number(order.paidAmount) || 0).toLocaleString()} ج.م</td>
                    <td style={{ padding: '16px', fontWeight: 'bold', color: 'var(--color-marina)' }}>{(Number(order.remainingAmount) || 0).toLocaleString()} ج.م</td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
            {filteredOrders.length === 0 && (
              <tr>
                <td colSpan="7" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>لا يوجد أوردرات مطابقة للبحث أو في هذه الفترة</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: 'var(--bg-secondary)', borderTop: '2px solid var(--border-color)' }}>
              <td colSpan="4" style={{ padding: '16px', fontWeight: 800, textAlign: 'left' }}>الإجماليات الكلية:</td>
              <td style={{ padding: '16px', fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{totalValue.toLocaleString()} ج.م</td>
              <td style={{ padding: '16px', fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-marina)' }}>{totalDeposit.toLocaleString()} ج.م</td>
              <td style={{ padding: '16px', fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-marina)' }}>{totalRemaining.toLocaleString()} ج.م</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {selectedOrder && (
        <OrderDetailsModal 
          order={selectedOrder} 
          isDelivered={selectedOrder.status === 'arrived'} 
          onClose={() => setSelectedOrder(null)} 
        />
      )}
    </div>
  );
};

export default OrderTransactions;
