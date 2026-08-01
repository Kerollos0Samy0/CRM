import { useMemo } from 'react';

export const useMonthlyStats = ({ orders, archivedOrders, transactions, products }) => {
  return useMemo(() => {
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
};
