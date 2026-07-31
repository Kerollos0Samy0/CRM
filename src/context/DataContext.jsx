import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './AuthContext';
import { db } from '../firebase';
import {
  doc, onSnapshot, setDoc, getDoc
} from 'firebase/firestore';
import initialProducts from '../data/products.json';
import initialClients from '../data/clients.json';
import migratedData from '../data/migrated_orders.json';
import migrationV4Data from '../data/migration_v4_data.json';
import chatClients from '../data/clients_from_chat.json';
import excelOrders from '../data/orders_from_excel.json';

const DataContext = createContext();

const initialColumns = {
  pending:   { id: 'pending',   title: 'مطلوبة ولسه متحضرتش', orderIds: [], color: '#48bb78' },
  designing: { id: 'designing', title: 'جاري التصميم',          orderIds: [], color: '#f6ad55' },
  printing:  { id: 'printing',  title: 'في الطباعة',            orderIds: [], color: '#f6e05e' },
  received:  { id: 'received',  title: 'في الكنيسة',            orderIds: [], color: '#38b2ac' },
  ready:     { id: 'ready',     title: 'جاهزة وعايزة تتشحن',   orderIds: [], color: '#ed8936' },
  shipped:   { id: 'shipped',   title: 'في شركة الشحن',         orderIds: [], color: '#4299e1' },
  arrived:   { id: 'arrived',   title: 'أوردرات وصلت بنجاح',   orderIds: [], color: '#9f7aea' },
};

// ── helpers ─────────────────────────────────────────────────────────────────
function normalizeOrder(o) {
  if (!o.items) {
    o.items = o.workshop ? [{ workshop: o.workshop, quantity: o.quantity }] : [];
  }
  if (o.clientName && !o.name)       o.name        = o.clientName;
  if (o.phone !== undefined && !o.mobile) o.mobile  = String(o.phone);
  if (o.government && !o.governorate) o.governorate = o.government;
  if (typeof o.notes === 'string') { o.orderNotes = o.notes; o.notes = []; }
  if (!Array.isArray(o.notes)) o.notes = [];
  if (o.items) {
    let total = 0;
    o.items.forEach(item => {
      if (item.name && !item.workshop)       item.workshop  = item.name;
      if (item.sellPrice !== undefined && item.unitPrice === undefined) item.unitPrice = item.sellPrice;
      total += (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0);
    });
    if (o.totalAmount === undefined) o.totalAmount = total;
  }
  if (o.remainingAmount === undefined)
    o.remainingAmount = Math.max(0, (o.totalAmount || 0) - (Number(o.discount) || 0) - (Number(o.paidAmount) || 0));
  return o;
}

