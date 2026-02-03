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
    const [session, setSession] = useState<Session | null>(null)
    const [user, setUser] = useState<User | null>(null)
    const [role, setRole] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Helper to fetch role with timeout
        const fetchRoleWithTimeout = async (userId: string): Promise<string | null> => {
            const timeoutPromise = new Promise<null>((resolve) => {
                setTimeout(() => resolve(null), 5000) // 5s timeout
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

        // Initial fetch
        const fetchSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession()
                setSession(session)
                setUser(session?.user ?? null)

                if (session?.user) {
                    const fetchedRole = await fetchRoleWithTimeout(session.user.id)
                    setRole(fetchedRole)
                }
            } catch (err) {
                console.error('Session fetch error:', err)
            }
            setLoading(false)
        }

        // Safety Timeout (5s max load) to prevent White Screen of Death
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
                setRole(fetchedRole)
            } else {
                setRole(null)
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
            {loading ? <div className="h-screen w-screen flex items-center justify-center bg-gray-50 text-blue-600 font-bold">Carregando...</div> : children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
