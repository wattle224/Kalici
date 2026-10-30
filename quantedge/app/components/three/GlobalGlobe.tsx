"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { CENTRES, ARCS, type FinancialCentre } from "../../data/markets";
import { arcPoints, latLonToVec3 } from "../../lib/geo";
import { useAppStore } from "../../store/useAppStore";

const R = 1.6;

/** Fibonacci sphere of dots forming the planet shell. */
function PointSphere() {
  const geom = useMemo(() => {
    const n = 2400;
    const positions = new Float32Array(n * 3);
    const colors = new Float32Array(n * 3);
    const phi = Math.PI * (3 - Math.sqrt(5));
    const c1 = new THREE.Color("#5a0a16");
    const c2 = new THREE.Color("#ffb4a6");
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = phi * i;
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;
      positions[i * 3] = x * R;
      positions[i * 3 + 1] = y * R;
      positions[i * 3 + 2] = z * R;
      const t = (y + 1) / 2;
      const c = c1.clone().lerp(c2, 0.1 + t * 0.3);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, []);
  return (
    <points geometry={geom}>
      <pointsMaterial
        size={0.018}
        vertexColors
        transparent
        opacity={0.85}
        sizeAttenuation
      />
    </points>
  );
}

function GraticuleLines() {
  const geom = useMemo(() => {
    const positions: number[] = [];
    const latStep = 15;
    const lonStep = 15;
    for (let lat = -75; lat <= 75; lat += latStep) {
      for (let lon = -180; lon < 180; lon += 2) {
        const a = latLonToVec3(lat, lon, R + 0.001);
        const b = latLonToVec3(lat, lon + 2, R + 0.001);
        positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
    for (let lon = -180; lon <= 180; lon += lonStep) {
      for (let lat = -85; lat < 85; lat += 2) {
        const a = latLonToVec3(lat, lon, R + 0.001);
        const b = latLonToVec3(lat + 2, lon, R + 0.001);
        positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(positions), 3)
    );
    return g;
  }, []);
  return (
    <lineSegments geometry={geom}>
      <lineBasicMaterial
        color="#4a0a14"
        transparent
        opacity={0.35}
      />
    </lineSegments>
  );
}

function CentreMarker({
  c,
  selected,
  onPick,
}: {
  c: FinancialCentre;
  selected: boolean;
  onPick: (id: string) => void;
}) {
  const pos = useMemo(() => latLonToVec3(c.lat, c.lon, R + 0.005), [c]);
  const ringRef = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (!ringRef.current) return;
    const t = clock.getElapsedTime();
    const s = 1 + Math.sin(t * 2 + c.lat) * 0.15 * c.activity;
    ringRef.current.scale.setScalar(s);
  });
  const colour =
    c.session === "open"
      ? "#2fe08a"
      : c.session === "pre" || c.session === "post"
      ? "#ffb020"
      : "#ffb4a6";
  return (
    <group position={pos}>
      <mesh
        onPointerDown={(e) => {
          e.stopPropagation();
          onPick(c.id);
        }}
      >
        <sphereGeometry args={[0.025, 10, 10]} />
        <meshBasicMaterial color={colour} />
      </mesh>
      <mesh ref={ringRef}>
        <ringGeometry args={[0.035, 0.05, 24]} />
        <meshBasicMaterial
          color={colour}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>
      {selected && (
        <mesh>
          <ringGeometry args={[0.06, 0.075, 32]} />
          <meshBasicMaterial
            color="#ffb4a6"
            transparent
            opacity={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      <Html
        center
        position={[0, 0.09, 0]}
        style={{ pointerEvents: "none" }}
        distanceFactor={6}
      >
        <div
          className="text-[9px] uppercase tracking-widest"
          style={{
            color: selected ? "#ffb4a6" : "#e6e6ea",
            textShadow: "0 0 4px rgba(0,0,0,0.9)",
            whiteSpace: "nowrap",
          }}
        >
          {c.city}
        </div>
      </Html>
    </group>
  );
}

function ArcLine({
  from,
  to,
  activity,
}: {
  from: FinancialCentre;
  to: FinancialCentre;
  activity: number;
}) {
  const points = useMemo(() => {
    const a = latLonToVec3(from.lat, from.lon, R + 0.005);
    const b = latLonToVec3(to.lat, to.lon, R + 0.005);
    return arcPoints(a, b, 48, 0.3);
  }, [from, to]);
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints(points);
    return g;
  }, [points]);

  const particleRef = useRef<THREE.Mesh>(null!);
  const offsetRef = useRef(Math.random());

  useFrame((_, dt) => {
    offsetRef.current = (offsetRef.current + dt * (0.1 + activity * 0.4)) % 1;
    const t = offsetRef.current;
    const idx = Math.min(points.length - 1, Math.floor(t * points.length));
    const p = points[idx];
    if (particleRef.current) particleRef.current.position.copy(p);
  });

  return (
    <group>
      <line>
        <primitive object={geom} attach="geometry" />
        <lineBasicMaterial
          color="#a01324"
          transparent
          opacity={0.35 + activity * 0.3}
        />
      </line>
      <mesh ref={particleRef}>
        <sphereGeometry args={[0.012, 8, 8]} />
        <meshBasicMaterial color="#ffb4a6" />
      </mesh>
    </group>
  );
}

function Scene({ onPick }: { onPick: (id: string) => void }) {
  const selected = useAppStore((s) => s.selectedCentre);
  const groupRef = useRef<THREE.Group>(null!);
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, 0.6, 4.4);
  }, [camera]);
  useFrame((_, dt) => {
    if (groupRef.current) groupRef.current.rotation.y += dt * 0.05;
  });
  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.6} />
      <PointSphere />
      <GraticuleLines />
      {ARCS.map((a, i) => {
        const f = CENTRES.find((c) => c.id === a.from)!;
        const t = CENTRES.find((c) => c.id === a.to)!;
        return (
          <ArcLine
            key={i}
            from={f}
            to={t}
            activity={(f.activity + t.activity) / 2}
          />
        );
      })}
      {CENTRES.map((c) => (
        <CentreMarker
          key={c.id}
          c={c}
          selected={selected === c.id}
          onPick={onPick}
        />
      ))}
    </group>
  );
}

export function GlobalGlobe() {
  const selectCentre = useAppStore((s) => s.selectCentre);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);
  if (!ready) return <div className="h-full w-full bg-bg-1" />;
  return (
    <div className="relative h-full w-full">
      <Canvas
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
        camera={{ fov: 42, position: [0, 0.6, 4.4] }}
      >
        <color attach="background" args={["#060608"]} />
        <Scene onPick={(id) => selectCentre(id)} />
        <OrbitControls
          enablePan={false}
          minDistance={2.8}
          maxDistance={7}
          rotateSpeed={0.6}
        />
      </Canvas>
      <div className="absolute top-2 left-2 text-xxs text-edge-dim uppercase tracking-widest">
        <div>⟐ WORLD / FIN-NET</div>
        <div className="text-edge-crimson/80">drag · zoom · click node</div>
      </div>
      <div className="absolute bottom-2 right-2 text-xxs text-edge-dim">
        <span className="text-edge-green">● OPEN</span>{" "}
        <span className="text-edge-amber">● PRE/POST</span>{" "}
        <span className="text-edge-salmon">● CLOSED</span>
      </div>
    </div>
  );
}
