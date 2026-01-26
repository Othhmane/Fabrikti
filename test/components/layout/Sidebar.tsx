
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Language } from '../../types';

export const Sidebar = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { t, language, setLanguage } = useApp();
  const location = useLocation();
  const isRtl = language === Language.AR;

  const menu = [
    { path: '/', icon: 'fa-chart-pie', label: t('dashboard') },
    { path: '/clients', icon: 'fa-user-group', label: t('clients') },
    { path: '/orders', icon: 'fa-box', label: t('orders') },
    { path: '/materials', icon: 'fa-layer-group', label: t('materials') },
    { path: '/employees', icon: 'fa-id-card', label: t('employees') },
    { path: '/accounting', icon: 'fa-vault', label: t('accounting') },
  ];

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />
      )}
      <div className={`fixed inset-y-0 z-50 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 lg:translate-x-0 ${isRtl ? `right-0 ${isOpen ? 'translate-x-0' : 'translate-x-full'}` : `left-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}`}>
        <div className="p-8 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center font-black text-xl italic shadow-lg">F</div>
            <span className="text-2xl font-black tracking-tighter uppercase">Fabrik<span className="text-blue-500">ti</span></span>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white"><i className="fas fa-arrow-left"></i></button>
        </div>
        <nav className="flex-1 px-4 mt-6 space-y-1 overflow-y-auto">
          {menu.map(item => (
            <Link key={item.path} to={item.path} onClick={() => window.innerWidth < 1024 && onClose()} className={`flex items-center px-4 py-3 rounded-xl font-bold text-sm transition-all ${location.pathname === item.path ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <i className={`fas ${item.icon} w-6 ${isRtl ? 'ml-3' : 'mr-3'}`}></i>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-6 border-t border-slate-800">
          <div className="bg-slate-800 rounded-xl p-1 flex">
            <button onClick={() => setLanguage(Language.FR)} className={`flex-1 py-1.5 text-[10px] font-black rounded-lg ${language === Language.FR ? 'bg-blue-600 text-white' : 'text-slate-50'}`}>FR</button>
            <button onClick={() => setLanguage(Language.AR)} className={`flex-1 py-1.5 text-[10px] font-black rounded-lg ${language === Language.AR ? 'bg-blue-600 text-white' : 'text-slate-50'}`}>عربي</button>
          </div>
        </div>
      </div>
    </>
  );
};
