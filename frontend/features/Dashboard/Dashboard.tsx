
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FabriktiService } from '../../api/services';
import { Card, Badge, Button, ResponsiveGrid } from '../../components/UI';
import { 
  TrendingUp, Users, ShoppingBag, AlertTriangle, 
  Wallet, Layers, Settings, Calendar, Filter, 
  ArrowUpRight, ArrowDownRight, Package, Truck,
  CheckCircle2, Clock, Ban
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, Cell, PieChart, Pie
} from 'recharts';
import { OrderStatus, TransactionType } from '../../types';

export const Dashboard: React.FC = () => {
  // Filtres globaux
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('month');
  
  // Requêtes de données métier
  const { data: clients } = useQuery({ queryKey: ['clients'], queryFn: FabriktiService.getClients });
  const { data: orders } = useQuery({ queryKey: ['orders'], queryFn: FabriktiService.getOrders });
  const { data: transactions } = useQuery({ queryKey: ['transactions'], queryFn: FabriktiService.getTransactions });
  const { data: materials } = useQuery({ queryKey: ['materials'], queryFn: FabriktiService.getRawMaterials });
  const { data: machines } = useQuery({ queryKey: ['machines'], queryFn: FabriktiService.getMachines });
  const { data: products } = useQuery({ queryKey: ['products'], queryFn: FabriktiService.getProducts });
  const { data: stats } = useQuery({ queryKey: ['dashboard-stats'], queryFn: FabriktiService.getDashboardStats });

  // Calculs Financiers (Agrégés)
  const financialSummary = useMemo(() => {
    if (!transactions) return { income: 0, expense: 0, balance: 0 };
    return transactions.reduce((acc, t) => {
      if (t.type === TransactionType.INCOME) acc.income += t.amount;
      else acc.expense += t.amount;
      acc.balance = acc.income - acc.expense;
      return acc;
    }, { income: 0, expense: 0, balance: 0 });
  }, [transactions]);

  // Statistiques de Production
  const productionSummary = useMemo(() => {
    if (!orders) return { active: 0, completed: 0, pending: 0, total: 0 };
    return orders.reduce((acc, o) => {
      acc.total++;
      if (o.status === OrderStatus.EN_ATTENTE) acc.pending++;
      else if (o.status === OrderStatus.LIVREE) acc.completed++;
      else acc.active++;
      return acc;
    }, { active: 0, completed: 0, pending: 0, total: 0 });
  }, [orders]);

  // Performance Financière (Données Mockées cohérentes avec les transactions)
  const chartData = useMemo(() => {
    return [
      { name: 'Lun', flux: 2400, orders: 1200 },
      { name: 'Mar', flux: 3100, orders: 2800 },
      { name: 'Mer', flux: 1800, orders: 3200 },
      { name: 'Jeu', flux: 4200, orders: 4500 },
      { name: 'Ven', flux: 3800, orders: 3900 },
      { name: 'Sam', flux: 1500, orders: 800 },
      { name: 'Dim', flux: 900, orders: 300 },
    ];
  }, []);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Dashboard */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Dashboard Analytics</h2>
          <p className="text-slate-500 font-medium">Vue consolidée de l'ensemble de l'écosystème Fabrikti.</p>
        </div>
        <div className="flex gap-2 p-1 bg-white rounded-2xl border border-slate-200 shadow-sm self-stretch md:self-auto">
          {['today', 'week', 'month', 'all'].map((f) => (
            <button
              key={f}
              onClick={() => setDateFilter(f as any)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                dateFilter === f ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {f === 'today' ? 'Aujourd\'hui' : f === 'week' ? 'Semaine' : f === 'month' ? 'Mois' : 'Global'}
            </button>
          ))}
        </div>
      </div>

      {/* Cartes Indicateurs Clés (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 border-none shadow-xl shadow-blue-500/5 bg-gradient-to-br from-white to-blue-50/30">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl"><Wallet size={24} /></div>
            <div className="flex flex-col items-end">
               <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Balance</span>
               <div className="flex items-center text-emerald-600 font-bold text-sm"><TrendingUp size={14} className="mr-1"/> +12.5%</div>
            </div>
          </div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Trésorerie Nette</p>
          <p className="text-3xl font-black text-slate-900">{financialSummary.balance.toLocaleString()} €</p>
        </Card>

        <Card className="p-6 border-none shadow-xl shadow-emerald-500/5 bg-gradient-to-br from-white to-emerald-50/30">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl"><ShoppingBag size={24} /></div>
            <Badge color="green">{(productionSummary.active + productionSummary.pending)} Actifs</Badge>
          </div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Commandes en cours</p>
          <p className="text-3xl font-black text-slate-900">{productionSummary.active + productionSummary.pending}</p>
        </Card>

        <Card className="p-6 border-none shadow-xl shadow-amber-500/5 bg-gradient-to-br from-white to-amber-50/30">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl"><Layers size={24} /></div>
            <Badge color={materials?.filter(m => m.stock < 10).length ? 'red' : 'gray'}>
              {materials?.filter(m => m.stock < 10).length || 0} Alertes
            </Badge>
          </div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Matières Premières</p>
          <p className="text-3xl font-black text-slate-900">{materials?.length || 0}</p>
        </Card>

        <Card className="p-6 border-none shadow-xl shadow-indigo-500/5 bg-gradient-to-br from-white to-indigo-50/30">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl"><Settings size={24} /></div>
            <div className="flex items-center gap-1 text-xs font-bold text-slate-400">
               {machines?.filter(m => m.status === 'operational').length || 0} / {machines?.length || 0} ON
            </div>
          </div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Capacité Machine</p>
          <p className="text-3xl font-black text-slate-900">
            {Math.round(((machines?.filter(m => m.status === 'operational').length || 0) / (machines?.length || 1)) * 100)}%
          </p>
        </Card>
      </div>

      {/* Graphiques de Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Graphique Flux de Trésorerie */}
        <Card className="lg:col-span-2 p-8 border-none shadow-2xl shadow-slate-200/50">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Flux de Production vs Trésorerie</h3>
              <p className="text-sm text-slate-400 font-medium">Analyse comparative sur la période sélectionnée.</p>
            </div>
            <div className="flex gap-4">
               <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-xs font-bold text-slate-500 uppercase">Trésorerie</span>
               </div>
               <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-indigo-200"></div>
                  <span className="text-xs font-bold text-slate-500 uppercase">Commandes</span>
               </div>
            </div>
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorFlux" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 700}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 700}} />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}}
                />
                <Area type="monotone" dataKey="flux" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorFlux)" />
                <Bar dataKey="orders" fill="#e0e7ff" radius={[4, 4, 0, 0]} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* État de la Production (Pie) */}
        <Card className="p-8 border-none shadow-2xl shadow-slate-200/50">
           <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase mb-2 text-center">État Commandes</h3>
           <p className="text-sm text-slate-400 font-medium text-center mb-10">Répartition par statut de production.</p>
           <div className="h-[300px] flex items-center justify-center">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'En attente', value: productionSummary.pending },
                      { name: 'Actives', value: productionSummary.active },
                      { name: 'Livrées', value: productionSummary.completed },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {[0,1,2].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
             </ResponsiveContainer>
           </div>
           <div className="space-y-3 mt-4">
              <div className="flex justify-between items-center text-sm">
                 <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div> <span className="font-bold text-slate-600">En attente</span></div>
                 <span className="font-black">{productionSummary.pending}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                 <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> <span className="font-bold text-slate-600">Actives</span></div>
                 <span className="font-black">{productionSummary.active}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                 <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500"></div> <span className="font-bold text-slate-600">Livrées</span></div>
                 <span className="font-black">{productionSummary.completed}</span>
              </div>
           </div>
        </Card>
      </div>

      {/* Résumé des Activités Récentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Dernières Transactions */}
        <Card className="p-8 border-none shadow-xl shadow-slate-200/50">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Derniers Flux Financiers</h3>
            <Button variant="ghost" className="text-xs font-black uppercase text-blue-600">Tout voir</Button>
          </div>
          <div className="space-y-4">
            {transactions?.slice(0, 5).map((t, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-blue-200 transition-all cursor-default">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    t.type === TransactionType.INCOME ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {t.type === TransactionType.INCOME ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                  </div>
                  <div>
                    <p className="font-black text-slate-900 text-sm">{t.description}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.category} • {new Date(t.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-black text-sm ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-red-600'}`}>
                    {t.type === TransactionType.INCOME ? '+' : '-'}{t.amount.toLocaleString()} €
                  </p>
                </div>
              </div>
            ))}
            {!transactions?.length && <p className="text-center py-10 text-slate-400 italic">Aucune transaction.</p>}
          </div>
        </Card>

        {/* État des Machines & Alertes */}
        <Card className="p-8 border-none shadow-xl shadow-slate-200/50">
           <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Santé des Machines</h3>
            <Button variant="ghost" className="text-xs font-black uppercase text-blue-600">Maintenance</Button>
          </div>
          <div className="space-y-4">
            {machines?.map((m, idx) => (
               <div key={idx} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl">
                  <div className="flex items-center gap-4">
                     <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                        <Settings size={20} />
                     </div>
                     <div>
                        <p className="font-black text-slate-900 text-sm">{m.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dernière révision: {m.lastMaintenance}</p>
                     </div>
                  </div>
                  <Badge color={m.status === 'operational' ? 'green' : m.status === 'maintenance' ? 'yellow' : 'red'}>
                    {m.status === 'operational' ? 'OK' : m.status === 'maintenance' ? 'REVISION' : 'STOP'}
                  </Badge>
               </div>
            ))}
            {!machines?.length && <p className="text-center py-10 text-slate-400 italic">Aucune machine.</p>}
          </div>
          
          {/* Alerte Matière Basse */}
          <div className="mt-8 p-5 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-4">
             <div className="w-12 h-12 rounded-xl bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-500/30">
                <AlertTriangle size={24} />
             </div>
             <div>
                <p className="font-black text-red-900 uppercase text-xs">Alerte Stocks Critiques</p>
                <p className="text-sm text-red-700 font-medium">
                  {materials?.filter(m => m.stock < 10).length || 0} matières premières sont sous le seuil critique de production.
                </p>
             </div>
          </div>
        </Card>
      </div>

      {/* Résumé Final Clients & Produits */}
      <ResponsiveGrid className="lg:grid-cols-2">
         <Card className="p-6 border-none bg-slate-900 text-white shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
               <div className="p-3 bg-white/10 rounded-2xl"><Users size={24} className="text-white" /></div>
               <div>
                  <h4 className="font-black uppercase tracking-tight">Expansion Clientèle</h4>
                  <p className="text-xs text-slate-400 font-bold">Total Clients: {clients?.length || 0}</p>
               </div>
            </div>
            <div className="flex items-end justify-between">
               <div>
                  <p className="text-3xl font-black tracking-tighter">+{clients?.length || 0}</p>
                  <p className="text-xs font-bold text-slate-500 uppercase">Partenaires actifs</p>
               </div>
               <div className="w-24 h-12 bg-white/5 rounded-xl flex items-center justify-center text-[10px] font-black tracking-widest text-emerald-400">
                  CROISSANCE
               </div>
            </div>
         </Card>
         <Card className="p-6 border-none bg-blue-600 text-white shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
               <div className="p-3 bg-white/10 rounded-2xl"><Package size={24} className="text-white" /></div>
               <div>
                  <h4 className="font-black uppercase tracking-tight">Catalogue Produits</h4>
                  <p className="text-xs text-blue-200 font-bold">Total Références: {products?.length || 0}</p>
               </div>
            </div>
            <div className="flex items-end justify-between">
               <div>
                  <p className="text-3xl font-black tracking-tighter">{products?.length || 0}</p>
                  <p className="text-xs font-bold text-blue-200 uppercase tracking-widest">Modèles usinables</p>
               </div>
               <Button variant="ghost" className="text-white bg-white/10 hover:bg-white/20 text-xs uppercase font-black">Gestion</Button>
            </div>
         </Card>
      </ResponsiveGrid>
    </div>
  );
};
