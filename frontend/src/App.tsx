import { useCallback, useRef, useState } from "react";
import type { BotConfig } from "./api";
import { ConfigForm, type ConfigFormHandle } from "./components/ConfigForm";
import { MarketBar } from "./components/MarketBar";
import { NavBar } from "./components/NavBar";
import { StatusDashboard } from "./components/StatusDashboard";
import {
  useBotStatusQuery,
  useStartBotMutation,
  useStopBotMutation,
} from "./hooks/useBotApi";

function App() {
  const [canStart, setCanStart] = useState(false);
  const configFormRef = useRef<ConfigFormHandle>(null);
  const statusQuery = useBotStatusQuery();
  const startMutation = useStartBotMutation();
  const stopMutation = useStopBotMutation();
  const running = statusQuery.data?.running ?? false;
  const loading = startMutation.isPending || stopMutation.isPending;

  const handleStartConfig = useCallback(
    async (config: BotConfig): Promise<void> => {
      await startMutation.mutateAsync(config);
    },
    [startMutation]
  );

  const handleStopBot = useCallback(async (): Promise<void> => {
    await stopMutation.mutateAsync();
  }, [stopMutation]);

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
        symbol={statusQuery.data?.config?.symbol}
        accountValue={statusQuery.data?.pnl?.accountValue}
        unrealizedPnl={statusQuery.data?.pnl?.unrealizedPnl}
        running={running}
      />
      <div className="flex flex-1">
        <main className="min-w-0 flex-1 p-6">
          <StatusDashboard
            running={running}
            status={statusQuery.data}
          />
        </main>
        <aside className="w-[380px] shrink-0 border-l border-zinc-800 p-6">
          <ConfigForm
            ref={configFormRef}
            running={running}
            onStartConfig={handleStartConfig}
            onStopBot={handleStopBot}
            loading={loading}
            onCanStartChange={setCanStart}
          />
        </aside>
      </div>
    </div>
  );
}

export default App;
