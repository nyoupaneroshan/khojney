'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { X } from 'lucide-react'; // Import the close icon

interface UserProfile {
  id: string;
  full_name: string | null;
  role: string;
}

interface UserEditFormProps {
  user: UserProfile;
  onSave: (userId: string, updates: { full_name: string, role: string }) => void;
  onCancel: () => void;
}

export default function UserEditForm({ user, onSave, onCancel }: UserEditFormProps) {
  const [fullName, setFullName] = useState(user.full_name || '');
  const [newRole, setNewRole] = useState(user.role);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const updates = {
      full_name: fullName,
      role: newRole,
    };

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (updateError) {
        setError(updateError.message);
      } else {
        onSave(user.id, updates);
      }
    } catch (err: any) {
      console.error("Error updating user:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    // The div with fixed inset-0 bg-black/60 z-40 is handled by the parent component (ManageUsersPage)
    // and is separate from this component. This component is the sliding panel.
    <div className="p-8"> {/* Adjusted padding for modal content */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Edit User: {user.full_name || user.id}</h2>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-gray-700"
          aria-label="Close"
        >
          <X size={24} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-4 py-2 mt-1 text-white bg-gray-700 border border-gray-600 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            disabled={loading}
          />
        </div>
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-300 mb-1">User Role</label>
          <select
            id="role"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className="w-full px-4 py-2 mt-1 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            disabled={loading}
          >
            <option value="user">User</option>
            <option value="premium_user">Premium User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {error && <p className="text-red-400 text-sm mt-4 text-center">{error}</p>}
        <div className="flex justify-end gap-4 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 font-bold text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 font-bold text-white bg-cyan-600 rounded-md hover:bg-cyan-500 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}