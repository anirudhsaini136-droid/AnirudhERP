import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner';

// Pages
import LoginPage from './pages/LoginPage';
import SubscriptionExpiredPage from './pages/SubscriptionExpiredPage';

// Super Admin
import SuperAdminDashboard from './pages/super-admin/SuperAdminDashboard';
import BusinessesPage from './pages/super-admin/BusinessesPage';

// Placeholder pages for other portals
const PlaceholderPage = ({ title, role }) => {
  const { user, business } = useAuth();
  
  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center p-6">
      <div className="text-center">
        <h1 className="font-serif text-4xl text-gold mb-4">{title}</h1>
        <p className="text-gray-400 mb-8">Welcome, {user?.first_name}!</p>
        {business && (
          <div className="bg-charcoal rounded-lg p-6 border border-white/5 max-w-md mx-auto">
            <p className="text-white font-medium mb-2">{business.name}</p>
            <p className="text-gray-500 text-sm">Plan: {business.plan}</p>
            <p className="text-gray-500 text-sm">Status: {business.status}</p>
            {business.days_remaining !== undefined && (
              <p className={`text-sm mt-2 ${business.days_remaining <= 7 ? 'text-error' : 'text-success'}`}>
                {business.days_remaining} days remaining
              </p>
            )}
          </div>
        )}
        <p className="text-gray-600 mt-8 text-sm">
          This {role} portal is being built. Check back soon!
        </p>
      </div>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, business, checkSubscription } = useAuth();
  const location = useLocation();
  const [subscriptionValid, setSubscriptionValid] = React.useState(true);
  const [checkingSubscription, setCheckingSubscription] = React.useState(true);

  useEffect(() => {
    const verify = async () => {
      if (user && user.role !== 'super_admin') {
        const result = await checkSubscription();
        setSubscriptionValid(result.is_valid);
      }
      setCheckingSubscription(false);
    };
    
    if (!loading && user) {
      verify();
    } else if (!loading) {
      setCheckingSubscription(false);
    }
  }, [user, loading, checkSubscription]);

  if (loading || checkingSubscription) {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate portal based on role
    switch (user.role) {
      case 'super_admin':
        return <Navigate to="/super-admin" replace />;
      case 'business_owner':
        return <Navigate to="/dashboard" replace />;
      case 'hr_admin':
        return <Navigate to="/hr" replace />;
      case 'finance_admin':
        return <Navigate to="/finance" replace />;
      case 'inventory_admin':
        return <Navigate to="/inventory" replace />;
      case 'staff':
        return <Navigate to="/staff" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  // Check subscription for non-super-admin users
  if (user.role !== 'super_admin' && !subscriptionValid) {
    return <Navigate to="/subscription-expired" replace />;
  }

  return children;
};

// Public Route (redirect if logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    switch (user.role) {
      case 'super_admin':
        return <Navigate to="/super-admin" replace />;
      case 'business_owner':
        return <Navigate to="/dashboard" replace />;
      case 'hr_admin':
        return <Navigate to="/hr" replace />;
      case 'finance_admin':
        return <Navigate to="/finance" replace />;
      case 'inventory_admin':
        return <Navigate to="/inventory" replace />;
      case 'staff':
        return <Navigate to="/staff" replace />;
      default:
        return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      } />
      
      {/* Subscription Expired */}
      <Route path="/subscription-expired" element={<SubscriptionExpiredPage />} />

      {/* Super Admin Routes */}
      <Route path="/super-admin" element={
        <ProtectedRoute allowedRoles={['super_admin']}>
          <SuperAdminDashboard />
        </ProtectedRoute>
      } />
      <Route path="/super-admin/businesses" element={
        <ProtectedRoute allowedRoles={['super_admin']}>
          <BusinessesPage />
        </ProtectedRoute>
      } />
      <Route path="/super-admin/businesses/:id" element={
        <ProtectedRoute allowedRoles={['super_admin']}>
          <PlaceholderPage title="Business Details" role="Super Admin" />
        </ProtectedRoute>
      } />
      <Route path="/super-admin/settings" element={
        <ProtectedRoute allowedRoles={['super_admin']}>
          <PlaceholderPage title="Platform Settings" role="Super Admin" />
        </ProtectedRoute>
      } />

      {/* Business Owner Routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute allowedRoles={['business_owner', 'super_admin']}>
          <PlaceholderPage title="Business Dashboard" role="Business Owner" />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/settings" element={
        <ProtectedRoute allowedRoles={['business_owner', 'super_admin']}>
          <PlaceholderPage title="Business Settings" role="Business Owner" />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/users" element={
        <ProtectedRoute allowedRoles={['business_owner', 'super_admin']}>
          <PlaceholderPage title="Manage Users" role="Business Owner" />
        </ProtectedRoute>
      } />

      {/* HR Admin Routes */}
      <Route path="/hr" element={
        <ProtectedRoute allowedRoles={['hr_admin', 'business_owner', 'super_admin']}>
          <PlaceholderPage title="HR Dashboard" role="HR Admin" />
        </ProtectedRoute>
      } />
      <Route path="/hr/employees" element={
        <ProtectedRoute allowedRoles={['hr_admin', 'business_owner', 'super_admin']}>
          <PlaceholderPage title="Employees" role="HR Admin" />
        </ProtectedRoute>
      } />
      <Route path="/hr/employees/:id" element={
        <ProtectedRoute allowedRoles={['hr_admin', 'business_owner', 'super_admin']}>
          <PlaceholderPage title="Employee Details" role="HR Admin" />
        </ProtectedRoute>
      } />
      <Route path="/hr/attendance" element={
        <ProtectedRoute allowedRoles={['hr_admin', 'business_owner', 'super_admin']}>
          <PlaceholderPage title="Attendance" role="HR Admin" />
        </ProtectedRoute>
      } />
      <Route path="/hr/leave" element={
        <ProtectedRoute allowedRoles={['hr_admin', 'business_owner', 'super_admin']}>
          <PlaceholderPage title="Leave Management" role="HR Admin" />
        </ProtectedRoute>
      } />
      <Route path="/hr/payroll" element={
        <ProtectedRoute allowedRoles={['hr_admin', 'business_owner', 'super_admin']}>
          <PlaceholderPage title="Payroll" role="HR Admin" />
        </ProtectedRoute>
      } />

      {/* Finance Admin Routes */}
      <Route path="/finance" element={
        <ProtectedRoute allowedRoles={['finance_admin', 'business_owner', 'super_admin']}>
          <PlaceholderPage title="Finance Dashboard" role="Finance Admin" />
        </ProtectedRoute>
      } />
      <Route path="/finance/invoices" element={
        <ProtectedRoute allowedRoles={['finance_admin', 'business_owner', 'super_admin']}>
          <PlaceholderPage title="Invoices" role="Finance Admin" />
        </ProtectedRoute>
      } />
      <Route path="/finance/invoices/create" element={
        <ProtectedRoute allowedRoles={['finance_admin', 'business_owner', 'super_admin']}>
          <PlaceholderPage title="Create Invoice" role="Finance Admin" />
        </ProtectedRoute>
      } />
      <Route path="/finance/expenses" element={
        <ProtectedRoute allowedRoles={['finance_admin', 'business_owner', 'super_admin']}>
          <PlaceholderPage title="Expenses" role="Finance Admin" />
        </ProtectedRoute>
      } />
      <Route path="/finance/reports" element={
        <ProtectedRoute allowedRoles={['finance_admin', 'business_owner', 'super_admin']}>
          <PlaceholderPage title="Financial Reports" role="Finance Admin" />
        </ProtectedRoute>
      } />

      {/* Inventory Admin Routes */}
      <Route path="/inventory" element={
        <ProtectedRoute allowedRoles={['inventory_admin', 'business_owner', 'super_admin']}>
          <PlaceholderPage title="Inventory Dashboard" role="Inventory Admin" />
        </ProtectedRoute>
      } />
      <Route path="/inventory/products" element={
        <ProtectedRoute allowedRoles={['inventory_admin', 'business_owner', 'super_admin']}>
          <PlaceholderPage title="Products" role="Inventory Admin" />
        </ProtectedRoute>
      } />
      <Route path="/inventory/orders" element={
        <ProtectedRoute allowedRoles={['inventory_admin', 'business_owner', 'super_admin']}>
          <PlaceholderPage title="Purchase Orders" role="Inventory Admin" />
        </ProtectedRoute>
      } />
      <Route path="/inventory/suppliers" element={
        <ProtectedRoute allowedRoles={['inventory_admin', 'business_owner', 'super_admin']}>
          <PlaceholderPage title="Suppliers" role="Inventory Admin" />
        </ProtectedRoute>
      } />

      {/* Staff Routes */}
      <Route path="/staff" element={
        <ProtectedRoute allowedRoles={['staff', 'hr_admin', 'finance_admin', 'inventory_admin', 'business_owner', 'super_admin']}>
          <PlaceholderPage title="Staff Portal" role="Staff" />
        </ProtectedRoute>
      } />
      <Route path="/staff/payslips" element={
        <ProtectedRoute allowedRoles={['staff', 'hr_admin', 'finance_admin', 'inventory_admin', 'business_owner', 'super_admin']}>
          <PlaceholderPage title="My Payslips" role="Staff" />
        </ProtectedRoute>
      } />
      <Route path="/staff/leave" element={
        <ProtectedRoute allowedRoles={['staff', 'hr_admin', 'finance_admin', 'inventory_admin', 'business_owner', 'super_admin']}>
          <PlaceholderPage title="My Leave" role="Staff" />
        </ProtectedRoute>
      } />
      <Route path="/staff/attendance" element={
        <ProtectedRoute allowedRoles={['staff', 'hr_admin', 'finance_admin', 'inventory_admin', 'business_owner', 'super_admin']}>
          <PlaceholderPage title="My Attendance" role="Staff" />
        </ProtectedRoute>
      } />
      <Route path="/staff/profile" element={
        <ProtectedRoute allowedRoles={['staff', 'hr_admin', 'finance_admin', 'inventory_admin', 'business_owner', 'super_admin']}>
          <PlaceholderPage title="My Profile" role="Staff" />
        </ProtectedRoute>
      } />

      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      
      {/* 404 */}
      <Route path="*" element={
        <div className="min-h-screen bg-obsidian flex items-center justify-center">
          <div className="text-center">
            <h1 className="font-serif text-6xl text-gold mb-4">404</h1>
            <p className="text-gray-400 mb-8">Page not found</p>
            <a href="/" className="text-gold hover:text-gold-400 underline">
              Go to Home
            </a>
          </div>
        </div>
      } />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: '#161C2D',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)',
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
