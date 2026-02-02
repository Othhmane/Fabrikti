import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FabriktiService } from '../../api/services';
import { OrderStatus, PaymentStatus, Order, OrderItem } from '../../types';
import {
  Clock, Package, Truck, Database, Plus, Search,
  X, Ban, Trash2, Edit3, ShoppingCart, CheckCircle2,
  AlertTriangle, Printer, FileText, Info, User,
  Calendar, DollarSign, Filter, RotateCcw, ChevronDown, ChevronRight
} from 'lucide-react';

const STATUS_LABELS: Record<string, { label: string, bgColor: string, textColor: string, icon: any }> = {
  [OrderStatus.EN_ATTENTE]: {
    label: 'En attente',
    bgColor: 'bg-slate-100',
    textColor: 'text-slate-700',
    icon: <Clock size={12}/>
  },
  [OrderStatus.EN_PREPARATION]: {
    label: 'Préparation',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700',
    icon: <Package size={12}/>
  },
  [OrderStatus.EN_STOCK]: {
    label: 'En stock',
    bgColor: 'bg-indigo-100',
    textColor: 'text-indigo-700',
    icon: <Database size={12}/>
  },
  [OrderStatus.LIVREE]: {
    label: 'Livrée',
    bgColor: 'bg-emerald-100',
    textColor: 'text-emerald-700',
    icon: <CheckCircle2 size={12}/>
  },
  [OrderStatus.ANNULEE]: {
    label: 'Annulée',
    bgColor: 'bg-rose-100',
    textColor: 'text-rose-700',
    icon: <Ban size={12}/>
  },
};

const PAYMENT_LABELS: Record<string, { label: string, bgColor: string, textColor: string }> = {
  [PaymentStatus.PAYEE]: {
    label: 'Payée',
    bgColor: 'bg-emerald-100',
    textColor: 'text-emerald-700'
  },
  [PaymentStatus.PARTIEL]: {
    label: 'Partiel',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700'
  },
  [PaymentStatus.NON_PAYEE]: {
    label: 'Non payée',
    bgColor: 'bg-rose-50',
    textColor: 'text-rose-700'
  },
  [PaymentStatus.EN_DETTE]: {
    label: 'En dette',
    bgColor: 'bg-rose-100',
    textColor: 'text-rose-700'
  },
  [PaymentStatus.EN_PLUS]: {
    label: 'Crédit',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700'
  },
};

