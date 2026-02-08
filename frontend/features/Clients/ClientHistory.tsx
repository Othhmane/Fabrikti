import React, { useMemo, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../api/supabase';
import { Card, Badge, Button, Input } from '../../components/UI';
import { TransactionType, PaymentStatus, Order as OrderType, Transaction as TransactionTypeDef, OrderStatus, ProductConsumption } from '../../types';
import GenerateClientPdf from '../../components/GenerateClientPdf';

import { 
  ShoppingBag, ArrowLeft, ArrowRightLeft, Clock, Calendar, 
  DollarSign, Package, CreditCard, TrendingUp, AlertCircle, 
  CheckCircle2, Info, Filter, MessageSquare, User, 
  ChevronRight, ArrowUpCircle, ArrowDownCircle, History,
  Plus, Trash2, Send, Printer, Truck, FileText, X
} from 'lucide-react';

interface ClientNote {
  id: string;
  text: string;
  date: string;
}

const STATUS_LABELS: Record<string, { label: string, bgColor: string, textColor: string, icon: any }> = {
  [OrderStatus.EN_ATTENTE]: { label: 'En attente', bgColor: 'bg-slate-100', textColor: 'text-slate-700', icon: <Clock size={12}/> },
  [OrderStatus.EN_PREPARATION]: { label: 'Préparation', bgColor: 'bg-amber-100', textColor: 'text-amber-700', icon: <Package size={12}/> },
  [OrderStatus.EN_STOCK]: { label: 'En stock', bgColor: 'bg-indigo-100', textColor: 'text-indigo-700', icon: <ShoppingBag size={12}/> },
  [OrderStatus.LIVREE]: { label: 'Livrée', bgColor: 'bg-emerald-100', textColor: 'text-emerald-700', icon: <CheckCircle2 size={12}/> },
  [OrderStatus.ANNULEE]: { label: 'Annulée', bgColor: 'bg-rose-100', textColor: 'text-rose-700', icon: <AlertCircle size={12}/> },
};

export const ClientHistory: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [filterType, setFilterType] = useState<'all' | 'orders' | 'transactions'>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderType | null>(null);
  
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [newNoteText, setNewNoteText] = useState('');

  // Notes en localStorage
  useEffect(() => {
    if (!id) return;
    const savedNotes = localStorage.getItem(`fabrikti_client_notes_${id}`);
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes));
    }
  }, [id]);

  const saveNotesToStorage = (updatedNotes: ClientNote[]) => {
    if (!id) return;
    localStorage.setItem(`fabrikti_client_notes_${id}`, JSON.stringify(updatedNotes));
    setNotes(updatedNotes);
  };

  const handleAddNote = () => {
    if (!newNoteText.trim()) return;
    const note: ClientNote = {
      id: Math.random().toString(36).substr(2, 9),
      text: newNoteText.trim(),
      date: new Date().toISOString(),
    };
    saveNotesToStorage([note, ...notes]);
    setNewNoteText('');
  };

  const handleDeleteNote = (noteId: string) => {
    if (window.confirm('Supprimer cette note ?')) {
      const updatedNotes = notes.filter(n => n.id !== noteId);
      saveNotesToStorage(updatedNotes);
    }
  };

  // Fetch clients / orders / transactions / products / rawMaterials via supabase
  const fetchClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*');
    if (error) throw error;
    return data || [];
  };

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  };

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  };

  const fetchProducts = async () => {
    const { data: productsData, error } = await supabase.from('products').select('*');
    if (error) throw error;
    const { data: pcData, error: pcErr } = await supabase.from('product_consumption').select('*');
    if (pcErr) throw pcErr;
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

  const fetchRawMaterials = async () => {
    const { data, error } = await supabase.from('materials').select('*');
    if (error) throw error;
    return (data || []).map((m: any) => ({
      ...m,
      pricePerUnit: Number(m.price_per_unit ?? m.pricePerUnit ?? 0),
      stock: Number(m.stock ?? 0),
    }));
  };

  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: fetchClients });
  const { data: ordersRaw = [] } = useQuery({ queryKey: ['orders'], queryFn: fetchOrders });
  const { data: transactionsRaw = [] } = useQuery({ queryKey: ['transactions'], queryFn: fetchTransactions });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: fetchProducts });
  const { data: rawMaterials = [] } = useQuery({ queryKey: ['rawMaterials'], queryFn: fetchRawMaterials });

  // Mappe les rows SQL (snake_case) vers la forme JS attendue par ta page
  const orders = useMemo(() => {
    return (ordersRaw || []).map((r: any) => ({
      id: r.id,
      clientId: r.client_id ?? r.clientId ?? r.client,
      totalPrice: r.total_price ?? r.totalAmount ?? r.total_amount ?? r.totalPrice ?? 0,
      paidAmount: r.paid_amount ?? r.paidAmount ?? r.paid_amount ?? 0,
      orderDate: r.order_date ?? r.created_at ?? r.orderDate ?? null,
      deliveryDate: r.delivery_date ?? r.deliveryDate ?? null,
      notes: r.notes ?? r.note ?? null,
      createdAt: r.created_at ?? r.createdAt ?? null,
      items: (r.items ?? r.order_items ?? r.items_list ?? []).map((it: any) => ({
        id: it.id ?? undefined,
        productId: it.product_id ?? it.productId ?? it.product ?? null,
        quantity: Number(it.quantity ?? 0),
        unit: it.unit ?? 'unité',
        unitPrice: Number(it.unit_price ?? it.unitPrice ?? 0),
        totalItemPrice: Number(it.total_item_price ?? it.totalItemPrice ?? (Number(it.quantity ?? 0) * Number(it.unit_price ?? it.unitPrice ?? 0))),
      })),
      status: r.status ?? r.state ?? null,
      // tu peux mapper d'autres champs si besoin
    })) as OrderType[];
  }, [ordersRaw]);

  const transactions = useMemo(() => {
    return (transactionsRaw || []).map((t: any) => ({
      id: t.id,
      clientId: t.client_id ?? t.clientId ?? null,
      orderId: t.order_id ?? t.orderId ?? null,
      supplierId: t.supplier_id ?? t.supplierId ?? null,
      materialId: t.material_id ?? t.materialId ?? null,
      type: t.type,
      amount: Number(t.amount ?? 0),
      date: t.date ?? t.created_at ?? null,
      description: t.description ?? t.label ?? '',
      payment_method: t.payment_method ?? t.paymentMethod ?? null,
      reference: t.reference ?? null,
      notes: t.notes ?? null,
      category: t.category ?? null,
      status: t.status ?? null,
    })) as TransactionTypeDef[];
  }, [transactionsRaw]);

  const client = useMemo(() => clients.find((c: any) => c.id === id), [clients, id]);
  const isSupplier = (client as any)?.type === 'FOURNISSEUR';

  const clientOrders = useMemo(() => {
    if (!id) return [];
    return orders.filter(o => o.clientId === id);
  }, [orders, id]);

  const clientTransactions = useMemo(() => {
    if (!id) return [];
    // Inclut transactions directement liées au client ou via commande du client
    return transactions.filter(t => 
      t.clientId === id || (t.orderId && clientOrders.some(o => o.id === t.orderId))
    );
  }, [transactions, id, clientOrders]);

  // Stats
  const stats = useMemo(() => {
    const totalInvoiced = clientOrders.reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);
    const totalAdvancePayments = clientOrders.reduce((sum, o) => sum + (Number(o.paidAmount) || 0), 0);
    
    const totalIncome = clientTransactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      
    const totalExpense = clientTransactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const balance = totalAdvancePayments - totalInvoiced + totalIncome - totalExpense;
    const averageOrder = clientOrders.length > 0 ? totalInvoiced / clientOrders.length : 0;
    
    return {
      totalInvoiced,
      totalAdvancePayments,
      totalIncome,
      totalExpense,
      balance,
      averageOrder,
      isDebtor: balance < 0,
      isCreditor: balance > 0
    };
  }, [clientOrders, clientTransactions]);

  // Timeline combinée (commandes + transactions)
  const timeline = useMemo(() => {
    const combined: any[] = [
      ...clientOrders.map(o => ({ ...o, _type: 'ORDER' })),
      ...clientTransactions.map(t => ({ ...t, _type: 'TRANSACTION' }))
    ];
    return combined.sort((a, b) => {
      const dateA = new Date(a.orderDate || a.date || 0).getTime();
      const dateB = new Date(b.orderDate || b.date || 0).getTime();
      return dateB - dateA;
    });
  }, [clientOrders, clientTransactions]);

  const filteredTimeline = useMemo(() => {
    return timeline.filter(item => {
      if (filterType === 'orders' && item._type !== 'ORDER') return false;
      if (filterType === 'transactions' && item._type !== 'TRANSACTION') return false;

      const itemDate = new Date(item.orderDate || item.date || 0);
      if (dateFrom && itemDate < new Date(dateFrom)) return false;
      if (dateTo && itemDate > new Date(dateTo)) return false;

      return true;
    });
  }, [timeline, filterType, dateFrom, dateTo]);

  const materialRequirements = useMemo(() => {
    if (!selectedOrder || isSupplier) return [];
    const acc: Record<string, any> = {};
    (selectedOrder.items ?? []).forEach((item: any) => {
      const product: any = (products ?? []).find((p: any) => p.id === item.productId);
      const formula = product?.consumptionFormula ?? [];
      formula.forEach((f: any) => {
        const material: any = (rawMaterials ?? []).find((m: any) => m.id === f.materialId);
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
  }, [selectedOrder, products, rawMaterials, isSupplier]);

  const totalMaterialCost = useMemo(
    () => materialRequirements.reduce((sum: number, r: any) => sum + Number(r.totalCost ?? 0), 0),
    [materialRequirements]
  );
  const hasMaterialShortage = useMemo(
    () => materialRequirements.some((r: any) => Number(r.stock ?? 0) < Number(r.requiredQty ?? 0)),
    [materialRequirements]
  );

  const openDetailsModal = (order: OrderType) => {
    setSelectedOrder(order);
    setIsDetailsModalOpen(true);
  };

  const closeDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedOrder(null);
  };

  if (!client) return (
    <div className="p-20 text-center">
      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertCircle size={40} className="text-gray-300" />
      </div>
      <p className="text-gray-500 text-sm">Client Introuvable</p>
      <Link to="/clients" className="mt-4 inline-block"><Button variant="secondary">Retour à la liste</Button></Link>
    </div>
  );

  return (
    <div id="client-history-print-area" className="space-y-6">
      
      {/* Titre principal */}
      <div className="bg-white border border-gray-100 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/clients">
              <button className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:border-indigo-200 transition-all">
                <ArrowLeft size={18} />
              </button>
            </Link>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                {client.name}
              </h2>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isSupplier ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                {isSupplier ? 'Fournisseur' : 'Client'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge color={stats.balance < 0 ? 'red' : 'green'}>
              {stats.balance < 0 ? 'En dette' : 'Solde à jour'}
            </Badge>
            <GenerateClientPdf
              client={{
                name: client.name,
                email: client.email,
                phone: client.phone,
                address: client.address,
                ordersCount: clientOrders.length,
                totalInvoiced: stats.totalInvoiced,
                balance: stats.balance,
              }}
              timeline={filteredTimeline}
            />
          </div>
        </div>
      </div>

      {/* Stats financières */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-100 rounded-lg p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
              {isSupplier ? <Truck size={18} className="text-white"/> : <ShoppingBag size={18} className="text-white"/>}
            </div>
            <div>
              <p className="text-xs text-gray-500">{isSupplier ? 'Achats' : 'Commandes'}</p>
              <p className="text-sm font-semibold text-gray-900">{clientOrders.length} bons</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-1">Total Facturé HT</p>
          <p className="text-2xl font-semibold text-gray-900">{stats.totalInvoiced.toLocaleString()} DA</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-lg p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <ArrowUpCircle size={18} className="text-white"/>
            </div>
            <div>
              <p className="text-xs text-emerald-600">Versements</p>
              <p className="text-sm font-semibold text-emerald-600">+{stats.totalAdvancePayments.toLocaleString()} DA</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-1">Total Encaissement</p>
          <p className="text-2xl font-semibold text-emerald-600">{stats.totalIncome.toLocaleString()} DA</p>
        </div>

        <div className={`rounded-lg p-5 ${stats.balance < 0 ? 'bg-gradient-to-br from-rose-400 to-rose-400' : 'bg-gradient-to-br from-indigo-500 to-indigo-600'}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              {stats.balance < 0 ? <AlertCircle size={18} className="text-white"/> : <CheckCircle2 size={18} className="text-white"/>}
            </div>
            <div>
              <p className="text-xs text-white/80">
                {stats.balance < 0 ? 'Dette en cours' : 'Avance client'}
              </p>
            </div>
          </div>
          <p className="text-xs text-white/80 mb-1">Solde du Compte</p>
          <p className="text-2xl font-semibold text-white">
            {stats.balance > 0 ? '+' : ''}{stats.balance.toLocaleString()} DA
          </p>
        </div>

        <div className="bg-white border border-gray-100 rounded-lg p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <TrendingUp size={18} className="text-white"/>
            </div>
            <div>
              <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded">Client Régulier</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-1">Panier Moyen</p>
          <p className="text-2xl font-semibold text-gray-900">{Math.round(stats.averageOrder).toLocaleString()} DA</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <History size={18} className="text-indigo-600" /> Journal d'Activité
            </h3>

            <div className="flex gap-2">
              {['all', 'orders', 'transactions'].map(t => (
                <button 
                  key={t}
                  onClick={() => setFilterType(t as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filterType === t ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {t === 'all' ? 'Tout' : t === 'orders' ? (isSupplier ? 'Achats' : 'Bons') : 'Flux'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-xs"
                max={dateTo || undefined}
              />
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-xs"
                min={dateFrom || undefined}
              />
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); }}
                className="inline-block px-2 py-1.5 bg-indigo-600 text-white text-xs rounded"
                title="Réinitialiser les dates"
              >
                Réinitialiser
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {filteredTimeline.length === 0 && (
              <div className="py-16 text-center bg-white rounded-lg border border-dashed border-gray-200">
                <p className="text-gray-400 text-sm">Aucun historique disponible</p>
              </div>
            )}
            {filteredTimeline.map((item, idx) => {
              const isOrder = item._type === 'ORDER';
              
              return (
                <div key={idx} className="bg-white border border-gray-100 rounded-lg p-4 hover:border-indigo-200 transition-all">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      isOrder 
                      ? 'bg-blue-50 text-blue-600' 
                      : (item.type === TransactionType.INCOME ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600')
                    }`}>
                      {isOrder ? (isSupplier ? <Truck size={18}/> : <Package size={18}/>) : <ArrowRightLeft size={18}/>}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-500">
                          {new Date(item.orderDate || item.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          isOrder 
                          ? 'bg-blue-50 text-blue-600' 
                          : (item.type === TransactionType.INCOME ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600')
                        }`}>
                          {isOrder 
                            ? (isSupplier ? 'Bon d\'Achat' : 'Bon de Commande') 
                            : (item.type === TransactionType.INCOME ? 'Encaissement' : 'Décaissement')}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-1">
                        {isOrder 
                          ? (isSupplier ? `Achat ACH-${String(item.id).slice(0,5)}` : `Commande CMD-${String(item.id).slice(0,5)}`) 
                          : item.description}
                      </h4>
                      {isOrder && (
                        <div className="text-xs text-gray-500 space-y-1">
                          <p>
                            {item.items?.length || 0} articles • Statut : {item.status}
                          </p>
                          {item.paidAmount > 0 && (
                            <p className="text-emerald-600 font-medium">
                              Versement: <span className="font-bold">+{item.paidAmount.toLocaleString()} DA</span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <p className={`text-lg font-semibold ${isOrder ? 'text-gray-900' : (item.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600')}`}>
                        {isOrder 
                          ? `${Number(item.totalPrice || 0).toLocaleString()} DA` 
                          : `${item.type === TransactionType.INCOME ? '+' : '-'}${Number(item.amount || 0).toLocaleString()} DA`}
                      </p>
                      {isOrder && item.paidAmount > 0 && (
                        <p className="text-xs text-red-600 mt-1">
                          Reste: {(Number(item.totalPrice || 0) - Number(item.paidAmount || 0)).toLocaleString()} DA
                        </p>
                      )}
                        {isOrder && (
                          <button
                            onClick={() => openDetailsModal(item as OrderType)}
                            className="flex items-center gap-1 text-xs text-indigo-600 hover:underline mt-1 print:hidden"
                          >
                            Détails <ChevronRight size={12}/>
                          </button>
                        )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-100 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare size={16} className="text-indigo-600" /> Notes de gestion
            </h3>
            
            <div className="relative mb-4 print:hidden">
              <textarea 
                className="w-full h-24 p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none resize-none transition-all"
                placeholder="Ajouter une note..."
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddNote();
                  }
                }}
              ></textarea>
              <button 
                onClick={handleAddNote}
                className="absolute bottom-2 right-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Send size={14} />
              </button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {notes.length === 0 ? (
                <p className="text-center py-4 text-xs text-gray-400">Aucune note enregistrée</p>
              ) : (
                notes.map(note => (
                  <div key={note.id} className="p-3 bg-gray-50 border border-gray-100 rounded-lg group hover:border-indigo-100 transition-all">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs text-gray-500">
                        {new Date(note.date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button 
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1 text-gray-300 hover:text-rose-500 transition-all print:hidden"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{note.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Info size={16} className="text-indigo-600" /> Informations
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <Calendar size={14} className="text-blue-600"/>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Contact</p>
                  <p className="text-sm font-medium text-gray-900">{client.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                  {isSupplier ? <Truck size={14} className="text-emerald-600"/> : <Package size={14} className="text-emerald-600"/>}
                </div>
                <div>
                  <p className="text-xs text-gray-500">{isSupplier ? 'Dernier Achat' : 'Dernière Commande'}</p>
                  <p className="text-sm font-medium text-gray-900">
                    {clientOrders.length > 0 && clientOrders[0].orderDate ? new Date(clientOrders[0].orderDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {stats.balance < -1000 && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={16} className="text-rose-600" />
                <h4 className="font-semibold text-sm text-rose-900">Alerte Débiteur</h4>
              </div>
              <p className="text-xs text-rose-700 leading-relaxed">
                Ce {isSupplier ? 'fournisseur' : 'client'} a dépassé le seuil de tolérance de crédit. Il est conseillé de bloquer les nouvelles commandes avant régularisation.
              </p>
            </div>
          )}
        </div>
      </div>

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
                  <h2 className="text-xl font-bold text-slate-900">Détails Commande #{String(selectedOrder.id).slice(0,8).toUpperCase()}</h2>
                  <p className="text-xs text-slate-500">Créée le {new Date(selectedOrder.createdAt || selectedOrder.orderDate || '').toLocaleDateString('fr-FR')}</p>
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
                    {client?.name || 'Inconnu'}
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

              {/* Table des Articles */}
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-slate-50">
                  {selectedOrder.items?.map((item: any, idx: number) => {
                    const product = (products ?? []).find((p: any) => p.id === item.productId) || (rawMaterials ?? []).find((m: any) => m.id === item.productId);
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
                            <p className="text-sm font-semibold text-slate-700 break-all">{Number(item.unitPrice ?? 0).toLocaleString()} DA</p>
                            <p className="text-xs text-slate-500 mt-2">Total</p>
                            <p className="text-sm font-bold text-slate-900 break-all">{Number(item.totalItemPrice ?? 0).toLocaleString()} DA</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="p-4 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600 uppercase">Total Commande</span>
                      <span className="text-base font-bold text-indigo-600 break-all">{Number(selectedOrder.totalPrice ?? 0).toLocaleString()} DA</span>
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
                      {selectedOrder.items?.map((item: any, idx: number) => {
                        const product = (products ?? []).find((p: any) => p.id === item.productId) || (rawMaterials ?? []).find((m: any) => m.id === item.productId);
                        return (
                          <tr key={idx}>
                            <td className="px-4 py-3 font-medium text-slate-800">{product?.name || 'Produit inconnu'}</td>
                            <td className="px-4 py-3 text-center text-slate-600">{item.quantity} {item.unit}</td>
                            <td className="px-4 py-3 text-right text-slate-600 break-all">{Number(item.unitPrice ?? 0).toLocaleString()} DA</td>
                            <td className="px-4 py-3 text-right font-bold text-slate-900 break-all">{Number(item.totalItemPrice ?? 0).toLocaleString()} DA</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50/50 font-bold">
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-right text-slate-600">Total Commande</td>
                        <td className="px-4 py-3 text-right text-indigo-600 text-lg break-all">{Number(selectedOrder.totalPrice ?? 0).toLocaleString()} DA</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Consommation matières premières */}
              {!isSupplier && (
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

              {/* Paiement & Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Résumé Financier</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Déjà versé:</span>
                      <span className="font-bold text-emerald-600">{Number(selectedOrder.paidAmount ?? 0).toLocaleString()} DA</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-slate-200 pt-2">
                      <span className="text-slate-600">Reste à payer:</span>
                      <span className="font-bold text-rose-600">{(Number(selectedOrder.totalPrice ?? 0) - Number(selectedOrder.paidAmount ?? 0)).toLocaleString()} DA</span>
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
    </div>
  );
};
