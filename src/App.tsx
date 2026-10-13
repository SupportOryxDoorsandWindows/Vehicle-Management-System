import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { RequireAuth } from './components/RequireAuth';
import { RequireAdmin } from './components/RequireAdmin';
import { Login } from './pages/Login';
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
import { ManageUsers } from './pages/ManageUsers';
import { SetPassword } from './pages/SetPassword';
import { VehicleForm } from './pages/VehicleForm';
import { ExpenseForm } from './pages/ExpenseForm';
import { AssignmentHistory } from './pages/AssignmentHistory';
import { Settings } from './pages/Settings';
import { SettingsProvider } from './contexts/SettingsProvider';

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <RequireAuth>
                <SettingsProvider>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/set-password" element={<SetPassword />} />
                      <Route path="/vehicles" element={<Vehicles />} />
                      <Route
                        path="/vehicles/new"
                        element={
                          <RequireAdmin>
                            <VehicleForm />
                          </RequireAdmin>
                        }
                      />
                      <Route
                        path="/vehicles/:id/edit"
                        element={
                          <RequireAdmin>
                            <VehicleForm />
                          </RequireAdmin>
                        }
                      />
                      <Route path="/vehicles/:id" element={<VehicleProfileLayout />}>
                        <Route index element={<Overview />} />
                        <Route path="expenses" element={<VehicleExpenses />} />
                        <Route path="maintenance" element={<Maintenance />} />
                        <Route path="documents" element={<Documents />} />
                        <Route path="finance" element={<Finance />} />
                        <Route path="reports" element={<VehicleReports />} />
                      </Route>
                      <Route
                        path="/expenses/new"
                        element={
                          <RequireAdmin>
                            <ExpenseForm />
                          </RequireAdmin>
                        }
                      />
                      <Route
                        path="/expenses/:id/edit"
                        element={
                          <RequireAdmin>
                            <ExpenseForm />
                          </RequireAdmin>
                        }
                      />
                      <Route path="/unassigned-expenses" element={<UnassignedExpenses />} />
                      <Route path="/reports" element={<Reports />} />
                      <Route
                        path="/history"
                        element={
                          <RequireAdmin>
                            <AssignmentHistory />
                          </RequireAdmin>
                        }
                      />
                      <Route
                        path="/settings"
                        element={
                          <RequireAdmin>
                            <Settings />
                          </RequireAdmin>
                        }
                      />
                      <Route
                        path="/users"
                        element={
                          <RequireAdmin>
                            <ManageUsers />
                          </RequireAdmin>
                        }
                      />
                    </Routes>
                  </Layout>
                </SettingsProvider>
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
