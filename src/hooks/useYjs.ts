import { useEffect, useRef, useCallback } from "react";
import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";
import { useSyncStore } from "../store/syncStore";

const SIGNALING = ["wss://signaling.yjs.dev"];

const delay = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

export function useYjs(roomId: string | null) {
  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebrtcProvider | null>(null);

  const {
    setConnectionState,
    setSyncPhase,
    addPeer,
    removePeer,
    setLastSync,
    clearPending,
  } = useSyncStore();

  useEffect(() => {
    if (!roomId) return;

    const doc = new Y.Doc();
    docRef.current = doc;

    setConnectionState("connecting");

    const provider = new WebrtcProvider(roomId, doc, {
      signaling: SIGNALING,
    });
    providerRef.current = provider;

    provider.on("synced", ({ synced }: { synced: boolean }) => {
      setConnectionState(synced ? "connected" : "connecting");
    });

    provider.awareness.on("change", () => {
      const states = provider.awareness.getStates();
      states.forEach((state, clientId) => {
        if (clientId !== doc.clientID && state.user) {
          addPeer({
            id: String(clientId),
            name: (state.user as { name?: string }).name ?? `Peer ${clientId}`,
            connected: true,
            lastSeen: Date.now(),
          });
        }
      });
    });

    provider.awareness.setLocalStateField("user", { name: "Local" });

    return () => {
      const states = provider.awareness.getStates();
      states.forEach((_s, id) => {
        if (id !== doc.clientID) removePeer(String(id));
      });
      provider.destroy();
      doc.destroy();
      docRef.current = null;
      providerRef.current = null;
      setConnectionState("offline");
    };
  }, [roomId]);

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

  return {
    doc: docRef.current,
    provider: providerRef.current,
    triggerSync,
  };
}
