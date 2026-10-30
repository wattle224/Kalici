"use client";

import { Canvas, useFrame, useThree, ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
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
  normal: THREE.Vector3;
}[] = [
  { pos: [0, 0, 1], rot: [0, 0, 0], normal: new THREE.Vector3(0, 0, 1) },
  { pos: [0, 0, -1], rot: [0, Math.PI, 0], normal: new THREE.Vector3(0, 0, -1) },
  { pos: [1, 0, 0], rot: [0, Math.PI / 2, 0], normal: new THREE.Vector3(1, 0, 0) },
  { pos: [-1, 0, 0], rot: [0, -Math.PI / 2, 0], normal: new THREE.Vector3(-1, 0, 0) },
  { pos: [0, 1, 0], rot: [-Math.PI / 2, 0, 0], normal: new THREE.Vector3(0, 1, 0) },
  { pos: [0, -1, 0], rot: [Math.PI / 2, 0, 0], normal: new THREE.Vector3(0, -1, 0) },
];

const FORWARD = new THREE.Vector3(0, 0, 1);

/** Quaternion that rotates the group so face `i`'s normal points at the camera. */
function faceQuat(i: number): THREE.Quaternion {
  const q = new THREE.Quaternion().setFromUnitVectors(FACE_POS[i].normal, FORWARD);
  return q;
}

function FacePoints({ seed = 1, color = "#ffb4a6" }: { seed?: number; color?: string }) {
  const geom = useMemo(() => {
    let s = seed;
    const rnd = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    const n = 60;
    const positions = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      positions[i * 3] = -0.9 + rnd() * 1.8;
      positions[i * 3 + 1] = -0.9 + rnd() * 1.8;
      positions[i * 3 + 2] = 0.004;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [seed]);
  const ref = useRef<THREE.Points>(null!);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    (ref.current.material as THREE.PointsMaterial).opacity =
      0.4 + Math.sin(clock.getElapsedTime() * 1.5 + seed) * 0.25;
  });
  return (
    <points ref={ref} geometry={geom}>
      <pointsMaterial size={0.025} color={color} transparent />
    </points>
  );
}

/** Paints face content (header + metrics + footer) to a 512x512 canvas and
 *  returns a THREE.CanvasTexture suitable for a plane's map. */
