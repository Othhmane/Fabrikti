import React, { useMemo, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FabriktiService } from '../../api/services';
import { Card, Badge, Button, Input } from '../../components/UI';
import { TransactionType, PaymentStatus, Order, Transaction } from '../../types';
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
  
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [newNoteText, setNewNoteText] = useState('');

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

  const { data: clients } = useQuery({ queryKey: ['clients'], queryFn: FabriktiService.getClients });
  const { data: orders } = useQuery({ queryKey: ['orders'], queryFn: FabriktiService.getOrders });
  const { data: transactions } = useQuery({ queryKey: ['transactions'], queryFn: FabriktiService.getTransactions });
  const { data: products } = useQuery({ queryKey: ['products'], queryFn: FabriktiService.getProducts });

  const client = clients?.find(c => c.id === id);
  
  const clientOrders = useMemo(() => orders?.filter(o => o.clientId === id) || [], [orders, id]);
  
  const clientTransactions = useMemo(() => {
    if (!transactions) return [];
    return transactions.filter(t => t.clientId === id || (t.orderId && clientOrders.some(o => o.id === t.orderId)));
  }, [transactions, id, clientOrders]);

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
    <div className="p-20 text-center">
      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertCircle size={40} className="text-gray-300" />
      </div>
      <p className="text-gray-500 text-sm">Client Introuvable</p>
      <Link to="/clients" className="mt-4 inline-block"><Button variant="secondary">Retour à la liste</Button></Link>
    </div>
  );

  return (
    <div className="space-y-6">
      
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
              <p className="text-sm text-gray-500 mt-0.5">Historique du client</p>
            </div>
          </div>
          <Badge color={stats.balance < 0 ? 'red' : 'green'}>
            {stats.balance < 0 ? 'En dette' : 'Solde à jour'}
          </Badge>
        </div>
      </div>

      {/* Stats financières */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Facturé */}
        <div className="bg-white border border-gray-100 rounded-lg p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
              <ShoppingBag size={18} className="text-white"/>
            </div>
            <div>
              <p className="text-xs text-gray-500">Commandes</p>
              <p className="text-sm font-semibold text-gray-900">{clientOrders.length} bons</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-1">Total Facturé HT</p>
          <p className="text-2xl font-semibold text-gray-900">{stats.totalInvoiced.toLocaleString()} €</p>
        </div>

        {/* Encaissements */}
        <div className="bg-white border border-gray-100 rounded-lg p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <ArrowUpCircle size={18} className="text-white"/>
            </div>
            <div>
              <p className="text-xs text-emerald-600">Réglé</p>
              <p className="text-sm font-semibold text-emerald-600">+{stats.totalIncomes.toLocaleString()} €</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-1">Total Payé Net</p>
          <p className="text-2xl font-semibold text-emerald-600">{stats.netPaid.toLocaleString()} €</p>
        </div>

        {/* Solde Client */}
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
            {stats.balance > 0 ? '+' : ''}{stats.balance.toLocaleString()} €
          </p>
        </div>

        {/* Panier Moyen */}
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
          <p className="text-2xl font-semibold text-gray-900">{Math.round(stats.averageOrder).toLocaleString()} €</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Timeline */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
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
                  {t === 'all' ? 'Tout' : t === 'orders' ? 'Bons' : 'Flux'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {timeline
              .filter(item => {
                if (filterType === 'orders') return item._type === 'ORDER';
                if (filterType === 'transactions') return item._type === 'TRANSACTION';
                return true;
              })
              .map((item, idx) => {
              const isOrder = item._type === 'ORDER';
              
              return (
                <div key={idx} className="bg-white border border-gray-100 rounded-lg p-4 hover:border-indigo-200 transition-all">
                  <div className="flex items-start gap-4">
                    {/* Icône */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      isOrder 
                      ? 'bg-blue-50 text-blue-600' 
                      : (item.type === TransactionType.INCOME ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600')
                    }`}>
                      {isOrder ? <Package size={18}/> : <ArrowRightLeft size={18}/>}
                    </div>

                    {/* Contenu */}
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
                          {isOrder ? 'Bon de Commande' : (item.type === TransactionType.INCOME ? 'Encaissement' : 'Décaissement')}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-1">
                        {isOrder ? `Commande CMD-${item.id.slice(0,5)}` : item.description}
                      </h4>
                      {isOrder && (
                        <p className="text-xs text-gray-500">
                          {item.items?.length || 0} articles • Statut : {item.status}
                        </p>
                      )}
                    </div>

                    {/* Montant */}
                    <div className="text-right">
                      <p className={`text-lg font-semibold ${isOrder ? 'text-gray-900' : (item.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600')}`}>
                        {isOrder ? '' : (item.type === TransactionType.INCOME ? '+' : '-')}{item.amount || item.totalPrice} €
                      </p>
                      {isOrder && (
                        <Link to={`/orders/${item.id}`}>
                          <button className="flex items-center gap-1 text-xs text-indigo-600 hover:underline mt-1">
                            Détails <ChevronRight size={12}/>
                          </button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {timeline.length === 0 && (
              <div className="py-16 text-center bg-white rounded-lg border border-dashed border-gray-200">
                <p className="text-gray-400 text-sm">Aucun historique disponible</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          
          {/* Notes */}
          <div className="bg-white border border-gray-100 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare size={16} className="text-indigo-600" /> Notes de gestion
            </h3>
            
            {/* Saisie */}
            <div className="relative mb-4">
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

            {/* Liste des notes */}
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
                        className="p-1 text-gray-300 hover:text-rose-500 transition-all"
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

          {/* Coordonnées */}
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
                  <Package size={14} className="text-emerald-600"/>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Dernière Commande</p>
                  <p className="text-sm font-medium text-gray-900">
                    {clientOrders.length > 0 ? new Date(clientOrders[0].orderDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Alerte Dette */}
          {stats.balance < -1000 && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={16} className="text-rose-600" />
                <h4 className="font-semibold text-sm text-rose-900">Alerte Débiteur</h4>
              </div>
              <p className="text-xs text-rose-700 leading-relaxed">
                Ce client a dépassé le seuil de tolérance de crédit. Il est conseillé de bloquer les nouvelles commandes avant régularisation.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};