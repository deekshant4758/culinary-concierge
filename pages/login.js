// pages/login.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Login() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (email, password) => {
    setForm({ email, password });
  };

  return (
    <>
      <Head>
        <title>Login | Culinary Concierge</title>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@700;800&family=Inter:wght@400;500;600&display=swap" />
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-primary to-blue-800 flex items-center justify-center p-4">
        <div className="w-full max-w-5xl grid md:grid-cols-2 gap-0 rounded-2xl overflow-hidden shadow-2xl">
          {/* Left panel */}
          <div className="hidden md:flex flex-col justify-between p-12 bg-primary-container text-white">
            <div>
              <h1 className="text-3xl font-headline font-black mb-3">Culinary Concierge</h1>
              <p className="text-blue-200 text-sm leading-relaxed">
                Enterprise food ordering platform with role-based access control and regional data isolation.
              </p>
            </div>
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-300">Quick Login</p>
              {[
                { label: 'Nick Fury (Admin)', email: 'nick@shield.com', pass: 'admin123', badge: 'Global Admin' },
                { label: 'Captain Marvel (Manager - India)', email: 'marvel@shield.com', pass: 'manager123', badge: 'India Manager' },
                { label: 'Captain America (Manager - America)', email: 'america@shield.com', pass: 'manager123', badge: 'America Manager' },
                { label: 'Thanos (Member - India)', email: 'thanos@shield.com', pass: 'member123', badge: 'India Member' },
                { label: 'Travis (Member - America)', email: 'travis@shield.com', pass: 'member123', badge: 'America Member' },
              ].map(u => (
                <button key={u.email} onClick={() => quickLogin(u.email, u.pass)}
                  className="w-full text-left p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all group">
                  <p className="text-sm font-bold group-hover:text-white">{u.label}</p>
                  <p className="text-xs text-blue-300">{u.email}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Right panel */}
          <div className="bg-white p-10 flex flex-col justify-center">
            <div className="mb-8">
              <h2 className="text-2xl font-headline font-bold text-on-surface">Welcome back</h2>
              <p className="text-on-surface-variant text-sm mt-1">Sign in to your account</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-outline mb-1.5 block">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  className="input" placeholder="you@shield.com" required />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-outline mb-1.5 block">Password</label>
                <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  className="input" placeholder="••••••••" required />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-container active:scale-95 transition-all disabled:opacity-60 mt-2">
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 p-4 bg-surface-container-low rounded-xl md:hidden">
              <p className="text-xs text-outline mb-3 font-bold">Quick Login:</p>
              <div className="grid grid-cols-1 gap-2">
                {[
                  ['nick@shield.com', 'admin123', 'Admin'],
                  ['marvel@shield.com', 'manager123', 'Manager India'],
                  ['thanos@shield.com', 'member123', 'Member India'],
                ].map(([email, pass, label]) => (
                  <button key={email} onClick={() => quickLogin(email, pass)}
                    className="text-xs text-left px-3 py-2 bg-white rounded-lg border border-outline-variant/30 hover:border-primary text-primary font-medium">
                    {label}: {email}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export async function getServerSideProps({ req }) {
  const { parse } = require('cookie');
  const { verifyToken } = require('../lib/auth');
  const cookies = parse(req.headers.cookie || '');
  if (cookies.auth_token && verifyToken(cookies.auth_token)) {
    return { redirect: { destination: '/dashboard', permanent: false } };
  }
  return { props: {} };
}
