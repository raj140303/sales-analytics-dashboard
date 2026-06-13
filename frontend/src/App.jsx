import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout.jsx';
import AnalyticsPreview from './pages/AnalyticsPreview.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Products from './pages/Products.jsx';
import SalesEntry from './pages/SalesEntry.jsx';
import SalesRecords from './pages/SalesRecords.jsx';

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="sales-entry" element={<SalesEntry />} />
        <Route path="sales-records" element={<SalesRecords />} />
        <Route path="products" element={<Products />} />
        <Route path="analytics-preview" element={<AnalyticsPreview />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
