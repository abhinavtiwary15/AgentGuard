import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Lock, User as UserIcon, Mail, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { authApi } from '../api/auth';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fillDemoAdmin = () => {
    setUsername('admin');
    setPassword('AdminGuard2026!');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await authApi.login(username, password);
        navigate(from, { replace: true });
      } else {
        await authApi.register(username, email, password, 'analyst');
        setSuccessMsg('Account registered successfully! Logging you in...');
        setTimeout(async () => {
          await authApi.login(username, password);
          navigate(from, { replace: true });
        }, 1000);
      }
    } catch (err: any) {
      console.error('Authentication failed:', err);
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F7F4] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-md mb-3">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-[#1F2933]">AgentGuard</h1>
          <p className="text-sm text-[#8A8480] mt-1">Autonomous AI Security Operations Center</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-[#D3D1C7] rounded-xl shadow-sm p-8">
          {/* Mode Switcher */}
          <div className="flex border-b border-[#E8E6DF] mb-6">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); }}
              className={`flex-1 pb-3 text-sm font-semibold transition-colors ${
                mode === 'login'
                  ? 'border-b-2 border-orange-600 text-orange-600'
                  : 'text-[#8A8480] hover:text-[#1F2933]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(null); }}
              className={`flex-1 pb-3 text-sm font-semibold transition-colors ${
                mode === 'register'
                  ? 'border-b-2 border-orange-600 text-orange-600'
                  : 'text-[#8A8480] hover:text-[#1F2933]'
              }`}
            >
              Register Analyst
            </button>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2.5 text-xs text-emerald-700">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#4B5563] uppercase tracking-wider mb-1.5">
                Username or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8A8480]">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="analyst or admin"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-[#D3D1C7] rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-[#1F2933]"
                />
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-[#4B5563] uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8A8480]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="analyst@enterprise.com"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-[#D3D1C7] rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-[#1F2933]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#4B5563] uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8A8480]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-[#D3D1C7] rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-[#1F2933]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg text-sm transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Authenticate Session' : 'Create Analyst Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credential Helper */}
          {mode === 'login' && (
            <div className="mt-6 pt-5 border-t border-[#E8E6DF]">
              <div className="flex items-center justify-between text-xs text-[#8A8480] mb-2">
                <span>Default Admin Credentials:</span>
                <button
                  type="button"
                  onClick={fillDemoAdmin}
                  className="text-orange-600 hover:text-orange-700 font-semibold"
                >
                  Quick Fill
                </button>
              </div>
              <div className="bg-[#F8F7F4] rounded p-2.5 text-[11px] font-mono text-[#4B5563] flex justify-between">
                <span>user: admin</span>
                <span>pass: AdminGuard2026!</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-[#8A8480] mt-6">
          Enterprise Security Note: In production deployments, this JWT flow integrates with Microsoft Entra ID (Azure AD) SSO.
        </p>
      </div>
    </div>
  );
};
