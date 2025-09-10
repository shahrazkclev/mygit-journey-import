import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

interface AuthUser {
  email: string;
  authenticated: boolean;
  id: string;
  role?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session);
        setSession(session);
        
        if (session?.user) {
          console.log('🔍 User session found:', session.user.email);
          // Defer Supabase calls with setTimeout to avoid deadlocks
          setTimeout(async () => {
            try {
              console.log('🔍 Fetching profile for user:', session.user.id);
              // Fetch user profile for role information
              const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .single();
              
              console.log('👤 Profile data:', profile);
              
              const authUser = {
                id: session.user.id,
                email: session.user.email || '',
                authenticated: true,
                role: profile?.role || 'user'
              };
              
              console.log('✅ Setting auth user:', authUser);
              setUser(authUser);

              // If this is cgdora4@gmail.com and we have existing demo data, migrate it
              if (session.user.email === 'cgdora4@gmail.com' && event === 'SIGNED_IN') {
                console.log('🔄 Admin user signed in, running migration...');
                try {
                  const { error: migrationError } = await supabase.rpc('migrate_demo_data_to_admin', {
                    admin_user_id: session.user.id
                  });
                  
                  if (migrationError) {
                    console.error('❌ Migration error:', migrationError);
                  } else {
                    console.log('✅ Demo data migrated successfully');
                  }
                } catch (error) {
                  console.error('❌ Migration failed:', error);
                }
              }
            } catch (error) {
              console.error('Error fetching user profile:', error);
              setUser({
                id: session.user.id,
                email: session.user.email || '',
                authenticated: true,
                role: 'user'
              });
            }
          }, 0);
        } else {
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Session will be handled by the auth state change listener
        console.log('Found existing session');
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        return false;
      }

      return !!data.user;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    login,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};