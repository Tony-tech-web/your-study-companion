import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, metadata: {
    full_name: string;
    matric_number: string;
    phone_number: string;
  }) => Promise<{ error: Error | null }>;
  signIn: (identifier: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const initializationStarted = useRef(false);

  useEffect(() => {
    if (initializationStarted.current) return;
    initializationStarted.current = true;

    let mounted = true;
    
    // Detect if we are currently handling an OAuth redirect
    // We check both the hash and search params
    const hash = window.location.hash;
    const search = window.location.search;
    const isHandlingRedirect = 
      hash.includes('access_token') || 
      hash.includes('refresh_token') || 
      search.includes('code=') ||
      search.includes('type=recovery') ||
      search.includes('type=signup');

    if (isHandlingRedirect) {
      console.info("%c[Auth] Redirect detected, holding loading state...", "color: #fbbf24; font-weight: bold;");
    }

    // Safety timeout: if we are stuck "loading" during a redirect for more than 7 seconds, force stop.
    const timeoutId = isHandlingRedirect ? setTimeout(() => {
      if (mounted && loading) {
        console.warn("[Auth] Redirect processing timed out. Stopping loader.");
        setLoading(false);
      }
    }, 7000) : null;

    async function initializeAuth() {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("[Auth] getSession error:", error);
        }

        if (mounted) {
          if (initialSession) {
            console.info("%c[Auth] Initial session stable:", "color: #10b981;", initialSession.user.email);
            setSession(initialSession);
            setUser(initialSession.user);
            setLoading(false);
          } else if (!isHandlingRedirect) {
            console.info("[Auth] No session and no redirect. Ready.");
            setLoading(false);
          } else {
            console.info("[Auth] No initial session, but redirect is in progress. Waiting for listener...");
          }
        }
      } catch (err) {
        console.error("[Auth] Critical init error:", err);
        if (mounted) setLoading(false);
      }
    }

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;

        console.info(`%c[Auth] State Change: ${event}`, "color: #3b82f6; font-weight: bold;", currentSession?.user?.email || "No User");

        // Update state
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        // Logic for when to stop loading
        if (event === 'SIGNED_IN') {
          setLoading(false);
          if (window.location.pathname.includes('/auth')) {
            console.info("[Auth] Navigation: Moving to dashboard.");
            navigate('/dashboard', { replace: true });
          }
        } else if (event === 'SIGNED_OUT') {
          // If we are NOT in a redirect, SIGNED_OUT means we're done checking.
          if (!isHandlingRedirect) {
            setLoading(false);
          }
        } else if (event === 'INITIAL_SESSION') {
          // If no session found on initial load, only stop loading if no redirect is pending.
          if (!currentSession && !isHandlingRedirect) {
            setLoading(false);
          }
        } else if (event === 'USER_UPDATED') {
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [navigate]);

  const signUp = async (
    email: string, 
    password: string, 
    metadata: { full_name: string; matric_number: string; phone_number: string }
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: metadata.full_name,
          matric_number: metadata.matric_number,
          phone_number: metadata.phone_number,
        },
      },
    });
    
    if (data.user) {
      setUser(data.user);
      setSession(data.session);
    }
    
    return { error: error as Error | null };
  };

  const signIn = async (identifier: string, password: string) => {
    // Sanitize identifier - remove any characters that could be used for injection
    const sanitizedIdentifier = identifier.trim().replace(/['"\\;,()]/g, '');
    
    // Validate identifier format
    if (!sanitizedIdentifier || sanitizedIdentifier.length > 255) {
      return { error: new Error('Invalid identifier format.') };
    }
    
    let email = sanitizedIdentifier;
    
    // If not an email, look up by username or matric number using safe separate queries
    if (!sanitizedIdentifier.includes('@')) {
      // Use separate .eq() queries instead of .or() with string interpolation
      // This prevents SQL/filter injection attacks
      
      // First try email_username
      const { data: usernameProfiles, error: usernameError } = await supabase
        .from('profiles')
        .select('email')
        .eq('email_username', sanitizedIdentifier)
        .limit(1);
      
      if (usernameError) {
        console.error('[Auth] Username lookup error:', usernameError);
        return { error: new Error('Authentication error. Please try again.') };
      }
      
      if (usernameProfiles && usernameProfiles.length > 0) {
        email = usernameProfiles[0].email;
      } else {
        // Try matric_number
        const { data: matricProfiles, error: matricError } = await supabase
          .from('profiles')
          .select('email')
          .eq('matric_number', sanitizedIdentifier)
          .limit(1);
        
        if (matricError) {
          console.error('[Auth] Matric lookup error:', matricError);
          return { error: new Error('Authentication error. Please try again.') };
        }
        
        if (!matricProfiles || matricProfiles.length === 0) {
          return { error: new Error('User not found. Please check your credentials.') };
        }
        
        email = matricProfiles[0].email;
      }
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (data.user) {
      setUser(data.user);
      setSession(data.session);
    }
    
    return { error: error as Error | null };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    navigate('/auth');
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signInWithGoogle, signOut }}>
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
