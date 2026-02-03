'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function DebugPage() {
    const [status, setStatus] = useState<any>({
        session: 'loading',
        user: 'loading',
        profile: 'loading',
        error: null
    })

    useEffect(() => {
        async function runDebug() {
            try {
                // 1. Check Session
                const { data: { session }, error: sessionError } = await supabase.auth.getSession()

                if (sessionError) throw sessionError

                const userStatus = session?.user ? `Logged in as ${session.user.email}` : 'No User'

                let profileData = null
                let profileErrorMsg = null

                // 2. Check Profile
                if (session?.user) {
                    const { data, error } = await supabase
                        .from('user_profiles')
                        .select('*')
                        .eq('id', session.user.id)

                    profileData = data
                    profileErrorMsg = error
                }

                setStatus({
                    session: session ? 'Active' : 'Missing',
                    user: userStatus,
                    profile: profileData,
                    profileError: profileErrorMsg,
                    userId: session?.user?.id
                })

            } catch (err: any) {
                setStatus((prev: any) => ({ ...prev, error: err.message }))
            }
        }

        runDebug()
    }, [])

    return (
        <div className="p-8 font-mono bg-gray-100 min-h-screen">
            <h1 className="text-2xl font-bold mb-4">Debug Access</h1>
            <pre className="bg-white p-4 rounded shadow overflow-auto">
                {JSON.stringify(status, null, 2)}
            </pre>
            <div className="mt-4">
                <h2 className="font-bold">Actions</h2>
                <button onClick={() => supabase.auth.signOut()} className="bg-red-500 text-white px-4 py-2 rounded">
                    Sign Out
                </button>
            </div>
        </div>
    )
}
