import React, { createContext, useState, useEffect, useContext } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './AuthContext';
import initialProducts from '../data/products.json';
import initialClients from '../data/clients.json';
import migratedData from '../data/migrated_orders.json';
import migrationV4Data from '../data/migration_v4_data.json';
import chatClients from '../data/clients_from_chat.json';

const DataContext = createContext();

const initialColumns = {
  pending: { id: 'pending', title: 'مطلوبة ولسه متحضرتش', orderIds: [], color: '#48bb78' },
  designing: { id: 'designing', title: 'جاري التصميم', orderIds: [], color: '#f6ad55' },
  printing: { id: 'printing', title: 'في الطباعة', orderIds: [], color: '#f6e05e' },
  received: { id: 'received', title: 'في الكنيسة', orderIds: [], color: '#38b2ac' },
  ready: { id: 'ready', title: 'جاهزة وعايزة تتشحن', orderIds: [], color: '#ed8936' },
  shipped: { id: 'shipped', title: 'في شركة الشحن', orderIds: [], color: '#4299e1' },
  arrived: { id: 'arrived', title: 'أوردرات وصلت بنجاح', orderIds: [], color: '#9f7aea' },
};

export const DataProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState({});
  const [columns, setColumns] = useState(initialColumns);
  const [columnOrder, setColumnOrder] = useState(['pending', 'designing', 'printing', 'received', 'ready', 'shipped', 'arrived']);
  const [tasks, setTasks] = useState({}); // New tasks state
  const [archivedOrders, setArchivedOrders] = useState([]); // New archived orders state
  const [clients, setClients] = useState(() => {
    const saved = localStorage.getItem('crm_clients');
    const migratedChat = localStorage.getItem('crm_clients_chat_v1');
    let currentClients = saved ? JSON.parse(saved) : initialClients;

    if (!migratedChat) {
      const merged = [...currentClients];
      chatClients.forEach(chatClient => {
         const existing = merged.find(c => 
           (c.name && chatClient.name && c.name.trim() === chatClient.name.trim()) || 
           (c.phone && chatClient.phone && c.phone === chatClient.phone)
         );
         
         if (existing) {
             if (!existing.phone && chatClient.phone) existing.phone = chatClient.phone;
             if (!existing.church && chatClient.church) existing.church = chatClient.church;
             if (!existing.address && chatClient.address) existing.address = chatClient.address;
             if (!existing.governorate && chatClient.governorate) existing.governorate = chatClient.governorate;
         } else {
             merged.push({ id: uuidv4(), ...chatClient });
         }
      });
      currentClients = merged;
      setTimeout(() => localStorage.setItem('crm_clients_chat_v1', 'true'), 100);
    }
    
    return currentClients;
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
    const migratedOrdersV3 = localStorage.getItem('crm_orders_migrated_v3');
    const migratedOrdersV4 = localStorage.getItem('crm_orders_migrated_v4');
    
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
      
      // Normalize items and money
      if (parsedOrders[id].items) {
        let total = 0;
        parsedOrders[id].items.forEach(item => {
          if (item.name && !item.workshop) item.workshop = item.name;
          if (item.sellPrice !== undefined && item.unitPrice === undefined) item.unitPrice = item.sellPrice;
          total += (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0);
        });
        if (parsedOrders[id].totalAmount === undefined) {
          parsedOrders[id].totalAmount = total;
        }
      }
      if (parsedOrders[id].remainingAmount === undefined) {
        parsedOrders[id].remainingAmount = Math.max(0, (parsedOrders[id].totalAmount || 0) - (Number(parsedOrders[id].discount) || 0) - (Number(parsedOrders[id].paidAmount) || 0));
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
      
      // Normalize items and money
      if (archOrder.items) {
        let total = 0;
        archOrder.items.forEach(item => {
          if (item.name && !item.workshop) item.workshop = item.name;
          if (item.sellPrice !== undefined && item.unitPrice === undefined) item.unitPrice = item.sellPrice;
          total += (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0);
        });
        if (archOrder.totalAmount === undefined) {
          archOrder.totalAmount = total;
        }
      }
      if (archOrder.remainingAmount === undefined) {
        archOrder.remainingAmount = Math.max(0, (archOrder.totalAmount || 0) - (Number(archOrder.discount) || 0) - (Number(archOrder.paidAmount) || 0));
      }
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
    
    // v3 Migration: update column names and order statuses to 7-column layout
    if (!migratedOrdersV3) {
      const colMap = {
        'new_order': 'pending',
        'design': 'designing',
        'printing': 'printing',
        'church': 'ready',
        'shipping': 'shipped',
        'delivered': 'arrived'
      };
      
      const newCols = JSON.parse(JSON.stringify(initialColumns));
      
      Object.keys(parsedColumns).forEach(oldColId => {
        const newColId = colMap[oldColId] || oldColId;
        if (newCols[newColId] && parsedColumns[oldColId].orderIds) {
          newCols[newColId].orderIds = [...new Set([...newCols[newColId].orderIds, ...parsedColumns[oldColId].orderIds])];
        }
      });
      
      Object.keys(parsedOrders).forEach(orderId => {
        const order = parsedOrders[orderId];
        if (colMap[order.status]) {
          order.status = colMap[order.status];
        }
      });
      
      parsedColumns = newCols;
      setTimeout(() => localStorage.setItem('crm_orders_migrated_v3', 'true'), 100);
    }
    
    // v4 Migration: Archive old orders (before July 1st) and move remaining new_order to shipping
    if (!migratedOrdersV4) {
      migrationV4Data.archiveIds.forEach(id => {
        if (parsedOrders[id] && parsedOrders[id].status === 'pending') {
          parsedArchived.unshift({
            ...parsedOrders[id],
            archivedAt: new Date().toISOString()
          });
          if (parsedColumns.pending) {
            parsedColumns.pending.orderIds = parsedColumns.pending.orderIds.filter(oId => oId !== id);
          }
          delete parsedOrders[id];
        }
      });

      migrationV4Data.shippingIds.forEach(id => {
        if (parsedOrders[id] && parsedOrders[id].status === 'pending') {
          parsedOrders[id].status = 'shipped';
          if (parsedColumns.pending) {
            parsedColumns.pending.orderIds = parsedColumns.pending.orderIds.filter(oId => oId !== id);
          }
          if (parsedColumns.shipped) {
            parsedColumns.shipped.orderIds = [id, ...parsedColumns.shipped.orderIds];
          }
        }
      });
      
      setTimeout(() => localStorage.setItem('crm_orders_migrated_v4', 'true'), 100);
    }

    // Always sync titles and colors from code so they update if we change them
    Object.keys(parsedColumns).forEach(colId => {
      if (initialColumns[colId]) {
        parsedColumns[colId].title = initialColumns[colId].title;
        parsedColumns[colId].color = initialColumns[colId].color;
      }
    });

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
    localStorage.setItem('crm_clients', JSON.stringify(clients));
  }, [orders, columns, tasks, products, transactions, archivedOrders, clients]);

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

  // ---- Clients Functions ----
  const addClient = (clientData) => {
    const newClient = {
      id: uuidv4(),
      ...clientData,
    };
    setClients(prev => [...prev, newClient]);
  };

  const updateClient = (clientId, updatedFields) => {
    setClients(prev => prev.map(c => 
      c.id === clientId ? { ...c, ...updatedFields } : c
    ));
  };

  const deleteClient = (clientId) => {
    setClients(prev => prev.filter(c => c.id !== clientId));
  };
  // -------------------------

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
        ...prev.pending,
        orderIds: [id, ...prev.pending.orderIds]
      };
      return { ...prev, pending: newColumn };
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

    if (destinationColId === 'designing' && sourceColId !== 'designing') {
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
      orders, columns, columnOrder, archivedOrders,
      tasks, addTask, updateTaskStatus, deleteTask,
      clients, addClient, updateClient, deleteClient, 
      products, addProduct, updateProduct,
      transactions, addTransaction, deleteTransaction,
      addOrder, updateOrder, deleteOrder, moveOrder, addNote,
      archivedOrders, archiveOrder
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);
