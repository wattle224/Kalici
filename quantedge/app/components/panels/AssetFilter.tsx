"use client";

import { ASSET_CLASSES } from "../../data/markets";
import { useAppStore } from "../../store/useAppStore";

export function AssetFilter() {
  const v = useAppStore((s) => s.assetFilter);
  const set = useAppStore((s) => s.setAssetFilter);
  const classes: ("all" | typeof ASSET_CLASSES[number])[] = ["all", ...ASSET_CLASSES];
  return (
    <div className="flex items-center gap-1 text-xxs">
      {classes.map((c) => (
        <button
          key={c}
          onClick={() => set(c as never)}
          className={
            "px-2 py-[2px] border uppercase tracking-widest " +
            (v === c
              ? "border-edge-pale text-edge-pale bg-edge-crimson/15"
              : "border-edge-crimson/40 text-edge-dim hover:text-edge-text")
          }
        >
          {c}
        </button>
      ))}
    </div>
  );
}
