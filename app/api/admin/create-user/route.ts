import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { Database } from '@/types/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies()

        // 1. Verify Caller Identity
        const supabase = createServerClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value
                    },
                    set(name: string, value: string, options: CookieOptions) {
                        try {
                            cookieStore.set({ name, value, ...options })
                        } catch (error) {
                            // Check if inside Server Action or Route Handler
                        }
                    },
                    remove(name: string, options: CookieOptions) {
                        try {
                            cookieStore.set({ name, value: '', ...options })
                        } catch (error) {
                            // Check if inside Server Action or Route Handler
                        }
                    },
                },
            }
        )

        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        // 2. Access control check
        // Get caller profile
        const { data: callerProfile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single() as any

        if (!callerProfile) {
            return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 403 })
        }

        const { email, password, role, city_id, full_name, route_id, phone } = await request.json()

        // 3. Authorization Logic
        // @ts-ignore
        if (callerProfile.role === 'city_admin') {
            // City Admin can ONLY create Monitors for THEIR city
            if (role !== 'monitor') {
                return NextResponse.json({ error: 'Administrador Municipal só pode criar Monitores' }, { status: 403 })
            }
            if (city_id !== callerProfile.city_id) {
                return NextResponse.json({ error: 'Não é possível criar usuário para outra cidade' }, { status: 403 })
            }
            // @ts-ignore
        } else if (callerProfile.role !== 'super_admin') {
            return NextResponse.json({ error: 'Permissões insuficientes' }, { status: 403 })
        }

        // 4. Create User (Requires Service Role)
        // Use independent client for Admin actions
        const supabaseAdmin = createClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name }
        })

        if (createError) {
            return NextResponse.json({ error: createError.message }, { status: 400 })
        }

        if (!newUser.user) {
            return NextResponse.json({ error: 'Failed to create user object' }, { status: 500 })
        }

        // 5. Create Profile
        // Explicitly cast to any or correct type since Database types might be inferred strictly
        const newProfile = {
            id: newUser.user.id,
            role: role as 'monitor' | 'city_admin' | 'super_admin',
            city_id: city_id,
            full_name: full_name,
            assigned_route_id: route_id || null,
            phone: phone || null
        }

        const { error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .insert(newProfile as any)

        if (profileError) {
            // Optional: Delete auth user if profile creation fails?
            // Doing cleanup is good practice
            await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
            return NextResponse.json({ error: profileError.message }, { status: 400 })
        }

        return NextResponse.json({ message: 'User created successfully', userId: newUser.user.id })
    } catch (error: any) {
        console.error('Create user API error:', error)
        return NextResponse.json({ error: error?.message || 'Erro interno do servidor' }, { status: 500 })
    }
}
