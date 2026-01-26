
import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FabriktiService } from '../../api/services';
import { Card, Badge, Button, ResponsiveGrid } from '../../components/UI';
import { OrderStatus, PaymentStatus, TransactionType } from '../../types';
import { 
  ArrowLeft, Clock, Package, Truck, Database, 
  User, CreditCard, Calendar, ShoppingCart, 
  CheckCircle, Trash2, Edit, Ban, 
  DollarSign, Info, Phone, MapPin
} from 'lucide-react';

const STATUS_LABELS = {
  [OrderStatus.EN_ATTENTE]: { label: 'En attente', color: 'gray' as any, icon: <Clock size={20}/> },
  [OrderStatus.EN_PREPARATION]: { label: 'En préparation', color: 'yellow' as any, icon: <Package size={20}/> },
  [OrderStatus.EN_STOCK]: { label: 'En stock', color: 'blue' as any, icon: <Database size={20}/> },
  [OrderStatus.LIVREE]: { label: 'Livrée', color: 'green' as any, icon: <Truck size={20}/> },
  [OrderStatus.ANNULEE]: { label: 'Annulée', color: 'red' as any, icon: <Ban size={20}/> },
};

const PAYMENT_LABELS = {
  [PaymentStatus.PAYEE]: { label: 'Payée', color: 'green' as any },
  [PaymentStatus.PARTIEL]: { label: 'Partiel', color: 'yellow' as any },
  [PaymentStatus.NON_PAYEE]: { label: 'Non payée', color: 'red' as any },
};

