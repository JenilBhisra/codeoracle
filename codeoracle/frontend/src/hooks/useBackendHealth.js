import { useCallback, useEffect, useState } from "react";
import { checkHealth } from "../services/api";

/** Tracks backend reachability: connecting | connected | offline. */
export function useBackendHealth(intervalMs = 45000) {
  const [connection, setConnection] = useState("connecting");

  const probe = useCallback(async () => {
    setConnection((current) => (current === "connected" ? current : "connecting"));
    try {
      await checkHealth();
      setConnection("connected");
    } catch {
      setConnection("offline");
    }
  }, []);

  useEffect(() => {
    probe();
    const timer = setInterval(probe, intervalMs);
    return () => clearInterval(timer);
  }, [probe, intervalMs]);

  return { connection, recheck: probe };
}
