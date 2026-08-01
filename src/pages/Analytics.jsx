import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';
import { useData } from "../context/DataContext";
import { TrendingUp, Package, Users, DollarSign, CheckCircle, MapPin, Map, Star, BarChart } from 'lucide-react';


const Analytics = () => {
  const [expandedMonth, setExpandedMonth] = useState(null);
  const { orders, columns, products, archivedOrders = [] } = useData();
  
  const activeOrdersList = Object.values(orders);
  const monthlyStats = useMemo(() => {
    const stats = {};
    const allOrders = [...Object.values(orders || {}), ...(archivedOrders || [])];
    
    const initMonth = (monthKey, d) => {
      if (!stats[monthKey]) {
        stats[monthKey] = { 
          sales: 0, cogs: 0, products: 0, admin: 0, workshop: 0, other: 0, 
          label: d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' }),
          ordersList: [], transactionsList: []
        };
      }
    };

    // Process Sales & COGS
    allOrders.forEach(o => {
      // Count all orders in the month towards sales volume (pending and delivered)
      
      const date = o.createdAt || o.archivedAt;
      if (!date) return;
      const d = new Date(date);
      if (isNaN(d)) return;
      
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      initMonth(monthKey, d);
      
      stats[monthKey].sales += Number(o.totalAmount || o.total || 0);
      stats[monthKey].ordersList.push(o);

      // Calculate COGS from products
      if (o.items && Array.isArray(o.items)) {
        o.items.forEach(item => {
          const prodName = item.name || item.workshop;
          if (prodName && products) {
            const productMatch = products.find(p => p.name === prodName);
            if (productMatch) {
              const buyPrice = Number(productMatch.buyPrice) || 0;
              stats[monthKey].cogs += (item.quantity * buyPrice);
            }
          }
        });
      }
    });

    // Process Expenses
    (transactions || []).forEach(t => {
      const date = t.date;
      if (!date) return;
      const d = new Date(date);
      if (isNaN(d)) return;
      
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      initMonth(monthKey, d);
      
      stats[monthKey].transactionsList.push(t);

      if (t.type === 'debt') {
        const amount = Number(t.amount || 0);
        const cat = t.category || 'products';
        
        if (cat === 'products') stats[monthKey].products += amount;
        else if (cat === 'admin') stats[monthKey].admin += amount;
        else if (cat === 'workshop') stats[monthKey].workshop += amount;
        else stats[monthKey].other += amount;
      }
    });

    
    // Override historical stats with exact summary sheet figures
    const overrides = {
      '2026-03': { sales: 46798, cogs: 18110 },
      '2026-04': { sales: 53865, cogs: 21915 },
      '2026-05': { sales: 21727, cogs: 9692 },
      '2026-06': { sales: 74635, cogs: 39846 },
      '2026-07': { sales: 57267, cogs: 27024 }
    };
    Object.keys(overrides).forEach(m => {
       if (stats[m]) {
          stats[m].sales = overrides[m].sales;
          stats[m].cogs = overrides[m].cogs;
       } else {
          stats[m] = {
            sales: overrides[m].sales,
            cogs: overrides[m].cogs,
            products: 0, admin: 0, workshop: 0, other: 0,
            label: new Date(m + '-01').toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' }),
            ordersList: [], transactionsList: []
          };
       }
    });

    return Object.entries(stats).sort((a, b) => b[0].localeCompare(a[0]));

  }, [orders, archivedOrders, transactions, products]);

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

  // --- Analytics Calculations ---
  const productStats = {}; // { qty: 0, revenue: 0, profit: 0 }
  const govStats = {}; // { count: 0 }
  const regionStats = {}; // { count: 0 }

  allOrdersList.forEach(order => {
    // Governorate
    if (order.governorate) {
      const gov = order.governorate.trim();
      if (gov) govStats[gov] = (govStats[gov] || 0) + 1;
    }
    
    // Region (address)
    if (order.address) {
      const region = order.address.trim();
      if (region) regionStats[region] = (regionStats[region] || 0) + 1;
    }

    // Products
    if (order.items) {
      order.items.forEach(item => {
        if (item.workshop) {
          const w = item.workshop.trim();
          if (!productStats[w]) productStats[w] = { qty: 0, revenue: 0, profit: 0 };
          
          const qty = Number(item.quantity) || 1;
          const unitPrice = Number(item.unitPrice) || 0;
          
          const productRef = products.find(p => p.name === w);
          const buyPrice = productRef ? (Number(productRef.buyPrice) || 0) : 0;
          
          productStats[w].qty += qty;
          productStats[w].revenue += (unitPrice * qty);
          productStats[w].profit += ((unitPrice - buyPrice) * qty);
        }
      });
    }
  });

  const getTop10 = (obj, key) => {
    return Object.entries(obj)
      .sort((a, b) => b[1][key] - a[1][key])
      .slice(0, 10);
  };

  const getTop10Simple = (obj) => {
    return Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  };

  const topProductsByQty = getTop10(productStats, 'qty');
  const topProductsByRevenue = getTop10(productStats, 'revenue');
  const topProductsByProfit = getTop10(productStats, 'profit');
  const topGovs = getTop10Simple(govStats);
  const topRegions = getTop10Simple(regionStats);
  // -----------------------------

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

  const TopListCard = ({ title, icon, items, valueSuffix, valueFormat = (v) => v, color = "var(--accent-primary)" }) => (
    <div className="card">
      <h3 className="heading-md" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {icon}
        {title}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {items.map(([name, value], index) => (
          <div key={name} style={{ 
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontWeight: 800, color: 'var(--text-muted)', fontSize: '1.2rem', width: '24px' }}>#{index + 1}</span>
              <span style={{ fontWeight: 600 }}>{name}</span>
            </div>
            <div className="tag" style={{ background: color, color: 'white' }}>
              {valueFormat(value)} {valueSuffix}
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-muted text-center">لا توجد داتا كافية</p>}
      </div>
    </div>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginTop: '16px' }}>
        
        <TopListCard 
          title="أعلى 10 محافظات (بالأوردرات)"
          icon={<Map size={20} color="var(--state-ready)" />}
          items={topGovs}
          valueSuffix="أوردر"
          color="var(--state-ready)"
        />

        <TopListCard 
          title="أعلى 10 مناطق (بالأوردرات)"
          icon={<MapPin size={20} color="var(--state-printing)" />}
          items={topRegions}
          valueSuffix="أوردر"
          color="var(--state-printing)"
        />

        <TopListCard 
          title="أعلى 10 منتجات (بالعدد)"
          icon={<Package size={20} color="var(--accent-primary)" />}
          items={topProductsByQty.map(i => [i[0], i[1].qty])}
          valueSuffix="قطعة"
          color="var(--accent-primary)"
        />

        <TopListCard 
          title="أعلى 10 منتجات (إجمالي السعر)"
          icon={<DollarSign size={20} color="var(--state-shipping)" />}
          items={topProductsByRevenue.map(i => [i[0], i[1].revenue])}
          valueSuffix="ج.م"
          valueFormat={(v) => v.toLocaleString()}
          color="var(--state-shipping)"
        />

        <TopListCard 
          title="أعلى 10 منتجات (الربح الصافي)"
          icon={<Star size={20} color="var(--state-delivered)" />}
          items={topProductsByProfit.map(i => [i[0], i[1].profit])}
          valueSuffix="ج.م"
          valueFormat={(v) => v.toLocaleString()}
          color="var(--state-delivered)"
        />

        {/* Orders by Status */}
        <div className="card">
          <h3 className="heading-md" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart size={20} color="var(--text-primary)" />
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
