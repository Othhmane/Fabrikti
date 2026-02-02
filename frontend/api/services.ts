
import { 
  Client, Supplier, Product, RawMaterial, Order, 
  Transaction, DashboardStats, OrderStatus, PaymentStatus, 
  Machine, DieCutter, User, AuthResponse, TransactionType 
} from '../types';

/**
 * COUCHE DE PERSISTANCE MOCKÉE (SIMULATION BACKEND)
 * -----------------------------------------------
 * Cette couche simule le comportement d'une API REST réelle.
 * Pour brancher NestJS, remplacez les appels 'storage.read/write' 
 * par des appels 'apiClient.get/post/patch/delete'.
 */
const storage = {
  read: <T>(key: string, fallback: T): T => {
    const data = localStorage.getItem(`fabrikti_${key}`);
    return data ? JSON.parse(data) : fallback;
  },
  write: <T>(key: string, data: T) => {
    localStorage.setItem(`fabrikti_${key}`, JSON.stringify(data));
  },
  wait: (ms = 400) => new Promise(res => setTimeout(res, ms))
};

/**
 * INITIALISATION DES DONNÉES PAR DÉFAUT
 */
const initDB = () => {
  if (!localStorage.getItem('fabrikti_clients')) {
    storage.write('clients', [
      { id: 'c1', name: 'Kamel Lazio', email: 'lazio@lazio.com', phone: '0550805780', address: '12 Rue de la mouloudia froucha', providedProducts: [] },
      { id: 'c2', name: 'Mirano', email: 'mirano@mirano.fr', phone: '0450607080', address: 'ZA les montagnes, Annecy', providedProducts: [] },
      { id: 'c3', name: 'Lastrada', email: 'lastrada@lastrada.fr', phone: '0450607080', address: 'ZA les montagnes, Annecy', providedProducts: []},
    ]);
    storage.write('materials', [
      { id: 'm1', name: 'Synderme', unit: 'plaque', stock: 80, paymentStatus: PaymentStatus.PARTIEL, pricePerUnit: 18, supplierId: 's1' },
      { id: 'm2', name: 'Bartoli', unit: 'plaque', stock: 80, paymentStatus: PaymentStatus.PARTIEL, pricePerUnit: 18, supplierId: 's1' },
      { id: 'm3', name: 'Tucson', unit: 'plaque', stock: 150, paymentStatus: PaymentStatus.PAYEE, pricePerUnit: 25, supplierId: 's1' },
      { id: 'm4', name: 'Néo', unit: 'plaque', stock: 50, paymentStatus: PaymentStatus.PAYEE, pricePerUnit: 45, supplierId: 's1' },
      { id: 'm5', name: 'Cambrillon', unit: 'paire', stock: 80, paymentStatus: PaymentStatus.PARTIEL, pricePerUnit: 18, supplierId: 's1' },
      { id: 'm5', name: 'Colle première', unit: 'kg', stock: 80, paymentStatus: PaymentStatus.PARTIEL, pricePerUnit: 18, supplierId: 's1' },
      { id: 'm5', name: 'Colle semelle', unit: 'kg', stock: 80, paymentStatus: PaymentStatus.PARTIEL, pricePerUnit: 18, supplierId: 's1' },
    ]);
    storage.write('products', [
      { id: 'p1', name: 'ref1', category: 'Première doublé', unit: 'paire', pricePerUnit: 12.50, consumptionFormula: [{ materialId: 'm1', quantity: 0.05 }, { materialId: 'm2', quantity: 0.1 }] },
      { id: 'p2', name: 'ref2', category: 'Première tucson', unit: 'paire', pricePerUnit: 45.00, consumptionFormula: [{ materialId: 'm1', quantity: 0.08 }, { materialId: 'm3', quantity: 0.05 }] },
      { id: 'p3', name: 'ref3', category: 'Première synderme', unit: 'paire', pricePerUnit: 45.00, consumptionFormula: [{ materialId: 'm1', quantity: 0.08 }, { materialId: 'm3', quantity: 0.05 }] },
      { id: 'p4', name: 'ref4', category: 'Semelle néo', unit: 'paire', pricePerUnit: 45.00, consumptionFormula: [{ materialId: 'm1', quantity: 0.08 }, { materialId: 'm3', quantity: 0.05 }] },
      { id: 'p5', name: 'ref5', category: 'Semelle injecté', unit: 'paire', pricePerUnit: 45.00, consumptionFormula: [{ materialId: 'm1', quantity: 0.08 }, { materialId: 'm3', quantity: 0.05 }] },
    ]);
    storage.write('machines', [
      { id: 'mch1', name: 'Thermoformeuse T-1000', status: 'operational', lastMaintenance: '2024-02-15', interventions: [] },
      { id: 'mch2', name: 'Fraiseuse Numérique CNC', status: 'operational', lastMaintenance: '2024-01-10', interventions: [] }
    ]);
    storage.write('suppliers', [{ id: 's1', name: 'Hammoudi', contact: 'hammoudi@hammoudi.com', rawMaterials: ['m1', 'm2', 'm3'] }]);
    storage.write('suppliers', [{ id: 's1', name: 'Zinou', contact: 'zinou@zinou.com', rawMaterials: ['m1', 'm2', 'm3'] }]);
    storage.write('diecutters', [{ id: 'd1', reference: 'REF-S-SPORT-42', size: '42', material: 'Acier' }]);
    storage.write('transactions', []);
    storage.write('orders', []);
  }
};
initDB();

