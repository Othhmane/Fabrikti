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
  DollarSign, Info, Phone, MapPin, Truck as TruckIcon
} from 'lucide-react';

const STATUS_LABELS = {
  [OrderStatus.EN_ATTENTE]: { label: 'En attente', color: 'gray' as any, icon: <Clock size={16}/> },
  [OrderStatus.EN_PREPARATION]: { label: 'En préparation', color: 'yellow' as any, icon: <Package size={16}/> },
  [OrderStatus.EN_STOCK]: { label: 'En stock', color: 'blue' as any, icon: <Database size={16}/> },
  [OrderStatus.LIVREE]: { label: 'Livrée', color: 'green' as any, icon: <Truck size={16}/> },
  [OrderStatus.ANNULEE]: { label: 'Annulée', color: 'red' as any, icon: <Ban size={16}/> },
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
  const isSupplier = (client as any)?.type === 'FOURNISSEUR';
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
    <div style={{ backgroundColor: '#F8F9FC', minHeight: '100vh', padding: '2rem' }}>
      {/* TITRE SÉPARÉ */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '1.5rem 2rem', 
        borderRadius: '12px',
        border: '1px solid #E5E7EB',
        marginBottom: '1.5rem'
      }}>
        <div className="flex items-center gap-3 mb-2">
          <Link to="/orders">
            <button className="p-2 hover:bg-gray-50 rounded-lg transition-colors">
              <ArrowLeft size={20} className="text-gray-600"/>
            </button>
          </Link>
          <h1 style={{ 
            fontSize: '1.5rem', 
            fontWeight: '600', 
            color: '#1F2937',
            margin: 0
          }}>
            {isSupplier ? 'Bon d\'achat' : 'Commande'} {order.id.slice(0,8)}
          </h1>
        </div>
        <p style={{ 
          fontSize: '0.875rem', 
          color: '#9CA3AF',
          margin: 0,
          paddingLeft: '3.25rem'
        }}>
          Créée le {new Date(order.orderDate).toLocaleDateString()}
        </p>
      </div>

      <ResponsiveGrid className="lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* STATUT ET ACTIONS */}
          <div style={{ 
            backgroundColor: 'white', 
            padding: '2rem', 
            borderRadius: '12px',
            border: '1px solid #E5E7EB'
          }}>
            <div className="flex flex-wrap justify-between items-center gap-6 mb-8">
              <div className="flex items-center gap-4">
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #6366F1 0%, #3B82F6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}>
                  {STATUS_LABELS[order.status]?.icon}
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginBottom: '0.25rem' }}>
                    État de l'ordre
                  </p>
                  <p style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1F2937' }}>
                    {STATUS_LABELS[order.status]?.label}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <select 
                  style={{
                    height: '40px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    padding: '0 1rem',
                    fontSize: '0.875rem',
                    backgroundColor: 'white',
                    outline: 'none',
                    color: '#1F2937'
                  }}
                  value={order.status}
                  onChange={(e) => updateStatusMutation.mutate(e.target.value as OrderStatus)}
                >
                  {Object.values(OrderStatus).map(s => <option key={s} value={s}>{STATUS_LABELS[s].label}</option>)}
                </select>
                <button 
                  style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: '#10B981',
                    color: 'white',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <CheckCircle size={18} />
                </button>
              </div>
            </div>

            {/* LISTE DES PRODUITS */}
            <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '2rem' }}>
               <h3 style={{ 
                 fontSize: '0.875rem', 
                 fontWeight: '600', 
                 color: '#1F2937',
                 marginBottom: '1rem',
                 display: 'flex',
                 alignItems: 'center',
                 gap: '0.5rem'
               }}>
                 <ShoppingCart size={16} className="text-indigo-600"/> Articles commandés
               </h3>
               <div style={{ 
                 backgroundColor: '#F9FAFB', 
                 borderRadius: '8px',
                 border: '1px solid #E5E7EB',
                 overflow: 'hidden'
               }}>
                  <table className="w-full text-left">
                    <thead style={{ 
                      fontSize: '0.75rem', 
                      color: '#6B7280',
                      borderBottom: '1px solid #E5E7EB'
                    }}>
                      <tr>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: '500' }}>Désignation</th>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: '500' }}>Quantité</th>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: '500' }}>PU HT</th>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: '500', textAlign: 'right' }}>Total HT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items?.map((item, idx) => {
                        const p = products?.find(prod => prod.id === item.productId);
                        return (
                          <tr key={idx} style={{ 
                            fontSize: '0.875rem', 
                            color: '#374151',
                            borderTop: idx > 0 ? '1px solid #E5E7EB' : 'none'
                          }}>
                            <td style={{ padding: '0.75rem 1rem' }}>{p?.name || 'Produit Inconnu'}</td>
                            <td style={{ padding: '0.75rem 1rem' }}>{item.quantity} {item.unit}</td>
                            <td style={{ padding: '0.75rem 1rem' }}>{item.unitPrice?.toLocaleString()} DA</td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '600' }}>
                              {item.totalItemPrice?.toLocaleString()} DA
                            </td>
                          </tr>
                        );
                      })}
                      {(!order.items || order.items.length === 0) && (
                         <tr style={{ fontSize: '0.875rem', color: '#374151' }}>
                            <td style={{ padding: '0.75rem 1rem' }}>Produit Unique (Legacy)</td>
                            <td style={{ padding: '0.75rem 1rem' }}>0</td>
                            <td style={{ padding: '0.75rem 1rem' }}>--</td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '600' }}>
                              {order.totalPrice.toLocaleString()} DA
                            </td>
                         </tr>
                      )}
                    </tbody>
                  </table>
               </div>
            </div>

            {/* RÉCAPITULATIF FINANCIER */}
            <div style={{ 
              marginTop: '2rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              padding: '1.5rem',
              backgroundColor: 'rgb(219, 234, 254)',
              color: 'rgb(30, 64, 175)',
            }}>
               <div>
                  <p style={{ fontSize: '0.75rem', color: 'rgb(30, 64, 175)', marginBottom: '0.25rem' }}>
                    Montant total
                  </p>
                  <p style={{ fontSize: '1.5rem', fontWeight: '600' }}>
                    {order.totalPrice.toLocaleString()} DA
                  </p>
               </div>
               <div>
                  <p style={{ fontSize: '0.75rem', color: 'rgb(30, 64, 175)', marginBottom: '0.25rem' }}>
                    Déjà encaissé
                  </p>
                  <p style={{ fontSize: '1.5rem', fontWeight: '600', color: '#10B981' }}>
                    {order.paidAmount?.toLocaleString() || 0} DA
                  </p>
               </div>
               <div>
                  <p style={{ fontSize: '0.75rem', color: 'rgb(30, 64, 175)', marginBottom: '0.25rem' }}>
                    Reste à percevoir
                  </p>
                  <p style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: '600',
                    color: 'rgb(30, 64, 175)',
                  }}>
                    {remaining.toLocaleString()} DA
                  </p>
               </div>
            </div>
          </div>

          {/* FLUX FINANCIER LIÉ */}
          <div style={{ 
            backgroundColor: 'white', 
            padding: '2rem', 
            borderRadius: '12px',
            border: '1px solid #E5E7EB'
          }}>
            <h3 style={{ 
              fontSize: '0.875rem', 
              fontWeight: '600', 
              color: '#1F2937',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <DollarSign size={16} className="text-emerald-600" /> Historique des Paiements
            </h3>
            <div className="space-y-3">
              {orderTransactions.length === 0 ? (
                <div style={{ 
                  padding: '2rem', 
                  textAlign: 'center',
                  border: '2px dashed #E5E7EB',
                  borderRadius: '8px',
                  color: '#9CA3AF',
                  fontSize: '0.875rem'
                }}>
                  Aucun mouvement de trésorerie lié à cette commande.
                </div>
              ) : orderTransactions.map(t => (
                <div key={t.id} style={{ 
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px'
                }} className="hover:border-indigo-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      backgroundColor: t.type === TransactionType.INCOME ? '#D1FAE5' : '#FEE2E2',
                      color: t.type === TransactionType.INCOME ? '#10B981' : '#EF4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <CreditCard size={18}/>
                    </div>
                    <div>
                      <p style={{ fontWeight: '600', color: '#1F2937', fontSize: '0.875rem' }}>
                        {t.description}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                        {new Date(t.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <p style={{ 
                    fontWeight: '600',
                    color: t.type === TransactionType.INCOME ? '#10B981' : '#EF4444'
                  }}>
                    {t.type === TransactionType.INCOME ? '+' : '-'}{t.amount.toLocaleString()} DA
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* INFOS CLIENT OU FOURNISSEUR */}
        <div className="space-y-6">
          <div style={{ 
            backgroundColor: 'white', 
            padding: '2rem', 
            borderRadius: '12px',
            border: '1px solid #E5E7EB'
          }}>
            <h3 style={{ 
              fontSize: '0.75rem', 
              color: '#9CA3AF',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              {isSupplier ? <TruckIcon size={14} /> : <User size={14} />} 
              {isSupplier ? 'Informations Fournisseur' : 'Informations Client'}
            </h3>
            <div className="flex items-center gap-3 mb-6">
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366F1 0%, #3B82F6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: '600',
                color: 'white'
              }}>
                {client?.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p style={{ fontWeight: '600', fontSize: '1.125rem', color: '#1F2937' }} className="truncate">
                  {client?.name}
                </p>
                <p style={{ fontSize: '0.875rem', color: '#9CA3AF' }} className="truncate">
                  {client?.email}
                </p>
              </div>
            </div>
            
            {/* Sections colorées pour téléphone et adresse */}
            <div className="space-y-3">
              <div style={{
                backgroundColor: '#DBEAFE',
                padding: '0.75rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <Phone size={16} style={{ color: '#3B82F6' }} />
                <span style={{ fontSize: '0.875rem', color: '#1E40AF', fontWeight: '500' }}>
                  {client?.phone}
                </span>
              </div>
              
              <div style={{
                backgroundColor: '#FEF3C7',
                padding: '0.75rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'start',
                gap: '0.75rem'
              }}>
                <MapPin size={16} style={{ color: '#F59E0B', marginTop: '2px' }} />
                <span style={{ fontSize: '0.875rem', color: '#92400E', fontWeight: '500' }}>
                  {client?.address}
                </span>
              </div>
            </div>
            
            <Link to={`/${isSupplier ? 'suppliers' : 'clients'}/${client?.id}/history`} className="block mt-6">
              <button style={{
                width: '100%',
                height: '40px',
                backgroundColor: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#6366F1',
                cursor: 'pointer'
              }} className="hover:bg-gray-50 transition-colors">
                Consulter Historique
              </button>
            </Link>
          </div>

          <div style={{ 
            backgroundColor: 'white', 
            padding: '2rem', 
            borderRadius: '12px',
            border: '1px solid #E5E7EB'
          }}>
            <h3 style={{ 
              fontSize: '0.75rem', 
              color: '#9CA3AF',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Info size={14}/> Détails Production
            </h3>
            <div className="space-y-4">
               <div style={{ 
                 padding: '1rem',
                 backgroundColor: '#F9FAFB',
                 borderRadius: '8px',
                 border: '1px solid #E5E7EB'
               }}>
                  <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginBottom: '0.5rem' }}>
                    Notes Internes
                  </p>
                  <p style={{ fontSize: '0.875rem', color: '#374151', fontStyle: 'italic' }}>
                    {order.notes || 'Aucune instruction particulière pour l\'atelier.'}
                  </p>
               </div>
               <div style={{
                 display: 'flex',
                 alignItems: 'center',
                 gap: '0.75rem',
                 fontSize: '0.875rem',
                 color: '#6B7280',
                 padding: '0.5rem'
               }}>
                  <Calendar size={16} style={{ color: '#9CA3AF' }}/>
                  Livraison estimée : {order.deliveryDate || 'Non définie'}
               </div>
            </div>
          </div>
        </div>
      </ResponsiveGrid>
    </div>
  );
};