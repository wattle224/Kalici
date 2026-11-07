"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { SERVICES, type Service } from "../../data/system";

type N = Service & d3.SimulationNodeDatum;
type L = d3.SimulationLinkDatum<N> & { animOffset: number };

const COLOR: Record<Service["status"], string> = {
  healthy: "#2fe08a",
  degraded: "#ffb020",
  failed: "#ff8a7a",
  unknown: "#6b6b76",
};

export function ServiceGraph({
  onPick,
  selectedId,
}: {
  onPick: (id: string) => void;
  selectedId: string | null;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dims, setDims] = useState({ w: 400, h: 400 });

  useEffect(() => {
    const el = svgRef.current!;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setDims({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { nodes, links } = useMemo(() => {
    const nodes: N[] = SERVICES.map((s) => ({ ...s }));
    const idx = new Map(nodes.map((n) => [n.id, n]));
    const links: L[] = [];
    for (const s of SERVICES) {
      for (const dep of s.deps) {
        const target =
          idx.get(dep) ??
          nodes.find((n) => n.name === dep) ??
          null;
        if (!target) continue;
        links.push({
          source: idx.get(s.id)!,
          target,
          animOffset: Math.random(),
        });
      }
    }
    return { nodes, links };
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;
    const sim = d3
      .forceSimulation<N>(nodes)
      .force(
        "link",
        d3
          .forceLink<N, L>(links)
          .id((d) => d.id)
          .distance(70)
          .strength(0.5)
      )
      .force("charge", d3.forceManyBody().strength(-220))
      .force("center", d3.forceCenter(dims.w / 2, dims.h / 2))
      .force("collide", d3.forceCollide<N>().radius(22));

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g");
    const linkG = g.append("g").attr("stroke-opacity", 0.6).attr("fill", "none");
    const nodeG = g.append("g");

    const linkSel = linkG
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", (d) => {
        const t = d.target as N;
        return t.status === "failed"
          ? "#ff8a7a"
          : t.status === "degraded"
          ? "#ffb020"
          : "rgba(160,19,36,0.6)";
      })
      .attr("stroke-width", 1);

    const particleSel = linkG
      .selectAll("circle.flow")
      .data(links)
      .enter()
      .append("circle")
      .attr("class", "flow")
      .attr("r", 1.6)
      .attr("fill", "#ffb4a6");

    const nodeSel = nodeG
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .style("cursor", "pointer")
      .on("click", (_, d) => onPick(d.id));

    nodeSel
      .append("circle")
      .attr("r", 10)
      .attr("fill", (d) => COLOR[d.status])
      .attr("fill-opacity", 0.2)
      .attr("stroke", (d) => COLOR[d.status])
      .attr("stroke-width", 1);

    nodeSel
      .append("circle")
      .attr("r", 3.2)
      .attr("fill", (d) => COLOR[d.status]);

    nodeSel
      .append("text")
      .attr("dy", -14)
      .attr("text-anchor", "middle")
      .attr("fill", "#e6e6ea")
      .attr("font-size", 9)
      .attr("font-family", "JetBrains Mono, monospace")
      .text((d) => d.name);

    nodeSel
      .append("text")
      .attr("dy", 22)
      .attr("text-anchor", "middle")
      .attr("fill", "#6b6b76")
      .attr("font-size", 8)
      .attr("font-family", "JetBrains Mono, monospace")
      .text((d) => d.group.toUpperCase());

    const drag = d3
      .drag<SVGGElement, N>()
      .on("start", (event, d) => {
        if (!event.active) sim.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) sim.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
    nodeSel.call(drag);

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.4, 3])
      .on("zoom", (event) => g.attr("transform", event.transform.toString()));
    svg.call(zoom);

    let frame = 0;
    const tick = () => {
      frame = requestAnimationFrame(tick);
      linkSel
        .attr("x1", (d) => (d.source as N).x!)
        .attr("y1", (d) => (d.source as N).y!)
        .attr("x2", (d) => (d.target as N).x!)
        .attr("y2", (d) => (d.target as N).y!);
      const now = performance.now() / 1200;
      particleSel.each(function (d) {
        const t = ((now + d.animOffset) % 1);
        const s = d.source as N;
        const tgt = d.target as N;
        if (s.x == null || tgt.x == null) return;
        d3.select(this)
          .attr("cx", s.x + (tgt.x - s.x) * t)
          .attr("cy", s.y! + (tgt.y! - s.y!) * t);
      });
      nodeSel.attr("transform", (d) => `translate(${d.x},${d.y})`);
    };
    tick();

    return () => {
      cancelAnimationFrame(frame);
      sim.stop();
    };
  }, [nodes, links, dims, onPick]);

  useEffect(() => {
    if (!svgRef.current) return;
    d3.select(svgRef.current)
      .selectAll<SVGCircleElement, N>("g > circle:first-child")
      .attr("r", (d) => (d.id === selectedId ? 14 : 10))
      .attr("stroke-width", (d) => (d.id === selectedId ? 2 : 1));
  }, [selectedId]);

  return (
    <svg
      ref={svgRef}
      className="w-full h-full"
      style={{ background: "transparent" }}
    />
  );
}
