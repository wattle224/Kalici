import type { ReactNode } from "react";

export function Panel({
  title,
  code,
  right,
  children,
  className = "",
  scan = false,
}: {
  title: string;
  code?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  scan?: boolean;
}) {
  return (
    <section className={"panel relative flex flex-col " + className}>
      <span className="corner corner-tl" />
      <span className="corner corner-tr" />
      <span className="corner corner-bl" />
      <span className="corner corner-br" />
      <header className="panel-header">
        <div className="flex items-center gap-2">
          {code && (
            <span className="text-edge-crimson/80 text-xxs">{code}</span>
          )}
          <span>{title}</span>
          {scan && (
            <span className="scanbar inline-block w-16 h-[2px] bg-edge-crimson/20 ml-2" />
          )}
        </div>
        <div className="text-edge-dim text-xxs">{right}</div>
      </header>
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </section>
  );
}
