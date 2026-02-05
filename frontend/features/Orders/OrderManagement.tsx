// OrderManagement.tsx
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '../../api/supabase'; // <-- adapte le chemin si besoin
import { OrderStatus, PaymentStatus, Order, OrderItem } from '../../types';
import {
  Clock, Package, Truck, Database, Plus, Search,
  X, Ban, Trash2, Edit3, ShoppingCart, CheckCircle2,
  AlertTriangle, Printer, FileText, Info, User,
  Calendar, DollarSign, Filter, RotateCcw, ChevronDown, ChevronRight
} from 'lucide-react';

/* ---------- Labels ---------- */
const STATUS_LABELS: Record<string, { label: string, bgColor: string, textColor: string, icon: any }> = {
  [OrderStatus.EN_ATTENTE]: { label: 'En attente', bgColor: 'bg-slate-100', textColor: 'text-slate-700', icon: <Clock size={12}/> },
  [OrderStatus.EN_PREPARATION]: { label: 'Préparation', bgColor: 'bg-amber-100', textColor: 'text-amber-700', icon: <Package size={12}/> },
  [OrderStatus.EN_STOCK]: { label: 'En stock', bgColor: 'bg-indigo-100', textColor: 'text-indigo-700', icon: <Database size={12}/> },
  [OrderStatus.LIVREE]: { label: 'Livrée', bgColor: 'bg-emerald-100', textColor: 'text-emerald-700', icon: <CheckCircle2 size={12}/> },
  [OrderStatus.ANNULEE]: { label: 'Annulée', bgColor: 'bg-rose-100', textColor: 'text-rose-700', icon: <Ban size={12}/> },
};

const PAYMENT_LABELS: Record<string, { label: string, bgColor: string, textColor: string }> = {
  [PaymentStatus.PAYEE]: { label: 'Payée', bgColor: 'bg-emerald-100', textColor: 'text-emerald-700' },
  [PaymentStatus.PARTIEL]: { label: 'Partiel', bgColor: 'bg-amber-100', textColor: 'text-amber-700' },
  [PaymentStatus.NON_PAYEE]: { label: 'Non payée', bgColor: 'bg-rose-50', textColor: 'text-rose-700' },
  [PaymentStatus.EN_DETTE]: { label: 'En dette', bgColor: 'bg-rose-100', textColor: 'text-rose-700' },
  [PaymentStatus.EN_PLUS]: { label: 'Crédit', bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
};

/* ---------- Mappers (DB -> UI) ---------- */
const mapOrderRowToOrder = (row: any): Order => ({
  id: row.id,
  clientId: row.client_id,
  orderDate: row.order_date,
  deliveryDate: row.delivery_date,
  status: row.status,
  totalPrice: Number(row.total_price ?? 0),
  paidAmount: Number(row.paid_amount ?? 0),
  paymentStatus: row.payment_status,
  notes: row.notes,
  createdAt: row.created_at,
  items: (row.order_items ?? []).map((it: any) => ({
    id: it.id,
    productId: it.product_id,
    quantity: Number(it.quantity ?? 0),
    unit: it.unit,
    unitPrice: Number(it.unit_price ?? 0),
    totalItemPrice: Number(it.total_item_price ?? 0),
  })) as OrderItem[]
});

const mapProductRow = (row: any) => ({
  id: row.id,
  name: row.name,
  unit: row.unit,
  pricePerUnit: Number((row.price_per_unit ?? row.price) || 0),
  reference: row.reference ?? '',
});

const mapMaterialRow = (row: any) => ({
  id: row.id,
  name: row.name,
  unit: row.unit,
  pricePerUnit: Number((row.price_per_unit ?? row.price) || 0),
  stock: Number(row.stock ?? 0),
  supplierId: row.supplier_id ?? null,
});

/* ---------- Supabase ops ---------- */

const fetchOrders = async (): Promise<Order[]> => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('order_date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapOrderRowToOrder);
};

const fetchClients = async () => {
  const { data, error } = await supabase.from('clients').select('*').order('name', { ascending: true });
  if (error) throw error;
  return data;
};

const fetchProducts = async () => {
  const { data, error } = await supabase.from('products').select('*').order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapProductRow);
};

