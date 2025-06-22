// src/components/auth/advanced-auth.tsx

'use client';

import React, { useState } from 'react';
// --- THE FIX: We now import the REAL supabase client ---
import { supabase } from '@/lib/supabaseClient'; 
import { User as UserIcon, Lock, AtSign, CheckCircle2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';


// Google Icon SVG Component
const GoogleIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.022,35.131,44,30.023,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
    </svg>
);


export default function AdvancedAuth() {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage({ text: error.message, type: 'error' });
    } else {
      setMessage({ text: 'Login successful!', type: 'success' });
      // THE FIX: No longer reloading the page.
      // The AuthProvider/useAuth hook should detect the new session
      // and automatically re-render the UI to show the main content.
    }
    setLoading(false);
  };

  const handleSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    if (error) {
      setMessage({ text: error.message, type: 'error' });
    } else {
      setMessage({ text: 'Signup successful! Please check your email to confirm.', type: 'success' });
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
        setMessage({ text: error.message, type: 'error' });
        setLoading(false);
    }
  };

  const formVariants = {
    hidden: { opacity: 0, x: 50, height: 0 },
    visible: { opacity: 1, x: 0, height: 'auto' },
    exit: { opacity: 0, x: -50, height: 0 }
  };
  const inputIconClasses = "absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500";

  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-gray-800/50 rounded-2xl shadow-2xl border border-gray-700/60 backdrop-blur-sm">
      <div>
        <h1 className="text-3xl font-bold text-center text-white">{authMode === 'login' ? 'Welcome Back!' : 'Create an Account'}</h1>
        <p className="text-center text-gray-400 mt-2">{authMode === 'login' ? 'Log in to continue your journey.' : 'Join the community of learners.'}</p>
      </div>
      <div className="flex bg-gray-900/50 p-1 rounded-full border border-gray-700">
        <button onClick={() => setAuthMode('login')} className={`w-1/2 py-2.5 rounded-full text-sm font-semibold transition-colors ${authMode === 'login' ? 'bg-cyan-600 text-white' : 'text-gray-300 hover:bg-gray-700/50'}`}>Login</button>
        <button onClick={() => setAuthMode('signup')} className={`w-1/2 py-2.5 rounded-full text-sm font-semibold transition-colors ${authMode === 'signup' ? 'bg-cyan-600 text-white' : 'text-gray-300 hover:bg-gray-700/50'}`}>Sign Up</button>
      </div>
      <AnimatePresence mode="wait">
        {authMode === 'login' ? (
          <motion.form key="login" variants={formVariants} initial="hidden" animate="visible" exit="exit" transition={{ duration: 0.4 }} onSubmit={handleLogin} className="space-y-4">
            <div className="relative"><AtSign className={inputIconClasses} /><input id="email-login" type="email" placeholder="you@example.com" value={email} required onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-3 py-2 text-white bg-gray-700/50 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" /></div>
            <div className="relative"><Lock className={inputIconClasses} /><input id="password-login" type="password" placeholder="••••••••" value={password} required onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-3 py-2 text-white bg-gray-700/50 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" /></div>
            <button type="submit" className="w-full px-4 py-3 font-bold text-white bg-cyan-600 rounded-md hover:bg-cyan-500 disabled:bg-gray-600 shadow-lg" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
          </motion.form>
        ) : (
          <motion.form key="signup" variants={formVariants} initial="hidden" animate="visible" exit="exit" transition={{ duration: 0.4 }} onSubmit={handleSignup} className="space-y-4">
            <div className="relative"><UserIcon className={inputIconClasses} /><input id="fullName-signup" type="text" placeholder="Full Name" value={fullName} required onChange={(e) => setFullName(e.target.value)} className="w-full pl-10 pr-3 py-2 text-white bg-gray-700/50 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" /></div>
            <div className="relative"><AtSign className={inputIconClasses} /><input id="email-signup" type="email" placeholder="you@example.com" value={email} required onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-3 py-2 text-white bg-gray-700/50 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" /></div>
            <div className="relative"><Lock className={inputIconClasses} /><input id="password-signup" type="password" placeholder="Create a password" value={password} required onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-3 py-2 text-white bg-gray-700/50 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" /></div>
            <button type="submit" className="w-full px-4 py-3 font-bold text-white bg-green-600 rounded-md hover:bg-green-500 disabled:bg-gray-600 shadow-lg" disabled={loading}>{loading ? 'Creating Account...' : 'Sign Up'}</button>
          </motion.form>
        )}
      </AnimatePresence>
      <div className="relative flex py-3 items-center"><div className="flex-grow border-t border-gray-600"></div><span className="flex-shrink mx-4 text-gray-400 text-xs uppercase">Or</span><div className="flex-grow border-t border-gray-600"></div></div>
      <button onClick={handleGoogleLogin} disabled={loading} className="w-full flex items-center justify-center gap-3 px-4 py-2.5 font-semibold text-white bg-gray-700/50 rounded-md border border-gray-600 hover:bg-gray-700 transition-colors disabled:opacity-50"><GoogleIcon />Sign in with Google</button>
      {message && <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mt-4 flex items-center justify-center gap-2 text-center text-sm ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>{message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}{message.text}</motion.p>}
    </div>
  );
}
