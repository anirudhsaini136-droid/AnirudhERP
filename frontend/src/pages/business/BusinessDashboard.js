import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { IndianRupee, Users, FileText, Package, TrendingUp, TrendingDown, AlertTriangle, ArrowUpRight } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

export default function BusinessDashboard() {
  const { api } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [api]);

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" /></div></DashboardLayout>;

  const s = data?.stats || {};

  const statCards = [
    { label: 'Monthly Revenue', value: fmt(s.monthly_revenue), icon: IndianRupee, color: 'text-gold-400', bg: 'from-gold-500/10' },
    { label: 'Employees', value: s.total_employees || 0, sub: `${s.new_employees || 0} new`, icon: Users, color: 'text-blue-400', bg: 'from-blue-500/10' },
    { label: 'Outstanding', value: fmt(s.outstanding_invoices), sub: `${s.overdue_count || 0} overdue`, icon: FileText, color: 'text-amber-400', bg: 'from-amber-500/10' },
    { label: 'Net Profit', value: fmt(s.net_profit), icon: TrendingUp, color: s.net_profit >= 0 ? 'text-emerald-400' : 'text-rose-400', bg: s.net_profit >= 0 ? 'from-emerald-500/10' : 'from-rose-500/10' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="business-dashboard">
        <div>
          <h1 className="font-display text-2xl text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 font-sans mt-1">Business overview and key metrics</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map((c, i) => (
            <div key={i} className="stat-card" data-testid={`stat-${c.label.toLowerCase().replace(/\s+/g, '-')}`}>
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${c.bg} to-transparent flex items-center justify-center mb-3`}>
                <c.icon size={17} className={c.color} />
              </div>
              <p className="text-xs text-gray-500 font-sans">{c.label}</p>
              <p className={`text-xl font-bold mt-0.5 font-sans ${c.color}`}>{c.value}</p>
              {c.sub && <p className="text-xs text-gray-600 mt-1">{c.sub}</p>}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-display text-lg text-white mb-4">Revenue Trend</h3>
            {data?.chart_data?.length > 0 ? (
              <div className="space-y-2">
                {data.chart_data.map((d, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-10">{d.month}</span>
                    <div className="flex-1 h-5 bg-white/[0.02] rounded overflow-hidden">
                      <div className="h-full bg-gradient-gold rounded opacity-40" style={{ width: `${Math.max(5, (d.revenue / (Math.max(...data.chart_data.map(x => x.revenue)) || 1)) * 100)}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-16 text-right">{fmt(d.revenue)}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-gray-500 text-sm text-center py-8">No revenue data yet</p>}
          </div>

          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-display text-lg text-white mb-4">Recent Activity</h3>
            {data?.recent_activity?.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {data.recent_activity.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-white/[0.03] last:border-0">
                    <div className="w-2 h-2 rounded-full bg-gold-500/50 shrink-0" />
                    <p className="text-sm text-gray-400 flex-1">{a.description || a.action}</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-gray-500 text-sm text-center py-8">No activity yet</p>}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
