import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Users, 
  Calendar, 
  BarChart2, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Home,
  Shield,
  Bell
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import Footer from '../../../components/Footer';

interface AdminLayoutProps {
  children: React.ReactNode;
  currentPage: 'dashboard' | 'users' | 'games' | 'reports' | 'settings';
}

export default function AdminLayout({ children, currentPage }: AdminLayoutProps) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: Home, current: currentPage === 'dashboard' },
    { name: 'Users', href: '/admin/users', icon: Users, current: currentPage === 'users' },
    { name: 'Games', href: '/admin/games', icon: Calendar, current: currentPage === 'games' },
    { name: 'Reports', href: '/admin/reports', icon: BarChart2, current: currentPage === 'reports' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Sidebar for desktop */}
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
        <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white">
          <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
            <div className="flex flex-shrink-0 items-center px-4">
              <div className="flex items-center space-x-2">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <span className="font-bold text-xl text-gray-900">Admin Panel</span>
              </div>
            </div>
            <nav className="mt-8 flex-1 space-y-1 px-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-4 py-3 text-sm font-medium rounded-md ${
                    item.current
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon
                    className={`mr-3 h-5 w-5 flex-shrink-0 ${
                      item.current ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-600'
                    }`}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex flex-shrink-0 border-t border-gray-200 p-4">
            <div className="flex items-center justify-between w-full">
              <Link
                to="/dashboard"
                className="group flex items-center text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                <Home className="mr-3 h-5 w-5 text-gray-500 group-hover:text-gray-600" />
                Main App
              </Link>
              <button
                onClick={handleSignOut}
                className="group flex items-center text-sm font-medium text-red-600 hover:text-red-700"
              >
                <LogOut className="mr-1 h-5 w-5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile header */}
      <div className="md:pl-64 flex flex-col flex-1">
        <div className="sticky top-0 z-10 bg-white md:hidden border-b border-gray-200">
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center">
              <div className="bg-blue-600 p-1.5 rounded-lg mr-2">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-lg text-gray-900">Admin Panel</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                type="button"
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" aria-hidden="true" />
                ) : (
                  <Menu className="h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {isMobileMenuOpen && (
            <div className="border-b border-gray-200 bg-white px-2 py-3">
              <div className="space-y-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`block px-3 py-2 rounded-md text-base font-medium ${
                      item.current
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className="flex items-center">
                      <item.icon
                        className={`mr-3 h-5 w-5 ${
                          item.current ? 'text-blue-600' : 'text-gray-500'
                        }`}
                        aria-hidden="true"
                      />
                      {item.name}
                    </div>
                  </Link>
                ))}
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <Link
                    to="/dashboard"
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className="flex items-center">
                      <Home className="mr-3 h-5 w-5 text-gray-500" />
                      Main App
                    </div>
                  </Link>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleSignOut();
                    }}
                    className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <div className="flex items-center">
                      <LogOut className="mr-3 h-5 w-5" />
                      Logout
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main content */}
        <main className="flex-1">
          {children}
        </main>
        
        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}