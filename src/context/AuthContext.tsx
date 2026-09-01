import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';
import type { AuthUser, ProfileRow } from '../types';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  session: Session | null;
  user: AuthUser | null;
  profile: ProfileRow | null;
  isAdmin: boolean;
  isOnboarded: boolean;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: Error | null; unconfirmed?: boolean }>;
  sendPasswordReset: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProfile = useCallback(async (userId: string, currentUser?: AuthUser | null) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('[AuthContext] Error fetching profile:', error);
      }

      if (data) {
        setProfile(data);
      } else if (currentUser) {
        // Initial profile creation if row is missing
        const newProfile = {
          id: userId,
          full_name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || '',
          avatar_url: currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || '',
          email: currentUser.email || '',
          username: currentUser.email ? currentUser.email.split('@')[0] : null,
          is_onboarded: false,
        };

        const { data: createdProfile, error: insertError } = await supabase
          .from('profiles')
          .upsert(newProfile)
          .select()
          .single();

        if (!insertError && createdProfile) {
          setProfile(createdProfile);
        }
      }
    } catch (err) {
      console.error('[AuthContext] Unexpected error in fetchProfile:', err);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id, user);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    // 1. Check initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      const currentUser = initialSession?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        fetchProfile(currentUser.id, currentUser).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    // 2. Listen to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      const currentUser = currentSession?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        fetchProfile(currentUser.id, currentUser).finally(() => setIsLoading(false));
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Handle deep link OAuth redirects
  useEffect(() => {
    const handleUrl = async (url: string) => {
      if (!url) return;
      try {
        const parsed = Linking.parse(url);
        // Look for tokens in hash or query
        if (url.includes('#') || url.includes('?')) {
          const fragment = url.includes('#') ? url.split('#')[1] : url.split('?')[1];
          const params = new URLSearchParams(fragment);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          const code = params.get('code');

          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
          } else if (code) {
            await supabase.auth.exchangeCodeForSession(code);
          }
        }
      } catch (e) {
        console.error('[AuthContext] Deep link handle error:', e);
      }
    };

    const sub = Linking.addEventListener('url', ({ url }) => {
      handleUrl(url);
    });

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    return () => {
      sub.remove();
    };
  }, []);

  const signInWithGoogle = async (): Promise<{ error: Error | null }> => {
    try {
      const redirectUrl = Linking.createURL('auth');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

        if (result.type === 'success' && result.url) {
          const resUrl = result.url;
          
          // Parse both query parameters and hash fragment
          const parsed = Linking.parse(resUrl);
          const params: Record<string, string> = {};

          if (parsed.queryParams) {
            Object.entries(parsed.queryParams).forEach(([k, v]) => {
              if (v) params[k] = Array.isArray(v) ? v[0] : String(v);
            });
          }

          if (resUrl.includes('#')) {
            const hashPart = resUrl.split('#')[1];
            const hashParams = new URLSearchParams(hashPart);
            hashParams.forEach((v, k) => {
              params[k] = v;
            });
          }

          const accessToken = params.access_token;
          const refreshToken = params.refresh_token;
          const code = params.code;

          if (accessToken && refreshToken) {
            const { data: sData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (sessionError) throw sessionError;
            if (sData?.session?.user) {
              setUser(sData.session.user);
              setSession(sData.session);
              await fetchProfile(sData.session.user.id, sData.session.user);
            }
          } else if (code) {
            const { data: exData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) throw exchangeError;
            if (exData?.session?.user) {
              setUser(exData.session.user);
              setSession(exData.session);
              await fetchProfile(exData.session.user.id, exData.session.user);
            }
          }
        }
      }
      return { error: null };
    } catch (err: any) {
      console.error('[AuthContext] Google sign-in failed:', err);
      return { error: err };
    }
  };

  const signInWithEmail = async (email: string, password: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signUpWithEmail = async (
    email: string,
    password: string
  ): Promise<{ error: Error | null; unconfirmed?: boolean }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      if (data?.user?.identities?.length === 0) {
        return { error: null, unconfirmed: true };
      }
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const sendPasswordReset = async (email: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setProfile(null);
    } catch (err) {
      console.error('[AuthContext] Sign out error:', err);
    }
  };

  const isAdmin = Boolean(profile?.user_type === 'admin' || profile?.role === 'admin');
  const isOnboarded = Boolean(profile?.is_onboarded);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        isAdmin,
        isOnboarded,
        isLoading,
        refreshProfile,
        signOut,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        sendPasswordReset,
      }}
    >
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
