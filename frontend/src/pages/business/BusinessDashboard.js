import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  DollarSign,
  Users,
  FileText,
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const StatCard = ({ title, value, subtitle, icon: Icon, trend, color = 'gold' }) => (
  <Card className="bg-charcoal border-white/5">
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <p className="text-3xl font-serif font-bold text-white">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          {trend !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {trend >= 0 ? (
                <ArrowUpRight className="h-4 w-4 text-success" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-error" />
              )}
              <span className={trend >= 0 ? 'text-success text-sm' : 'text-error text-sm'}>
                {Math.abs(trend)}%
              </span>
              <span className="text-gray-500 text-sm">vs last month</span>
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

const BusinessDashboard = () => {
  const { api, business, user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await api.get('/dashboard');
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

  const { stats, alerts, chart_data, recent_activity, top_products } = data || {};
  const daysRemaining = business?.days_remaining || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20 md:pb-0" data-testid="business-dashboard">
        {/* Trial/Expiry Warning */}
        {daysRemaining > 0 && daysRemaining <= 14 && (
          <div className={`p-4 rounded-lg flex items-center gap-3 ${daysRemaining <= 3 ? 'bg-error/10 border border-error/20' : 'bg-warning/10 border border-warning/20'}`}>
            <AlertTriangle className={`h-5 w-5 ${daysRemaining <= 3 ? 'text-error' : 'text-warning'}`} />
            <div>
              <p className={`font-medium ${daysRemaining <= 3 ? 'text-error' : 'text-warning'}`}>
                {business?.status === 'trial' ? 'Trial' : 'Subscription'} expires in {daysRemaining} days
              </p>
              <p className="text-sm text-gray-400">Contact us to renew your subscription.</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div>
          <h1 className="font-serif text-3xl text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">Welcome back, {user?.first_name}!</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Monthly Revenue"
            value={`$${(stats?.monthly_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            trend={stats?.revenue_change}
            icon={DollarSign}
            color="gold"
          />
          <StatCard
            title="Total Employees"
            value={stats?.total_employees || 0}
            subtitle={`${stats?.new_employees || 0} new this month`}
            icon={Users}
            color="info"
          />
          <StatCard
            title="Outstanding Invoices"
            value={`$${(stats?.outstanding_invoices || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            subtitle={`${stats?.overdue_count || 0} overdue`}
            icon={FileText}
            color={stats?.overdue_count > 0 ? 'error' : 'warning'}
          />
          <StatCard
            title="Low Stock Items"
            value={stats?.low_stock_count || 0}
            subtitle="Need restock"
            icon={Package}
            color={stats?.low_stock_count > 0 ? 'warning' : 'success'}
          />
        </div>

        {/* Alerts */}
        {(alerts?.payroll_due || alerts?.overdue_invoices || alerts?.low_stock) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {alerts?.overdue_invoices && (
              <div className="p-4 bg-error/10 border border-error/20 rounded-lg">
                <div className="flex items-center gap-2 text-error mb-1">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Overdue Invoices</span>
                </div>
                <p className="text-sm text-gray-400">Some invoices are overdue. Please follow up.</p>
              </div>
            )}
            {alerts?.payroll_due && (
              <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                <div className="flex items-center gap-2 text-warning mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">Payroll Pending</span>
                </div>
                <p className="text-sm text-gray-400">Payroll run is in draft status.</p>
              </div>
            )}
            {alerts?.low_stock && (
              <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                <div className="flex items-center gap-2 text-warning mb-1">
                  <Package className="h-4 w-4" />
                  <span className="font-medium">Low Stock Alert</span>
                </div>
                <p className="text-sm text-gray-400">Some products need restocking.</p>
              </div>
            )}
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue vs Expenses Chart */}
          <Card className="bg-charcoal border-white/5 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-white">Revenue vs Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              {chart_data && chart_data.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chart_data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                      <YAxis stroke="#9CA3AF" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#161C2D',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                        }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Bar dataKey="revenue" fill="#C9A84C" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" fill="#E8485A" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card className="bg-charcoal border-white/5">
            <CardHeader>
              <CardTitle className="text-white">Top Products</CardTitle>
            </CardHeader>
            <CardContent>
              {top_products && top_products.length > 0 ? (
                <div className="space-y-4">
                  {top_products.map((product, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-gold/10 flex items-center justify-center text-gold font-medium text-sm">
                          {idx + 1}
                        </div>
                        <span className="text-white">{product.name}</span>
                      </div>
                      <span className="text-gray-400">{product.sold} sold</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  No sales data yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="bg-charcoal border-white/5">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-400" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recent_activity && recent_activity.length > 0 ? (
              <div className="space-y-3">
                {recent_activity.map((activity, idx) => (
                  <div key={idx} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
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
            ) : (
              <div className="py-8 text-center text-gray-500">
                No recent activity
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default BusinessDashboard;
