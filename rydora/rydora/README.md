# RYDORA – Share the Ride. Shape the Future.
Carpooling platform: React + TypeScript + Tailwind + Framer Motion + Leaflet/OSM (client), Express + PostgreSQL (server), Clerk for authentication.

## Run it
1. Create a free Clerk app (https://clerk.com) → copy the publishable + secret keys.
2. `docker compose up -d` (PostgreSQL)  — or point `DATABASE_URL` at your own Postgres.
3. Server: `cd server && cp .env.example .env` (fill Clerk keys, set a real `GEO_USER_AGENT`) → `npm i && npm run migrate && npm run dev`
4. Client: `cd client && cp .env.example .env` (add publishable key) → `npm i && npm run dev` → http://localhost:5173
5. Matching tests: `cd server && npm test`

## Architecture
- Credentials/sessions live only in Clerk. `users.clerk_user_id` links to it; the **role is stored and enforced in our DB**, server-side.
- `server/src/matching.ts` – matching engine. `routes/bookings.ts` – booking lifecycle with transactions. `services/geo.ts` – swappable geocoding (Nominatim) + routing (OSRM).
- `server/migrations/001_init.sql` – all 9 tables, FKs, checks, indexes.

## How matching works
For a search (pickup P, drop-off D, time T) each open, future ride with enough free seats within ±90 min of T is scored:
1. Project P and D onto the driver's route (stored OSRM road geometry; straight line if none → labelled *approximate*).
2. Reject if P or D is >5 km from the route, or D is not *after* P along the route (wrong direction).
3. `score = 0.25·(1−pickupDev/5km) + 0.25·(1−dropDev/5km) + 0.30·overlap + 0.20·(1−|ΔT|/90min)` where overlap = shared km / route km. Shown as a percentage. Nothing is random.
Fare estimate = driver's full-route price × max(overlap, 0.25). It is a cost-sharing estimate; **no payments are processed**.

## Seat safety
Seats are consumed only on **accept**. Accept locks the ride row (`SELECT … FOR UPDATE`), recounts confirmed seats and refuses if capacity would be exceeded. A partial unique index blocks duplicate active requests.

## Not done / honest limitations
- **Not run or tested here** (no network in my sandbox): run `npm i`, fix any version/type nits, and run the tests.
- Driver "verified" status can only be set by a reviewer directly in the DB (`driver_profiles.verification_status`); no admin UI or ID-check provider yet.
- Notifications are in-app only (no email/push). Trip sharing is informational only; emergency contacts API exists but has no UI.
- Search results are not paginated; ride preferences are not used in scoring; no saved-search (`ride_requests`) endpoints; no profile images upload.
- Public Nominatim/OSM tile/OSRM servers are for development only; self-host or use a paid provider in production.
- Dashboard "money saved" is replaced by estimated cost-share/earnings; CO₂/fuel use stated constants (0.12 kg/km, 0.08 L/km).
