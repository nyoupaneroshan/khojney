'use client';

import { useEffect, useState, useMemo, useCallback } from 'react'; // Added useMemo, useCallback
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion'; // Added motion, AnimatePresence for animations
import { ArrowLeft, Pencil, Key, Trash2, Search, Users, ShieldCheck, User } from 'lucide-react'; // Replaced Heroicons with Lucide for consistency and modern look
import { AdminLoading, AccessDenied } from '@/app/admin/AdminStates';
import UserEditForm from './UserEditForm';

// --- UPDATED INTERFACE ---
interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  created_at: string;
  last_sign_in_at: string | null; // New field
}

// --- MODERN UI SUB-COMPONENTS ---
const StatCard = ({ icon, title, value, colorClass }: { icon: React.ReactNode, title: string, value: number, colorClass: string }) => (
  <div className="bg-gray-800/50 border border-gray-700/80 rounded-xl p-5">
    <div className="flex items-center gap-4">
      <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>{icon}</div>
      <div>
        <p className="text-sm text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  </div>
);

// --- MAIN PAGE COMPONENT ---
export default function ManageUsersPage() {
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  // --- Handlers for invoking Edge Functions ---
  const handleResetPassword = async (userId: string) => {
    if (!confirm("Are you sure you want to send a password reset link to this user?")) return;

    setLoading(true);
    const { data, error } = await supabase.functions.invoke('admin-reset-password', {
      body: { userId },
    });

    if (error) {
      setNotification({ message: `Failed to send password reset: ${error.message}`, type: 'error' });
    } else {
      setNotification({ message: 'Password reset link sent successfully!', type: 'success' });
    }
    setLoading(false);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("DANGER: Are you sure you want to permanently delete this user? This cannot be undone.")) return;

    setLoading(true);
    const { data, error } = await supabase.functions.invoke('admin-delete-user', {
      body: { userId },
    });

    if (error) {
      setNotification({ message: `Failed to delete user: ${error.message}`, type: 'error' });
    } else {
      setNotification({ message: 'User deleted successfully.', type: 'success' });
      // Remove user from UI instantly
      setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
    }
    setLoading(false);
  };

  const fetchUsers = useCallback(async () => {
    const { data: usersData, error } = await supabase
      .rpc('get_all_users_with_email', { search_term: searchTerm })
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
      setNotification({ message: `Error fetching users: ${error.message}`, type: 'error' });
    } else {
      setUsers(usersData || []);
    }
  }, [searchTerm]); // Re-fetch users when searchTerm changes

  const handleSave = (userId: string, updates: { full_name: string, role: string }) => {
    setUsers(prevUsers => prevUsers.map(user =>
      user.id === userId ? { ...user, ...updates } : user
    ));
    setEditingUser(null);
    setNotification({ message: 'User updated successfully!', type: 'success' });
  };

  const handleCancel = () => setEditingUser(null);

  // --- Auth & Initial Fetch Effect ---
  useEffect(() => {
    const checkAdminAndFetchInitialUsers = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

          if (profileError) throw profileError;

          if (profile && profile.role === 'admin') {
            setIsAuthorized(true);
            await fetchUsers(); // Initial fetch
          } else {
            setIsAuthorized(false);
          }
        } else {
          setIsAuthorized(false);
        }
      } catch (error: any) {
        console.error("Error during admin authorization check:", error);
        setIsAuthorized(false);
        setNotification({ message: `Authorization Error: ${error.message || 'Unknown error'}`, type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    checkAdminAndFetchInitialUsers();
  }, [fetchUsers]); // Dependency added for useCallback

  // --- Debounce search term ---
  useEffect(() => {
    // Only debounce if authorized, otherwise no need to fetch
    if (!isAuthorized) return;

    const handler = setTimeout(() => {
      fetchUsers();
    }, 500); // 500ms delay

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, fetchUsers, isAuthorized]);


  // Effect to clear notification after a few seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);


  // --- Data for Stats Cards ---
  const userStats = useMemo(() => {
    const total = users.length;
    const admins = users.filter(u => u.role === 'admin').length;
    const regularUsers = users.filter(u => u.role === 'user').length;
    const premiumUsers = users.filter(u => u.role === 'premium_user').length;
    return { total, admins, regularUsers, premiumUsers };
  }, [users]);


  if (loading && users.length === 0) return <AdminLoading />; // Show loading only if initial fetch is pending and no users loaded yet
  if (!isAuthorized) return <AccessDenied />;

  return (
    <>
      <main className="w-full p-8 sm:p-12 bg-gray-900 text-white min-h-screen">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10">
            <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
              <ArrowLeft size={16} /> Back to Admin Dashboard
            </Link>
          </div>

          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white">User Management</h1>
            {/* You could add a "New User" button here if you implement that functionality */}
            {/* <button className="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-5 rounded-lg transition-colors">
              <Plus size={18} /> New User
            </button> */}
          </div>

          {/* User Stats */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard icon={<Users size={22} />} title="Total Users" value={userStats.total} colorClass="bg-purple-500/20 text-purple-300" />
            <StatCard icon={<ShieldCheck size={22} />} title="Admins" value={userStats.admins} colorClass="bg-red-500/20 text-red-300" />
            <StatCard icon={<User size={22} />} title="Regular Users" value={userStats.regularUsers} colorClass="bg-blue-500/20 text-blue-300" />
            <StatCard icon={<User size={22} />} title="Premium Users" value={userStats.premiumUsers} colorClass="bg-yellow-500/20 text-yellow-300" />
          </motion.div>


          {/* Search Bar */}
          <div className="relative mb-8">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          {/* --- NOTIFICATION POPUP --- */}
          <AnimatePresence>
            {notification && (
              <motion.div
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                transition={{ duration: 0.3 }}
                className={`fixed top-5 right-5 p-4 rounded-md shadow-lg text-white z-50 ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}
              >
                {notification.message}
              </motion.div>
            )}
          </AnimatePresence>

          {/* --- USERS TABLE --- */}
          <div className="bg-gray-800/60 border border-gray-700/60 rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th className="p-4 text-gray-300">Full Name</th>
                    <th className="p-4 text-gray-300">Email</th>
                    <th className="p-4 text-gray-300">Last Signed In</th>
                    <th className="p-4 text-gray-300">Role</th>
                    <th className="p-4 text-right text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length > 0 ? (
                    users.map(userProfile => (
                      <tr key={userProfile.id} className="border-t border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                        <td className="p-4 font-semibold text-white">{userProfile.full_name || 'N/A'}</td>
                        <td className="p-4 text-gray-400">{userProfile.email || 'N/A'}</td>
                        <td className="p-4 text-gray-400">
                          {userProfile.last_sign_in_at ? new Date(userProfile.last_sign_in_at).toLocaleString() : 'Never'}
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            userProfile.role === 'admin'
                              ? 'bg-red-500/20 text-red-300'
                              : userProfile.role === 'premium_user'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-blue-500/20 text-blue-300'
                          }`}>
                            {userProfile.role}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex gap-3 justify-end items-center">
                            <button
                              onClick={() => setEditingUser(userProfile)}
                              title="Edit User"
                              className="text-cyan-400 hover:text-cyan-300 p-2 rounded-md hover:bg-gray-700 transition-colors"
                            >
                              <Pencil size={18} />
                            </button>
                            <button
                              onClick={() => handleResetPassword(userProfile.id)}
                              title="Send Password Reset Link"
                              className="text-yellow-400 hover:text-yellow-300 p-2 rounded-md hover:bg-gray-700 transition-colors"
                            >
                              <Key size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(userProfile.id)}
                              title="Delete User"
                              className="text-red-500 hover:text-red-400 p-2 rounded-md hover:bg-gray-700 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center text-gray-500 py-16">No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* --- RENDER THE EDIT MODAL --- */}
      <AnimatePresence>
        {editingUser && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              key={editingUser.id}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 h-full w-full max-w-lg bg-gray-900 shadow-2xl z-50 border-l border-gray-800"
            >
              <UserEditForm
                user={editingUser}
                onSave={handleSave}
                onCancel={handleCancel}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}