const fetchMaterials = async () => {
  const { data, error } = await supabase.from('materials').select('*').order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapMaterialRow);
};


const saveOrderSupabase = async (order: Partial<Order>) => {
  const dbOrder = {
    client_id: order.clientId,
    order_date: order.orderDate,
    delivery_date: order.deliveryDate ?? null,
    status: order.status ?? OrderStatus.EN_ATTENTE,
    total_price: order.totalPrice ?? 0,
    paid_amount: order.paidAmount ?? 0,
    payment_status: order.paymentStatus ?? PaymentStatus.NON_PAYEE,
    notes: order.notes ?? null,
  };

  if (order.id) {
    // Mise à jour commande
    const { error: updErr } = await supabase.from('orders').update(dbOrder).eq('id', order.id);
    if (updErr) throw updErr;

    // Suppression anciens order_items (déclenche trigger delete)
    const { error: delErr } = await supabase.from('order_items').delete().eq('order_id', order.id);
    if (delErr) throw delErr;

    // Insertion nouveaux order_items (déclenche trigger insert)
    if (order.items && order.items.length > 0) {
      const rows = order.items.map(it => ({
        order_id: order.id,
        product_id: it.productId,
        quantity: it.quantity ?? 0,
        unit: it.unit ?? 'unité',
        unit_price: it.unitPrice ?? 0,
        total_item_price: it.totalItemPrice ?? ((it.quantity ?? 0) * (it.unitPrice ?? 0)),
      }));
      const { error: insErr } = await supabase.from('order_items').insert(rows);
      if (insErr) throw insErr;
    }

    return { id: order.id };
  } else {
    // Création nouvelle commande
    const { data: inserted, error: insErr } = await supabase.from('orders').insert([dbOrder]).select().single();
    if (insErr) throw insErr;
    const orderId = inserted.id;

    // Insertion order_items
    if (order.items && order.items.length > 0) {
      const rows = order.items.map(it => ({
        order_id: orderId,
        product_id: it.productId,
        quantity: it.quantity ?? 0,
        unit: it.unit ?? 'unité',
        unit_price: it.unitPrice ?? 0,
        total_item_price: it.totalItemPrice ?? ((it.quantity ?? 0) * (it.unitPrice ?? 0)),
      }));
      const { error: insItemsErr } = await supabase.from('order_items').insert(rows);
      if (insItemsErr) throw insItemsErr;
    }

    return { id: orderId };
  }
};



const deleteOrderSupabase = async (id: string) => {
  const { error } = await supabase.from('orders').delete().eq('id', id);
  if (error) throw error;
  return true;
};

/* ---------- Component ---------- */

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

  const [items, setItems] = useState<Partial<OrderItem>[]>([{ id: '1', productId: '', quantity: 1, unit: 'paire', unitPrice: 0, totalItemPrice: 0 }]);
  const [advancePayment, setAdvancePayment] = useState<number>(0);
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  const { data: orders, isLoading } = useQuery({ queryKey: ['orders'], queryFn: fetchOrders });
  const { data: clients } = useQuery({ queryKey: ['clients'], queryFn: fetchClients });
  const { data: products } = useQuery({ queryKey: ['products'], queryFn: fetchProducts });
  const { data: materials } = useQuery({ queryKey: ['materials'], queryFn: fetchMaterials });

  const isSupplier = useMemo(() => {
    const client = (clients ?? []).find((c: any) => c.id === selectedClientId);
    return client?.type === 'FOURNISSEUR';
  }, [selectedClientId, clients]);

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);

