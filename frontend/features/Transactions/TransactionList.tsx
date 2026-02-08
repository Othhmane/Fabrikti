// src/pages/transactions/TransactionList.tsx
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '../../api/supabase';
import {
  Plus, Search, X, Calendar, ArrowUpCircle, ArrowDownCircle,
  User, Truck, ShoppingBag, Layers, ExternalLink,
  Edit3, Trash2, AlertTriangle, Wallet, Filter, RotateCcw, ChevronDown, Receipt, FileText, Download, Clock, CheckCircle2, Database, Package
} from 'lucide-react';
import { TransactionType, PaymentStatus, Transaction, Order, OrderItem, OrderStatus, ProductConsumption } from '../../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type TransactionContext = 'ORDER' | 'MATERIAL' | 'CLIENT' | 'SUPPLIER' | 'OTHER';
type RowKind = 'TRANSACTION' | 'ORDER';

const CATEGORIES = {
  CLIENT: {
    label: 'Partenaire',
    icon: User,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    description: "Paiement d'un partenaire"
  },
  ORDER: {
    label: 'Commande',
    icon: ShoppingBag,
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    description: 'Transaction liée à une commande'
  },
  MATERIAL: {
    label: 'Matière première',
    icon: Layers,
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    description: 'Achat de matières premières'
  },
  OTHER: {
    label: 'Autre',
    icon: Truck,
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    description: 'Transaction diverse'
  },
} as const;

const DEFAULT_TRANSACTIONS: Partial<Transaction>[] = [];

const STATUS_LABELS: Record<string, { label: string, bgColor: string, textColor: string, icon: any }> = {
  [OrderStatus.EN_ATTENTE]: { label: 'En attente', bgColor: 'bg-slate-100', textColor: 'text-slate-700', icon: <Clock size={12}/> },
  [OrderStatus.EN_PREPARATION]: { label: 'Préparation', bgColor: 'bg-amber-100', textColor: 'text-amber-700', icon: <Package size={12}/> },
  [OrderStatus.EN_STOCK]: { label: 'En stock', bgColor: 'bg-indigo-100', textColor: 'text-indigo-700', icon: <Database size={12}/> },
  [OrderStatus.LIVREE]: { label: 'Livrée', bgColor: 'bg-emerald-100', textColor: 'text-emerald-700', icon: <CheckCircle2 size={12}/> },
  [OrderStatus.ANNULEE]: { label: 'Annulée', bgColor: 'bg-rose-100', textColor: 'text-rose-700', icon: <AlertTriangle size={12}/> },
};

const safeDateIso = (d?: string | null) => {
  if (!d) return new Date().toISOString();
  try {
    const parsed = new Date(d);
    if (isNaN(parsed.getTime())) return new Date().toISOString();
    return parsed.toISOString();
  } catch {
    return new Date().toISOString();
  }
};

