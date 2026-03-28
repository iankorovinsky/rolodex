'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { AuthUser } from '@rolodex/types';
import { getCurrentUser } from '@/lib/rolodex/api';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  refreshUser: async () => {},
  setUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<AuthUser | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;

    const syncCurrentUser = async (
      supabaseUser: SupabaseUser,
      options?: { preserveExistingUser?: boolean }
    ) => {
      const fallbackUser = mapSupabaseUser(supabaseUser);
      const preserveExistingUser = options?.preserveExistingUser ?? false;

      if (!isMounted) {
        return;
      }

      setUser((currentUser) => {
        if (
          preserveExistingUser &&
          currentUser &&
          currentUser.id === fallbackUser.id &&
          currentUser.name?.trim() &&
          currentUser.avatarId
        ) {
          return currentUser;
        }

        return fallbackUser;
      });
      setLoading(false);

      try {
        const profile = await getCurrentUser();
        if (isMounted) {
          setUser(profile);
        }
      } catch {
        if (isMounted) {
          setUser((currentUser) => currentUser ?? fallbackUser);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const clearUser = () => {
      if (!isMounted) {
        return;
      }

      setUser(null);
      setLoading(false);
    };

    const bootstrapSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          await syncCurrentUser(session.user, {
            preserveExistingUser: true,
          });
          return;
        }
      } catch {
        if (!isMounted) {
          return;
        }

        setLoading(false);
      }
    };

    void bootstrapSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        clearUser();
        return;
      }

      if (
        event === 'TOKEN_REFRESHED' &&
        userRef.current &&
        userRef.current.id === session.user.id
      ) {
        void syncCurrentUser(session.user, {
          preserveExistingUser: true,
        });
        return;
      }

      if (session?.user) {
        void syncCurrentUser(session.user, {
          preserveExistingUser: true,
        });
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
  };

  const refreshUser = async () => {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      setUser(null);
      return;
    }

    try {
      const profile = await getCurrentUser();
      setUser(profile);
    } catch {
      setUser(mapSupabaseUser(session.user));
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

function mapSupabaseUser(supabaseUser: SupabaseUser): AuthUser {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || null,
    avatarId: null,
  };
}
