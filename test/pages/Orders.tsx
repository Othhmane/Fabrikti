
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Modal } from '../components/ui/Modal';
import { OrderStatus } from '../types';

export const Orders = () => {
  const { orders, clients, addOrder, addTransaction, t } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    clientId: '',
    amount: 0,
    description: '',
    isPaid: false
  });

  const handleSave = () => {
    if (!formData.clientId || formData.amount <= 0) return;

    const orderId = `CMD-${Date.now().toString().slice(-6)}`;
    const date = new Date().toISOString().split('T')[0];
    
    // 1. Créer la commande
    addOrder({
      id: orderId,
      clientId: formData.clientId,
      date,
      status: OrderStatus.PRODUCTION,
      items: [], // Simplifié pour cet exemple
      totalAmount: formData.amount,
      paidAmount: formData.isPaid ? formData.amount : 0
    });

    // 2. Générer la Facture (Débit client)
    addTransaction({
      id: `TX-D-${orderId}`,
      clientId: formData.clientId,
      amount: formData.amount,
      type: 'debit',
      description: `Facture Commande ${orderId} - ${formData.description}`,
      date,
      orderId
    });

    // 3. Si payé, générer le Paiement (Crédit client)
    if (formData.isPaid) {
      addTransaction({
        id: `TX-C-${orderId}`,
        clientId: formData.clientId,
        amount: formData.amount,
        type: 'credit',
        description: `Paiement reçu - Commande ${orderId}`,
        date,
        orderId
      });
    }

    setShowModal(false);
    setFormData({ clientId: '', amount: 0, description: '', isPaid: false });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-black uppercase italic text-slate-900">{t('orders')}</h2>
        <button 
          onClick={() => setShowModal(true)} 
          className="w-full sm:w-auto bg-blue-600 text-white font-black px-6 py-3 rounded-2xl shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
        >
          <i className="fas fa-plus"></i> {t('addOrder')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {orders.map(order => {
          const client = clients.find(c => c.id === order.clientId);
          return (
            <div key={order.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className={`absolute top-0 right-0 p-3 text-[10px] font-black uppercase tracking-widest rounded-bl-2xl ${order.paidAmount >= order.totalAmount ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                {order.paidAmount >= order.totalAmount ? t('paidOnSpot') : t('notPaid')}
              </div>
              
              <div className="mb-4">
                <h4 className="text-xl font-black text-slate-900">#{order.id}</h4>
                <p className="text-sm font-bold text-blue-600 uppercase tracking-tight">{client?.company || 'Client Inconnu'}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{order.date}</p>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('amount')}</div>
                <div className="text-2xl font-black text-slate-900">{order.totalAmount.toLocaleString()} <span className="text-xs opacity-40">DH</span></div>
              </div>
            </div>
          );
        })}

        {orders.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-3xl opacity-30 italic font-black text-2xl uppercase">
            Aucune commande enregistrée
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={t('addOrder')}>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('selectClient')}</label>
            <select 
              className="w-full p-3 bg-slate-50 border rounded-xl font-bold"
              value={formData.clientId}
              onChange={e => setFormData({...formData, clientId: e.target.value})}
            >
              <option value="">-- {t('selectClient')} --</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('amount')}</label>
            <input 
              type="number" 
              placeholder="0.00"
              className="w-full p-3 bg-slate-50 border rounded-xl text-xl font-black text-blue-600"
              onChange={e => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('description')}</label>
            <textarea 
              className="w-full p-3 bg-slate-50 border rounded-xl"
              placeholder="Détails de la commande..."
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 block">{t('isPaid')}</label>
            <div className="flex gap-2">
              <button 
                onClick={() => setFormData({...formData, isPaid: false})}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase transition-all border ${!formData.isPaid ? 'bg-rose-600 text-white border-rose-600 shadow-lg' : 'bg-white text-slate-400 border-slate-200'}`}
              >
                {t('notPaid')}
              </button>
              <button 
                onClick={() => setFormData({...formData, isPaid: true})}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase transition-all border ${formData.isPaid ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg' : 'bg-white text-slate-400 border-slate-200'}`}
              >
                {t('paidOnSpot')}
              </button>
            </div>
          </div>

          <button 
            onClick={handleSave} 
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase tracking-widest mt-4 shadow-xl hover:bg-blue-700 transition-all"
          >
            {t('save')}
          </button>
        </div>
      </Modal>
    </div>
  );
};
