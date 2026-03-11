import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Search,
  Plus,
  Eye,
  Clock,
  LogIn,
  Ban,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

const statusColors = {
  active: 'bg-success/15 text-success',
  trial: 'bg-info/15 text-info',
  suspended: 'bg-error/15 text-error',
  expired: 'bg-error/15 text-error',
  cancelled: 'bg-gray-500/15 text-gray-400',
};

const planColors = {
  starter: 'bg-gray-500/15 text-gray-400',
  growth: 'bg-info/15 text-info',
  enterprise: 'bg-gold/15 text-gold',
};

const getDaysColor = (days) => {
  if (days > 14) return 'text-success';
  if (days > 7) return 'text-warning';
  if (days > 0) return 'text-error';
  return 'text-error font-bold';
};

const BusinessesPage = () => {
  const { api, startImpersonation } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [planFilter, setPlanFilter] = useState(searchParams.get('plan') || 'all');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [page, setPage] = useState(parseInt(searchParams.get('page')) || 1);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // New business form
  const [newBusiness, setNewBusiness] = useState({
    name: '',
    owner_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    plan: 'starter',
    initial_days: 30,
    payment_method: 'cash',
    amount_paid: 0,
    notes: ''
  });

  // Extend form
  const [extendForm, setExtendForm] = useState({
    duration_days: 30,
    payment_method: 'cash',
    amount: 0,
    currency: 'USD',
    payment_date: new Date().toISOString().split('T')[0],
    reference_number: '',
    notes: ''
  });

  useEffect(() => {
    fetchBusinesses();
  }, [search, planFilter, statusFilter, page]);

  const fetchBusinesses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (planFilter !== 'all') params.append('plan', planFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      params.append('page', page);
      params.append('limit', 20);

      const response = await api.get(`/super-admin/businesses?${params}`);
      setBusinesses(response.data.businesses || []);
      setTotal(response.data.total || 0);
      setPages(response.data.pages || 1);
    } catch (error) {
      console.error('Failed to fetch businesses:', error);
      toast.error('Failed to load businesses');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBusiness = async () => {
    setActionLoading(true);
    try {
      const response = await api.post('/super-admin/businesses', newBusiness);
      toast.success(`Business created! Credentials sent to ${newBusiness.email}`);
      setCreateDialogOpen(false);
      setNewBusiness({
        name: '', owner_name: '', email: '', phone: '', address: '',
        city: '', country: '', plan: 'starter', initial_days: 30,
        payment_method: 'cash', amount_paid: 0, notes: ''
      });
      fetchBusinesses();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create business');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExtendSubscription = async () => {
    if (!selectedBusiness) return;
    setActionLoading(true);
    try {
      const response = await api.post(`/super-admin/businesses/${selectedBusiness.id}/extend`, extendForm);
      toast.success(response.data.message);
      setExtendDialogOpen(false);
      setSelectedBusiness(null);
      fetchBusinesses();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to extend subscription');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async (businessId) => {
    if (!window.confirm('Are you sure you want to suspend this business?')) return;
    try {
      await api.post(`/super-admin/businesses/${businessId}/suspend`);
      toast.success('Business suspended');
      fetchBusinesses();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to suspend business');
    }
  };

  const handleImpersonate = async (businessId) => {
    const success = await startImpersonation(businessId);
    if (success) {
      navigate('/dashboard');
    } else {
      toast.error('Failed to impersonate business');
    }
  };

  const openExtendDialog = (business) => {
    setSelectedBusiness(business);
    setExtendForm({
      duration_days: 30,
      payment_method: 'cash',
      amount: 0,
      currency: 'USD',
      payment_date: new Date().toISOString().split('T')[0],
      reference_number: '',
      notes: ''
    });
    setExtendDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="businesses-page">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl text-white">Businesses</h1>
            <p className="text-gray-400 mt-1">{total} businesses registered</p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gold hover:bg-gold-600 text-black" data-testid="create-business-btn">
                <Plus className="h-4 w-4 mr-2" />
                Create Business
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-charcoal border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-white font-serif">Create New Business</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="col-span-2 md:col-span-1">
                  <Label className="text-gray-300">Business Name *</Label>
                  <Input
                    value={newBusiness.name}
                    onChange={(e) => setNewBusiness({ ...newBusiness, name: e.target.value })}
                    className="bg-midnight border-white/10 text-white mt-1"
                    placeholder="Acme Corp"
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <Label className="text-gray-300">Owner Name *</Label>
                  <Input
                    value={newBusiness.owner_name}
                    onChange={(e) => setNewBusiness({ ...newBusiness, owner_name: e.target.value })}
                    className="bg-midnight border-white/10 text-white mt-1"
                    placeholder="John Doe"
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <Label className="text-gray-300">Email *</Label>
                  <Input
                    type="email"
                    value={newBusiness.email}
                    onChange={(e) => setNewBusiness({ ...newBusiness, email: e.target.value })}
                    className="bg-midnight border-white/10 text-white mt-1"
                    placeholder="owner@acme.com"
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <Label className="text-gray-300">Phone</Label>
                  <Input
                    value={newBusiness.phone}
                    onChange={(e) => setNewBusiness({ ...newBusiness, phone: e.target.value })}
                    className="bg-midnight border-white/10 text-white mt-1"
                    placeholder="+1 234 567 8900"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-gray-300">Address</Label>
                  <Textarea
                    value={newBusiness.address}
                    onChange={(e) => setNewBusiness({ ...newBusiness, address: e.target.value })}
                    className="bg-midnight border-white/10 text-white mt-1"
                    placeholder="123 Main St"
                    rows={2}
                  />
                </div>
                <div>
                  <Label className="text-gray-300">City</Label>
                  <Input
                    value={newBusiness.city}
                    onChange={(e) => setNewBusiness({ ...newBusiness, city: e.target.value })}
                    className="bg-midnight border-white/10 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Country</Label>
                  <Input
                    value={newBusiness.country}
                    onChange={(e) => setNewBusiness({ ...newBusiness, country: e.target.value })}
                    className="bg-midnight border-white/10 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Plan</Label>
                  <Select value={newBusiness.plan} onValueChange={(v) => setNewBusiness({ ...newBusiness, plan: v })}>
                    <SelectTrigger className="bg-midnight border-white/10 text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-charcoal border-white/10">
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="growth">Growth</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-300">Initial Access (Days)</Label>
                  <Input
                    type="number"
                    value={newBusiness.initial_days}
                    onChange={(e) => setNewBusiness({ ...newBusiness, initial_days: parseInt(e.target.value) || 0 })}
                    className="bg-midnight border-white/10 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Payment Method</Label>
                  <Select value={newBusiness.payment_method} onValueChange={(v) => setNewBusiness({ ...newBusiness, payment_method: v })}>
                    <SelectTrigger className="bg-midnight border-white/10 text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-charcoal border-white/10">
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="mobile_money">Mobile Money</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-300">Amount Paid</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newBusiness.amount_paid}
                    onChange={(e) => setNewBusiness({ ...newBusiness, amount_paid: parseFloat(e.target.value) || 0 })}
                    className="bg-midnight border-white/10 text-white mt-1"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-gray-300">Notes</Label>
                  <Textarea
                    value={newBusiness.notes}
                    onChange={(e) => setNewBusiness({ ...newBusiness, notes: e.target.value })}
                    className="bg-midnight border-white/10 text-white mt-1"
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="border-white/10 text-white">
                  Cancel
                </Button>
                <Button onClick={handleCreateBusiness} disabled={actionLoading || !newBusiness.name || !newBusiness.email} className="bg-gold hover:bg-gold-600 text-black">
                  {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Business
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card className="bg-charcoal border-white/5">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="bg-midnight border-white/10 text-white pl-10"
                  data-testid="search-input"
                />
              </div>
              <Select value={planFilter} onValueChange={(v) => { setPlanFilter(v); setPage(1); }}>
                <SelectTrigger className="w-40 bg-midnight border-white/10 text-white">
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent className="bg-charcoal border-white/10">
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-40 bg-midnight border-white/10 text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-charcoal border-white/10">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="bg-charcoal border-white/5">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-gold mx-auto" />
              </div>
            ) : businesses.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No businesses found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Business</th>
                      <th>Plan</th>
                      <th>Status</th>
                      <th>Days Left</th>
                      <th>MRR</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {businesses.map((business) => (
                      <tr key={business.id}>
                        <td>
                          <div>
                            <p className="text-white font-medium">{business.name}</p>
                            <p className="text-sm text-gray-500">{business.email}</p>
                          </div>
                        </td>
                        <td>
                          <Badge className={planColors[business.plan] || planColors.starter}>
                            {business.plan}
                          </Badge>
                        </td>
                        <td>
                          <Badge className={statusColors[business.status] || statusColors.active}>
                            {business.status}
                          </Badge>
                        </td>
                        <td>
                          <span className={getDaysColor(business.days_remaining)}>
                            {business.days_remaining <= 0 ? 'EXPIRED' : `${business.days_remaining} days`}
                          </span>
                        </td>
                        <td className="text-gold font-medium">
                          ${(business.mrr || 0).toFixed(2)}
                        </td>
                        <td className="text-gray-400">
                          {new Date(business.created_at).toLocaleDateString()}
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <Link to={`/super-admin/businesses/${business.id}`}>
                              <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white" data-testid={`view-${business.id}`}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button size="sm" variant="ghost" className="text-gold hover:text-gold-400" onClick={() => openExtendDialog(business)} data-testid={`extend-${business.id}`}>
                              <Clock className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-info hover:text-info" onClick={() => handleImpersonate(business.id)} data-testid={`impersonate-${business.id}`}>
                              <LogIn className="h-4 w-4" />
                            </Button>
                            {business.status !== 'suspended' && (
                              <Button size="sm" variant="ghost" className="text-error hover:text-error" onClick={() => handleSuspend(business.id)} data-testid={`suspend-${business.id}`}>
                                <Ban className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-sm">
              Page {page} of {pages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="border-white/10 text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page === pages}
                className="border-white/10 text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Extend Dialog */}
        <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
          <DialogContent className="bg-charcoal border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white font-serif">
                Extend Subscription - {selectedBusiness?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-gray-300">Extension Duration</Label>
                <Select value={extendForm.duration_days.toString()} onValueChange={(v) => setExtendForm({ ...extendForm, duration_days: parseInt(v) })}>
                  <SelectTrigger className="bg-midnight border-white/10 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-charcoal border-white/10">
                    <SelectItem value="7">7 Days</SelectItem>
                    <SelectItem value="15">15 Days</SelectItem>
                    <SelectItem value="30">1 Month</SelectItem>
                    <SelectItem value="60">2 Months</SelectItem>
                    <SelectItem value="90">3 Months</SelectItem>
                    <SelectItem value="180">6 Months</SelectItem>
                    <SelectItem value="365">1 Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Payment Method</Label>
                  <Select value={extendForm.payment_method} onValueChange={(v) => setExtendForm({ ...extendForm, payment_method: v })}>
                    <SelectTrigger className="bg-midnight border-white/10 text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-charcoal border-white/10">
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="mobile_money">Mobile Money</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-300">Amount Received</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={extendForm.amount}
                    onChange={(e) => setExtendForm({ ...extendForm, amount: parseFloat(e.target.value) || 0 })}
                    className="bg-midnight border-white/10 text-white mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Payment Date</Label>
                  <Input
                    type="date"
                    value={extendForm.payment_date}
                    onChange={(e) => setExtendForm({ ...extendForm, payment_date: e.target.value })}
                    className="bg-midnight border-white/10 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Reference Number</Label>
                  <Input
                    value={extendForm.reference_number}
                    onChange={(e) => setExtendForm({ ...extendForm, reference_number: e.target.value })}
                    className="bg-midnight border-white/10 text-white mt-1"
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div>
                <Label className="text-gray-300">Notes</Label>
                <Textarea
                  value={extendForm.notes}
                  onChange={(e) => setExtendForm({ ...extendForm, notes: e.target.value })}
                  className="bg-midnight border-white/10 text-white mt-1"
                  rows={2}
                  placeholder="e.g., Paid cash in person"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setExtendDialogOpen(false)} className="border-white/10 text-white">
                Cancel
              </Button>
              <Button onClick={handleExtendSubscription} disabled={actionLoading} className="bg-gold hover:bg-gold-600 text-black">
                {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Extend Access
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default BusinessesPage;
