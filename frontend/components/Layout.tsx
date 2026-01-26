
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, ChevronRight, User as UserIcon, Bell } from 'lucide-react';
import { useUIStore } from '../store/useStore';
import { useAuthStore } from '../store/authStore';
import { NAVIGATION_ITEMS } from '../constants';

const SidebarItem: React.FC<{ item: typeof NAVIGATION_ITEMS[0]; isActive: boolean; onClick?: () => void }> = ({ item, isActive, onClick }) => {
  const { themeColor } = useUIStore();
  const activeClass = `bg-${themeColor}-600 text-white shadow-lg shadow-${themeColor}-500/30`;
  const inactiveClass = `text-slate-400 hover:bg-slate-800 hover:text-white`;

  return (
    <Link
      to={item.path}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive ? activeClass : inactiveClass}`}
    >
      <span className={isActive ? 'text-white' : 'group-hover:text-white transition-colors'}>
        {item.icon}
      </span>
      <span className="font-semibold whitespace-nowrap text-sm tracking-tight">{item.name}</span>
      {isActive && <ChevronRight size={14} className="ml-auto hidden lg:block opacity-60" />}
    </Link>
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSidebarOpen, toggleSidebar, themeColor } = useUIStore();
  const { logout, user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-slate-50 flex-col lg:flex-row font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden" 
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-950 border-r border-slate-800 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo & Brand */}
          <div className="flex items-center justify-between px-6 py-10">
            <Link to="/" className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl bg-${themeColor}-600 flex items-center justify-center font-black text-white shadow-lg shadow-${themeColor}-600/20`}>F</div>
              <h1 className="text-2xl font-black text-white tracking-tighter uppercase">Fabrikti</h1>
            </Link>
            <button onClick={toggleSidebar} className="lg:hidden text-slate-500 hover:text-white"><X size={20} /></button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar scroll-smooth">
             <p className="px-4 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Navigation Principale</p>
            {NAVIGATION_ITEMS.map((item) => (
              <SidebarItem 
                key={item.path} 
                item={item} 
                isActive={location.pathname === item.path}
                onClick={() => window.innerWidth < 1024 && toggleSidebar()}
              />
            ))}
          </nav>

          {/* User Section Sidebar (Bottom) */}
          <div className="p-4 mt-4 border-t border-slate-800/50">
             <div className="flex items-center gap-3 px-4 py-4 mb-4 bg-slate-900/40 rounded-2xl border border-slate-800/30">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-700">
                  <UserIcon size={20} className="text-slate-500" />
                  {/* <img src="URL_AVATAR" className="w-full h-full object-cover" /> */}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{user?.name || 'Tchouna'}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase truncate tracking-wider">Super Administrateur</p>
                </div>
             </div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full text-slate-500 hover:text-white transition-all hover:bg-red-500/10 hover:border-red-500/30 border border-transparent rounded-xl font-semibold text-sm"
            >
              <LogOut size={18} />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden h-screen relative">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 lg:px-10 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleSidebar}
              className="p-2.5 rounded-xl lg:hidden text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <Menu size={22} />
            </button>
            <div className="hidden lg:block">
               <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-0.5">Console Admin</p>
               <h2 className="text-xl font-black text-slate-900 leading-tight">Bienvenue, {user?.name?.split(' ')[0] || 'Admin'}</h2>
            </div>
          </div>
          
          <div className="flex items-center gap-4 lg:gap-6">
            {/* Action Bar Header */}
            <div className="flex items-center bg-slate-100 rounded-full p-1 border border-slate-200">
               <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                  <Bell size={20} />
               </button>
            </div>

            <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>

            <div className="flex items-center gap-3 group cursor-pointer">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors">{user?.name || 'Admin'}</p>
                <div className="flex items-center justify-end gap-1">
                   <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">En ligne</p>
                </div>
              </div>
              <div className={`w-12 h-12 rounded-2xl bg-${themeColor}-100 flex items-center justify-center text-${themeColor}-700 font-black border-2 border-white shadow-xl shadow-slate-200 overflow-hidden`}>
                <UserIcon size={24} />
                {/* <img src="URL_AVATAR" className="w-full h-full object-cover" /> */}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-10 bg-slate-50/50 scroll-smooth">
          <div className="max-w-7xl mx-auto pb-20 lg:pb-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