export const OrderDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: orders } = useQuery({ queryKey: ['orders'], queryFn: FabriktiService.getOrders });
  const { data: clients } = useQuery({ queryKey: ['clients'], queryFn: FabriktiService.getClients });
  const { data: products } = useQuery({ queryKey: ['products'], queryFn: FabriktiService.getProducts });
  const { data: transactions } = useQuery({ queryKey: ['transactions'], queryFn: FabriktiService.getTransactions });

  const order = orders?.find(o => o.id === id);
  const client = clients?.find(c => c.id === order?.clientId);
  const orderTransactions = transactions?.filter(t => t.orderId === id) || [];

  const updateStatusMutation = useMutation({
    mutationFn: (newStatus: OrderStatus) => FabriktiService.saveOrder({ ...order!, status: newStatus }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] })
  });

  const deleteMutation = useMutation({
    mutationFn: () => FabriktiService.delete('orders', id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      navigate('/orders');
    }
  });

  if (!order) return <div className="p-20 text-center text-gray-400">Commande introuvable.</div>;

  const remaining = order.totalPrice - (order.paidAmount || 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link to="/orders">
            <Button variant="ghost" className="p-2"><ArrowLeft size={20}/></Button>
          </Link>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">CMD-{order.id.slice(0,8)}</h2>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Créée le {new Date(order.orderDate).toLocaleDateString()}</p>
          </div>
        </div>

      </div>

      <ResponsiveGrid className="lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* STATUT ET ACTIONS */}
          <Card className="p-8 border-none shadow-xl shadow-slate-200/50">
            <div className="flex flex-wrap justify-between items-center gap-6">
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-2xl bg-${STATUS_LABELS[order.status]?.color || 'gray'}-50 text-${STATUS_LABELS[order.status]?.color || 'gray'}-600`}>
                  {STATUS_LABELS[order.status]?.icon}
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">État de l'ordre</p>
                  <p className="text-xl font-black text-slate-900 uppercase tracking-tighter">{STATUS_LABELS[order.status]?.label}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <select 
                  className="h-12 border border-slate-200 rounded-xl px-4 text-sm font-bold bg-slate-50 outline-none focus:ring-4 focus:ring-blue-100"
                  value={order.status}
                  onChange={(e) => updateStatusMutation.mutate(e.target.value as OrderStatus)}
                >
                  {Object.values(OrderStatus).map(s => <option key={s} value={s}>{STATUS_LABELS[s].label}</option>)}
                </select>
                <div className="w-10 h-10 bg-green-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-green-200">
                  <CheckCircle size={20} />
                </div>
              </div>
            </div>

            {/* LISTE DES PRODUITS */}
            <div className="mt-10 border-t border-slate-100 pt-8">
               <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-2">
                 <ShoppingCart size={16} className="text-blue-500"/> Articles en Production
               </h3>
               <div className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-100">
                  <table className="w-full text-left">
                    <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4">Désignation</th>
                        <th className="px-6 py-4">Quantité</th>
                        <th className="px-6 py-4">PU HT</th>
                        <th className="px-6 py-4 text-right">Total HT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {order.items?.map((item, idx) => {
                        const p = products?.find(prod => prod.id === item.productId);
                        return (
                          <tr key={idx} className="text-sm font-bold text-slate-700">
                            <td className="px-6 py-4">{p?.name || 'Produit Inconnu'}</td>
                            <td className="px-6 py-4">{item.quantity} {item.unit}</td>
                            <td className="px-6 py-4">{item.unitPrice?.toLocaleString()} €</td>
                            <td className="px-6 py-4 text-right font-black">{item.totalItemPrice?.toLocaleString()} €</td>
                          </tr>
                        );
                      })}
                      {(!order.items || order.items.length === 0) && (
                         <tr className="text-sm font-bold text-slate-700">
                            <td className="px-6 py-4">Produit Unique (Legacy)</td>
                            {/* Fix: Order no longer has a top-level quantity property. Fallback to 0. */}
                            <td className="px-6 py-4">0</td>
                            <td className="px-6 py-4">--</td>
                            <td className="px-6 py-4 text-right font-black">{order.totalPrice.toLocaleString()} €</td>
                         </tr>
                      )}
                    </tbody>
                  </table>
               </div>
            </div>

            {/* RÉCAPITULATIF FINANCIER */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 p-6 bg-slate-900 rounded-3xl text-white">
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Montant de la commande</p>
                  <p className="text-2xl font-black">{order.totalPrice.toLocaleString()} €</p>
               </div>
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Déjà encaissé</p>
                  <p className="text-2xl font-black text-emerald-400">{order.paidAmount?.toLocaleString() || 0} €</p>
               </div>
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Reste à percevoir</p>
                  <p className={`text-2xl font-black ${remaining > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>{remaining.toLocaleString()} €</p>
               </div>
            </div>
          </Card>

          {/* FLUX FINANCIER LIÉ */}
          <Card className="p-8 border-none shadow-xl shadow-slate-200/50">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
              <DollarSign size={16} className="text-emerald-500" /> Historique des Paiements
            </h3>
            <div className="space-y-3">
              {orderTransactions.length === 0 ? (
                <div className="p-10 text-center border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 italic font-medium">
                  Aucun mouvement de trésorerie lié à cette commande.
                </div>
              ) : orderTransactions.map(t => (
                <div key={t.id} className="flex justify-between items-center p-4 bg-white border border-slate-100 rounded-2xl hover:border-blue-200 transition-all shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl ${t.type === TransactionType.INCOME ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'} flex items-center justify-center`}>
                      <CreditCard size={18}/>
                    </div>
                    <div>
                      <p className="font-black text-slate-900 text-sm">{t.description}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(t.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <p className={`font-black ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-red-600'}`}>
                    {t.type === TransactionType.INCOME ? '+' : '-'}{t.amount.toLocaleString()} €
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* INFOS CLIENT & PRODUCTION */}
        <div className="space-y-6">
          <Card className="p-8 border-none bg-blue-600 text-white shadow-xl shadow-blue-500/20">
            <h3 className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-6 flex items-center gap-2">
              <User size={14}/> Client Partenaire
            </h3>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center font-black text-2xl text-white border border-white/20">
                {client?.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="font-black text-xl truncate leading-tight uppercase tracking-tighter">{client?.name}</p>
                <p className="text-xs text-blue-200 font-bold truncate opacity-80">{client?.email}</p>
              </div>
            </div>
            <div className="space-y-3 pt-6 border-t border-white/10">
              <div className="flex items-center gap-3 text-sm font-bold">
                 <Phone size={14} className="opacity-60" /> {client?.phone}
              </div>
              <div className="flex items-start gap-3 text-sm font-bold">
                 <MapPin size={14} className="opacity-60 mt-1" /> {client?.address}
              </div>
            </div>
            <Link to={`/clients/${client?.id}/history`} className="block mt-8">
              <Button variant="ghost" className="w-full h-12 bg-white/10 hover:bg-white/20 text-white text-xs font-black uppercase rounded-xl">Consulter Historique</Button>
            </Link>
          </Card>

          <Card className="p-8 border-none shadow-xl shadow-slate-200/50">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Info size={14}/> Détails Production
            </h3>
            <div className="space-y-4">
               <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Notes Internes</p>
                  <p className="text-sm font-bold text-slate-700 italic">
                    {order.notes || 'Aucune instruction particulière pour l\'atelier.'}
                  </p>
               </div>
               <div className="flex items-center gap-3 text-sm font-bold text-slate-500 px-2">
                  <Calendar size={16} className="text-slate-300"/>
                  Livraison estimée : {order.deliveryDate || 'Non définie'}
               </div>
            </div>
          </Card>
        </div>
      </ResponsiveGrid>
    </div>
  );
};
