import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getStatus, startBot, stopBot, type BotConfig } from "../api";

export const BOT_STATUS_QUERY_KEY = ["bot", "status"] as const;

export function useBotStatusQuery() {
  return useQuery({
    queryKey: BOT_STATUS_QUERY_KEY,
    queryFn: getStatus,
    refetchInterval: (query) => (query.state.data?.running ? 2500 : false),
  });
}

export function useStartBotMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (config: BotConfig) => {
      const result = await startBot(config);
      if (!result.ok) {
        throw new Error(result.error || "Failed to start");
      }
      return result;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: BOT_STATUS_QUERY_KEY });
    },
  });
}

export function useStopBotMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const result = await stopBot();
      if (!result.ok) {
        throw new Error(result.error || "Failed to stop");
      }
      return result;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: BOT_STATUS_QUERY_KEY });
    },
  });
}