// Run all data-migrations that were previously done against localStorage.
// Returns { orders, columns, archivedOrders } ready to save to Firestore.
function applyMigrations(rawData) {
  let orders = { ...(rawData.orders || {}) };
  let columns = rawData.columns || { ...initialColumns };
  let archivedOrders = rawData.archivedOrders || [];
  let migratedV2 = rawData.migratedV2 || false;
  let migratedV3 = rawData.migratedV3 || false;
  let migratedV4 = rawData.migratedV4 || false;
  let migratedV5 = rawData.migratedV5 || false;

  // normalise every order
  Object.keys(orders).forEach(id => { orders[id] = normalizeOrder({ ...orders[id] }); });
  archivedOrders = archivedOrders.map(o => normalizeOrder({ ...o }));

  // v2 – merge Google-Sheets import
  if (!migratedV2) {
    orders = { ...orders, ...migratedData.orders };
    Object.keys(migratedData.columns).forEach(colId => {
      if (!columns[colId]) columns[colId] = { ...initialColumns[colId] };
      columns[colId].orderIds = [...new Set([...columns[colId].orderIds, ...migratedData.columns[colId].orderIds])];
    });
    archivedOrders = [...archivedOrders, ...migratedData.archivedOrders];
    migratedV2 = true;
  }

  // v3 – rename columns
  if (!migratedV3) {
    const colMap = { new_order: 'pending', design: 'designing', printing: 'printing', church: 'ready', shipping: 'shipped', delivered: 'arrived' };
    const newCols = JSON.parse(JSON.stringify(initialColumns));
    Object.keys(columns).forEach(oldId => {
      const newId = colMap[oldId] || oldId;
      if (newCols[newId] && columns[oldId].orderIds)
        newCols[newId].orderIds = [...new Set([...newCols[newId].orderIds, ...columns[oldId].orderIds])];
    });
    Object.keys(orders).forEach(id => { if (colMap[orders[id].status]) orders[id].status = colMap[orders[id].status]; });
    columns = newCols;
    migratedV3 = true;
  }

  // v4 – archive/ship old orders
  if (!migratedV4) {
    migrationV4Data.archiveIds.forEach(id => {
      if (orders[id] && orders[id].status === 'pending') {
        archivedOrders.unshift({ ...orders[id], archivedAt: new Date().toISOString() });
        if (columns.pending) columns.pending.orderIds = columns.pending.orderIds.filter(x => x !== id);
        delete orders[id];
      }
    });
    migrationV4Data.shippingIds.forEach(id => {
      if (orders[id] && orders[id].status === 'pending') {
        orders[id].status = 'shipped';
        if (columns.pending) columns.pending.orderIds = columns.pending.orderIds.filter(x => x !== id);
        if (columns.shipped) columns.shipped.orderIds = [id, ...columns.shipped.orderIds];
      }
    });
    migratedV4 = true;
  }

  // v5 – Import orders from Excel
  if (!migratedV5) {
    if (!columns.pending) columns.pending = { id: 'pending', title: 'مطلوبة ولسه متحضرتش', orderIds: [], color: '#48bb78' };
    
    Object.values(excelOrders).forEach(newOrder => {
      // Check if it already exists by name/church to prevent duplicates if ran twice somehow
      const exists = Object.values(orders).find(o => o.name === newOrder.name && o.church === newOrder.church);
      if (!exists) {
        orders[newOrder.id] = newOrder;
        columns.pending.orderIds.unshift(newOrder.id);
      }
    });
    migratedV5 = true;
  }

  // always sync column titles/colors from code
  Object.keys(columns).forEach(colId => {
    if (initialColumns[colId]) {
      columns[colId].title = initialColumns[colId].title;
      columns[colId].color = initialColumns[colId].color;
    }
  });

  return { orders, columns, archivedOrders, migratedV2, migratedV3, migratedV4, migratedV5 };
}

function mergeClientsWithChat(currentClients) {
  const merged = [...currentClients];
  chatClients.forEach(chatClient => {
    const existing = merged.find(c =>
      (c.name && chatClient.name && c.name.trim() === chatClient.name.trim()) ||
      (c.phone && chatClient.phone && c.phone === chatClient.phone)
    );
    if (existing) {
      if (!existing.phone       && chatClient.phone)       existing.phone       = chatClient.phone;
      if (!existing.church      && chatClient.church)      existing.church      = chatClient.church;
      if (!existing.address     && chatClient.address)     existing.address     = chatClient.address;
      if (!existing.governorate && chatClient.governorate) existing.governorate = chatClient.governorate;
    } else {
      merged.push({ id: uuidv4(), ...chatClient });
    }
  });
  return merged;
}

