import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { FileText, Download, IndianRupee } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

export default function StaffPayslips() {
  const { api } = useAuth();
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewSlip, setViewSlip] = useState(null);

  useEffect(() => {
    api.get('/staff/payslips').then(r => setPayslips(r.data.payslips || [])).catch(() => {}).finally(() => setLoading(false));
  }, [api]);

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-5" data-testid="staff-payslips">
        <div>
          <h1 className="font-display text-2xl text-white">My Payslips</h1>
          <p className="text-sm text-gray-500 font-sans">View your salary history</p>
        </div>

        {payslips.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <FileText size={32} className="text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No payslips yet</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {payslips.map(p => (
              <div key={p.id} className="glass-card rounded-2xl p-5 hover:border-gold-500/20 transition-colors cursor-pointer" onClick={() => setViewSlip(p)} data-testid={`payslip-${p.id}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-white font-medium">{p.month}/{p.year}</span>
                  <span className={`badge-premium ${p.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>{p.status}</span>
                </div>
                <p className="text-2xl font-bold text-gold-400 font-sans">{fmt(p.net_salary)}</p>
                <p className="text-xs text-gray-500 mt-1">Net Salary</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!viewSlip} onOpenChange={() => setViewSlip(null)}>
        <DialogContent className="bg-void border-white/10 max-w-sm">
          <DialogHeader><DialogTitle className="font-display text-white">Payslip - {viewSlip?.month}/{viewSlip?.year}</DialogTitle></DialogHeader>
          {viewSlip && (
            <div className="space-y-3">
              <div className="space-y-2">
                {[
                  ['Base Salary', viewSlip.base_salary, 'text-white'],
                  ['Allowances', viewSlip.total_allowances, 'text-emerald-400'],
                  ['Deductions', viewSlip.total_deductions, 'text-rose-400'],
                  ['Tax', viewSlip.tax_amount, 'text-rose-400'],
                ].map(([label, amount, cls]) => (
                  <div key={label} className="flex justify-between py-1 border-b border-white/[0.03]">
                    <span className="text-sm text-gray-400">{label}</span>
                    <span className={`text-sm font-semibold ${cls}`}>{fmt(amount)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between pt-2 border-t border-white/5">
                <span className="text-white font-semibold">Net Salary</span>
                <span className="text-lg font-bold text-gold-400">{fmt(viewSlip.net_salary)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
