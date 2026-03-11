import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Plus, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_COLORS = { pending: 'badge-warning', approved: 'badge-success', rejected: 'badge-danger' };
const LEAVE_TYPES = ['casual', 'sick', 'earned', 'unpaid', 'maternity', 'paternity', 'other'];

export default function StaffLeave() {
  const { api } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [balance, setBalance] = useState({});
  const [loading, setLoading] = useState(true);
  const [showApply, setShowApply] = useState(false);
  const [applying, setApplying] = useState(false);
  const [form, setForm] = useState({ leave_type: 'casual', start_date: '', end_date: '', reason: '' });

  useEffect(() => {
    api.get('/staff/leave').then(r => { setLeaves(r.data.leave_requests || []); setBalance(r.data.balance || {}); }).catch(() => {}).finally(() => setLoading(false));
  }, [api]);

  const handleApply = async (e) => {
    e.preventDefault(); setApplying(true);
    try {
      await api.post('/staff/leave', form);
      toast.success('Leave request submitted');
      setShowApply(false);
      const res = await api.get('/staff/leave');
      setLeaves(res.data.leave_requests || []);
      setBalance(res.data.balance || {});
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
    setApplying(false);
  };

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-5" data-testid="staff-leave">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-white">My Leave</h1>
            <p className="text-sm text-gray-500 font-sans">Apply and track leave requests</p>
          </div>
          <button onClick={() => setShowApply(true)} className="btn-premium btn-primary" data-testid="apply-leave-btn">
            <Plus size={16} /> Apply Leave
          </button>
        </div>

        {/* Leave balance */}
        {Object.keys(balance).length > 0 && (
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(balance).map(([type, val]) => (
              <div key={type} className="stat-card text-center">
                <p className="text-lg font-bold text-white font-sans">{val}</p>
                <p className="text-xs text-gray-500 capitalize">{type.replace('_', ' ')}</p>
              </div>
            ))}
          </div>
        )}

        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="table-premium w-full">
            <thead><tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th></tr></thead>
            <tbody>
              {leaves.length === 0 ? <tr><td colSpan={6} className="text-center text-gray-500 py-12">No leave requests</td></tr> :
              leaves.map(l => (
                <tr key={l.id} data-testid={`leave-row-${l.id}`}>
                  <td><span className="badge-premium badge-info capitalize">{l.leave_type?.replace('_', ' ')}</span></td>
                  <td className="text-sm text-gray-400">{l.start_date}</td>
                  <td className="text-sm text-gray-400">{l.end_date}</td>
                  <td className="text-sm text-white">{l.days || '-'}</td>
                  <td className="text-sm text-gray-500 max-w-[150px] truncate">{l.reason || '-'}</td>
                  <td><span className={`badge-premium ${STATUS_COLORS[l.status]}`}>{l.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={showApply} onOpenChange={setShowApply}>
        <DialogContent className="bg-void border-white/10 max-w-md">
          <DialogHeader><DialogTitle className="font-display text-white">Apply for Leave</DialogTitle></DialogHeader>
          <form onSubmit={handleApply} className="space-y-4">
            <div><Label className="text-gray-400 text-xs">Leave Type *</Label>
              <select className="input-premium mt-1 w-full" value={form.leave_type} onChange={e => setForm({...form, leave_type: e.target.value})} data-testid="leave-type">
                {LEAVE_TYPES.map(t => <option key={t} value={t} className="capitalize">{t.replace('_', ' ')}</option>)}
              </select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-gray-400 text-xs">From *</Label><Input type="date" className="input-premium mt-1" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} required data-testid="leave-from" /></div>
              <div><Label className="text-gray-400 text-xs">To *</Label><Input type="date" className="input-premium mt-1" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} required data-testid="leave-to" /></div>
            </div>
            <div><Label className="text-gray-400 text-xs">Reason</Label><textarea className="input-premium mt-1 h-20 resize-none" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} data-testid="leave-reason" /></div>
            <DialogFooter>
              <button type="button" onClick={() => setShowApply(false)} className="btn-premium btn-secondary">Cancel</button>
              <button type="submit" disabled={applying} className="btn-premium btn-primary" data-testid="submit-leave">{applying ? 'Submitting...' : 'Submit Request'}</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