// ── Provider ────────────────────────────────────────────────────────────────
export const DataProvider = ({ children }) => {
  const { currentUser } = useAuth();

  const [loading,        setLoading]        = useState(true);
  const [orders,         setOrders]         = useState({});
  const [columns,        setColumns]        = useState(initialColumns);
  const [columnOrder]                       = useState(['pending','designing','printing','received','ready','shipped','arrived']);
  const [tasks,          setTasks]          = useState({});
  const [archivedOrders, setArchivedOrders] = useState([]);
  const [clients,        setClients]        = useState([]);
  const [products,       setProducts]       = useState([]);
  const [transactions,   setTransactions]   = useState([]);
  const [supplies,       setSupplies]       = useState([]); // New state for Supply Log

  // track whether initial load from Firestore is done
  const initialised = useRef(false);
  // debounce timer refs
  const saveTimer = useRef(null);

  // ── FIRESTORE DOCUMENT REFS ───────────────────────────────────────────────
  const mainRef     = doc(db, 'crm', 'main');       // orders + columns + archived
  const tasksRef    = doc(db, 'crm', 'tasks');
  const clientsRef  = doc(db, 'crm', 'clients');
  const productsRef = doc(db, 'crm', 'products');
  const ledgerRef   = doc(db, 'crm', 'ledger');
  const suppliesRef = doc(db, 'crm', 'supplies');

  // ── helper: wrap any promise with a timeout ──────────────────────────────
  function withTimeout(promise, ms = 5000) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('firestore_timeout')), ms))
    ]);
  }

  // ── helper: load everything from localStorage ─────────────────────────────
  function loadFromLocalStorage() {
    try {
      const lsOrders   = localStorage.getItem('crm_orders');
      const lsCols     = localStorage.getItem('crm_columns');
      const lsArchived = localStorage.getItem('crm_archived_orders');
      const lsTasks    = localStorage.getItem('crm_tasks');
      const lsClients  = localStorage.getItem('crm_clients');
      const lsProducts = localStorage.getItem('crm_products');
      const lsTx       = localStorage.getItem('crm_transactions');
      const lsSupplies = localStorage.getItem('crm_supplies');
      const raw = {
        orders:         lsOrders   ? JSON.parse(lsOrders)   : {},
        columns:        lsCols     ? JSON.parse(lsCols)      : { ...initialColumns },
        archivedOrders: lsArchived ? JSON.parse(lsArchived)  : [],
      };
      const migrated = applyMigrations(raw);
      setOrders(migrated.orders);
      setColumns(migrated.columns);
      setArchivedOrders(migrated.archivedOrders);
      setTasks(lsTasks    ? JSON.parse(lsTasks)    : {});
      setClients(lsClients  ? JSON.parse(lsClients)  : initialClients);
      setProducts(lsProducts ? JSON.parse(lsProducts) : initialProducts);
      setTransactions(lsTx ? JSON.parse(lsTx) : []);
      setSupplies(lsSupplies ? JSON.parse(lsSupplies) : []);
      console.warn('⚠️ Using localStorage (Firestore unavailable)');
    } catch (e) {
      console.error('Failed to load from localStorage:', e);
      // Fallback to empty/initial state
      setOrders({});
      setColumns(initialColumns);
      setArchivedOrders([]);
      setTasks({});
      setClients(initialClients);
      setProducts(initialProducts);
      setTransactions([]);
      setSupplies([]);
    }
  }

  // ── LOAD FROM FIRESTORE (once on mount) ──────────────────────────────────
  useEffect(() => {
    let unsubMain, unsubTasks, unsubClients, unsubProducts, unsubLedger, unsubSupplies;

    async function bootstrap() {
      try {
        // Each getDoc has a 5-second timeout — if it hangs, throws 'firestore_timeout'
        const [mainSnap, tasksSnap, clientsSnap, productsSnap, ledgerSnap, suppliesSnap] = await withTimeout(
          Promise.all([
            getDoc(mainRef),
            getDoc(tasksRef),
            getDoc(clientsRef),
            getDoc(productsRef),
            getDoc(ledgerRef),
            getDoc(suppliesRef),
          ]),
          5000
        );

        // --- MAIN ---
        if (mainSnap.exists()) {
          let data = mainSnap.data();
          
          // Emergency Restore: If Firebase is empty but local storage has data, restore it
          const lsOrdersRaw = localStorage.getItem('crm_orders');
          if (lsOrdersRaw && Object.keys(data.orders || {}).length === 0) {
              const parsedLsOrders = JSON.parse(lsOrdersRaw);
              if (Object.keys(parsedLsOrders).length > 0) {
                  const lsCols = localStorage.getItem('crm_columns');
                  const lsArchived = localStorage.getItem('crm_archived_orders');
                  data = {
                      orders: parsedLsOrders,
                      columns: lsCols ? JSON.parse(lsCols) : { ...initialColumns },
                      archivedOrders: lsArchived ? JSON.parse(lsArchived) : []
                  };
                  console.warn('Restored MAIN data from localStorage to Firebase');
              }
          }

          const migrated = applyMigrations(data);
          setOrders(migrated.orders);
          setColumns(migrated.columns);
          setArchivedOrders(migrated.archivedOrders);
          // Force save to Firebase if we migrated or restored
          if (!data.migratedV2 || !data.migratedV3 || !data.migratedV4 || !data.migratedV5 || Object.keys(data.orders || {}).length === 0)
            setDoc(mainRef, migrated, { merge: true }).catch(console.error);
        } else {
          const lsOrders   = localStorage.getItem('crm_orders');
          const lsCols     = localStorage.getItem('crm_columns');
          const lsArchived = localStorage.getItem('crm_archived_orders');
          const raw = {
            orders:         lsOrders   ? JSON.parse(lsOrders)   : {},
            columns:        lsCols     ? JSON.parse(lsCols)      : { ...initialColumns },
            archivedOrders: lsArchived ? JSON.parse(lsArchived)  : [],
          };
          const migrated = applyMigrations(raw);
          setDoc(mainRef, migrated).catch(console.error);
          setOrders(migrated.orders);
          setColumns(migrated.columns);
          setArchivedOrders(migrated.archivedOrders);
        }

        // --- TASKS ---
        if (tasksSnap.exists()) {
          let tData = tasksSnap.data().tasks || {};
          const lsTasksRaw = localStorage.getItem('crm_tasks');
          if (lsTasksRaw && Object.keys(tData).length === 0) {
              const parsedLsTasks = JSON.parse(lsTasksRaw);
              if (Object.keys(parsedLsTasks).length > 0) {
                  tData = parsedLsTasks;
                  setDoc(tasksRef, { tasks: tData }).catch(console.error);
                  console.warn('Restored TASKS from localStorage');
              }
          }
          setTasks(tData);
        } else {
          const lsTasks = localStorage.getItem('crm_tasks');
          const t = lsTasks ? JSON.parse(lsTasks) : {};
          setDoc(tasksRef, { tasks: t }).catch(console.error);
          setTasks(t);
        }

        // --- CLIENTS ---
        if (clientsSnap.exists()) {
          let cData = clientsSnap.data().clients || [];
          const lsClientsRaw = localStorage.getItem('crm_clients');
          if (lsClientsRaw && cData.length === 0) {
              const parsedLsClients = JSON.parse(lsClientsRaw);
              if (parsedLsClients.length > 0) {
                  cData = parsedLsClients;
                  setDoc(clientsRef, { clients: cData, chatMergedV1: true }).catch(console.error);
                  console.warn('Restored CLIENTS from localStorage');
              }
          }
          setClients(cData);
        } else {
          const lsClients = localStorage.getItem('crm_clients');
          let c = lsClients ? JSON.parse(lsClients) : initialClients;
          c = mergeClientsWithChat(c);
          setDoc(clientsRef, { clients: c, chatMergedV1: true }).catch(console.error);
          setClients(c);
        }

        // --- PRODUCTS ---
        if (productsSnap.exists()) {
          let pData = productsSnap.data().products || [];
          const lsProductsRaw = localStorage.getItem('crm_products');
          if (lsProductsRaw && pData.length === 0) {
              const parsedLsProducts = JSON.parse(lsProductsRaw);
              if (parsedLsProducts.length > 0) {
                  pData = parsedLsProducts;
                  setDoc(productsRef, { products: pData }).catch(console.error);
                  console.warn('Restored PRODUCTS from localStorage');
              }
          }
          setProducts(pData);
        } else {
          const lsProducts = localStorage.getItem('crm_products');
          const p = lsProducts ? JSON.parse(lsProducts) : initialProducts;
          setDoc(productsRef, { products: p }).catch(console.error);
          setProducts(p);
        }

        // --- LEDGER ---
        if (ledgerSnap.exists()) {
          let txData = ledgerSnap.data().transactions || [];
          const lsTxRaw = localStorage.getItem('crm_transactions');
          if (lsTxRaw && txData.length === 0) {
              const parsedLsTx = JSON.parse(lsTxRaw);
              if (parsedLsTx.length > 0) {
                  txData = parsedLsTx;
                  setDoc(ledgerRef, { transactions: txData }).catch(console.error);
                  console.warn('Restored LEDGER from localStorage');
              }
          }
          setTransactions(txData);
        } else {
          const lsTx = localStorage.getItem('crm_transactions');
          const tx = lsTx ? JSON.parse(lsTx) : [];
          setDoc(ledgerRef, { transactions: tx }).catch(console.error);
          setTransactions(tx);
        }

        // --- SUPPLIES ---
        if (suppliesSnap.exists()) {
          let sData = suppliesSnap.data().supplies || [];
          const lsSuppliesRaw = localStorage.getItem('crm_supplies');
          if (lsSuppliesRaw && sData.length === 0) {
              const parsedLsSupplies = JSON.parse(lsSuppliesRaw);
              if (parsedLsSupplies.length > 0) {
                  sData = parsedLsSupplies;
                  setDoc(suppliesRef, { supplies: sData }).catch(console.error);
                  console.warn('Restored SUPPLIES from localStorage');
              }
          }
          setSupplies(sData);
        } else {
          const lsSupplies = localStorage.getItem('crm_supplies');
          const s = lsSupplies ? JSON.parse(lsSupplies) : [];
          setDoc(suppliesRef, { supplies: s }).catch(console.error);
          setSupplies(s);
        }

        console.log('✅ Loaded from Firestore');

        // ── REAL-TIME LISTENERS ──────────────────────────────────────────
        unsubMain = onSnapshot(mainRef, snap => {
          if (!snap.exists() || !initialised.current) return;
          const d = snap.data();
          setOrders(d.orders || {});
          setColumns(d.columns || initialColumns);
          setArchivedOrders(d.archivedOrders || []);
        });
        unsubTasks    = onSnapshot(tasksRef,    snap => { if (snap.exists() && initialised.current) setTasks(snap.data().tasks || {}); });
        unsubClients  = onSnapshot(clientsRef,  snap => { if (snap.exists() && initialised.current) setClients(snap.data().clients || []); });
        unsubProducts = onSnapshot(productsRef, snap => { if (snap.exists() && initialised.current) setProducts(snap.data().products || []); });
        unsubLedger   = onSnapshot(ledgerRef,   snap => { if (snap.exists() && initialised.current) setTransactions(snap.data().transactions || []); });
        unsubSupplies = onSnapshot(suppliesRef, snap => { if (snap.exists() && initialised.current) setSupplies(snap.data().supplies || []); });

      } catch (err) {
        console.error('Firestore unavailable, using localStorage:', err.message);
        if (!initialised.current) loadFromLocalStorage();
      } finally {
        initialised.current = true;
        setLoading(false);
      }
    }

    bootstrap();

    return () => {
      unsubMain?.();
      unsubTasks?.();
      unsubClients?.();
      unsubProducts?.();
      unsubLedger?.();
      unsubSupplies?.();
    };
  }, []); // eslint-disable-line

  // ── SAVE TO FIRESTORE (debounced, only after first load) ─────────────────
  useEffect(() => {
    if (!initialised.current) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setDoc(mainRef, { orders, columns, archivedOrders }, { merge: false }).catch(console.error);
    }, 800);
  }, [orders, columns, archivedOrders]); // eslint-disable-line

  useEffect(() => { if (initialised.current) setDoc(tasksRef,    { tasks },        { merge: false }).catch(console.error); }, [tasks]);       // eslint-disable-line
  useEffect(() => { if (initialised.current) setDoc(clientsRef,  { clients },      { merge: false }).catch(console.error); }, [clients]);     // eslint-disable-line
  useEffect(() => { if (initialised.current) setDoc(productsRef, { products },     { merge: false }).catch(console.error); }, [products]);    // eslint-disable-line
  useEffect(() => { if (initialised.current) setDoc(ledgerRef,   { transactions }, { merge: false }).catch(console.error); }, [transactions]);// eslint-disable-line
  useEffect(() => { if (initialised.current) setDoc(suppliesRef, { supplies },     { merge: false }).catch(console.error); }, [supplies]);    // eslint-disable-line

  // ── TASKS ────────────────────────────────────────────────────────────────
  const addTask = (taskData) => {
    const id = uuidv4();
    const newTask = { id, ...taskData, assignerId: currentUser.id, status: 'todo', createdAt: new Date().toISOString() };
    setTasks(prev => ({ ...prev, [id]: newTask }));
  };
  const updateTaskStatus = (taskId, newStatus) => setTasks(prev => ({ ...prev, [taskId]: { ...prev[taskId], status: newStatus } }));
  const deleteTask       = (taskId) => { const t = { ...tasks }; delete t[taskId]; setTasks(t); };

  // ── CLIENTS ──────────────────────────────────────────────────────────────
  const addClient    = (data)            => setClients(prev => [...prev, { id: uuidv4(), ...data }]);
  const updateClient = (id, fields)      => setClients(prev => prev.map(c => c.id === id ? { ...c, ...fields } : c));
  const deleteClient = (id)              => setClients(prev => prev.filter(c => c.id !== id));

  // ── PRODUCTS & SUPPLIES ──────────────────────────────────────────────────
  const addProduct    = (data)       => setProducts(prev => [...prev, { id: uuidv4(), ...data, stock: Number(data.stock)||0, buyPrice: Number(data.buyPrice)||0, sellPrice: Number(data.sellPrice)||0 }]);
  const updateProduct = (id, fields) => setProducts(prev => prev.map(p => p.id === id ? { ...p, ...fields } : p));
  const addSupply = (productId, quantity, details) => {
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        return { ...p, stock: (Number(p.stock) || 0) + Number(quantity) };
      }
      return p;
    }));
    setSupplies(prev => [{
      id: uuidv4(),
      productId,
      productName: details.productName || 'Unknown Product',
      quantity: Number(quantity),
      date: new Date().toISOString(),
      suppliedBy: currentUser.id,
      supplierName: currentUser.name || currentUser.id,
      notes: details.notes || ''
    }, ...prev]);
  };

  // ── LEDGER ───────────────────────────────────────────────────────────────
  const addTransaction    = (data) => setTransactions(prev => [...prev, { id: uuidv4(), ...data, date: new Date().toISOString(), amount: Number(data.amount)||0 }]);
  const deleteTransaction = (id)   => setTransactions(prev => prev.filter(t => t.id !== id));

  // ── ORDERS ───────────────────────────────────────────────────────────────
  const addOrder = (orderData) => {
    const id = uuidv4();
    const newOrder = { id, ...orderData, createdBy: currentUser.id, createdAt: new Date().toISOString(), notes: [] };
    setOrders(prev => ({ ...prev, [id]: newOrder }));
    setColumns(prev => ({ ...prev, pending: { ...prev.pending, orderIds: [id, ...prev.pending.orderIds] } }));
    if (orderData.items?.length > 0) {
      setProducts(prev => {
        let np = [...prev];
        orderData.items.forEach(item => {
          const idx = np.findIndex(p => p.name === item.workshop);
          if (idx !== -1 && item.quantity) np[idx] = { ...np[idx], stock: np[idx].stock - Number(item.quantity) };
        });
        return np;
      });
    }
  };

  const updateOrder = (id, updatedData) => setOrders(prev => ({ ...prev, [id]: { ...prev[id], ...updatedData } }));

  const addNote = (orderId, text) => {
    setOrders(prev => {
      const order = prev[orderId];
      const newNote = { id: uuidv4(), text, createdBy: currentUser.name, timestamp: new Date().toISOString() };
      return { ...prev, [orderId]: { ...order, notes: [...order.notes, newNote] } };
    });
  };

  const deleteOrder = (orderId) => {
    const orderToDelete = orders[orderId];
    if (orderToDelete?.items?.length > 0) {
      setProducts(prev => {
        let np = [...prev];
        orderToDelete.items.forEach(item => {
          const idx = np.findIndex(p => p.name === item.workshop);
          if (idx !== -1 && item.quantity) np[idx] = { ...np[idx], stock: np[idx].stock + Number(item.quantity) };
        });
        return np;
      });
    }
    const newOrders = { ...orders }; delete newOrders[orderId]; setOrders(newOrders);
    setColumns(prev => {
      const nc = { ...prev };
      for (const colId in nc) nc[colId] = { ...nc[colId], orderIds: nc[colId].orderIds.filter(id => id !== orderId) };
      return nc;
    });
  };

  const moveOrder = (sourceColId, destinationColId, sourceIndex, destinationIndex, orderId) => {
    const start  = columns[sourceColId];
    const finish = columns[destinationColId];
    if (start === finish) {
      const ids = Array.from(start.orderIds);
      ids.splice(sourceIndex, 1); ids.splice(destinationIndex, 0, orderId);
      setColumns(prev => ({ ...prev, [start.id]: { ...start, orderIds: ids } }));
      return;
    }
    const startIds = Array.from(start.orderIds);  startIds.splice(sourceIndex, 1);
    const finishIds = Array.from(finish.orderIds); finishIds.splice(destinationIndex, 0, orderId);
    if (destinationColId === 'designing' && sourceColId !== 'designing') {
      const movedOrder = orders[orderId];
      if (movedOrder) addTask({ title: `تصميم أوردر: ${movedOrder.name}`, description: `برجاء عمل التصميم الخاص بأوردر العميل (${movedOrder.name}) - كنيسة: ${movedOrder.church}`, assigneeId: 'kirolos' });
    }
    setColumns(prev => ({ ...prev, [start.id]: { ...start, orderIds: startIds }, [finish.id]: { ...finish, orderIds: finishIds } }));
  };

  const archiveOrder = (orderId) => {
    const orderToArchive = orders[orderId];
    if (!orderToArchive) return;
    setArchivedOrders(prev => [{ ...orderToArchive, archivedAt: new Date().toISOString() }, ...prev]);
    const newOrders = { ...orders }; delete newOrders[orderId]; setOrders(newOrders);
    setColumns(prev => {
      const nc = { ...prev };
      for (const colId in nc) nc[colId] = { ...nc[colId], orderIds: nc[colId].orderIds.filter(id => id !== orderId) };
      return nc;
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', border: '4px solid #e2e8f0', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ fontFamily: 'Cairo, sans-serif', color: '#475569', fontSize: '1rem' }}>جاري تحميل البيانات...</p>
      </div>
    );
  }

  return (
    <DataContext.Provider value={{
      orders, columns, columnOrder, archivedOrders,
      tasks, addTask, updateTaskStatus, deleteTask,
      clients, addClient, updateClient, deleteClient,
      products, addProduct, updateProduct,
      transactions, addTransaction, deleteTransaction,
      supplies, addSupply,
      addOrder, updateOrder, deleteOrder, moveOrder, addNote, archiveOrder,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);
