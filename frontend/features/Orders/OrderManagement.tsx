
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FabriktiService } from '../../api/services';
import { Card, Badge, Button, DesktopTable, Input } from '../../components/UI';
import { OrderStatus, PaymentStatus, Order, OrderItem } from '../../types';
import { 
  Clock, Package, Truck, Database, Plus, Search, 
  X, RotateCcw, Ban, Trash2, Edit3,
  ShoppingCart, ChevronRight, CheckCircle2, 
  AlertTriangle, Printer, FileText, CheckCircle
} from 'lucide-react';

const STATUS_LABELS: Record<string, { label: string, color: any, icon: any }> = {
  [OrderStatus.EN_ATTENTE]: { label: 'En attente', color: 'slate' as any, icon: <Clock size={12}/> },
  [OrderStatus.EN_PREPARATION]: { label: 'Préparation', color: 'yellow' as any, icon: <Package size={12}/> },
  [OrderStatus.EN_STOCK]: { label: 'En stock', color: 'indigo' as any, icon: <Database size={12}/> },
  [OrderStatus.LIVREE]: { label: 'Livrée', color: 'emerald' as any, icon: <CheckCircle2 size={12}/> },
  [OrderStatus.ANNULEE]: { label: 'Annulée', color: 'rose' as any, icon: <Ban size={12}/> },
};

const PAYMENT_LABELS: Record<string, { label: string, color: any }> = {
  [PaymentStatus.PAYEE]: { label: 'Payée', color: 'green' as any },
  [PaymentStatus.PARTIEL]: { label: 'Partiel', color: 'amber' as any },
  [PaymentStatus.NON_PAYEE]: { label: 'Non payée', color: 'red' as any },
  [PaymentStatus.EN_DETTE]: { label: 'En dette', color: 'red' as any },
  [PaymentStatus.EN_PLUS]: { label: 'Crédit', color: 'blue' as any },
};

