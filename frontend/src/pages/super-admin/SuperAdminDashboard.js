import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Building2,
  DollarSign,
  Users,
  AlertTriangle,
  TrendingUp,
  Clock,
  ArrowRight,
  Plus
} from 'lucide-react';

const StatCard = ({ title, value, subtitle, icon: Icon, color = 'gold', trend }) => (
  <Card className="bg-charcoal border-white/5">
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <p className={`text-3xl font-serif font-bold text-${color}`}>{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className={`h-4 w-4 ${trend >= 0 ? 'text-success' : 'text-error'}`} />
              <span className={`text-sm ${trend >= 0 ? 'text-success' : 'text-error'}`}>
                {trend >= 0 ? '+' : ''}{trend}%
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-${color}/10`}>
          <Icon className={`h-6 w-6 text-${color}`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

const ExpiryWarningCard = ({ businesses, critical = false }) => {
  if (!businesses || businesses.length === 0) return null;

  return (
    <Card className={`border-${critical ? 'error' : 'warning'}/30 bg-${critical ? 'error' : 'warning'}/5`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className={`h-5 w-5 text-${critical ? 'error' : 'warning'}`} />
          <CardTitle className={`text-${critical ? 'error' : 'warning'} text-base`}>
            {critical ? 'Critical: Expiring in 3 Days' : 'Expiring in 14 Days'}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {businesses.slice(0, 5).map((business) => (
            <div key={business.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <div>
                <p className="text-white font-medium">{business.name}</p>
                <p className="text-sm text-gray-500">{business.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={`bg-${critical ? 'error' : 'warning'}/15 text-${critical ? 'error' : 'warning'}`}>
                  {business.days_remaining} days
                </Badge>
                <Link to={`/super-admin/businesses/${business.id}`}>
                  <Button size="sm" variant="outline" className="border-white/10 text-white hover:bg-white/5">
                    Extend
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
        {businesses.length > 5 && (
          <Link to="/super-admin/businesses?status=expiring" className="block text-center mt-4">
            <Button variant="ghost" className="text-gold hover:text-gold-400">
              View All ({businesses.length}) <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
};

const SuperAdminDashboard = () => {
  const { api } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await api.get('/super-admin/dashboard');
        setData(response.data);
      } catch (error) {
        console.error('Failed to fetch dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [api]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="h-8 w-48 skeleton rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 skeleton rounded-lg" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const { stats, expiring_warnings, recent_activity } = data || {};

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="super-admin-dashboard">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl text-white">Platform Overview</h1>
            <p className="text-gray-400 mt-1">Monitor and manage all businesses</p>
          </div>
          <Link to="/super-admin/businesses">
            <Button className="bg-gold hover:bg-gold-600 text-black" data-testid="create-business-btn">
              <Plus className="h-4 w-4 mr-2" />
              Add Business
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Businesses"
            value={stats?.total_businesses || 0}
            subtitle={`${stats?.active_businesses || 0} active, ${stats?.trial_businesses || 0} trial`}
            icon={Building2}
            color="info"
          />
          <StatCard
            title="Monthly Recurring Revenue"
            value={`$${(stats?.mrr || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            icon={DollarSign}
            color="gold"
          />
          <StatCard
            title="New Signups"
            value={stats?.new_signups_this_month || 0}
            subtitle="This month"
            icon={Users}
            color="success"
          />
          <StatCard
            title="Manual Payments"
            value={`$${(stats?.manual_payments_this_month || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            subtitle="This month"
            icon={DollarSign}
            color="warning"
          />
        </div>

        {/* Business Status Breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Active', count: stats?.active_businesses, color: 'success' },
            { label: 'Trial', count: stats?.trial_businesses, color: 'info' },
            { label: 'Suspended', count: stats?.suspended_businesses, color: 'error' },
            { label: 'Expired', count: stats?.expired_businesses, color: 'error' },
          ].map(({ label, count, color }) => (
            <Card key={label} className="bg-charcoal border-white/5">
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold text-${color}`}>{count || 0}</p>
                <p className="text-sm text-gray-400">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Expiry Warnings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ExpiryWarningCard businesses={expiring_warnings?.within_3_days} critical />
          <ExpiryWarningCard businesses={expiring_warnings?.within_14_days} />
        </div>

        {/* Recent Activity */}
        <Card className="bg-charcoal border-white/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-400" />
                Recent Activity
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {!recent_activity || recent_activity.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {recent_activity.slice(0, 10).map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                    <div className="w-2 h-2 rounded-full bg-gold mt-2" />
                    <div className="flex-1">
                      <p className="text-white text-sm">{activity.description || activity.action}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(activity.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SuperAdminDashboard;
