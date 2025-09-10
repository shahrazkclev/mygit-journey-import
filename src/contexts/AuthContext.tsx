import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

// Function to create initial demo data for admin user
const createInitialDemoData = async (userId: string) => {
  try {
    console.log('Creating initial demo data for user:', userId);
    
    // Create sample products
    const { error: productsError } = await supabase
      .from('products')
      .insert([
        {
          user_id: userId,
          name: 'Premium Email Marketing Course',
          description: 'Learn advanced email marketing strategies',
          price: 99.99,
          image_url: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=400',
          category: 'Education'
        },
        {
          user_id: userId,
          name: 'Email Template Pack',
          description: 'Professional email templates for all occasions',
          price: 49.99,
          image_url: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=400',
          category: 'Templates'
        },
        {
          user_id: userId,
          name: 'Marketing Automation Tool',
          description: 'Automate your email campaigns with ease',
          price: 199.99,
          image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400',
          category: 'Software'
        }
      ]);

    if (productsError) {
      console.error('Error creating products:', productsError);
    } else {
      console.log('✅ Created sample products');
    }

    // Create sample contacts
    const { error: contactsError } = await supabase
      .from('contacts')
      .insert([
        {
          user_id: userId,
          email: 'john.doe@example.com',
          first_name: 'John',
          last_name: 'Doe',
          status: 'subscribed',
          tags: ['vip', 'newsletter']
        },
        {
          user_id: userId,
          email: 'jane.smith@example.com',
          first_name: 'Jane',
          last_name: 'Smith',
          status: 'subscribed',
          tags: ['customer', 'promotions']
        },
        {
          user_id: userId,
          email: 'mike.johnson@example.com',
          first_name: 'Mike',
          last_name: 'Johnson',
          status: 'subscribed',
          tags: ['lead', 'interested']
        },
        {
          user_id: userId,
          email: 'sarah.wilson@example.com',
          first_name: 'Sarah',
          last_name: 'Wilson',
          status: 'subscribed',
          tags: ['customer', 'vip']
        },
        {
          user_id: userId,
          email: 'alex.brown@example.com',
          first_name: 'Alex',
          last_name: 'Brown',
          status: 'subscribed',
          tags: ['newsletter', 'new']
        }
      ]);

    if (contactsError) {
      console.error('Error creating contacts:', contactsError);
    } else {
      console.log('✅ Created sample contacts');
    }

    // Create sample email list
    const { data: emailList, error: listError } = await supabase
      .from('email_lists')
      .insert({
        user_id: userId,
        name: 'Main Newsletter',
        description: 'Primary newsletter for all subscribers',
        list_type: 'manual'
      })
      .select()
      .single();

    if (listError) {
      console.error('Error creating email list:', listError);
    } else {
      console.log('✅ Created sample email list');
    }

    // Create user settings
    const { error: settingsError } = await supabase
      .from('user_settings')
      .insert({
        user_id: userId,
        webhook_url: 'https://hook.eu1.make.com/your-webhook-url',
        email_signature: 'Best regards,\nYour Team',
        company_name: 'Your Company',
        reply_to_email: 'noreply@yourcompany.com'
      });

    if (settingsError) {
      console.error('Error creating user settings:', settingsError);
    } else {
      console.log('✅ Created user settings');
    }

    console.log('✅ Initial demo data created successfully');
  } catch (error) {
    console.error('Error creating initial demo data:', error);
  }
};

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

              // If this is cgdora4@gmail.com, ensure we have demo data
              if (session.user.email === 'cgdora4@gmail.com' && event === 'SIGNED_IN') {
                console.log('🔄 Admin user signed in, running migration...');
                try {
                  // First try to migrate existing demo data
                  const { error: migrationError } = await supabase.rpc('migrate_demo_data_to_admin', {
                    admin_user_id: session.user.id
                  });
                  
                  if (migrationError) {
                    console.error('❌ Migration error:', migrationError);
                  } else {
                    console.log('✅ Demo data migrated successfully');
                  }

                  // Check if we have any data, if not, create some demo data
                  const { data: products, error: productsError } = await supabase
                    .from('products')
                    .select('id')
                    .eq('user_id', session.user.id)
                    .limit(1);

                  const { data: contacts, error: contactsError } = await supabase
                    .from('contacts')
                    .select('id')
                    .eq('user_id', session.user.id)
                    .limit(1);

                  if ((!products || products.length === 0) && (!contacts || contacts.length === 0)) {
                    console.log('No data found, creating initial demo data...');
                    await createInitialDemoData(session.user.id);
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