const saveMutation = useMutation({
  mutationFn: (data: Partial<Order>) => saveOrderSupabase(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    handleCloseModal();
  },
  onError: (error: any) => {
    alert('Erreur lors de la sauvegarde : ' + (error.message || 'Stock insuffisant ou autre erreur'));
  }
});

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteOrderSupabase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setIsDeleteModalOpen(false);
      setOrderToDelete(null);
    }
  });

  const handleOpenCreate = () => {
    setEditingOrder(null);
    setSelectedClientId('');
    setItems([{ id: '1', productId: '', quantity: 1, unit: 'paire', unitPrice: 0, totalItemPrice: 0 }]);
    setAdvancePayment(0);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (order: Order) => {
    setEditingOrder(order);
    setSelectedClientId(order.clientId);
    setItems(order.items?.map(it => ({ ...it })) ?? [{ id: '1', productId: '', quantity: 1, unit: 'paire', unitPrice: 0, totalItemPrice: 0 }]);
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
    setSelectedClientId('');
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
    setItems(prev => [...prev, { id: Date.now().toString(), productId: '', quantity: 1, unit: 'paire', unitPrice: 0, totalItemPrice: 0 }]);
  };

  const removeLine = (id: string) => {
    if (items.length > 1) setItems(items.filter(i => i.id !== id));
  };

  const updateLine = (id: string, field: keyof OrderItem, value: any) => {
    setItems(prevItems => prevItems.map(item => {
      if (item.id === id) {
        const updated: any = { ...item, [field]: value };
        if (field === 'productId') {
          const sourceList = isSupplier ? materials : products;
          const product = (sourceList ?? []).find((p: any) => p.id === value);
          updated.unit = product?.unit || 'unité';
          updated.unitPrice = (product as any)?.pricePerUnit ?? 0;
        }
        updated.totalItemPrice = (Number(updated.quantity ?? 0) * Number(updated.unitPrice ?? 0));
        return updated;
      }
      return item;
    }));
  };

  const totalOrderPrice = useMemo(() => items.reduce((sum, i) => sum + (i.totalItemPrice || 0), 0), [items]);
  const remainingAmount = useMemo(() => totalOrderPrice - advancePayment, [totalOrderPrice, advancePayment]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const data: Partial<Order> = {
      id: editingOrder?.id,
      clientId: selectedClientId,
      orderDate: (e.currentTarget.elements.namedItem('orderDate') as HTMLInputElement).value,
      deliveryDate: (e.currentTarget.elements.namedItem('deliveryDate') as HTMLInputElement)?.value || undefined,
      status: (e.currentTarget.elements.namedItem('status') as HTMLSelectElement).value as OrderStatus || OrderStatus.EN_ATTENTE,
      items: items as OrderItem[],
      totalPrice: totalOrderPrice,
      paidAmount: advancePayment,
      paymentStatus: advancePayment >= totalOrderPrice ? PaymentStatus.PAYEE : advancePayment > 0 ? PaymentStatus.PARTIEL : PaymentStatus.NON_PAYEE,
      notes: (e.currentTarget.elements.namedItem('notes') as HTMLTextAreaElement).value || undefined,
    };

    saveMutation.mutate(data);
  };

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter(order => {
      const client = (clients ?? []).find((c: any) => c.id === order.clientId);
      const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) || (client?.name ?? '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
      const matchesPayment = filterPaymentStatus === 'all' || order.paymentStatus === filterPaymentStatus;
      return matchesSearch && matchesStatus && matchesPayment;
    }).sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  }, [orders, clients, searchTerm, filterStatus, filterPaymentStatus]);

  const resetFilters = () => { setFilterStatus('all'); setFilterPaymentStatus('all'); };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterStatus !== 'all') count++;
    if (filterPaymentStatus !== 'all') count++;
    return count;
  }, [filterStatus, filterPaymentStatus]);

  // Stats
  const stats = useMemo(() => {
    const total = filteredOrders.length;
    const totalAmount = filteredOrders.reduce((sum, o) => sum + (o.totalPrice ?? 0), 0);
    const delivered = filteredOrders.filter(o => o.status === OrderStatus.LIVREE).length;
    const pending = filteredOrders.filter(o => [OrderStatus.EN_ATTENTE, OrderStatus.EN_PREPARATION].includes(o.status)).length;
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
                  showFilters ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Filter size={18} />
                Filtres
                {activeFiltersCount > 0 && <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs font-bold">{activeFiltersCount}</span>}
                <ChevronDown size={16} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
              {activeFiltersCount > 0 && (
                <button onClick={resetFilters} className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-slate-200" title="Réinitialiser les filtres">
                  <RotateCcw size={18} />
                </button>
              )}
            </div>
            <button onClick={handleOpenCreate} className="flex items-center gap-2 px-5 py-2.5 bg-[#6366F1] text-white rounded-lg text-sm font-semibold hover:bg-[#5558E3] transition-all shadow-md hover:shadow-lg whitespace-nowrap">
              <Plus size={18} />
              Nouveau Bon
            </button>
          </div>

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
                      const client = (clients ?? []).find((c: any) => c.id === order.clientId);
                      const statusConfig = STATUS_LABELS[order.status] || { label: order.status, bgColor: 'bg-slate-100', textColor: 'text-slate-700', icon: null };
                      const paymentConfig = PAYMENT_LABELS[order.paymentStatus] || { label: order.paymentStatus, bgColor: 'bg-slate-100', textColor: 'text-slate-700' };
                      return (
                        <tr key={order.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4"><span className="text-sm font-medium text-slate-900">#{order.id.slice(0,8).toUpperCase()}</span></td>
                          <td className="px-6 py-4">
                            <Link to={`/clients/${order.clientId}/history`} className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline font-medium flex items-center gap-1.5">
                              <User size={14} />
                              {client?.name || 'Inconnu'}
                            </Link>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2"><Calendar size={14} className="text-slate-400" /><span className="text-sm text-slate-700">{new Date(order.orderDate).toLocaleDateString('fr-FR')}</span></div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor} whitespace-nowrap`}>{statusConfig.icon}{statusConfig.label}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${paymentConfig.bgColor} ${paymentConfig.textColor} whitespace-nowrap`}>{paymentConfig.label}</span>
                          </td>
                          <td className="px-6 py-4"><span className="text-sm font-semibold text-slate-900">{(order.totalPrice ?? 0).toLocaleString()} DA</span></td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => handleOpenPrint(order)} className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-all font-semibold" title="Imprimer BC"><Printer size={16} /></button>
                              <button onClick={() => openDetailsModal(order)} className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-all font-semibold" title="Détails"><Info size={16} /></button>
                              <button onClick={() => handleOpenEdit(order)} className="p-2 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-all font-semibold"><Edit3 size={16} /></button>
                              <button onClick={() => { setOrderToDelete(order); setIsDeleteModalOpen(true); }} className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-all font-semibold"><Trash2 size={16} /></button>
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

      {/* CREATE/EDIT modal: identical markup, uses saveMutation.isLoading */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">{editingOrder ? 'Modifier la commande' : 'Nouvelle commande'}</h2>
              <button onClick={handleCloseModal} className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><X size={20} className="text-slate-600" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Client & Dates */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Client *</label>
                  <select name="clientId" required value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm">
                    <option value="">Sélectionner un client</option>
                    {clients?.map((c: any) => (<option key={c.id} value={c.id}>{c.name} ({c.type === 'FOURNISSEUR' ? 'Fournisseur' : 'Client'})</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Date commande *</label>
                  <input type="date" name="orderDate" required defaultValue={editingOrder?.orderDate || new Date().toISOString().split('T')[0]} className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Livraison prévue</label>
                  <input type="date" name="deliveryDate" defaultValue={editingOrder?.deliveryDate || ''} className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm" />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Statut</label>
                <select name="status" defaultValue={editingOrder?.status || OrderStatus.EN_ATTENTE} className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm">
                  {Object.values(OrderStatus).map(s => <option key={s} value={s}>{STATUS_LABELS[s]?.label || s}</option>)}
                </select>
              </div>

              {/* Items */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">{isSupplier ? 'Matières premières' : 'Articles'}</label>
                  <button type="button" onClick={addLine} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-all"><Plus size={14} />Ajouter</button>
                </div>
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div key={item.id} className="flex gap-2 items-start p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-2">
                        <select value={item.productId || ''} onChange={(e) => updateLine(item.id!, 'productId', e.target.value)} className="px-2 py-1.5 rounded border border-slate-200 text-sm outline-none focus:border-indigo-500">
                          <option value="">{isSupplier ? 'Sélectionner une matière première' : 'Sélectionner un produit'}</option>
                          {isSupplier ? materials?.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>) : products?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <input type="number" placeholder="Qté" value={item.quantity ?? ''} onChange={(e) => updateLine(item.id!, 'quantity', parseFloat(e.target.value) || 0)} className="px-2 py-1.5 rounded border border-slate-200 text-sm outline-none focus:border-indigo-500" />
                        <input type="text" placeholder="Unité" value={item.unit ?? ''} onChange={(e) => updateLine(item.id!, 'unit', e.target.value)} className="px-2 py-1.5 rounded border border-slate-200 text-sm outline-none focus:border-indigo-500" />
                        <input type="number" placeholder="PU" value={item.unitPrice ?? ''} onChange={(e) => updateLine(item.id!, 'unitPrice', parseFloat(e.target.value) || 0)} className="px-2 py-1.5 rounded border border-slate-200 text-sm outline-none focus:border-indigo-500" />
                        <div className="px-2 py-1.5 bg-white rounded border border-slate-200 text-sm font-semibold text-slate-700">{(item.totalItemPrice ?? 0).toLocaleString()} DA</div>
                      </div>
                      {items.length > 1 && <button type="button" onClick={() => removeLine(item.id!)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-colors"><X size={16} /></button>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Advance Payment */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Versement</label>
                <div className="relative">
                  <DollarSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="number" step="1" value={advancePayment} onChange={(e) => setAdvancePayment(parseFloat(e.target.value) || 0)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" placeholder="10 000 DA" />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Notes internes</label>
                <textarea name="notes" rows={3} defaultValue={editingOrder?.notes || ''} placeholder="Instructions pour l'atelier..." className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm resize-none" />
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
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-all">Annuler</button>
                <button type="submit" disabled={saveMutation.isLoading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50">
                  {saveMutation.isLoading ? 'Enregistrement...' : editingOrder ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE modal */}
      {isDeleteModalOpen && orderToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center">
                <AlertTriangle size={24} className="text-rose-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Supprimer la commande</h2>
            </div>
            <p className="text-slate-600 mb-6">Êtes-vous sûr de vouloir supprimer la commande <strong>#{orderToDelete.id.slice(0,8).toUpperCase()}</strong> ? Cette action est irréversible.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setIsDeleteModalOpen(false); setOrderToDelete(null); }} className="px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-all">Annuler</button>
              <button onClick={() => deleteMutation.mutate(orderToDelete.id)} disabled={deleteMutation.isLoading} className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold hover:bg-rose-700 transition-all disabled:opacity-50">{deleteMutation.isLoading ? 'Suppression...' : 'Supprimer'}</button>
            </div>
          </div>
        </div>
      )}

      {/* DETAILS MODAL */}
      {isDetailsModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <FileText size={20} className="text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Détails Commande #{selectedOrder.id.slice(0,8).toUpperCase()}</h2>
                  <p className="text-xs text-slate-500">Créée le {new Date(selectedOrder.createdAt || '').toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
              <button onClick={closeDetailsModal} className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><X size={20} className="text-slate-600" /></button>
            </div>

            <div className="p-6 space-y-8">
              {/* Infos Client & Statut */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Client</span>
                  <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <User size={14} className="text-indigo-500" />
                    {(clients ?? []).find((c: any) => c.id === selectedOrder.clientId)?.name || 'Inconnu'}
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
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${STATUS_LABELS[selectedOrder.status]?.bgColor} ${STATUS_LABELS[selectedOrder.status]?.textColor}`}>
                      {STATUS_LABELS[selectedOrder.status]?.icon}
                      {STATUS_LABELS[selectedOrder.status]?.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Table des Articles */}
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
                      const product = (products ?? []).find((p: any) => p.id === item.productId) || (materials ?? []).find((m: any) => m.id === item.productId);
                      return (
                        <tr key={idx}>
                          <td className="px-4 py-3 font-medium text-slate-800">{product?.name || 'Produit inconnu'}</td>
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

              {/* Paiement & Notes */}
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
                      <span className="font-bold text-rose-600">{((selectedOrder.totalPrice ?? 0) - (selectedOrder.paidAmount ?? 0)).toLocaleString()} DA</span>
                    </div>
                  </div>
                </div>
                <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                  <h4 className="text-xs font-bold text-amber-600 uppercase mb-2">Notes / Instructions</h4>
                  <p className="text-sm text-slate-700 italic">{selectedOrder.notes || "Aucune instruction particulière."}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINT MODAL */}
      {isPrintModalOpen && selectedOrderForPrint && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <Printer size={20} />
                <span className="font-bold">Aperçu avant impression</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-sm font-bold transition-all">
                  Imprimer
                </button>
                <button onClick={() => setIsPrintModalOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-slate-100">
              {/* LE BON (Format A4) */}
              <div id="printable-area" className="bg-white w-full max-w-[210mm] mx-auto shadow-lg p-10 min-h-[297mm] text-slate-900 font-serif">
                {/* Header du Bon */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
                  <div>
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900">FABRIKTI</h1>
                    <p className="text-sm font-sans text-slate-500 mt-1">Atelier de Fabrication de Chaussures</p>
                  </div>
                  <div className="text-right font-sans">
                    <h2 className="text-xl font-bold text-slate-900 uppercase">Bon de Commande</h2>
                    <p className="text-lg font-bold text-indigo-600">N° {selectedOrderForPrint.id.slice(0,8).toUpperCase()}</p>
                    <p className="text-sm text-slate-500">Date: {new Date(selectedOrderForPrint.orderDate).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>

                {/* Adresses */}
                <div className="grid grid-cols-2 gap-12 mb-10 font-sans">
                  <div>
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Émetteur</h3>
                    <p className="font-bold">Atelier Fabrikti</p>
                    <p className="text-sm text-slate-600">Zone Industrielle, Lot 42</p>
                    <p className="text-sm text-slate-600">Tél: +213 (0) 555 00 00 00</p>
                  </div>
                  <div>
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Destinataire / Client</h3>
                    <p className="font-bold text-lg">{(clients ?? []).find((c: any) => c.id === selectedOrderForPrint.clientId)?.name || ''}</p>
                    <p className="text-sm text-slate-600">Client ID: {selectedOrderForPrint.clientId?.slice(0,8) ?? ''}</p>
                  </div>
                </div>

                {/* Table Articles */}
                <table className="w-full mb-10 font-sans">
                  <thead>
                    <tr className="border-b-2 border-slate-900">
                      <th className="py-3 text-left text-sm font-bold uppercase">Désignation</th>
                      <th className="py-3 text-center text-sm font-bold uppercase">Qté</th>
                      <th className="py-3 text-right text-sm font-bold uppercase">P.U (DA)</th>
                      <th className="py-3 text-right text-sm font-bold uppercase">Total (DA)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {selectedOrderForPrint.items?.map((item, idx) => {
                      const product = (products ?? []).find((p: any) => p.id === item.productId) || (materials ?? []).find((m: any) => m.id === item.productId);
                      return (
                        <tr key={idx}>
                          <td className="py-4 text-sm font-medium">{product?.name}</td>
                          <td className="py-4 text-center text-sm">{item.quantity} {item.unit}</td>
                          <td className="py-4 text-right text-sm">{(item.unitPrice ?? 0).toLocaleString()}</td>
                          <td className="py-4 text-right text-sm font-bold">{(item.totalItemPrice ?? 0).toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Totaux */}
                <div className="flex justify-end font-sans">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total Brut:</span>
                      <span>{(selectedOrderForPrint.totalPrice ?? 0).toLocaleString()} DA</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold border-t border-slate-900 pt-2">
                      <span>NET À PAYER:</span>
                      <span className="text-lg">{(selectedOrderForPrint.totalPrice ?? 0).toLocaleString()} DA</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 pt-4">
                      <span>Versement:</span>
                      <span>{(selectedOrderForPrint.paidAmount ?? 0).toLocaleString()} DA</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-rose-600">
                      <span>Reste:</span>
<span>{((selectedOrderForPrint.totalPrice ?? 0) - (selectedOrderForPrint.paidAmount ?? 0)).toLocaleString()} DA</span>                      </div>
                  </div>
                </div>

                {/* Footer Signature */}
                <div className="mt-20 grid grid-cols-2 gap-10 font-sans text-center">
                  <div className="border-t border-slate-200 pt-4">
                    <p className="text-xs font-bold text-slate-400 uppercase">Cachet & Signature Atelier</p>
                  </div>
                  <div className="border-t border-slate-200 pt-4">
                    <p className="text-xs font-bold text-slate-400 uppercase">Signature Client</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default OrderManagement;