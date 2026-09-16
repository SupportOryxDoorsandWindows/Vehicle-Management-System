import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Vehicles } from './pages/Vehicles';
import { VehicleProfileLayout } from './pages/vehicle/VehicleProfileLayout';
import { Overview } from './pages/vehicle/Overview';
import { VehicleExpenses } from './pages/vehicle/VehicleExpenses';
import { Maintenance } from './pages/vehicle/Maintenance';
import { Documents } from './pages/vehicle/Documents';
import { Finance } from './pages/vehicle/Finance';
import { VehicleReports } from './pages/vehicle/VehicleReports';
import { UnassignedExpenses } from './pages/UnassignedExpenses';
import { Reports } from './pages/Reports';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/vehicles" element={<Vehicles />} />
          <Route path="/vehicles/:id" element={<VehicleProfileLayout />}>
            <Route index element={<Overview />} />
            <Route path="expenses" element={<VehicleExpenses />} />
            <Route path="maintenance" element={<Maintenance />} />
            <Route path="documents" element={<Documents />} />
            <Route path="finance" element={<Finance />} />
            <Route path="reports" element={<VehicleReports />} />
          </Route>
          <Route path="/unassigned-expenses" element={<UnassignedExpenses />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
