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
        // Initial fetch
        const fetchSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            setSession(session)
            setUser(session?.user ?? null)

            if (session?.user) {
                const { data } = await supabase
                    .from('user_profiles')
                    .select('role')
                    .eq('id', session.user.id)
                    .single() as any
                setRole(data?.role ?? null)
            }
            setLoading(false)
        }

        // Safety Timeout (3s max load) to prevent White Screen of Death
        const timer = setTimeout(() => {
            setLoading(false)
        }, 3000)

        fetchSession()

        // Subscription
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
            setSession(session)
            setUser(session?.user ?? null)

            if (session?.user) {
                const { data } = await supabase
                    .from('user_profiles')
                    .select('role')
                    .eq('id', session.user.id)
                    .single() as any
                setRole(data?.role ?? null)
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
