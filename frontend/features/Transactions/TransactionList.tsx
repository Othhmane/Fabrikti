import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FabriktiService } from '../../api/services';
import { Card, Button } from '../../components/UI';
import { 
  Plus, Search, X, Calendar, DollarSign, 
  User, Truck, ShoppingBag, Layers, ExternalLink,
  Edit3, Trash2, AlertTriangle, Wallet, 
  ArrowUpCircle, ArrowDownCircle, FileText, Upload,
  Filter, RotateCcw, ChevronDown, Tag, Receipt,
  Clock, MapPin, Package, CheckCircle2
} from 'lucide-react';
import { TransactionType, PaymentStatus, Transaction } from '../../types';

type TransactionContext = 'ORDER' | 'MATERIAL' | 'CLIENT' | 'SUPPLIER' | 'OTHER';

// Catégories avec vrais icônes
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
    icon: Package, 
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    gradient: 'from-slate-500 to-gray-600',
    description: 'Transaction diverse'
  },
};

// Transactions par défaut pour démonstration
const DEFAULT_TRANSACTIONS: Partial<Transaction>[] = [
  {
    id: 'demo-1',
    type: TransactionType.INCOME,
    amount: 12500.00,
    description: 'Paiement facture #2024-001 - Projet Villa Moderne',
    category: 'CLIENT',
    status: PaymentStatus.PAYEE,
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    paymentMethod: 'Virement bancaire',
    reference: 'FAC-2024-001',
  },
  {
    id: 'demo-2',
    type: TransactionType.EXPENSE,
    amount: 3450.50,
    description: 'Achat ciment et béton - Livraison chantier Nord',
    category: 'SUPPLIER',
    status: PaymentStatus.PAYEE,
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    paymentMethod: 'Carte bancaire',
    reference: 'ACH-2024-045',
  },
  {
    id: 'demo-3',
    type: TransactionType.INCOME,
    amount: 8900.00,
    description: 'Acompte 30% - Commande rénovation appartement',
    category: 'ORDER',
    status: PaymentStatus.PAYEE,
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    paymentMethod: 'Chèque',
    reference: 'CMD-2024-128',
  },
  {
    id: 'demo-4',
    type: TransactionType.EXPENSE,
    amount: 1250.00,
    description: 'Achat outillage et équipement de sécurité',
    category: 'OTHER',
    status: PaymentStatus.PAYEE,
    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    paymentMethod: 'Espèces',
    reference: 'DIV-2024-012',
  },
  {
    id: 'demo-5',
    type: TransactionType.EXPENSE,
    amount: 5600.00,
    description: 'Stock matières premières - Briques et parpaings',
    category: 'MATERIAL',
    status: PaymentStatus.PAYEE,
    date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    paymentMethod: 'Virement bancaire',
    reference: 'MAT-2024-089',
  },
];

