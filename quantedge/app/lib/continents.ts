import * as THREE from "three";
import { feature } from "topojson-client";
// 55KB topojson of landmasses from world-atlas@2
import land from "world-atlas/land-110m.json";
import type {
  Topology,
  GeometryCollection,
} from "topojson-specification";
import { latLonToVec3 } from "./geo";

type Ring = [number, number][];
type Poly = Ring[];

const topo = land as unknown as Topology<{
  land: GeometryCollection;
}>;

const geo = feature(topo, topo.objects.land) as unknown as {
  type: "FeatureCollection";
  features: {
    geometry:
      | { type: "Polygon"; coordinates: Poly }
      | { type: "MultiPolygon"; coordinates: Poly[] };
  }[];
};

function collectRings(): Ring[] {
  const rings: Ring[] = [];
  for (const f of geo.features) {
    const g = f.geometry;
    if (g.type === "Polygon") {
      for (const ring of g.coordinates) rings.push(ring);
    } else {
      for (const poly of g.coordinates) {
        for (const ring of poly) rings.push(ring);
      }
    }
  }
  return rings;
}

const RINGS = collectRings();

/** Thin line-segment geometry tracing every coastline on a sphere of radius r. */
export function buildCoastlineGeometry(r: number): THREE.BufferGeometry {
  const positions: number[] = [];
  for (const ring of RINGS) {
    for (let i = 0; i < ring.length - 1; i++) {
      const [lon1, lat1] = ring[i];
      const [lon2, lat2] = ring[i + 1];
      const a = latLonToVec3(lat1, lon1, r);
      const b = latLonToVec3(lat2, lon2, r);
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(positions), 3)
  );
  return g;
}

/** Dense dots sampled across every landmass (point-in-polygon on an equirect grid). */
export function buildLandPoints(r: number, step = 2.2): THREE.BufferGeometry {
  const positions: number[] = [];
  const polys: Poly[] = [];
  for (const f of geo.features) {
    const g = f.geometry;
    if (g.type === "Polygon") polys.push(g.coordinates);
    else for (const p of g.coordinates) polys.push(p);
  }
  // Precompute bounding boxes per polygon to speed up PIP
  const bbox = polys.map((poly) => {
    const outer = poly[0];
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const [x, y] of outer) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    return { minX, minY, maxX, maxY };
  });
  const inRing = (x: number, y: number, ring: Ring) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      const intersect =
        yi > y !== yj > y &&
        x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  };
  const inPoly = (x: number, y: number, poly: Poly) => {
    if (!inRing(x, y, poly[0])) return false;
    for (let h = 1; h < poly.length; h++) if (inRing(x, y, poly[h])) return false;
    return true;
  };
  for (let lat = -85; lat <= 85; lat += step) {
    // Sample longitude more densely near the equator to keep dot spacing uniform
    const lonStep = step / Math.max(0.15, Math.cos((lat * Math.PI) / 180));
    for (let lon = -180; lon < 180; lon += lonStep) {
      let hit = false;
      for (let i = 0; i < polys.length; i++) {
        const b = bbox[i];
        if (lon < b.minX || lon > b.maxX || lat < b.minY || lat > b.maxY)
          continue;
        if (inPoly(lon, lat, polys[i])) {
          hit = true;
          break;
        }
      }
      if (!hit) continue;
      const v = latLonToVec3(lat, lon, r);
      positions.push(v.x, v.y, v.z);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(positions), 3)
  );
  return g;
}
