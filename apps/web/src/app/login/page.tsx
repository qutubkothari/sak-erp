'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../lib/api-client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiClient.login({ email, password });

      if (response.success) {
        // Redirect to dashboard on successful login
        router.push('/dashboard');
      } else {
        setError(response.error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FAF9F6' }}>
      <div className="w-full max-w-md p-8 rounded-lg shadow-lg" style={{ backgroundColor: 'white' }}>
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#8B6F47' }}>
            SAK Solutions
          </h1>
          <p className="text-sm" style={{ color: '#6F4E37' }}>
            Manufacturing ERP System
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: '#6F4E37' }}>
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:border-opacity-80 transition-colors"
              style={{ 
                borderColor: '#E8DCC4',
                color: '#6F4E37'
              }}
              placeholder="your.email@company.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: '#6F4E37' }}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:border-opacity-80 transition-colors"
              style={{ 
                borderColor: '#E8DCC4',
                color: '#6F4E37'
              }}
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: '#FEE', color: '#C33' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#8B6F47' }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Additional Links */}
        <div className="mt-6 text-center space-y-2">
          <Link 
            href="/forgot-password" 
            className="block text-sm hover:underline"
            style={{ color: '#6F4E37' }}
          >
            Forgot your password?
          </Link>
          <div className="text-sm" style={{ color: '#6F4E37' }}>
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-semibold hover:underline" style={{ color: '#8B6F47' }}>
              Register here
            </Link>
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-8 pt-6 border-t text-center" style={{ borderColor: '#E8DCC4' }}>
          <Link 
            href="/" 
            className="text-sm hover:underline"
            style={{ color: '#6F4E37' }}
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
