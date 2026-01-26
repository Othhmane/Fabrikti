
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Modal } from '../components/ui/Modal';

export const Wallet = () => {
  const { id } = useParams();
  const { clients, transactions, orders, addTransaction, t } = useApp();
  const client = clients.find(c => c.id === id);
  const [showModal, setShowModal] = useState<{ open: boolean, type: 'credit' | 'debit' }>({ open: false, type: 'credit' });
  const [amount, setAmount] = useState(0);
  const [desc, setDesc] = useState('');
  const [activeTab, setActiveTab] = useState<'tx' | 'orders'>('tx');

  if (!client) return <div>Client non trouvé</div>;

  const handleTx = () => {
    addTransaction({
      id: Date.now().toString(),
      clientId: client.id,
      date: new Date().toISOString().split('T')[0],
      type: showModal.type,
      amount,
      description: desc || (showModal.type === 'credit' ? 'Paiement Recu' : 'Facturation')
    });
    setShowModal({ open: false, type: 'credit' });
    setAmount(0);
    setDesc('');
  };

  const clientOrders = orders.filter(o => o.clientId === client.id).reverse();
  const clientTransactions = transactions.filter(tx => tx.clientId === client.id).reverse();

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 md:p-12 rounded-[2.5rem] border border-slate-200 shadow-xl flex flex-col md:flex-row items-center justify-between gap-10">
        <div className="text-center md:text-left">
          <span className="bg-blue-100 text-blue-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase mb-6 inline-block tracking-widest">Fiche Client</span>
          <h2 className="text-4xl font-black mb-3 tracking-tighter text-slate-900">{client.company}</h2>
          <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">{client.name}</p>
        </div>
        <div className="w-full md:w-auto text-center md:text-right p-6 md:p-10 bg-slate-50 rounded-3xl border border-slate-200 min-w-[300px]">
          <p className="text-slate-400 text-[10px] font-black uppercase mb-2">{t('balance')}</p>
          <p className={`text-4xl md:text-6xl font-black ${client.walletBalance < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {client.walletBalance.toLocaleString()} <span className="text-2xl opacity-40">DH</span>
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-100 p-2 gap-2 bg-slate-50">
          <button onClick={() => setActiveTab('tx')} className={`flex-1 md:flex-none px-8 py-3 rounded-2xl font-black text-xs uppercase transition-all ${activeTab === 'tx' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>{t('clientHistory')}</button>
          <button onClick={() => setActiveTab('orders')} className={`flex-1 md:flex-none px-8 py-3 rounded-2xl font-black text-xs uppercase transition-all ${activeTab === 'orders' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>{t('orderHistory')}</button>
        </div>

        <div className="p-6 md:p-10">
           {activeTab === 'tx' ? (
             <div className="space-y-6">
                <div className="flex justify-between items-center">
                   <h3 className="text-xl font-black uppercase italic tracking-tight">Flux Financiers</h3>
                   <div className="flex gap-4">
                      <button onClick={() => setShowModal({ open: true, type: 'credit' })} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-lg shadow-emerald-200 flex items-center gap-2"><i className="fas fa-plus"></i> {t('payment')}</button>
                      <button onClick={() => setShowModal({ open: true, type: 'debit' })} className="bg-rose-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-lg shadow-rose-200 flex items-center gap-2"><i className="fas fa-minus"></i> {t('billing')}</button>
                   </div>
                </div>
                <div className="space-y-3">
                  {clientTransactions.map(tx => (
                    <div key={tx.id} className="flex justify-between items-center p-6 bg-slate-50 rounded-2xl border border-slate-100">
                       <div className="flex items-center gap-6">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${tx.type === 'credit' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>{tx.type === 'credit' ? 'CR' : 'DB'}</div>
                          <div>
                            <p className="font-black text-slate-800 text-sm uppercase">{tx.description}</p>
                            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">{tx.date}</p>
                          </div>
                       </div>
                       <p className={`text-2xl font-black ${tx.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>{tx.type === 'credit' ? '+' : '-'}{tx.amount.toLocaleString()} DH</p>
                    </div>
                  ))}
                </div>
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {clientOrders.map(o => (
                  <div key={o.id} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 relative overflow-hidden group hover:border-blue-200 transition-all">
                     <div className={`absolute top-0 right-0 p-3 text-[10px] font-black uppercase tracking-widest rounded-bl-2xl ${o.paidAmount > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>{o.paidAmount > 0 ? 'Payé' : 'À crédit'}</div>
                     <h4 className="text-xl font-black text-slate-900 mb-1">CMD-#{o.id}</h4>
                     <p className="text-xs font-bold text-slate-400 mb-4">{o.date}</p>
                     <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                        <span className="text-[10px] font-black uppercase text-slate-400">Total</span>
                        <span className="text-xl font-black text-blue-600">{o.totalAmount.toLocaleString()} DH</span>
                     </div>
                  </div>
                ))}
             </div>
           )}
        </div>
      </div>

      <Modal isOpen={showModal.open} onClose={() => setShowModal({ ...showModal, open: false })} title={showModal.type === 'credit' ? t('payment') : t('billing')}>
        <div className="space-y-4">
          <label className="block text-[10px] font-black uppercase text-slate-400">{t('amount')}</label>
          <input type="number" value={amount} onChange={e => setAmount(parseFloat(e.target.value))} className="w-full p-4 bg-slate-50 border rounded-2xl text-3xl font-black text-blue-600" />
          <label className="block text-[10px] font-black uppercase text-slate-400">{t('description')}</label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl" placeholder="Commentaire..." />
          <button onClick={handleTx} className={`w-full py-5 rounded-2xl text-white font-black uppercase mt-4 shadow-xl ${showModal.type === 'credit' ? 'bg-emerald-600 shadow-emerald-200' : 'bg-rose-600 shadow-rose-200'}`}>Confirmer</button>
        </div>
      </Modal>
    </div>
  );
};
