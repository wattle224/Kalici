"use client";

import { TerminalProvider, useTerminal } from "@/lib/quantedge/TerminalContext";
import BottomTicker from "./BottomTicker";
import CommandPalette from "./CommandPalette";
import Header from "./Header";
import RiskWorkspace from "./RiskWorkspace";
import SupportWorkspace from "./SupportWorkspace";
import TradingWorkspace from "./TradingWorkspace";

function WorkspaceSwitch() {
  const { workspace } = useTerminal();
  if (workspace === "support") return <SupportWorkspace />;
  if (workspace === "risk") return <RiskWorkspace />;
  return <TradingWorkspace />;
}

export default function AppShell() {
  return (
    <TerminalProvider>
      <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-qe-bg text-qe-text">
        <Header />
        <main className="min-h-0 flex-1 overflow-hidden">
          <WorkspaceSwitch />
        </main>
        <BottomTicker />
        <CommandPalette />
      </div>
    </TerminalProvider>
  );
}