export const OrderManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<Order | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [items, setItems] = useState<Partial<OrderItem>[]>([{ id: '1', productId: '', quantity: 1, unit: 'paire', unitPrice: 0, totalItemPrice: 0 }]);

  const { data: orders, isLoading } = useQuery({ queryKey: ['orders'], queryFn: FabriktiService.getOrders });
  const { data: clients } = useQuery({ queryKey: ['clients'], queryFn: FabriktiService.getClients });
  const { data: products } = useQuery({ queryKey: ['products'], queryFn: FabriktiService.getProducts });

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
    setItems([{ id: '1', productId: '', quantity: 1, unit: 'paire', unitPrice: 0, totalItemPrice: 0 }]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (order: Order) => {
    setEditingOrder(order);
    setItems(order.items || []);
    setIsModalOpen(true);
  };

  const handleOpenPrint = (order: Order) => {
    setSelectedOrderForPrint(order);
    setIsPrintModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingOrder(null);
  };

  const addLine = () => {
    setItems([...items, { id: Date.now().toString(), productId: '', quantity: 1, unit: 'paire', unitPrice: 0, totalItemPrice: 0 }]);
  };

  const removeLine = (id: string) => {
    if (items.length > 1) setItems(items.filter(i => i.id !== id));
  };

  const updateLine = (id: string, field: keyof OrderItem, value: any) => {
    setItems(prevItems => prevItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'productId') {
          const product = products?.find(p => p.id === value);
          updated.unit = product?.unit || 'unité';
          updated.unitPrice = product?.pricePerUnit || 0;
        }
        updated.totalItemPrice = (updated.quantity || 0) * (updated.unitPrice || 0);
        return updated;
      }
      return item;
    }));
  };

  const totalOrderPrice = useMemo(() => items.reduce((sum, i) => sum + (i.totalItemPrice || 0), 0), [items]);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter(order => {
      const client = clients?.find(c => c.id === order.clientId);
      const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) || client?.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
      return matchesSearch && matchesStatus;
    }).sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  }, [orders, clients, searchTerm, filterStatus]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-tight">Commandes Atelier</h2>
          <p className="text-slate-500 font-medium italic text-xs tracking-tight">Suivi de fabrication et bons de livraison.</p>
        </div>
        <Button onClick={handleOpenCreate} className="w-full sm:w-auto h-12 px-6 shadow-xl shadow-blue-500/20 text-xs font-black uppercase tracking-widest">
          <Plus size={18} /> Nouveau Bon
        </Button>
      </div>

      {/* FILTRES */}
      <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-4 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[240px] relative">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            placeholder="Référence ou client..." 
            className="w-full pl-12 h-11 rounded-xl bg-slate-50 border-none focus:ring-4 focus:ring-blue-100 text-sm font-semibold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="h-11 rounded-xl bg-slate-50 border-none text-xs font-bold px-5 outline-none focus:ring-4 focus:ring-blue-100"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">Tous les statuts</option>
          {Object.values(OrderStatus).map(s => <option key={s} value={s}>{STATUS_LABELS[s]?.label || s}</option>)}
        </select>
        <button onClick={() => {setSearchTerm(''); setFilterStatus('all')}} className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><RotateCcw size={20}/></button>
      </div>

      {isLoading ? (
        <div className="py-24 text-center"><div className="inline-block animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>
      ) : (
        <>
          {/* VUE DESKTOP */}
          <DesktopTable headers={['Bon #', 'Client', 'Statut', 'Paiement', 'Montant', 'Actions']}>
            {filteredOrders.length === 0 ? (
              <tr><td colSpan={6} className="px-8 py-20 text-center text-slate-300 italic font-bold">Aucune commande.</td></tr>
            ) : filteredOrders.map(order => {
              const client = clients?.find(c => c.id === order.clientId);
              const statusConfig = STATUS_LABELS[order.status] || { label: order.status, color: 'gray', icon: null };
              return (
                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-5 font-black text-slate-900 text-xs">#{order.id.slice(0,8).toUpperCase()}</td>
                  <td className="px-6 py-5">
                    <Link to={`/clients/${order.clientId}/history`} className="text-xs font-black text-blue-600 hover:text-blue-800 uppercase tracking-tight hover:underline">
                      {client?.name || 'Inconnu'}
                    </Link>
                  </td>
                  <td className="px-6 py-5"><Badge color={statusConfig.color}><span className="flex items-center gap-1.5">{statusConfig.icon}{statusConfig.label}</span></Badge></td>
                  <td className="px-6 py-5"><Badge color={PAYMENT_LABELS[order.paymentStatus]?.color || 'gray'}>{PAYMENT_LABELS[order.paymentStatus]?.label || order.paymentStatus}</Badge></td>
                  <td className="px-6 py-5 font-black text-slate-900 text-sm">{order.totalPrice.toLocaleString()} €</td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleOpenPrint(order)} className="p-2 text-slate-400 hover:text-indigo-600" title="Imprimer BC"><Printer size={18} /></button>
                      <Link to={`/orders/${order.id}`} className="p-2 text-slate-400 hover:text-blue-600"><ChevronRight size={18} /></Link>
                      <button onClick={() => handleOpenEdit(order)} className="p-2 text-slate-400 hover:text-amber-600"><Edit3 size={18} /></button>
                      <button onClick={() => { setOrderToDelete(order); setIsDeleteModalOpen(true); }} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </DesktopTable>

          {/* VUE MOBILE */}
          <div className="md:hidden space-y-4">
            {filteredOrders.map(order => {
              const client = clients?.find(c => c.id === order.clientId);
              return (
                <Card key={order.id} className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CMD-{order.id.slice(0,8).toUpperCase()}</p>
                      <Link to={`/clients/${order.clientId}/history`} className="text-sm font-black text-blue-600 uppercase tracking-tight hover:underline">
                        {client?.name || 'Inconnu'}
                      </Link>
                    </div>
                    <Badge color={STATUS_LABELS[order.status]?.color}>{STATUS_LABELS[order.status]?.label}</Badge>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                    <Badge color={PAYMENT_LABELS[order.paymentStatus]?.color}>{PAYMENT_LABELS[order.paymentStatus]?.label}</Badge>
                    <p className="text-xl font-black text-slate-900">{order.totalPrice.toLocaleString()} €</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleOpenPrint(order)} className="p-3 bg-slate-100 text-indigo-600 rounded-xl"><Printer size={18}/></button>
                    <Link to={`/orders/${order.id}`} className="flex-1"><Button variant="secondary" className="w-full h-11 text-xs font-black uppercase"><ChevronRight size={16}/> Voir</Button></Link>
                    <button onClick={() => handleOpenEdit(order)} className="p-3 bg-slate-50 text-slate-500 rounded-xl"><Edit3 size={18}/></button>
                    <button onClick={() => { setOrderToDelete(order); setIsDeleteModalOpen(true); }} className="p-3 bg-red-50 text-red-500 rounded-xl"><Trash2 size={18}/></button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* MODAL PRINT PDF PROFESSIONNEL */}
      {isPrintModalOpen && selectedOrderForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md overflow-y-auto">
          <Card className="w-full max-w-4xl bg-white rounded-[40px] shadow-3xl overflow-hidden border-none animate-in zoom-in-95 duration-300">
            {/* Header d'aperçu */}
            <div className="bg-slate-900 px-8 py-5 flex justify-between items-center text-white sticky top-0 z-10">
               <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-sm">F</div>
                  <span className="text-xs font-black uppercase tracking-[0.2em]">Aperçu Bon de Commande</span>
               </div>
               <div className="flex gap-3">
                  <Button variant="ghost" className="text-white hover:bg-white/10 h-10 px-5 text-xs font-black uppercase tracking-widest" onClick={() => window.print()}>
                     <Printer size={18} /> Imprimer PDF
                  </Button>
                  <button onClick={() => setIsPrintModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X size={24}/></button>
               </div>
            </div>

            {/* Corps du Document */}
            <div className="p-12 lg:p-20 bg-white min-h-[900px] flex flex-col print:p-0">
               <div className="flex justify-between items-start mb-16">
                  <div className="space-y-2">
                     <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase mb-4">Bon de<br/>Commande</h1>
                     <div className="flex items-center gap-3 text-sm">
                        <span className="px-3 py-1 bg-slate-100 rounded-lg font-black text-slate-900">BC-{selectedOrderForPrint.id.slice(0,8).toUpperCase()}</span>
                        <span className="text-slate-400 font-bold uppercase tracking-widest">Émis le {new Date(selectedOrderForPrint.orderDate).toLocaleDateString()}</span>
                     </div>
                  </div>
                  <div className="text-right">
                     <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center font-black text-white text-2xl ml-auto mb-4 shadow-xl">F</div>
                     <p className="font-black text-slate-900 text-lg uppercase tracking-tight">Fabrikti Industrie</p>
                     <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed mt-2">
                        Zone Industrielle Nord<br/>
                        Atelier de Production 4<br/>
                        75000 Paris, France
                     </p>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-20 mb-20">
                  <div className="space-y-5">
                     <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] border-b pb-2">Destinataire / Client</p>
                     <div className="space-y-1">
                        <p className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                           {clients?.find(c => c.id === selectedOrderForPrint.clientId)?.name || 'Partenaire Fabrikti'}
                        </p>
                        <p className="text-sm text-slate-500 font-bold leading-relaxed max-w-xs">
                           {clients?.find(c => c.id === selectedOrderForPrint.clientId)?.address || 'Adresse d\'expédition en attente'}
                        </p>
                        <p className="text-xs font-black text-blue-600 mt-2">{clients?.find(c => c.id === selectedOrderForPrint.clientId)?.email}</p>
                     </div>
                  </div>
                  <div className="space-y-5">
                     <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] border-b pb-2">Informations</p>
                     <div className="space-y-3">
                        <div className="flex justify-between text-xs font-black uppercase"><span className="text-slate-400">Statut Prod:</span> <span className="text-slate-900">{selectedOrderForPrint.status}</span></div>
                        <div className="flex justify-between text-xs font-black uppercase"><span className="text-slate-400">Paiement:</span> <span className="text-slate-900">{selectedOrderForPrint.paymentStatus}</span></div>
                        <div className="flex justify-between text-xs font-black uppercase"><span className="text-slate-400">Réf Interne:</span> <span className="text-slate-900">CMD-{selectedOrderForPrint.id.slice(0,5)}</span></div>
                     </div>
                  </div>
               </div>

               {/* Table PDF */}
               <div className="flex-1">
                  <table className="w-full text-left border-collapse">
                     <thead>
                        <tr className="border-b-2 border-slate-900">
                           <th className="py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Référence / Article</th>
                           <th className="py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Qté</th>
                           <th className="py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Unit. HT</th>
                           <th className="py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Total HT</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {selectedOrderForPrint.items?.map((item, idx) => {
                           const p = products?.find(prod => prod.id === item.productId);
                           return (
                              <tr key={idx} className="text-sm font-bold text-slate-800">
                                 <td className="py-6 uppercase tracking-tight">{p?.name || 'Produit Inconnu'}</td>
                                 <td className="py-6 text-center">{item.quantity}</td>
                                 <td className="py-6 text-right">{item.unitPrice?.toLocaleString()} €</td>
                                 <td className="py-6 text-right font-black">{item.totalItemPrice?.toLocaleString()} €</td>
                              </tr>
                           );
                        })}
                     </tbody>
                  </table>
               </div>

               <div className="mt-10 flex justify-end">
                  <div className="w-full max-w-[320px] bg-slate-50 p-8 rounded-[32px] border border-slate-100 space-y-4">
                     <div className="flex justify-between text-xs font-bold uppercase text-slate-400"><span>Sous-total HT</span> <span>{selectedOrderForPrint.totalPrice.toLocaleString()} €</span></div>
                     <div className="flex justify-between text-xs font-bold uppercase text-slate-400"><span>TVA (0% Export)</span> <span>0.00 €</span></div>
                     <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                        <span className="text-base font-black uppercase text-slate-900">Total Net TTC</span>
                        <span className="text-3xl font-black text-blue-600 tracking-tighter">{selectedOrderForPrint.totalPrice.toLocaleString()} €</span>
                     </div>
                  </div>
               </div>

               {/* Footer PDF */}
               <div className="mt-20 pt-10 border-t border-slate-100 flex justify-between items-end">
                  <div className="space-y-4">
                     <div className="w-24 h-24 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-slate-100">
                        <CheckCircle size={48} className="opacity-5" />
                     </div>
                     <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Signature & Cachet Officiel</p>
                  </div>
                  <div className="max-w-[300px] text-right">
                     <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed tracking-tight">
                        Ce document confirme l'ordre de fabrication. Les délais de livraison sont applicables dès réception du paiement acompte.
                     </p>
                  </div>
               </div>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL AJOUT/EDIT COMMANDE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <Card className="w-full max-w-4xl p-8 rounded-[32px] shadow-3xl animate-in zoom-in-95 duration-300 border-none my-auto max-h-[95vh] flex flex-col">
            <div className="flex justify-between items-center mb-8 shrink-0">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <ShoppingCart size={24} />
                 </div>
                 <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-tight">
                    {editingOrder ? 'Modifier la Commande' : 'Nouveau Bon'}
                 </h3>
              </div>
              <button onClick={handleCloseModal} className="p-2 bg-slate-100 rounded-xl text-slate-400 hover:text-slate-900 transition-all"><X size={24}/></button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              saveMutation.mutate({
                id: editingOrder?.id,
                clientId: formData.get('clientId') as string,
                status: formData.get('status') as OrderStatus,
                items: items as OrderItem[],
                totalPrice: totalOrderPrice,
                paidAmount: editingOrder?.paidAmount || 0,
                paymentStatus: editingOrder?.paymentStatus || PaymentStatus.NON_PAYEE,
                orderDate: editingOrder?.orderDate || new Date().toISOString(),
                notes: formData.get('notes') as string
              });
            }} className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Client *</label>
                  <select name="clientId" defaultValue={editingOrder?.clientId} className="w-full border border-gray-200 h-12 rounded-xl p-3 text-sm font-bold bg-slate-50 focus:ring-4 focus:ring-blue-100 outline-none" required>
                     <option value="">Sélectionner un partenaire</option>
                     {clients?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Statut Initial</label>
                  <select name="status" defaultValue={editingOrder?.status || OrderStatus.EN_ATTENTE} className="w-full border border-gray-200 h-12 rounded-xl p-3 text-sm font-bold bg-slate-50 focus:ring-4 focus:ring-blue-100 outline-none">
                     {Object.values(OrderStatus).map(s => <option key={s} value={s}>{STATUS_LABELS[s]?.label || s}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center"><h4 className="text-sm font-black text-slate-900 uppercase">Articles</h4><Button type="button" variant="secondary" onClick={addLine} className="h-10 px-4 rounded-xl text-xs font-black uppercase">+ Ajouter</Button></div>
                <div className="space-y-3">{items.map((item) => (
                    <div key={item.id} className="grid grid-cols-12 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="col-span-7 sm:col-span-6"><select className="w-full border border-gray-200 h-10 rounded-xl p-2 text-xs font-bold bg-white outline-none" value={item.productId} onChange={(e) => updateLine(item.id!, 'productId', e.target.value)} required><option value="">-- Produit --</option>{products?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                      <div className="col-span-3 sm:col-span-2"><input type="number" min={1} value={item.quantity} onChange={(e) => updateLine(item.id!, 'quantity', Number(e.target.value))} className="w-full h-10 border border-gray-200 rounded-xl p-2 text-xs font-bold text-center" /></div>
                      <div className="hidden sm:flex col-span-3 items-center justify-end font-black text-slate-900 text-sm">{item.totalItemPrice?.toLocaleString()} €</div>
                      <div className="col-span-2 sm:col-span-1 flex items-center justify-center"><button type="button" onClick={() => removeLine(item.id!)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button></div>
                    </div>
                ))}</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                 <div className="space-y-2"><label className="text-xs font-black text-slate-500 uppercase ml-1">Notes</label><textarea name="notes" defaultValue={editingOrder?.notes} className="w-full border border-gray-200 rounded-2xl p-4 text-sm font-medium bg-slate-50 focus:ring-4 focus:ring-blue-100 outline-none h-20 resize-none" /></div>
                 <div className="p-6 bg-blue-600 rounded-[28px] text-white flex flex-col items-center justify-center"><p className="text-[10px] font-black uppercase opacity-60">Total HT</p><p className="text-3xl font-black">{totalOrderPrice.toLocaleString()} €</p></div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4 shrink-0">
                <Button type="button" variant="secondary" className="w-full sm:flex-1 h-12 font-black uppercase" onClick={handleCloseModal}>Annuler</Button>
                <Button type="submit" className="w-full sm:flex-1 h-12 font-black uppercase shadow-xl shadow-blue-500/20" isLoading={saveMutation.isPending}>Valider</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL SUPPRESSION */}
      {isDeleteModalOpen && orderToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <Card className="w-full max-w-md p-8 rounded-[32px] border-none shadow-2xl text-center">
             <div className="mx-auto w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-6"><AlertTriangle size={32} /></div>
             <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2">Supprimer l'ordre ?</h3>
             <p className="text-slate-500 text-sm mb-8">L'ordre <span className="font-black text-slate-900">#{orderToDelete.id.slice(0,8).toUpperCase()}</span> sera retiré définitivement.</p>
             <div className="flex gap-3">
                <Button variant="secondary" className="flex-1 h-12 font-black uppercase text-xs" onClick={() => { setIsDeleteModalOpen(false); setOrderToDelete(null); }}>Annuler</Button>
                <Button variant="danger" className="flex-1 h-12 font-black uppercase text-xs" onClick={() => deleteMutation.mutate(orderToDelete.id)} isLoading={deleteMutation.isPending}>Supprimer</Button>
             </div>
          </Card>
        </div>
      )}
    </div>
  );
};
