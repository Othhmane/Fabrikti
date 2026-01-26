
import React from 'react';
import { useApp } from '../context/AppContext';

const StatCard = ({ title, value, icon, color }: { title: string, value: string, icon: string, color: string }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
    <div className={`w-12 h-12 shrink-0 rounded-xl ${color} flex items-center justify-center text-white text-xl shadow-lg`}>
      <i className={`fas ${icon}`}></i>
    </div>
    <div className="min-w-0">
      <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest truncate">{title}</p>
      <p className="text-2xl font-black text-slate-900 truncate">{value}</p>
    </div>
  </div>
);

export const Dashboard = () => {
  const { t, transactions, clients, orders } = useApp();
  const income = transactions.filter(tx => tx.type === 'credit').reduce((a, b) => a + b.amount, 0);
  const totalDebt = clients.reduce((acc, c) => acc + (c.walletBalance < 0 ? Math.abs(c.walletBalance) : 0), 0);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title={t('totalRevenue')} value={`${income.toLocaleString()} DH`} icon="fa-sack-dollar" color="bg-blue-600" />
        <StatCard title={t('pendingDebts')} value={`${totalDebt.toLocaleString()} DH`} icon="fa-wallet" color="bg-rose-500" />
        <StatCard title={t('activeOrders')} value={orders.length.toString()} icon="fa-box-open" color="bg-emerald-500" />
        <StatCard title={t('stockStatus')} value="92%" icon="fa-boxes-stacked" color="bg-amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
           <h3 className="text-xl font-black mb-6 uppercase tracking-tight flex items-center gap-2">
             <i className="fas fa-history text-blue-600"></i> Flux Récents
           </h3>
           <div className="space-y-4">
              {transactions.slice(-5).reverse().map(tx => (
                <div key={tx.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-4">
                     <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center font-bold ${tx.type === 'credit' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                        {tx.type === 'credit' ? '+' : '-'}
                     </div>
                     <div className="min-w-0">
                        <p className="font-bold text-sm text-slate-800 truncate">{tx.description}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{tx.date}</p>
                     </div>
                  </div>
                  <span className={`font-black ${tx.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>{tx.amount.toLocaleString()} DH</span>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};
