import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

export default function StaffAttendance() {
  const { api } = useAuth();
  const [records, setRecords] = useState([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({});

  useEffect(() => {
    api.get(`/staff/attendance?month=${month}&year=${year}`).then(r => {
      setRecords(r.data.records || []);
      setSummary(r.data.summary || {});
    }).catch(() => {}).finally(() => setLoading(false));
  }, [api, month, year]);

  const changeMonth = (d) => {
    let m = month + d, y = year;
    if (m < 1) { m = 12; y--; } else if (m > 12) { m = 1; y++; }
    setMonth(m); setYear(y);
  };

  const STATUS_STYLES = { present: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20', absent: 'bg-rose-500/20 text-rose-400 border-rose-500/20', late: 'bg-amber-500/20 text-amber-400 border-amber-500/20', on_leave: 'bg-blue-500/20 text-blue-400 border-blue-500/20' };

  return (
    <DashboardLayout>
      <div className="space-y-5" data-testid="staff-attendance">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-white">My Attendance</h1>
            <p className="text-sm text-gray-500 font-sans">Track your attendance history</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => changeMonth(-1)} className="btn-premium btn-secondary p-2"><ChevronLeft size={16} /></button>
            <span className="text-sm text-white font-medium w-32 text-center">{new Date(year, month - 1).toLocaleString('en', { month: 'long', year: 'numeric' })}</span>
            <button onClick={() => changeMonth(1)} className="btn-premium btn-secondary p-2"><ChevronRight size={16} /></button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Present', val: summary.present || 0, cls: 'text-emerald-400' },
            { label: 'Absent', val: summary.absent || 0, cls: 'text-rose-400' },
            { label: 'Late', val: summary.late || 0, cls: 'text-amber-400' },
            { label: 'Leave', val: summary.on_leave || 0, cls: 'text-blue-400' },
          ].map((s, i) => (
            <div key={i} className="stat-card text-center">
              <p className={`text-2xl font-bold font-sans ${s.cls}`}>{s.val}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="table-premium w-full">
            <thead><tr><th>Date</th><th>Status</th><th>Check In</th><th>Check Out</th><th>Hours</th></tr></thead>
            <tbody>
              {loading ? Array(5).fill(0).map((_, i) => <tr key={i}><td colSpan={5}><div className="skeleton h-5 rounded" /></td></tr>) :
              records.length === 0 ? <tr><td colSpan={5} className="text-center text-gray-500 py-12">No attendance records</td></tr> :
              records.map((r, i) => (
                <tr key={i}>
                  <td className="text-white text-sm">{r.date}</td>
                  <td><span className={`inline-block px-2 py-0.5 rounded-full text-xs border ${STATUS_STYLES[r.status] || 'text-gray-400'}`}>{r.status || '-'}</span></td>
                  <td className="text-sm text-gray-400">{r.check_in || '-'}</td>
                  <td className="text-sm text-gray-400">{r.check_out || '-'}</td>
                  <td className="text-sm text-gray-400">{r.hours_worked ? `${r.hours_worked}h` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
