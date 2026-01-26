
import React, { useMemo, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FabriktiService } from '../../api/services';
import { Card, Badge, Button, Input } from '../../components/UI';
import { TransactionType, PaymentStatus, Order, Transaction } from '../../types';
// Import the 'Plus' icon and Trash2 for notes management
import { 
  ShoppingBag, ArrowLeft, ArrowRightLeft, Clock, Calendar, 
  DollarSign, Package, CreditCard, TrendingUp, AlertCircle, 
  CheckCircle2, Info, Filter, MessageSquare, User, 
  ChevronRight, ArrowUpCircle, ArrowDownCircle, History,
  Plus, Trash2, Send
} from 'lucide-react';

interface ClientNote {
  id: string;
  text: string;
  date: string;
}

export const ClientHistory: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [filterType, setFilterType] = useState<'all' | 'orders' | 'transactions'>('all');
  
  // État local pour la gestion des notes (Persistance simulée par localStorage)
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [newNoteText, setNewNoteText] = useState('');

  // Chargement des notes au montage
  useEffect(() => {
    const savedNotes = localStorage.getItem(`fabrikti_client_notes_${id}`);
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes));
    }
  }, [id]);

  const saveNotesToStorage = (updatedNotes: ClientNote[]) => {
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

  // Récupération des données
  const { data: clients } = useQuery({ queryKey: ['clients'], queryFn: FabriktiService.getClients });
  const { data: orders } = useQuery({ queryKey: ['orders'], queryFn: FabriktiService.getOrders });
  const { data: transactions } = useQuery({ queryKey: ['transactions'], queryFn: FabriktiService.getTransactions });
  const { data: products } = useQuery({ queryKey: ['products'], queryFn: FabriktiService.getProducts });

  const client = clients?.find(c => c.id === id);
  
  // Logique métier : Agrégation des données client
  const clientOrders = useMemo(() => orders?.filter(o => o.clientId === id) || [], [orders, id]);
  
  const clientTransactions = useMemo(() => {
    if (!transactions) return [];
    return transactions.filter(t => t.clientId === id || (t.orderId && clientOrders.some(o => o.id === t.orderId)));
  }, [transactions, id, clientOrders]);

  // Calculs Financiers Avancés
  const stats = useMemo(() => {
    const totalInvoiced = clientOrders.reduce((sum, o) => sum + o.totalPrice, 0);
    const totalIncomes = clientTransactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = clientTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
    const netPaid = totalIncomes - totalExpenses;
    const balance = netPaid - totalInvoiced;
    const averageOrder = clientOrders.length > 0 ? totalInvoiced / clientOrders.length : 0;
    
    return {
      totalInvoiced,
      totalIncomes,
      totalExpenses,
      netPaid,
      balance,
      averageOrder,
      isDebtor: balance < 0,
      isCreditor: balance > 0
    };
  }, [clientOrders, clientTransactions]);

  // Timeline unifiée (Fusion Commandes + Transactions triées par date)
  const timeline = useMemo(() => {
    const combined: any[] = [
      ...clientOrders.map(o => ({ ...o, _type: 'ORDER' })),
      ...clientTransactions.map(t => ({ ...t, _type: 'TRANSACTION' }))
    ];
    return combined.sort((a, b) => {
      const dateA = new Date(a.orderDate || a.date).getTime();
      const dateB = new Date(b.orderDate || b.date).getTime();
      return dateB - dateA;
    });
  }, [clientOrders, clientTransactions]);

  if (!client) return (
    <div className="p-20 text-center animate-in fade-in duration-500">
      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertCircle size={40} className="text-slate-300" />
      </div>
      <p className="text-slate-500 font-black uppercase tracking-tighter text-xl">Client Introuvable</p>
      <Link to="/clients" className="mt-4 inline-block"><Button variant="secondary">Retour à la liste</Button></Link>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* HEADER PROFESSIONNEL (Boutons masqués visuellement selon demande) */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-5">
          <Link to="/clients">
            <button className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">
              <ArrowLeft size={20} />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                {client.name}
              </h2>
              <Badge color={stats.balance < 0 ? 'red' : 'green'}>
                {stats.balance < 0 ? 'En dette' : 'Solde à jour'}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
              <span className="flex items-center gap-1.5"><User size={12}/> ID: {client.id}</span>
              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
              <span className="flex items-center gap-1.5"><Calendar size={12}/> Partenaire depuis 2024</span>
            </div>
          </div>
        </div>

        {/* Boutons d'action masqués visuellement conformément à la demande de nettoyage UI */}
        <div className="hidden gap-3">
           <Button variant="secondary" className="h-12 px-6 rounded-xl font-black uppercase text-xs">
             <MessageSquare size={16} /> Note interne
           </Button>
           <Button className="h-12 px-6 rounded-xl font-black uppercase text-xs shadow-xl shadow-blue-500/20">
             <Plus size={16} /> Nouvelle Commande
           </Button>
        </div>
      </div>

      {/* DASHBOARD FINANCIER DU PORTEFEUILLE */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Facturé */}
        <Card className="p-6 border-none shadow-xl shadow-slate-200/40 bg-white">
           <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-slate-50 text-slate-600 rounded-2xl border border-slate-100"><ShoppingBag size={20}/></div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Commandes</p>
                <p className="text-sm font-black text-slate-900">{clientOrders.length} bons</p>
              </div>
           </div>
           <p className="text-sm font-bold text-slate-500 uppercase tracking-tight mb-1">Total Facturé HT</p>
           <p className="text-3xl font-black text-slate-900 tracking-tighter">{stats.totalInvoiced.toLocaleString()} €</p>
        </Card>

        {/* Encaissements Net */}
        <Card className="p-6 border-none shadow-xl shadow-emerald-500/5 bg-gradient-to-br from-white to-emerald-50/20">
           <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl"><ArrowUpCircle size={20}/></div>
              <div className="text-right">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Réglé</p>
                <p className="text-sm font-black text-emerald-600">+{stats.totalIncomes.toLocaleString()} €</p>
              </div>
           </div>
           <p className="text-sm font-bold text-slate-500 uppercase tracking-tight mb-1">Total Payé Net</p>
           <p className="text-3xl font-black text-emerald-700 tracking-tighter">{stats.netPaid.toLocaleString()} €</p>
        </Card>

        {/* Solde Client (Le plus important) */}
        <Card className={`p-6 border-none shadow-xl ${stats.balance < 0 ? 'bg-slate-900 text-white shadow-rose-500/10' : 'bg-blue-600 text-white shadow-blue-500/20'}`}>
           <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl ${stats.balance < 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-white/20 text-white'}`}>
                {stats.balance < 0 ? <AlertCircle size={20}/> : <CheckCircle2 size={20}/>}
              </div>
              <div className="text-right">
                <p className={`text-[10px] font-black uppercase tracking-widest ${stats.balance < 0 ? 'text-rose-400' : 'text-blue-200'}`}>
                  {stats.balance < 0 ? 'Dette en cours' : 'Avance client'}
                </p>
              </div>
           </div>
           <p className={`text-sm font-bold uppercase tracking-tight mb-1 ${stats.balance < 0 ? 'text-slate-400' : 'text-blue-100'}`}>Solde du Compte</p>
           <p className={`text-3xl font-black tracking-tighter ${stats.balance < 0 ? 'text-rose-400' : 'text-white'}`}>
            {stats.balance > 0 ? '+' : ''}{stats.balance.toLocaleString()} €
           </p>
        </Card>

        {/* Indicateurs de Performance */}
        <Card className="p-6 border-none shadow-xl shadow-slate-200/40 bg-white">
           <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100"><TrendingUp size={20}/></div>
              <div className="text-right">
                <Badge color="blue">Client Régulier</Badge>
              </div>
           </div>
           <p className="text-sm font-bold text-slate-500 uppercase tracking-tight mb-1">Panier Moyen</p>
           <p className="text-3xl font-black text-slate-900 tracking-tighter">{Math.round(stats.averageOrder).toLocaleString()} €</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* TIMELINE D'ACTIVITÉ UNIFIÉE */}
        <div className="lg:col-span-2 space-y-6">
           <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                <History size={20} className="text-blue-600" /> Journal d'Activité
              </h3>
              <div className="flex gap-2">
                 {['all', 'orders', 'transactions'].map(t => (
                   <button 
                    key={t}
                    onClick={() => setFilterType(t as any)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      filterType === t ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                    }`}
                   >
                     {t === 'all' ? 'Tout' : t === 'orders' ? 'Bons' : 'Flux'}
                   </button>
                 ))}
              </div>
           </div>

           <div className="space-y-4">
              {timeline
                .filter(item => {
                  if (filterType === 'orders') return item._type === 'ORDER';
                  if (filterType === 'transactions') return item._type === 'TRANSACTION';
                  return true;
                })
                .map((item, idx) => {
                const isOrder = item._type === 'ORDER';
                
                return (
                  <div key={idx} className="relative group">
                    {/* Ligne de connexion verticale */}
                    {idx !== timeline.length - 1 && <div className="absolute left-6 top-10 bottom-0 w-px bg-slate-100 group-hover:bg-blue-100 transition-colors"></div>}
                    
                    <div className="flex gap-4">
                      {/* Icône de Statut */}
                      <div className={`z-10 w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border transition-all ${
                        isOrder 
                        ? 'bg-blue-50 border-blue-100 text-blue-600' 
                        : (item.type === TransactionType.INCOME ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600')
                      }`}>
                        {isOrder ? <Package size={20}/> : <ArrowRightLeft size={20}/>}
                      </div>

                      {/* Contenu de la carte d'activité */}
                      <Card className="flex-1 p-5 border-slate-200 hover:border-blue-300 transition-all hover:shadow-lg hover:shadow-slate-100">
                         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                               <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {new Date(item.orderDate || item.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                  </span>
                                  <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                                  <Badge color={isOrder ? 'blue' : (item.type === TransactionType.INCOME ? 'green' : 'red')}>
                                    {isOrder ? 'Bon de Commande' : (item.type === TransactionType.INCOME ? 'Encaissement' : 'Décaissement')}
                                  </Badge>
                               </div>
                               <h4 className="text-base font-black text-slate-900 uppercase tracking-tight">
                                 {isOrder ? `Commande CMD-${item.id.slice(0,5)}` : item.description}
                               </h4>
                               {isOrder && (
                                 <p className="text-xs text-slate-500 font-medium italic mt-1">
                                   {item.items?.length || 0} articles en production • Statut : {item.status}
                                 </p>
                               )}
                            </div>
                            <div className="text-right self-stretch sm:self-auto flex sm:flex-col justify-between items-end gap-2">
                               <p className={`text-xl font-black tracking-tighter ${isOrder ? 'text-slate-900' : (item.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600')}`}>
                                 {isOrder ? '' : (item.type === TransactionType.INCOME ? '+' : '-')}{item.amount || item.totalPrice} €
                               </p>
                               {isOrder ? (
                                 <Link to={`/orders/${item.id}`}>
                                   <button className="flex items-center gap-1 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">
                                      Détails <ChevronRight size={12}/>
                                   </button>
                                 </Link>
                               ) : (
                                 <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Transaction ID: {item.id.slice(0,5)}</span>
                               )}
                            </div>
                         </div>
                      </Card>
                    </div>
                  </div>
                );
              })}
              
              {timeline.length === 0 && (
                <div className="py-20 text-center bg-white rounded-[32px] border-2 border-dashed border-slate-100">
                   <p className="text-slate-400 font-bold uppercase tracking-widest italic">Aucun historique disponible</p>
                </div>
              )}
           </div>
        </div>

        {/* BARRE LATÉRALE D'INFORMATIONS COMPLÉMENTAIRES */}
        <div className="space-y-6">
           {/* Section Notes de Gestion - Version améliorée avec historique */}
           <Card className="p-6 border-none shadow-xl shadow-slate-200/40 bg-white">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                <MessageSquare size={16} className="text-blue-600" /> Notes de gestion
              </h3>
              
              {/* Saisie de nouvelle note */}
              <div className="relative mb-6">
                <textarea 
                  className="w-full h-24 p-4 bg-slate-50 rounded-2xl border-none text-sm font-medium text-slate-600 placeholder:text-slate-300 focus:ring-2 focus:ring-blue-100 outline-none resize-none transition-all"
                  placeholder="Appel client, rappel facture, instruction..."
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
                  className="absolute bottom-3 right-3 p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-colors"
                >
                  <Send size={16} />
                </button>
              </div>

              {/* Liste des notes chronologique */}
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {notes.length === 0 ? (
                  <p className="text-center py-4 text-xs text-slate-300 italic font-bold uppercase tracking-widest">Aucune note enregistrée</p>
                ) : (
                  notes.map(note => (
                    <div key={note.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl group relative hover:border-blue-100 transition-all">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                          {new Date(note.date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <button 
                          onClick={() => handleDeleteNote(note.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-rose-500 transition-all"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                      <p className="text-xs font-semibold text-slate-700 leading-relaxed whitespace-pre-wrap">{note.text}</p>
                    </div>
                  ))
                )}
              </div>
           </Card>

           {/* Section Coordonnées de Facturation */}
           <Card className="p-6 border-none shadow-xl shadow-slate-200/40 bg-white">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Info size={16} className="text-blue-600" /> Données Signalétiques
              </h3>
              <div className="space-y-4">
                 <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0"><Calendar size={14} className="text-slate-400"/></div>
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Principal</p>
                       <p className="text-sm font-bold text-slate-700">{client.email}</p>
                    </div>
                 </div>
                 <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0"><Package size={14} className="text-slate-400"/></div>
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dernière Commande</p>
                       <p className="text-sm font-bold text-slate-700">
                         {clientOrders.length > 0 ? new Date(clientOrders[0].orderDate).toLocaleDateString() : 'N/A'}
                       </p>
                    </div>
                 </div>
              </div>
           </Card>

           {/* Alerte Risque */}
           {stats.balance < -1000 && (
             <div className="p-5 bg-rose-600 rounded-[24px] text-white shadow-xl shadow-rose-200 animate-pulse">
                <div className="flex items-center gap-3 mb-2">
                   <AlertCircle size={20} />
                   <h4 className="font-black uppercase tracking-widest text-xs">Alerte Débiteur</h4>
                </div>
                <p className="text-xs font-medium opacity-90 leading-relaxed">
                  Ce client a dépassé le seuil de tolérance de crédit. Il est conseillé de bloquer les nouvelles commandes avant régularisation.
                </p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};
