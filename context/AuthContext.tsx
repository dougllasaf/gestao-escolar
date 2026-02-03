'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'

type AuthContextType = {
    session: Session | null
    user: User | null
    role: string | null
    loading: boolean
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    role: null,
    loading: true,
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    // Read cached role from localStorage IMMEDIATELY (synchronous - makes F5 instant)
    const getCachedRole = (): string | null => {
        if (typeof window === 'undefined') return null
        return localStorage.getItem('cached_role')
    }

    const [session, setSession] = useState<Session | null>(null)
    const [user, setUser] = useState<User | null>(null)
    const [role, setRole] = useState<string | null>(getCachedRole()) // Start with cached role
    const [loading, setLoading] = useState(!getCachedRole()) // If we have cached role, don't show loading

    useEffect(() => {
        // Helper to fetch role with timeout
        const fetchRoleWithTimeout = async (userId: string): Promise<string | null> => {
            const timeoutPromise = new Promise<null>((resolve) => {
                setTimeout(() => resolve(null), 5000)
            })

            const fetchPromise = (async () => {
                try {
                    const { data } = await supabase
                        .from('user_profiles')
                        .select('role')
                        .eq('id', userId)
                        .single() as any
                    return data?.role ?? null
                } catch {
                    return null
                }
            })()

            return Promise.race([fetchPromise, timeoutPromise])
        }

        // Save role to cache
        const cacheRole = (r: string | null) => {
            if (r) {
                localStorage.setItem('cached_role', r)
            } else {
                localStorage.removeItem('cached_role')
            }
        }

        // Initial fetch (verifies cached role in background)
        const fetchSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession()
                setSession(session)
                setUser(session?.user ?? null)

                if (session?.user) {
                    const fetchedRole = await fetchRoleWithTimeout(session.user.id)
                    // CRITICAL: Only update role if we got a valid response
                    // If server timesout, KEEP the existing cached role
                    if (fetchedRole) {
                        setRole(fetchedRole)
                        cacheRole(fetchedRole)
                    }
                    // If fetchedRole is null but we have cached role, keep it!
                    // Don't clear the cache on timeout
                } else {
                    // No session means user is truly logged out
                    setRole(null)
                    cacheRole(null)
                }
            } catch (err) {
                console.error('Session fetch error:', err)
                // On error, keep existing role - don't clear it
            }
            setLoading(false)
        }

        // Safety Timeout
        const timer = setTimeout(() => {
            setLoading(false)
        }, 5000)

        fetchSession()

        // Subscription
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
            setSession(session)
            setUser(session?.user ?? null)

            if (session?.user) {
                const fetchedRole = await fetchRoleWithTimeout(session.user.id)
                // Only update if we got a valid role, otherwise keep cached
                if (fetchedRole) {
                    setRole(fetchedRole)
                    cacheRole(fetchedRole)
                }
            } else {
                // Only clear role if there's truly no session
                setRole(null)
                cacheRole(null)
            }
            setLoading(false)
        })

        return () => {
            subscription.unsubscribe()
            clearTimeout(timer)
        }
    }, [])

    return (
        <AuthContext.Provider value={{ session, user, role, loading }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
