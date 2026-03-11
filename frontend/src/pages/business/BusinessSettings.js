import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Settings, Save, Building2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

export default function BusinessSettings() {
  const { api, refreshUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', address: '', city: '', country: '' });

  useEffect(() => {
    api.get('/dashboard/settings').then(r => {
      setData(r.data);
      const b = r.data.business || {};
      setForm({ name: b.name || '', phone: b.phone || '', address: b.address || '', city: b.city || '', country: b.country || '' });
    }).catch(() => {}).finally(() => setLoading(false));
  }, [api]);

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.put('/dashboard/settings', form);
      toast.success('Settings saved'); refreshUser();
    } catch (e) { toast.error('Failed to save'); }
    setSaving(false);
  };

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" /></div></DashboardLayout>;

  const sub = data?.subscription || {};

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl" data-testid="business-settings-page">
        <div>
          <h1 className="font-display text-2xl text-white">Business Settings</h1>
          <p className="text-sm text-gray-500 font-sans mt-1">Manage your business profile and subscription</p>
        </div>

        {/* Subscription info */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4"><CreditCard size={18} className="text-gold-400" /><h2 className="font-display text-lg text-white">Subscription</h2></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><p className="text-xs text-gray-500">Plan</p><p className="text-sm text-white font-semibold capitalize mt-0.5">{sub.plan}</p></div>
            <div><p className="text-xs text-gray-500">Status</p><span className={`badge-premium ${sub.status === 'active' ? 'badge-success' : sub.status === 'trial' ? 'badge-warning' : 'badge-danger'} mt-0.5 inline-block`}>{sub.status}</span></div>
            <div><p className="text-xs text-gray-500">Expires</p><p className="text-sm text-white mt-0.5">{fmtDate(sub.expires_at)}</p></div>
            <div><p className="text-xs text-gray-500">Days Left</p><p className={`text-sm font-semibold mt-0.5 ${sub.days_remaining <= 7 ? 'text-rose-400' : 'text-emerald-400'}`}>{sub.days_remaining}</p></div>
          </div>
        </div>

        {/* Profile */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4"><Building2 size={18} className="text-gold-400" /><h2 className="font-display text-lg text-white">Business Profile</h2></div>
          <form onSubmit={handleSave} className="space-y-4">
            <div><Label className="text-gray-400 text-xs">Business Name</Label><Input className="input-premium mt-1" value={form.name} onChange={e => setForm({...form, name: e.target.value})} data-testid="settings-name" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-gray-400 text-xs">Phone</Label><Input className="input-premium mt-1" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
              <div><Label className="text-gray-400 text-xs">City</Label><Input className="input-premium mt-1" value={form.city} onChange={e => setForm({...form, city: e.target.value})} /></div>
            </div>
            <div><Label className="text-gray-400 text-xs">Country</Label><Input className="input-premium mt-1" value={form.country} onChange={e => setForm({...form, country: e.target.value})} /></div>
            <div><Label className="text-gray-400 text-xs">Address</Label><textarea className="input-premium mt-1 h-20 resize-none" value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
            <button type="submit" disabled={saving} className="btn-premium btn-primary" data-testid="save-settings-btn"><Save size={15} /> {saving ? 'Saving...' : 'Save Changes'}</button>
          </form>
        </div>

        {/* Payment history */}
        {data?.payment_history?.length > 0 && (
          <div className="glass-card rounded-2xl p-5">
            <h2 className="font-display text-lg text-white mb-4">Payment History</h2>
            <div className="space-y-2">
              {data.payment_history.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-white/[0.03] last:border-0">
                  <div><p className="text-sm text-white">{fmt(p.amount)}</p><p className="text-xs text-gray-500">{p.payment_method?.replace('_', ' ')}</p></div>
                  <div className="text-right"><p className="text-sm text-gray-400">{p.duration_days} days</p><p className="text-xs text-gray-600">{fmtDate(p.payment_date)}</p></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
