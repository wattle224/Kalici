import * as THREE from "three";

export const latLonToVec3 = (
  lat: number,
  lon: number,
  r = 1
): THREE.Vector3 => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
};

export const arcPoints = (
  a: THREE.Vector3,
  b: THREE.Vector3,
  segments = 48,
  lift = 0.35
): THREE.Vector3[] => {
  const points: THREE.Vector3[] = [];
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const dist = a.distanceTo(b);
  const r = a.length();
  const midUp = mid.setLength(r + dist * lift);
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p0 = a.clone().multiplyScalar((1 - t) * (1 - t));
    const p1 = midUp.clone().multiplyScalar(2 * (1 - t) * t);
    const p2 = b.clone().multiplyScalar(t * t);
    points.push(p0.add(p1).add(p2));
  }
  return points;
};
