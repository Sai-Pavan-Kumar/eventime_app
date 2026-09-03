import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '../lib/supabase';
import type { AuthUser, ProfileRow } from '../types';

WebBrowser.maybeCompleteAuthSession();

// Configure Google Sign-in with the Web Client ID (audience for idToken verification)
const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  '1022633538864-iddbj1tkq06mab3h9rtg2t1pvicvi3j4.apps.googleusercontent.com';

let GoogleSigninModule: any = null;
let statusCodesEnum: any = null;

try {
  const gSignin = require('@react-native-google-signin/google-signin');
  GoogleSigninModule = gSignin.GoogleSignin;
  statusCodesEnum = gSignin.statusCodes;
} catch (e) {
  // Gracefully bypassed when running in environments without native modules
}

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
  signInWithGithub: () => Promise<{ error: Error | null }>;
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

  // Configure Google Sign-in safely after native bridge is established
  useEffect(() => {
    try {
      if (GoogleSigninModule && typeof GoogleSigninModule.configure === 'function') {
        GoogleSigninModule.configure({
          webClientId: GOOGLE_WEB_CLIENT_ID,
          scopes: ['profile', 'email'],
        });
      }
    } catch (e) {
      console.warn('[AuthContext] Could not configure Google Sign-In:', e);
    }
  }, []);

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
            const { data: sData } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (sData?.session?.user) {
              setUser(sData.session.user);
              setSession(sData.session);
              await fetchProfile(sData.session.user.id, sData.session.user);
            }
          } else if (code) {
            const { data: exData } = await supabase.auth.exchangeCodeForSession(code);
            if (exData?.session?.user) {
              setUser(exData.session.user);
              setSession(exData.session);
              await fetchProfile(exData.session.user.id, exData.session.user);
            }
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
      // 1. Try native Google Sign-In SDK (in-app bottom sheet) if available
      if (GoogleSigninModule && typeof GoogleSigninModule.signIn === 'function') {
        try {
          await GoogleSigninModule.hasPlayServices({ showPlayServicesUpdateDialog: true });
          const response = await GoogleSigninModule.signIn();
          const idToken = (response as any)?.data?.idToken || (response as any)?.idToken;

          if (idToken) {
            const { data, error } = await supabase.auth.signInWithIdToken({
              provider: 'google',
              token: idToken,
            });

            if (error) throw error;
            if (data?.session?.user) {
              setUser(data.session.user);
              setSession(data.session);
              await fetchProfile(data.session.user.id, data.session.user);
            }
            return { error: null };
          }
        } catch (nativeErr: any) {
          if (statusCodesEnum && nativeErr.code === statusCodesEnum.SIGN_IN_CANCELLED) {
            // User intentionally closed/cancelled the Google prompt
            return { error: null };
          }
          console.warn('[AuthContext] Native Google sign-in failed (Code: ' + nativeErr?.code + '):', nativeErr?.message);
          if (nativeErr?.code === '10' || nativeErr?.code === 10) {
            console.error(
              '[AuthContext] DEVELOPER_ERROR (code 10): Ensure SHA-1 fingerprint (5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25) and package com.eventime.app are registered in Firebase / Google Cloud Console, and Web Client ID matches.'
            );
          }
        }
      }

      // 2. Fallback to WebBrowser OAuth if native SDK is not available (e.g. Expo Go)
      const redirectUrl = makeRedirectUri({
        scheme: 'eventime',
        path: 'auth',
      });
      console.log('[AuthContext] Google OAuth redirectUrl:', redirectUrl);
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

  const signInWithGithub = async (): Promise<{ error: Error | null }> => {
    try {
      const redirectUrl = makeRedirectUri({
        scheme: 'eventime',
        path: 'auth',
      });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
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
      console.error('[AuthContext] GitHub sign-in failed:', err);
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
      if (GoogleSigninModule && typeof GoogleSigninModule.signOut === 'function') {
        try {
          await GoogleSigninModule.signOut();
        } catch (_) {}
      }
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setProfile(null);
    } catch (err) {
      console.error('[AuthContext] Sign out error:', err);
    }
  };

  const ADMIN_EMAILS = [
    'eventime.admin@gmail.com',
    ...(process.env.EXPO_PUBLIC_ADMIN_EMAIL ? [process.env.EXPO_PUBLIC_ADMIN_EMAIL.toLowerCase().trim()] : []),
    ...(process.env.NEXT_PUBLIC_ADMIN_EMAIL ? [process.env.NEXT_PUBLIC_ADMIN_EMAIL.toLowerCase().trim()] : []),
  ];

  const userEmail = user?.email?.toLowerCase().trim();
  const isAdmin = Boolean(
    profile?.user_type === 'admin' ||
    profile?.role === 'admin' ||
    (userEmail && ADMIN_EMAILS.includes(userEmail))
  );
  const isOnboarded = Boolean(profile?.is_onboarded || isAdmin);

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
        signInWithGithub,
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
