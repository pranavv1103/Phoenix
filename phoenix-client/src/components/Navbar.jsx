import { Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { useDarkMode } from '../hooks/useDarkMode';

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  const handleLogout = () => {
    logout();
  };

  return (
    <nav className="dark-mode-nav bg-gradient-to-r from-cyan-600 via-blue-600 via-violet-600 to-fuchsia-600 text-white shadow-2xl sticky top-0 z-50 backdrop-blur-sm bg-opacity-95">
      <div className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <Link 
            to="/" 
            className="text-3xl font-bold tracking-tight hover:scale-105 transform transition-all duration-300 flex items-center gap-3"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-yellow-400 rounded-full blur-md opacity-60 animate-pulse"></div>
              <svg className="w-10 h-10 relative z-10" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11.603 7.963a.75.75 0 00-.977.572l-.5 2.5a.75.75 0 001.449.294l.5-2.5a.75.75 0 00-.472-.866zm-3.21 3.572l.5-2.5a.75.75 0 111.449.294l-.5 2.5a.75.75 0 11-1.449-.294z"/>
                <path fillRule="evenodd" d="M5.5 3.25a.75.75 0 01.75-.75h7.5a.75.75 0 01.75.75v.5c0 .414.336.75.75.75h1a.75.75 0 01.53 1.28l-6.5 6.5a.75.75 0 01-1.06 0l-6.5-6.5a.75.75 0 01.53-1.28h1a.75.75 0 00.75-.75v-.5z" clipRule="evenodd"/>
              </svg>
            </div>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-yellow-200 to-white">Phoenix Blog</span>
          </Link>
          <div className="flex items-center gap-6">
            {isAuthenticated ? (
              <>
                <Link 
                  to="/create" 
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl font-semibold"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Post
                </Link>
                {user?.role === 'ADMIN' && (
                  <Link 
                    to="/admin" 
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl font-semibold"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    Admin
                  </Link>
                )}
                <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-gradient-to-r from-white/20 to-white/10 backdrop-blur-md border border-white/30">
                  <div className="w-9 h-9 bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 rounded-full flex items-center justify-center text-sm font-bold shadow-lg ring-2 ring-white/50">
                    {user?.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <span className="text-sm font-semibold">Welcome, {user?.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl font-semibold"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all duration-300 font-semibold border border-white/30 hover:border-white/50"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-white to-gray-100 text-transparent bg-clip-text bg-white hover:from-yellow-200 hover:to-white transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl font-bold border-2 border-white"
                  style={{WebkitTextFillColor: 'transparent', backgroundClip: 'text'}}
                >
                  <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text" style={{WebkitTextFillColor: 'transparent'}}>Get Started</span>
                </Link>
              </>
            )}
            <button
              onClick={toggleDarkMode}
              className="px-3 py-1 rounded-full border border-gray-300 dark:border-gray-600 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {isDarkMode ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
