import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Calendar, Clock, UserCheck, UserX, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export default function AttendancePage() {
  const { api } = useAuth();
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/hr/attendance?date=${date}`);
      setRecords(res.data.records || []);
      setSummary(res.data.summary || {});
    } catch (e) { toast.error('Failed to load attendance'); }
    setLoading(false);
  }, [api, date]);

  useEffect(() => { fetch(); }, [fetch]);

  const markAttendance = async (employeeId, status) => {
    try {
      await api.post('/hr/attendance', { employee_id: employeeId, date, status, check_in: status === 'present' ? new Date().toTimeString().slice(0, 5) : undefined });
      toast.success('Attendance marked'); fetch();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const changeDate = (days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().split('T')[0]);
  };

  return (
    <DashboardLayout>
      <div className="space-y-5" data-testid="attendance-page">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-white">Attendance</h1>
            <p className="text-sm text-gray-500 font-sans">Daily attendance tracking</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => changeDate(-1)} className="btn-premium btn-secondary p-2"><ChevronLeft size={16} /></button>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-premium text-sm h-10" data-testid="attendance-date" />
            <button onClick={() => changeDate(1)} className="btn-premium btn-secondary p-2"><ChevronRight size={16} /></button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Present', val: summary.present || 0, icon: UserCheck, color: 'text-emerald-400' },
            { label: 'Absent', val: summary.absent || 0, icon: UserX, color: 'text-rose-400' },
            { label: 'Late', val: summary.late || 0, icon: Clock, color: 'text-amber-400' },
            { label: 'On Leave', val: summary.on_leave || 0, icon: Calendar, color: 'text-blue-400' },
          ].map((s, i) => (
            <div key={i} className="stat-card text-center">
              <s.icon size={20} className={`${s.color} mx-auto mb-2`} />
              <p className={`text-2xl font-bold font-sans ${s.color}`}>{s.val}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Records table */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="table-premium w-full">
            <thead><tr><th>Employee</th><th>Department</th><th>Status</th><th>Check In</th><th>Check Out</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {loading ? Array(5).fill(0).map((_, i) => <tr key={i}><td colSpan={6}><div className="skeleton h-5 rounded" /></td></tr>) :
              records.length === 0 ? <tr><td colSpan={6} className="text-center text-gray-500 py-12">No records for this date</td></tr> :
              records.map(r => (
                <tr key={r.employee_id || r.id} data-testid={`att-row-${r.employee_id}`}>
                  <td className="text-white text-sm font-medium">{r.employee_name || `${r.first_name || ''} ${r.last_name || ''}`}</td>
                  <td className="text-sm text-gray-400">{r.department || '-'}</td>
                  <td>
                    <span className={`badge-premium ${r.status === 'present' ? 'badge-success' : r.status === 'absent' ? 'badge-danger' : r.status === 'late' ? 'badge-warning' : 'badge-info'}`}>
                      {r.status || 'unmarked'}
                    </span>
                  </td>
                  <td className="text-sm text-gray-400">{r.check_in || '-'}</td>
                  <td className="text-sm text-gray-400">{r.check_out || '-'}</td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => markAttendance(r.employee_id, 'present')} className={`px-2 py-1 rounded text-xs ${r.status === 'present' ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/10'}`} data-testid={`mark-present-${r.employee_id}`}>P</button>
                      <button onClick={() => markAttendance(r.employee_id, 'absent')} className={`px-2 py-1 rounded text-xs ${r.status === 'absent' ? 'bg-rose-500/20 text-rose-400' : 'text-gray-500 hover:text-rose-400 hover:bg-rose-500/10'}`} data-testid={`mark-absent-${r.employee_id}`}>A</button>
                      <button onClick={() => markAttendance(r.employee_id, 'late')} className={`px-2 py-1 rounded text-xs ${r.status === 'late' ? 'bg-amber-500/20 text-amber-400' : 'text-gray-500 hover:text-amber-400 hover:bg-amber-500/10'}`}>L</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
