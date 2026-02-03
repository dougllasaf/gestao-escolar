-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUMS
CREATE TYPE user_role AS ENUM ('super_admin', 'city_admin', 'monitor');

-- 2. TABLES

-- Cities (Tenants)
CREATE TABLE cities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    state TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Routes
CREATE TABLE routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_number TEXT NOT NULL,
    driver_name TEXT NOT NULL,
    city_id UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Schools
CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    city_id UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Profiles (Extends auth.users)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'monitor',
    city_id UUID REFERENCES cities(id) ON DELETE CASCADE, -- Nullable for Super Admin if they don't belong to a city, or enforce a 'System City'
    assigned_route_id UUID REFERENCES routes(id) ON DELETE SET NULL, -- Only for Monitors
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Students
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    date_of_birth DATE,
    guardian_name TEXT,
    address TEXT,
    medical_report TEXT, -- 'laudo'
    shift TEXT CHECK (shift IN ('Morning', 'Afternoon', 'Night', 'Full')),
    city_id UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    route_id UUID REFERENCES routes(id) ON DELETE SET NULL,
    school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. RLS POLICIES

ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user profile
CREATE OR REPLACE FUNCTION get_my_claim(claim TEXT) RETURNS JSONB AS $$
  SELECT coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb -> 'app_metadata' -> claim, 'null'::jsonb)
$$ LANGUAGE sql STABLE;

-- Or simpler: join user_profiles in policies.
-- We will use a helper function to avoid repetition and recursion issues if possible, 
-- but direct queries are often safer for RLS.

-- Policy: Super Admin Access
-- We assume Super Admin has a profile with role 'super_admin' OR a specific email/metadata in auth.
-- For this schema, we'll assume they have a row in user_profiles with role 'super_admin'.

-- CITIES
-- Super Admin: View/Edit ALL
-- City Admin: View OWN city
-- Monitor: View OWN city (contextual)
CREATE POLICY "Super Admin sees all cities" ON cities
    FOR ALL
    USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "Users see their own city" ON cities
    FOR SELECT
    USING (id IN (SELECT city_id FROM user_profiles WHERE id = auth.uid()));

-- USER PROFILES
-- Super Admin: Full access
-- City Admin: View/Create/Edit profiles in THEIR city (except other Admins maybe?)
-- Monitor: View own profile
CREATE POLICY "Super admin full access profiles" ON user_profiles
    FOR ALL
    USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "City Admin manage city users" ON user_profiles
    FOR ALL
    USING (
        city_id IN (SELECT city_id FROM user_profiles WHERE id = auth.uid() AND role = 'city_admin')
    );

CREATE POLICY "Users see own profile" ON user_profiles
    FOR SELECT
    USING (id = auth.uid());

-- ROUTES
-- Super Admin: All
-- City Admin: All in city
-- Monitor: All in city (to select route? No, locked to assigned_route. But maybe needs to see details of assigned route)
CREATE POLICY "Super admin routes" ON routes FOR ALL
    USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "City Admin manage routes" ON routes FOR ALL
    USING (city_id IN (SELECT city_id FROM user_profiles WHERE id = auth.uid() AND role = 'city_admin'));

CREATE POLICY "Monitor sees assigned route" ON routes FOR SELECT
    USING (id IN (SELECT assigned_route_id FROM user_profiles WHERE id = auth.uid()));

-- SCHOOLS
-- Super Admin: All
-- City Admin: All in city
-- Monitor: Read schools in city (to assign students)
CREATE POLICY "Super admin schools" ON schools FOR ALL
    USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "City Admin manage schools" ON schools FOR ALL
    USING (city_id IN (SELECT city_id FROM user_profiles WHERE id = auth.uid() AND role = 'city_admin'));

CREATE POLICY "Monitor sees city schools" ON schools FOR SELECT
    USING (city_id IN (SELECT city_id FROM user_profiles WHERE id = auth.uid()));

-- STUDENTS
-- Super Admin: All
-- City Admin: All in city
-- Monitor: Only their route
CREATE POLICY "Super admin students" ON students FOR ALL
    USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "City Admin manage students" ON students FOR ALL
    USING (city_id IN (SELECT city_id FROM user_profiles WHERE id = auth.uid() AND role = 'city_admin'));

CREATE POLICY "Monitor manage route students" ON students
    FOR ALL
    USING (
        route_id IN (SELECT assigned_route_id FROM user_profiles WHERE id = auth.uid())
        AND
        city_id IN (SELECT city_id FROM user_profiles WHERE id = auth.uid()) -- Extra safety
    )
    WITH CHECK (
        route_id IN (SELECT assigned_route_id FROM user_profiles WHERE id = auth.uid())
    );

