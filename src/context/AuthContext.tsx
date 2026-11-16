/**
 * Centralized Authentication Context & Provider
 * Manages a single onAuthStateChanged listener and resolves user profile
 * to eliminate auth state races and redundant listeners across the application.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { authGateway, userProfileRepository, shelterRepository } from '../app/container.js';
import type { AuthSessionUser, UserProfile } from '../domain/entities.js';

export interface AuthContextValue {
  user: AuthSessionUser | null;
  profile: UserProfile | null;
  role: 'adopter' | 'shelter' | 'admin' | string | null;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthSessionUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [resolvedRole, setResolvedRole] = useState<'adopter' | 'shelter' | 'admin' | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (uid: string) => {
    try {
      console.log(`[Auth] Fetching user profile for uid: ${uid}`);
      const p = await userProfileRepository.getProfile(uid);
      console.log(
        `[Auth] Profile fetched: docExists=${!!p}, role=${p?.role || 'none'}`
      );
      setProfile(p);
      setError(null);
    } catch (err: any) {
      console.warn('[Auth] Error fetching user profile:', err);
      setError('Could not load user profile details.');
    }
  }, []);

  useEffect(() => {
    console.log('[Auth] Subscribing to single onAuthStateChanged listener');
    const unsubscribe = authGateway.onAuthStateChanged(async (currentUser) => {
      console.log(
        `[Auth] onAuthStateChanged resolved: uid=${currentUser?.uid || 'null'}, emailVerified=${!!currentUser?.emailVerified}`
      );
      setUser(currentUser);

      if (currentUser) {
        // Resolve role once across database hierarchy: admin > shelter > adopter
        let detectedRole: 'adopter' | 'shelter' | 'admin' = 'adopter';
        try {
          const isAdmin = await shelterRepository.checkIsAdmin(currentUser.uid);
          if (isAdmin) {
            detectedRole = 'admin';
          } else {
            const shelterDoc = await shelterRepository.getShelterById(currentUser.uid);
            if (shelterDoc) {
              detectedRole = 'shelter';
            }
          }
        } catch (e) {
          console.warn('[Auth] Role lookup fallback to adopter:', e);
        }
        setResolvedRole(detectedRole);
        console.log(`[Auth] Role resolved once: ${detectedRole}`);

        await fetchProfile(currentUser.uid);
      } else {
        setProfile(null);
        setResolvedRole(null);
      }

      setLoading(false);
    });

    return () => {
      console.log('[Auth] Cleaning up onAuthStateChanged listener');
      unsubscribe();
    };
  }, [fetchProfile]);

  const refreshProfile = useCallback(async () => {
    if (user?.uid) {
      await fetchProfile(user.uid);
    }
  }, [user?.uid, fetchProfile]);

  const logout = useCallback(async () => {
    console.log('[Auth] Logging out user');
    try {
      await authGateway.signOut();
      setUser(null);
      setProfile(null);
    } catch (err: any) {
      console.error('[Auth] Logout error:', err);
      throw err;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      role:
        resolvedRole === 'admin' || resolvedRole === 'shelter'
          ? resolvedRole
          : profile?.role === 'DONOR'
          ? 'adopter'
          : profile?.role || resolvedRole || 'adopter',
      loading,
      error,
      refreshProfile,
      logout,
    }),
    [user, profile, resolvedRole, loading, error, refreshProfile, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
