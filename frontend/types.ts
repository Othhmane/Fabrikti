
/**
 * DÉFINITIONS DES TYPES & ENTITÉS MÉTIIER
 * --------------------------------------
 * Ces interfaces doivent correspondre aux 'Entities' de TypeORM/Sequelize
 * et aux 'DTOs' (Data Transfer Objects) de votre backend NestJS.
 */

export enum OrderStatus {
  EN_ATTENTE = 'EN_ATTENTE',
  EN_PREPARATION = 'EN_PREPARATION',
  EN_STOCK = 'EN_STOCK',
  LIVREE = 'LIVREE',
  ANNULEE = 'ANNULEE'
}

export enum PaymentStatus {
  PAYEE = 'PAYEE',
  PARTIEL = 'PARTIEL',
  NON_PAYEE = 'NON_PAYEE',
  EN_DETTE = 'EN_DETTE',
  EN_PLUS = 'EN_PLUS'
}

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

/** Interface de l'utilisateur authentifié */
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
}

/** Structure de réponse après login (JWT inclus) */
export interface AuthResponse {
  user: User;
  token: string;
}

/** Entité Client */
export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  providedProducts: string[];
}

/** Entité Fournisseur */
export interface Supplier {
  id: string;
  name: string;
  contact: string;
  rawMaterials: string[];
}

/** Entité Matière Première */
export interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  stock: number;
  paymentStatus: PaymentStatus;
  pricePerUnit: number;
  supplierId?: string;
}

/** Structure d'une maintenance machine */
export interface Intervention {
  id: string;
  date: string;
  description: string;
  cost?: number;
}

/** Entité Machine */
export interface Machine {
  id: string;
  name: string;
  status: 'operational' | 'maintenance' | 'broken';
  lastMaintenance: string;
  interventions: Intervention[];
}

/** Entité Outil de découpe */
export interface DieCutter {
  id: string;
  reference: string;
  size: string;
  material: string;
}

/** Définition de la consommation pour un produit */
export interface ProductConsumption {
  materialId: string;
  quantity: number;
}

/** Entité Produit (Nomenclature technique) */
export interface Product {
  id: string;
  name: string;
  category: 'Semelle' | 'Semelle de propreté' | 'Talon' | 'Accessoire' | 'Autre';
  unit: string;
  pricePerUnit: number;
  photoUrl?: string;
  consumptionFormula: ProductConsumption[];
}

/** Ligne de commande */
export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalItemPrice: number;
}

/** Entité Commande (Order) */
export interface Order {
  id: string;
  clientId: string;
  items: OrderItem[];
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalPrice: number;
  paidAmount: number;
  orderDate: string;
  updatedAt?: string; // Ajouté pour le suivi des modifs
  deliveryDate?: string;
  notes?: string;
}

/** Entité Transaction (Flux de trésorerie) */
export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string;
  status: PaymentStatus;
  orderId?: string;
  materialId?: string;
  clientId?: string;
  supplierId?: string;
}

/** Statistiques globales consolidées */
export interface DashboardStats {
  totalRevenue: number;
  activeOrders: number;
  lowStockItems: number;
  monthlyGrowth: number;
}