export const TransactionList: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // order details
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);
  const [isOrderLoading, setIsOrderLoading] = useState(false);

  // filters / form
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [filterCategory, setFilterCategory] = useState<'all' | TransactionContext>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | PaymentStatus>('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterMinAmount, setFilterMinAmount] = useState('');
  const [filterMaxAmount, setFilterMaxAmount] = useState('');
  const [filterSource, setFilterSource] = useState<'all' | 'transaction' | 'order'>('all');

  const [formData, setFormData] = useState({
    type: TransactionType.INCOME,
    amount: '',
    description: '',
    category: '' as TransactionContext | '',
    date: new Date().toISOString().split('T')[0],
    tiersId: '',
    paymentMethod: 'Virement bancaire',
    reference: '',
    notes: '',
  });

  // --- Fetch transactions ---
  const fetchTransactions = async (): Promise<Transaction[]> => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });
    if (error) {
      console.error('fetchTransactions error', error);
      return [];
    }
    return (data as Transaction[]) || [];
  };

  const { data: fetchedTransactions = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: fetchTransactions,
  });

  const transactions = useMemo(() => {
    if (!fetchedTransactions || fetchedTransactions.length === 0) return (DEFAULT_TRANSACTIONS as Transaction[]);
    return fetchedTransactions;
  }, [fetchedTransactions]);

  // --- Fetch dependencies (clients, orders, suppliers, materials) ---
  const fetchOrders = async () => {
    const { data, error } = await supabase.from('orders').select('*');
    if (error) {
      console.error('fetchOrders', error);
      return [];
    }
    return data || [];
  };
  const fetchClients = async () => {
    const { data, error } = await supabase.from('clients').select('*');
    if (error) {
      console.error('fetchClients', error);
      return [];
    }
    return data || [];
  };
  const fetchSuppliers = async () => {
    const { data, error } = await supabase.from('clients').select('*').eq('is_supplier', true);
    if (error) {
      console.error('fetchSuppliers', error);
      return [];
    }
    return data || [];
  };
  const fetchMaterials = async () => {
    const { data, error } = await supabase.from('materials').select('*');
    if (error) {
      console.error('fetchMaterials', error);
      return [];
    }
    return (data || []).map((m: any) => ({
      ...m,
      pricePerUnit: Number(m.price_per_unit ?? m.pricePerUnit ?? 0),
      stock: Number(m.stock ?? 0),
    }));
  };
  const fetchProducts = async () => {
    const { data: productsData, error } = await supabase.from('products').select('*');
    if (error) {
      console.error('fetchProducts', error);
      return [];
    }
    const { data: pcData, error: pcErr } = await supabase.from('product_consumption').select('*');
    if (pcErr) {
      console.error('fetchProductConsumption', pcErr);
      return productsData || [];
    }
    const consumptionsByProduct: Record<string, ProductConsumption[]> = {};
    (pcData ?? []).forEach((c: any) => {
      if (!consumptionsByProduct[c.product_id]) consumptionsByProduct[c.product_id] = [];
      consumptionsByProduct[c.product_id].push({
        materialId: c.material_id,
        quantity: Number(c.quantity ?? 0),
      });
    });
    return (productsData ?? []).map((p: any) => ({
      ...p,
      pricePerUnit: p.price_per_unit ?? p.pricePerUnit,
      consumptionFormula: consumptionsByProduct[p.id] || [],
    }));
  };

  const { data: ordersRaw = [] } = useQuery({ queryKey: ['orders'], queryFn: fetchOrders });
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: fetchClients });
  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: fetchSuppliers });
  const { data: materials = [] } = useQuery({ queryKey: ['materials'], queryFn: fetchMaterials });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: fetchProducts });

  const cleanObject = (obj: Record<string, any>) =>
    Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== '' && v !== undefined && v !== null));

  // --- CRUD transactions ---
  const createTransaction = async (payload: Partial<Transaction>) => {
    const cleaned = cleanObject({
      ...payload,
      amount: payload.amount !== undefined ? Number(payload.amount) : undefined,
      date: payload.date ? payload.date : undefined,
    });
    const { data, error } = await supabase.from('transactions').insert([cleaned]).select();
    if (error) {
      console.error('Supabase insert error', error);
      throw error;
    }
    return data;
  };

  const updateTransaction = async (id: string, payload: Partial<Transaction>) => {
    const cleaned = cleanObject({
      ...payload,
      amount: payload.amount !== undefined ? Number(payload.amount) : undefined,
      date: payload.date ? payload.date : undefined,
    });
    const { data, error } = await supabase.from('transactions').update(cleaned).eq('id', id).select();
    if (error) {
      console.error('Supabase update error', error);
      throw error;
    }
    return data;
  };

  const deleteTransaction = async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) {
      console.error('Supabase delete error', error);
      throw error;
    }
    return true;
  };

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Transaction>) => (data.id ? updateTransaction(data.id, data) : createTransaction(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      handleCloseModal();
    },
    onError: (err: any) => {
      console.error('saveMutation error', err);
      alert('Erreur lors de l\'enregistrement. Voir console pour détails.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setIsDeleteModalOpen(false);
      setTransactionToDelete(null);
    },
    onError: (err: any) => {
      console.error('deleteMutation error', err);
      alert('Erreur lors de la suppression. Voir console pour détails.');
    }
  });

  // --- Form helpers ---
  const handleOpenEdit = (t: Transaction) => {
    setEditingTransaction(t);
    setFormData({
      type: t.type ?? TransactionType.INCOME,
      amount: (t.amount ?? '').toString(),
      description: t.description ?? '',
      category: (t.category as TransactionContext) || '',
      date: safeDateIso(t.date).split('T')[0],
      tiersId: t.order_id ?? t.client_id ?? t.supplier_id ?? t.material_id ?? '',
      paymentMethod: t.payment_method ?? 'Virement bancaire',
      reference: t.reference ?? '',
      notes: t.notes ?? '',
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTransaction(null);
    setFormData({
      type: TransactionType.INCOME,
      amount: '',
      description: '',
      category: '',
      date: new Date().toISOString().split('T')[0],
      tiersId: '',
      paymentMethod: 'Virement bancaire',
      reference: '',
      notes: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category) {
      alert('Veuillez sélectionner une catégorie');
      return;
    }
    const transactionData: Partial<Transaction> = {
      id: editingTransaction?.id,
      type: formData.type,
      amount: Number(formData.amount || 0),
      description: formData.description,
      category: formData.category,
      status: PaymentStatus.PAYEE,
      date: formData.date,
      payment_method: formData.paymentMethod,
      reference: formData.reference,
      notes: formData.notes,
    };
    if (formData.category === 'ORDER') transactionData.order_id = formData.tiersId;
    else if (formData.category === 'CLIENT') transactionData.client_id = formData.tiersId;
    else if (formData.category === 'SUPPLIER') transactionData.supplier_id = formData.tiersId;
    else if (formData.category === 'MATERIAL') transactionData.material_id = formData.tiersId;

    saveMutation.mutate(transactionData);
  };

  const resetFilters = () => {
    setSearchTerm(''); setFilterType('all'); setFilterCategory('all');
    setFilterStatus('all'); setFilterPaymentMethod('all'); setFilterStartDate('');
    setFilterEndDate(''); setFilterMinAmount(''); setFilterMaxAmount(''); setFilterSource('all');
  };

  const mapOrderRowToOrder = (row: any): Order => ({
    id: row.id,
    clientId: row.client_id ?? row.clientId,
    orderDate: row.order_date ?? row.orderDate ?? row.created_at ?? row.createdAt,
    deliveryDate: row.delivery_date ?? row.deliveryDate,
    status: row.status,
    totalPrice: Number(row.total_price ?? row.totalPrice ?? 0),
    paidAmount: Number(row.paid_amount ?? row.paidAmount ?? 0),
    paymentStatus: row.payment_status ?? row.paymentStatus,
    notes: row.notes ?? row.note,
    createdAt: row.created_at ?? row.createdAt,
    items: (row.order_items ?? []).map((it: any) => ({
      id: it.id,
      productId: it.product_id ?? it.productId,
      quantity: Number(it.quantity ?? 0),
      unit: it.unit,
      unitPrice: Number(it.unit_price ?? it.unitPrice ?? 0),
      totalItemPrice: Number(it.total_item_price ?? it.totalItemPrice ?? 0),
    })) as OrderItem[]
  });

  const orders = useMemo(() => (ordersRaw || []).map(mapOrderRowToOrder), [ordersRaw]);

  const combinedRows = useMemo(() => {
    const txRows = (transactions || []).map(t => ({ kind: 'TRANSACTION' as RowKind, data: t }));
    const orderRows = (orders || []).map(o => ({ kind: 'ORDER' as RowKind, data: o }));
    return [...txRows, ...orderRows].sort((a, b) => {
      const dateA = a.kind === 'TRANSACTION'
        ? new Date(safeDateIso((a.data as Transaction).date)).getTime()
        : new Date((a.data as Order).orderDate ?? (a.data as Order).createdAt ?? 0).getTime();
      const dateB = b.kind === 'TRANSACTION'
        ? new Date(safeDateIso((b.data as Transaction).date)).getTime()
        : new Date((b.data as Order).orderDate ?? (b.data as Order).createdAt ?? 0).getTime();
      return dateB - dateA;
    });
  }, [transactions, orders]);

  const filteredRows = useMemo(() => {
    return (combinedRows || [])
      .filter(row => {
        if (filterSource === 'transaction' && row.kind !== 'TRANSACTION') return false;
        if (filterSource === 'order' && row.kind !== 'ORDER') return false;

        if (row.kind === 'TRANSACTION') {
          const t = row.data as Transaction;
          const client: any = (clients || []).find(c => c.id === t.client_id);
          const supplier: any = (suppliers || []).find(s => s.id === t.supplier_id);
          const searchSource = `${t.description ?? ''} ${client?.name ?? ''} ${supplier?.name ?? ''} ${t.reference ?? ''}`.toLowerCase();
          const matchesSearch = searchSource.includes(searchTerm.toLowerCase());

          const matchesType = filterType === 'all' || t.type === filterType;
          const matchesCategory = filterCategory === 'all' || t.category === filterCategory;
          const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
          const matchesPaymentMethod = filterPaymentMethod === 'all' || t.payment_method === filterPaymentMethod;

          const tTime = new Date(safeDateIso(t.date)).getTime();
          const startTime = filterStartDate ? new Date(filterStartDate).getTime() : -Infinity;
          const endTime = filterEndDate ? new Date(filterEndDate).setHours(23, 59, 59, 999) : Infinity;
          const matchesDateRange = tTime >= startTime && tTime <= endTime;

          const amount = Number(t.amount ?? 0);
          const minAmount = filterMinAmount ? Number(filterMinAmount) : -Infinity;
          const maxAmount = filterMaxAmount ? Number(filterMaxAmount) : Infinity;
          const matchesAmountRange = amount >= minAmount && amount <= maxAmount;

          return matchesSearch && matchesType && matchesCategory && matchesStatus &&
                 matchesPaymentMethod && matchesDateRange && matchesAmountRange;
        }

        const o = row.data as Order;
        const client: any = (clients || []).find(c => c.id === o.clientId);
        const searchSource = `commande ${String(o.id)} ${client?.name ?? ''} ${o.status ?? ''} ${o.paymentStatus ?? ''}`.toLowerCase();
        const matchesSearch = searchSource.includes(searchTerm.toLowerCase());

        const matchesType = filterType === 'all';
        const matchesCategory = filterCategory === 'all' || filterCategory === 'ORDER';
        const matchesStatus = filterStatus === 'all' || o.paymentStatus === filterStatus;
        const matchesPaymentMethod = filterPaymentMethod === 'all';

        const oTime = new Date(o.orderDate ?? o.createdAt ?? 0).getTime();
        const startTime = filterStartDate ? new Date(filterStartDate).getTime() : -Infinity;
        const endTime = filterEndDate ? new Date(filterEndDate).setHours(23, 59, 59, 999) : Infinity;
        const matchesDateRange = oTime >= startTime && oTime <= endTime;

        const amount = Number(o.totalPrice ?? 0);
        const minAmount = filterMinAmount ? Number(filterMinAmount) : -Infinity;
        const maxAmount = filterMaxAmount ? Number(filterMaxAmount) : Infinity;
        const matchesAmountRange = amount >= minAmount && amount <= maxAmount;

        return matchesSearch && matchesType && matchesCategory && matchesStatus &&
               matchesPaymentMethod && matchesDateRange && matchesAmountRange;
      });
  }, [combinedRows, searchTerm, filterType, filterCategory, filterStatus, filterPaymentMethod,
      filterStartDate, filterEndDate, filterMinAmount, filterMaxAmount, filterSource, clients, suppliers]);

  const filteredTransactions = useMemo(() => (
    filteredRows.filter(r => r.kind === 'TRANSACTION').map(r => r.data as Transaction)
  ), [filteredRows]);

  const orderAdvanceTotal = useMemo(() =>
    filteredRows
      .filter(r => r.kind === 'ORDER')
      .reduce((sum, r) => sum + Number((r.data as Order).paidAmount ?? 0), 0)
  , [filteredRows]);

  const totals = useMemo(() =>
    filteredTransactions.reduce((acc, t) => {
      if (t.type === TransactionType.INCOME) acc.income += Number(t.amount ?? 0);
      else acc.expense += Number(t.amount ?? 0);
      acc.balance = acc.income - acc.expense + orderAdvanceTotal;
      return acc;
    }, { income: 0, expense: 0, balance: orderAdvanceTotal })
  , [filteredTransactions, orderAdvanceTotal]);

  const selectedOrderClient = useMemo(
    () => (clients ?? []).find((c: any) => c.id === selectedOrder?.clientId),
    [clients, selectedOrder]
  );
  const isSelectedOrderSupplier = selectedOrderClient?.type === 'FOURNISSEUR';

  const materialRequirements = useMemo(() => {
    if (!selectedOrder || isSelectedOrderSupplier) return [];
    const acc: Record<string, any> = {};
    (selectedOrder.items ?? []).forEach((item) => {
      const product: any = (products ?? []).find((p: any) => p.id === item.productId);
      const formula = product?.consumptionFormula ?? [];
      formula.forEach((f: any) => {
        const material: any = (materials ?? []).find((m: any) => m.id === f.materialId);
        const requiredQty = Number(f.quantity ?? 0) * Number(item.quantity ?? 0);
        if (!acc[f.materialId]) {
          acc[f.materialId] = {
            materialId: f.materialId,
            name: material?.name || 'Matière inconnue',
            unit: material?.unit || '',
            requiredQty: 0,
            unitPrice: Number(material?.pricePerUnit ?? 0),
            stock: Number(material?.stock ?? 0),
          };
        }
        acc[f.materialId].requiredQty += requiredQty;
      });
    });
    return Object.values(acc).map((r: any) => ({
      ...r,
      totalCost: Number(r.requiredQty ?? 0) * Number(r.unitPrice ?? 0),
    }));
  }, [selectedOrder, products, materials, isSelectedOrderSupplier]);

  const totalMaterialCost = useMemo(
    () => materialRequirements.reduce((sum: number, r: any) => sum + Number(r.totalCost ?? 0), 0),
    [materialRequirements]
  );
  const hasMaterialShortage = useMemo(
    () => materialRequirements.some((r: any) => Number(r.stock ?? 0) < Number(r.requiredQty ?? 0)),
    [materialRequirements]
  );

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterType !== 'all') count++;
    if (filterCategory !== 'all') count++;
    if (filterStatus !== 'all') count++;
    if (filterPaymentMethod !== 'all') count++;
    if (filterStartDate) count++;
    if (filterEndDate) count++;
    if (filterMinAmount) count++;
    if (filterMaxAmount) count++;
    if (filterSource !== 'all') count++;
    return count;
  }, [filterType, filterCategory, filterStatus, filterPaymentMethod, filterStartDate, filterEndDate, filterMinAmount, filterMaxAmount, filterSource]);

  const getTiersInfo = (t: Transaction) => {
    if (t.client_id) {
      const c: any = (clients || []).find(cli => cli.id === t.client_id);
      return { label: c?.name || 'Client', path: `/clients/${t.client_id}/history`, icon: <User size={14} /> };
    }
    if (t.supplier_id) {
      const s: any = (suppliers || []).find(sup => sup.id === t.supplier_id);
      return { label: s?.name || 'Fournisseur', path: `/suppliers`, icon: <Truck size={14} /> };
    }
    if (t.order_id) {
      return { label: `CMD-${String(t.order_id).slice(0,8)}`, path: `/orders/${t.order_id}`, icon: <ShoppingBag size={14} /> };
    }
    if (t.material_id) {
      const m: any = (materials || []).find(mat => mat.id === t.material_id);
      return { label: m?.name || 'Matière', path: `/materials`, icon: <Layers size={14} /> };
    }
    return { label: 'Autre', path: null, icon: null };
  };

  const getTiersOptions = () => {
    switch (formData.category) {
      case 'CLIENT': return (clients || []).map((c: any) => ({ value: c.id, label: c.name }));
      case 'SUPPLIER': return (suppliers || []).map((s: any) => ({ value: s.id, label: s.name }));
      case 'ORDER': return (orders || []).map((o: any) => ({ value: o.id, label: `CMD-${String(o.id).slice(0,8)} (${(o.totalPrice ?? 0)} DA)` }));
      case 'MATERIAL': return (materials || []).map((m: any) => ({ value: m.id, label: m.name }));
      default: return [];
    }
  };

  const getCategoryBadge = (category: string | undefined) => {
    const cat = (CATEGORIES as any)[category] || CATEGORIES.OTHER;
    const IconComponent = cat.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border ${cat.color}`}>
        {IconComponent ? <IconComponent size={14} /> : null}
        {cat.label}
      </span>
    );
  };

  const openOrderDetails = async (orderId: string) => {
    try {
      if (!orderId) return alert('Aucune commande liée');
      const cached = (ordersRaw as any[]).find(o => String(o.id) === String(orderId) && (o.order_items && o.order_items.length > 0));
      if (cached) {
        setSelectedOrder(mapOrderRowToOrder(cached));
        setIsOrderDetailsOpen(true);
        return;
      }
      setIsOrderLoading(true);
      const { data, error } = await supabase.from('orders').select('*, order_items(*)').eq('id', orderId).single();
      setIsOrderLoading(false);
      if (error) {
        console.error('Error fetching order', error);
        alert('Impossible de charger la commande (vérifie RLS ou la connexion).');
        return;
      }
      setSelectedOrder(mapOrderRowToOrder(data));
      setIsOrderDetailsOpen(true);
    } catch (err) {
      setIsOrderLoading(false);
      console.error('openOrderDetails error', err);
      alert('Erreur lors du chargement de la commande (voir console).');
    }
  };

  const closeOrderDetails = () => {
    setIsOrderDetailsOpen(false);
    setSelectedOrder(null);
  };

  const paymentMethods = useMemo(() => {
    const methods = (transactions || []).map(t => t.payment_method).filter(Boolean) as string[];
    return Array.from(new Set(methods));
  }, [transactions]);

  const exportRows = useMemo(() => {
    return filteredRows.map(row => {
      if (row.kind === 'TRANSACTION') {
        const t = row.data as Transaction;
        const tiers = getTiersInfo(t);
        return {
          date: new Date(safeDateIso(t.date)).toLocaleDateString('fr-FR'),
          origin: 'Transaction',
          type: t.type === TransactionType.INCOME ? 'Encaissement' : 'Décaissement',
          category: (CATEGORIES as any)[t.category as any]?.label || t.category || 'Autre',
          description: t.description ?? '',
          tiers: tiers.label ?? '',
          reference: t.reference ?? '',
          amount: `${t.type === TransactionType.INCOME ? '+' : '-'}${Number(t.amount ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DA`,
          status: t.status ?? '',
        };
      }
      const o = row.data as Order;
      const client = (clients || []).find((c: any) => c.id === o.clientId);
      const orderDate = o.orderDate ?? o.createdAt ?? '';
      return {
        date: new Date(orderDate || new Date().toISOString()).toLocaleDateString('fr-FR'),
        origin: 'Commande',
        type: 'Commande',
        category: 'Commande',
        description: `CMD-${String(o.id).slice(0,8).toUpperCase()}`,
        tiers: client?.name ?? '',
        reference: String(o.id).slice(0, 8).toUpperCase(),
        amount: `${Number(o.totalPrice ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DA`,
        status: o.paymentStatus ?? '',
      };
    });
  }, [filteredRows, clients]);

  const exportToCSV = () => {
    const headers = ['Date', 'Origine', 'Type', 'Catégorie', 'Description', 'Tiers', 'Référence', 'Montant', 'Statut'];
    const rows = exportRows.map(r => [r.date, r.origin, r.type, r.category, r.description, r.tiers, r.reference, r.amount, r.status]);
    const escape = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('Transactions & Commandes (filtrées)', 14, 16);
    autoTable(doc, {
      startY: 24,
      head: [[
        'Date', 'Origine', 'Type', 'Catégorie', 'Description', 'Tiers', 'Référence', 'Montant', 'Statut'
      ]],
      body: exportRows.map(r => [r.date, r.origin, r.type, r.category, r.description, r.tiers, r.reference, r.amount, r.status]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 10, right: 10 },
    });
    doc.save(`transactions_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  // ----------------- RENDER -----------------
  return (
    <div className="bg-[#F8F9FC] min-h-screen font-sans">
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 md:px-10 py-5 sm:py-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Trésorerie</h1>
          <p className="text-sm text-slate-500 mt-2">Gestion des flux financiers et suivi comptable</p>
        </div>
      </div>

      <div className="p-4 sm:p-6 md:p-10">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <Wallet size={20} className="text-white" />
                </div>
                <span className="text-sm font-semibold text-slate-600">Solde Net</span>
              </div>
              <p className={`text-2xl sm:text-3xl font-bold break-all ${totals.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {totals.balance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DA
              </p>
              <p className="text-xs text-slate-500 mt-2">
                {totals.balance >= 0 ? '↗ Positif' : '↘ Négatif'}
              </p>
            </div>

            <div className="bg-white border border-emerald-200 rounded-2xl p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <ArrowUpCircle size={20} className="text-emerald-600" />
                </div>
                <span className="text-sm font-semibold text-emerald-900">Encaissements</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-emerald-600 break-all">
                +{totals.income.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DA
              </p>
              <p className="text-xs text-emerald-700 mt-2">
                {filteredTransactions.filter(t => t.type === TransactionType.INCOME).length} opération(s)
              </p>
            </div>

            <div className="bg-white border border-rose-200 rounded-2xl p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
                  <ArrowDownCircle size={20} className="text-rose-600" />
                </div>
                <span className="text-sm font-semibold text-rose-900">Décaissements</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-rose-600 break-all">
                -{totals.expense.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DA
              </p>
              <p className="text-xs text-rose-700 mt-2">
                {filteredTransactions.filter(t => t.type === TransactionType.EXPENSE).length} opération(s)
              </p>
            </div>

            <div className="bg-white border border-indigo-200 rounded-2xl p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <ShoppingBag size={20} className="text-indigo-600" />
                </div>
                <span className="text-sm font-semibold text-indigo-900">Versements Commandes</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-indigo-600 break-all">
                +{orderAdvanceTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DA
              </p>
              <p className="text-xs text-indigo-700 mt-2">
                {(filteredRows.filter(r => r.kind === 'ORDER').length)} commande(s)
              </p>
            </div>
          </div>

          {/* Actions & search */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Rechercher par description, référence, tiers..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold transition-all ${
                  showFilters ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Filter size={18} />
                Filtres
                {activeFiltersCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs font-bold">{activeFiltersCount}</span>
                )}
                <ChevronDown size={16} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>

              {activeFiltersCount > 0 && (
                <button onClick={resetFilters} className="p-2.5 min-h-[44px] text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-slate-200" title="Réinitialiser les filtres">
                  <RotateCcw size={18} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-all" title="Exporter Excel" aria-label="Exporter Excel">
                <Download size={16} />
                <span className="hidden sm:inline">Excel</span>
              </button>
              <button onClick={exportToPDF} className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-all" title="Exporter PDF" aria-label="Exporter PDF">
                <FileText size={16} />
                <span className="hidden sm:inline">PDF</span>
              </button>
              <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 min-h-[44px] bg-[#6366F1] text-white rounded-lg text-sm font-semibold hover:bg-[#5558E3] transition-all shadow-md hover:shadow-lg whitespace-nowrap" title="Nouvelle transaction" aria-label="Nouvelle transaction">
                <Plus size={18} />
                <span className="hidden sm:inline">Nouvelle Transaction</span>
              </button>
            </div>
          </div>

          {/* Filters panel */}
          {showFilters && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Origine</label>
                  <select value={filterSource} onChange={(e) => setFilterSource(e.target.value as any)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm">
                    <option value="all">Toutes</option>
                    <option value="transaction">Transactions</option>
                    <option value="order">Commandes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Type</label>
                  <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm">
                    <option value="all">Tous</option>
                    <option value={TransactionType.INCOME}>Encaissement</option>
                    <option value={TransactionType.EXPENSE}>Décaissement</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Catégorie</label>
                  <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value as any)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm">
                    <option value="all">Toutes</option>
                    <option value="ORDER">Commande</option>
                    <option value="CLIENT">Client</option>
                    <option value="SUPPLIER">Fournisseur</option>
                    <option value="MATERIAL">Matière</option>
                    <option value="OTHER">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Statut paiement</label>
                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm">
                    <option value="all">Tous</option>
                    {Object.values(PaymentStatus).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Méthode</label>
                  <select value={filterPaymentMethod} onChange={(e) => setFilterPaymentMethod(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm">
                    <option value="all">Toutes</option>
                    {paymentMethods.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Date début</label>
                  <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Date fin</label>
                  <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Montant (min/max)</label>
                  <div className="flex gap-2">
                    <input type="number" placeholder="Min" value={filterMinAmount} onChange={(e) => setFilterMinAmount(e.target.value)} className="w-1/2 px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                    <input type="number" placeholder="Max" value={filterMaxAmount} onChange={(e) => setFilterMaxAmount(e.target.value)} className="w-1/2 px-3 py-2 rounded-lg border border-slate-200 text-sm" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          {isLoading ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
              <div className="inline-block animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-slate-100">
                {filteredRows.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <Wallet size={32} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-semibold">Aucun résultat trouvé</p>
                    <p className="text-slate-400 text-sm mt-1">Essayez un autre terme de recherche</p>
                  </div>
                ) : filteredRows.map((row) => {
                    if (row.kind === 'ORDER') {
                      const o = row.data as Order;
                      const client: any = (clients || []).find(c => c.id === o.clientId);
                      const orderDate = new Date((o.orderDate ?? o.createdAt ?? new Date().toISOString()));
                      return (
                        <div key={`order-card-${o.id}`} className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">Commande</p>
                              <p className="text-base font-semibold text-slate-900 break-all">
                                CMD-{String(o.id).slice(0,8).toUpperCase()}
                              </p>
                              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                                <Calendar size={14} className="text-slate-400" />
                                {orderDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-slate-900 break-all">
                                {Number(o.totalPrice ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DA
                              </p>
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 mt-2 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-lg border border-indigo-200">
                                <ShoppingBag size={14} />
                                Commande
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-3">
                            {client ? (
                              <Link to={`/clients/${o.clientId}/history`} className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 text-sm font-medium group">
                                <User size={14} />
                                <span className="truncate">{client.name}</span>
                                <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                              </Link>
                            ) : (
                              <span className="text-sm text-slate-500 flex items-center gap-1.5">
                                <User size={14} />
                                Inconnu
                              </span>
                            )}
                            <button onClick={() => openOrderDetails(String(o.id))} className="px-3 py-2 min-h-[44px] text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-all font-semibold" title="Détails commande" aria-label="Détails commande">
                              <FileText size={16} />
                              <span className="hidden sm:inline">Détails</span>
                            </button>
                          </div>
                        </div>
                      );
                    }

                    const t = row.data as Transaction;
                    const tiers = getTiersInfo(t);
                    return (
                      <div key={`transaction-card-${t.id}`} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">Transaction</p>
                            <p className="text-sm font-semibold text-slate-900 break-words">{t.description ?? '-'}</p>
                            {t.notes && <p className="text-xs text-slate-500 mt-1 break-words">{t.notes}</p>}
                            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                              <Calendar size={14} className="text-slate-400" />
                              {new Date(safeDateIso(t.date)).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-semibold break-all ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {t.type === TransactionType.INCOME ? '+' : '-'}{Number(t.amount ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DA
                            </p>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 mt-2 text-xs font-medium rounded-lg border ${
                              t.type === TransactionType.INCOME ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-rose-100 text-rose-700 border-rose-200'
                            }`}>
                              {t.type === TransactionType.INCOME ? <ArrowUpCircle size={14} /> : <ArrowDownCircle size={14} />}
                              {t.type === TransactionType.INCOME ? 'Entrée' : 'Sortie'}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          {tiers.path ? (
                            <Link to={tiers.path} className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 text-sm font-medium group">
                              {tiers.icon}
                              <span className="truncate">{tiers.label}</span>
                              <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Link>
                          ) : (
                            <span className="text-sm text-slate-500 flex items-center gap-1.5">
                              {tiers.icon}
                              {tiers.label}
                            </span>
                          )}
                          <div className="flex gap-2">
                            {t.order_id && (
                              <button onClick={() => openOrderDetails(String(t.order_id))} className="px-3 py-2 min-h-[44px] text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-all font-semibold" title="Voir commande" aria-label="Voir commande">
                                <ShoppingBag size={16} />
                                <span className="hidden sm:inline">Commande</span>
                              </button>
                            )}
                            <button onClick={() => handleOpenEdit(t)} className="px-3 py-2 min-h-[44px] text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-all font-semibold" title="Modifier" aria-label="Modifier">
                              <Edit3 size={16} />
                              <span className="hidden sm:inline">Modifier</span>
                            </button>
                            <button onClick={() => { setTransactionToDelete(t); setIsDeleteModalOpen(true); }} className="px-3 py-2 min-h-[44px] text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-all font-semibold" title="Supprimer" aria-label="Supprimer">
                              <Trash2 size={16} />
                              <span className="hidden sm:inline">Supprimer</span>
                            </button>
                          </div>
                        </div>

                        {t.reference && (
                          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                            <Receipt size={14} className="text-slate-400" />
                            <span className="font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded break-all">{t.reference}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Tiers</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Référence</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Montant</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center">
                          <Wallet size={32} className="text-slate-300 mx-auto mb-3" />
                          <p className="text-slate-500 font-semibold">Aucun résultat trouvé</p>
                          <p className="text-slate-400 text-sm mt-1">Essayez un autre terme de recherche</p>
                        </td>
                      </tr>
                    ) : filteredRows.map((row) => {
                      if (row.kind === 'ORDER') {
                        const o = row.data as Order;
                        const client: any = (clients || []).find(c => c.id === o.clientId);
                        return (
                          <tr key={`order-${o.id}`} className="bg-indigo-50/30 hover:bg-indigo-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-slate-400" />
                                <div>
                                  <p className="text-sm font-medium text-slate-900">
                                  {new Date((o.orderDate ?? o.createdAt ?? new Date().toISOString())).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                  {new Date((o.orderDate ?? o.createdAt ?? new Date().toISOString())).toLocaleDateString('fr-FR', { year: 'numeric' })}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-4">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-lg border border-indigo-200">
                                <ShoppingBag size={14} />
                                Commande
                              </span>
                            </td>


                            <td className="px-6 py-4">
                              <p className="text-sm font-medium text-slate-900 max-w-xs truncate">CMD-{String(o.id).slice(0,8).toUpperCase()}</p>
                              <p className="text-xs text-slate-500 mt-1 max-w-xs truncate">
                                Statut: {o.status || 'N/A'} • Paiement: {o.paymentStatus || 'N/A'}
                              </p>
                            </td>

                            <td className="px-6 py-4">
                              {client ? (
                                <Link to={`/clients/${o.clientId}/history`} className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 hover:underline text-sm font-medium group">
                                  <User size={14} />
                                  <span className="max-w-[150px] truncate">{client.name}</span>
                                  <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                </Link>
                              ) : (
                                <span className="text-sm text-slate-500 flex items-center gap-1.5">
                                  <User size={14} />
                                  Inconnu
                                </span>
                              )}
                            </td>

                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5">
                              <Receipt size={14} className="text-slate-400" />
                              <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded break-all">{String(o.id).slice(0,8).toUpperCase()}</span>
                            </div>
                          </td>

                            <td className="px-6 py-4 text-right">
                              <p className="text-sm font-semibold text-slate-900">
                                {Number(o.totalPrice ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DA
                              </p>
                            </td>

                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button onClick={() => openOrderDetails(String(o.id))} className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-all font-semibold" title="Détails commande">
                                  <ShoppingBag size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      const t = row.data as Transaction;
                      const tiers = getTiersInfo(t);
                      return (
                        <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Calendar size={14} className="text-slate-400" />
                              <div>
                                <p className="text-sm font-medium text-slate-900">
                                  {new Date(safeDateIso(t.date)).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {new Date(safeDateIso(t.date)).toLocaleDateString('fr-FR', { year: 'numeric' })}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            {t.type === TransactionType.INCOME ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-lg border border-emerald-200">
                                <ArrowUpCircle size={14} />
                                Entrée
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-100 text-rose-700 text-xs font-medium rounded-lg border border-rose-200">
                                <ArrowDownCircle size={14} />
                                Sortie
                              </span>
                            )}
                          </td>


                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-slate-900 max-w-xs truncate">{t.description ?? '-'}</p>
                            {t.notes && <p className="text-xs text-slate-500 mt-1 max-w-xs truncate">{t.notes}</p>}
                          </td>

                          <td className="px-6 py-4">
                            {tiers.path ? (
                              <Link to={tiers.path} className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 hover:underline text-sm font-medium group">
                                {tiers.icon}
                                <span className="max-w-[150px] truncate">{tiers.label}</span>
                                <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                              </Link>
                            ) : (
                              <span className="text-sm text-slate-500 flex items-center gap-1.5">
                                {tiers.icon}
                                {tiers.label}
                              </span>
                            )}
                          </td>

                          <td className="px-6 py-4">
                            {t.reference ? (
                              <div className="flex items-center gap-1.5">
                                <Receipt size={14} className="text-slate-400" />
                                <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded break-all">{t.reference}</span>
                              </div>
                            ) : <span className="text-xs text-slate-400">-</span>}
                          </td>

                          <td className="px-6 py-4 text-right">
                            <p className={`text-sm font-semibold ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {t.type === TransactionType.INCOME ? '+' : '-'}{Number(t.amount ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DA
                            </p>
                          </td>

                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              {t.order_id && (
                                <button onClick={() => openOrderDetails(String(t.order_id))} className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-all font-semibold" title="Détails commande">
                                  <ShoppingBag size={16} />
                                </button>
                              )}

                              <button onClick={() => handleOpenEdit(t)} className="p-2 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-all font-semibold">
                                <Edit3 size={16} />
                              </button>

                              <button onClick={() => { setTransactionToDelete(t); setIsDeleteModalOpen(true); }} className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-all font-semibold">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order details modal */}
      {isOrderDetailsOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <FileText size={20} className="text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Détails Commande {selectedOrder ? `#${String(selectedOrder.id).slice(0,8).toUpperCase()}` : ''}</h2>
                  <p className="text-xs text-slate-500">{selectedOrder ? `Créée le ${new Date(selectedOrder.createdAt ?? selectedOrder.orderDate ?? '').toLocaleDateString('fr-FR')}` : ''}</p>
                </div>
              </div>
              <div className="flex gap-2 items-center">
                {isOrderLoading && <div className="text-sm text-slate-500">Chargement...</div>}
                <button onClick={closeOrderDetails} className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><X size={20} className="text-slate-600" /></button>
              </div>
            </div>

            <div className="p-6 space-y-8">
              {selectedOrder ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Client</span>
                      <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <User size={14} className="text-indigo-500" />
                        {(clients || []).find((c: any) => c.id === selectedOrder.clientId)?.name || 'Inconnu'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date de livraison</span>
                      <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <Calendar size={14} className="text-amber-500" />
                        {selectedOrder.deliveryDate ? new Date(selectedOrder.deliveryDate).toLocaleDateString('fr-FR') : 'Non définie'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Statut Actuel</span>
                      <div>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${STATUS_LABELS[selectedOrder.status as any]?.bgColor} ${STATUS_LABELS[selectedOrder.status as any]?.textColor}`}>
                          {STATUS_LABELS[selectedOrder.status as any]?.icon}
                          {STATUS_LABELS[selectedOrder.status as any]?.label || selectedOrder.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border border-slate-100 rounded-xl overflow-hidden">
                    {/* Mobile cards */}
                    <div className="md:hidden divide-y divide-slate-50">
                      {selectedOrder.items?.map((item, idx) => {
                        const product = (products || []).find((p: any) => p.id === item.productId) || (materials || []).find((m: any) => m.id === item.productId);
                        return (
                          <div key={idx} className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">Article</p>
                                <p className="text-sm font-semibold text-slate-900 break-words">{product?.name || 'Produit inconnu'}</p>
                                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                                  <Package size={14} className="text-slate-400" />
                                  {item.quantity} {item.unit}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-slate-500">PU</p>
                                <p className="text-sm font-semibold text-slate-700 break-all">{(item.unitPrice ?? 0).toLocaleString()} DA</p>
                                <p className="text-xs text-slate-500 mt-2">Total</p>
                                <p className="text-sm font-bold text-slate-900 break-all">{(item.totalItemPrice ?? 0).toLocaleString()} DA</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div className="p-4 bg-slate-50/50">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-600 uppercase">Total Commande</span>
                          <span className="text-base font-bold text-indigo-600 break-all">{(selectedOrder.totalPrice ?? 0).toLocaleString()} DA</span>
                        </div>
                      </div>
                    </div>

                    {/* Desktop table */}
                    <div className="hidden md:block">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold text-slate-600">Article</th>
                            <th className="px-4 py-3 text-center font-semibold text-slate-600">Quantité</th>
                            <th className="px-4 py-3 text-right font-semibold text-slate-600">Prix Unitaire</th>
                            <th className="px-4 py-3 text-right font-semibold text-slate-600">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {selectedOrder.items?.map((item, idx) => {
                            const product = (products || []).find((p: any) => p.id === item.productId) || (materials || []).find((m: any) => m.id === item.productId);
                            return (
                              <tr key={idx}>
                                <td className="px-4 py-3 font-medium text-slate-800">{product?.name || 'Produit inconnu'}</td>
                                <td className="px-4 py-3 text-center text-slate-600">{item.quantity} {item.unit}</td>
                                <td className="px-4 py-3 text-right text-slate-600 break-all">{(item.unitPrice ?? 0).toLocaleString()} DA</td>
                                <td className="px-4 py-3 text-right font-bold text-slate-900 break-all">{(item.totalItemPrice ?? 0).toLocaleString()} DA</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-slate-50/50 font-bold">
                          <tr>
                            <td colSpan={3} className="px-4 py-3 text-right text-slate-600">Total Commande</td>
                            <td className="px-4 py-3 text-right text-indigo-600 text-lg break-all">{(selectedOrder.totalPrice ?? 0).toLocaleString()} DA</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Consommation matières premières */}
                  {!isSelectedOrderSupplier && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-500 uppercase">Matières premières nécessaires</h4>
                        {hasMaterialShortage && (
                          <span className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-1 rounded-lg">
                            Stock insuffisant
                          </span>
                        )}
                      </div>
                      <div className="border border-slate-100 rounded-xl overflow-hidden">
                        {materialRequirements.length > 0 ? (
                          <>
                          {/* Mobile cards */}
                          <div className="md:hidden divide-y divide-slate-50">
                            {materialRequirements.map((m: any) => {
                              const isLow = Number(m.stock ?? 0) < Number(m.requiredQty ?? 0);
                              return (
                                <div key={m.materialId} className="p-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">Matière</p>
                                      <p className="text-sm font-semibold text-slate-900 break-words">{m.name}</p>
                                      <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                                        <Package size={14} className="text-slate-400" />
                                        {Number(m.requiredQty ?? 0).toLocaleString()} {m.unit} requis
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className={`text-sm font-semibold ${isLow ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        {Number(m.stock ?? 0).toLocaleString()} {m.unit}
                                      </p>
                                      <p className="text-xs text-slate-500 mt-2">PU</p>
                                      <p className="text-sm font-semibold text-slate-700 break-all">{Number(m.unitPrice ?? 0).toLocaleString()} DA</p>
                                      <p className="text-xs text-slate-500 mt-2">Coût</p>
                                      <p className="text-sm font-bold text-slate-900 break-all">{Number(m.totalCost ?? 0).toLocaleString()} DA</p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            <div className="p-4 bg-slate-50/50">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-600 uppercase">Coût matières</span>
                                <span className="text-base font-bold text-indigo-600 break-all">{totalMaterialCost.toLocaleString()} DA</span>
                              </div>
                            </div>
                          </div>

                          {/* Desktop table */}
                          <div className="hidden md:block">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-100">
                              <tr>
                                <th className="px-4 py-3 text-left font-semibold text-slate-600">Matière</th>
                                <th className="px-4 py-3 text-center font-semibold text-slate-600">Qté requise</th>
                                <th className="px-4 py-3 text-center font-semibold text-slate-600">Stock</th>
                                <th className="px-4 py-3 text-right font-semibold text-slate-600">PU</th>
                                <th className="px-4 py-3 text-right font-semibold text-slate-600">Coût</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {materialRequirements.map((m: any) => {
                                const isLow = Number(m.stock ?? 0) < Number(m.requiredQty ?? 0);
                                return (
                                  <tr key={m.materialId}>
                                    <td className="px-4 py-3 font-medium text-slate-800">{m.name}</td>
                                    <td className="px-4 py-3 text-center text-slate-600">{Number(m.requiredQty ?? 0).toLocaleString()} {m.unit}</td>
                                    <td className={`px-4 py-3 text-center font-semibold ${isLow ? 'text-rose-600' : 'text-emerald-600'}`}>
                                      {Number(m.stock ?? 0).toLocaleString()} {m.unit}
                                    </td>
                                    <td className="px-4 py-3 text-right text-slate-600 break-all">{Number(m.unitPrice ?? 0).toLocaleString()} DA</td>
                                    <td className="px-4 py-3 text-right font-bold text-slate-900 break-all">{Number(m.totalCost ?? 0).toLocaleString()} DA</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot className="bg-slate-50/50 font-bold">
                              <tr>
                                <td colSpan={4} className="px-4 py-3 text-right text-slate-600">Coût matières</td>
                                <td className="px-4 py-3 text-right text-indigo-600 text-lg break-all">{totalMaterialCost.toLocaleString()} DA</td>
                              </tr>
                            </tfoot>
                          </table>
                          </div>
                          </>
                        ) : (
                          <div className="px-4 py-6 text-center text-sm text-slate-400">Aucune formule matière associée aux produits.</div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Résumé Financier</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Déjà versé:</span>
                          <span className="font-bold text-emerald-600">{(selectedOrder.paidAmount ?? 0).toLocaleString()} DA</span>
                        </div>
                        <div className="flex justify-between text-sm border-t border-slate-200 pt-2">
                          <span className="text-slate-600">Reste à payer:</span>
                          <span className="font-bold text-rose-600">{(((selectedOrder.totalPrice ?? 0) - (selectedOrder.paidAmount ?? 0))).toLocaleString()} DA</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                      <h4 className="text-xs font-bold text-amber-600 uppercase mb-2">Notes / Instructions</h4>
                      <p className="text-sm text-slate-700 italic">{selectedOrder.notes || "Aucune instruction particulière."}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-6 text-center text-slate-500">Aucune commande chargée</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal form (simplifiée) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl p-6 my-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{editingTransaction ? 'Modifier la transaction' : 'Nouvelle transaction'}</h3>
                <p className="text-sm text-slate-500 mt-1">Sélectionnez une catégorie et remplissez les informations</p>
              </div>
              <button onClick={handleCloseModal} className="p-2 hover:bg-slate-100 rounded-lg transition-all"><X size={20} className="text-slate-600" /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select className="p-2 border rounded" value={formData.category} onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}>
                  <option value="">Sélectionner une catégorie</option>
                  <option value="ORDER">Commande</option>
                  <option value="CLIENT">Client</option>
                  <option value="SUPPLIER">Fournisseur</option>
                  <option value="MATERIAL">Matière</option>
                  <option value="OTHER">Autre</option>
                </select>

                <select className="p-2 border rounded" value={formData.type} onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as TransactionType }))}>
                  <option value={TransactionType.INCOME}>Entrée</option>
                  <option value={TransactionType.EXPENSE}>Sortie</option>
                </select>

                <input type="date" className="p-2 border rounded" value={formData.date} onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input placeholder="Montant" className="p-2 border rounded" value={formData.amount} onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))} />
                <select className="p-2 border rounded" value={formData.tiersId} onChange={(e) => setFormData(prev => ({ ...prev, tiersId: e.target.value }))}>
                  <option value="">Sélectionner le tiers (optionnel)</option>
                  {getTiersOptions().map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                <input placeholder="Référence" className="p-2 border rounded" value={formData.reference} onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))} />
              </div>

              <div>
                <input placeholder="Description" className="w-full p-2 border rounded" value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} />
              </div>

              <div>
                <textarea placeholder="Notes" className="w-full p-2 border rounded" value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} />
              </div>

              <div className="flex gap-3 pt-4">
              <button type="button" onClick={handleCloseModal} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-all" title="Annuler" aria-label="Annuler">
                <X size={18} />
                <span className="hidden sm:inline">Annuler</span>
              </button>
              <button type="submit" disabled={saveMutation.isLoading || !formData.category} className="flex-1 px-4 py-2.5 bg-[#6366F1] text-white rounded-xl text-sm font-semibold hover:bg-[#5558E3] transition-all disabled:opacity-50 disabled:cursor-not-allowed" title={saveMutation.isLoading ? 'Enregistrement...' : (editingTransaction ? 'Mettre à jour' : 'Enregistrer')} aria-label={saveMutation.isLoading ? 'Enregistrement' : (editingTransaction ? 'Mettre à jour' : 'Enregistrer')}>
                {saveMutation.isLoading ? <Clock size={18} /> : editingTransaction ? <Edit3 size={18} /> : <Plus size={18} />}
                <span className="hidden sm:inline">{saveMutation.isLoading ? 'Enregistrement...' : (editingTransaction ? 'Mettre à jour' : 'Enregistrer')}</span>
              </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete modal */}
      {isDeleteModalOpen && transactionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 text-center">
            <div className="mx-auto w-14 h-14 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-4">
              <AlertTriangle size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Supprimer la transaction ?</h3>
            <p className="text-sm text-slate-600 mb-4">Vous êtes sur le point de supprimer cette transaction. Cette action est irréversible.</p>
            <div className="p-4 bg-slate-50 rounded-xl mb-6 text-left">
              <p className="text-sm font-medium text-slate-900 mb-2">{transactionToDelete.description}</p>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">{new Date(safeDateIso(transactionToDelete.date)).toLocaleDateString('fr-FR')}</span>
                <p className={`text-base font-bold ${transactionToDelete.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {transactionToDelete.type === TransactionType.INCOME ? '+' : '-'}{Number(transactionToDelete.amount ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DA
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setIsDeleteModalOpen(false); setTransactionToDelete(null); }} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-all" title="Annuler" aria-label="Annuler">
                <X size={18} />
                <span className="hidden sm:inline">Annuler</span>
              </button>
              <button onClick={() => deleteMutation.mutate(transactionToDelete.id)} disabled={deleteMutation.isLoading} className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 transition-all disabled:opacity-50" title={deleteMutation.isLoading ? 'Suppression...' : 'Supprimer'} aria-label={deleteMutation.isLoading ? 'Suppression' : 'Supprimer'}>
                {deleteMutation.isLoading ? <Clock size={18} /> : <Trash2 size={18} />}
                <span className="hidden sm:inline">{deleteMutation.isLoading ? 'Suppression...' : 'Supprimer'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionList;
