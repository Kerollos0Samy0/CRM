import React from 'react';
import { useData } from '../context/DataContext';
import { TrendingUp, Package, Users, DollarSign, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const Analytics = () => {
  const { orders, columns, products, archivedOrders = [] } = useData();
  
  const activeOrdersList = Object.values(orders);
  const allOrdersList = [...activeOrdersList, ...archivedOrders];
  
  // Calculate completed orders (in arrived column + archived)
  const arrivedOrderIds = columns.arrived?.orderIds || [];
  const activeCompletedOrders = arrivedOrderIds.map(id => orders[id]).filter(Boolean);
  const completedOrders = [...activeCompletedOrders, ...archivedOrders];

  // Total Sales Pipeline
  const calculateOrderValue = (orderList) => {
    return orderList.reduce((acc, order) => {
      return acc + (Number(order.totalAmount) || 0);
    }, 0);
  };

  const totalPipelineValue = calculateOrderValue(allOrdersList);
  const completedSalesValue = calculateOrderValue(completedOrders);

  // Top Products
  const productCounts = {};
  allOrdersList.forEach(order => {
    if (order.items) {
      order.items.forEach(item => {
        if (item.workshop) {
          productCounts[item.workshop] = (productCounts[item.workshop] || 0) + (Number(item.quantity) || 1);
        }
      });
    }
  });

  const topProducts = Object.entries(productCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const StatCard = ({ title, value, subtext, icon, color }) => (
    <motion.div 
      className="card" 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: `4px solid ${color}` }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className="text-secondary" style={{ fontSize: '1rem', fontWeight: 600 }}>{title}</h3>
        <div style={{ background: `${color}15`, padding: '8px', borderRadius: '12px', color: color }}>
          {icon}
        </div>
      </div>
      <div>
        <h2 className="heading-lg" style={{ color: 'var(--text-primary)' }}>{value}</h2>
        {subtext && <p className="text-small" style={{ marginTop: '4px' }}>{subtext}</p>}
      </div>
    </motion.div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 className="heading-lg">نظرة عامة وإحصائيات</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        <StatCard 
          title="إجمالي الأوردرات" 
          value={allOrdersList.length} 
          subtext="كل الأوردرات في النظام"
          icon={<Package size={24} />} 
          color="var(--accent-primary)" 
        />
        <StatCard 
          title="الأوردرات المكتملة" 
          value={completedOrders.length} 
          subtext="تم التوصيل للعميل"
          icon={<CheckCircle size={24} />} 
          color="var(--state-delivered)" 
        />
        <StatCard 
          title="المبيعات (متوقع)" 
          value={`${totalPipelineValue.toLocaleString()} ج.م`} 
          subtext="إجمالي قيمة كل الأوردرات"
          icon={<TrendingUp size={24} />} 
          color="var(--state-printing)" 
        />
        <StatCard 
          title="المبيعات (مكتملة)" 
          value={`${completedSalesValue.toLocaleString()} ج.م`} 
          subtext="الأوردرات التي تم تسليمها"
          icon={<DollarSign size={24} />} 
          color="var(--state-shipping)" 
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '16px' }}>
        {/* Top Products */}
        <div className="card">
          <h3 className="heading-md" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={20} color="var(--accent-primary)" />
            أكثر المنتجات مبيعاً
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topProducts.map(([name, count], index) => (
              <div key={name} style={{ 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ 
                    fontWeight: 800, color: 'var(--text-muted)', fontSize: '1.2rem', width: '20px' 
                  }}>#{index + 1}</span>
                  <span style={{ fontWeight: 600 }}>{name}</span>
                </div>
                <div className="tag" style={{ background: 'var(--accent-primary)', color: 'white' }}>
                  {count} قطعة
                </div>
              </div>
            ))}
            {topProducts.length === 0 && <p className="text-muted text-center">لا توجد داتا كافية</p>}
          </div>
        </div>

        {/* Orders by Status */}
        <div className="card">
          <h3 className="heading-md" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={20} color="var(--accent-primary)" />
            حالة الأوردرات الحالية
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.values(columns).map(col => (
              <div key={col.id} style={{ 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px',
                borderRight: `4px solid ${col.color}`
              }}>
                <span style={{ fontWeight: 600 }}>{col.title}</span>
                <span style={{ fontWeight: 700, color: col.color }}>{col.orderIds.length}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

export default Analytics;
