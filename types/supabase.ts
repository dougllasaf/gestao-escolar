export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            cities: {
                Row: {
                    id: string
                    name: string
                    state: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    state: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    state?: string
                    created_at?: string
                }
            }
            user_profiles: {
                Row: {
                    id: string
                    role: 'super_admin' | 'city_admin' | 'monitor'
                    city_id: string | null
                    assigned_route_id: string | null
                    full_name: string | null
                    created_at: string
                }
                Insert: {
                    id: string
                    role?: 'super_admin' | 'city_admin' | 'monitor'
                    city_id?: string | null
                    assigned_route_id?: string | null
                    full_name?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    role?: 'super_admin' | 'city_admin' | 'monitor'
                    city_id?: string | null
                    assigned_route_id?: string | null
                    full_name?: string | null
                    created_at?: string
                }
            }
            // Add other tables as needed for full typing
        }
    }
}
