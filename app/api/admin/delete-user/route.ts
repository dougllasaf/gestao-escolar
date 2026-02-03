import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { Database } from '@/types/supabase'

export const dynamic = 'force-dynamic'

export async function DELETE(request: Request) {
    const cookieStore = await cookies()

    // 1. Verify Caller Identity
    const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) { return cookieStore.get(name)?.value },
                set(name: string, value: string, options: CookieOptions) { cookieStore.set({ name, value, ...options }) },
                remove(name: string, options: CookieOptions) { cookieStore.set({ name, value: '', ...options }) },
            },
        }
    )

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // 2. Get Caller Profile
    const { data: callerProfile } = await supabase.from('user_profiles').select('*').eq('id', session.user.id).single() as any
    if (!callerProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 403 })

    const { userId } = await request.json()
    if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 })

    // 3. Get Target Profile to verify permissions
    // We use admin client to peek at the target because RLS might hide it (though usually visible)
    const supabaseAdmin = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: targetProfile, error: targetError } = await supabaseAdmin.from('user_profiles').select('*').eq('id', userId).single() as any

    if (!targetProfile) {
        // Only if profile completely missing, maybe just delete auth user? 
        // Safer to err.
        return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
    }

    // 4. Authorization Logic
    let allowed = false

    if (callerProfile.role === 'super_admin') {
        // Super Admin can delete anyone (except maybe themselves, client side check better)
        allowed = true
    } else if (callerProfile.role === 'city_admin') {
        // City Admin can ONLY delete Monitors of THEIR city
        if (targetProfile.role === 'monitor' && targetProfile.city_id === callerProfile.city_id) {
            allowed = true
        }
    }

    if (!allowed) {
        return NextResponse.json({ error: 'Insufficient permissions to delete this user' }, { status: 403 })
    }

    // 5. Execute Delete
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'User deleted successfully' })
}
