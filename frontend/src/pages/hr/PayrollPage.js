import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { CreditCard, Play, Eye, IndianRupee, Download } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const STATUS_COLORS = { draft: 'badge-neutral', processing: 'badge-warning', completed: 'badge-success', cancelled: 'badge-danger' };

export default function PayrollPage() {
  const { api } = useAuth();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRun, setShowRun] = useState(false);
  const [running, setRunning] = useState(false);
  const [form, setForm] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });
  const [viewRun, setViewRun] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const res = await api.get('/hr/payroll'); setRuns(res.data.payroll_runs || []); } catch (e) {}
    setLoading(false);
  }, [api]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleRunPayroll = async (e) => {
    e.preventDefault(); setRunning(true);
    try {
      const res = await api.post('/hr/payroll/run', form);
      toast.success(res.data.message || 'Payroll processed');
      setShowRun(false); fetch();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
    setRunning(false);
  };

  const viewPayrollDetails = async (runId) => {
    try {
      const res = await api.get(`/hr/payroll/${runId}`);
      setViewRun(res.data);
    } catch (e) { toast.error('Failed to load details'); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-5" data-testid="payroll-page">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-white">Payroll</h1>
            <p className="text-sm text-gray-500 font-sans">Process and manage payroll</p>
          </div>
          <button onClick={() => setShowRun(true)} className="btn-premium btn-primary" data-testid="run-payroll-btn">
            <Play size={16} /> Run Payroll
          </button>
        </div>

        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="table-premium w-full">
            <thead><tr><th>Period</th><th>Employees</th><th>Total Amount</th><th>Status</th><th>Processed</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {loading ? Array(3).fill(0).map((_, i) => <tr key={i}><td colSpan={6}><div className="skeleton h-5 rounded" /></td></tr>) :
              runs.length === 0 ? <tr><td colSpan={6} className="text-center text-gray-500 py-12">No payroll runs yet</td></tr> :
              runs.map(r => (
                <tr key={r.id} data-testid={`payroll-row-${r.id}`}>
                  <td className="text-white text-sm font-medium">{r.month}/{r.year}</td>
                  <td className="text-sm text-gray-400">{r.employee_count || '-'}</td>
                  <td className="text-sm text-gold-400 font-semibold">{fmt(r.total_amount)}</td>
                  <td><span className={`badge-premium ${STATUS_COLORS[r.status]}`}>{r.status}</span></td>
                  <td className="text-sm text-gray-500">{r.processed_at ? new Date(r.processed_at).toLocaleDateString() : '-'}</td>
                  <td className="text-right">
                    <button onClick={() => viewPayrollDetails(r.id)} className="text-gold-400 hover:text-gold-300 text-sm" data-testid={`view-payroll-${r.id}`}><Eye size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Run Payroll Dialog */}
      <Dialog open={showRun} onOpenChange={setShowRun}>
        <DialogContent className="bg-void border-white/10 max-w-sm">
          <DialogHeader><DialogTitle className="font-display text-white">Run Payroll</DialogTitle></DialogHeader>
          <form onSubmit={handleRunPayroll} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-gray-400 text-xs">Month *</Label>
                <select className="input-premium mt-1 w-full" value={form.month} onChange={e => setForm({...form, month: parseInt(e.target.value)})} data-testid="payroll-month">
                  {Array.from({length: 12}, (_, i) => <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('en', { month: 'long' })}</option>)}
                </select></div>
              <div><Label className="text-gray-400 text-xs">Year *</Label><Input type="number" min="2020" className="input-premium mt-1" value={form.year} onChange={e => setForm({...form, year: parseInt(e.target.value)})} data-testid="payroll-year" /></div>
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setShowRun(false)} className="btn-premium btn-secondary">Cancel</button>
              <button type="submit" disabled={running} className="btn-premium btn-primary" data-testid="submit-payroll">{running ? 'Processing...' : 'Process Payroll'}</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Payroll Detail Dialog */}
      <Dialog open={!!viewRun} onOpenChange={() => setViewRun(null)}>
        <DialogContent className="bg-void border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display text-white">Payroll Details - {viewRun?.payroll_run?.month}/{viewRun?.payroll_run?.year}</DialogTitle></DialogHeader>
          {viewRun && (
            <div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="stat-card"><p className="text-xs text-gray-500">Total</p><p className="text-lg text-gold-400 font-bold">{fmt(viewRun.payroll_run?.total_amount)}</p></div>
                <div className="stat-card"><p className="text-xs text-gray-500">Employees</p><p className="text-lg text-white font-bold">{viewRun.payroll_run?.employee_count}</p></div>
                <div className="stat-card"><p className="text-xs text-gray-500">Status</p><p className="text-sm text-white capitalize">{viewRun.payroll_run?.status}</p></div>
              </div>
              <table className="table-premium w-full">
                <thead><tr><th>Employee</th><th>Base</th><th>Deductions</th><th>Net</th></tr></thead>
                <tbody>
                  {(viewRun.payslips || []).map(s => (
                    <tr key={s.id}>
                      <td className="text-white text-sm">{s.employee_name}</td>
                      <td className="text-sm">{fmt(s.base_salary)}</td>
                      <td className="text-sm text-rose-400">{fmt(s.total_deductions)}</td>
                      <td className="text-sm text-gold-400 font-semibold">{fmt(s.net_salary)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
