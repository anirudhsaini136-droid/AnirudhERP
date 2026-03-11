import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import AuthProvider, { useAuth } from './contexts/AuthContext';

// Login
import LoginPage from './pages/LoginPage';

// Super Admin
import SuperAdminDashboard from './pages/super-admin/SuperAdminDashboard';
import BusinessesPage from './pages/super-admin/BusinessesPage';
import BusinessDetailPage from './pages/super-admin/BusinessDetailPage';
import PlatformSettingsPage from './pages/super-admin/PlatformSettingsPage';

// Business Owner
import BusinessDashboard from './pages/business/BusinessDashboard';
import UserManagement from './pages/business/UserManagement';
import BusinessSettings from './pages/business/BusinessSettings';

// HR Admin
import HRDashboard from './pages/hr/HRDashboard';
import EmployeesPage from './pages/hr/EmployeesPage';
import AttendancePage from './pages/hr/AttendancePage';
import LeavePage from './pages/hr/LeavePage';
import PayrollPage from './pages/hr/PayrollPage';

// Finance Admin
import FinanceDashboard from './pages/finance/FinanceDashboard';
import InvoicesPage from './pages/finance/InvoicesPage';
import ExpensesPage from './pages/finance/ExpensesPage';
import ReportsPage from './pages/finance/ReportsPage';

// Staff
import StaffHome from './pages/staff/StaffHome';
import StaffAttendance from './pages/staff/StaffAttendance';
import StaffLeave from './pages/staff/StaffLeave';
import StaffPayslips from './pages/staff/StaffPayslips';
import StaffProfile from './pages/staff/StaffProfile';

const ROLE_HOMES = {
  super_admin: '/super-admin',
  business_owner: '/dashboard',
  hr_admin: '/hr',
  finance_admin: '/finance',
  inventory_admin: '/inventory',
  staff: '/staff',
};

function RequireAuth({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-obsidian flex items-center justify-center"><div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to={ROLE_HOMES[user.role] || '/login'} replace />;
  return children;
}

function RedirectAuth() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-obsidian flex items-center justify-center"><div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (user) return <Navigate to={ROLE_HOMES[user.role] || '/dashboard'} replace />;
  return <LoginPage />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<RedirectAuth />} />

      {/* Super Admin */}
      <Route path="/super-admin" element={<RequireAuth allowedRoles={['super_admin']}><SuperAdminDashboard /></RequireAuth>} />
      <Route path="/super-admin/businesses" element={<RequireAuth allowedRoles={['super_admin']}><BusinessesPage /></RequireAuth>} />
      <Route path="/super-admin/businesses/:id" element={<RequireAuth allowedRoles={['super_admin']}><BusinessDetailPage /></RequireAuth>} />
      <Route path="/super-admin/settings" element={<RequireAuth allowedRoles={['super_admin']}><PlatformSettingsPage /></RequireAuth>} />

      {/* Business Owner */}
      <Route path="/dashboard" element={<RequireAuth allowedRoles={['business_owner']}><BusinessDashboard /></RequireAuth>} />
      <Route path="/dashboard/users" element={<RequireAuth allowedRoles={['business_owner']}><UserManagement /></RequireAuth>} />
      <Route path="/dashboard/settings" element={<RequireAuth allowedRoles={['business_owner']}><BusinessSettings /></RequireAuth>} />

      {/* HR Admin */}
      <Route path="/hr" element={<RequireAuth allowedRoles={['hr_admin', 'business_owner']}><HRDashboard /></RequireAuth>} />
      <Route path="/hr/employees" element={<RequireAuth allowedRoles={['hr_admin', 'business_owner']}><EmployeesPage /></RequireAuth>} />
      <Route path="/hr/attendance" element={<RequireAuth allowedRoles={['hr_admin', 'business_owner']}><AttendancePage /></RequireAuth>} />
      <Route path="/hr/leave" element={<RequireAuth allowedRoles={['hr_admin', 'business_owner']}><LeavePage /></RequireAuth>} />
      <Route path="/hr/payroll" element={<RequireAuth allowedRoles={['hr_admin', 'business_owner']}><PayrollPage /></RequireAuth>} />

      {/* Finance Admin */}
      <Route path="/finance" element={<RequireAuth allowedRoles={['finance_admin', 'business_owner']}><FinanceDashboard /></RequireAuth>} />
      <Route path="/finance/invoices" element={<RequireAuth allowedRoles={['finance_admin', 'business_owner']}><InvoicesPage /></RequireAuth>} />
      <Route path="/finance/expenses" element={<RequireAuth allowedRoles={['finance_admin', 'business_owner']}><ExpensesPage /></RequireAuth>} />
      <Route path="/finance/reports" element={<RequireAuth allowedRoles={['finance_admin', 'business_owner']}><ReportsPage /></RequireAuth>} />

      {/* Staff */}
      <Route path="/staff" element={<RequireAuth allowedRoles={['staff']}><StaffHome /></RequireAuth>} />
      <Route path="/staff/attendance" element={<RequireAuth allowedRoles={['staff']}><StaffAttendance /></RequireAuth>} />
      <Route path="/staff/leave" element={<RequireAuth allowedRoles={['staff']}><StaffLeave /></RequireAuth>} />
      <Route path="/staff/payslips" element={<RequireAuth allowedRoles={['staff']}><StaffPayslips /></RequireAuth>} />
      <Route path="/staff/profile" element={<RequireAuth allowedRoles={['staff']}><StaffProfile /></RequireAuth>} />

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
