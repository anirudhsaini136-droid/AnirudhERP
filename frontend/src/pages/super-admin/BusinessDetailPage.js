import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { ArrowLeft, Building2, CreditCard, Calendar, Shield, UserCheck, AlertTriangle, Ban, ChevronUp, ChevronDown, IndianRupee, LogIn, Eye, EyeOff, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
const STATUS_COLORS = { active: 'badge-success', trial: 'badge-warning', expired: 'badge-danger', suspended: 'badge-danger', cancelled: 'badge-neutral' };
const PLAN_COLORS = { starter: 'badge-info', growth: 'badge-gold', enterprise: 'badge-success' };

function PasswordCell({ password }) {
  const [show, setShow] = React.useState(false);
  if (!password) return <span className="text-xs text-gray-600 italic">-</span>;
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-mono text-gray-400">{show ? password : '********'}</span>
      <button onClick={() => setShow(!show)} className="text-gray-500 hover:text-white" data-testid="toggle-password">
        {show ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
    </div>
  );
}

export default function BusinessDetailPage() {
  const { id } = useParams();
  const { api, startImpersonation } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showExtend, setShowExtend] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [extending, setExtending] = useState(false);
  const [extendForm, setExtendForm] = useState({ duration_days: 30, payment_method: 'cash', amount: 0, currency: 'INR', payment_date: new Date().toISOString().split('T')[0], reference_number: '', notes: '' });
  const [newPlan, setNewPlan] = useState('');
  const [showResetPwd, setShowResetPwd] = useState(false);
  const [resetPwdUser, setResetPwdUser] = useState(null);
  const [resetPwdValue, setResetPwdValue] = useState('');
  const [resetting, setResetting] = useState(false);

  const fetchData = async () => {
    try {
      const res = await api.get(`/super-admin/businesses/${id}`);
      setData(res.data);
      setNewPlan(res.data.business?.plan || 'starter');
    } catch (e) { toast.error('Business not found'); navigate('/super-admin/businesses'); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleExtend = async (e) => {
    e.preventDefault();
    setExtending(true);
    try {
      const res = await api.post(`/super-admin/businesses/${id}/extend`, extendForm);
      toast.success(res.data.message);
      setShowExtend(false);
      fetchData();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to extend'); }
    setExtending(false);
  };

  const handleSuspend = async () => {
    if (!window.confirm('Suspend this business? All users will lose access.')) return;
    try {
      await api.post(`/super-admin/businesses/${id}/suspend`);
      toast.success('Business suspended');
      fetchData();
    } catch (e) { toast.error('Failed to suspend'); }
  };

  const handleChangePlan = async () => {
    try {
      await api.post(`/super-admin/businesses/${id}/change-plan`, { new_plan: newPlan });
      toast.success(`Plan changed to ${newPlan}`);
      setShowPlan(false);
      fetchData();
    } catch (e) { toast.error('Failed to change plan'); }
  };

  const handleImpersonate = async () => {
    if (!window.confirm('Login as the business owner?')) return;
    const success = await startImpersonation(id);
    if (success) { navigate('/dashboard'); toast.success('Impersonating business owner'); }
    else toast.error('Failed to impersonate');
  };

  const openResetPassword = (u) => {
    setResetPwdUser(u);
    setResetPwdValue('');
    setShowResetPwd(true);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetPwdValue || resetPwdValue.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setResetting(true);
    try {
      await api.post('/super-admin/reset-password', { user_id: resetPwdUser.id, new_password: resetPwdValue });
      toast.success('Password reset successfully');
      setShowResetPwd(false);
      fetchData();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to reset password'); }
    setResetting(false);
  };

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" /></div></DashboardLayout>;

  const b = data?.business || {};
  const users = data?.users || [];
  const payments = data?.manual_payments || [];
  const history = data?.subscription_history || [];

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="business-detail-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <button onClick={() => navigate('/super-admin/businesses')} className="mt-1 text-gray-400 hover:text-white transition-colors"><ArrowLeft size={20} /></button>
            <div>
              <h1 className="font-display text-2xl text-white">{b.name}</h1>
              <p className="text-sm text-gray-500 font-sans">{b.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`badge-premium ${PLAN_COLORS[b.plan] || 'badge-neutral'}`}>{b.plan}</span>
                <span className={`badge-premium ${STATUS_COLORS[b.status] || 'badge-neutral'}`}>{b.status}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowExtend(true)} className="btn-premium btn-primary text-sm" data-testid="extend-subscription-btn">
              <CreditCard size={15} /> Extend Subscription
            </button>
            <button onClick={handleImpersonate} className="btn-premium btn-secondary text-sm" data-testid="impersonate-btn">
              <LogIn size={15} /> Login As
            </button>
            <button onClick={() => setShowPlan(true)} className="btn-premium btn-secondary text-sm" data-testid="change-plan-btn">
              <ChevronUp size={15} /> Change Plan
            </button>
            {b.status !== 'suspended' && (
              <button onClick={handleSuspend} className="btn-premium text-sm bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20" data-testid="suspend-btn">
                <Ban size={15} /> Suspend
              </button>
            )}
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="stat-card">
            <p className="text-xs text-gray-500">Days Remaining</p>
            <p className={`text-2xl font-bold font-sans mt-1 ${b.days_remaining <= 7 ? 'text-rose-400' : b.days_remaining <= 14 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {b.days_remaining > 0 ? b.days_remaining : 0}
            </p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-gray-500">Subscription Expires</p>
            <p className="text-sm text-white mt-1 font-sans">{fmtDate(b.subscription_expires_at)}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-gray-500">Monthly Revenue</p>
            <p className="text-lg text-gold-400 font-bold font-sans mt-1">{fmt(b.mrr)}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs text-gray-500">Users</p>
            <p className="text-2xl text-white font-bold font-sans mt-1">{users.length}</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="details" className="space-y-4">
          <TabsList className="bg-void border border-white/5 p-1 rounded-xl">
            <TabsTrigger value="details" className="text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-lg">Details</TabsTrigger>
            <TabsTrigger value="users" className="text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-lg">Users ({users.length})</TabsTrigger>
            <TabsTrigger value="payments" className="text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-lg">Payments ({payments.length})</TabsTrigger>
            <TabsTrigger value="history" className="text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-lg">History</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <div className="glass-card rounded-2xl p-5 grid grid-cols-2 gap-4">
              {[
                ['Owner', b.owner_name], ['Email', b.email], ['Phone', b.phone || '-'], ['City', b.city || '-'],
                ['Country', b.country || '-'], ['Payment Type', b.payment_type || '-'],
                ['Created', fmtDate(b.created_at)], ['Address', b.address || '-']
              ].map(([label, value]) => (
                <div key={label}><p className="text-xs text-gray-500">{label}</p><p className="text-sm text-white mt-0.5">{value}</p></div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="users">
            <div className="glass-card rounded-2xl overflow-hidden">
              <table className="table-premium w-full">
                <thead><tr><th>Name</th><th>Email</th><th>Password</th><th>Role</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td className="text-white text-sm">{u.first_name} {u.last_name}</td>
                      <td className="text-sm">{u.email}</td>
                      <td><PasswordCell password={u.visible_password} /></td>
                      <td><span className="badge-premium badge-info">{u.role?.replace('_', ' ')}</span></td>
                      <td><span className={`badge-premium ${u.is_active ? 'badge-success' : 'badge-danger'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                      <td className="text-right">
                        <button onClick={() => openResetPassword(u)} className="text-xs text-gold-400 hover:text-gold-300 font-medium" data-testid={`reset-pwd-${u.id}`}>Reset Password</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="payments">
            <div className="glass-card rounded-2xl overflow-hidden">
              <table className="table-premium w-full">
                <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Duration</th><th>Reference</th><th>New Expiry</th></tr></thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr><td colSpan={6} className="text-center text-gray-500 py-8">No payments recorded</td></tr>
                  ) : payments.map(p => (
                    <tr key={p.id}>
                      <td className="text-sm">{fmtDate(p.payment_date)}</td>
                      <td className="text-sm text-gold-400 font-semibold">{fmt(p.amount)}</td>
                      <td><span className="badge-premium badge-neutral">{p.payment_method?.replace('_', ' ')}</span></td>
                      <td className="text-sm">{p.duration_days} days</td>
                      <td className="text-sm text-gray-500">{p.reference_number || '-'}</td>
                      <td className="text-sm">{fmtDate(p.new_expiry_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <div className="glass-card rounded-2xl p-5 space-y-3">
              {history.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">No history</p>
              ) : history.map(h => (
                <div key={h.id} className="flex items-start gap-3 py-2 border-b border-white/[0.03] last:border-0">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${h.action === 'extended' || h.action === 'created' ? 'bg-emerald-500' : h.action === 'suspended' || h.action === 'expired' ? 'bg-rose-500' : 'bg-gold-500'}`} />
                  <div className="flex-1">
                    <p className="text-sm text-white capitalize">{h.action?.replace('_', ' ')}</p>
                    {h.notes && <p className="text-xs text-gray-500 mt-0.5">{h.notes}</p>}
                  </div>
                  <span className="text-xs text-gray-600 shrink-0">{fmtDate(h.created_at)}</span>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Extend Subscription Dialog */}
      <Dialog open={showExtend} onOpenChange={setShowExtend}>
        <DialogContent className="bg-void border-white/10 max-w-md">
          <DialogHeader><DialogTitle className="font-display text-white">Extend Subscription</DialogTitle></DialogHeader>
          <form onSubmit={handleExtend} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-gray-400 text-xs">Duration (days) *</Label><Input type="number" min="1" className="input-premium mt-1" value={extendForm.duration_days} onChange={e => setExtendForm({...extendForm, duration_days: parseInt(e.target.value) || 30})} required data-testid="extend-days" /></div>
              <div><Label className="text-gray-400 text-xs">Amount (INR) *</Label><Input type="number" min="0" step="0.01" className="input-premium mt-1" value={extendForm.amount} onChange={e => setExtendForm({...extendForm, amount: parseFloat(e.target.value) || 0})} required data-testid="extend-amount" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-gray-400 text-xs">Payment Method *</Label>
                <select className="input-premium mt-1 w-full" value={extendForm.payment_method} onChange={e => setExtendForm({...extendForm, payment_method: e.target.value})} data-testid="extend-method">
                  <option value="cash">Cash</option><option value="bank_transfer">Bank Transfer</option><option value="cheque">Cheque</option><option value="mobile_money">UPI/Mobile</option><option value="other">Other</option>
                </select></div>
              <div><Label className="text-gray-400 text-xs">Payment Date *</Label><Input type="date" className="input-premium mt-1" value={extendForm.payment_date} onChange={e => setExtendForm({...extendForm, payment_date: e.target.value})} required data-testid="extend-date" /></div>
            </div>
            <div><Label className="text-gray-400 text-xs">Reference Number</Label><Input className="input-premium mt-1" value={extendForm.reference_number} onChange={e => setExtendForm({...extendForm, reference_number: e.target.value})} placeholder="e.g., TXN123456" data-testid="extend-ref" /></div>
            <div><Label className="text-gray-400 text-xs">Notes</Label><textarea className="input-premium mt-1 h-16 resize-none" value={extendForm.notes} onChange={e => setExtendForm({...extendForm, notes: e.target.value})} /></div>
            <DialogFooter>
              <button type="button" onClick={() => setShowExtend(false)} className="btn-premium btn-secondary">Cancel</button>
              <button type="submit" disabled={extending} className="btn-premium btn-primary" data-testid="submit-extend">{extending ? 'Extending...' : 'Extend Now'}</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Plan Dialog */}
      <Dialog open={showPlan} onOpenChange={setShowPlan}>
        <DialogContent className="bg-void border-white/10 max-w-sm">
          <DialogHeader><DialogTitle className="font-display text-white">Change Plan</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {['starter', 'growth', 'enterprise'].map(p => (
              <button key={p} onClick={() => setNewPlan(p)} className={`w-full p-4 rounded-xl border text-left transition-all ${newPlan === p ? 'border-gold-500/50 bg-gold-500/5' : 'border-white/5 hover:border-white/10'}`} data-testid={`plan-option-${p}`}>
                <p className="text-sm text-white font-semibold capitalize">{p}</p>
                <p className="text-xs text-gray-500 mt-0.5">{p === 'starter' ? 'Up to 5 users' : p === 'growth' ? 'Up to 25 users' : 'Unlimited users'}</p>
              </button>
            ))}
          </div>
          <DialogFooter>
            <button onClick={() => setShowPlan(false)} className="btn-premium btn-secondary">Cancel</button>
            <button onClick={handleChangePlan} disabled={newPlan === b.plan} className="btn-premium btn-primary" data-testid="submit-plan-change">{newPlan === b.plan ? 'Current Plan' : `Switch to ${newPlan}`}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={showResetPwd} onOpenChange={setShowResetPwd}>
        <DialogContent className="bg-void border-white/10 max-w-sm">
          <DialogHeader><DialogTitle className="font-display text-white">Reset Password</DialogTitle></DialogHeader>
          {resetPwdUser && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <p className="text-sm text-white font-medium">{resetPwdUser.first_name} {resetPwdUser.last_name}</p>
                <p className="text-xs text-gray-500">{resetPwdUser.email}</p>
                {resetPwdUser.visible_password && (
                  <p className="text-xs text-gray-500 mt-1">Current: <span className="font-mono text-gray-400">{resetPwdUser.visible_password}</span></p>
                )}
              </div>
              <div>
                <Label className="text-gray-400 text-xs">New Password *</Label>
                <Input className="input-premium mt-1" value={resetPwdValue} onChange={e => setResetPwdValue(e.target.value)} placeholder="Min 6 characters" required minLength={6} data-testid="new-password-input" />
              </div>
              <DialogFooter>
                <button type="button" onClick={() => setShowResetPwd(false)} className="btn-premium btn-secondary">Cancel</button>
                <button type="submit" disabled={resetting} className="btn-premium btn-primary" data-testid="submit-reset-password">{resetting ? 'Resetting...' : 'Reset Password'}</button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