/**
 * FABRIKTI SERVICE : LE MOTEUR D'ÉCHANGES DE DONNÉES
 * -------------------------------------------------
 * Chaque méthode simule un endpoint NestJS. 
 * Les console.log() imitent les réponses du serveur (Statut HTTP).
 */
export const FabriktiService = {
  
  /** 
   * Authentification (Futur POST /auth/login)
   */
  login: async (identifier: string, password: string): Promise<AuthResponse> => {
    await storage.wait(600);
    console.log(`[AUTH][POST] /login -> 200 OK (Identifiant: ${identifier})`);
    const user: User = { id: 'u1', email: identifier, name: identifier.split('@')[0].toUpperCase(), role: 'admin' };
    return { user, token: 'mock-token-' + Date.now() };
  },

  /** 
   * KPIs Dashboard (Futur GET /analytics/dashboard)
   */
  getDashboardStats: async (): Promise<DashboardStats> => {
    await storage.wait();
    console.log(`[STATS][GET] /dashboard -> 200 OK`);
    const orders = storage.read<Order[]>('orders', []);
    const revenue = orders.reduce((sum, o) => sum + o.totalPrice, 0);
    return {
      totalRevenue: revenue || 0,
      activeOrders: orders.filter(o => o.status !== OrderStatus.LIVREE && o.status !== OrderStatus.ANNULEE).length,
      lowStockItems: storage.read<RawMaterial[]>('materials', []).filter(m => m.stock < 10).length,
      monthlyGrowth: 8.4
    };
  },

  /** 
   * Méthode générique de lecture (Futur GET /:key)
   */
  getAll: async <T>(key: string): Promise<T[]> => {
    await storage.wait();
    const data = storage.read<T[]>(key, []);
    console.log(`[${key.toUpperCase()}][GET] /${key} -> 200 OK (Elements: ${data.length})`);
    return data;
  },

  /** 
   * Méthode générique de sauvegarde (Futur POST /:key ou PATCH /:key/:id)
   */
  save: async <T extends { id?: string }>(key: string, item: T): Promise<void> => {
    await storage.wait();
    const items = storage.read<T[]>(key, []);
    
    // Suivi temporel pour les commandes (Audit Trail)
    if (key === 'orders') {
      (item as any).updatedAt = new Date().toISOString();
    }

    if (item.id) {
      console.log(`[${key.toUpperCase()}][PATCH] /${key}/${item.id} -> 200 OK`);
      const idx = items.findIndex(i => i.id === item.id);
      if (idx > -1) items[idx] = { ...items[idx], ...item };
    } else {
      const newId = Math.random().toString(36).substr(2, 9);
      console.log(`[${key.toUpperCase()}][POST] /${key} -> 201 Created (New ID: ${newId})`);
      items.push({ ...item, id: newId });
    }
    storage.write(key, items);
  },

  /** 
   * Méthode générique de suppression (Futur DELETE /:key/:id)
   */
  delete: async (key: string, id: string): Promise<void> => {
    await storage.wait();
    console.log(`[${key.toUpperCase()}][DELETE] /${key}/${id} -> 204 No Content`);
    const items = storage.read<any[]>(key, []);
    storage.write(key, items.filter(i => i.id !== id));
  },

  // --- WRAPPERS MÉTIER (Utilisés par TanStack Query dans les composants) ---

  getClients: () => FabriktiService.getAll<Client>('clients'),
  saveClient: (c: Partial<Client>) => FabriktiService.save('clients', c),
  deleteClient: (id: string) => FabriktiService.delete('clients', id),

  getProducts: () => FabriktiService.getAll<Product>('products'),
  saveProduct: (p: Partial<Product>) => FabriktiService.save('products', p),

  getOrders: () => FabriktiService.getAll<Order>('orders'),
  saveOrder: (o: Partial<Order>) => FabriktiService.save('orders', o),

  getRawMaterials: () => FabriktiService.getAll<RawMaterial>('materials'),
  saveRawMaterial: (m: Partial<RawMaterial>) => FabriktiService.save('materials', m),

  getSuppliers: () => FabriktiService.getAll<Supplier>('suppliers'),
  saveSupplier: (s: Partial<Supplier>) => FabriktiService.save('suppliers', s),

  getMachines: () => FabriktiService.getAll<Machine>('machines'),
  saveMachine: (m: Partial<Machine>) => FabriktiService.save('machines', m),

  getDieCutters: () => FabriktiService.getAll<DieCutter>('diecutters'),
  saveDieCutter: (d: Partial<DieCutter>) => FabriktiService.save('diecutters', d),

  getTransactions: () => FabriktiService.getAll<Transaction>('transactions'),
  
  /**
   * Logique spécifique aux Transactions (Gère l'impact sur le solde des commandes)
   */
  addTransaction: async (t: Partial<Transaction>): Promise<void> => {
    await storage.wait();
    const transactions = storage.read<Transaction[]>('transactions', []);
    const newId = Math.random().toString(36).substr(2, 9);
    
    console.log(`[TRANSACTION][POST] /transactions -> 201 Created (Amount: ${t.amount}€)`);
    
    const newTransaction = { 
      ...t, 
      id: newId, 
      date: t.date || new Date().toISOString(),
      status: t.status || PaymentStatus.PAYEE
    } as Transaction;
    transactions.push(newTransaction);
    storage.write('transactions', transactions);

    // Mise à jour automatique de la commande liée (Comme le ferait un Trigger SQL ou un service NestJS)
    if (t.orderId) {
      const orders = storage.read<Order[]>('orders', []);
      const orderIdx = orders.findIndex(o => o.id === t.orderId);
      if (orderIdx > -1) {
        const order = orders[orderIdx];
        order.paidAmount = (order.paidAmount || 0) + (t.type === TransactionType.INCOME ? t.amount : -t.amount);
        if (order.paidAmount >= order.totalPrice) order.paymentStatus = PaymentStatus.PAYEE;
        else if (order.paidAmount > 0) order.paymentStatus = PaymentStatus.PARTIEL;
        order.updatedAt = new Date().toISOString();
        orders[orderIdx] = order;
        storage.write('orders', orders);
        console.log(`[ORDER][AUTO-PATCH] /orders/${t.orderId} updated by transaction.`);
      }
    }
  }
};
