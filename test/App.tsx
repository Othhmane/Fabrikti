
import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AppLayout } from './components/layout/AppLayout';

// Pages
import { Dashboard } from './pages/Dashboard';
import { Clients } from './pages/Clients';
import { Wallet } from './pages/Wallet';
import { Orders } from './pages/Orders';
import { Accounting } from './pages/Accounting';

const Placeholder = ({ name }: { name: string }) => (
  <div className="flex items-center justify-center h-64 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-black uppercase text-4xl opacity-20 italic">
    {name}
  </div>
);

const App = () => {
  return (
    <AppProvider>
      <Router>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/wallet/:id" element={<Wallet />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/materials" element={<Placeholder name="Matières Premières" />} />
            <Route path="/employees" element={<Placeholder name="Employés" />} />
            <Route path="/accounting" element={<Accounting />} />
          </Routes>
        </AppLayout>
      </Router>
    </AppProvider>
  );
};

export default App;
