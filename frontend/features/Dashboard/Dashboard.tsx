import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FabriktiService } from '../../api/services';
import { Card, Badge, Button } from '../../components/UI';
import { 
  TrendingUp, Users, ShoppingBag, AlertTriangle, 
  Wallet, Settings, Package, Truck,
  CheckCircle2, Clock, Ban, ArrowUpRight, ArrowDownRight,
  Activity, Zap, Box, AlertCircle
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell
} from 'recharts';
import { OrderStatus, TransactionType } from '../../types';

export const Dashboard: React.FC = () => {
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('month');
  
  const { data: clients } = useQuery({ queryKey: ['clients'], queryFn: FabriktiService.getClients });
  const { data: orders } = useQuery({ queryKey: ['orders'], queryFn: FabriktiService.getOrders });
  const { data: transactions } = useQuery({ queryKey: ['transactions'], queryFn: FabriktiService.getTransactions });
  const { data: materials } = useQuery({ queryKey: ['materials'], queryFn: FabriktiService.getRawMaterials });
  const { data: machines } = useQuery({ queryKey: ['machines'], queryFn: FabriktiService.getMachines });
  const { data: products } = useQuery({ queryKey: ['products'], queryFn: FabriktiService.getProducts });

  const financialSummary = useMemo(() => {
    if (!transactions) return { income: 0, expense: 0, balance: 0 };
    return transactions.reduce((acc, t) => {
      if (t.type === TransactionType.INCOME) acc.income += t.amount;
      else acc.expense += t.amount;
      acc.balance = acc.income - acc.expense;
      return acc;
    }, { income: 0, expense: 0, balance: 0 });
  }, [transactions]);

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

  const chartData = [
    { name: 'Lun', flux: 2400, prod: 4 },
    { name: 'Mar', flux: 3100, prod: 7 },
    { name: 'Mer', flux: 1800, prod: 5 },
    { name: 'Jeu', flux: 4200, prod: 9 },
    { name: 'Ven', flux: 3800, prod: 6 },
    { name: 'Sam', flux: 1500, prod: 2 },
    { name: 'Dim', flux: 900, prod: 1 },
  ];

  const lowStockMaterials = materials?.filter(m => m.stock < 10) || [];
  const machinesInMaintenance = machines?.filter(m => m.status !== 'operational') || [];

  return (
    <div className="bg-[#F8F9FC] min-h-screen font-sans pb-10">
      {/* HEADER TITLE */}
      <div className="bg-white border-b border-slate-200 px-6 md:px-10 py-6 mb-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Tableau de Bord Atelier</h1>
            <p className="text-sm text-slate-500 mt-2">Suivi en temps réel de la production et des flux</p>
          </div>

        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-10 space-y-8">
        
        {/* TOP KPIs - PRODUCTION FOCUS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6 border-none shadow-sm bg-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                <Activity size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Production Active</p>
                <p className="text-2xl font-bold text-slate-900">{productionSummary.active}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg w-fit">
              <TrendingUp size={14} /> +2 aujourd'hui
            </div>
          </Card>

          <Card className="p-6 border-none shadow-sm bg-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
                <Clock size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">En Attente</p>
                <p className="text-2xl font-bold text-slate-900">{productionSummary.pending}</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 font-medium">Priorité haute: 3 bons</p>
          </Card>

          <Card className="p-6 border-none shadow-sm bg-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
                <Wallet size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Trésorerie</p>
                <p className="text-2xl font-bold text-slate-900">{financialSummary.balance.toLocaleString()} €</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg w-fit">
              Flux stable
            </div>
          </Card>

          <Card className="p-6 border-none shadow-sm bg-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600">
                <AlertCircle size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Alertes Stock</p>
                <p className="text-2xl font-bold text-slate-900">{lowStockMaterials.length}</p>
              </div>
            </div>
            <p className="text-xs text-rose-600 font-bold uppercase">Action requise</p>
          </Card>
        </div>
        {/* QUICK ACCESS FOOTER */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 border-none bg-slate-900 text-white shadow-lg flex items-center justify-between group cursor-pointer hover:bg-slate-800 transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-black rounded-xl group-hover:scale-110 transition-transform"><Users size={20} /></div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Clients</p>
                <p className="text-xl font-bold">{clients?.length || 0}</p>
              </div>
            </div>
            <ArrowUpRight size={20} className="text-slate-500" />
          </Card>

          <Card className="p-6 border-none bg-indigo-600 text-white shadow-lg flex items-center justify-between group cursor-pointer hover:bg-indigo-700 transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-xl group-hover:scale-110 transition-transform"><Package size={20} /></div>
              <div>
                <p className="text-xs font-bold text-indigo-200 uppercase">Catalogue</p>
                <p className="text-xl font-bold">{products?.length || 0}</p>
              </div>
            </div>
            <ArrowUpRight size={20} className="text-indigo-300" />
          </Card>

          <Card className="p-6 border-none bg-emerald-600 text-white shadow-lg flex items-center justify-between group cursor-pointer hover:bg-emerald-700 transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-xl group-hover:scale-110 transition-transform"><Truck size={20} /></div>
              <div>
                <p className="text-xs font-bold text-emerald-200 uppercase">Livrées</p>
                <p className="text-xl font-bold">{productionSummary.completed}</p>
              </div>
            </div>
            <ArrowUpRight size={20} className="text-emerald-300" />
          </Card>
        </div>   
        {/* BOTTOM SECTION: RECENT ACTIVITY & STOCK */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Transactions */}
          <Card className="p-8 border-none shadow-sm bg-white">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900">Derniers Flux</h3>
              <Button variant="ghost" className="text-xs font-bold text-indigo-600 uppercase">Historique</Button>
            </div>
            <div className="space-y-3">
              {transactions?.slice(0, 4).map((t, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl border border-transparent hover:border-slate-100 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      t.type === TransactionType.INCOME ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                    }`}>
                      {t.type === TransactionType.INCOME ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{t.description}</p>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{new Date(t.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <p className={`text-sm font-bold ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {t.type === TransactionType.INCOME ? '+' : '-'}{t.amount.toLocaleString()} €
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* Critical Stock */}
          <Card className="p-8 border-none shadow-sm bg-white">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900">Stocks Critiques</h3>
              <Button variant="ghost" className="text-xs font-bold text-rose-600 uppercase">Commander</Button>
            </div>
            <div className="space-y-3">
              {lowStockMaterials.length > 0 ? (
                lowStockMaterials.map((m, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-rose-50/50 rounded-xl border border-rose-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-rose-600 shadow-sm">
                        <Box size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{m.name}</p>
                        <p className="text-[10px] font-semibold text-rose-600 uppercase">Seuil: 10 {m.unit}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-rose-600">{m.stock} {m.unit}</p>
                      <div className="w-20 h-1.5 bg-slate-200 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-rose-500" style={{ width: `${(m.stock / 10) * 100}%` }}></div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                  <CheckCircle2 size={32} className="text-emerald-400 mb-2" />
                  <p className="text-sm font-semibold">Tous les stocks sont optimaux</p>
                </div>
              )}
            </div>
          </Card>
        </div>

     

        {/* MAIN CHARTS SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Production Flow Chart */}
          <Card className="lg:col-span-2 p-8 border-none shadow-sm bg-white">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Performance de l'Atelier</h3>
                <p className="text-sm text-slate-500">Volume de production vs Revenus</p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                  <span className="text-xs font-bold text-slate-500 uppercase">Revenus</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                  <span className="text-xs font-bold text-slate-500 uppercase">Unités</span>
                </div>
              </div>
            </div>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  />
                  <Area type="monotone" dataKey="flux" stroke="#6366F1" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                  <Area type="monotone" dataKey="prod" stroke="#10B981" strokeWidth={3} fill="transparent" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Machine Status Card */}
          <Card className="p-8 border-none shadow-sm bg-white">
            <h3 className="text-lg font-bold text-slate-900 mb-6">État du Parc Machine</h3>
            <div className="space-y-6">
              {machines?.map((m, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${m.status === 'operational' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                      <Settings size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{m.name}</p>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase">Révision: {m.lastMaintenance}</p>
                    </div>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${m.status === 'operational' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                </div>
              ))}
              {machinesInMaintenance.length > 0 && (
                <div className="mt-4 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3">
                  <AlertTriangle size={18} className="text-rose-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-rose-900 uppercase">Maintenance Requise</p>
                    <p className="text-xs text-rose-700 mt-1">{machinesInMaintenance.length} machine(s) à l'arrêt.</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>


      </div>
    </div>
  );
};