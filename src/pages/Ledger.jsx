import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Plus, Trash2, ArrowUpRight, ArrowDownRight, Wallet, BarChart3, TrendingUp, ShoppingCart, Wrench, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Ledger = () => {
  const { transactions, addTransaction, deleteTransaction, orders, archivedOrders, products } = useData();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [expandedMonth, setExpandedMonth] = useState(null);
  const [formData, setFormData] = useState({
    supplier: '',
    type: 'debt', // 'debt' (مديونية علينا), 'payment' (دفعة مسددة)
    category: 'admin',
    amount: '',
    description: ''
  });

  const handleAdd = (e) => {
    e.preventDefault();
    addTransaction(formData);
    setIsAddModalOpen(false);
    setFormData({ supplier: '', type: 'debt', category: 'admin', amount: '', description: '' });
  };

  // Calculate monthly stats
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

  // Calculate balances per supplier
  const balances = useMemo(() => {
    const acc = {};
    (transactions || []).forEach(t => {
      if (!acc[t.supplier]) acc[t.supplier] = { debt: 0, payment: 0, total: 0 };
      if (t.type === 'debt') acc[t.supplier].debt += t.amount;
      if (t.type === 'payment') acc[t.supplier].payment += t.amount;
      acc[t.supplier].total = acc[t.supplier].debt - acc[t.supplier].payment;
    });
    return acc;
  }, [transactions]);

  const totalDebt = Object.values(balances).reduce((sum, b) => sum + b.total, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="heading-lg">الحسابات والمديونيات</h2>
        <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
          <Plus size={18} />
          إضافة معاملة
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
        
        {/* Monthly Stats Section */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h3 className="heading-md" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={20} color="var(--color-marina)" />
            إحصائيات الشهور
          </h3>
          
          {monthlyStats.length === 0 ? (
            <p className="text-muted">لا توجد بيانات متاحة بعد.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {monthlyStats.map(([monthKey, data]) => {
                const netProfit = data.sales - (data.cogs + data.admin + data.workshop + data.other);
                const isExpanded = expandedMonth === monthKey;
                
                return (
                  <div key={monthKey} style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h4 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{data.label}</h4>
                      <button 
                        onClick={() => setExpandedMonth(isExpanded ? null : monthKey)}
                        className="btn btn-secondary" 
                        style={{ padding: '6px 12px', fontSize: '0.9rem' }}
                      >
                        {isExpanded ? <><ChevronUp size={16} /> إخفاء التفاصيل</> : <><ChevronDown size={16} /> عرض التفاصيل</>}
                      </button>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                      
                      <div style={{ background: '#ecfdf5', padding: '12px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                        <div style={{ color: '#059669', fontSize: '0.85rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}><TrendingUp size={14}/> إجمالي المبيعات</div>
                        <div style={{ color: '#047857', fontWeight: 'bold', fontSize: '1.1rem' }}>{data.sales.toLocaleString()} ج.م</div>
                      </div>

                      <div style={{ background: '#fef2f2', padding: '12px', borderRadius: '8px', border: '1px solid #fecaca' }}>
                        <div style={{ color: '#dc2626', fontSize: '0.85rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}><ShoppingCart size={14}/> تكلفة البضاعة (COGS)</div>
                        <div style={{ color: '#b91c1c', fontWeight: 'bold', fontSize: '1.1rem' }}>{data.cogs.toLocaleString()} ج.م</div>
                      </div>

                      

                      <div style={{ background: '#fffbeb', padding: '12px', borderRadius: '8px', border: '1px solid #fde68a' }}>
                        <div style={{ color: '#d97706', fontSize: '0.85rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}><FileText size={14}/> مصاريف إدارية</div>
                        <div style={{ color: '#b45309', fontWeight: 'bold', fontSize: '1.1rem' }}>{data.admin.toLocaleString()} ج.م</div>
                      </div>

                      <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                        <div style={{ color: '#2563eb', fontSize: '0.85rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}><Wrench size={14}/> مصاريف ورشة</div>
                        <div style={{ color: '#1d4ed8', fontWeight: 'bold', fontSize: '1.1rem' }}>{data.workshop.toLocaleString()} ج.م</div>
                      </div>

                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px dashed var(--border-color)', paddingTop: '16px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>صافي الربح التقريبي:</span>
                      <span style={{ fontWeight: 'bold', fontSize: '1.4rem', color: netProfit >= 0 ? '#059669' : '#dc2626' }}>
                        {netProfit.toLocaleString()} ج.م
                      </span>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }} 
                          animate={{ height: 'auto', opacity: 1 }} 
                          exit={{ height: 0, opacity: 0 }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                              
                              {/* Orders Table */}
                              <div>
                                <h5 style={{ fontWeight: 'bold', marginBottom: '12px', color: 'var(--text-primary)' }}>الأوردرات التي تم تسليمها ({data.ordersList.length})</h5>
                                <div style={{ maxHeight: '300px', overflowY: 'auto', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                  <table style={{ width: '100%', fontSize: '0.85rem', textAlign: 'right', borderCollapse: 'collapse' }}>
                                    <thead style={{ background: 'var(--bg-secondary)', position: 'sticky', top: 0 }}>
                                      <tr>
                                        <th style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>العميل</th>
                                        <th style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>الإجمالي</th>
                                        <th style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>المنتجات</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {data.ordersList.map(o => (
                                        <tr key={o.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                          <td style={{ padding: '8px' }}>{o.clientName}</td>
                                          <td style={{ padding: '8px', fontWeight: 'bold' }}>{o.totalAmount || o.total || 0}</td>
                                          <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>
                                            {o.items?.map(i => `${i.name || i.workshop} (${i.quantity})`).join('، ')}
                                          </td>
                                        </tr>
                                      ))}
                                      {data.ordersList.length === 0 && (
                                        <tr><td colSpan="3" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>لا يوجد</td></tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                              {/* Transactions Table */}
                              <div>
                                <h5 style={{ fontWeight: 'bold', marginBottom: '12px', color: 'var(--text-primary)' }}>المعاملات المالية ({data.transactionsList.length})</h5>
                                <div style={{ maxHeight: '300px', overflowY: 'auto', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                  <table style={{ width: '100%', fontSize: '0.85rem', textAlign: 'right', borderCollapse: 'collapse' }}>
                                    <thead style={{ background: 'var(--bg-secondary)', position: 'sticky', top: 0 }}>
                                      <tr>
                                        <th style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>الجهة</th>
                                        <th style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>النوع</th>
                                        <th style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>المبلغ</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {data.transactionsList.map(t => (
                                        <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                          <td style={{ padding: '8px' }}>{t.supplier}</td>
                                          <td style={{ padding: '8px' }}>
                                            {t.type === 'payment' ? 'دفعة' : (t.category === 'admin' ? 'إدارية' : t.category === 'workshop' ? 'ورشة' : 'منتجات')}
                                          </td>
                                          <td style={{ padding: '8px', fontWeight: 'bold', color: t.type === 'debt' ? '#ef4444' : '#22c55e' }}>
                                            {t.amount}
                                          </td>
                                        </tr>
                                      ))}
                                      {data.transactionsList.length === 0 && (
                                        <tr><td colSpan="3" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>لا يوجد</td></tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Total Debt Summary Card */}
        <div className="card" style={{ borderTop: '4px solid var(--color-marina)', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '50%' }}>
            <Wallet size={32} color="var(--color-marina)" />
          </div>
          <div>
            <h3 className="text-secondary">إجمالي الديون المستحقة</h3>
            <div className="heading-lg" style={{ color: 'var(--color-marina)' }}>{totalDebt.toLocaleString()} ج.م</div>
          </div>
        </div>

        {/* Suppliers Balances */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h3 className="heading-md" style={{ marginBottom: '16px' }}>أرصدة الموردين / المطابع</h3>
          {Object.keys(balances).length === 0 ? (
            <p className="text-muted">لا توجد حسابات مسجلة بعد.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              {Object.entries(balances).map(([supplier, data]) => (
                <div key={supplier} style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '8px' }}>{supplier}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <span>إجمالي المديونية:</span>
                    <span>{data.debt.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <span>ما تم سداده:</span>
                    <span>{data.payment.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                    <span>الباقي عليهم:</span>
                    <span style={{ color: data.total > 0 ? 'var(--color-marina)' : 'var(--state-delivered)' }}>
                      {data.total.toLocaleString()} ج.م
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="heading-md" style={{ marginBottom: '16px' }}>سجل المعاملات</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
              <th style={{ padding: '12px' }}>التاريخ</th>
              <th style={{ padding: '12px' }}>النوع</th>
              <th style={{ padding: '12px' }}>الجهة / المطبعة</th>
              <th style={{ padding: '12px' }}>المبلغ</th>
              <th style={{ padding: '12px' }}>البيان</th>
              <th style={{ padding: '12px' }}></th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {[...transactions].reverse().map(t => (
                <motion.tr 
                  key={t.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ borderBottom: '1px solid var(--border-color)' }}
                >
                  <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                    {new Date(t.date).toLocaleDateString('ar-EG')}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {t.type === 'debt' ? (
                      <span className="tag" style={{ background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ArrowDownRight size={12} /> 
                        {(!t.category || t.category === 'products') ? 'مصاريف منتجات' : 
                         t.category === 'admin' ? 'مصاريف إدارية' : 
                         t.category === 'workshop' ? 'مصاريف ورشة' : 
                         'مصاريف أخرى'}
                      </span>
                    ) : (
                      <span className="tag" style={{ background: '#dcfce7', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ArrowUpRight size={12} /> دفعة مسددة
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px', fontWeight: 600 }}>{t.supplier}</td>
                  <td style={{ padding: '12px', fontWeight: 700 }}>{t.amount.toLocaleString()} ج.م</td>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{t.description}</td>
                  <td style={{ padding: '12px' }}>
                    <button className="btn btn-secondary" style={{ padding: '6px', color: 'var(--color-marina)' }} onClick={() => deleteTransaction(t.id)}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
            {transactions.length === 0 && (
              <tr>
                <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>لا توجد معاملات بعد</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isAddModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px'
        }}>
          <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%', maxWidth: '400px' }}>
            <h2 className="heading-md" style={{ marginBottom: '24px' }}>تسجيل معاملة جديدة</h2>
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="text-secondary" style={{ display: 'block', marginBottom: '8px' }}>الجهة / المطبعة</label>
                <input required type="text" className="input-field" value={formData.supplier} onChange={e => setFormData({...formData, supplier: e.target.value})} placeholder="اسم المطبعة أو المورد" />
              </div>
              <div>
                <label className="text-secondary" style={{ display: 'block', marginBottom: '8px' }}>نوع المعاملة</label>
                <select className="input-field" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                  <option value="debt">مصروفات / مديونية علينا</option>
                  <option value="payment">دفعة تم تسديدها لهم</option>
                </select>
              </div>
              {formData.type === 'debt' && (
                <div>
                  <label className="text-secondary" style={{ display: 'block', marginBottom: '8px' }}>تصنيف المصروف</label>
                  <select className="input-field" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    <option value="products">مصاريف المنتجات (مواد خام، طباعة، الخ)</option>
                    <option value="admin">مصاريف إدارية (إعلانات، رواتب، باقات، الخ)</option>
                    <option value="workshop">مصاريف ورشة (أدوات، صيانة، إيجار، الخ)</option>
                    <option value="other">أخرى</option>
                  </select>
                </div>
              )}
              <div>
                <label className="text-secondary" style={{ display: 'block', marginBottom: '8px' }}>المبلغ</label>
                <input required type="number" className="input-field" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} placeholder="0" />
              </div>
              <div>
                <label className="text-secondary" style={{ display: 'block', marginBottom: '8px' }}>البيان (اختياري)</label>
                <input type="text" className="input-field" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="تفاصيل..." />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">حفظ</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Ledger;