export const TransactionList: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [filterCategory, setFilterCategory] = useState<'all' | TransactionContext>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | PaymentStatus>('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterMinAmount, setFilterMinAmount] = useState('');
  const [filterMaxAmount, setFilterMaxAmount] = useState('');

  // Form state
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

  const { data: fetchedTransactions = [], isLoading } = useQuery({ 
    queryKey: ['transactions'], 
    queryFn: FabriktiService.getTransactions 
  });
  
  // Merge avec transactions par défaut si liste vide
  const transactions = useMemo(() => {
    if (fetchedTransactions.length === 0) {
      return DEFAULT_TRANSACTIONS as Transaction[];
    }
    return fetchedTransactions;
  }, [fetchedTransactions]);

  const { data: orders = [] } = useQuery({ queryKey: ['orders'], queryFn: FabriktiService.getOrders });
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: FabriktiService.getClients });
  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: FabriktiService.getSuppliers });
  const { data: materials = [] } = useQuery({ queryKey: ['materials'], queryFn: FabriktiService.getRawMaterials });

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Transaction>) => 
      data.id ? FabriktiService.save('transactions', data) : FabriktiService.addTransaction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      handleCloseModal();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => FabriktiService.delete('transactions', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setIsDeleteModalOpen(false);
      setTransactionToDelete(null);
    }
  });

  const handleOpenEdit = (t: Transaction) => {
    setEditingTransaction(t);
    setFormData({
      type: t.type,
      amount: t.amount.toString(),
      description: t.description,
      category: (t.category as TransactionContext) || '',
      date: t.date.split('T')[0],
      tiersId: t.orderId || t.clientId || t.supplierId || t.materialId || '',
      paymentMethod: t.paymentMethod || 'Virement bancaire',
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
      paymentMethod: formData.paymentMethod,
      reference: formData.reference,
      notes: formData.notes,
    };

    // Assign tiers based on category
    if (formData.category === 'ORDER') transactionData.orderId = formData.tiersId;
    else if (formData.category === 'CLIENT') transactionData.clientId = formData.tiersId;
    else if (formData.category === 'SUPPLIER') transactionData.supplierId = formData.tiersId;
    else if (formData.category === 'MATERIAL') transactionData.materialId = formData.tiersId;

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
        const client = clients.find(c => c.id === t.clientId);
        const supplier = suppliers.find(s => s.id === t.supplierId);
        const searchSource = `${t.description} ${client?.name || ''} ${supplier?.name || ''} ${t.reference || ''}`.toLowerCase();
        const matchesSearch = searchSource.includes(searchTerm.toLowerCase());
        
        const matchesType = filterType === 'all' || t.type === filterType;
        const matchesCategory = filterCategory === 'all' || t.category === filterCategory;
        const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
        const matchesPaymentMethod = filterPaymentMethod === 'all' || t.paymentMethod === filterPaymentMethod;
        
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
    if (t.clientId) {
      const c = clients.find(cli => cli.id === t.clientId);
      return { label: c?.name || 'Client', path: `/clients/${t.clientId}/history`, icon: <User size={14} /> };
    }
    if (t.supplierId) {
      const s = suppliers.find(sup => sup.id === t.supplierId);
      return { label: s?.name || 'Fournisseur', path: `/suppliers`, icon: <Truck size={14} /> };
    }
    if (t.orderId) {
      return { label: `CMD-${t.orderId.slice(0,8)}`, path: `/orders/${t.orderId}`, icon: <ShoppingBag size={14} /> };
    }
    if (t.materialId) {
      const m = materials.find(mat => mat.id === t.materialId);
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
        return orders.map(o => ({ value: o.id, label: `CMD-${o.id.slice(0,8)} (${o.totalPrice}€)` }));
      case 'MATERIAL':
        return materials.map(m => ({ value: m.id, label: m.name }));
      default:
        return [];
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'Virement bancaire': return '🏦';
      case 'Carte bancaire': return '💳';
      case 'Chèque': return '📝';
      case 'Espèces': return '💵';
      default: return '💰';
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Type de flux */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Type de flux</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm bg-white"
                  >
                    <option value="all">Tous</option>
                    <option value={TransactionType.INCOME}>💰 Encaissements</option>
                    <option value={TransactionType.EXPENSE}>💸 Décaissements</option>
                  </select>
                </div>

                {/* Catégorie */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Catégorie</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm bg-white"
                  >
                    <option value="all">Toutes</option>
                    {Object.entries(CATEGORIES).map(([key, cat]) => {
                      const IconComp = cat.icon;
                      return (
                        <option key={key} value={key}>
                          {cat.label}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Moyen de paiement */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Moyen de paiement</label>
                  <select
                    value={filterPaymentMethod}
                    onChange={(e) => setFilterPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm bg-white"
                  >
                    <option value="all">Tous</option>
                    <option value="Virement bancaire">🏦 Virement bancaire</option>
                    <option value="Carte bancaire">💳 Carte bancaire</option>
                    <option value="Chèque">📝 Chèque</option>
                    <option value="Espèces">💵 Espèces</option>
                  </select>
                </div>

                {/* Statut */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Statut</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm bg-white"
                  >
                    <option value="all">Tous</option>
                    <option value={PaymentStatus.PAYEE}>✅ Payé</option>
                    <option value={PaymentStatus.EN_ATTENTE}>⏳ En attente</option>
                    <option value={PaymentStatus.EN_RETARD}>⚠️ En retard</option>
                  </select>
                </div>

                {/* Date début */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Date début</label>
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm bg-white"
                  />
                </div>

                {/* Date fin */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Date fin</label>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm bg-white"
                  />
                </div>

                {/* Montant min */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Montant min (DA)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={filterMinAmount}
                    onChange={(e) => setFilterMinAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm bg-white"
                  />
                </div>

                {/* Montant max */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Montant max (DA)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={filterMaxAmount}
                    onChange={(e) => setFilterMaxAmount(e.target.value)}
                    placeholder="99999.99"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm bg-white"
                  />
                </div>
              </div>
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
              
              {/* CATEGORY SELECTION CARDS */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">
                  Catégorie de transaction *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {Object.entries(CATEGORIES).map(([key, cat]) => {
                    const IconComponent = cat.icon;
                    const isSelected = formData.category === key;
                    
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, category: key as TransactionContext, tiersId: '' }))}
                        className={`relative p-4 rounded-xl border-2 transition-all ${
                          isSelected 
                            ? 'border-indigo-500 bg-indigo-50 shadow-md' 
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                            <CheckCircle2 size={14} className="text-white" />
                          </div>
                        )}
                        <div className={`w-12 h-12 mx-auto mb-2 rounded-xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center`}>
                          <IconComponent size={24} className="text-white" />
                        </div>
                        <p className={`text-xs font-semibold text-center ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>
                          {cat.label}
                        </p>
                        <p className="text-[10px] text-slate-500 text-center mt-1">
                          {cat.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* DYNAMIC FORM BASED ON CATEGORY */}
              {formData.category && (
                <>
                  {/* Type & Date */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                        Type de flux *
                      </label>
                      <select 
                        value={formData.type}
                        onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as TransactionType }))}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        required
                      >
                        <option value={TransactionType.INCOME}>💰 Encaissement</option>
                        <option value={TransactionType.EXPENSE}>💸 Décaissement</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                        Date *
                      </label>
                      <input 
                        type="date" 
                        value={formData.date}
                        onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        required 
                      />
                    </div>
                  </div>

                  {/* Tiers selection (if not OTHER) */}
                  {formData.category !== 'OTHER' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                        {formData.category === 'CLIENT' && '👤 Partenaire associé'}
                        {formData.category === 'SUPPLIER' && '🚚 Fournisseur associé'}
                        {formData.category === 'ORDER' && '📦 Commande associée'}
                        {formData.category === 'MATERIAL' && '🧱 Matière première associée'}
                      </label>
                      <select 
                        value={formData.tiersId}
                        onChange={(e) => setFormData(prev => ({ ...prev, tiersId: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      >
                        <option value="">Aucun (optionnel)</option>
                        {getTiersOptions().map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Montant & Moyen de paiement */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                        Montant (DA) *
                      </label>
                      <div className="relative">
                        <DollarSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="number" 
                          step="0.01" 
                          value={formData.amount}
                          onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                          placeholder="0.00"
                          required 
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                        Moyen de paiement *
                      </label>
                      <select 
                        value={formData.paymentMethod}
                        onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        required
                      >

                        <option value="Espèces">💵 Espèces</option>
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                      Description *
                    </label>
                    <input 
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="ex: Paiement facture #2024-001, Achat matériel..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      required 
                    />
                  </div>

                  {/* Référence */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                      Référence / N° de facture
                    </label>
                    <div className="relative">
                      <Receipt size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text"
                        value={formData.reference}
                        onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                        placeholder="ex: FAC-2024-001"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                      Notes / Commentaires
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Informations complémentaires..."
                      rows={3}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
                    />
                  </div>
                </>
              )}

              {/* Actions */}
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
                  disabled={saveMutation.isPending || !formData.category}
                  className="flex-1 px-4 py-2.5 bg-[#6366F1] text-white rounded-xl text-sm font-semibold hover:bg-[#5558E3] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saveMutation.isPending ? 'Enregistrement...' : (editingTransaction ? 'Mettre à jour' : 'Enregistrer')}
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
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 transition-all disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};