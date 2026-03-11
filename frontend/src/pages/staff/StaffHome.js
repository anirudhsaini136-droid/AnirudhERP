import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Clock, Calendar, FileText, CheckCircle, LogIn, LogOut } from 'lucide-react';
import { toast } from 'sonner';

export default function StaffHome() {
  const { api, user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clocking, setClocking] = useState(false);

  const fetch = async () => {
    try { const res = await api.get('/staff/home'); setData(res.data); } catch (e) {} setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const clockIn = async () => {
    setClocking(true);
    try { await api.post('/staff/clock-in'); toast.success('Clocked in!'); fetch(); } catch (e) { toast.error(e.response?.data?.detail || 'Failed to clock in'); }
    setClocking(false);
  };

  const clockOut = async () => {
    setClocking(true);
    try { await api.post('/staff/clock-out'); toast.success('Clocked out!'); fetch(); } catch (e) { toast.error(e.response?.data?.detail || 'Failed to clock out'); }
    setClocking(false);
  };

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" /></div></DashboardLayout>;

  const today = data?.today_attendance || {};
  const stats = data?.stats || {};

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="staff-home">
        <div>
          <h1 className="font-display text-2xl text-white">Welcome, {user?.first_name}</h1>
          <p className="text-sm text-gray-500 font-sans mt-1">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        {/* Clock in/out card */}
        <div className="glass-card rounded-2xl p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-gold mx-auto flex items-center justify-center mb-4">
            <Clock size={28} className="text-black" />
          </div>
          <p className="text-3xl font-bold text-white font-sans mb-1" id="live-clock">{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
          <p className="text-sm text-gray-500 mb-6">
            {today.status === 'present' ? `Checked in at ${today.check_in || '-'}` :
             today.status === 'checked_out' ? `Session complete: ${today.check_in} - ${today.check_out}` :
             'Not clocked in yet'}
          </p>
          <div className="flex justify-center gap-3">
            {!today.check_in ? (
              <button onClick={clockIn} disabled={clocking} className="btn-premium btn-primary text-base px-8 py-3" data-testid="clock-in-btn">
                <LogIn size={18} /> {clocking ? 'Clocking in...' : 'Clock In'}
              </button>
            ) : !today.check_out ? (
              <button onClick={clockOut} disabled={clocking} className="btn-premium text-base px-8 py-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20" data-testid="clock-out-btn">
                <LogOut size={18} /> {clocking ? 'Clocking out...' : 'Clock Out'}
              </button>
            ) : (
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle size={18} />
                <span className="text-sm">Session complete for today</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Days Present', value: stats.days_present || 0, icon: Calendar, color: 'text-emerald-400', bg: 'from-emerald-500/10' },
            { label: 'Days Absent', value: stats.days_absent || 0, icon: Calendar, color: 'text-rose-400', bg: 'from-rose-500/10' },
            { label: 'Leave Balance', value: stats.leave_balance || 0, icon: FileText, color: 'text-blue-400', bg: 'from-blue-500/10' },
            { label: 'Pending Leaves', value: stats.pending_leaves || 0, icon: Clock, color: 'text-amber-400', bg: 'from-amber-500/10' },
          ].map((s, i) => (
            <div key={i} className="stat-card text-center">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.bg} to-transparent flex items-center justify-center mx-auto mb-3`}>
                <s.icon size={17} className={s.color} />
              </div>
              <p className={`text-2xl font-bold font-sans ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Recent notices */}
        {data?.announcements?.length > 0 && (
          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-display text-lg text-white mb-4">Announcements</h3>
            <div className="space-y-3">
              {data.announcements.map((a, i) => (
                <div key={i} className="p-3 rounded-xl bg-gold-500/[0.03] border border-gold-500/10">
                  <p className="text-sm text-white font-medium">{a.title}</p>
                  {a.message && <p className="text-xs text-gray-400 mt-1">{a.message}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
