import test from 'node:test'; import assert from 'node:assert/strict';
import { scoreRide } from './matching.js';
const ride = { origin_lat: 10, origin_lng: 77, dest_lat: 11, dest_lng: 77, departs_at: '2030-01-01T08:00:00Z', price_per_seat: 100, route_geojson: null };
const when = new Date('2030-01-01T08:00:00Z');
test('same direction on route matches', () => {
  const m = scoreRide(ride, { lat: 10.1, lng: 77 }, { lat: 10.9, lng: 77 }, when);
  assert.ok(m && m.percent > 70 && m.method === 'straight-line-approximation');
});
test('opposite direction rejected', () => assert.equal(scoreRide(ride, { lat: 10.9, lng: 77 }, { lat: 10.1, lng: 77 }, when), null));
test('far from route rejected', () => assert.equal(scoreRide(ride, { lat: 10.1, lng: 78 }, { lat: 10.9, lng: 78 }, when), null));
test('time outside window rejected', () => assert.equal(scoreRide(ride, { lat: 10.1, lng: 77 }, { lat: 10.9, lng: 77 }, new Date('2030-01-01T11:00:00Z')), null));
