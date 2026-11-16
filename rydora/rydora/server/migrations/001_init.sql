CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text UNIQUE NOT NULL,           -- credentials live in Clerk, never here
  display_name text, phone text, avatar_url text,
  role text NOT NULL DEFAULT 'passenger' CHECK (role IN ('passenger','driver','both')),
  created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE driver_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  licence_ref text,
  verification_status text NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified','pending','verified','rejected')),
  submitted_at timestamptz);
CREATE TABLE vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  model text NOT NULL, registration text NOT NULL, seats int NOT NULL CHECK (seats BETWEEN 1 AND 8));
CREATE TABLE rides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  origin_label text NOT NULL, origin_lat double precision NOT NULL, origin_lng double precision NOT NULL,
  dest_label text NOT NULL, dest_lat double precision NOT NULL, dest_lng double precision NOT NULL,
  route_geojson jsonb, distance_km numeric(8,2), duration_min numeric(8,1),
  departs_at timestamptz NOT NULL,
  seats_total int NOT NULL CHECK (seats_total BETWEEN 1 AND 8),
  price_per_seat numeric(10,2) NOT NULL CHECK (price_per_seat >= 0),
  preferences jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','cancelled','completed')),
  created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX rides_search_idx ON rides (status, departs_at);
CREATE TABLE ride_requests (  -- saved passenger searches
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  origin_label text NOT NULL, dest_label text NOT NULL, wanted_at timestamptz NOT NULL,
  passengers int NOT NULL DEFAULT 1, max_budget numeric(10,2), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  passenger_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seats int NOT NULL CHECK (seats BETWEEN 1 AND 8),
  pickup_label text NOT NULL, pickup_lat double precision NOT NULL, pickup_lng double precision NOT NULL,
  dropoff_label text NOT NULL, dropoff_lat double precision NOT NULL, dropoff_lng double precision NOT NULL,
  fare_estimate numeric(10,2) NOT NULL, match_percent int NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','rejected','cancelled','completed')),
  created_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX one_active_booking ON bookings (ride_id, passenger_id) WHERE status IN ('pending','confirmed');
CREATE INDEX bookings_ride_idx ON bookings (ride_id, status);
CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewee_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5), comment text,
  UNIQUE (booking_id, reviewer_id));
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL, body text NOT NULL, read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX notifications_user_idx ON notifications (user_id, created_at DESC);
CREATE TABLE emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL, phone text NOT NULL);
