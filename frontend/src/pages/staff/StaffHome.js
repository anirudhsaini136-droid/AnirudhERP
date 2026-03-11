import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Clock,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  Timer,
  ArrowRightCircle
} from 'lucide-react';
import { toast } from 'sonner';

const StaffHome = () => {
  const { api, user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clockLoading, setClockLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await api.get('/staff');
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClock = async (action) => {
    setClockLoading(true);
    try {
      const response = await api.post(`/staff/clock?action=${action}`);
      toast.success(response.data.message);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to ${action.replace('_', ' ')}`);
    } finally {
      setClockLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="h-8 w-48 skeleton rounded" />
          <div className="h-48 skeleton rounded-lg" />
        </div>
      </DashboardLayout>
    );
  }

  const { employee, today_status, is_clocked_in, leave_balance, stats } = data || {};

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20 md:pb-0" data-testid="staff-home">
        {/* Header */}
        <div>
          <h1 className="font-serif text-3xl text-white">
            Welcome, {user?.first_name || 'Staff'}!
          </h1>
          <p className="text-gray-400 mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Clock In/Out Card */}
        <Card className="bg-charcoal border-white/5">
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              {is_clocked_in ? (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-success/10 rounded-full">
                  <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                  <span className="text-success font-medium">Currently Working</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-500/10 rounded-full">
                  <div className="w-2 h-2 bg-gray-500 rounded-full" />
                  <span className="text-gray-400">Not Clocked In</span>
                </div>
              )}
            </div>

            {today_status && (
              <p className="text-gray-400 mb-4">
                Clocked in at {new Date(today_status.clock_in_time).toLocaleTimeString()}
                {today_status.clock_out_time && (
                  <> • Clocked out at {new Date(today_status.clock_out_time).toLocaleTimeString()}</>
                )}
              </p>
            )}

            <Button
              size="lg"
              onClick={() => handleClock(is_clocked_in ? 'clock_out' : 'clock_in')}
              disabled={clockLoading}
              className={`min-w-[200px] ${
                is_clocked_in 
                  ? 'bg-error hover:bg-error/80 text-white' 
                  : 'bg-gold hover:bg-gold-600 text-black'
              }`}
              data-testid="clock-btn"
            >
              {clockLoading ? (
                <Timer className="h-5 w-5 animate-spin" />
              ) : is_clocked_in ? (
                <>
                  <XCircle className="h-5 w-5 mr-2" />
                  Clock Out
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Clock In
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-charcoal border-white/5">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-serif font-bold text-gold">
                {stats?.days_worked_this_month || 0}
              </p>
              <p className="text-sm text-gray-400">Days Worked</p>
              <p className="text-xs text-gray-500">This month</p>
            </CardContent>
          </Card>
          
          <Card className="bg-charcoal border-white/5">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-serif font-bold text-info">
                {stats?.annual_leave_remaining || 0}
              </p>
              <p className="text-sm text-gray-400">Annual Leave</p>
              <p className="text-xs text-gray-500">Days remaining</p>
            </CardContent>
          </Card>
          
          <Card className="bg-charcoal border-white/5">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-serif font-bold text-warning">
                {stats?.sick_leave_remaining || 0}
              </p>
              <p className="text-sm text-gray-400">Sick Leave</p>
              <p className="text-xs text-gray-500">Days remaining</p>
            </CardContent>
          </Card>
          
          <Card className="bg-charcoal border-white/5">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-serif font-bold text-gray-400">
                {stats?.pending_leave_requests || 0}
              </p>
              <p className="text-sm text-gray-400">Pending</p>
              <p className="text-xs text-gray-500">Leave requests</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-charcoal border-white/5 hover:border-gold/30 transition-colors cursor-pointer" onClick={() => window.location.href = '/staff/payslips'}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-gold/10">
                <DollarSign className="h-6 w-6 text-gold" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-medium">My Payslips</h3>
                <p className="text-sm text-gray-400">View and download</p>
              </div>
              <ArrowRightCircle className="h-5 w-5 text-gray-500" />
            </CardContent>
          </Card>
          
          <Card className="bg-charcoal border-white/5 hover:border-info/30 transition-colors cursor-pointer" onClick={() => window.location.href = '/staff/leave'}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-info/10">
                <Calendar className="h-6 w-6 text-info" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-medium">Request Leave</h3>
                <p className="text-sm text-gray-400">Apply for time off</p>
              </div>
              <ArrowRightCircle className="h-5 w-5 text-gray-500" />
            </CardContent>
          </Card>
          
          <Card className="bg-charcoal border-white/5 hover:border-success/30 transition-colors cursor-pointer" onClick={() => window.location.href = '/staff/attendance'}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-success/10">
                <Clock className="h-6 w-6 text-success" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-medium">My Attendance</h3>
                <p className="text-sm text-gray-400">View history</p>
              </div>
              <ArrowRightCircle className="h-5 w-5 text-gray-500" />
            </CardContent>
          </Card>
        </div>

        {/* Employee Info */}
        {employee && (
          <Card className="bg-charcoal border-white/5">
            <CardHeader>
              <CardTitle className="text-white">My Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Employee Code</p>
                  <p className="text-white font-medium">{employee.employee_code}</p>
                </div>
                <div>
                  <p className="text-gray-500">Department</p>
                  <p className="text-white">{employee.department || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Job Title</p>
                  <p className="text-white">{employee.job_title || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Employment Type</p>
                  <Badge className="bg-info/15 text-info">{employee.employment_type?.replace('_', ' ')}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StaffHome;
