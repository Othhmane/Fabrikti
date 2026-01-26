
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Language, Client, Transaction, Order, Material, Employee, ClientType, OrderStatus } from '../types';
import { translations } from '../translations';

interface AppContextType {
  language: Language;
  setLanguage: (l: Language) => void;
  t: (key: string) => string;
  clients: Client[];
  orders: Order[];
  materials: Material[];
  employees: Employee[];
  transactions: Transaction[];
  addClient: (c: Client) => void;
  addOrder: (o: Order) => void;
  addMaterial: (m: Material) => void;
  addEmployee: (e: Employee) => void;
  addTransaction: (t: Transaction) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

// Fix: children must be optional to satisfy TypeScript's check on the props object when used as a JSX wrapper
export const AppProvider = ({ children }: { children?: ReactNode }) => {
  const [language, setLanguage] = useState<Language>(Language.FR);
  
  // Initial States (Mock data)
  const [clients, setClients] = useState<Client[]>([
    { id: '1', name: 'Karim Alaoui', company: 'Chaussures du Nord', email: 'k.alaoui@cdn.ma', phone: '0661223344', address: 'Tanger', type: ClientType.FACTORY, status: 'active', walletBalance: -15000 },
    { id: '2', name: 'Zineb Salami', company: 'Accessoires Modernes', email: 'z.salami@acc.ma', phone: '0650001122', address: 'Casablanca', type: ClientType.RESELLER, status: 'active', walletBalance: 4500 }
  ]);
  const [materials, setMaterials] = useState<Material[]>([
    { id: 'm1', name: 'Cuir Tannerie 1', type: 'Matière Naturelle', supplierId: 's1', stock: 500, unit: 'm²', minStock: 50 },
    { id: 'm2', name: 'Semelle PVC Homme', type: 'Plastique', supplierId: 's2', stock: 1200, unit: 'pces', minStock: 200 }
  ]);
  const [employees, setEmployees] = useState<Employee[]>([
    { id: 'e1', name: 'Hamid Benani', position: 'Chef d\'Atelier', salary: 8500, status: 'active', hireDate: '2022-01-01' }
  ]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: 'tx-1', clientId: '1', date: '2023-01-01', type: 'debit', amount: 15000, description: 'Facturation Commande' }
  ]);

  const t = (key: string) => translations[language][key as keyof typeof translations['fr']] || key;

  const addClient = (c: Client) => setClients([c, ...clients]);
  const addOrder = (o: Order) => setOrders([o, ...orders]);
  const addMaterial = (m: Material) => setMaterials([m, ...materials]);
  const addEmployee = (e: Employee) => setEmployees([e, ...employees]);
  
  const addTransaction = (tx: Transaction) => {
    setTransactions(prev => [tx, ...prev]);
    setClients(prev => prev.map(c => 
      c.id === tx.clientId 
        ? { ...c, walletBalance: tx.type === 'credit' ? c.walletBalance + tx.amount : c.walletBalance - tx.amount } 
        : c
    ));
  };

  return (
    <AppContext.Provider value={{
      language, setLanguage, t,
      clients, orders, materials, employees, transactions,
      addClient, addOrder, addMaterial, addEmployee, addTransaction
    }}>
      {children}
    </AppContext.Provider>
  );
};
