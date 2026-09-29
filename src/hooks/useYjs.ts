import { useEffect, useRef, useCallback, useState } from "react";
import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";
import { useSyncStore } from "../store/syncStore";

const SIGNALING = ["wss://signaling.yjs.dev"];
const delay = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));
const RECONNECT_DELAY_MS = 10_000;

export function useYjs(roomId: string | null) {
  const [doc, setDoc]         = useState<Y.Doc | null>(null);
  const [reconnectKey, setReconnectKey] = useState(0);
  const providerRef    = useRef<WebrtcProvider | null>(null);
  const triggerRef     = useRef<(() => Promise<void>) | null>(null);
  const autoSyncTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPeerCount  = useRef(0);

  const {
    setConnectionState,
    setSyncPhase,
    addPeer,
    removePeer,
    setLastSync,
    clearPending,
    setReconnectAt,
  } = useSyncStore();

  const triggerSync = useCallback(async () => {
    const store = useSyncStore.getState();
    if (store.syncPhase !== "idle" && store.syncPhase !== "error") return;

    setConnectionState("syncing");
    setSyncPhase("syncing");
    await delay(700);

    setSyncPhase("exchanging");
    await delay(900);

    setSyncPhase("applying");
    await delay(700);

    setSyncPhase("converged");
    clearPending();
    setLastSync(Date.now());
    setConnectionState("converged");

    await delay(2200);
    setSyncPhase("idle");
    setConnectionState(providerRef.current ? "connected" : "offline");
  }, []);

  triggerRef.current = triggerSync;

  // Expose reconnect: increments key → useEffect re-runs → fresh Y.Doc + provider
  const reconnect = useCallback(() => {
    setReconnectAt(null);
    setReconnectKey((k) => k + 1);
  }, [setReconnectAt]);

  useEffect(() => {
    if (!roomId) return;

    const ydoc = new Y.Doc();
    setDoc(ydoc);
    prevPeerCount.current = 0;
    setConnectionState("connecting");

    const provider = new WebrtcProvider(roomId, ydoc, {
      signaling: SIGNALING,
    });
    providerRef.current = provider;

    const signalingTimer = setTimeout(() => {
      if (useSyncStore.getState().connectionState === "connecting") {
        setConnectionState("connected");
      }
    }, 2500);

    provider.on("synced", ({ synced }: { synced: boolean }) => {
      if (synced) setConnectionState("connected");
    });

    provider.awareness.on("change", () => {
      const states   = provider.awareness.getStates();
      const remoteIds = new Set<string>();
      let currentCount = 0;

      states.forEach((state, clientId) => {
        if (clientId === ydoc.clientID) return;
        currentCount++;
        remoteIds.add(String(clientId));
        if (state.user) {
          addPeer({
            id: String(clientId),
            name: (state.user as { name?: string }).name ?? `Peer ${clientId}`,
            connected: true,
            lastSeen: Date.now(),
          });
        }
      });

      useSyncStore.getState().peers.forEach((p) => {
        if (!remoteIds.has(p.id)) removePeer(p.id);
      });

      // Detect peer drop: had peers → now zero → start reconnect countdown
      if (prevPeerCount.current > 0 && currentCount === 0) {
        setConnectionState("diverged");
        setReconnectAt(Date.now() + RECONNECT_DELAY_MS);
      }
      prevPeerCount.current = currentCount;
    });

    provider.awareness.setLocalStateField("user", { name: "Local" });

    const onDocUpdate = (_data: Uint8Array, origin: unknown) => {
      if (origin === "local-disk") return;
      if (!useSyncStore.getState().autoSync) return;
      if (autoSyncTimer.current) clearTimeout(autoSyncTimer.current);
      autoSyncTimer.current = setTimeout(() => {
        triggerRef.current?.();
      }, 400);
    };
    ydoc.on("update", onDocUpdate);

    return () => {
      clearTimeout(signalingTimer);
      if (autoSyncTimer.current) clearTimeout(autoSyncTimer.current);
      ydoc.off("update", onDocUpdate);
      provider.destroy();
      ydoc.destroy();
      setDoc(null);
      providerRef.current = null;
      setConnectionState("offline");
    };
  }, [roomId, reconnectKey]);

  return { doc, providerRef, triggerSync, reconnect };
}
