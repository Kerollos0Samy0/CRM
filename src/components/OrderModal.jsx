import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';

const OrderModal = ({ onClose }) => {
  const { addOrder, clients, products } = useData();
  const defaultDeadline = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    name: '',
    church: '',
    mobile: '',
    governorate: '',
    address: '',
    items: [{ workshop: '', quantity: 1, unitPrice: 0, status: 'new' }],
    deadline: defaultDeadline,
    orderNotes: '',
    discount: 0,
    paidAmount: 0
  });

  const calculateTotal = () => {
    let total = 0;
    formData.items.forEach(item => {
      total += (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0);
    });
    return total;
  };

  const totalAmount = calculateTotal();
  const remainingAmount = totalAmount - (Number(formData.discount) || 0) - (Number(formData.paidAmount) || 0);

  const handleSmartPaste = (e) => {
    const text = e.target.value;
    if (!text) return;

    const newFormData = { ...formData };
    
    const nameMatch = text.match(/(?:الاسم|اسم العميل)\s*[:\-]?\s*([^\n]+)/);
    if (nameMatch) newFormData.name = nameMatch[1].trim();
    
    const mobileMatch = text.match(/(?:الرقم|تليفون|موبايل|الموبايل|فون|رقم)\s*[:\-]?\s*([\d\s]+)/);
    if (mobileMatch) newFormData.mobile = mobileMatch[1].trim();

    const govMatch = text.match(/المحافظة\s*[:\-]?\s*([^\n]+)/);
    if (govMatch) newFormData.governorate = govMatch[1].trim();

    const addressMatch = text.match(/العنوان\s*[:\-]?\s*([^\n]+)/);
    if (addressMatch) newFormData.address = addressMatch[1].trim();

    const churchMatch = text.match(/الكنيسة\s*[:\-]?\s*([^\n]+)/);
    if (churchMatch) newFormData.church = churchMatch[1].trim();

    const orderSectionMatch = text.match(/(?:الاوردر|الطلب|المطلوب|التفاصيل)\s*[:\-]?\s*([\s\S]*?)(?:المدفوع|الخصم|$)/);
    if (orderSectionMatch) {
      newFormData.orderNotes = orderSectionMatch[1].trim();
    }

    const paidMatch = text.match(/(?:المدفوع|عربون|تم دفع|تم الدفع)\s*[:\-]?\s*(\d+)/);
    if (paidMatch) newFormData.paidAmount = parseInt(paidMatch[1], 10);

    const discountMatch = text.match(/(?:الخصم)\s*[:\-]?\s*(\d+)/);
    if (discountMatch) newFormData.discount = parseInt(discountMatch[1], 10);

    const deadlineMatch = text.match(/(?:الديد لاين|تاريخ التسليم|الديدلاين)\s*[:\-]?\s*(\d{4}-\d{1,2}-\d{1,2})/);
    if (deadlineMatch) {
      // Ensure date is properly formatted with leading zeros if needed
      const parts = deadlineMatch[1].split('-');
      const yyyy = parts[0];
      const mm = parts[1].padStart(2, '0');
      const dd = parts[2].padStart(2, '0');
      newFormData.deadline = `${yyyy}-${mm}-${dd}`;
    }

    setFormData(newFormData);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    
    // Auto-fetch price if workshop changed
    if (field === 'workshop') {
      const product = products.find(p => p.name === value);
      if (product) {
        newItems[index].unitPrice = product.sellPrice;
      }
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({ ...formData, items: [...formData.items, { workshop: '', quantity: 1, unitPrice: 0, status: 'new' }] });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNameChange = (e) => {
    const val = e.target.value;
    const matchedClient = clients.find(c => c.name === val);
    if (matchedClient) {
      setFormData(prev => ({
        ...prev,
        name: val,
        church: matchedClient.church || prev.church,
        mobile: matchedClient.phone || prev.mobile,
        governorate: matchedClient.governorate || prev.governorate,
        address: matchedClient.address || prev.address
      }));
    } else {
      setFormData(prev => ({ ...prev, name: val }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    addOrder({
      ...formData,
      totalAmount,
      remainingAmount
    });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, 
      backgroundColor: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 1000, padding: '20px'
    }}>
      <motion.div 
        className="card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '32px', position: 'relative' }}
      >
        <button 
          onClick={onClose}
          style={{ 
            position: 'absolute', top: '24px', left: '24px', 
            background: 'none', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer'
          }}
        >
          <X size={24} />
        </button>

        <h2 className="heading-md" style={{ marginBottom: '24px' }}>أوردر جديد</h2>

        <div style={{ marginBottom: '24px', background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--color-marina)', fontWeight: 600 }}>✨ لصق ذكي (Smart Paste)</label>
          <textarea 
            onChange={handleSmartPaste} 
            className="input-field" 
            rows="3" 
            placeholder="انسخ رسالة الواتساب هنا، وسيقوم النظام بتعبئة البيانات تلقائياً..."
            style={{ fontSize: '0.9rem' }}
          />
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>الاسم</label>
            <input required list="clients-list" type="text" name="name" value={formData.name} onChange={handleNameChange} className="input-field" placeholder="اسم العميل" />
            <datalist id="clients-list">
              {clients.map(c => <option key={c.id} value={c.name} />)}
            </datalist>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>الكنيسة</label>
            <input required type="text" name="church" value={formData.church} onChange={handleChange} className="input-field" placeholder="اسم الكنيسة" />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>رقم الموبايل</label>
            <input required type="text" name="mobile" value={formData.mobile} onChange={handleChange} className="input-field" placeholder="01..." dir="ltr" />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>المحافظة</label>
            <input required type="text" name="governorate" value={formData.governorate} onChange={handleChange} className="input-field" placeholder="مثال: القاهرة" />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>العنوان</label>
            <input required type="text" name="address" value={formData.address} onChange={handleChange} className="input-field" placeholder="العنوان بالتفصيل" />
          </div>

          <div style={{ gridColumn: '1 / -1', background: 'var(--bg-primary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <label style={{ color: 'var(--text-primary)', fontWeight: 600 }}>المنتجات / الأصناف</label>
              <button type="button" onClick={addItem} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                + صنف آخر
              </button>
            </div>
            
            {formData.items.map((item, index) => (
              <div key={index} style={{ display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'flex-start' }}>
                <div style={{ flex: 2 }}>
                  <input required list="products-list" type="text" value={item.workshop} onChange={(e) => handleItemChange(index, 'workshop', e.target.value)} className="input-field" placeholder="اسم الورشة / المنتج" />
                </div>
                <div style={{ flex: 1 }}>
                  <input required type="number" min="0" value={item.unitPrice} onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)} className="input-field" placeholder="سعر الوحدة" />
                </div>
                <div style={{ flex: 1 }}>
                  <input required type="number" min="1" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} className="input-field" placeholder="العدد" />
                </div>
                {formData.items.length > 1 && (
                  <button type="button" onClick={() => removeItem(index)} className="btn btn-secondary" style={{ padding: '10px', color: 'var(--color-marina)', borderColor: 'rgba(248, 113, 113, 0.3)' }}>
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
            <datalist id="products-list">
              {products.map(p => <option key={p.id} value={p.name} />)}
            </datalist>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>الديد لاين (تاريخ التسليم)</label>
            <input required type="date" name="deadline" value={formData.deadline} onChange={handleChange} className="input-field" />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>ملاحظات الأوردر (تفاصيل الواتساب)</label>
            <textarea name="orderNotes" value={formData.orderNotes} onChange={handleChange} className="input-field" rows="4" placeholder="تفاصيل الأوردرات المتعددة والمبالغ هنا..." />
          </div>

          <div style={{ gridColumn: '1 / -1', background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ gridColumn: '1 / -1', marginBottom: '4px' }}>
              <label style={{ color: 'var(--text-primary)', fontWeight: 600 }}>الحسابيات</label>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>الخصم (ج.م)</label>
              <input type="number" name="discount" value={formData.discount} onChange={handleChange} className="input-field" placeholder="0" />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>تم دفع / عربون (ج.م)</label>
              <input type="number" name="paidAmount" value={formData.paidAmount} onChange={handleChange} className="input-field" placeholder="0" />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '16px', borderTop: '1px dashed var(--border-color)' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="text-small">إجمالي الأوردر</span>
                <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{totalAmount} ج.م</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span className="text-small">باقي الحساب</span>
                <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: remainingAmount > 0 ? 'var(--color-marina)' : 'var(--state-delivered)' }}>
                  {remainingAmount} ج.م
                </span>
              </div>
            </div>
          </div>

          <div style={{ gridColumn: '1 / -1', marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>إلغاء</button>
            <button type="submit" className="btn btn-primary">حفظ الأوردر</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default OrderModal;
