import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Plus, Search, Eye, FileSpreadsheet, Send, CheckCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const STATUS_COLORS = { draft: 'badge-neutral', sent: 'badge-info', paid: 'badge-success', overdue: 'badge-danger', cancelled: 'badge-danger', partial: 'badge-warning' };

const emptyItem = { description: '', quantity: 1, unit_price: 0, amount: 0 };

export default function InvoicesPage() {
  const { api } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ client_name: '', client_email: '', due_date: '', tax_rate: 18, discount_amount: 0, notes: '', currency: 'INR', items: [{ ...emptyItem }] });
  const [viewInvoice, setViewInvoice] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (search) params.set('search', search);
      if (filterStatus !== 'all') params.set('status', filterStatus);
      const res = await api.get(`/finance/invoices?${params}`);
      setInvoices(res.data.invoices || []);
      setTotal(res.data.total || 0);
    } catch (e) { toast.error('Failed to load invoices'); }
    setLoading(false);
  }, [api, page, search, filterStatus]);

  useEffect(() => { fetch(); }, [fetch]);

  const updateItem = (idx, field, value) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    if (field === 'quantity' || field === 'unit_price') items[idx].amount = items[idx].quantity * items[idx].unit_price;
    setForm({ ...form, items });
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { ...emptyItem }] });
  const removeItem = (idx) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });

  const subtotal = form.items.reduce((s, i) => s + (i.amount || 0), 0);
  const taxAmount = subtotal * (form.tax_rate / 100);
  const totalAmount = subtotal + taxAmount - (form.discount_amount || 0);

  const handleCreate = async (e) => {
    e.preventDefault(); setCreating(true);
    try {
      await api.post('/finance/invoices', { ...form, items: form.items.map(i => ({ description: i.description, quantity: i.quantity, unit_price: i.unit_price, amount: i.amount })) });
      toast.success('Invoice created'); setShowCreate(false);
      setForm({ client_name: '', client_email: '', due_date: '', tax_rate: 18, discount_amount: 0, notes: '', currency: 'INR', items: [{ ...emptyItem }] });
      fetch();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
    setCreating(false);
  };

  const markPaid = async (id) => {
    try { await api.put(`/finance/invoices/${id}/status`, { status: 'paid' }); toast.success('Marked as paid'); fetch(); } catch (e) { toast.error('Failed'); }
  };

  const sendInvoice = async (id) => {
    try { await api.post(`/finance/invoices/${id}/send`); toast.success('Invoice sent'); fetch(); } catch (e) { toast.error('Failed'); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-5" data-testid="invoices-page">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-white">Invoices</h1>
            <p className="text-sm text-gray-500 font-sans">{total} invoices</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-premium btn-primary" data-testid="create-invoice-btn"><Plus size={16} /> Create Invoice</button>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input type="text" placeholder="Search invoices..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="input-premium pl-10 text-sm h-10" />
          </div>
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className="input-premium w-auto text-sm h-10 pr-8">
            <option value="all">All Status</option><option value="draft">Draft</option><option value="sent">Sent</option><option value="paid">Paid</option><option value="overdue">Overdue</option>
          </select>
        </div>

        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="table-premium w-full">
            <thead><tr><th>Invoice #</th><th>Client</th><th>Amount</th><th>Due Date</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {loading ? Array(5).fill(0).map((_, i) => <tr key={i}><td colSpan={6}><div className="skeleton h-5 rounded" /></td></tr>) :
              invoices.length === 0 ? <tr><td colSpan={6} className="text-center text-gray-500 py-12">No invoices</td></tr> :
              invoices.map(inv => (
                <tr key={inv.id} data-testid={`inv-row-${inv.id}`}>
                  <td className="text-white text-sm font-medium font-mono">{inv.invoice_number}</td>
                  <td><div><p className="text-sm text-white">{inv.client_name}</p><p className="text-xs text-gray-500">{inv.client_email}</p></div></td>
                  <td className="text-sm text-gold-400 font-semibold">{fmt(inv.total_amount)}</td>
                  <td className="text-sm text-gray-400">{inv.due_date || '-'}</td>
                  <td><span className={`badge-premium ${STATUS_COLORS[inv.status]}`}>{inv.status}</span></td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setViewInvoice(inv)} className="p-1.5 text-gray-400 hover:text-white"><Eye size={15} /></button>
                      {inv.status === 'draft' && <button onClick={() => sendInvoice(inv.id)} className="p-1.5 text-blue-400 hover:text-blue-300"><Send size={15} /></button>}
                      {(inv.status === 'sent' || inv.status === 'overdue') && <button onClick={() => markPaid(inv.id)} className="p-1.5 text-emerald-400 hover:text-emerald-300" data-testid={`mark-paid-${inv.id}`}><CheckCircle size={15} /></button>}
                    </div>
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

      {/* Create Invoice Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-void border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display text-white">Create Invoice</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-gray-400 text-xs">Client Name *</Label><Input className="input-premium mt-1" value={form.client_name} onChange={e => setForm({...form, client_name: e.target.value})} required data-testid="inv-client-name" /></div>
              <div><Label className="text-gray-400 text-xs">Client Email</Label><Input type="email" className="input-premium mt-1" value={form.client_email} onChange={e => setForm({...form, client_email: e.target.value})} data-testid="inv-client-email" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-gray-400 text-xs">Due Date</Label><Input type="date" className="input-premium mt-1" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} /></div>
              <div><Label className="text-gray-400 text-xs">Tax Rate (%)</Label><Input type="number" min="0" className="input-premium mt-1" value={form.tax_rate} onChange={e => setForm({...form, tax_rate: parseFloat(e.target.value) || 0})} /></div>
              <div><Label className="text-gray-400 text-xs">Discount (INR)</Label><Input type="number" min="0" className="input-premium mt-1" value={form.discount_amount} onChange={e => setForm({...form, discount_amount: parseFloat(e.target.value) || 0})} /></div>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-gray-400 text-xs">Line Items</Label>
                <button type="button" onClick={addItem} className="text-xs text-gold-400 hover:text-gold-300">+ Add Item</button>
              </div>
              <div className="space-y-2">
                {form.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5"><Input placeholder="Description" className="input-premium text-sm" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} /></div>
                    <div className="col-span-2"><Input type="number" min="1" placeholder="Qty" className="input-premium text-sm" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)} /></div>
                    <div className="col-span-2"><Input type="number" min="0" placeholder="Price" className="input-premium text-sm" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)} /></div>
                    <div className="col-span-2 text-sm text-gold-400 font-semibold py-2">{fmt(item.amount)}</div>
                    <div className="col-span-1">{form.items.length > 1 && <button type="button" onClick={() => removeItem(idx)} className="text-rose-400 hover:text-rose-300 p-1"><Trash2 size={14} /></button>}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="border-t border-white/5 pt-3 space-y-1 text-sm">
              <div className="flex justify-between text-gray-400"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
              <div className="flex justify-between text-gray-400"><span>Tax ({form.tax_rate}%)</span><span>{fmt(taxAmount)}</span></div>
              {form.discount_amount > 0 && <div className="flex justify-between text-gray-400"><span>Discount</span><span className="text-rose-400">-{fmt(form.discount_amount)}</span></div>}
              <div className="flex justify-between text-white font-semibold text-base pt-2 border-t border-white/5"><span>Total</span><span className="text-gold-400">{fmt(totalAmount)}</span></div>
            </div>

            <div><Label className="text-gray-400 text-xs">Notes</Label><textarea className="input-premium mt-1 h-16 resize-none" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
            <DialogFooter>
              <button type="button" onClick={() => setShowCreate(false)} className="btn-premium btn-secondary">Cancel</button>
              <button type="submit" disabled={creating} className="btn-premium btn-primary" data-testid="submit-invoice">{creating ? 'Creating...' : 'Create Invoice'}</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog open={!!viewInvoice} onOpenChange={() => setViewInvoice(null)}>
        <DialogContent className="bg-void border-white/10 max-w-lg">
          <DialogHeader><DialogTitle className="font-display text-white">Invoice #{viewInvoice?.invoice_number}</DialogTitle></DialogHeader>
          {viewInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[['Client', viewInvoice.client_name], ['Email', viewInvoice.client_email || '-'], ['Status', viewInvoice.status], ['Due', viewInvoice.due_date || '-']].map(([k, v]) => (
                  <div key={k}><p className="text-xs text-gray-500">{k}</p><p className="text-sm text-white mt-0.5 capitalize">{v}</p></div>
                ))}
              </div>
              {viewInvoice.items?.length > 0 && (
                <div className="space-y-1">
                  {viewInvoice.items.map((item, i) => (
                    <div key={i} className="flex justify-between py-1 border-b border-white/[0.03]">
                      <span className="text-sm text-gray-400">{item.description} x{item.quantity}</span>
                      <span className="text-sm text-white">{fmt(item.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="pt-2 border-t border-white/5">
                <div className="flex justify-between text-white font-semibold"><span>Total</span><span className="text-gold-400">{fmt(viewInvoice.total_amount)}</span></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
