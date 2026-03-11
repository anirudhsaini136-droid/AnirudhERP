import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Users,
  Clock,
  Calendar,
  DollarSign,
  UserCheck,
  UserX,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';

const StatCard = ({ title, value, subtitle, icon: Icon, color = 'gold' }) => (
  <Card className="bg-charcoal border-white/5">
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <p className={`text-3xl font-serif font-bold text-${color}`}>{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg bg-${color}/10`}>
          <Icon className={`h-6 w-6 text-${color}`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

const HRDashboard = () => {
  const { api } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await api.get('/hr');
        setData(response.data);
      } catch (error) {
        console.error('Failed to fetch HR dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [api]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="h-8 w-48 skeleton rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 skeleton rounded-lg" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const { stats, departments, recent_leaves } = data || {};

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20 md:pb-0" data-testid="hr-dashboard">
        {/* Header */}
        <div>
          <h1 className="font-serif text-3xl text-white">HR Dashboard</h1>
          <p className="text-gray-400 mt-1">Manage your workforce</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Employees"
            value={stats?.total_employees || 0}
            icon={Users}
            color="info"
          />
          <StatCard
            title="Present Today"
            value={stats?.present_today || 0}
            icon={UserCheck}
            color="success"
          />
          <StatCard
            title="On Leave Today"
            value={stats?.on_leave_today || 0}
            icon={Calendar}
            color="warning"
          />
          <StatCard
            title="Absent Today"
            value={stats?.absent_today || 0}
            icon={UserX}
            color="error"
          />
        </div>

        {/* Second Row Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-charcoal border-white/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Pending Leave Requests</p>
                  <p className="text-3xl font-serif font-bold text-warning mt-1">
                    {stats?.pending_leave_requests || 0}
                  </p>
                </div>
                {stats?.pending_leave_requests > 5 && (
                  <Badge className="bg-error/15 text-error">Urgent</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-charcoal border-white/5">
            <CardContent className="p-6">
              <div>
                <p className="text-sm text-gray-400">Attendance Rate</p>
                <p className="text-3xl font-serif font-bold text-success mt-1">
                  {stats?.attendance_rate || 0}%
                </p>
                <p className="text-xs text-gray-500 mt-1">This month</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-charcoal border-white/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Payroll Status</p>
                  <p className="text-lg font-medium text-white mt-1 capitalize">
                    {stats?.payroll_status?.replace('_', ' ') || 'Not Started'}
                  </p>
                </div>
                <Badge className={
                  stats?.payroll_status === 'completed' ? 'bg-success/15 text-success' :
                  stats?.payroll_status === 'processing' ? 'bg-warning/15 text-warning' :
                  'bg-gray-500/15 text-gray-400'
                }>
                  {stats?.payroll_status || 'Pending'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Departments & Recent Leave Requests */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Departments */}
          <Card className="bg-charcoal border-white/5">
            <CardHeader>
              <CardTitle className="text-white">Department Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {departments && departments.length > 0 ? (
                <div className="space-y-4">
                  {departments.map((dept, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-white">{dept.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-midnight rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gold rounded-full"
                            style={{ width: `${Math.min(100, (dept.count / (stats?.total_employees || 1)) * 100)}%` }}
                          />
                        </div>
                        <span className="text-gray-400 text-sm w-8">{dept.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  No departments set up
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Leave Requests */}
          <Card className="bg-charcoal border-white/5">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-400" />
                Pending Leave Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recent_leaves && recent_leaves.length > 0 ? (
                <div className="space-y-3">
                  {recent_leaves.map((leave) => (
                    <div key={leave.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                      <div>
                        <p className="text-white">{leave.employee_name}</p>
                        <p className="text-sm text-gray-500">
                          {leave.leave_type} • {leave.days_count} days
                        </p>
                      </div>
                      <Badge className="bg-warning/15 text-warning">Pending</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  No pending requests
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default HRDashboard;
