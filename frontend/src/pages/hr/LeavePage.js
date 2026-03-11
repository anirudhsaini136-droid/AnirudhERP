import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Calendar, Check, X, Clock } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_COLORS = { pending: 'badge-warning', approved: 'badge-success', rejected: 'badge-danger' };

export default function LeavePage() {
  const { api } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (filterStatus !== 'all') params.set('status', filterStatus);
      const res = await api.get(`/hr/leave-requests?${params}`);
      setLeaves(res.data.leave_requests || []);
      setTotal(res.data.total || 0);
    } catch (e) { toast.error('Failed to load'); }
    setLoading(false);
  }, [api, page, filterStatus]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleAction = async (id, action) => {
    try {
      await api.put(`/hr/leave-requests/${id}/${action}`);
      toast.success(`Leave ${action}d`);
      fetch();
    } catch (e) { toast.error('Failed'); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-5" data-testid="leave-page">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-white">Leave Requests</h1>
            <p className="text-sm text-gray-500 font-sans">{total} requests</p>
          </div>
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className="input-premium w-auto text-sm h-10 pr-8" data-testid="filter-leave-status">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="table-premium w-full">
            <thead><tr><th>Employee</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th><th>Reason</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {loading ? Array(5).fill(0).map((_, i) => <tr key={i}><td colSpan={8}><div className="skeleton h-5 rounded" /></td></tr>) :
              leaves.length === 0 ? <tr><td colSpan={8} className="text-center text-gray-500 py-12">No leave requests</td></tr> :
              leaves.map(l => (
                <tr key={l.id} data-testid={`leave-row-${l.id}`}>
                  <td className="text-white text-sm font-medium">{l.employee_name}</td>
                  <td><span className="badge-premium badge-info capitalize">{l.leave_type?.replace('_', ' ')}</span></td>
                  <td className="text-sm text-gray-400">{l.start_date}</td>
                  <td className="text-sm text-gray-400">{l.end_date}</td>
                  <td className="text-sm text-white">{l.days || '-'}</td>
                  <td><span className={`badge-premium ${STATUS_COLORS[l.status]}`}>{l.status}</span></td>
                  <td className="text-sm text-gray-500 max-w-[150px] truncate">{l.reason || '-'}</td>
                  <td className="text-right">
                    {l.status === 'pending' && (
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleAction(l.id, 'approve')} className="p-1.5 rounded text-emerald-400 hover:bg-emerald-500/10" data-testid={`approve-leave-${l.id}`}><Check size={15} /></button>
                        <button onClick={() => handleAction(l.id, 'reject')} className="p-1.5 rounded text-rose-400 hover:bg-rose-500/10" data-testid={`reject-leave-${l.id}`}><X size={15} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {total > 15 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/5">
              <span className="text-xs text-gray-500">Page {page}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-premium btn-secondary text-xs py-1.5 px-3 disabled:opacity-30">Prev</button>
                <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 15)} className="btn-premium btn-secondary text-xs py-1.5 px-3 disabled:opacity-30">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
