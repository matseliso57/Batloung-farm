// Finds the nearest vendors to a point by WALKING or DRIVING.
// Uses a public OSRM routing server for real road distances.
// If the routing server cannot be reached, it falls back to an estimate
// (straight-line distance x detour factor / average speed) so the feature never breaks.

const ROUTE_URLS = {
  driving: process.env.ROUTING_DRIVING_URL || 'https://router.project-osrm.org/route/v1/driving',
  walking: process.env.ROUTING_WALKING_URL || 'https://routing.openstreetmap.de/routed-foot/route/v1/foot',
};
const SPEED_KMH = { walking: 5, driving: 35 };   // used for estimates
const DETOUR_FACTOR = 1.3;                        // roads are longer than straight lines
const TIMEOUT_MS = 6000;

const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

// Great-circle distance in km
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function estimate(from, to, straightKm, mode) {
  const distanceKm = straightKm * DETOUR_FACTOR;
  return {
    distance_km: distanceKm,
    duration_min: (distanceKm / SPEED_KMH[mode]) * 60,
    geometry: [[from.lat, from.lng], [to.lat, to.lng]],
  };
}

async function fetchRoute(mode, from, to) {
  const url = `${ROUTE_URLS[mode]}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=simplified&geometries=geojson`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'BatloungFarm/1.0 (student project)' } });
    if (!res.ok) throw new Error(`routing server returned ${res.status}`);
    const json = await res.json();
    const r = json.routes && json.routes[0];
    if (json.code !== 'Ok' || !r) throw new Error('no route found');

    const distanceKm = r.distance / 1000;
    let durationMin = r.duration / 60;
    // Safety net: if a "walking" answer implies car speed, recompute from walking speed.
    if (mode === 'walking' && distanceKm > 0 && durationMin < (distanceKm / 8) * 60) {
      durationMin = (distanceKm / SPEED_KMH.walking) * 60;
    }
    return {
      distance_km: distanceKm,
      duration_min: durationMin,
      geometry: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]), // Leaflet wants [lat, lng]
    };
  } finally {
    clearTimeout(timer);
  }
}

function build(v, straightKm, route, source) {
  return {
    vendor_id: v.vendor_id,
    vendor_name: v.vendor_name,
    phone_number: v.phone_number,
    location: v.location,
    latitude: v.latitude,
    longitude: v.longitude,
    straight_line_km: round(straightKm),
    distance_km: round(route.distance_km),
    duration_min: round(route.duration_min, 1),
    routing: source, // 'road' or 'estimated'
    geometry: route.geometry,
  };
}

async function findNearest(origin, vendors, mode, limit) {
  const ranked = vendors
    .map((v) => ({ v, straight: haversineKm(origin.lat, origin.lng, v.latitude, v.longitude) }))
    .sort((a, b) => a.straight - b.straight)
    .slice(0, Math.max(limit + 2, 5)); // route only the closest few candidates

  const items = await Promise.all(ranked.map(async ({ v, straight }) => {
    const to = { lat: v.latitude, lng: v.longitude };
    try {
      return build(v, straight, await fetchRoute(mode, origin, to), 'road');
    } catch (err) {
      console.warn(`Routing fallback for vendor ${v.vendor_id}: ${err.message}`);
      return build(v, straight, estimate(origin, to, straight, mode), 'estimated');
    }
  }));

  items.sort((a, b) => a.distance_km - b.distance_km);
  const top = items.slice(0, limit);
  const sources = new Set(top.map((i) => i.routing));
  const routingSource = sources.size === 0 ? 'none' : sources.size === 1 ? [...sources][0] : 'mixed';
  return { origin, mode, routing_source: routingSource, vendors: top };
}

module.exports = { findNearest, haversineKm, estimate };
