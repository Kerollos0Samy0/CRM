import React, { createContext, useState, useEffect, useContext } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './AuthContext';
import initialProducts from '../data/products.json';
import initialClients from '../data/clients.json';
import migratedData from '../data/migrated_orders.json';

const DataContext = createContext();

const initialColumns = {
  new_order: { id: 'new_order', title: 'أوردر جديد', orderIds: [], color: 'var(--accent-primary)' },
  design: { id: 'design', title: 'في التصميم', orderIds: [], color: 'var(--color-kirolos)' },
  printing: { id: 'printing', title: 'المطبعة', orderIds: [], color: 'var(--state-printing)' },
  church: { id: 'church', title: 'الكنيسة', orderIds: [], color: 'var(--state-church)' },
  shipping: { id: 'shipping', title: 'شركة الشحن', orderIds: [], color: 'var(--state-shipping)' },
  delivered: { id: 'delivered', title: 'وصول إلى العميل', orderIds: [], color: 'var(--state-delivered)' },
};

export const DataProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState({});
  const [columns, setColumns] = useState(initialColumns);
  const [columnOrder, setColumnOrder] = useState(['new_order', 'design', 'printing', 'church', 'shipping', 'delivered']);
  const [tasks, setTasks] = useState({}); // New tasks state
  const [archivedOrders, setArchivedOrders] = useState([]); // New archived orders state
  const [clients, setClients] = useState(() => {
    const saved = localStorage.getItem('crm_clients');
    return saved ? JSON.parse(saved) : initialClients;
  });
  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem('crm_products');
    const migratedStock = localStorage.getItem('crm_stock_migrated_v1');
    
    if (saved) {
      let parsed = JSON.parse(saved);
      if (!migratedStock) {
        // One-time sync of stock and prices from JSON to local storage
        let mergedProducts = [...parsed];
        initialProducts.forEach(ip => {
          const existing = mergedProducts.find(sp => sp.name === ip.name);
          if (existing) {
            existing.buyPrice = ip.buyPrice;
            existing.sellPrice = ip.sellPrice;
            existing.type = ip.type;
            existing.stock = ip.stock;
          } else {
            mergedProducts.push(ip);
          }
        });
        parsed = mergedProducts;
        // We set it here, but it's better to let useEffect save it
        setTimeout(() => localStorage.setItem('crm_stock_migrated_v1', 'true'), 100);
      }
      return parsed;
    }
    return initialProducts;
  });
  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('crm_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  // Load from local storage on mount
  useEffect(() => {
    const savedOrders = localStorage.getItem('crm_orders');
    const savedColumns = localStorage.getItem('crm_columns');
    const savedTasks = localStorage.getItem('crm_tasks');
    const savedArchived = localStorage.getItem('crm_archived_orders');
    const migratedOrdersV2 = localStorage.getItem('crm_orders_migrated_v2');
    
    let parsedOrders = savedOrders ? JSON.parse(savedOrders) : {};
    let parsedColumns = savedColumns ? JSON.parse(savedColumns) : { ...initialColumns };
    let parsedArchived = savedArchived ? JSON.parse(savedArchived) : [];
    
    // Migration for old single-item orders and fixing field names from Google Sheets
    for (const id in parsedOrders) {
      if (!parsedOrders[id].items) {
        if (parsedOrders[id].workshop) {
          parsedOrders[id].items = [{ workshop: parsedOrders[id].workshop, quantity: parsedOrders[id].quantity }];
        } else {
          parsedOrders[id].items = [];
        }
      }
      
      // Normalize field names
      if (parsedOrders[id].clientName && !parsedOrders[id].name) {
        parsedOrders[id].name = parsedOrders[id].clientName;
      }
      if (parsedOrders[id].phone !== undefined && !parsedOrders[id].mobile) {
        parsedOrders[id].mobile = String(parsedOrders[id].phone);
      }
      if (parsedOrders[id].government && !parsedOrders[id].governorate) {
        parsedOrders[id].governorate = parsedOrders[id].government;
      }
      
      // Fix string notes from migration
      if (typeof parsedOrders[id].notes === 'string') {
        parsedOrders[id].orderNotes = parsedOrders[id].notes; // Move string to orderNotes
        parsedOrders[id].notes = []; // Set notes to array as expected by addNote
      }
      if (!Array.isArray(parsedOrders[id].notes)) {
        parsedOrders[id].notes = [];
      }
    }
    
    // Normalize archived orders too
    for (let i = 0; i < parsedArchived.length; i++) {
      let archOrder = parsedArchived[i];
      if (archOrder.clientName && !archOrder.name) archOrder.name = archOrder.clientName;
      if (archOrder.phone !== undefined && !archOrder.mobile) archOrder.mobile = String(archOrder.phone);
      if (archOrder.government && !archOrder.governorate) archOrder.governorate = archOrder.government;
      if (typeof archOrder.notes === 'string') {
        archOrder.orderNotes = archOrder.notes;
        archOrder.notes = [];
      }
      if (!Array.isArray(archOrder.notes)) archOrder.notes = [];
    }
    
    if (!parsedColumns.new_order) {
      parsedColumns = { new_order: initialColumns.new_order, ...parsedColumns };
    }
    if (!parsedColumns.design) {
      parsedColumns.design = initialColumns.design;
    }

    // Merge migrated data from Google Sheets if not done yet
    if (!migratedOrdersV2) {
      parsedOrders = { ...parsedOrders, ...migratedData.orders };
      
      Object.keys(migratedData.columns).forEach(colId => {
        if (!parsedColumns[colId]) parsedColumns[colId] = { ...initialColumns[colId] };
        parsedColumns[colId].orderIds = [...new Set([...parsedColumns[colId].orderIds, ...migratedData.columns[colId].orderIds])];
      });

      parsedArchived = [...parsedArchived, ...migratedData.archivedOrders];
      
      setTimeout(() => localStorage.setItem('crm_orders_migrated_v2', 'true'), 100);
    }

    setOrders(parsedOrders);
    setColumns(parsedColumns);
    setArchivedOrders(parsedArchived);
    if (savedTasks) setTasks(JSON.parse(savedTasks));
  }, []);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem('crm_orders', JSON.stringify(orders));
    localStorage.setItem('crm_columns', JSON.stringify(columns));
    localStorage.setItem('crm_tasks', JSON.stringify(tasks));
    localStorage.setItem('crm_products', JSON.stringify(products));
    localStorage.setItem('crm_transactions', JSON.stringify(transactions));
    localStorage.setItem('crm_archived_orders', JSON.stringify(archivedOrders));
  }, [orders, columns, tasks, products, transactions, archivedOrders]);

  // ---- Tasks Functions ----
  const addTask = (taskData) => {
    const id = uuidv4();
    const newTask = {
      id,
      ...taskData,
      assignerId: currentUser.id,
      status: 'todo', // 'todo', 'in-progress', 'done'
      createdAt: new Date().toISOString(),
    };
    setTasks(prev => ({ ...prev, [id]: newTask }));
  };

  const updateTaskStatus = (taskId, newStatus) => {
    setTasks(prev => ({
      ...prev,
      [taskId]: { ...prev[taskId], status: newStatus }
    }));
  };
  
  const deleteTask = (taskId) => {
    const newTasks = { ...tasks };
    delete newTasks[taskId];
    setTasks(newTasks);
  };

  // ---- Products Functions ----
  const addProduct = (productData) => {
    const newProduct = {
      id: uuidv4(),
      ...productData,
      stock: Number(productData.stock) || 0,
      buyPrice: Number(productData.buyPrice) || 0,
      sellPrice: Number(productData.sellPrice) || 0,
    };
    setProducts(prev => [...prev, newProduct]);
  };

  const updateProduct = (productId, updatedFields) => {
    setProducts(prev => prev.map(p => 
      p.id === productId ? { ...p, ...updatedFields } : p
    ));
  };
  // -------------------------

  // ---- Ledger Functions ----
  const addTransaction = (transactionData) => {
    const newTransaction = {
      id: uuidv4(),
      ...transactionData,
      date: new Date().toISOString(),
      amount: Number(transactionData.amount) || 0
    };
    setTransactions(prev => [...prev, newTransaction]);
  };

  const deleteTransaction = (id) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };
  // -------------------------

  const addOrder = (orderData) => {
    const id = uuidv4();
    const newOrder = {
      id,
      ...orderData,
      createdBy: currentUser.id, // Links order color to user
      createdAt: new Date().toISOString(),
      notes: []
    };

    setOrders((prev) => ({ ...prev, [id]: newOrder }));
    
    // Add to 'new_order' column by default
    setColumns((prev) => {
      const newColumn = {
        ...prev.new_order,
        orderIds: [id, ...prev.new_order.orderIds]
      };
      return { ...prev, new_order: newColumn };
    });

    // Auto deduct stock
    if (orderData.items && orderData.items.length > 0) {
      setProducts(prev => {
        let newProducts = [...prev];
        orderData.items.forEach(item => {
          const index = newProducts.findIndex(p => p.name === item.workshop);
          if (index !== -1 && item.quantity) {
            newProducts[index] = { ...newProducts[index], stock: newProducts[index].stock - Number(item.quantity) };
          }
        });
        return newProducts;
      });
    }
  };

  const updateOrder = (id, updatedData) => {
    setOrders((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...updatedData }
    }));
  };

  const addNote = (orderId, text) => {
    setOrders((prev) => {
      const order = prev[orderId];
      const newNote = {
        id: uuidv4(),
        text,
        createdBy: currentUser.name,
        timestamp: new Date().toISOString()
      };
      return {
        ...prev,
        [orderId]: { ...order, notes: [...order.notes, newNote] }
      };
    });
  };

  const deleteOrder = (orderId) => {
    const orderToDelete = orders[orderId];
    
    // Restore stock
    if (orderToDelete && orderToDelete.items && orderToDelete.items.length > 0) {
      setProducts(prev => {
        let newProducts = [...prev];
        orderToDelete.items.forEach(item => {
          const index = newProducts.findIndex(p => p.name === item.workshop);
          if (index !== -1 && item.quantity) {
            newProducts[index] = { ...newProducts[index], stock: newProducts[index].stock + Number(item.quantity) };
          }
        });
        return newProducts;
      });
    }

    const newOrders = { ...orders };
    delete newOrders[orderId];
    setOrders(newOrders);

    setColumns((prev) => {
      const newColumns = { ...prev };
      for (const colId in newColumns) {
        newColumns[colId].orderIds = newColumns[colId].orderIds.filter(id => id !== orderId);
      }
      return newColumns;
    });
  };

  const moveOrder = (sourceColId, destinationColId, sourceIndex, destinationIndex, orderId) => {
    const start = columns[sourceColId];
    const finish = columns[destinationColId];

    if (start === finish) {
      const newOrderIds = Array.from(start.orderIds);
      newOrderIds.splice(sourceIndex, 1);
      newOrderIds.splice(destinationIndex, 0, orderId);

      const newColumn = { ...start, orderIds: newOrderIds };
      setColumns((prev) => ({ ...prev, [newColumn.id]: newColumn }));
      return;
    }

    // Moving between columns
    const startOrderIds = Array.from(start.orderIds);
    startOrderIds.splice(sourceIndex, 1);
    const newStart = { ...start, orderIds: startOrderIds };

    const finishOrderIds = Array.from(finish.orderIds);
    finishOrderIds.splice(destinationIndex, 0, orderId);
    const newFinish = { ...finish, orderIds: finishOrderIds };

    if (destinationColId === 'design' && sourceColId !== 'design') {
      const movedOrder = orders[orderId];
      if (movedOrder) {
        addTask({
          title: `تصميم أوردر: ${movedOrder.name}`,
          description: `برجاء عمل التصميم الخاص بأوردر العميل (${movedOrder.name}) - كنيسة: ${movedOrder.church}`,
          assigneeId: 'kirolos'
        });
      }
    }

    setColumns((prev) => ({
      ...prev,
      [newStart.id]: newStart,
      [newFinish.id]: newFinish
    }));
  };

  const archiveOrder = (orderId) => {
    const orderToArchive = orders[orderId];
    if (!orderToArchive) return;
    
    // 1. Add to archived
    const archivedOrder = {
      ...orderToArchive,
      archivedAt: new Date().toISOString()
    };
    setArchivedOrders(prev => [archivedOrder, ...prev]);

    // 2. Remove from active orders
    const newOrders = { ...orders };
    delete newOrders[orderId];
    setOrders(newOrders);

    // 3. Remove from columns
    setColumns(prev => {
      const newColumns = { ...prev };
      for (const colId in newColumns) {
        newColumns[colId] = {
          ...newColumns[colId],
          orderIds: newColumns[colId].orderIds.filter(id => id !== orderId)
        };
      }
      return newColumns;
    });
  };

  return (
    <DataContext.Provider value={{
      orders, columns, columnOrder, 
      tasks, addTask, updateTaskStatus, deleteTask,
      clients, products, addProduct, updateProduct,
      transactions, addTransaction, deleteTransaction,
      addOrder, updateOrder, deleteOrder, moveOrder, addNote,
      archivedOrders, archiveOrder
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);