function paintFace(face: CubeFace, active: boolean): THREE.CanvasTexture {
  const size = 512;
  const cvs = document.createElement("canvas");
  cvs.width = size;
  cvs.height = size;
  const ctx = cvs.getContext("2d")!;
  const font =
    'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

  // Background
  ctx.fillStyle = active ? "#120308" : "#0a0a0d";
  ctx.fillRect(0, 0, size, size);

  // Subtle inner grid
  ctx.strokeStyle = active ? "rgba(255,180,166,0.18)" : "rgba(122,11,22,0.35)";
  ctx.lineWidth = 1;
  const cells = 8;
  for (let i = 1; i < cells; i++) {
    const t = (i / cells) * size;
    ctx.beginPath();
    ctx.moveTo(0, t);
    ctx.lineTo(size, t);
    ctx.moveTo(t, 0);
    ctx.lineTo(t, size);
    ctx.stroke();
  }

  // Border + corner marks
  ctx.strokeStyle = active ? "#ffb4a6" : "#a01324";
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, size - 20, size - 20);
  ctx.strokeStyle = active ? "#ffb4a6" : "#a01324";
  ctx.lineWidth = 4;
  const cm = 26;
  // top-left
  ctx.beginPath();
  ctx.moveTo(10, 10 + cm); ctx.lineTo(10, 10); ctx.lineTo(10 + cm, 10);
  // top-right
  ctx.moveTo(size - 10 - cm, 10); ctx.lineTo(size - 10, 10); ctx.lineTo(size - 10, 10 + cm);
  // bottom-left
  ctx.moveTo(10, size - 10 - cm); ctx.lineTo(10, size - 10); ctx.lineTo(10 + cm, size - 10);
  // bottom-right
  ctx.moveTo(size - 10 - cm, size - 10); ctx.lineTo(size - 10, size - 10); ctx.lineTo(size - 10, size - 10 - cm);
  ctx.stroke();

  // Header
  ctx.fillStyle = active ? "#ffb4a6" : "#a01324";
  ctx.font = `bold 20px ${font}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(face.code, 36, 56);
  ctx.fillStyle = "#ffb4a6";
  ctx.font = `bold 22px ${font}`;
  ctx.textAlign = "right";
  ctx.fillText(face.title.toUpperCase(), size - 36, 56);
  ctx.strokeStyle = "rgba(160,19,36,0.75)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(36, 76);
  ctx.lineTo(size - 36, 76);
  ctx.stroke();

  // Metrics
  const topMetrics = 110;
  const rowH = Math.min(60, (size - topMetrics - 90) / Math.max(1, face.metrics.length));
  face.metrics.forEach((m, i) => {
    const y = topMetrics + i * rowH;
    // row divider
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "rgba(160,19,36,0.35)";
    ctx.beginPath();
    ctx.moveTo(36, y + rowH - 8);
    ctx.lineTo(size - 36, y + rowH - 8);
    ctx.stroke();
    ctx.setLineDash([]);
    // label
    ctx.fillStyle = "#9a9aa6";
    ctx.font = `16px ${font}`;
    ctx.textAlign = "left";
    ctx.fillText(m.label.toUpperCase(), 36, y + 24);
    // value
    const tone =
      m.tone === "good"
        ? "#2fe08a"
        : m.tone === "warn"
        ? "#ffb020"
        : m.tone === "bad"
        ? "#ff8a7a"
        : "#ffb4a6";
    ctx.fillStyle = tone;
    ctx.font = `bold 26px ${font}`;
    ctx.textAlign = "right";
    ctx.fillText(m.value, size - 36, y + 28);
  });

  // Footer
  ctx.fillStyle = active ? "#ffb4a6" : "#6b6b76";
  ctx.font = `14px ${font}`;
  ctx.textAlign = "left";
  ctx.fillText("QUANTEDGE // QIC", 36, size - 28);
  ctx.textAlign = "right";
  ctx.fillText(active ? "● SELECTED" : "idle", size - 36, size - 28);

  const tex = new THREE.CanvasTexture(cvs);
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function FaceContent({
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

  // Repaint texture whenever face data or active state changes
  const texture = useMemo(() => paintFace(face, active), [face, active]);
  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  return (
    <group
      position={pos as [number, number, number]}
      rotation={rot as [number, number, number]}
    >
      <mesh
        onPointerDown={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          onPick(index);
        }}
      >
        <planeGeometry args={[2, 2]} />
        <meshBasicMaterial
          map={texture}
          transparent={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <FacePoints seed={(index + 1) * 7} color={face.accent} />
    </group>
  );
}

function Wireframe() {
  return (
    <lineSegments>
      <edgesGeometry args={[new THREE.BoxGeometry(2.002, 2.002, 2.002)]} />
      <lineBasicMaterial color="#ffb4a6" transparent opacity={0.85} />
    </lineSegments>
  );
}

function FloatingParticles() {
  const geom = useMemo(() => {
    const n = 180;
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
    if (ref.current) ref.current.rotation.y += dt * 0.04;
  });
  return (
    <points ref={ref} geometry={geom}>
      <pointsMaterial size={0.015} color="#a01324" transparent opacity={0.55} />
    </points>
  );
}

function CubeScene({
  faces,
  onPick,
  currentFront,
  setCurrentFront,
  autoCycle,
  pinFace,
}: {
  faces: CubeFace[];
  onPick: (i: number) => void;
  currentFront: number;
  setCurrentFront: (i: number) => void;
  autoCycle: boolean;
  pinFace: (i: number) => void;
}) {
  const group = useRef<THREE.Group>(null!);
  const selected = useAppStore((s) => s.selectedCubeFace);
  const { gl } = useThree();

  const targetQuat = useRef<THREE.Quaternion>(faceQuat(0));
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const lastCycle = useRef<number>(performance.now());

  useEffect(() => {
    targetQuat.current = faceQuat(currentFront);
    lastCycle.current = performance.now();
  }, [currentFront]);

  useEffect(() => {
    const el = gl.domElement;
    const onDown = (e: PointerEvent) => {
      dragging.current = true;
      last.current = { x: e.clientX, y: e.clientY };
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging.current || !group.current) return;
      const dx = (e.clientX - last.current.x) * 0.006;
      const dy = (e.clientY - last.current.y) * 0.006;
      const qy = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        dx
      );
      const qx = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(1, 0, 0),
        dy
      );
      group.current.quaternion.premultiply(qy).premultiply(qx);
      targetQuat.current.copy(group.current.quaternion);
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

  useFrame((_, dt) => {
    if (!group.current) return;
    const now = performance.now();

    if (autoCycle && !dragging.current && now - lastCycle.current > 5000) {
      lastCycle.current = now;
      setCurrentFront((currentFront + 1) % 6);
    }

    if (!dragging.current) {
      const q = group.current.quaternion;
      q.slerp(targetQuat.current, Math.min(1, dt * 2.2));
    }
  });

  return (
    <>
      <ambientLight intensity={0.7} />
      <FloatingParticles />
      <group ref={group} scale={1.05}>
        <Wireframe />
        {faces.map((f, i) => (
          <FaceContent
            key={i}
            index={i}
            face={f}
            active={selected === i || currentFront === i}
            onPick={(idx) => {
              pinFace(idx);
              onPick(idx);
            }}
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
  const [currentFront, setCurrentFront] = useState(0);
  const [autoCycle, setAutoCycle] = useState(true);
  const pinFace = (i: number) => {
    setCurrentFront(i);
    setAutoCycle(false);
  };

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
                <div className="text-edge-pale text-xxs uppercase">{f.title}</div>
              </div>
              <div className="mt-2 space-y-1">
                {f.metrics.map((m) => (
                  <div key={m.label} className="flex justify-between text-xxs tabular">
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
        camera={{ fov: 38, position: [0, 0, 4.6] }}
      >
        <color attach="background" args={["#060608"]} />
        <CubeScene
          faces={faces}
          onPick={(i) => selectFace(i)}
          currentFront={currentFront}
          setCurrentFront={setCurrentFront}
          autoCycle={autoCycle}
          pinFace={pinFace}
        />
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
      <div className="absolute top-2 right-2 flex items-center gap-2">
        <span className="text-xxs text-edge-dim">
          FACE {currentFront + 1}/6 · {faces[currentFront]?.title}
        </span>
        <button
          className="text-xxs text-edge-dim hover:text-edge-pale border border-edge-crimson/40 px-2 py-[2px]"
          onClick={() => setCubeMode("faces")}
        >
          ▦ 6-FACE
        </button>
      </div>
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-xxs text-edge-dim">
        <span>
          {autoCycle ? "auto-cycling" : "pinned"} · click a face to pin · drag to free-rotate
        </span>
        <div className="flex gap-1 items-center">
          <button
            onClick={() => setAutoCycle((v) => !v)}
            className={
              "text-xxs px-2 border " +
              (autoCycle
                ? "border-edge-green text-edge-green"
                : "border-edge-amber text-edge-amber")
            }
            title={autoCycle ? "Pause auto-cycle" : "Resume auto-cycle"}
          >
            {autoCycle ? "■ PAUSE" : "▶ AUTO"}
          </button>
          {faces.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                pinFace(i);
                selectFace(i);
              }}
              className={
                "w-6 text-xxs tabular border " +
                (i === currentFront
                  ? "border-edge-pale text-edge-pale bg-edge-crimson/15"
                  : "border-edge-crimson/40 text-edge-dim hover:text-edge-text")
              }
            >
              F{i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
