import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Users, Plus, UserCheck, UserX, Shield, Eye, EyeOff, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

const ROLE_COLORS = { business_owner: 'badge-gold', hr_admin: 'badge-info', finance_admin: 'badge-success', inventory_admin: 'badge-warning', staff: 'badge-neutral' };

function PasswordCell({ password }) {
  const [show, setShow] = React.useState(false);
  if (!password) return <span className="text-xs text-gray-600 italic">-</span>;
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-mono text-gray-400">{show ? password : '********'}</span>
      <button onClick={() => setShow(!show)} className="text-gray-500 hover:text-white">
        {show ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
    </div>
  );
}

export default function UserManagement() {
  const { api } = useAuth();
  const [data, setData] = useState({ users: [], total: 0, limit: 5, can_add_more: true });
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ email: '', first_name: '', last_name: '', phone: '', role: 'staff' });
  const [showResetPwd, setShowResetPwd] = useState(false);
  const [resetPwdUser, setResetPwdUser] = useState(null);
  const [resetPwdValue, setResetPwdValue] = useState('');
  const [resetting, setResetting] = useState(false);

  const fetchUsers = async () => {
    try { const res = await api.get('/dashboard/users'); setData(res.data); } catch (e) {} setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault(); setCreating(true);
    try {
      const res = await api.post('/dashboard/users', form);
      toast.success(`User created! Credentials: ${res.data.credentials?.email} / ${res.data.credentials?.temporary_password}`);
      setShowCreate(false); setForm({ email: '', first_name: '', last_name: '', phone: '', role: 'staff' }); fetchUsers();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
    setCreating(false);
  };

  const toggleUser = async (userId, activate) => {
    try {
      await api.put(`/dashboard/users/${userId}/${activate ? 'activate' : 'deactivate'}`);
      toast.success(activate ? 'User activated' : 'User deactivated'); fetchUsers();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const openResetPassword = (u) => { setResetPwdUser(u); setResetPwdValue(''); setShowResetPwd(true); };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetPwdValue || resetPwdValue.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setResetting(true);
    try {
      await api.post('/dashboard/reset-password', { user_id: resetPwdUser.id, new_password: resetPwdValue });
      toast.success('Password reset successfully');
      setShowResetPwd(false);
      fetchUsers();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
    setResetting(false);
  };

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-5" data-testid="user-management-page">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-white">Manage Users</h1>
            <p className="text-sm text-gray-500 font-sans">{data.total} of {data.limit === Infinity ? 'unlimited' : data.limit} users</p>
          </div>
          {data.can_add_more && (
            <button onClick={() => setShowCreate(true)} className="btn-premium btn-primary" data-testid="add-user-btn">
              <Plus size={16} /> Add User
            </button>
          )}
        </div>

        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="table-premium w-full">
            <thead><tr><th>Name</th><th>Email</th><th>Password</th><th>Role</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {data.users.map(u => (
                <tr key={u.id} data-testid={`user-row-${u.id}`}>
                  <td className="text-white text-sm font-medium">{u.first_name} {u.last_name}</td>
                  <td className="text-sm">{u.email}</td>
                  <td><PasswordCell password={u.visible_password} /></td>
                  <td><span className={`badge-premium ${ROLE_COLORS[u.role] || 'badge-neutral'}`}>{u.role?.replace('_', ' ')}</span></td>
                  <td><span className={`badge-premium ${u.is_active ? 'badge-success' : 'badge-danger'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openResetPassword(u)} className="text-xs text-gold-400 hover:text-gold-300 font-medium" data-testid={`reset-pwd-${u.id}`}>Reset Pwd</button>
                      {u.role !== 'business_owner' && (
                        <button onClick={() => toggleUser(u.id, !u.is_active)} className={`text-xs font-medium ${u.is_active ? 'text-rose-400 hover:text-rose-300' : 'text-emerald-400 hover:text-emerald-300'}`} data-testid={`toggle-user-${u.id}`}>
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-void border-white/10 max-w-md">
          <DialogHeader><DialogTitle className="font-display text-white">Add User</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-gray-400 text-xs">First Name *</Label><Input className="input-premium mt-1" value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} required /></div>
              <div><Label className="text-gray-400 text-xs">Last Name *</Label><Input className="input-premium mt-1" value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} required /></div>
            </div>
            <div><Label className="text-gray-400 text-xs">Email *</Label><Input type="email" className="input-premium mt-1" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></div>
            <div><Label className="text-gray-400 text-xs">Phone</Label><Input className="input-premium mt-1" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
            <div><Label className="text-gray-400 text-xs">Role *</Label>
              <select className="input-premium mt-1 w-full" value={form.role} onChange={e => setForm({...form, role: e.target.value})} data-testid="select-role">
                <option value="hr_admin">HR Admin</option><option value="finance_admin">Finance Admin</option><option value="inventory_admin">Inventory Admin</option><option value="staff">Staff</option>
              </select>
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setShowCreate(false)} className="btn-premium btn-secondary">Cancel</button>
              <button type="submit" disabled={creating} className="btn-premium btn-primary" data-testid="submit-create-user">{creating ? 'Creating...' : 'Create User'}</button>
            </DialogFooter>
          </form>
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
