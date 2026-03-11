import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Users, Calendar, FileText, CreditCard, Clock, UserCheck, AlertTriangle } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

export default function HRDashboard() {
  const { api } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/hr').then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [api]);

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" /></div></DashboardLayout>;

  const s = data?.stats || {};

  const stats = [
    { label: 'Total Employees', value: s.total_employees || 0, icon: Users, color: 'text-blue-400', bg: 'from-blue-500/10' },
    { label: 'Present Today', value: s.present_today || 0, icon: UserCheck, color: 'text-emerald-400', bg: 'from-emerald-500/10' },
    { label: 'On Leave', value: s.on_leave || 0, icon: Calendar, color: 'text-amber-400', bg: 'from-amber-500/10' },
    { label: 'Pending Leaves', value: s.pending_leaves || 0, icon: Clock, color: 'text-rose-400', bg: 'from-rose-500/10' },
    { label: 'Monthly Payroll', value: fmt(s.monthly_payroll), icon: CreditCard, color: 'text-gold-400', bg: 'from-gold-500/10', isText: true },
    { label: 'Avg Attendance', value: `${s.avg_attendance || 0}%`, icon: FileText, color: 'text-purple-400', bg: 'from-purple-500/10', isText: true },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="hr-dashboard">
        <div>
          <h1 className="font-display text-2xl text-white">HR Dashboard</h1>
          <p className="text-sm text-gray-500 font-sans mt-1">Workforce overview at a glance</p>
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
          <Link to="/hr/employees" className="btn-premium btn-primary"><Users size={16} /> Manage Employees</Link>
          <Link to="/hr/attendance" className="btn-premium btn-secondary"><Calendar size={16} /> Attendance</Link>
          <Link to="/hr/leave" className="btn-premium btn-secondary"><FileText size={16} /> Leave Requests</Link>
          <Link to="/hr/payroll" className="btn-premium btn-secondary"><CreditCard size={16} /> Payroll</Link>
        </div>

        {data?.recent_hires?.length > 0 && (
          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-display text-lg text-white mb-4">Recent Hires</h3>
            <div className="space-y-2">
              {data.recent_hires.map((e, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-white/[0.03] last:border-0">
                  <div className="w-8 h-8 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400 text-xs font-bold">{e.first_name?.[0]}{e.last_name?.[0]}</div>
                  <div className="flex-1"><p className="text-sm text-white">{e.first_name} {e.last_name}</p><p className="text-xs text-gray-500">{e.department} - {e.designation}</p></div>
                  <span className="text-xs text-gray-500">{e.date_joined ? new Date(e.date_joined).toLocaleDateString() : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
