import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Building2, TrendingUp, AlertTriangle, Clock, Users, IndianRupee, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

export default function SuperAdminDashboard() {
  const { api } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/super-admin/dashboard').then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [api]);

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" /></div></DashboardLayout>;

  const s = data?.stats || {};
  const warnings = data?.expiring_warnings || {};

  const stats = [
    { label: 'Total Businesses', value: s.total_businesses || 0, icon: Building2, color: 'text-gold-400', bg: 'from-gold-500/10' },
    { label: 'Active', value: s.active_businesses || 0, icon: TrendingUp, color: 'text-emerald-400', bg: 'from-emerald-500/10' },
    { label: 'Trial', value: s.trial_businesses || 0, icon: Clock, color: 'text-blue-400', bg: 'from-blue-500/10' },
    { label: 'MRR', value: fmt(s.mrr), icon: IndianRupee, color: 'text-gold-400', bg: 'from-gold-500/10', isText: true },
    { label: 'Expired', value: s.expired_businesses || 0, icon: AlertTriangle, color: 'text-rose-400', bg: 'from-rose-500/10' },
    { label: 'New This Month', value: s.new_signups_this_month || 0, icon: ArrowUpRight, color: 'text-emerald-400', bg: 'from-emerald-500/10' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="super-admin-dashboard">
        <div>
          <h1 className="font-display text-2xl text-white">Platform Overview</h1>
          <p className="text-sm text-gray-500 mt-1 font-sans">Monitor all businesses and subscriptions</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.map((item, i) => (
            <div key={i} className="stat-card" data-testid={`stat-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${item.bg} to-transparent flex items-center justify-center mb-3`}>
                <item.icon size={17} className={item.color} />
              </div>
              <p className="text-xs text-gray-500 font-sans">{item.label}</p>
              <p className={`text-xl font-bold mt-0.5 font-sans ${item.color}`}>{item.isText ? item.value : item.value}</p>
            </div>
          ))}
        </div>

        {/* Warnings */}
        {(warnings.within_3_days?.length > 0 || warnings.within_14_days?.length > 0) && (
          <div className="glass-card rounded-2xl p-5">
            <h2 className="font-display text-lg text-white mb-4">Expiring Subscriptions</h2>
            <div className="space-y-2">
              {(warnings.within_3_days || []).map(b => (
                <Link to={`/super-admin/businesses/${b.id}`} key={b.id} className="flex items-center justify-between p-3 rounded-xl bg-rose-500/5 border border-rose-500/10 hover:bg-rose-500/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={16} className="text-rose-400" />
                    <div>
                      <p className="text-sm text-white font-medium">{b.name}</p>
                      <p className="text-xs text-gray-500">{b.email}</p>
                    </div>
                  </div>
                  <span className="badge-premium badge-danger">{b.days_remaining}d left</span>
                </Link>
              ))}
              {(warnings.within_14_days || []).filter(b => b.days_remaining > 3).map(b => (
                <Link to={`/super-admin/businesses/${b.id}`} key={b.id} className="flex items-center justify-between p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 hover:bg-amber-500/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <Clock size={16} className="text-amber-400" />
                    <div>
                      <p className="text-sm text-white font-medium">{b.name}</p>
                      <p className="text-xs text-gray-500">{b.email}</p>
                    </div>
                  </div>
                  <span className="badge-premium badge-warning">{b.days_remaining}d left</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="flex gap-3">
          <Link to="/super-admin/businesses" className="btn-premium btn-primary" data-testid="view-businesses-btn">
            <Building2 size={16} /> View All Businesses
          </Link>
          <Link to="/super-admin/settings" className="btn-premium btn-secondary" data-testid="platform-settings-btn">
            Settings
          </Link>
        </div>

        {/* Recent activity */}
        {data?.recent_activity?.length > 0 && (
          <div className="glass-card rounded-2xl p-5">
            <h2 className="font-display text-lg text-white mb-4">Recent Activity</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.recent_activity.map((a, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-white/[0.03] last:border-0">
                  <div className="w-2 h-2 rounded-full bg-gold-500/50 shrink-0" />
                  <p className="text-sm text-gray-400 flex-1">{a.description || a.action}</p>
                  <span className="text-xs text-gray-600 shrink-0">{new Date(a.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
