
import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Truck, 
  Package, 
  Layers, 
  ShoppingCart, 
  ArrowLeftRight, 
  Palette,
  Settings,
  Scissors
} from 'lucide-react';

export const APP_ROUTES = {
  // DASHBOARD: '/',
  CLIENTS: '/clients',
  SUPPLIERS: '/suppliers',
  PRODUCTS: '/products',
  RAW_MATERIALS: '/materials',
  ORDERS: '/orders',
  TRANSACTIONS: '/transactions',
  THEME: '/theme',
  MACHINES: '/machines',
  DIECUTTERS: '/diecutters',
};

export const NAVIGATION_ITEMS = [
  //{ name: 'Dashboard', path: APP_ROUTES.DASHBOARD, icon: <LayoutDashboard size={20} /> },
   { name: 'Partenaires', path: APP_ROUTES.CLIENTS, icon: <Users size={20} /> },

  { name: 'Commandes', path: APP_ROUTES.ORDERS, icon: <ShoppingCart size={20} /> },
  { name: 'Transactions', path: APP_ROUTES.TRANSACTIONS, icon: <ArrowLeftRight size={20} /> },
  { name: 'Produits', path: APP_ROUTES.PRODUCTS, icon: <Package size={20} /> },
  { name: 'Matières Premières', path: APP_ROUTES.RAW_MATERIALS, icon: <Layers size={20} /> },
 // { name: 'Fournisseurs', path: APP_ROUTES.SUPPLIERS, icon: <Truck size={20} /> },
  { name: 'Emporte-pièces', path: APP_ROUTES.DIECUTTERS, icon: <Scissors size={20} /> },
  { name: 'Machines', path: APP_ROUTES.MACHINES, icon: <Settings size={20} /> },
  { name: 'Thème', path: APP_ROUTES.THEME, icon: <Palette size={20} /> },
];

export const THEME_COLORS = [
  { name: 'Default Blue', class: 'bg-blue-600', primary: 'blue' },
  { name: 'Industrial Grey', class: 'bg-slate-700', primary: 'slate' },
  { name: 'Success Green', class: 'bg-emerald-600', primary: 'emerald' },
  { name: 'Modern Indigo', class: 'bg-indigo-600', primary: 'indigo' },
];
