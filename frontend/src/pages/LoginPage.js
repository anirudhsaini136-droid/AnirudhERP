import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { AlertCircle, Loader2 } from 'lucide-react';

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
      
      // Redirect based on role
      const from = location.state?.from?.pathname;
      if (from) {
        navigate(from);
      } else {
        switch (user.role) {
          case 'super_admin':
            navigate('/super-admin');
            break;
          case 'business_owner':
            navigate('/dashboard');
            break;
          case 'hr_admin':
            navigate('/hr');
            break;
          case 'finance_admin':
            navigate('/finance');
            break;
          case 'inventory_admin':
            navigate('/inventory');
            break;
          case 'staff':
            navigate('/staff');
            break;
          default:
            navigate('/dashboard');
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-obsidian">
      {/* Left side - Hero Image */}
      <div className="hidden lg:flex lg:w-2/5 relative">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1560531008-ab8f46be8c4f?crop=entropy&cs=srgb&fm=jpg&q=85')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-gold-900/80 to-obsidian/90" />
        <div className="relative z-10 flex flex-col justify-end p-12">
          <h1 className="font-serif text-4xl text-white mb-4">NexusERP</h1>
          <p className="text-gray-300 text-lg">
            Enterprise Resource Planning for Modern Businesses
          </p>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="font-serif text-3xl text-gold">NexusERP</h1>
          </div>

          <div className="bg-charcoal rounded-lg border border-white/5 p-8">
            <div className="text-center mb-8">
              <h2 className="font-serif text-2xl text-white mb-2">Welcome Back</h2>
              <p className="text-gray-400">Sign in to your account</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-md flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-error flex-shrink-0" />
                <p className="text-error text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-midnight border-white/10 text-white placeholder:text-gray-500 focus:border-gold focus:ring-gold"
                  data-testid="login-email-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-midnight border-white/10 text-white placeholder:text-gray-500 focus:border-gold focus:ring-gold"
                  data-testid="login-password-input"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gold hover:bg-gold-600 text-black font-medium"
                data-testid="login-submit-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-white/10 text-center">
              <p className="text-gray-500 text-sm">
                Demo Credentials: admin@nexuserp.com / Admin123!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
