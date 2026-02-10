-- =============================================
-- GUARD TOUR MANAGEMENT SYSTEM DATABASE SCHEMA
-- =============================================

-- 1. Create ENUM types for consistent data
CREATE TYPE public.user_role AS ENUM ('admin', 'supervisor', 'guard');
CREATE TYPE public.guard_status AS ENUM ('active', 'on_patrol', 'off_duty', 'suspended');
CREATE TYPE public.alert_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE public.alert_type AS ENUM ('missed_checkpoint', 'late_attendance', 'sleep_detected', 'camera_no_activity', 'panic_button', 'unauthorized_area');
CREATE TYPE public.shift_status AS ENUM ('scheduled', 'active', 'completed', 'missed');
CREATE TYPE public.site_status AS ENUM ('active', 'inactive');

-- 2. Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'guard',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- 4. Create sites table
CREATE TABLE public.sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  status site_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Create guards table (extends profiles with guard-specific data)
CREATE TABLE public.guards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  status guard_status NOT NULL DEFAULT 'off_duty',
  rating DECIMAL(3,2) DEFAULT 5.00,
  attendance_rate DECIMAL(5,2) DEFAULT 100.00,
  designation TEXT DEFAULT 'Security Guard',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Create checkpoints table
CREATE TABLE public.checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  qr_code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  sequence_order INTEGER NOT NULL DEFAULT 1,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_required BOOLEAN NOT NULL DEFAULT true,
  scan_interval INTEGER NOT NULL DEFAULT 15, -- minutes
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Create shifts table
CREATE TABLE public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guard_id UUID NOT NULL REFERENCES public.guards(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status shift_status NOT NULL DEFAULT 'scheduled',
  attendance_marked BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Create patrol_logs table
CREATE TABLE public.patrol_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guard_id UUID NOT NULL REFERENCES public.guards(id) ON DELETE CASCADE,
  checkpoint_id UUID NOT NULL REFERENCES public.checkpoints(id) ON DELETE CASCADE,
  shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_on_time BOOLEAN NOT NULL DEFAULT true,
  notes TEXT
);

-- 9. Create alerts table
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type alert_type NOT NULL,
  severity alert_severity NOT NULL,
  guard_id UUID REFERENCES public.guards(id) ON DELETE SET NULL,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Create incidents table
CREATE TABLE public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guard_id UUID NOT NULL REFERENCES public.guards(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  photo_url TEXT,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Create cameras table for AI monitoring
CREATE TABLE public.cameras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  zone TEXT,
  stream_url TEXT,
  status TEXT NOT NULL DEFAULT 'offline',
  ai_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- SECURITY DEFINER FUNCTIONS (for RLS)
-- =============================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Function to check if user is admin or supervisor
CREATE OR REPLACE FUNCTION public.is_admin_or_supervisor(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'supervisor')
  );
$$;

-- Function to get user's guard record id
CREATE OR REPLACE FUNCTION public.get_guard_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.guards WHERE user_id = _user_id LIMIT 1;
$$;

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patrol_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cameras ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User roles policies (read-only for most, admin can manage)
CREATE POLICY "Users can view roles" ON public.user_roles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Sites policies
CREATE POLICY "Authenticated users can view sites" ON public.sites
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage sites" ON public.sites
  FOR ALL TO authenticated USING (public.is_admin_or_supervisor(auth.uid()));

-- Guards policies
CREATE POLICY "Authenticated users can view guards" ON public.guards
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own guard record" ON public.guards
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admins can manage guards" ON public.guards
  FOR ALL TO authenticated USING (public.is_admin_or_supervisor(auth.uid()));

-- Checkpoints policies
CREATE POLICY "Authenticated users can view checkpoints" ON public.checkpoints
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage checkpoints" ON public.checkpoints
  FOR ALL TO authenticated USING (public.is_admin_or_supervisor(auth.uid()));

-- Shifts policies
CREATE POLICY "Users can view all shifts" ON public.shifts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Guards can view own shifts" ON public.shifts
  FOR SELECT TO authenticated 
  USING (guard_id = public.get_guard_id(auth.uid()));

CREATE POLICY "Admins can manage shifts" ON public.shifts
  FOR ALL TO authenticated USING (public.is_admin_or_supervisor(auth.uid()));

-- Patrol logs policies
CREATE POLICY "Users can view patrol logs" ON public.patrol_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Guards can insert own patrol logs" ON public.patrol_logs
  FOR INSERT TO authenticated 
  WITH CHECK (guard_id = public.get_guard_id(auth.uid()));

CREATE POLICY "Admins can manage patrol logs" ON public.patrol_logs
  FOR ALL TO authenticated USING (public.is_admin_or_supervisor(auth.uid()));

-- Alerts policies
CREATE POLICY "Users can view alerts" ON public.alerts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage alerts" ON public.alerts
  FOR ALL TO authenticated USING (public.is_admin_or_supervisor(auth.uid()));

CREATE POLICY "Users can acknowledge alerts" ON public.alerts
  FOR UPDATE TO authenticated USING (true);

-- Incidents policies
CREATE POLICY "Users can view incidents" ON public.incidents
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Guards can create incidents" ON public.incidents
  FOR INSERT TO authenticated 
  WITH CHECK (guard_id = public.get_guard_id(auth.uid()));

CREATE POLICY "Admins can manage incidents" ON public.incidents
  FOR ALL TO authenticated USING (public.is_admin_or_supervisor(auth.uid()));

-- Cameras policies
CREATE POLICY "Users can view cameras" ON public.cameras
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage cameras" ON public.cameras
  FOR ALL TO authenticated USING (public.is_admin_or_supervisor(auth.uid()));

-- =============================================
-- TRIGGERS
-- =============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_sites_updated_at
  BEFORE UPDATE ON public.sites
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_guards_updated_at
  BEFORE UPDATE ON public.guards
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_checkpoints_updated_at
  BEFORE UPDATE ON public.checkpoints
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_shifts_updated_at
  BEFORE UPDATE ON public.shifts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_cameras_updated_at
  BEFORE UPDATE ON public.cameras
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile and guard record on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  
  -- Create default guard role (admins will promote as needed)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'guard');
  
  -- Create guard record
  INSERT INTO public.guards (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.patrol_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shifts;