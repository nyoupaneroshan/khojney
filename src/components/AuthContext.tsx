'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Session } from '@supabase/supabase-js';
import Cookies from 'js-cookie'; // Import js-cookie library

// Define a key for the user role cookie
const USER_ROLE_COOKIE_KEY = 'user_role';

// Define the updated shape of the data provided by the AuthContext
interface AuthContextType {
  session: Session | null;
  loadingAuth: boolean;
  userRole: string | null; // Add userRole to the context type
}

// Create the React Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook to consume the AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// AuthProvider component that will fetch and manage the session
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null); // State for user's role
  const [loadingAuth, setLoadingAuth] = useState(true); // Initially true

  useEffect(() => {
    // Function to handle fetching user profile and setting role/cookie
    const fetchUserProfileAndSetRole = async (currentSession: Session | null) => {
      setSession(currentSession); // Update session state first

      if (currentSession?.user) {
        // User is logged in, fetch their profile to get the role
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', currentSession.user.id)
          .single();

        if (error) {
          console.error("Error fetching user role:", error.message);
          setUserRole(null);
          Cookies.remove(USER_ROLE_COOKIE_KEY); // Remove cookie if error
        } else if (profile) {
          // Profile found, set role state and cookie
          setUserRole(profile.role);
          // Set cookie with expiry matching session expiry or a reasonable default (e.g., 7 days)
          // Supabase session expires_at is a Unix timestamp in seconds, expires_in is seconds from now.
          const expiresInSeconds = currentSession.expires_in;
          const expiresDate = expiresInSeconds ? new Date(Date.now() + expiresInSeconds * 1000) : undefined;

          Cookies.set(USER_ROLE_COOKIE_KEY, profile.role, { expires: expiresDate });
        } else {
          // Profile not found for user (shouldn't happen if profile creation is linked to auth)
          console.warn("User profile not found for ID:", currentSession.user.id);
          setUserRole(null);
          Cookies.remove(USER_ROLE_COOKIE_KEY);
        }
      } else {
        // User is logged out (session is null)
        setUserRole(null);
        Cookies.remove(USER_ROLE_COOKIE_KEY); // Remove cookie on logout
      }
      setLoadingAuth(false); // Authentication status (and role) has been determined
    };

    // 1. Initial session check when the component mounts
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      fetchUserProfileAndSetRole(initialSession);
    });

    // 2. Listen for real-time authentication state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      fetchUserProfileAndSetRole(newSession); // This function handles both login/logout events
    });

    // Cleanup function: Unsubscribe from the auth listener when the component unmounts
    return () => subscription.unsubscribe();
  }, []); // Empty dependency array ensures this effect runs only once after the initial render

  // The value that will be provided to consumers of this context
  const value = { session, loadingAuth, userRole };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};