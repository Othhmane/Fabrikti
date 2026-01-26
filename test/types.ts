
export enum Language {
  FR = 'fr',
  AR = 'ar'
}

export enum ClientType {
  WHOLESALER = 'Grossiste',
  FACTORY = 'Usine',
  RESELLER = 'Revendeur'
}

export enum OrderStatus {
  PENDING = 'En attente',
  PRODUCTION = 'En production',
  READY = 'Prête',
  DELIVERED = 'Livrée',
  CANCELLED = 'Annulée',
  CREDIT = 'Crédit'
}

export interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  type: ClientType;
  status: 'active' | 'blocked';
  walletBalance: number;
}

export interface Transaction {
  id: string;
  clientId: string;
  date: string;
  type: 'debit' | 'credit';
  amount: number;
  description: string;
  orderId?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
}

export interface Order {
  id: string;
  clientId: string;
  date: string;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  paidAmount: number;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface Material {
  id: string;
  name: string;
  type: string;
  supplierId: string;
  stock: number;
  unit: string;
  minStock: number;
}

export interface Employee {
  id: string;
  name: string;
  position: string;
  salary: number;
  status: 'active' | 'suspended' | 'exited';
  hireDate: string;
}

export interface Payroll {
  id: string;
  employeeId: string;
  month: string;
  baseSalary: number;
  bonus: number;
  deduction: number;
  advances: number;
  netPay: number;
}
