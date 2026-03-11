import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Plus, Search, Receipt, Trash2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const CATEGORIES = ['Rent', 'Utilities', 'Salaries', 'Marketing', 'Travel', 'Office Supplies', 'Software', 'Insurance', 'Maintenance', 'Other'];

export default function ExpensesPage() {
  const { api } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ category: 'Other', description: '', amount: 0, currency: 'INR', date: new Date().toISOString().split('T')[0] });

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (search) params.set('search', search);
      if (filterCat !== 'all') params.set('category', filterCat);
      const res = await api.get(`/finance/expenses?${params}`);
      setExpenses(res.data.expenses || []);
      setTotal(res.data.total || 0);
      setTotalAmount(res.data.total_amount || 0);
    } catch (e) { toast.error('Failed to load expenses'); }
    setLoading(false);
  }, [api, page, search, filterCat]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editing) { await api.put(`/finance/expenses/${editing}`, form); toast.success('Expense updated'); }
      else { await api.post('/finance/expenses', form); toast.success('Expense added'); }
      setShowForm(false); fetch();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
    setSaving(false);
  };

  const openEdit = (exp) => { setEditing(exp.id); setForm({ category: exp.category, description: exp.description || '', amount: exp.amount, currency: exp.currency || 'INR', date: exp.date }); setShowForm(true); };
  const openCreate = () => { setEditing(null); setForm({ category: 'Other', description: '', amount: 0, currency: 'INR', date: new Date().toISOString().split('T')[0] }); setShowForm(true); };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try { await api.delete(`/finance/expenses/${id}`); toast.success('Deleted'); fetch(); } catch (e) { toast.error('Failed'); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-5" data-testid="expenses-page">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-white">Expenses</h1>
            <p className="text-sm text-gray-500 font-sans">{total} expenses totaling {fmt(totalAmount)}</p>
          </div>
          <button onClick={openCreate} className="btn-premium btn-primary" data-testid="add-expense-btn"><Plus size={16} /> Add Expense</button>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input type="text" placeholder="Search expenses..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="input-premium pl-10 text-sm h-10" />
          </div>
          <select value={filterCat} onChange={e => { setFilterCat(e.target.value); setPage(1); }} className="input-premium w-auto text-sm h-10 pr-8">
            <option value="all">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="table-premium w-full">
            <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {loading ? Array(5).fill(0).map((_, i) => <tr key={i}><td colSpan={5}><div className="skeleton h-5 rounded" /></td></tr>) :
              expenses.length === 0 ? <tr><td colSpan={5} className="text-center text-gray-500 py-12">No expenses</td></tr> :
              expenses.map(exp => (
                <tr key={exp.id} data-testid={`exp-row-${exp.id}`}>
                  <td className="text-sm text-gray-400">{exp.date}</td>
                  <td><span className="badge-premium badge-info">{exp.category}</span></td>
                  <td className="text-sm text-white max-w-[200px] truncate">{exp.description || '-'}</td>
                  <td className="text-sm text-rose-400 font-semibold">{fmt(exp.amount)}</td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(exp)} className="text-gray-400 hover:text-gold-400 p-1"><Edit2 size={15} /></button>
                      <button onClick={() => handleDelete(exp.id)} className="text-gray-400 hover:text-rose-400 p-1"><Trash2 size={15} /></button>
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

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-void border-white/10 max-w-md">
          <DialogHeader><DialogTitle className="font-display text-white">{editing ? 'Edit Expense' : 'Add Expense'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-gray-400 text-xs">Category *</Label>
                <select className="input-premium mt-1 w-full" value={form.category} onChange={e => setForm({...form, category: e.target.value})} data-testid="exp-category">{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div><Label className="text-gray-400 text-xs">Date *</Label><Input type="date" className="input-premium mt-1" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required /></div>
            </div>
            <div><Label className="text-gray-400 text-xs">Amount (INR) *</Label><Input type="number" min="0" step="0.01" className="input-premium mt-1" value={form.amount} onChange={e => setForm({...form, amount: parseFloat(e.target.value) || 0})} required data-testid="exp-amount" /></div>
            <div><Label className="text-gray-400 text-xs">Description</Label><textarea className="input-premium mt-1 h-20 resize-none" value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
            <DialogFooter>
              <button type="button" onClick={() => setShowForm(false)} className="btn-premium btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-premium btn-primary" data-testid="submit-expense">{saving ? 'Saving...' : editing ? 'Update' : 'Add Expense'}</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
