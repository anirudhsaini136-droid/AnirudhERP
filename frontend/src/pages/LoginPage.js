import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { AlertCircle, Loader2, ArrowRight, Shield, Zap, Globe } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      const from = location.state?.from?.pathname;
      if (from) {
        navigate(from);
      } else {
        switch (user.role) {
          case 'super_admin': navigate('/super-admin'); break;
          case 'business_owner': navigate('/dashboard'); break;
          case 'hr_admin': navigate('/hr'); break;
          case 'finance_admin': navigate('/finance'); break;
          case 'staff': navigate('/staff'); break;
          default: navigate('/dashboard');
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-obsidian relative overflow-hidden">
      {/* Ambient Background */}
      <div className="absolute inset-0 bg-gradient-mesh pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-radial from-gold-500/5 via-transparent to-transparent pointer-events-none" />
      
      {/* Left Panel - Hero */}
      <div className="hidden lg:flex lg:w-3/5 relative">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2000&q=80"
            alt="Modern Architecture"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-obsidian via-obsidian/95 to-obsidian/70" />
          <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-transparent to-transparent" />
        </div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div>
            <h1 className="font-display text-4xl text-white tracking-tight">
              Nexus<span className="text-gold">ERP</span>
            </h1>
          </div>
          
          {/* Hero Text */}
          <div className="max-w-xl">
            <h2 className="font-display text-5xl text-white leading-tight mb-6">
              Enterprise Excellence,<br />
              <span className="text-gold italic">Simplified.</span>
            </h2>
            <p className="text-gray-400 text-lg leading-relaxed mb-10">
              The next generation of business management. Streamline HR, Finance, 
              and Operations with India's most sophisticated ERP platform.
            </p>
            
            {/* Feature Pills */}
            <div className="flex flex-wrap gap-3">
              {[
                { icon: Shield, text: 'Bank-Grade Security' },
                { icon: Zap, text: 'Real-time Analytics' },
                { icon: Globe, text: 'Multi-Branch Support' },
              ].map((feature, idx) => (
                <div 
                  key={idx}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm"
                >
                  <feature.icon className="w-4 h-4 text-gold" strokeWidth={1.5} />
                  <span className="text-sm text-gray-300">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Stats */}
          <div className="flex gap-12">
            {[
              { value: '₹500Cr+', label: 'Managed Monthly' },
              { value: '10,000+', label: 'Active Users' },
              { value: '99.9%', label: 'Uptime SLA' },
            ].map((stat, idx) => (
              <div key={idx}>
                <p className="text-3xl font-display text-white">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-10">
            <h1 className="font-display text-3xl text-white">
              Nexus<span className="text-gold">ERP</span>
            </h1>
          </div>

          {/* Login Card */}
          <div className="glass-card rounded-3xl p-8 lg:p-10 animate-fade-in">
            <div className="text-center mb-10">
              <h2 className="font-display text-2xl text-white mb-2">Welcome Back</h2>
              <p className="text-gray-500">Sign in to continue to your dashboard</p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-rose/10 border border-rose/20 flex items-center gap-3 animate-scale-in">
                <AlertCircle className="h-5 w-5 text-rose flex-shrink-0" />
                <p className="text-rose-light text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-400 pl-1">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input-premium h-14 text-base"
                  data-testid="login-email-input"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-400 pl-1">
                  Password
                </label>
                <Input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input-premium h-14 text-base"
                  data-testid="login-password-input"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="btn-premium btn-primary w-full h-14 text-base rounded-xl"
                data-testid="login-submit-btn"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 text-xs text-gray-600 bg-abyss">Demo Access</span>
              </div>
            </div>

            {/* Demo Credentials */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Super Admin</p>
                  <p className="text-sm text-gray-300 font-mono">admin@nexuserp.com</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 mb-1">Password</p>
                  <p className="text-sm text-gray-300 font-mono">Admin123!</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-gray-600 text-xs mt-8">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
