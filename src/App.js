import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

// Pages
// Accounting pages removed
import AccidentReports from './pages/accidents/AccidentReports';
import NemtTrips from './pages/nemt/NemtTrips';
import NemtPlanner from './pages/nemt/NemtPlanner';
import NemtTripCreate from './pages/nemt/NemtTripCreate';
import NemtTripDetail from './pages/nemt/NemtTripDetail';
import NemtRuns from './pages/nemt/NemtRuns';
import NemtRunCreate from './pages/nemt/NemtRunCreate';
import NemtRunDetail from './pages/nemt/NemtRunDetail';
import NemtAgencies from './pages/nemt/NemtAgencies';
import NemtSettings from './pages/nemt/NemtSettings';
import NemtPay from './pages/nemt/NemtPay';
import NemtReports from './pages/nemt/NemtReports';
import NemtLiveView from './pages/nemt/NemtLiveView';
import ActiveManage from './pages/actives/ActiveManage';
import ActivesList from './pages/actives/ActivesList';
import ActivesView from './pages/actives/ActivesView';
import AdminApprovals from './pages/admins/AdminApprovals';
import EnrollmeAdmins from './pages/admins/EnrollmeAdmins';
import BookingDetail from './pages/bookings/BookingDetail';
import BookingsCreate from './pages/bookings/BookingsCreate';
import BookingsList from './pages/bookings/BookingsList';
import Dashboard from './pages/Dashboard';
import DriversCreate from './pages/drivers/DriversCreate';
import DriversEdit from './pages/drivers/DriversEdit';
import DriversList from './pages/drivers/DriversList';
import DriversView from './pages/drivers/DriversView';
import Fares from './pages/Fares';
import Login from './pages/Login';
import ReportsDiagnostics from './pages/reports/Diagnostics';
import FinancialReport from './pages/reports/FinancialReport';
import ReceiptGenerator from './pages/reports/ReceiptGenerator';
import ReportsBuilder from './pages/reports/ReportsBuilder';
import AppSettings from './pages/settings/AppSettings';
import CompanySettings from './pages/settings/CompanySettings';
import DriverAppDownload from './pages/settings/DriverAppDownload';
import DriverMessaging from './pages/settings/DriverMessaging';
import Signup from './pages/Signup';
import VehiclesCreate from './pages/vehicles/VehiclesCreate';
import VehiclesEdit from './pages/vehicles/VehiclesEdit';
import VehiclesList from './pages/vehicles/VehiclesList';
import VehiclesView from './pages/vehicles/VehiclesView';

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('isLoggedIn'));

  useEffect(() => {
    const handleTokenChange = () => setToken(localStorage.getItem('isLoggedIn'));
    window.addEventListener('storage', handleTokenChange);
    window.addEventListener('auth-token', handleTokenChange);
    return () => {
      window.removeEventListener('storage', handleTokenChange);
      window.removeEventListener('auth-token', handleTokenChange);
    };
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      {/* Protected routes */}
      <Route
        path="/"
        element={token ? <Dashboard /> : <Navigate to="/login" replace />} />
      <Route
        path="/admins"
        element={token ? <AdminApprovals /> : <Navigate to="/login" replace />} />
      <Route
        path="/enrollme-admins"
        element={token ? <EnrollmeAdmins /> : <Navigate to="/login" replace />} />
      <Route
        path="/drivers"
        element={token ? <DriversList /> : <Navigate to="/login" replace />} />
      <Route
        path="/drivers/new"
        element={token ? <DriversCreate /> : <Navigate to="/login" replace />} />
      <Route
        path="/drivers/:id"
        element={token ? <DriversEdit /> : <Navigate to="/login" replace />} />
      <Route
        path="/drivers/:id/view"
        element={token ? <DriversView /> : <Navigate to="/login" replace />} />
      <Route
        path="/vehicles"
        element={token ? <VehiclesList /> : <Navigate to="/login" replace />} />
      <Route
        path="/vehicles/new"
        element={token ? <VehiclesCreate /> : <Navigate to="/login" replace />} />
      <Route
        path="/vehicles/:id"
        element={token ? <VehiclesEdit /> : <Navigate to="/login" replace />} />
      <Route
        path="/vehicles/:id/view"
        element={token ? <VehiclesView /> : <Navigate to="/login" replace />} />
      {/* Vehicle files page removed from navigation per request */}
      <Route
        path="/actives"
        element={token ? <ActivesList /> : <Navigate to="/login" replace />} />
      <Route
        path="/actives/new"
        element={token ? <ActiveManage /> : <Navigate to="/login" replace />} />
      <Route
        path="/actives/:id"
        element={token ? <ActiveManage /> : <Navigate to="/login" replace />} />
      <Route
        path="/actives/:id/view"
        element={token ? <ActivesView /> : <Navigate to="/login" replace />} />
      <Route
        path="/bookings"
        element={token ? <BookingsList /> : <Navigate to="/login" replace />} />
      <Route
        path="/bookings/new"
        element={token ? <BookingsCreate /> : <Navigate to="/login" replace />} />
      <Route
        path="/bookings/:id"
        element={token ? <BookingDetail /> : <Navigate to="/login" replace />} />
      <Route
        path="/fares"
        element={token ? <Fares /> : <Navigate to="/login" replace />} />
      <Route
        path="/settings/app"
        element={token ? <AppSettings /> : <Navigate to="/login" replace />} />
      <Route
        path="/reports/builder"
        element={token ? <ReportsBuilder /> : <Navigate to="/login" replace />} />
      <Route
        path="/reports/receipts"
        element={token ? <ReceiptGenerator /> : <Navigate to="/login" replace />} />
      <Route
        path="/reports/diagnostics"
        element={token ? <ReportsDiagnostics /> : <Navigate to="/login" replace />} />
      <Route
        path="/reports/financials"
        element={token ? <FinancialReport /> : <Navigate to="/login" replace />} />
      <Route
        path="/settings/company"
        element={token ? <CompanySettings /> : <Navigate to="/login" replace />} />
      {/* Invoicing settings page removed */}
      <Route
        path="/settings/messaging"
        element={token ? <DriverMessaging /> : <Navigate to="/login" replace />} />
      <Route
        path="/settings/driver-app"
        element={token ? <DriverAppDownload /> : <Navigate to="/login" replace />} />
      <Route
        path="/accidents"
        element={token ? <AccidentReports /> : <Navigate to="/login" replace />} />
      {/* NEMT routes */}
      <Route path="/nemt/planner" element={token ? <NemtPlanner /> : <Navigate to="/login" replace />} />
      <Route path="/nemt/trips" element={token ? <NemtTrips /> : <Navigate to="/login" replace />} />
      <Route path="/nemt/trips/new" element={token ? <NemtTripCreate /> : <Navigate to="/login" replace />} />
      <Route path="/nemt/trips/:id" element={token ? <NemtTripDetail /> : <Navigate to="/login" replace />} />
      <Route path="/nemt/runs" element={token ? <NemtRuns /> : <Navigate to="/login" replace />} />
      <Route path="/nemt/runs/new" element={token ? <NemtRunCreate /> : <Navigate to="/login" replace />} />
      <Route path="/nemt/runs/:id" element={token ? <NemtRunDetail /> : <Navigate to="/login" replace />} />
      <Route path="/nemt/agencies" element={token ? <NemtAgencies /> : <Navigate to="/login" replace />} />
      <Route path="/nemt/pay" element={token ? <NemtPay /> : <Navigate to="/login" replace />} />
      <Route path="/nemt/settings" element={token ? <NemtSettings /> : <Navigate to="/login" replace />} />
      <Route path="/nemt/reports" element={token ? <NemtReports /> : <Navigate to="/login" replace />} />
      <Route path="/nemt/live" element={token ? <NemtLiveView /> : <Navigate to="/login" replace />} />
      {/* Accounting routes removed */}
    </Routes>
  );
}

export default App;
