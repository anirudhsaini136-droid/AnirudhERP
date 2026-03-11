import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Settings, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function PlatformSettingsPage() {
  const { api } = useAuth();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/super-admin/settings').then(r => setSettings(r.data.settings || {})).catch(() => {}).finally(() => setLoading(false));
  }, [api]);

  const updateSetting = async (key, value) => {
    try {
      await api.put('/super-admin/settings', { setting_key: key, setting_value: value });
      setSettings(s => ({ ...s, [key]: value }));
      toast.success('Setting updated');
    } catch (e) { toast.error('Failed to update'); }
  };

  const settingFields = [
    { key: 'trial_days', label: 'Trial Duration (days)', type: 'number' },
    { key: 'starter_price_monthly', label: 'Starter Monthly Price (INR)', type: 'number' },
    { key: 'starter_price_yearly', label: 'Starter Yearly Price (INR)', type: 'number' },
    { key: 'growth_price_monthly', label: 'Growth Monthly Price (INR)', type: 'number' },
    { key: 'growth_price_yearly', label: 'Growth Yearly Price (INR)', type: 'number' },
    { key: 'enterprise_price_monthly', label: 'Enterprise Monthly Price (INR)', type: 'number' },
    { key: 'enterprise_price_yearly', label: 'Enterprise Yearly Price (INR)', type: 'number' },
  ];

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl" data-testid="platform-settings-page">
        <div>
          <h1 className="font-display text-2xl text-white">Platform Settings</h1>
          <p className="text-sm text-gray-500 font-sans mt-1">Configure global platform parameters</p>
        </div>

        <div className="glass-card rounded-2xl p-6 space-y-5">
          {settingFields.map(f => (
            <div key={f.key} className="flex items-end gap-3">
              <div className="flex-1">
                <Label className="text-gray-400 text-xs">{f.label}</Label>
                <Input
                  type={f.type} className="input-premium mt-1"
                  value={settings[f.key] || ''} onChange={e => setSettings(s => ({ ...s, [f.key]: e.target.value }))}
                  data-testid={`setting-${f.key}`}
                />
              </div>
              <button onClick={() => updateSetting(f.key, settings[f.key] || '')} className="btn-premium btn-secondary text-sm h-[42px]" data-testid={`save-${f.key}`}>
                <Save size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
