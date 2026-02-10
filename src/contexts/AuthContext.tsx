import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'admin' | 'supervisor' | 'guard';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: UserRole | null;
  guardId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [guardId, setGuardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch user role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (roleError) {
        console.error('Error fetching user role:', roleError);
      } else if (roleData) {
        setUserRole(roleData.role as UserRole);
      }

      // Fetch guard id - only for users with guard role
      const { data: guardData, error: guardError } = await supabase
        .from('guards')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (guardError) {
        console.error('Error fetching guard data:', guardError);
      } else if (guardData) {
        setGuardId(guardData.id);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchUserDataAsync = async (userId: string) => {
      try {
        // Fetch user role
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (!isMounted) return;
        
        if (roleError) {
          console.error('Error fetching user role:', roleError);
        } else if (roleData) {
          setUserRole(roleData.role as UserRole);
        }

        // Fetch guard id - only for users with guard role
        const { data: guardData, error: guardError } = await supabase
          .from('guards')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (!isMounted) return;
        
        if (guardError) {
          console.error('Error fetching guard data:', guardError);
        } else if (guardData) {
          setGuardId(guardData.id);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    // Set up auth state listener for ONGOING changes (does NOT control loading)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Use setTimeout to avoid Supabase auth deadlock
          setTimeout(() => {
            if (isMounted) {
              fetchUserDataAsync(session.user.id);
            }
          }, 0);
        } else {
          setUserRole(null);
          setGuardId(null);
        }
      }
    );

    // INITIAL load - fetch session and role BEFORE setting loading to false
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch role BEFORE setting loading false
        if (session?.user) {
          await fetchUserDataAsync(session.user.id);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error ? new Error(error.message) : null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
    setGuardId(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userRole,
        guardId,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
