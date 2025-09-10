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
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session);
        setSession(session);
        
        if (session?.user) {
          console.log('🔍 User session found:', session.user.email);
          // Fetch user profile for role information
          setTimeout(async () => {
            try {
              console.log('🔍 Fetching profile for user:', session.user.id);
              const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .single();

              const authUser: AuthUser = {
                id: session.user.id,
                email: session.user.email || '',
                authenticated: true,
                role: profile?.role || 'user'
              };
              
              console.log('✅ Setting auth user:', authUser);
              setUser(authUser);
            } catch (error) {
              console.error('Error fetching user profile:', error);
              setUser({
                id: session.user.id,
                email: session.user.email || '',
                authenticated: true,
                role: 'user'
              });
            }
          }, 100);
        } else {
          console.log('🔍 No user session');
          setUser(null);
        }
        
        setIsLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        console.log('🔍 Initial session found:', session.user.email);
        setTimeout(async () => {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', session.user.id)
              .single();

            const authUser: AuthUser = {
              id: session.user.id,
              email: session.user.email || '',
              authenticated: true,
              role: profile?.role || 'user'
            };
            
            console.log('✅ Setting initial auth user:', authUser);
            setUser(authUser);
          } catch (error) {
            console.error('Error fetching initial user profile:', error);
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              authenticated: true,
              role: 'user'
            });
          }
        }, 100);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('Login error:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
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