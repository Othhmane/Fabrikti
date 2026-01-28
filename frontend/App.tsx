
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './features/Dashboard/Dashboard';
import { ClientList } from './features/Clients/ClientList';
import { ClientHistory } from './features/Clients/ClientHistory';
import { ProductManagement } from './features/Products/ProductManagement';
import { OrderManagement } from './features/Orders/OrderManagement';
import { OrderDetails } from './features/Orders/OrderDetails'; // Nouveau
import { ThemeSettings } from './features/Theme/ThemeSettings';
import { MachineList } from './features/Machines/MachineList';
import { SupplierList } from './features/Suppliers/SupplierList';
import { TransactionList } from './features/Transactions/TransactionList';
import { RawMaterialList } from './features/Materials/RawMaterialList';
import { DieCutterList } from './features/DieCutters/DieCutterList';
import { Login } from './features/Auth/Login';
import { AuthGuard } from './components/AuthGuard';
import { APP_ROUTES } from './constants';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* PUBLIC */}
        <Route path="/login" element={<Login />} />

        {/* PRIVATE */}
       {/* PRIVATE <Route path="/" element={<AuthGuard><Layout children={<Dashboard />} /></AuthGuard>} /> */} 
        <Route path={APP_ROUTES.CLIENTS} element={<AuthGuard><Layout children={<ClientList />} /></AuthGuard>} />
        <Route path="/clients/:id/history" element={<AuthGuard><Layout children={<ClientHistory />} /></AuthGuard>} />
        <Route path={APP_ROUTES.PRODUCTS} element={<AuthGuard><Layout children={<ProductManagement />} /></AuthGuard>} />
        <Route path={APP_ROUTES.ORDERS} element={<AuthGuard><Layout children={<OrderManagement />} /></AuthGuard>} />
        <Route path="/orders/:id" element={<AuthGuard><Layout children={<OrderDetails />} /></AuthGuard>} />
        <Route path={APP_ROUTES.SUPPLIERS} element={<AuthGuard><Layout children={<SupplierList />} /></AuthGuard>} />
        <Route path={APP_ROUTES.RAW_MATERIALS} element={<AuthGuard><Layout children={<RawMaterialList />} /></AuthGuard>} />
        <Route path={APP_ROUTES.MACHINES} element={<AuthGuard><Layout children={<MachineList />} /></AuthGuard>} />
        <Route path={APP_ROUTES.DIECUTTERS} element={<AuthGuard><Layout children={<DieCutterList />} /></AuthGuard>} />
        <Route path={APP_ROUTES.TRANSACTIONS} element={<AuthGuard><Layout children={<TransactionList />} /></AuthGuard>} />
        <Route path={APP_ROUTES.THEME} element={<AuthGuard><Layout children={<ThemeSettings />} /></AuthGuard>} />
        
        {/* FALLBACK */}
        <Route path="*" element={<Navigate to={APP_ROUTES.CLIENTS} replace />} />
      </Routes>
    </Router>
  );
};

export default App;
