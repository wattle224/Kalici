"use client";

import { Canvas, useFrame, useThree, ThreeEvent } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useAppStore } from "../../store/useAppStore";

export type CubeFace = {
  title: string;
  code: string;
  metrics: { label: string; value: string; tone?: "good" | "warn" | "bad" }[];
  accent: string;
};

const FACE_POS: {
  pos: [number, number, number];
  rot: [number, number, number];
}[] = [
  { pos: [0, 0, 1], rot: [0, 0, 0] },
  { pos: [0, 0, -1], rot: [0, Math.PI, 0] },
  { pos: [1, 0, 0], rot: [0, Math.PI / 2, 0] },
  { pos: [-1, 0, 0], rot: [0, -Math.PI / 2, 0] },
  { pos: [0, 1, 0], rot: [-Math.PI / 2, 0, 0] },
  { pos: [0, -1, 0], rot: [Math.PI / 2, 0, 0] },
];

function FaceGrid({ color = "#a01324" }: { color?: string }) {
  const geom = useMemo(() => {
    const positions: number[] = [];
    const n = 8;
    const s = 1;
    for (let i = 0; i <= n; i++) {
      const t = -s + (2 * s * i) / n;
      positions.push(-s, t, 0.001, s, t, 0.001);
      positions.push(t, -s, 0.001, t, s, 0.001);
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
      <lineBasicMaterial color={color} transparent opacity={0.35} />
    </lineSegments>
  );
}

function FacePoints({ seed = 1, color = "#ffb4a6" }: { seed?: number; color?: string }) {
  const geom = useMemo(() => {
    let s = seed;
    const rnd = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    const n = 90;
    const positions = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      positions[i * 3] = -0.95 + rnd() * 1.9;
      positions[i * 3 + 1] = -0.95 + rnd() * 1.9;
      positions[i * 3 + 2] = 0.002;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [seed]);
  const ref = useRef<THREE.Points>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.PointsMaterial).opacity =
      0.55 + Math.sin(clock.getElapsedTime() * 1.5 + seed) * 0.25;
  });
  return (
    <points ref={ref} geometry={geom}>
      <pointsMaterial size={0.03} color={color} transparent />
    </points>
  );
}

