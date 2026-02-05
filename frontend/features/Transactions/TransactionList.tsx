import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '../../api/supabase';
import { 
  Plus, Search, X, Calendar, DollarSign, 
  User, Truck, ShoppingBag, Layers, ExternalLink,
  Edit3, Trash2, AlertTriangle, Wallet, 
  ArrowUpCircle, ArrowDownCircle, Filter, RotateCcw, ChevronDown, Receipt, CheckCircle2
} from 'lucide-react';
import { TransactionType, PaymentStatus, Transaction, Order, OrderItem } from '../../types';

type TransactionContext = 'ORDER' | 'MATERIAL' | 'CLIENT' | 'SUPPLIER' | 'OTHER';

const CATEGORIES = {
  CLIENT: { 
    label: 'Partenaire', 
    icon: User, 
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    gradient: 'from-blue-500 to-indigo-600',
    description: 'Paiement d\'un partenaire'
  },
  ORDER: { 
    label: 'Commande', 
    icon: ShoppingBag, 
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    gradient: 'from-orange-500 to-amber-600',
    description: 'Transaction liée à une commande'
  },
  MATERIAL: { 
    label: 'Matière première', 
    icon: Layers, 
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    gradient: 'from-amber-500 to-yellow-600',
    description: 'Achat de matières premières'
  },
  OTHER: { 
    label: 'Autre', 
    icon: Truck, 
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    gradient: 'from-slate-500 to-gray-600',
    description: 'Transaction diverse'
  },
};

const DEFAULT_TRANSACTIONS: Partial<Transaction>[] = [
  // ... (gardez vos transactions par défaut si besoin)
];

