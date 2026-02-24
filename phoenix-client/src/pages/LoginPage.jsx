import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import client from '../api/client';
import useAuthStore from '../store/authStore';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await client.post('/api/auth/login', { email, password });
      const { token, email: userEmail, name, role } = response.data.data;
      login(token, { email: userEmail, name, role });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 bg-gradient-to-br from-cyan-100 via-blue-100 via-violet-100 to-fuchsia-100 py-12 px-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-violet-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-fuchsia-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>
      
      <div className="max-w-xl w-full animate-fade-in relative z-10">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-gradient-to-br from-cyan-600 via-blue-600 to-violet-600 rounded-3xl mb-4 shadow-2xl ring-4 ring-white">
            <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </div>
          <h2 className="text-5xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-violet-600 bg-clip-text text-transparent mb-2">Welcome Back</h2>
          <p className="text-gray-700 mt-2 text-lg font-medium">Sign in to continue your journey</p>
        </div>
        
        <div className="bg-white/80 backdrop-blur-xl p-12 rounded-3xl shadow-2xl border border-white/50 pointer-events-auto">
          {error && (
            <div className="bg-gradient-to-r from-red-50 to-rose-50 border-l-4 border-rose-500 text-rose-700 p-4 rounded-xl mb-6 animate-shake shadow-sm">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-7">
            <div className="transform transition-all duration-300 hover:scale-[1.01]">
              <label className="block text-gray-700 mb-2 font-medium">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-4 border-2 border-gray-200 rounded-xl bg-white text-gray-900 caret-gray-900 pointer-events-auto focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-300"
                  placeholder="you@example.com"
                  autoComplete="email"
                  spellCheck={false}
                  required
                />
              </div>
            </div>
            <div className="transform transition-all duration-300 hover:scale-[1.01]">
              <label className="block text-gray-700 mb-2 font-medium">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-4 border-2 border-gray-200 rounded-xl bg-white text-gray-900 caret-gray-900 pointer-events-auto focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 transition-all duration-300"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>
              <div className="mt-2 text-right">
                <Link to="/forgot-password" className="text-sm text-violet-600 hover:text-violet-700 font-semibold hover:underline transition-all duration-300">
                  Forgot Password?
                </Link>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-600 via-blue-600 to-violet-600 text-white py-4 rounded-xl hover:from-cyan-700 hover:via-blue-700 hover:to-violet-700 disabled:from-gray-400 disabled:to-gray-500 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-gray-700">
              Don't have an account?{' '}
              <Link to="/register" className="text-violet-600 hover:text-violet-700 font-bold hover:underline transition-all duration-300">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
