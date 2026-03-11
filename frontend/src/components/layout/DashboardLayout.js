import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  Building2,
  Settings,
  Users,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Receipt,
  BarChart3,
  Package,
  ClipboardList,
  Truck,
  Bell,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Home,
  User,
  Menu,
  X,
  ArrowLeft
} from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';

const navigation = {
  super_admin: [
    { name: 'Dashboard', href: '/super-admin', icon: LayoutDashboard },
    { name: 'Businesses', href: '/super-admin/businesses', icon: Building2 },
    { name: 'Settings', href: '/super-admin/settings', icon: Settings },
  ],
  business_owner: [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
    { name: 'Users', href: '/dashboard/users', icon: Users },
  ],
  hr_admin: [
    { name: 'Dashboard', href: '/hr', icon: LayoutDashboard },
    { name: 'Employees', href: '/hr/employees', icon: Users },
    { name: 'Attendance', href: '/hr/attendance', icon: Clock },
    { name: 'Leave', href: '/hr/leave', icon: Calendar },
    { name: 'Payroll', href: '/hr/payroll', icon: DollarSign },
  ],
  finance_admin: [
    { name: 'Dashboard', href: '/finance', icon: LayoutDashboard },
    { name: 'Invoices', href: '/finance/invoices', icon: FileText },
    { name: 'Expenses', href: '/finance/expenses', icon: Receipt },
    { name: 'Reports', href: '/finance/reports', icon: BarChart3 },
  ],
  inventory_admin: [
    { name: 'Dashboard', href: '/inventory', icon: LayoutDashboard },
    { name: 'Products', href: '/inventory/products', icon: Package },
    { name: 'Orders', href: '/inventory/orders', icon: ClipboardList },
    { name: 'Suppliers', href: '/inventory/suppliers', icon: Truck },
  ],
  staff: [
    { name: 'Home', href: '/staff', icon: Home },
    { name: 'Payslips', href: '/staff/payslips', icon: DollarSign },
    { name: 'Leave', href: '/staff/leave', icon: Calendar },
    { name: 'Attendance', href: '/staff/attendance', icon: Clock },
    { name: 'Profile', href: '/staff/profile', icon: User },
  ],
};

const DashboardLayout = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, business, impersonating, logout, endImpersonation } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const userRole = user?.role || 'staff';
  const navItems = navigation[userRole] || navigation.staff;

  const handleEndImpersonation = async () => {
    const success = await endImpersonation();
    if (success) {
      navigate('/super-admin');
    }
  };

  const getInitials = () => {
    if (!user) return 'U';
    return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'U';
  };

  return (
    <div className="min-h-screen bg-obsidian">
      {/* Impersonation Banner */}
      {impersonating && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-error text-white py-2 px-4 flex items-center justify-center gap-4">
          <span className="text-sm font-medium">
            You are viewing as {business?.name || 'Business'}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10 h-7 text-xs"
            onClick={handleEndImpersonation}
            data-testid="end-impersonation-btn"
          >
            <ArrowLeft className="h-3 w-3 mr-1" />
            Return to Super Admin
          </Button>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col fixed left-0 bg-midnight border-r border-white/5 h-screen transition-all duration-300 z-40 ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        } ${impersonating ? 'top-10' : 'top-0'}`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/5">
          {!sidebarCollapsed && (
            <Link to="/" className="font-serif text-xl text-gold">
              NexusERP
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="text-gray-400 hover:text-white hover:bg-white/5"
            data-testid="sidebar-toggle-btn"
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href || 
                (item.href !== '/' && location.pathname.startsWith(item.href + '/'));
              const Icon = item.icon;
              
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                      isActive
                        ? 'bg-gold/10 text-gold'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                    data-testid={`nav-${item.name.toLowerCase().replace(/\s/g, '-')}`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {!sidebarCollapsed && <span className="text-sm font-medium">{item.name}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Info */}
        {!sidebarCollapsed && (
          <div className="p-4 border-t border-white/5">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.avatar_url} />
                <AvatarFallback className="bg-charcoal text-gold text-sm">{getInitials()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-gray-500 capitalize truncate">
                  {user?.role?.replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className={`flex flex-col md:${sidebarCollapsed ? 'ml-16' : 'ml-64'} transition-all duration-300 ${impersonating ? 'pt-10' : ''}`}>
        {/* Top Bar */}
        <header className="sticky top-0 z-30 h-16 bg-midnight/95 backdrop-blur border-b border-white/5 flex items-center justify-between px-4 md:px-6">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-gray-400"
            onClick={() => setMobileMenuOpen(true)}
            data-testid="mobile-menu-btn"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Page Title - hidden on mobile */}
          <div className="hidden md:block">
            {business && userRole !== 'super_admin' && (
              <div className="flex items-center gap-3">
                <span className="text-white font-medium">{business.name}</span>
                <Badge className={`
                  ${business.status === 'active' ? 'bg-success/15 text-success' : ''}
                  ${business.status === 'trial' ? 'bg-info/15 text-info' : ''}
                  ${business.status === 'suspended' || business.status === 'expired' ? 'bg-error/15 text-error' : ''}
                `}>
                  {business.status}
                </Badge>
              </div>
            )}
          </div>

          {/* Mobile Logo */}
          <Link to="/" className="md:hidden font-serif text-lg text-gold">
            NexusERP
          </Link>

          {/* Right Side */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <NotificationBell />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 text-gray-400 hover:text-white" data-testid="user-menu-btn">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar_url} />
                    <AvatarFallback className="bg-charcoal text-gold text-xs">{getInitials()}</AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline text-sm">{user?.first_name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-charcoal border-white/10">
                <DropdownMenuItem className="text-gray-300 focus:bg-white/5 focus:text-white">
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="text-gray-300 focus:bg-white/5 focus:text-white">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem 
                  className="text-error focus:bg-error/10 focus:text-error"
                  onClick={logout}
                  data-testid="logout-menu-btn"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-midnight">
            <div className="h-16 flex items-center justify-between px-4 border-b border-white/5">
              <span className="font-serif text-xl text-gold">NexusERP</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(false)}
                className="text-gray-400"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="py-4">
              <ul className="space-y-1 px-2">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.href;
                  const Icon = item.icon;
                  
                  return (
                    <li key={item.name}>
                      <Link
                        to={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                          isActive
                            ? 'bg-gold/10 text-gold'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-sm font-medium">{item.name}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-midnight border-t border-white/5 flex justify-around items-center md:hidden z-40">
        {navItems.slice(0, 5).map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex flex-col items-center gap-1 p-2 ${
                isActive ? 'text-gold' : 'text-gray-500'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px]">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

// Notification Bell Component
const NotificationBell = () => {
  const { api } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  React.useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await api.get('/notifications?limit=10');
        setNotifications(response.data.notifications || []);
        setUnreadCount(response.data.unread_count || 0);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [api]);

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, is_read: true } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-gray-400 hover:text-white" data-testid="notification-bell">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-error text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 bg-charcoal border-white/10">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h3 className="font-medium text-white">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-gold text-xs h-auto p-0" onClick={markAllAsRead}>
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No notifications
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`px-4 py-3 border-b border-white/5 cursor-pointer hover:bg-white/5 ${
                  !notification.is_read ? 'bg-gold/5' : ''
                }`}
                onClick={() => !notification.is_read && markAsRead(notification.id)}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    !notification.is_read ? 'bg-gold' : 'bg-gray-600'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{notification.title}</p>
                    {notification.message && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">{notification.message}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notification.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default DashboardLayout;
