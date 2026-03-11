import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Plus, Search, Eye, Edit2, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

const DEPARTMENTS = ['Engineering', 'HR', 'Finance', 'Marketing', 'Sales', 'Operations', 'Support', 'Design', 'Other'];
const STATUS_COLORS = { active: 'badge-success', on_leave: 'badge-warning', terminated: 'badge-danger', resigned: 'badge-neutral' };
const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const emptyForm = { first_name: '', last_name: '', email: '', phone: '', department: 'Engineering', designation: '', employment_type: 'full_time', salary_amount: 0, salary_currency: 'INR', date_joined: new Date().toISOString().split('T')[0] };

export default function EmployeesPage() {
  const { api } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [viewEmp, setViewEmp] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (search) params.set('search', search);
      if (filterDept !== 'all') params.set('department', filterDept);
      const res = await api.get(`/hr/employees?${params}`);
      setEmployees(res.data.employees || []);
      setTotal(res.data.total || 0);
    } catch (e) { toast.error('Failed to load employees'); }
    setLoading(false);
  }, [api, page, search, filterDept]);

  useEffect(() => { fetch(); }, [fetch]);

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm }); setShowForm(true); };
  const openEdit = (emp) => { setEditing(emp.id); setForm({ first_name: emp.first_name, last_name: emp.last_name, email: emp.email, phone: emp.phone || '', department: emp.department || 'Engineering', designation: emp.designation || '', employment_type: emp.employment_type || 'full_time', salary_amount: emp.salary_amount || 0, salary_currency: emp.salary_currency || 'INR', date_joined: emp.date_joined || '' }); setShowForm(true); };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editing) { await api.put(`/hr/employees/${editing}`, form); toast.success('Employee updated'); }
      else { await api.post('/hr/employees', form); toast.success('Employee added'); }
      setShowForm(false); fetch();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Terminate this employee?')) return;
    try { await api.delete(`/hr/employees/${id}`); toast.success('Employee terminated'); fetch(); } catch (e) { toast.error('Failed'); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-5" data-testid="employees-page">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-white">Employees</h1>
            <p className="text-sm text-gray-500 font-sans">{total} employees</p>
          </div>
          <button onClick={openCreate} className="btn-premium btn-primary" data-testid="add-employee-btn"><Plus size={16} /> Add Employee</button>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input type="text" placeholder="Search employees..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="input-premium pl-10 text-sm h-10" data-testid="search-employees" />
          </div>
          <select value={filterDept} onChange={e => { setFilterDept(e.target.value); setPage(1); }} className="input-premium w-auto text-sm h-10 pr-8" data-testid="filter-dept">
            <option value="all">All Departments</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="table-premium w-full">
            <thead><tr><th>Employee</th><th>Department</th><th>Type</th><th>Salary</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {loading ? Array(5).fill(0).map((_, i) => <tr key={i}><td colSpan={6}><div className="skeleton h-5 rounded" /></td></tr>) :
              employees.length === 0 ? <tr><td colSpan={6} className="text-center text-gray-500 py-12">No employees found</td></tr> :
              employees.map(emp => (
                <tr key={emp.id} data-testid={`emp-row-${emp.id}`}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400 text-xs font-bold shrink-0">{emp.first_name?.[0]}{emp.last_name?.[0]}</div>
                      <div><p className="text-white text-sm font-medium">{emp.first_name} {emp.last_name}</p><p className="text-xs text-gray-500">{emp.email}</p></div>
                    </div>
                  </td>
                  <td><span className="badge-premium badge-info">{emp.department}</span></td>
                  <td className="text-sm text-gray-400 capitalize">{emp.employment_type?.replace('_', ' ')}</td>
                  <td className="text-sm text-gold-400 font-semibold">{fmt(emp.salary_amount)}</td>
                  <td><span className={`badge-premium ${STATUS_COLORS[emp.status] || 'badge-neutral'}`}>{emp.status || 'active'}</span></td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setViewEmp(emp)} className="text-gray-400 hover:text-white" data-testid={`view-emp-${emp.id}`}><Eye size={15} /></button>
                      <button onClick={() => openEdit(emp)} className="text-gray-400 hover:text-gold-400" data-testid={`edit-emp-${emp.id}`}><Edit2 size={15} /></button>
                      <button onClick={() => handleDelete(emp.id)} className="text-gray-400 hover:text-rose-400" data-testid={`delete-emp-${emp.id}`}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-void border-white/10 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display text-white">{editing ? 'Edit Employee' : 'Add Employee'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-gray-400 text-xs">First Name *</Label><Input className="input-premium mt-1" value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} required data-testid="emp-first-name" /></div>
              <div><Label className="text-gray-400 text-xs">Last Name *</Label><Input className="input-premium mt-1" value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} required data-testid="emp-last-name" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-gray-400 text-xs">Email *</Label><Input type="email" className="input-premium mt-1" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></div>
              <div><Label className="text-gray-400 text-xs">Phone</Label><Input className="input-premium mt-1" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-gray-400 text-xs">Department</Label>
                <select className="input-premium mt-1 w-full" value={form.department} onChange={e => setForm({...form, department: e.target.value})} data-testid="emp-dept">{DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
              <div><Label className="text-gray-400 text-xs">Designation</Label><Input className="input-premium mt-1" value={form.designation} onChange={e => setForm({...form, designation: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-gray-400 text-xs">Employment Type</Label>
                <select className="input-premium mt-1 w-full" value={form.employment_type} onChange={e => setForm({...form, employment_type: e.target.value})}>
                  <option value="full_time">Full Time</option><option value="part_time">Part Time</option><option value="contract">Contract</option><option value="intern">Intern</option>
                </select></div>
              <div><Label className="text-gray-400 text-xs">Salary (INR)</Label><Input type="number" min="0" className="input-premium mt-1" value={form.salary_amount} onChange={e => setForm({...form, salary_amount: parseFloat(e.target.value) || 0})} data-testid="emp-salary" /></div>
              <div><Label className="text-gray-400 text-xs">Date Joined</Label><Input type="date" className="input-premium mt-1" value={form.date_joined} onChange={e => setForm({...form, date_joined: e.target.value})} /></div>
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setShowForm(false)} className="btn-premium btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-premium btn-primary" data-testid="submit-employee">{saving ? 'Saving...' : editing ? 'Update' : 'Add Employee'}</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Employee Dialog */}
      <Dialog open={!!viewEmp} onOpenChange={() => setViewEmp(null)}>
        <DialogContent className="bg-void border-white/10 max-w-md">
          <DialogHeader><DialogTitle className="font-display text-white">Employee Details</DialogTitle></DialogHeader>
          {viewEmp && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 pb-3 border-b border-white/5">
                <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400 text-lg font-bold">{viewEmp.first_name?.[0]}{viewEmp.last_name?.[0]}</div>
                <div><p className="text-lg text-white font-semibold">{viewEmp.first_name} {viewEmp.last_name}</p><p className="text-sm text-gray-500">{viewEmp.designation || viewEmp.department}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[['Email', viewEmp.email], ['Phone', viewEmp.phone || '-'], ['Department', viewEmp.department], ['Type', viewEmp.employment_type?.replace('_', ' ')], ['Salary', fmt(viewEmp.salary_amount)], ['Joined', viewEmp.date_joined || '-'], ['Status', viewEmp.status || 'active']].map(([k, v]) => (
                  <div key={k}><p className="text-xs text-gray-500">{k}</p><p className="text-sm text-white mt-0.5 capitalize">{v}</p></div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
