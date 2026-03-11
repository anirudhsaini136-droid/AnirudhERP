import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { UserCircle, Save, Mail, Phone, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export default function StaffProfile() {
  const { api, user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ phone: '', emergency_contact_name: '', emergency_contact_phone: '' });
  const [changingPwd, setChangingPwd] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current_password: '', new_password: '', confirm_password: '' });

  useEffect(() => {
    api.get('/staff/profile').then(r => {
      setProfile(r.data);
      setForm({ phone: r.data.phone || '', emergency_contact_name: r.data.emergency_contact_name || '', emergency_contact_phone: r.data.emergency_contact_phone || '' });
    }).catch(() => {}).finally(() => setLoading(false));
  }, [api]);

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await api.put('/staff/profile', form); toast.success('Profile updated'); } catch (e) { toast.error('Failed'); }
    setSaving(false);
  };

  const handlePassword = async (e) => {
    e.preventDefault();
    if (pwdForm.new_password !== pwdForm.confirm_password) { toast.error('Passwords do not match'); return; }
    setChangingPwd(true);
    try { await api.put('/staff/change-password', { current_password: pwdForm.current_password, new_password: pwdForm.new_password }); toast.success('Password changed'); setPwdForm({ current_password: '', new_password: '', confirm_password: '' }); } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
    setChangingPwd(false);
  };

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl" data-testid="staff-profile">
        <div>
          <h1 className="font-display text-2xl text-white">My Profile</h1>
          <p className="text-sm text-gray-500 font-sans mt-1">View and update your information</p>
        </div>

        {/* Profile card */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-4 pb-4 border-b border-white/5 mb-4">
            <div className="w-16 h-16 bg-gradient-gold rounded-full flex items-center justify-center text-black text-xl font-bold">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            <div>
              <p className="text-lg text-white font-semibold">{user?.first_name} {user?.last_name}</p>
              <p className="text-sm text-gray-500">{profile?.designation || profile?.department || user?.role?.replace('_', ' ')}</p>
              <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5"><Mail size={11} /> {user?.email}</p>
            </div>
          </div>

          {/* Read-only info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {[
              ['Department', profile?.department], ['Designation', profile?.designation],
              ['Employment', profile?.employment_type?.replace('_', ' ')], ['Date Joined', profile?.date_joined],
            ].map(([k, v]) => (
              <div key={k}><p className="text-xs text-gray-500">{k}</p><p className="text-sm text-white mt-0.5 capitalize">{v || '-'}</p></div>
            ))}
          </div>

          {/* Editable info */}
          <form onSubmit={handleSave} className="space-y-4">
            <div><Label className="text-gray-400 text-xs">Phone</Label><Input className="input-premium mt-1" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} data-testid="profile-phone" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-gray-400 text-xs">Emergency Contact Name</Label><Input className="input-premium mt-1" value={form.emergency_contact_name} onChange={e => setForm({...form, emergency_contact_name: e.target.value})} /></div>
              <div><Label className="text-gray-400 text-xs">Emergency Contact Phone</Label><Input className="input-premium mt-1" value={form.emergency_contact_phone} onChange={e => setForm({...form, emergency_contact_phone: e.target.value})} /></div>
            </div>
            <button type="submit" disabled={saving} className="btn-premium btn-primary" data-testid="save-profile-btn"><Save size={15} /> {saving ? 'Saving...' : 'Save Changes'}</button>
          </form>
        </div>

        {/* Change Password */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="font-display text-lg text-white mb-4">Change Password</h2>
          <form onSubmit={handlePassword} className="space-y-4">
            <div><Label className="text-gray-400 text-xs">Current Password</Label><Input type="password" className="input-premium mt-1" value={pwdForm.current_password} onChange={e => setPwdForm({...pwdForm, current_password: e.target.value})} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-gray-400 text-xs">New Password</Label><Input type="password" className="input-premium mt-1" value={pwdForm.new_password} onChange={e => setPwdForm({...pwdForm, new_password: e.target.value})} required /></div>
              <div><Label className="text-gray-400 text-xs">Confirm Password</Label><Input type="password" className="input-premium mt-1" value={pwdForm.confirm_password} onChange={e => setPwdForm({...pwdForm, confirm_password: e.target.value})} required /></div>
            </div>
            <button type="submit" disabled={changingPwd} className="btn-premium btn-secondary" data-testid="change-password-btn">{changingPwd ? 'Changing...' : 'Change Password'}</button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
