import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { IndianRupee, FileSpreadsheet, Receipt, TrendingUp, TrendingDown, ArrowUpRight, AlertTriangle } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

export default function FinanceDashboard() {
  const { api } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/finance').then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [api]);

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" /></div></DashboardLayout>;

  const s = data?.stats || {};

  const stats = [
    { label: 'Total Revenue', value: fmt(s.total_revenue), icon: IndianRupee, color: 'text-gold-400', bg: 'from-gold-500/10' },
    { label: 'Total Expenses', value: fmt(s.total_expenses), icon: Receipt, color: 'text-rose-400', bg: 'from-rose-500/10' },
    { label: 'Outstanding', value: fmt(s.outstanding), icon: FileSpreadsheet, color: 'text-amber-400', bg: 'from-amber-500/10' },
    { label: 'Net Profit', value: fmt(s.net_profit), icon: TrendingUp, color: s.net_profit >= 0 ? 'text-emerald-400' : 'text-rose-400', bg: s.net_profit >= 0 ? 'from-emerald-500/10' : 'from-rose-500/10' },
    { label: 'Invoices', value: s.total_invoices || 0, icon: FileSpreadsheet, color: 'text-blue-400', bg: 'from-blue-500/10' },
    { label: 'Overdue', value: s.overdue_invoices || 0, icon: AlertTriangle, color: 'text-rose-400', bg: 'from-rose-500/10' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="finance-dashboard">
        <div>
          <h1 className="font-display text-2xl text-white">Finance Dashboard</h1>
          <p className="text-sm text-gray-500 font-sans mt-1">Financial health overview</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.map((item, i) => (
            <div key={i} className="stat-card">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${item.bg} to-transparent flex items-center justify-center mb-3`}>
                <item.icon size={17} className={item.color} />
              </div>
              <p className="text-xs text-gray-500 font-sans">{item.label}</p>
              <p className={`text-xl font-bold mt-0.5 font-sans ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <Link to="/finance/invoices" className="btn-premium btn-primary"><FileSpreadsheet size={16} /> Invoices</Link>
          <Link to="/finance/expenses" className="btn-premium btn-secondary"><Receipt size={16} /> Expenses</Link>
          <Link to="/finance/reports" className="btn-premium btn-secondary"><TrendingUp size={16} /> Reports</Link>
        </div>

        {data?.recent_transactions?.length > 0 && (
          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-display text-lg text-white mb-4">Recent Transactions</h3>
            <div className="space-y-2">
              {data.recent_transactions.map((t, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-white/[0.03] last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                      {t.type === 'income' ? <ArrowUpRight size={14} className="text-emerald-400" /> : <TrendingDown size={14} className="text-rose-400" />}
                    </div>
                    <div><p className="text-sm text-white">{t.description}</p><p className="text-xs text-gray-500">{t.category}</p></div>
                  </div>
                  <span className={`text-sm font-semibold ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>{t.type === 'income' ? '+' : '-'}{fmt(t.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