function Face({
  index,
  face,
  active,
  onPick,
}: {
  index: number;
  face: CubeFace;
  active: boolean;
  onPick: (i: number) => void;
}) {
  const { pos, rot } = FACE_POS[index];
  return (
    <group position={pos as [number, number, number]} rotation={rot as [number, number, number]}>
      <mesh
        onPointerDown={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          onPick(index);
        }}
      >
        <planeGeometry args={[2, 2]} />
        <meshBasicMaterial
          color={active ? "#2a0810" : "#0a0a0d"}
          transparent
          opacity={0.9}
        />
      </mesh>
      <FaceGrid color={active ? "#ffb4a6" : "#7a0b16"} />
      <FacePoints seed={(index + 1) * 7} color={face.accent} />
      <Html
        center
        distanceFactor={6}
        position={[0, 0, 0.005]}
        style={{ pointerEvents: "none" }}
      >
        <div
          style={{
            width: 220,
            textAlign: "left",
            padding: "6px 8px",
            background: "rgba(10,10,13,0.65)",
            border: `1px solid ${active ? "#ffb4a6" : "#a01324"}`,
            color: "#e6e6ea",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 10,
            lineHeight: 1.4,
          }}
        >
          <div
            style={{
              color: active ? "#ffb4a6" : "#e6e6ea",
              fontSize: 9,
              letterSpacing: 2,
            }}
          >
            {face.code} · {face.title.toUpperCase()}
          </div>
          <div style={{ marginTop: 4, borderTop: "1px dashed rgba(160,19,36,0.4)", paddingTop: 4 }}>
            {face.metrics.slice(0, 4).map((m) => (
              <div key={m.label} style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#9a9aa6" }}>{m.label}</span>
                <span
                  style={{
                    color:
                      m.tone === "good"
                        ? "#2fe08a"
                        : m.tone === "warn"
                        ? "#ffb020"
                        : m.tone === "bad"
                        ? "#ff8a7a"
                        : "#ffb4a6",
                  }}
                >
                  {m.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Html>
    </group>
  );
}

function Wireframe() {
  return (
    <lineSegments>
      <edgesGeometry
        args={[new THREE.BoxGeometry(2.002, 2.002, 2.002)]}
      />
      <lineBasicMaterial color="#ffb4a6" transparent opacity={0.75} />
    </lineSegments>
  );
}

function FloatingParticles() {
  const geom = useMemo(() => {
    const n = 220;
    const positions = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 3.6;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 3.6;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 3.6;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);
  const ref = useRef<THREE.Points>(null!);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.05;
  });
  return (
    <points ref={ref} geometry={geom}>
      <pointsMaterial size={0.015} color="#a01324" transparent opacity={0.6} />
    </points>
  );
}

function CubeScene({ faces, onPick }: { faces: CubeFace[]; onPick: (i: number) => void }) {
  const group = useRef<THREE.Group>(null!);
  const active = useAppStore((s) => s.selectedCubeFace);
  const { gl } = useThree();
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const vel = useRef({ x: 0.003, y: 0.004 });

  useEffect(() => {
    const el = gl.domElement;
    const onDown = (e: PointerEvent) => {
      dragging.current = true;
      last.current = { x: e.clientX, y: e.clientY };
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging.current || !group.current) return;
      const dx = (e.clientX - last.current.x) * 0.005;
      const dy = (e.clientY - last.current.y) * 0.005;
      group.current.rotation.y += dx;
      group.current.rotation.x += dy;
      vel.current = { x: dy * 0.1, y: dx * 0.1 };
      last.current = { x: e.clientX, y: e.clientY };
    };
    const onUp = () => (dragging.current = false);
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [gl]);

  useFrame(() => {
    if (!group.current) return;
    if (!dragging.current) {
      group.current.rotation.y += vel.current.y + 0.003;
      group.current.rotation.x += vel.current.x;
      vel.current.x *= 0.96;
      vel.current.y *= 0.96;
    }
  });

  return (
    <>
      <ambientLight intensity={0.7} />
      <FloatingParticles />
      <group ref={group} scale={0.95}>
        <Wireframe />
        {faces.map((f, i) => (
          <Face
            key={i}
            index={i}
            face={f}
            active={active === i}
            onPick={onPick}
          />
        ))}
      </group>
    </>
  );
}

export function IntelligenceCube({
  faces,
  title = "QUANT INTELLIGENCE CUBE",
}: {
  faces: CubeFace[];
  title?: string;
}) {
  const [ready, setReady] = useState(false);
  const selectFace = useAppStore((s) => s.selectCubeFace);
  const cubeMode = useAppStore((s) => s.cubeMode);
  const setCubeMode = useAppStore((s) => s.setCubeMode);
  const active = useAppStore((s) => s.selectedCubeFace);

  useEffect(() => setReady(true), []);
  if (!ready) return <div className="h-full w-full bg-bg-1" />;

  if (cubeMode === "faces") {
    return (
      <div className="relative h-full w-full p-2 overflow-auto scrollbar">
        <div className="flex items-center justify-between mb-2">
          <div className="text-edge-pale text-xxs uppercase tracking-widest">
            {title} / 6-FACE VIEW
          </div>
          <button
            className="text-xxs text-edge-dim hover:text-edge-pale border border-edge-crimson/40 px-2 py-[2px]"
            onClick={() => setCubeMode("3d")}
          >
            ◉ 3D CUBE
          </button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {faces.map((f, i) => (
            <div
              key={i}
              className={
                "border p-2 cursor-pointer " +
                (active === i
                  ? "border-edge-pale bg-edge-crimson/10"
                  : "border-edge-crimson/50 hover:border-edge-pale")
              }
              onClick={() => selectFace(i)}
            >
              <div className="flex justify-between items-baseline">
                <div className="text-edge-crimson text-xxs">{f.code}</div>
                <div className="text-edge-pale text-xxs uppercase">
                  {f.title}
                </div>
              </div>
              <div className="mt-2 space-y-1">
                {f.metrics.map((m) => (
                  <div
                    key={m.label}
                    className="flex justify-between text-xxs tabular"
                  >
                    <span className="text-edge-dim">{m.label}</span>
                    <span
                      className={
                        m.tone === "good"
                          ? "text-edge-green"
                          : m.tone === "warn"
                          ? "text-edge-amber"
                          : m.tone === "bad"
                          ? "text-edge-salmon"
                          : "text-edge-text"
                      }
                    >
                      {m.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <Canvas
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
        camera={{ fov: 42, position: [3.6, 2.4, 3.6] }}
      >
        <color attach="background" args={["#060608"]} />
        <CubeScene faces={faces} onPick={(i) => selectFace(i)} />
        <OrbitControls
          enablePan={false}
          enableRotate={false}
          enableZoom
          minDistance={3.5}
          maxDistance={8}
        />
      </Canvas>
      <div className="absolute top-2 left-2 text-xxs text-edge-dim uppercase tracking-widest">
        {title}
      </div>
      <button
        className="absolute top-2 right-2 text-xxs text-edge-dim hover:text-edge-pale border border-edge-crimson/40 px-2 py-[2px]"
        onClick={() => setCubeMode("faces")}
      >
        ▦ 6-FACE
      </button>
      <div className="absolute bottom-2 left-2 text-xxs text-edge-dim">
        drag · click face · wheel to zoom
      </div>
    </div>
  );
}
