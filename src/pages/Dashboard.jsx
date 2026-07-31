import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Plus, MessageCircle, MapPin, Calendar, Hash } from 'lucide-react';
import OrderModal from '../components/OrderModal';
import OrderDetailsModal from '../components/OrderDetailsModal';

const Dashboard = () => {
  const { users } = useAuth();
  const { orders, columns, columnOrder, moveOrder } = useData();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    
    // Prevent dragging incomplete orders to shipping
    if (destination.droppableId === 'shipping') {
      const order = orders[draggableId];
      if (order && order.hasMissingItems) {
        window.alert(`لا يمكن شحن هذا الأوردر، يوجد نواقص:\n${order.missingNotes || 'غير محدد'}`);
        return;
      }
    }

    moveOrder(source.droppableId, destination.droppableId, source.index, destination.index, draggableId);
  };

  const getUserColor = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? user.color : 'var(--border-color)';
  };

  const renderColumn = (columnId) => {
    const column = columns[columnId];
    if (!column) return null;
    const columnOrders = column.orderIds.map(orderId => orders[orderId]).filter(Boolean);

    return (
      <div key={column.id} style={{ 
        flex: '0 0 320px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div className="glass-panel" style={{ 
          padding: '16px',
          borderTop: `4px solid ${column.color}`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="heading-md" style={{ fontSize: '1.2rem' }}>{column.title}</h3>
            <div style={{ 
              background: 'var(--bg-primary)',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '0.8rem',
              border: '1px solid var(--border-color)'
            }}>
              {columnOrders.length}
            </div>
          </div>
        </div>

        <Droppable droppableId={column.id}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              style={{
                flex: 1,
                minHeight: '200px',
                background: snapshot.isDraggingOver ? 'rgba(255,255,255,0.02)' : 'transparent',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                transition: 'background 0.2s ease'
              }}
            >
              {columnOrders.map((order, index) => (
                <Draggable key={order.id} draggableId={order.id} index={index}>
                  {(provided, snapshot) => {
                    const creatorColor = getUserColor(order.createdBy);
                    
                    const statusCounts = order.items?.reduce((acc, item) => {
                      const s = item.status || 'new';
                      acc[s] = (acc[s] || 0) + 1;
                      return acc;
                    }, {}) || {};

                    // Compute total order items string
                    const itemsString = order.items?.map(i => `${i.workshop} (${i.quantity})`).join('، ') || '';

                    return (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="card"
                        onClick={() => setSelectedOrder(order)}
                        style={{
                          padding: '16px',
                          cursor: 'pointer',
                          borderRight: `4px solid ${creatorColor}`,
                          ...provided.draggableProps.style,
                          boxShadow: snapshot.isDragging ? 'var(--shadow-glass)' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <h4 style={{ fontWeight: 600, fontSize: '1.1rem' }}>{order.name}</h4>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {order.church}
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem', marginBottom: '12px', flexWrap: 'wrap' }}>
                          {statusCounts['new'] > 0 && <span style={{ background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: '6px' }}>🆕 {statusCounts['new']} جديد</span>}
                          {statusCounts['design'] > 0 && <span style={{ background: 'var(--color-kirolos-light)', color: 'var(--color-kirolos)', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold' }}>🎨 {statusCounts['design']} تصميم</span>}
                          {statusCounts['printing'] > 0 && <span style={{ background: 'var(--state-printing)', color: 'white', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold' }}>🖨️ {statusCounts['printing']} مطبعة</span>}
                          {statusCounts['ready'] > 0 && <span style={{ background: 'var(--state-church)', color: 'white', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold' }}>✅ {statusCounts['ready']} جاهز</span>}
                        </div>

                        {order.hasMissingItems && (
                          <div style={{ background: 'rgba(248, 113, 113, 0.1)', color: 'var(--color-marina)', padding: '6px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            ⚠️ يوجد نواقص: {order.missingNotes}
                          </div>
                        )}
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            <MapPin size={14} />
                            <span>{order.governorate}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            <Hash size={14} style={{ marginTop: '3px' }} />
                            <span style={{ flex: 1 }}>{itemsString || 'لا يوجد منتجات'}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            <Calendar size={14} />
                            <span>تسليم: {order.deadline}</span>
                          </div>
                        </div>
                        
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          borderTop: '1px solid var(--border-color)',
                          paddingTop: '12px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            <MessageCircle size={14} />
                            <span>{order.notes?.length || 0}</span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: creatorColor }}>
                            {users.find(u => u.id === order.createdBy)?.name}
                          </div>
                        </div>
                      </div>
                    );
                  }}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    );
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: '16px' }}>
        <button 
          className="btn btn-primary" 
          onClick={() => setIsAddModalOpen(true)}
        >
          <Plus size={18} />
          إضافة أوردر
        </button>
      </div>

      <div style={{ display: 'flex', gap: '24px', overflowX: 'auto', flex: 1, minHeight: 0 }}>
        <DragDropContext onDragEnd={onDragEnd}>
          
          <div style={{ display: 'flex', padding: '24px 0' }}>
            {renderColumn(columnOrder[0])}
          </div>

          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            background: 'var(--bg-secondary)', 
            padding: '24px', 
            borderRadius: '16px', 
            border: '1px solid var(--border-color)',
            gap: '16px'
          }}>
            <h2 className="heading-md" style={{ textAlign: 'center', color: 'var(--text-primary)', borderBottom: '2px dashed var(--border-color)', paddingBottom: '12px', margin: '0 24px' }}>في التحضير</h2>
            <div style={{ display: 'flex', gap: '24px' }}>
              {columnOrder.slice(1, 4).map(renderColumn)}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '24px', padding: '24px 0' }}>
            {columnOrder.slice(4).map(renderColumn)}
          </div>

        </DragDropContext>
      </div>

      {isAddModalOpen && <OrderModal onClose={() => setIsAddModalOpen(false)} />}
      {selectedOrder && (
        <OrderDetailsModal 
          order={selectedOrder} 
          isDelivered={selectedOrder.status === 'arrived'} 
          onClose={() => setSelectedOrder(null)} 
        />
      )}
    </>
  );
};

export default Dashboard;
