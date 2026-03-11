import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { BarChart3, TrendingUp, TrendingDown, IndianRupee, Calendar } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

export default function ReportsPage() {
  const { api } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('monthly');

  useEffect(() => {
    api.get(`/finance/reports/profit-loss?period=${period}`).then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [api, period]);

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" /></div></DashboardLayout>;

  const summary = data?.summary || {};
  const breakdown = data?.expense_breakdown || [];
  const monthly = data?.monthly_data || [];

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="reports-page">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-white">Financial Reports</h1>
            <p className="text-sm text-gray-500 font-sans mt-1">Revenue, expenses and profitability analysis</p>
          </div>
          <div className="flex gap-1 p-1 bg-void rounded-xl border border-white/5">
            {['monthly', 'quarterly', 'yearly'].map(p => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${period === p ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}>{p}</button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total Revenue', value: fmt(summary.total_revenue), icon: IndianRupee, color: 'text-gold-400', bg: 'from-gold-500/10' },
            { label: 'Total Expenses', value: fmt(summary.total_expenses), icon: TrendingDown, color: 'text-rose-400', bg: 'from-rose-500/10' },
            { label: 'Net Profit', value: fmt(summary.net_profit), icon: TrendingUp, color: summary.net_profit >= 0 ? 'text-emerald-400' : 'text-rose-400', bg: summary.net_profit >= 0 ? 'from-emerald-500/10' : 'from-rose-500/10' },
            { label: 'Profit Margin', value: `${summary.profit_margin?.toFixed(1) || 0}%`, icon: BarChart3, color: 'text-blue-400', bg: 'from-blue-500/10' },
          ].map((s, i) => (
            <div key={i} className="stat-card">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.bg} to-transparent flex items-center justify-center mb-3`}>
                <s.icon size={17} className={s.color} />
              </div>
              <p className="text-xs text-gray-500 font-sans">{s.label}</p>
              <p className={`text-xl font-bold mt-0.5 font-sans ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          {/* Revenue vs Expenses */}
          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-display text-lg text-white mb-4">Revenue vs Expenses</h3>
            {monthly.length > 0 ? (
              <div className="space-y-3">
                {monthly.map((m, i) => {
                  const max = Math.max(...monthly.map(x => Math.max(x.revenue || 0, x.expenses || 0))) || 1;
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-xs text-gray-500 mb-1"><span>{m.period}</span><span>{fmt(m.revenue)} / {fmt(m.expenses)}</span></div>
                      <div className="flex gap-1 h-4">
                        <div className="bg-gold-500/30 rounded" style={{ width: `${Math.max(3, ((m.revenue || 0) / max) * 100)}%` }} />
                        <div className="bg-rose-500/30 rounded" style={{ width: `${Math.max(3, ((m.expenses || 0) / max) * 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
                <div className="flex gap-4 mt-2 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-gold-500/30" /><span className="text-xs text-gray-500">Revenue</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-rose-500/30" /><span className="text-xs text-gray-500">Expenses</span></div>
                </div>
              </div>
            ) : <p className="text-gray-500 text-sm text-center py-8">No data</p>}
          </div>

          {/* Expense Breakdown */}
          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-display text-lg text-white mb-4">Expense Breakdown</h3>
            {breakdown.length > 0 ? (
              <div className="space-y-3">
                {breakdown.map((b, i) => {
                  const max = Math.max(...breakdown.map(x => x.amount)) || 1;
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1"><span className="text-gray-400">{b.category}</span><span className="text-gray-500">{fmt(b.amount)} ({b.percentage?.toFixed(1)}%)</span></div>
                      <div className="h-2 bg-white/[0.03] rounded-full overflow-hidden"><div className="h-full bg-gradient-gold rounded-full opacity-50" style={{ width: `${(b.amount / max) * 100}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            ) : <p className="text-gray-500 text-sm text-center py-8">No expenses recorded</p>}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
