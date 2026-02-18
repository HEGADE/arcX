import { useCallback, useRef, useState } from "react";
import { ConfigForm, type ConfigFormHandle } from "./components/ConfigForm";
import { MarketBar } from "./components/MarketBar";
import { NavBar } from "./components/NavBar";
import { StatusDashboard } from "./components/StatusDashboard";
import type { BotStatus } from "./api";

function App() {
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [canStart, setCanStart] = useState(false);
  const [status, setStatus] = useState<BotStatus | null>(null);
  const configFormRef = useRef<ConfigFormHandle>(null);

  const handleStatusChange = useCallback((s: BotStatus) => {
    setStatus(s);
    setRunning(s.running);
  }, []);

  const handleStartStop = useCallback(() => {
    if (running) {
      configFormRef.current?.triggerStop();
    } else {
      configFormRef.current?.triggerStart();
    }
  }, [running]);

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar
        running={running}
        onStartStop={handleStartStop}
        startStopLoading={loading}
        canStart={canStart}
      />
      <MarketBar
        symbol={status?.config?.symbol}
        accountValue={status?.pnl?.accountValue}
        unrealizedPnl={status?.pnl?.unrealizedPnl}
        running={running}
      />
      <div className="flex flex-1">
        <main className="min-w-0 flex-1 p-6">
          <StatusDashboard
            running={running}
            onStatusChange={handleStatusChange}
          />
        </main>
        <aside className="w-[380px] shrink-0 border-l border-zinc-800 p-6">
          <ConfigForm
            ref={configFormRef}
            running={running}
            onStart={() => setRunning(true)}
            onStop={() => setRunning(false)}
            onLoadingChange={setLoading}
            onCanStartChange={setCanStart}
          />
        </aside>
      </div>
    </div>
  );
}

export default App;
