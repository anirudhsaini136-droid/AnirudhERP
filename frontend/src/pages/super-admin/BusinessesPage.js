import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Building2, Plus, Search, Filter, Eye, IndianRupee, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const STATUS_COLORS = { active: 'badge-success', trial: 'badge-warning', expired: 'badge-danger', suspended: 'badge-danger', cancelled: 'badge-neutral' };
const PLAN_COLORS = { starter: 'badge-info', growth: 'badge-gold', enterprise: 'badge-success' };

export default function BusinessesPage() {
  const { api } = useAuth();
  const [businesses, setBusinesses] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', owner_name: '', email: '', phone: '', plan: 'starter', initial_days: 30, payment_method: 'cash', amount_paid: 0, notes: '' });

  const fetchBusinesses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (search) params.set('search', search);
      if (filterPlan !== 'all') params.set('plan', filterPlan);
      if (filterStatus !== 'all') params.set('status', filterStatus);
      const res = await api.get(`/super-admin/businesses?${params}`);
      setBusinesses(res.data.businesses || []);
      setTotal(res.data.total || 0);
    } catch (e) { toast.error('Failed to load businesses'); }
    setLoading(false);
  }, [api, page, search, filterPlan, filterStatus]);

  useEffect(() => { fetchBusinesses(); }, [fetchBusinesses]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await api.post('/super-admin/businesses', form);
      toast.success(`Business created! Credentials: ${res.data.owner_credentials?.email} / ${res.data.owner_credentials?.temporary_password}`);
      setShowCreate(false);
      setForm({ name: '', owner_name: '', email: '', phone: '', plan: 'starter', initial_days: 30, payment_method: 'cash', amount_paid: 0, notes: '' });
      fetchBusinesses();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to create business'); }
    setCreating(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-5" data-testid="businesses-page">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-white">Businesses</h1>
            <p className="text-sm text-gray-500 font-sans">{total} total businesses</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-premium btn-primary" data-testid="create-business-btn">
            <Plus size={16} /> Add Business
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text" placeholder="Search businesses..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="input-premium pl-10 text-sm h-10" data-testid="search-input"
            />
          </div>
          <select value={filterPlan} onChange={e => { setFilterPlan(e.target.value); setPage(1); }} className="input-premium w-auto text-sm h-10 pr-8" data-testid="filter-plan">
            <option value="all">All Plans</option>
            <option value="starter">Starter</option>
            <option value="growth">Growth</option>
            <option value="enterprise">Enterprise</option>
          </select>
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className="input-premium w-auto text-sm h-10 pr-8" data-testid="filter-status">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="expired">Expired</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {/* Table */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-premium w-full">
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Expires</th>
                  <th>MRR</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i}><td colSpan={6}><div className="skeleton h-5 rounded w-full" /></td></tr>
                  ))
                ) : businesses.length === 0 ? (
                  <tr><td colSpan={6} className="text-center text-gray-500 py-12">No businesses found</td></tr>
                ) : businesses.map(b => (
                  <tr key={b.id} data-testid={`business-row-${b.id}`}>
                    <td>
                      <div>
                        <p className="text-white font-medium text-sm">{b.name}</p>
                        <p className="text-xs text-gray-500">{b.email}</p>
                      </div>
                    </td>
                    <td><span className={`badge-premium ${PLAN_COLORS[b.plan] || 'badge-neutral'}`}>{b.plan}</span></td>
                    <td><span className={`badge-premium ${STATUS_COLORS[b.status] || 'badge-neutral'}`}>{b.status}</span></td>
                    <td>
                      <span className={`text-sm ${b.days_remaining <= 7 ? 'text-rose-400' : b.days_remaining <= 14 ? 'text-amber-400' : 'text-gray-400'}`}>
                        {b.days_remaining > 0 ? `${b.days_remaining}d` : 'Expired'}
                      </span>
                    </td>
                    <td className="text-sm text-gray-400">{fmt(b.mrr)}</td>
                    <td className="text-right">
                      <Link to={`/super-admin/businesses/${b.id}`} className="inline-flex items-center gap-1 text-sm text-gold-400 hover:text-gold-300 transition-colors" data-testid={`view-business-${b.id}`}>
                        <Eye size={14} /> View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {total > 15 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/5">
              <span className="text-xs text-gray-500">Page {page} of {Math.ceil(total / 15)}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-premium btn-secondary text-xs py-1.5 px-3 disabled:opacity-30">Prev</button>
                <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 15)} className="btn-premium btn-secondary text-xs py-1.5 px-3 disabled:opacity-30">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Business Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-void border-white/10 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display text-white">Add New Business</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-gray-400 text-xs">Business Name *</Label><Input className="input-premium mt-1" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required data-testid="input-name" /></div>
              <div><Label className="text-gray-400 text-xs">Owner Name *</Label><Input className="input-premium mt-1" value={form.owner_name} onChange={e => setForm({...form, owner_name: e.target.value})} required data-testid="input-owner" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-gray-400 text-xs">Email *</Label><Input type="email" className="input-premium mt-1" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required data-testid="input-email" /></div>
              <div><Label className="text-gray-400 text-xs">Phone</Label><Input className="input-premium mt-1" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} data-testid="input-phone" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-gray-400 text-xs">Plan</Label>
                <select className="input-premium mt-1 w-full" value={form.plan} onChange={e => setForm({...form, plan: e.target.value})} data-testid="input-plan">
                  <option value="starter">Starter</option><option value="growth">Growth</option><option value="enterprise">Enterprise</option>
                </select></div>
              <div><Label className="text-gray-400 text-xs">Duration (days)</Label><Input type="number" min="1" className="input-premium mt-1" value={form.initial_days} onChange={e => setForm({...form, initial_days: parseInt(e.target.value) || 30})} data-testid="input-days" /></div>
              <div><Label className="text-gray-400 text-xs">Payment Method</Label>
                <select className="input-premium mt-1 w-full" value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})} data-testid="input-payment-method">
                  <option value="cash">Cash</option><option value="bank_transfer">Bank Transfer</option><option value="cheque">Cheque</option><option value="mobile_money">UPI/Mobile</option>
                </select></div>
            </div>
            <div><Label className="text-gray-400 text-xs">Amount Paid (INR)</Label><Input type="number" min="0" step="0.01" className="input-premium mt-1" value={form.amount_paid} onChange={e => setForm({...form, amount_paid: parseFloat(e.target.value) || 0})} data-testid="input-amount" /></div>
            <div><Label className="text-gray-400 text-xs">Notes</Label><textarea className="input-premium mt-1 h-20 resize-none" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
            <DialogFooter>
              <button type="button" onClick={() => setShowCreate(false)} className="btn-premium btn-secondary">Cancel</button>
              <button type="submit" disabled={creating} className="btn-premium btn-primary" data-testid="submit-create-business">{creating ? 'Creating...' : 'Create Business'}</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
