import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Plus, Edit2, Check, Package, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Inventory = () => {
  const { products, addProduct, updateProduct } = useData();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [editForm, setEditForm] = useState({ buyPrice: 0, sellPrice: 0, stock: 0 });
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '', type: 'Workshop', buyPrice: 0, sellPrice: 0, stock: 0
  });

  const handleAddProduct = (e) => {
    e.preventDefault();
    addProduct(formData);
    setIsAddModalOpen(false);
    setFormData({ name: '', type: 'Workshop', buyPrice: 0, sellPrice: 0, stock: 0 });
  };

  const handleEditClick = (product) => {
    setEditingProductId(product.id);
    setEditForm({ buyPrice: product.buyPrice, sellPrice: product.sellPrice, stock: product.stock });
  };

  const handleSaveProduct = (id) => {
    updateProduct(id, { 
      buyPrice: Number(editForm.buyPrice), 
      sellPrice: Number(editForm.sellPrice), 
      stock: Number(editForm.stock) 
    });
    setEditingProductId(null);
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // Calculate totals
  const totalStockValue = products.reduce((acc, p) => acc + (p.stock * p.sellPrice), 0);
  const totalItems = products.reduce((acc, p) => acc + p.stock, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Package size={24} color="var(--color-mira)" />
            <div>
              <div className="text-small">إجمالي القطع</div>
              <div className="heading-md">{totalItems.toLocaleString('en-US')}</div>
            </div>
          </div>
          <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <TrendingUp size={24} color="var(--color-sherry)" />
            <div>
              <div className="text-small">القيمة التقديرية (بيع)</div>
              <div className="heading-md">{totalStockValue.toLocaleString('en-US')} ج.م</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <input 
            type="text" 
            className="input-field" 
            placeholder="بحث عن منتج..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '250px' }}
          />
          <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
            <Plus size={18} />
            إضافة منتج
          </button>
        </div>
      </div>

      <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
              <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: 600 }}>المنتج / الورشة</th>
              <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: 600 }}>النوع</th>
              <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: 600 }}>سعر الشراء</th>
              <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: 600 }}>سعر البيع</th>
              <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: 600 }}>الرصيد (المخزن)</th>
              <th style={{ padding: '16px', color: 'var(--text-secondary)', fontWeight: 600 }}>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filteredProducts.map(product => (
                <motion.tr 
                  key={product.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ borderBottom: '1px solid var(--border-color)' }}
                >
                  <td style={{ padding: '16px', fontWeight: 600 }}>{product.name}</td>
                  <td style={{ padding: '16px' }}>
                    <span className="tag" style={{ backgroundColor: 'var(--bg-primary)' }}>{product.type}</span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    {editingProductId === product.id ? (
                      <input 
                        type="number" 
                        className="input-field" 
                        value={editForm.buyPrice}
                        onChange={(e) => setEditForm({...editForm, buyPrice: e.target.value})}
                        style={{ width: '80px', padding: '4px 8px', minHeight: '30px' }}
                      />
                    ) : (
                      <>{product.buyPrice} ج.م</>
                    )}
                  </td>
                  <td style={{ padding: '16px', color: 'var(--color-sherry)' }}>
                    {editingProductId === product.id ? (
                      <input 
                        type="number" 
                        className="input-field" 
                        value={editForm.sellPrice}
                        onChange={(e) => setEditForm({...editForm, sellPrice: e.target.value})}
                        style={{ width: '80px', padding: '4px 8px', minHeight: '30px' }}
                      />
                    ) : (
                      <>{product.sellPrice} ج.م</>
                    )}
                  </td>
                  <td style={{ padding: '16px' }}>
                    {editingProductId === product.id ? (
                      <input 
                        type="number" 
                        className="input-field" 
                        value={editForm.stock}
                        onChange={(e) => setEditForm({...editForm, stock: e.target.value})}
                        style={{ width: '80px', padding: '4px 8px', minHeight: '30px' }}
                      />
                    ) : (
                      <span style={{ 
                        fontWeight: 600, 
                        color: product.stock <= 5 ? 'var(--color-marina)' : 'inherit' 
                      }}>
                        {product.stock}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '16px' }}>
                    {editingProductId === product.id ? (
                      <button className="btn btn-primary" style={{ padding: '6px 12px' }} onClick={() => handleSaveProduct(product.id)}>
                        <Check size={14} /> حفظ
                      </button>
                    ) : (
                      <button className="btn btn-secondary" style={{ padding: '6px 12px' }} onClick={() => handleEditClick(product)}>
                        <Edit2 size={14} /> تعديل
                      </button>
                    )}
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>لا توجد منتجات مطابقة للبحث</td>
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
          <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%', maxWidth: '500px', padding: '32px' }}>
            <h2 className="heading-md" style={{ marginBottom: '24px' }}>إضافة منتج جديد</h2>
            <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>اسم المنتج / الورشة</label>
                <input required type="text" className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>سعر الشراء</label>
                  <input required type="number" className="input-field" value={formData.buyPrice} onChange={e => setFormData({...formData, buyPrice: e.target.value})} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>سعر البيع</label>
                  <input required type="number" className="input-field" value={formData.sellPrice} onChange={e => setFormData({...formData, sellPrice: e.target.value})} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>الرصيد الافتتاحي (المخزن)</label>
                  <input required type="number" className="input-field" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>النوع</label>
                  <select className="input-field" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option value="Workshop">Workshop</option>
                    <option value="Brand">Brand</option>
                    <option value="Digital">Digital</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">حفظ المنتج</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
