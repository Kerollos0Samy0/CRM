import React from 'react';
import { useData } from '../context/DataContext';
import { useMonthlyStats } from '../hooks/useMonthlyStats';
import { PieChart, Save } from 'lucide-react';

const ProfitSharing = () => {
  const { orders, archivedOrders, transactions, products, profitShares, updateProfitShares } = useData();
  const monthlyStats = useMonthlyStats({ orders, archivedOrders, transactions, products });

  const handleWorkshopChange = (monthKey, value) => {
    const val = parseInt(value) || 0;
    updateProfitShares({
      ...profitShares,
      workshopDeductions: {
        ...(profitShares?.workshopDeductions || {}),
        [monthKey]: val
      }
    });
  };

  const handleWithdrawalChange = (monthKey, partnerId, value) => {
    const val = parseInt(value) || 0;
    const currentWithdrawals = profitShares?.withdrawals || {};
    const monthWithdrawals = currentWithdrawals[monthKey] || {};
    
    updateProfitShares({
      ...profitShares,
      withdrawals: {
        ...currentWithdrawals,
        [monthKey]: {
          ...monthWithdrawals,
          [partnerId]: val
        }
      }
    });
  };

  // Totals for Table 1
  let totalProfit = 0;
  let totalChurch50 = 0;
  let totalWorkshop = 0;
  let totalChurchNet = 0;
  let totalDev = 0;
  let totalP1 = 0;
  let totalP2 = 0;
  let totalP3 = 0;
  let totalP4 = 0;

  // Totals for Table 2
  let totalWithdrawnP1 = 0;
  let totalWithdrawnP2 = 0;
  let totalWithdrawnP3 = 0;
  let totalWithdrawnP4 = 0;

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--accent-primary)20', padding: '12px', borderRadius: '12px', color: 'var(--accent-primary)' }}>
          <PieChart size={28} />
        </div>
        <h2 className="heading-lg">تقسيم الأرباح</h2>
      </div>

      {/* Table 1: Formula */}
      <div className="card" style={{ padding: '0', overflow: 'hidden', marginBottom: '32px' }}>
        <div style={{ padding: '16px 20px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
          <h3 className="heading-md" style={{ textAlign: 'center' }}>معادلة تقسيم الارباح</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', minWidth: '800px' }}>
            <thead>
              <tr>
                <th rowSpan={2} style={thStyle}>الشهر</th>
                <th rowSpan={2} style={{...thStyle, background: '#e0f2fe'}}>الارباح</th>
                <th colSpan={3} style={{...thStyle, background: '#fce7f3'}}>الكنيسة</th>
                <th rowSpan={2} style={{...thStyle, background: '#dcfce7'}}>تطوير<br/>0%</th>
                <th rowSpan={2} style={{...thStyle, background: '#e0f2fe'}}>شريك 1<br/>14%</th>
                <th rowSpan={2} style={{...thStyle, background: '#e0f2fe'}}>شريك 2<br/>14%</th>
                <th rowSpan={2} style={{...thStyle, background: '#e0f2fe'}}>شريك 3<br/>14%</th>
                <th rowSpan={2} style={{...thStyle, background: '#e0f2fe'}}>شريك 4<br/>8%</th>
              </tr>
              <tr>
                <th style={{...thStyle, background: '#fce7f3'}}>50%</th>
                <th style={{...thStyle, background: '#fce7f3'}}>حساب الورشة</th>
                <th style={{...thStyle, background: '#fce7f3'}}>باقي للكنيسة</th>
              </tr>
            </thead>
            <tbody>
              {/* Note: monthlyStats is sorted descending by default, let's sort it ascending for this table */}
              {[...monthlyStats].reverse().map(([monthKey, data]) => {
                const netProfit = data.sales - (data.cogs + data.admin + data.other);
                const church50 = Math.round(netProfit * 0.50);
                const workshop = profitShares?.workshopDeductions?.[monthKey] || 0;
                const churchNet = church50 - workshop;
                const dev = 0;
                const p1 = Math.round(netProfit * 0.14);
                const p2 = Math.round(netProfit * 0.14);
                const p3 = Math.round(netProfit * 0.14);
                const p4 = Math.round(netProfit * 0.08);

                totalProfit += netProfit;
                totalChurch50 += church50;
                totalWorkshop += workshop;
                totalChurchNet += churchNet;
                totalDev += dev;
                totalP1 += p1;
                totalP2 += p2;
                totalP3 += p3;
                totalP4 += p4;

                return (
                  <tr key={monthKey}>
                    <td style={tdStyle}>{monthKey}</td>
                    <td style={{...tdStyle, fontWeight: 'bold'}}>{netProfit.toLocaleString()}</td>
                    <td style={{...tdStyle, background: '#fdf2f8'}}>{church50.toLocaleString()}</td>
                    <td style={{...tdStyle, background: '#fdf2f8', padding: '4px'}}>
                      <input 
                        type="number" 
                        className="input-field"
                        style={{ textAlign: 'center', padding: '4px', height: '30px' }}
                        value={workshop || ''} 
                        onChange={(e) => handleWorkshopChange(monthKey, e.target.value)}
                      />
                    </td>
                    <td style={{...tdStyle, background: '#fdf2f8', color: churchNet < 0 ? 'red' : 'inherit'}}>{churchNet.toLocaleString()}</td>
                    <td style={{...tdStyle, background: '#f0fdf4'}}>{dev}</td>
                    <td style={tdStyle}>{p1.toLocaleString()}</td>
                    <td style={tdStyle}>{p2.toLocaleString()}</td>
                    <td style={tdStyle}>{p3.toLocaleString()}</td>
                    <td style={tdStyle}>{p4.toLocaleString()}</td>
                  </tr>
                );
              })}
              {/* Totals Row */}
              <tr style={{ background: '#fef3c7', fontWeight: 'bold', color: '#b45309' }}>
                <td style={tdStyle}>الإجمالي</td>
                <td style={{...tdStyle, color: 'red'}}>{totalProfit.toLocaleString()}</td>
                <td style={{...tdStyle, color: 'red'}}>{totalChurch50.toLocaleString()}</td>
                <td style={{...tdStyle, color: 'red'}}>{totalWorkshop.toLocaleString()}</td>
                <td style={{...tdStyle, color: 'red'}}>{totalChurchNet.toLocaleString()}</td>
                <td style={{...tdStyle, color: 'red'}}>{totalDev.toLocaleString()}</td>
                <td style={{...tdStyle, color: 'red'}}>{totalP1.toLocaleString()}</td>
                <td style={{...tdStyle, color: 'red'}}>{totalP2.toLocaleString()}</td>
                <td style={{...tdStyle, color: 'red'}}>{totalP3.toLocaleString()}</td>
                <td style={{...tdStyle, color: 'red'}}>{totalP4.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Table 2: Withdrawals */}
      <div className="card" style={{ padding: '0', overflow: 'hidden', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ padding: '16px 20px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
          <h3 className="heading-md" style={{ textAlign: 'center' }}>المسحوبات</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
            <thead>
              <tr>
                <th style={thStyle}>الشهر</th>
                <th style={thStyle}>شريك 1</th>
                <th style={thStyle}>شريك 2</th>
                <th style={thStyle}>شريك 3</th>
                <th style={thStyle}>شريك 4</th>
              </tr>
            </thead>
            <tbody>
              {[...monthlyStats].reverse().map(([monthKey]) => {
                const w1 = profitShares?.withdrawals?.[monthKey]?.['1'] || 0;
                const w2 = profitShares?.withdrawals?.[monthKey]?.['2'] || 0;
                const w3 = profitShares?.withdrawals?.[monthKey]?.['3'] || 0;
                const w4 = profitShares?.withdrawals?.[monthKey]?.['4'] || 0;

                totalWithdrawnP1 += w1;
                totalWithdrawnP2 += w2;
                totalWithdrawnP3 += w3;
                totalWithdrawnP4 += w4;

                return (
                  <tr key={`w-${monthKey}`}>
                    <td style={tdStyle}>{monthKey}</td>
                    <td style={{...tdStyle, padding: '4px'}}>
                      <input 
                        type="number" className="input-field" style={{ textAlign: 'center', padding: '4px', height: '30px' }}
                        value={w1 || ''} onChange={(e) => handleWithdrawalChange(monthKey, '1', e.target.value)}
                      />
                    </td>
                    <td style={{...tdStyle, padding: '4px'}}>
                      <input 
                        type="number" className="input-field" style={{ textAlign: 'center', padding: '4px', height: '30px' }}
                        value={w2 || ''} onChange={(e) => handleWithdrawalChange(monthKey, '2', e.target.value)}
                      />
                    </td>
                    <td style={{...tdStyle, padding: '4px'}}>
                      <input 
                        type="number" className="input-field" style={{ textAlign: 'center', padding: '4px', height: '30px' }}
                        value={w3 || ''} onChange={(e) => handleWithdrawalChange(monthKey, '3', e.target.value)}
                      />
                    </td>
                    <td style={{...tdStyle, padding: '4px'}}>
                      <input 
                        type="number" className="input-field" style={{ textAlign: 'center', padding: '4px', height: '30px' }}
                        value={w4 || ''} onChange={(e) => handleWithdrawalChange(monthKey, '4', e.target.value)}
                      />
                    </td>
                  </tr>
                );
              })}
              {/* Remaining Row */}
              <tr style={{ fontWeight: 'bold' }}>
                <td style={{...tdStyle, color: 'red'}}>الباقي</td>
                <td style={{...tdStyle, color: 'red'}}>{(totalP1 - totalWithdrawnP1).toLocaleString()}</td>
                <td style={{...tdStyle, color: 'red'}}>{(totalP2 - totalWithdrawnP2).toLocaleString()}</td>
                <td style={{...tdStyle, color: 'red'}}>{(totalP3 - totalWithdrawnP3).toLocaleString()}</td>
                <td style={{...tdStyle, color: 'red'}}>{(totalP4 - totalWithdrawnP4).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

const thStyle = {
  border: '1px solid #000',
  padding: '8px',
  fontWeight: 'bold',
  fontSize: '0.9rem'
};

const tdStyle = {
  border: '1px solid #000',
  padding: '8px',
  fontSize: '0.9rem'
};

export default ProfitSharing;
