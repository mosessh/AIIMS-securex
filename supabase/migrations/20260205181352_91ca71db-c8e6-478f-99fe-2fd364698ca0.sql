-- Add geofence_radius column to sites table with default 500m
ALTER TABLE public.sites 
ADD COLUMN geofence_radius integer NOT NULL DEFAULT 500;

-- Add comment for documentation
COMMENT ON COLUMN public.sites.geofence_radius IS 'Geofence radius in meters for guard location tracking';