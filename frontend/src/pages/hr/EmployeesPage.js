import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
import { Checkbox } from '../../components/ui/checkbox';
import {
  Search,
  Plus,
  User,
  Mail,
  Phone,
  Building2,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

const statusColors = {
  active: 'bg-success/15 text-success',
  on_leave: 'bg-info/15 text-info',
  suspended: 'bg-warning/15 text-warning',
  terminated: 'bg-error/15 text-error',
};

const employmentTypeColors = {
  full_time: 'bg-info/15 text-info',
  part_time: 'bg-warning/15 text-warning',
  contract: 'bg-gray-500/15 text-gray-400',
};

const EmployeesPage = () => {
  const { api } = useAuth();
  
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [departments, setDepartments] = useState([]);
  
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [newEmployee, setNewEmployee] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department: '',
    job_title: '',
    employment_type: 'full_time',
    start_date: new Date().toISOString().split('T')[0],
    base_salary: 0,
    salary_currency: 'USD',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    create_user_account: false
  });

  useEffect(() => {
    fetchEmployees();
  }, [search, departmentFilter, statusFilter, page]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (departmentFilter !== 'all') params.append('department', departmentFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      params.append('page', page);
      params.append('limit', 20);

      const response = await api.get(`/hr/employees?${params}`);
      setEmployees(response.data.employees || []);
      setTotal(response.data.total || 0);
      setPages(response.data.pages || 1);
      setDepartments(response.data.departments || []);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEmployee = async () => {
    setActionLoading(true);
    try {
      const response = await api.post('/hr/employees', newEmployee);
      toast.success(`Employee ${response.data.employee_code} created!`);
      
      if (response.data.user_credentials) {
        toast.info(`Login credentials sent to ${newEmployee.email}`);
      }
      
      setCreateDialogOpen(false);
      setNewEmployee({
        first_name: '', last_name: '', email: '', phone: '',
        department: '', job_title: '', employment_type: 'full_time',
        start_date: new Date().toISOString().split('T')[0],
        base_salary: 0, salary_currency: 'USD', address: '',
        emergency_contact_name: '', emergency_contact_phone: '',
        create_user_account: false
      });
      fetchEmployees();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create employee');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20 md:pb-0" data-testid="employees-page">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl text-white">Employees</h1>
            <p className="text-gray-400 mt-1">{total} employees in directory</p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gold hover:bg-gold-600 text-black" data-testid="add-employee-btn">
                <Plus className="h-4 w-4 mr-2" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-charcoal border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-white font-serif">Add New Employee</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div>
                  <Label className="text-gray-300">First Name *</Label>
                  <Input
                    value={newEmployee.first_name}
                    onChange={(e) => setNewEmployee({ ...newEmployee, first_name: e.target.value })}
                    className="bg-midnight border-white/10 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Last Name *</Label>
                  <Input
                    value={newEmployee.last_name}
                    onChange={(e) => setNewEmployee({ ...newEmployee, last_name: e.target.value })}
                    className="bg-midnight border-white/10 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Email</Label>
                  <Input
                    type="email"
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                    className="bg-midnight border-white/10 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Phone</Label>
                  <Input
                    value={newEmployee.phone}
                    onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                    className="bg-midnight border-white/10 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Department</Label>
                  <Input
                    value={newEmployee.department}
                    onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
                    className="bg-midnight border-white/10 text-white mt-1"
                    placeholder="e.g., Engineering"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Job Title</Label>
                  <Input
                    value={newEmployee.job_title}
                    onChange={(e) => setNewEmployee({ ...newEmployee, job_title: e.target.value })}
                    className="bg-midnight border-white/10 text-white mt-1"
                    placeholder="e.g., Software Engineer"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Employment Type</Label>
                  <Select value={newEmployee.employment_type} onValueChange={(v) => setNewEmployee({ ...newEmployee, employment_type: v })}>
                    <SelectTrigger className="bg-midnight border-white/10 text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-charcoal border-white/10">
                      <SelectItem value="full_time">Full Time</SelectItem>
                      <SelectItem value="part_time">Part Time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-300">Start Date</Label>
                  <Input
                    type="date"
                    value={newEmployee.start_date}
                    onChange={(e) => setNewEmployee({ ...newEmployee, start_date: e.target.value })}
                    className="bg-midnight border-white/10 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Base Salary</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newEmployee.base_salary}
                    onChange={(e) => setNewEmployee({ ...newEmployee, base_salary: parseFloat(e.target.value) || 0 })}
                    className="bg-midnight border-white/10 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Currency</Label>
                  <Select value={newEmployee.salary_currency} onValueChange={(v) => setNewEmployee({ ...newEmployee, salary_currency: v })}>
                    <SelectTrigger className="bg-midnight border-white/10 text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-charcoal border-white/10">
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label className="text-gray-300">Address</Label>
                  <Textarea
                    value={newEmployee.address}
                    onChange={(e) => setNewEmployee({ ...newEmployee, address: e.target.value })}
                    className="bg-midnight border-white/10 text-white mt-1"
                    rows={2}
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Emergency Contact Name</Label>
                  <Input
                    value={newEmployee.emergency_contact_name}
                    onChange={(e) => setNewEmployee({ ...newEmployee, emergency_contact_name: e.target.value })}
                    className="bg-midnight border-white/10 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Emergency Contact Phone</Label>
                  <Input
                    value={newEmployee.emergency_contact_phone}
                    onChange={(e) => setNewEmployee({ ...newEmployee, emergency_contact_phone: e.target.value })}
                    className="bg-midnight border-white/10 text-white mt-1"
                  />
                </div>
                <div className="col-span-2 flex items-center gap-2 pt-2">
                  <Checkbox
                    id="create_user"
                    checked={newEmployee.create_user_account}
                    onCheckedChange={(checked) => setNewEmployee({ ...newEmployee, create_user_account: checked })}
                  />
                  <Label htmlFor="create_user" className="text-gray-300 cursor-pointer">
                    Create staff login account (requires email)
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="border-white/10 text-white">
                  Cancel
                </Button>
                <Button onClick={handleCreateEmployee} disabled={actionLoading || !newEmployee.first_name || !newEmployee.last_name} className="bg-gold hover:bg-gold-600 text-black">
                  {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add Employee
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
                  placeholder="Search by name, email, or code..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="bg-midnight border-white/10 text-white pl-10"
                  data-testid="search-input"
                />
              </div>
              <Select value={departmentFilter} onValueChange={(v) => { setDepartmentFilter(v); setPage(1); }}>
                <SelectTrigger className="w-40 bg-midnight border-white/10 text-white">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent className="bg-charcoal border-white/10">
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-36 bg-midnight border-white/10 text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-charcoal border-white/10">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Employee Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 skeleton rounded-lg" />
            ))}
          </div>
        ) : employees.length === 0 ? (
          <Card className="bg-charcoal border-white/5">
            <CardContent className="p-8 text-center text-gray-500">
              No employees found
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {employees.map((employee) => (
              <Card key={employee.id} className="bg-charcoal border-white/5 hover:border-white/10 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center">
                      {employee.profile_photo_url ? (
                        <img src={employee.profile_photo_url} alt="" className="w-14 h-14 rounded-full object-cover" />
                      ) : (
                        <span className="text-gold font-serif text-xl">
                          {employee.first_name?.[0]}{employee.last_name?.[0]}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">
                        {employee.first_name} {employee.last_name}
                      </h3>
                      <p className="text-sm text-gray-400 truncate">{employee.job_title || 'No title'}</p>
                      <Badge className={`mt-2 ${statusColors[employee.status] || statusColors.active}`}>
                        {employee.status?.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-2 text-sm">
                    {employee.department && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <Building2 className="h-4 w-4" />
                        <span className="truncate">{employee.department}</span>
                      </div>
                    )}
                    {employee.email && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <Mail className="h-4 w-4" />
                        <span className="truncate">{employee.email}</span>
                      </div>
                    )}
                    {employee.phone && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <Phone className="h-4 w-4" />
                        <span>{employee.phone}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                    <Badge className={employmentTypeColors[employee.employment_type] || employmentTypeColors.full_time}>
                      {employee.employment_type?.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs text-gray-500">{employee.employee_code}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

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
      </div>
    </DashboardLayout>
  );
};

export default EmployeesPage;