export const TransactionList: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // --- NEW: order details modal state ---
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);
  const [isOrderLoading, setIsOrderLoading] = useState(false);

  // Filtres et recherche
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [filterCategory, setFilterCategory] = useState<'all' | TransactionContext>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | PaymentStatus>('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterMinAmount, setFilterMinAmount] = useState('');
  const [filterMaxAmount, setFilterMaxAmount] = useState('');

  // Formulaire
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

  // Fetch transactions
  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });
    if (error) throw error;
    return data as Transaction[];
  };

  const { data: fetchedTransactions = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: fetchTransactions,
  });

  const transactions = useMemo(() => {
    if (fetchedTransactions.length === 0) {
      return DEFAULT_TRANSACTIONS as Transaction[];
    }
    return fetchedTransactions;
  }, [fetchedTransactions]);

  // Fetch dépendances pour les tiers
  const fetchOrders = async () => {
    const { data, error } = await supabase.from('orders').select('*');
    if (error) throw error;
    return data || [];
  };
  const fetchClients = async () => {
    const { data, error } = await supabase.from('clients').select('*');
    if (error) throw error;
    return data || [];
  };
  const fetchSuppliers = async () => {
    const { data, error } = await supabase.from('clients').select('*').eq('is_supplier', true);
    if (error) throw error;
    return data || [];
  };
  const fetchMaterials = async () => {
    const { data, error } = await supabase.from('materials').select('*');
    if (error) throw error;
    return data || [];
  };

  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: fetchOrders,
  });
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: fetchClients,
  });
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: fetchSuppliers,
  });
  const { data: materials = [] } = useQuery({
    queryKey: ['materials'],
    queryFn: fetchMaterials,
  });

  const cleanObject = (obj: Record<string, any>) =>
    Object.fromEntries(
      Object.entries(obj)
        // enlever clés vides, null ou undefined
        .filter(([_, v]) => v !== '' && v !== undefined && v !== null)
    );

  const createTransaction = async (payload: Partial<Transaction>) => {
    const cleaned = cleanObject({
      // forcer types corrects ici si besoin
      ...payload,
      amount: payload.amount !== undefined ? Number(payload.amount) : undefined,
      date: payload.date ? payload.date : undefined,
    });

    console.debug('createTransaction payload =>', cleaned);
    const { data, error } = await supabase
      .from('transactions')
      .insert([cleaned])
      .select();

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

    console.debug('updateTransaction payload =>', id, cleaned);
    const { data, error } = await supabase
      .from('transactions')
      .update(cleaned)
      .eq('id', id)
      .select();

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
    mutationFn: (data: Partial<Transaction>) => data.id ? updateTransaction(data.id, data) : createTransaction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      handleCloseModal();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setIsDeleteModalOpen(false);
      setTransactionToDelete(null);
    }
  });

  // Gestion formulaire édition
  const handleOpenEdit = (t: Transaction) => {
    setEditingTransaction(t);
    setFormData({
      type: t.type,
      amount: t.amount.toString(),
      description: t.description,
      category: (t.category as TransactionContext) || '',
      date: t.date.split('T')[0],
      tiersId: t.order_id || t.client_id || t.supplier_id || t.material_id || '',
      paymentMethod: t.payment_method || 'Virement bancaire',
      reference: t.reference || '',
      notes: t.notes || '',
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
      amount: Number(formData.amount),
      description: formData.description,
      category: formData.category,
      status: PaymentStatus.PAYEE,
      date: formData.date,
      payment_method: formData.paymentMethod,
      reference: formData.reference,
      notes: formData.notes,
    };

    // Assign tiers based on category
    if (formData.category === 'ORDER') transactionData.order_id = formData.tiersId;
    else if (formData.category === 'CLIENT') transactionData.client_id = formData.tiersId;
    else if (formData.category === 'SUPPLIER') transactionData.supplier_id = formData.tiersId;
    else if (formData.category === 'MATERIAL') transactionData.material_id = formData.tiersId;

    saveMutation.mutate(transactionData);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setFilterCategory('all');
    setFilterStatus('all');
    setFilterPaymentMethod('all');
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterMinAmount('');
    setFilterMaxAmount('');
  };

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => {
        const client = clients.find(c => c.id === t.client_id);
        const supplier = suppliers.find(s => s.id === t.supplier_id);
        const searchSource = `${t.description} ${client?.name || ''} ${supplier?.name || ''} ${t.reference || ''}`.toLowerCase();
        const matchesSearch = searchSource.includes(searchTerm.toLowerCase());

        const matchesType = filterType === 'all' || t.type === filterType;
        const matchesCategory = filterCategory === 'all' || t.category === filterCategory;
        const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
        const matchesPaymentMethod = filterPaymentMethod === 'all' || t.payment_method === filterPaymentMethod;

        const tTime = new Date(t.date).getTime();
        const startTime = filterStartDate ? new Date(filterStartDate).getTime() : -Infinity;
        const endTime = filterEndDate ? new Date(filterEndDate).setHours(23, 59, 59, 999) : Infinity;
        const matchesDateRange = tTime >= startTime && tTime <= endTime;

        const amount = t.amount;
        const minAmount = filterMinAmount ? Number(filterMinAmount) : -Infinity;
        const maxAmount = filterMaxAmount ? Number(filterMaxAmount) : Infinity;
        const matchesAmountRange = amount >= minAmount && amount <= maxAmount;

        return matchesSearch && matchesType && matchesCategory && matchesStatus &&
               matchesPaymentMethod && matchesDateRange && matchesAmountRange;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchTerm, filterType, filterCategory, filterStatus, filterPaymentMethod, 
      filterStartDate, filterEndDate, filterMinAmount, filterMaxAmount, clients, suppliers]);

  const totals = useMemo(() => 
    filteredTransactions.reduce((acc, t) => {
      if (t.type === TransactionType.INCOME) acc.income += t.amount;
      else acc.expense += t.amount;
      acc.balance = acc.income - acc.expense;
      return acc;
    }, { income: 0, expense: 0, balance: 0 })
  , [filteredTransactions]);

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
    return count;
  }, [filterType, filterCategory, filterStatus, filterPaymentMethod, filterStartDate, filterEndDate, filterMinAmount, filterMaxAmount]);

  const getTiersInfo = (t: Transaction) => {
    if (t.client_id) {
      const c = clients.find(cli => cli.id === t.client_id);
      return { label: c?.name || 'Client', path: `/clients/${t.client_id}/history`, icon: <User size={14} /> };
    }
    if (t.supplier_id) {
      const s = suppliers.find(sup => sup.id === t.supplier_id);
      return { label: s?.name || 'Fournisseur', path: `/suppliers`, icon: <Truck size={14} /> };
    }
    if (t.order_id) {
      return { label: `CMD-${t.order_id.slice(0,8)}`, path: `/orders/${t.order_id}`, icon: <ShoppingBag size={14} /> };
    }
    if (t.material_id) {
      const m = materials.find(mat => mat.id === t.material_id);
      return { label: m?.name || 'Matière', path: `/materials`, icon: <Layers size={14} /> };
    }
    return { label: 'Autre', path: null, icon: null };
  };

  const getTiersOptions = () => {
    switch (formData.category) {
      case 'CLIENT':
        return clients.map(c => ({ value: c.id, label: c.name }));
      case 'SUPPLIER':
        return suppliers.map(s => ({ value: s.id, label: s.name }));
      case 'ORDER':
        return orders.map((o: any) => ({ value: o.id, label: `CMD-${String(o.id).slice(0,8)} (${(o.total_price ?? o.totalPrice ?? 0)} DA)` }));
      case 'MATERIAL':
        return materials.map(m => ({ value: m.id, label: m.name }));
      default:
        return [];
    }
  };

  const getCategoryBadge = (category: string) => {
    const cat = CATEGORIES[category as keyof typeof CATEGORIES] || CATEGORIES.OTHER;
    const IconComponent = cat.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border ${cat.color}`}>
        <IconComponent size={14} />
        {cat.label}
      </span>
    );
  };

  // --- Order mapping & details fetch ------------------------------------------------
  const mapOrderRowToOrder = (row: any): Order => ({
    id: row.id,
    clientId: row.client_id,
    orderDate: row.order_date,
    deliveryDate: row.delivery_date,
    status: row.status,
    totalPrice: Number(row.total_price ?? row.totalPrice ?? 0),
    paidAmount: Number(row.paid_amount ?? row.paidAmount ?? 0),
    paymentStatus: row.payment_status ?? row.paymentStatus,
    notes: row.notes,
    createdAt: row.created_at ?? row.createdAt,
    items: (row.order_items ?? []).map((it: any) => ({
      id: it.id,
      productId: it.product_id,
      quantity: Number(it.quantity ?? 0),
      unit: it.unit,
      unitPrice: Number(it.unit_price ?? it.unitPrice ?? 0),
      totalItemPrice: Number(it.total_item_price ?? it.totalItemPrice ?? 0),
    })) as OrderItem[]
  });

  const openOrderDetails = async (orderId: string) => {
    try {
      if (!orderId) return alert('Aucune commande liée');
      // 1) chercher dans le cache orders (si order_items déjà présents)
      const cached = (orders as any[]).find(o => String(o.id) === String(orderId) && (o.order_items && o.order_items.length > 0));
      if (cached) {
        setSelectedOrder(mapOrderRowToOrder(cached));
        setIsOrderDetailsOpen(true);
        return;
      }

      // 2) sinon fetch la commande complète avec order_items
      setIsOrderLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', orderId)
        .single();

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
  // ----------------------------------------------------------------------------------

  return (
    <div className="bg-[#F8F9FC] min-h-screen font-sans">
      {/* HEADER TITLE */}
      <div className="bg-white border-b border-slate-200 px-6 md:px-10 py-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900">Trésorerie</h1>
          <p className="text-sm text-slate-500 mt-2">Gestion des flux financiers et suivi comptable</p>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="p-6 md:p-10">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* STATS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <Wallet size={20} className="text-white" />
                </div>
                <span className="text-sm font-semibold text-slate-600">Solde Net</span>
              </div>
              <p className={`text-3xl font-bold ${totals.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {totals.balance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DA
              </p>
              <p className="text-xs text-slate-500 mt-2">
                {totals.balance >= 0 ? '↗ Positif' : '↘ Négatif'}
              </p>
            </div>

            <div className="bg-white border border-emerald-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <ArrowUpCircle size={20} className="text-emerald-600" />
                </div>
                <span className="text-sm font-semibold text-emerald-900">Encaissements</span>
              </div>
              <p className="text-3xl font-bold text-emerald-600">
                +{totals.income.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DA
              </p>
              <p className="text-xs text-emerald-700 mt-2">
                {filteredTransactions.filter(t => t.type === TransactionType.INCOME).length} opération(s)
              </p>
            </div>

            <div className="bg-white border border-rose-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
                  <ArrowDownCircle size={20} className="text-rose-600" />
                </div>
                <span className="text-sm font-semibold text-rose-900">Décaissements</span>
              </div>
              <p className="text-3xl font-bold text-rose-600">
                -{totals.expense.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DA
              </p>
              <p className="text-xs text-rose-700 mt-2">
                {filteredTransactions.filter(t => t.type === TransactionType.EXPENSE).length} opération(s)
              </p>
            </div>
          </div>

          {/* ACTIONS & SEARCH */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  showFilters 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Filter size={18} />
                Filtres
                {activeFiltersCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs font-bold">
                    {activeFiltersCount}
                  </span>
                )}
                <ChevronDown size={16} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
              {activeFiltersCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-slate-200"
                  title="Réinitialiser les filtres"
                >
                  <RotateCcw size={18} />
                </button>
              )}
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#6366F1] text-white rounded-lg text-sm font-semibold hover:bg-[#5558E3] transition-all shadow-md hover:shadow-lg whitespace-nowrap"
            >
              <Plus size={18} />
              Nouvelle Transaction
            </button>
          </div>

          {/* ADVANCED FILTERS PANEL */}
          {showFilters && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              {/* ... (le reste du panneau de filtres reste inchangé) */}
            </div>
          )}

          {/* TABLE */}
          {isLoading ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
              <div className="inline-block animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Catégorie</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Tiers</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Référence</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Montant</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-12 text-center">
                          <Wallet size={32} className="text-slate-300 mx-auto mb-3" />
                          <p className="text-slate-500 font-semibold">Aucune transaction trouvée</p>
                          <p className="text-slate-400 text-sm mt-1">Essayez un autre terme de recherche</p>
                        </td>
                      </tr>
                    ) : filteredTransactions.map((t) => {
                      const tiers = getTiersInfo(t);
                      
                      return (
                        <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Calendar size={14} className="text-slate-400" />
                              <div>
                                <p className="text-sm font-medium text-slate-900">
                                  {new Date(t.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {new Date(t.date).toLocaleDateString('fr-FR', { year: 'numeric' })}
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
                            {getCategoryBadge(t.category || 'OTHER')}
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-slate-900 max-w-xs truncate">
                              {t.description}
                            </p>
                            {t.notes && (
                              <p className="text-xs text-slate-500 mt-1 max-w-xs truncate">
                                {t.notes}
                              </p>
                            )}
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
                                <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded">
                                  {t.reference}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <p className={`text-sm font-semibold ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {t.type === TransactionType.INCOME ? '+' : '-'}
                              {t.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DA
                            </p>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              {/* NEW: Détails commande button (si lié à une commande) */}
                              {t.order_id && (
                                <button
                                  onClick={() => openOrderDetails(t.order_id)}
                                  className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-all font-semibold"
                                  title="Détails commande"
                                >
                                  <ShoppingBag size={16} />
                                </button>
                              )}

                              <button 
                                onClick={() => handleOpenEdit(t)} 
                                className="p-2 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-all font-semibold"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button 
                                onClick={() => { setTransactionToDelete(t); setIsDeleteModalOpen(true); }} 
                                className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-all font-semibold"
                              >
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

      {/* --- ORDER DETAILS MODAL (NEW) --- */}
      {isOrderDetailsOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <ShoppingBag size={20} className="text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Détails Commande {selectedOrder ? `#${String(selectedOrder.id).slice(0,8).toUpperCase()}` : ''}</h2>
                  <p className="text-xs text-slate-500">{selectedOrder ? `Créée le ${new Date(selectedOrder.createdAt || selectedOrder.orderDate || '').toLocaleDateString('fr-FR')}` : ''}</p>
                </div>
              </div>
              <div className="flex gap-2 items-center">
                {isOrderLoading && <div className="text-sm text-slate-500">Chargement...</div>}
                <button onClick={closeOrderDetails} className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><X size={20} className="text-slate-600" /></button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {selectedOrder ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Client</span>
                      <p className="text-sm font-semibold text-slate-900">
                        {(clients ?? []).find((c: any) => c.id === selectedOrder.clientId)?.name || 'Inconnu'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date de livraison</span>
                      <p className="text-sm font-semibold text-slate-900">
                        {selectedOrder.deliveryDate ? new Date(selectedOrder.deliveryDate).toLocaleDateString('fr-FR') : 'Non définie'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Statut</span>
                      <p className="text-sm font-semibold text-slate-900">{selectedOrder.status || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="border border-slate-100 rounded-xl overflow-hidden">
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
                          const product = (clients ?? [], []).find(() => false); // placeholder to avoid lint; actual product lookup below
                          const productFromLists = (materials ?? []).find((m: any) => m.id === item.productId) || (/* @ts-ignore */ ( (orders as any[]), []).find(() => false) ) || (/* no product */ null);
                          const productName = (materials ?? []).find((m: any) => m.id === item.productId)?.name || (productFromLists && (productFromLists as any).name) || item.productId;
                          return (
                            <tr key={idx}>
                              <td className="px-4 py-3 font-medium text-slate-800">{productName}</td>
                              <td className="px-4 py-3 text-center text-slate-600">{item.quantity} {item.unit}</td>
                              <td className="px-4 py-3 text-right text-slate-600">{(item.unitPrice ?? 0).toLocaleString()} DA</td>
                              <td className="px-4 py-3 text-right font-bold text-slate-900">{(item.totalItemPrice ?? 0).toLocaleString()} DA</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-slate-50/50 font-bold">
                        <tr>
                          <td colSpan={3} className="px-4 py-3 text-right text-slate-600">Total Commande</td>
                          <td className="px-4 py-3 text-right text-indigo-600 text-lg">{(selectedOrder.totalPrice ?? 0).toLocaleString()} DA</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

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

      {/* MODAL FORM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl p-6 my-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {editingTransaction ? 'Modifier la transaction' : 'Nouvelle transaction'}
                </h3>
                <p className="text-sm text-slate-500 mt-1">Sélectionnez une catégorie et remplissez les informations</p>
              </div>
              <button onClick={handleCloseModal} className="p-2 hover:bg-slate-100 rounded-lg transition-all">
                <X size={20} className="text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* ... (le contenu du formulaire inchangé) */}
              {/* For brevity, the form markup is the same as before and omitted here — keep your existing form content */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isLoading || !formData.category}
                  className="flex-1 px-4 py-2.5 bg-[#6366F1] text-white rounded-xl text-sm font-semibold hover:bg-[#5558E3] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saveMutation.isLoading ? 'Enregistrement...' : (editingTransaction ? 'Mettre à jour' : 'Enregistrer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SUPPRESSION */}
      {isDeleteModalOpen && transactionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 text-center">
            <div className="mx-auto w-14 h-14 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-4">
              <AlertTriangle size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Supprimer la transaction ?</h3>
            <p className="text-sm text-slate-600 mb-4">
              Vous êtes sur le point de supprimer cette transaction. Cette action est irréversible.
            </p>
            <div className="p-4 bg-slate-50 rounded-xl mb-6 text-left">
              <p className="text-sm font-medium text-slate-900 mb-2">{transactionToDelete.description}</p>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">
                  {new Date(transactionToDelete.date).toLocaleDateString('fr-FR')}
                </span>
                <p className={`text-base font-bold ${transactionToDelete.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {transactionToDelete.type === TransactionType.INCOME ? '+' : '-'}
                  {transactionToDelete.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DA
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setIsDeleteModalOpen(false); setTransactionToDelete(null); }}
                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-all"
              >
                Annuler
              </button>
              <button
                onClick={() => deleteMutation.mutate(transactionToDelete.id)}
                disabled={deleteMutation.isLoading}
                className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 transition-all disabled:opacity-50"
              >
                {deleteMutation.isLoading ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionList;