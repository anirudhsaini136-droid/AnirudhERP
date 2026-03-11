import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertTriangle, Phone, Mail } from 'lucide-react';
import { Button } from '../components/ui/button';

const SubscriptionExpiredPage = () => {
  const { user, business, logout } = useAuth();

  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="bg-charcoal rounded-lg border border-white/5 p-8">
          <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="h-8 w-8 text-error" />
          </div>
          
          <h1 className="font-serif text-2xl text-white mb-4">
            Subscription Expired
          </h1>
          
          <p className="text-gray-400 mb-8">
            Your NexusERP subscription has expired. Please contact your administrator 
            or our support team to renew your access.
          </p>

          {business && (
            <div className="bg-midnight rounded-lg p-4 mb-6 text-left">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Contact Information</h3>
              
              {business.email && (
                <div className="flex items-center gap-2 text-gray-300 mb-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span>{business.email}</span>
                </div>
              )}
              
              {business.phone && (
                <div className="flex items-center gap-2 text-gray-300">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span>{business.phone}</span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={logout}
              variant="outline"
              className="w-full border-white/10 text-white hover:bg-white/5"
              data-testid="logout-btn"
            >
              Sign Out
            </Button>
          </div>

          <p className="text-gray-500 text-sm mt-6">
            Need help? Email support@nexuserp.com
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionExpiredPage;
