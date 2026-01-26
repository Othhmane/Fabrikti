
import React, { useState, ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { useApp } from '../../context/AppContext';
import { Language } from '../../types';

// Fix: children must be optional to satisfy TypeScript's check on the props object when used as a JSX wrapper
export const AppLayout = ({ children }: { children?: ReactNode }) => {
  const { language } = useApp();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isRtl = language === Language.AR;

  return (
    <div className={`min-h-screen flex ${isRtl ? 'flex-row-reverse' : 'flex-row'} bg-slate-50 text-slate-800`} dir={isRtl ? 'rtl' : 'ltr'}>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className={`flex-1 min-h-screen transition-all duration-300 ${isRtl ? 'lg:pr-64' : 'lg:pl-64'}`}>
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 md:px-10 py-4 md:py-6 flex justify-between items-center">
           <div className="flex items-center gap-4">
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-500 hover:text-blue-600 transition-colors">
                <i className="fas fa-bars text-xl"></i>
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-black text-sm italic text-white shadow-lg shrink-0">F</div>
                <h1 className="text-xl md:text-2xl font-black tracking-tighter uppercase italic text-slate-900 truncate">Fabrik<span className="text-blue-600">ti</span></h1>
              </div>
           </div>
           <div className="flex items-center gap-3 md:gap-6">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Admin Session</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Online</p>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-blue-600 font-black text-base shadow-sm cursor-pointer hover:border-blue-600 transition-all shrink-0">
                 AD
              </div>
           </div>
        </header>
        <div className="p-4 md:p-10 max-w-7xl mx-auto pb-20">{children}</div>
      </main>
    </div>
  );
};