export const OrderManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<Order | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const [items, setItems] = useState<Partial<OrderItem>[]>([{ id: '1', productId: '', quantity: 1, unit: 'paire', unitPrice: 0, totalItemPrice: 0}]);
  const [advancePayment, setAdvancePayment] = useState<number>(0);
  const [selectedClientId, setSelectedClientId] = useState<string>(''); // Nouvel état pour le client sélectionné

  const { data: orders, isLoading } = useQuery({ queryKey: ['orders'], queryFn: FabriktiService.getOrders });
  const { data: clients } = useQuery({ queryKey: ['clients'], queryFn: FabriktiService.getClients });
  const { data: products } = useQuery({ queryKey: ['products'], queryFn: FabriktiService.getProducts });
  const { data: materials } = useQuery({ queryKey: ['materials'], queryFn: FabriktiService.getRawMaterials }); // Récupération des matières premières

  // Déterminer si le client sélectionné est un fournisseur
  const isSupplier = useMemo(() => {
    const client = clients?.find(c => c.id === selectedClientId);
    return client?.type === 'FOURNISSEUR';
  }, [selectedClientId, clients]);

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Order>) => FabriktiService.saveOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      handleCloseModal();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => FabriktiService.delete('orders', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setIsDeleteModalOpen(false);
      setOrderToDelete(null);
    }
  });

  const handleOpenCreate = () => {
    setEditingOrder(null);
    setSelectedClientId(''); // Réinitialiser le client sélectionné
    setItems([{ id: '1', productId: '', quantity: 1, unit: 'paire', unitPrice: 0, totalItemPrice: 0}]);
    setAdvancePayment(0);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (order: Order) => {
    setEditingOrder(order);
    setSelectedClientId(order.clientId); // Mettre à jour le client sélectionné
    setItems(order.items || []);
    setAdvancePayment(order.paidAmount || 0);
    setIsModalOpen(true);
  };

  const handleOpenPrint = (order: Order) => {
    setSelectedOrderForPrint(order);
    setIsPrintModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingOrder(null);
    setAdvancePayment(0);
    setSelectedClientId(''); // Réinitialiser le client sélectionné
  };

  const openDetailsModal = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailsModalOpen(true);
  };

  const closeDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedOrder(null);
  };

  const addLine = () => {
    setItems([...items, { id: Date.now().toString(), productId: '', quantity: 1, unit: 'paire', unitPrice: 0, totalItemPrice: 0}]);
  };

  const removeLine = (id: string) => {
    if (items.length > 1) setItems(items.filter(i => i.id !== id));
  };

  const updateLine = (id: string, field: keyof OrderItem, value: any) => {
    setItems(prevItems => prevItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'productId') {
          // Sélectionner dans la bonne liste selon le type de client
          const sourceList = isSupplier ? materials : products;
          const product = sourceList?.find(p => p.id === value);
          updated.unit = product?.unit || 'unité';
          updated.unitPrice = (product as any)?.pricePerUnit || 0;
        }
        updated.totalItemPrice = (updated.quantity || 0) * (updated.unitPrice || 0);
        return updated;
      }
      return item;
    }));
  };

  const totalOrderPrice = useMemo(() => items.reduce((sum, i) => sum + (i.totalItemPrice || 0), 0), [items]);
  const remainingAmount = useMemo(() => totalOrderPrice - advancePayment, [totalOrderPrice, advancePayment]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: Partial<Order> = {
      id: editingOrder?.id,
      clientId: formData.get('clientId') as string,
      orderDate: formData.get('orderDate') as string,
      deliveryDate: formData.get('deliveryDate') as string || undefined,
      status: (formData.get('status') as OrderStatus) || OrderStatus.EN_ATTENTE,
      items: items as OrderItem[],
      totalPrice: totalOrderPrice,
      paidAmount: advancePayment,
      paymentStatus: advancePayment >= totalOrderPrice 
        ? PaymentStatus.PAYEE 
        : advancePayment > 0 
          ? PaymentStatus.PARTIEL 
          : PaymentStatus.NON_PAYEE,
      notes: formData.get('notes') as string || undefined,
    };
    saveMutation.mutate(data);
  };

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter(order => {
      const client = clients?.find(c => c.id === order.clientId);
      const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) || client?.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
      const matchesPayment = filterPaymentStatus === 'all' || order.paymentStatus === filterPaymentStatus;
      return matchesSearch && matchesStatus && matchesPayment;
    }).sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  }, [orders, clients, searchTerm, filterStatus, filterPaymentStatus]);

  const resetFilters = () => {
    setFilterStatus('all');
    setFilterPaymentStatus('all');
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterStatus !== 'all') count++;
    if (filterPaymentStatus !== 'all') count++;
    return count;
  }, [filterStatus, filterPaymentStatus]);

  // Stats
  const stats = useMemo(() => {
    const total = filteredOrders.length;
    const totalAmount = filteredOrders.reduce((sum, o) => sum + o.totalPrice, 0);
    const delivered = filteredOrders.filter(o => o.status === OrderStatus.LIVREE).length;
    const pending = filteredOrders.filter(o => o.status === OrderStatus.EN_ATTENTE || o.status === OrderStatus.EN_PREPARATION).length;
    return { total, totalAmount, delivered, pending };
  }, [filteredOrders]);

  return (
    <div className="bg-[#F8F9FC] min-h-screen font-sans">
      {/* HEADER TITLE */}
      <div className="bg-white border-b border-slate-200 px-6 md:px-10 py-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900">Commandes Atelier</h1>
          <p className="text-sm text-slate-500 mt-2">Suivi de fabrication et bons de livraison</p>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="p-6 md:p-10">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* STATS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <ShoppingCart size={20} className="text-white" />
                </div>
                <span className="text-sm font-semibold text-slate-600">Total Commandes</span>
              </div>
              <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
              <p className="text-xs text-slate-500 mt-2">Toutes périodes</p>
            </div>

            <div className="bg-white border border-emerald-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <CheckCircle2 size={20} className="text-emerald-600" />
                </div>
                <span className="text-sm font-semibold text-emerald-900">Livrées</span>
              </div>
              <p className="text-3xl font-bold text-emerald-600">{stats.delivered}</p>
              <p className="text-xs text-emerald-700 mt-2">Commandes terminées</p>
            </div>

            <div className="bg-white border border-amber-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Clock size={20} className="text-amber-600" />
                </div>
                <span className="text-sm font-semibold text-amber-900">En cours</span>
              </div>
              <p className="text-3xl font-bold text-amber-600">{stats.pending}</p>
              <p className="text-xs text-amber-700 mt-2">À traiter</p>
            </div>

            <div className="bg-white border border-indigo-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <DollarSign size={20} className="text-indigo-600" />
                </div>
                <span className="text-sm font-semibold text-indigo-900">Montant Total</span>
              </div>
              <p className="text-3xl font-bold text-indigo-600">{stats.totalAmount.toLocaleString()} DA</p>
              <p className="text-xs text-indigo-700 mt-2">Chiffre d'affaires</p>
            </div>
          </div>

          {/* ACTIONS & SEARCH */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Rechercher par référence ou client..."
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
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#6366F1] text-white rounded-lg text-sm font-semibold hover:bg-[#5558E3] transition-all shadow-md hover:shadow-lg whitespace-nowrap"
            >
              <Plus size={18} />
              Nouveau Bon
            </button>
          </div>

          {/* ADVANCED FILTERS PANEL */}
          {showFilters && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Statut commande */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Statut de la commande</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm bg-white"
                  >
                    <option value="all">Tous les statuts</option>
                    {Object.values(OrderStatus).map(s => <option key={s} value={s}>{STATUS_LABELS[s]?.label || s}</option>)}
                  </select>
                </div>

                {/* Statut paiement */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Statut du paiement</label>
                  <select
                    value={filterPaymentStatus}
                    onChange={(e) => setFilterPaymentStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm bg-white"
                  >
                    <option value="all">Tous les paiements</option>
                    {Object.values(PaymentStatus).map(p => <option key={p} value={p}>{PAYMENT_LABELS[p]?.label || p}</option>)}
                  </select>
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
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Bon #</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Client</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Statut</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Paiement</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Montant</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center">
                          <ShoppingCart size={32} className="text-slate-300 mx-auto mb-3" />
                          <p className="text-slate-500 font-semibold">Aucune commande trouvée</p>
                          <p className="text-slate-400 text-sm mt-1">Essayez un autre terme de recherche</p>
                        </td>
                      </tr>
                    ) : filteredOrders.map(order => {
                      const client = clients?.find(c => c.id === order.clientId);
                      const statusConfig = STATUS_LABELS[order.status] || { label: order.status, bgColor: 'bg-slate-100', textColor: 'text-slate-700', icon: null };
                      const paymentConfig = PAYMENT_LABELS[order.paymentStatus] || { label: order.paymentStatus, bgColor: 'bg-slate-100', textColor: 'text-slate-700' };
                      return (
                        <tr key={order.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-slate-900">#{order.id.slice(0,8).toUpperCase()}</span>
                          </td>
                          <td className="px-6 py-4">
                            <Link to={`/clients/${order.clientId}/history`} className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline font-medium flex items-center gap-1.5">
                              <User size={14} />
                              {client?.name || 'Inconnu'}
                            </Link>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Calendar size={14} className="text-slate-400" />
                              <span className="text-sm text-slate-700">{new Date(order.orderDate).toLocaleDateString('fr-FR')}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor} whitespace-nowrap`}>
                              {statusConfig.icon}
                              {statusConfig.label}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${paymentConfig.bgColor} ${paymentConfig.textColor} whitespace-nowrap`}>
                              {paymentConfig.label}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-semibold text-slate-900">{order.totalPrice.toLocaleString()} DA</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              {/*  

                              <Link to={`/orders/${order.id}`}>
                                <button
                                  className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-all font-semibold"
                                  title="Voir Détails"
                                >
                                  <ChevronRight size={16} />
                                </button>
                              </Link>
                              */}
                              <button
                                onClick={() => handleOpenPrint(order)}
                                className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-all font-semibold"
                                title="Imprimer BC"
                              >
                                <Printer size={16} />
                              </button>
                              <button
                                onClick={() => openDetailsModal(order)}
                                className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-all font-semibold"
                                title="Détails"
                              >
                                <Info size={16} />
                              </button>
                              <button
                                onClick={() => handleOpenEdit(order)}
                                className="p-2 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-all font-semibold"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                onClick={() => { setOrderToDelete(order); setIsDeleteModalOpen(true); }}
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

      {/* MODAL CREATE/EDIT */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">
                {editingOrder ? 'Modifier la commande' : 'Nouvelle commande'}
              </h2>
              <button onClick={handleCloseModal} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={20} className="text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Client & Dates */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Client *</label>
                  <select
                    name="clientId"
                    required
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
                  >
                    <option value="">Sélectionner un client</option>
                    {clients?.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.type === 'FOURNISSEUR' ? 'Fournisseur' : 'Client'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Date commande *</label>
                  <input
                    type="date"
                    name="orderDate"
                    required
                    defaultValue={editingOrder?.orderDate || new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Livraison prévue</label>
                  <input
                    type="date"
                    name="deliveryDate"
                    defaultValue={editingOrder?.deliveryDate || ''}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Statut</label>
                <select
                  name="status"
                  defaultValue={editingOrder?.status || OrderStatus.EN_ATTENTE}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
                >
                  {Object.values(OrderStatus).map(s => <option key={s} value={s}>{STATUS_LABELS[s]?.label || s}</option>)}
                </select>
              </div>


              {/* Items */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {isSupplier ? 'Matières premières' : 'Articles'}
                  </label>
                  <button
                    type="button"
                    onClick={addLine}
                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-all"
                  >
                    <Plus size={14} />
                    Ajouter
                  </button>
                </div>
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div key={item.id} className="flex gap-2 items-start p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-2">
                        <select
                          value={item.productId || ''}
                          onChange={(e) => updateLine(item.id!, 'productId', e.target.value)}
                          className="px-2 py-1.5 rounded border border-slate-200 text-sm outline-none focus:border-indigo-500"
                        >
                          <option value="">
                            {isSupplier ? 'Sélectionner une matière première' : 'Sélectionner un produit'}
                          </option>
                          {isSupplier
                            ? materials?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)
                            : products?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                          }
                        </select>
                        <input
                          type="number"
                          placeholder="Qté"
                          value={item.quantity || ''}
                          onChange={(e) => updateLine(item.id!, 'quantity', parseFloat(e.target.value) || 0)}
                          className="px-2 py-1.5 rounded border border-slate-200 text-sm outline-none focus:border-indigo-500"
                        />
                        <input
                          type="text"
                          placeholder="Unité"
                          value={item.unit || ''}
                          onChange={(e) => updateLine(item.id!, 'unit', e.target.value)}
                          className="px-2 py-1.5 rounded border border-slate-200 text-sm outline-none focus:border-indigo-500"
                        />
                        <input
                          type="number"
                          placeholder="PU"
                          value={item.unitPrice || ''}
                          onChange={(e) => updateLine(item.id!, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="px-2 py-1.5 rounded border border-slate-200 text-sm outline-none focus:border-indigo-500"
                        />
                        <div className="px-2 py-1.5 bg-white rounded border border-slate-200 text-sm font-semibold text-slate-700">
                          {item.totalItemPrice?.toLocaleString() || 0} DA
                        </div>
                      </div>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLine(item.id!)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

              </div>

              {/* Advance Payment */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Versement</label>
                <div className="relative">
                  <DollarSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="number" 
                    step="1" 
                    value={advancePayment}
                    onChange={(e) => setAdvancePayment(parseFloat(e.target.value) || 0)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    placeholder="10 000 DA"
                  />
                </div>

              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Notes internes</label>
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={editingOrder?.notes || ''}
                  placeholder="Instructions pour l'atelier..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm resize-none"
                />
              </div>
                <div className="mt-3 flex justify-end">
                  <div className="px-4 py-2 bg-indigo-50 rounded-lg mr-2">
                    <span className="text-xs font-semibold text-indigo-900 uppercase tracking-wider mr-2">Total:</span>
                    <span className="text-lg font-bold text-indigo-600">{totalOrderPrice.toLocaleString()} DA</span>
                  </div>
                    <div className="px-4 py-2 bg-rose-50 rounded-lg">
                    <span className="text-xs font-semibold text-rose-900 uppercase tracking-wider mr-2">Reste à payer:</span>
                    <span className="text-lg font-bold text-rose-600">{remainingAmount.toLocaleString()} DA</span>
                  </div>
                </div>
              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50"
                >
                  {saveMutation.isPending ? 'Enregistrement...' : editingOrder ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DELETE */}
      {isDeleteModalOpen && orderToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center">
                <AlertTriangle size={24} className="text-rose-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Supprimer la commande</h2>
            </div>
            <p className="text-slate-600 mb-6">
              Êtes-vous sûr de vouloir supprimer la commande <strong>#{orderToDelete.id.slice(0,8).toUpperCase()}</strong> ? Cette action est irréversible.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setIsDeleteModalOpen(false); setOrderToDelete(null); }}
                className="px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-all"
              >
                Annuler
              </button>
              <button
                onClick={() => deleteMutation.mutate(orderToDelete.id)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold hover:bg-rose-700 transition-all disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

{/* MODAL PRINT - Devenu FICHE D'ATELIER / FABRICATION */}
{isPrintModalOpen && selectedOrderForPrint && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-10">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center print:hidden">
        <h2 className="text-xl font-bold text-slate-900">Fiche de Fabrication</h2>
        <button onClick={() => setIsPrintModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <X size={20} className="text-slate-600" />
        </button>
      </div>
      
      <div className="p-8 space-y-8 print:p-0">
        {/* EN-TÊTE TECHNIQUE */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter">FICHE ATELIER</h1>

          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-2 text-slate-600 mb-1">
              <Calendar size={16} />
              <span className="text-sm font-semibold">Date: {new Date(selectedOrderForPrint.orderDate).toLocaleDateString('fr-FR')}</span>
            </div>
            <div className="flex items-center justify-end gap-2 text-indigo-600">
              <Truck size={16} />
              <span className="text-sm font-bold">Livraison {selectedOrderForPrint.deliveryDate ? new Date(selectedOrderForPrint.deliveryDate).toLocaleDateString('fr-FR') : ''}</span>
            </div>
          </div>
        </div>

        {/* INFOS CLIENT & STATUT */}
        <div className="grid grid-cols-2 gap-8">
          <div className="border-l-4 border-slate-200 pl-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Destinataire / Client</h3>
            <p className="text-5xl font-bold text-slate-900">{clients?.find(c => c.id === selectedOrderForPrint.clientId)?.name}</p>
          </div>

        </div>

        {/* TABLEAU DE FABRICATION (SANS PRIX) */}
        <div>
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Package size={18} />
            LISTE DES ARTICLES À FABRIQUER
          </h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-100 border-y-2 border-slate-900">
                <th className="px-4 py-3 text-left text-sm font-black text-slate-900">RÉFÉRENCE / PRODUIT</th>
                <th className="px-4 py-3 text-center text-sm font-black text-slate-900 w-32">QUANTITÉ</th>
                <th className="px-4 py-3 text-center text-sm font-black text-slate-900 w-32">UNITÉ</th>
                <th className="px-4 py-3 text-center text-sm font-black text-slate-900 w-20">PRÊT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {selectedOrderForPrint.items?.map((item, idx) => {
                const p = products?.find(prod => prod.id === item.productId);
                return (
                  <tr key={idx} className="border-b border-slate-100">
                    <td className="px-4 py-4">
                      <p className="text-2xl font-bold text-lg text-slate-900">{p?.name || 'Produit Inconnu'}</p>
                      <p className="text-xs text-slate-500 font-mono">ID: {p?.reference || 'N/A'}</p>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-2xl font-black text-slate-900">{item.quantity}</span>
                    </td>
                    <td className="px-4 py-4 text-center text-slate-600 font-medium uppercase text-sm">
                      {item.unit}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="w-6 h-6 border-2 border-slate-300 rounded mx-auto"></div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* INSTRUCTIONS SPÉCIALES (TRÈS VISIBLES) */}
        <div className="bg-slate-50 border-2 border-dashed border-slate-300 p-1 rounded-xl">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Info size={18} className="text-amber-500" />
            INSTRUCTIONS DE FABRICATION / NOTES
          </h3>
          <p className="text-xl text-slate-800 font-medium leading-relaxed italic">
            {selectedOrderForPrint.notes || "Aucune instruction particulière pour cette commande."}
          </p>
        </div>


        {/* BOUTONS ACTIONS (CACHÉS À L'IMPRESSION) */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 print:hidden">
          <button
            onClick={() => setIsPrintModalOpen(false)}
            className="px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-all"
          >
            Fermer
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-800 transition-all shadow-lg"
          >
            <Printer size={18} />
            Lancer la fabrication
          </button>
        </div>
      </div>
    </div>
  </div>
)}

{/* MODAL DETAILS */}
{isDetailsModalOpen && selectedOrder && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-900">Détails de la commande #{selectedOrder.id.slice(0,8).toUpperCase()}</h2>
        <button onClick={closeDetailsModal} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <X size={20} className="text-slate-600" />
        </button>
      </div>
      
      <div className="p-6 space-y-6">
        {/* EN-TÊTE PRINCIPALE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Client</p>
            <p className="font-bold text-slate-900">{clients?.find(c => c.id === selectedOrder.clientId)?.name}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Date commande</p>
            <p className="font-bold text-slate-900">{new Date(selectedOrder.orderDate).toLocaleDateString('fr-FR')}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Livraison prévue</p>
            <p className="font-bold text-slate-900">
              {selectedOrder.deliveryDate 
                ? new Date(selectedOrder.deliveryDate).toLocaleDateString('fr-FR') 
                : 'Non définie'}
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Référence</p>
            <p className="font-mono font-bold text-slate-900">#{selectedOrder.id.slice(0,8).toUpperCase()}</p>
          </div>
        </div>

        {/* STATUTS & PAIEMENT */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-indigo-900 uppercase tracking-wider mb-1">Statut actuel</p>
                <div className="flex items-center gap-2 mt-1">
                  {(() => {
                    const config = STATUS_LABELS[selectedOrder.status];
                    return (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${config.bgColor} ${config.textColor}`}>
                        {config.icon}
                        {config.label}
                      </span>
                    );
                  })()}
                </div>
              </div>
              <button 
                onClick={() => setIsStatusModalOpen(true)}
                className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded transition-colors"
                title="Modifier le statut"
              >
                <Edit3 size={16} />
              </button>
            </div>
          </div>
          <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <p className="text-xs font-semibold text-emerald-900 uppercase tracking-wider mb-1">Statut paiement</p>
            <div className="flex items-center gap-2 mt-1">
              {(() => {
                const config = PAYMENT_LABELS[selectedOrder.paymentStatus];
                return (
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${config.bgColor} ${config.textColor}`}>
                    {config.label}
                  </span>
                );
              })()}
            </div>
          </div>
        </div>

        {/* ARTICLES */}
        <div>
          <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Package size={14} />
            Articles commandés ({selectedOrder.items?.length || 0})
          </h3>
          <div className="space-y-3">
            {selectedOrder.items?.map((item, idx) => {
              const product = products?.find(p => p.id === item.productId);
              return (
                <div key={idx} className="flex justify-between items-center p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{product?.name || 'Produit inconnu'}</p>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-600">
                      <span>{item.quantity} {item.unit}</span>
                      <span>× {item.unitPrice?.toLocaleString()} DA</span>
                      {product && (
                        <span className="bg-slate-100 px-2 py-0.5 rounded">
                          Ref: {product.reference}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">{item.totalItemPrice?.toLocaleString()} DA</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* MONTANT TOTAL */}
        <div className="p-5 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl text-white shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium opacity-90">Montant total</p>
              <p className="text-2xl font-bold mt-1">{selectedOrder.totalPrice.toLocaleString()} DA</p>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-80">Payé: {selectedOrder.paidAmount?.toLocaleString() || 0} DA</p>
              <p className="text-xs mt-1">
                Reste: <span className="font-bold">
                  {(selectedOrder.totalPrice - (selectedOrder.paidAmount || 0)).toLocaleString()} DA
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* NOTES INTERNES */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-2">
              <Info size={14} />
              Notes internes
            </h3>
            <button 
              onClick={() => setIsNotesModalOpen(true)}
              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition-colors"
              title="Modifier les notes"
            >
              <Edit3 size={14} />
            </button>
          </div>
          {selectedOrder.notes ? (
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-amber-900 whitespace-pre-line">{selectedOrder.notes}</p>
            </div>
          ) : (
            <button
              onClick={() => setIsNotesModalOpen(true)}
              className="w-full text-left p-4 bg-slate-50 rounded-lg border border-dashed border-slate-200 hover:bg-slate-100 transition-colors"
            >
              <p className="text-slate-500 italic text-sm text-center">
                + Ajouter des notes internes
              </p>
            </button>
          )}
        </div>

        {/* TIMELINE DES ÉTAPES (SIMULÉE) */}
        <div>
          <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Clock size={14} />
            Historique des étapes
          </h3>
          <div className="space-y-4">
            {[
              { date: selectedOrder.orderDate, status: 'Commande créée', icon: <Plus size={14} /> },
              ...(selectedOrder.status === OrderStatus.EN_PREPARATION ? [{ date: '', status: 'En préparation', icon: <Package size={14} /> }] : []),
              ...(selectedOrder.status === OrderStatus.EN_STOCK ? [{ date: '', status: 'En stock', icon: <Database size={14} /> }] : []),
              ...(selectedOrder.status === OrderStatus.LIVREE ? [{ date: selectedOrder.deliveryDate, status: 'Livrée', icon: <Truck size={14} /> }] : []),
              ...(selectedOrder.status === OrderStatus.ANNULEE ? [{ date: '', status: 'Annulée', icon: <Ban size={14} /> }] : [])
            ]
              .filter(Boolean)
              .map((step: any, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                      {step.icon}
                    </div>
                    {idx < 3 && <div className="w-0.5 h-full bg-slate-200 my-1"></div>}
                  </div>
                  <div className="pb-2">
                    <p className="font-medium text-slate-900">{step.status}</p>
                    {step.date && (
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(step.date).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* BOUTONS ACTIONS */}
        <div className="flex justify-center gap-3 pt-4 border-t border-slate-200">
          <button
            onClick={closeDetailsModal}
            className="px-8 py-4 text-slate-700 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-indigo-600 hover:text-white transition-all"
          >
            Fermer
          </button>
          {/*
          <Link to={`/orders/${selectedOrder.id}`} className="ml-auto">
            <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all">
              <FileText size={16} />
              Voir détails complets
            </button>
          </Link>
          */}
        </div>
      </div>
    </div>
  </div>
)}

{/* MODAL MODIFICATION STATUT */}
{isStatusModalOpen && selectedOrder && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
      <div className="border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-900">Modifier le statut</h3>
        <button 
          onClick={() => setIsStatusModalOpen(false)}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X size={20} className="text-slate-600" />
        </button>
      </div>
      
      <div className="p-6">
        <div className="space-y-3">
          {Object.values(OrderStatus).map(status => {
            const config = STATUS_LABELS[status];
            return (
              <button
                key={status}
                onClick={() => {
                  saveMutation.mutate({
                    id: selectedOrder.id,
                    status: status
                  });
                  setIsStatusModalOpen(false);
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                  selectedOrder.status === status
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  selectedOrder.status === status 
                    ? 'bg-indigo-500 text-white' 
                    : `${config.bgColor} ${config.textColor}`
                }`}>
                  {config.icon}
                </div>
                <span className={`font-medium ${
                  selectedOrder.status === status 
                    ? 'text-indigo-700' 
                    : 'text-slate-700'
                }`}>
                  {config.label}
                </span>
                {selectedOrder.status === status && (
                  <CheckCircle2 size={18} className="ml-auto text-indigo-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  </div>
)}

{/* MODAL MODIFICATION NOTES */}
{isNotesModalOpen && selectedOrder && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
      <div className="border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-900">Notes internes</h3>
        <button 
          onClick={() => setIsNotesModalOpen(false)}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X size={20} className="text-slate-600" />
        </button>
      </div>
      
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.target as HTMLFormElement);
          saveMutation.mutate({
            id: selectedOrder.id,
            notes: formData.get('notes') as string
          });
          setIsNotesModalOpen(false);
        }}
        className="p-6 space-y-4"
      >
        <div>
          <textarea
            name="notes"
            defaultValue={selectedOrder.notes || ''}
            rows={5}
            placeholder="Instructions pour l'atelier, détails spécifiques..."
            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm resize-none"
          />
        </div>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setIsNotesModalOpen(false)}
            className="px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-all"
          >
            Annuler
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all"
          >
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  </div>
)}
    </div>
  );
};