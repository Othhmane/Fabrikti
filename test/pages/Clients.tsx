
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Modal } from '../components/ui/Modal';
import { ClientType } from '../types';

export const Clients = () => {
  const { clients, addClient, t } = useApp();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', company: '', phone: '', email: '', type: ClientType.RESELLER });

  const handleSave = () => {
    addClient({ 
      ...formData, 
      id: Date.now().toString(), 
      status: 'active', 
      walletBalance: 0,
      address: '' 
    });
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-black uppercase italic text-slate-900">{t('clients')}</h2>
        <button onClick={() => setShowModal(true)} className="w-full sm:w-auto bg-blue-600 text-white font-black px-6 py-3 rounded-2xl shadow-lg flex items-center justify-center gap-2">
          <i className="fas fa-plus"></i> {t('addClient')}
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-400">{t('company')}</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-400">{t('name')}</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-400">{t('balance')}</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase text-slate-400">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clients.map(c => (
                <tr key={c.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-6 py-6 font-black text-slate-900">{c.company}</td>
                  <td className="px-6 py-6 font-bold text-slate-500">{c.name}</td>
                  <td className="px-6 py-6">
                    <span className={`font-black text-lg ${c.walletBalance < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {c.walletBalance.toLocaleString()} <span className="text-[10px] opacity-50">DH</span>
                    </span>
                  </td>
                  <td className="px-6 py-6">
                    <button onClick={() => navigate(`/wallet/${c.id}`)} className="bg-slate-100 text-slate-600 font-black px-4 py-2 rounded-xl text-xs uppercase hover:bg-blue-600 hover:text-white transition-all">
                      {t('viewWallet')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={t('addClient')}>
        <div className="space-y-4">
          <input type="text" placeholder={t('company')} className="w-full p-3 bg-slate-50 border rounded-xl" onChange={e => setFormData({...formData, company: e.target.value})} />
          <input type="text" placeholder={t('name')} className="w-full p-3 bg-slate-50 border rounded-xl" onChange={e => setFormData({...formData, name: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <input type="text" placeholder={t('phone')} className="w-full p-3 bg-slate-50 border rounded-xl" onChange={e => setFormData({...formData, phone: e.target.value})} />
            <input type="text" placeholder={t('email')} className="w-full p-3 bg-slate-50 border rounded-xl" onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>
          <button onClick={handleSave} className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase mt-4 shadow-xl">{t('save')}</button>
        </div>
      </Modal>
    </div>
  );
};
