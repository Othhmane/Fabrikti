
import React from 'react';
import { useApp } from '../context/AppContext';

export const Accounting = () => {
  const { transactions, t } = useApp();

  // Calculs financiers globaux
  const income = transactions
    .filter(tx => tx.type === 'credit')
    .reduce((acc, tx) => acc + tx.amount, 0);

  const invoiced = transactions
    .filter(tx => tx.type === 'debit')
    .reduce((acc, tx) => acc + tx.amount, 0);

  const totalDebt = invoiced - income;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-black uppercase italic text-slate-900">
          Console <span className="text-blue-600">{t('accounting')}</span>
        </h2>
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
          Vue d'ensemble financière
        </div>
      </div>

      {/* Cartes de résumé financier */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-8 bg-emerald-600 rounded-[2rem] text-white shadow-xl shadow-emerald-200">
          <p className="text-[10px] font-black uppercase mb-2 opacity-70 tracking-widest">{t('income')}</p>
          <p className="text-3xl md:text-4xl font-black tracking-tighter">
            {income.toLocaleString()} <span className="text-sm opacity-60">DH</span>
          </p>
        </div>

        <div className="p-8 bg-blue-600 rounded-[2rem] text-white shadow-xl shadow-blue-200">
          <p className="text-[10px] font-black uppercase mb-2 opacity-70 tracking-widest">Ventes {t('billing')}</p>
          <p className="text-3xl md:text-4xl font-black tracking-tighter">
            {invoiced.toLocaleString()} <span className="text-sm opacity-60">DH</span>
          </p>
        </div>

        <div className="p-8 bg-white rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-black uppercase mb-2 text-slate-400 tracking-widest">{t('pendingDebts')}</p>
          <p className={`text-3xl md:text-4xl font-black tracking-tighter ${totalDebt > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {totalDebt.toLocaleString()} <span className="text-sm opacity-40 font-bold">DH</span>
          </p>
        </div>
      </div>

      {/* Journal des Transactions */}
      <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
            <i className="fas fa-list-ul"></i>
          </div>
          <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight italic">
            {t('allTransactions')}
          </h3>
        </div>

        <div className="space-y-4">
          {transactions.slice().reverse().map(tx => (
            <div 
              key={tx.id} 
              className="flex flex-wrap justify-between items-center p-5 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-blue-200 transition-all gap-4"
            >
              <div className="flex gap-4 items-center min-w-0">
                <div className={`w-3 h-3 shrink-0 rounded-full ${tx.type === 'credit' ? 'bg-emerald-500 shadow-lg shadow-emerald-100' : 'bg-rose-500 shadow-lg shadow-rose-100'}`}></div>
                <div className="min-w-0">
                  <p className="font-black text-sm text-slate-800 uppercase tracking-tight group-hover:text-blue-600 transition-colors truncate">
                    {tx.description}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                    {tx.date} • {tx.id}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className={`text-xl font-black whitespace-nowrap ${tx.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {tx.type === 'credit' ? '+' : '-'}{tx.amount.toLocaleString()} <span className="text-[10px] opacity-40 font-bold">DH</span>
                </span>
                <span className="text-[8px] font-black uppercase text-slate-300 tracking-tighter">
                  {tx.type === 'credit' ? t('income') : t('expense')}
                </span>
              </div>
            </div>
          ))}

          {transactions.length === 0 && (
            <div className="py-20 text-center opacity-20 font-black italic text-2xl uppercase">
              Aucune transaction dans le journal
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
