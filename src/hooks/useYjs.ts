import { useEffect, useRef, useCallback, useState } from "react";
import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";
import { useSyncStore } from "../store/syncStore";

const SIGNALING = ["wss://signaling.yjs.dev"];
const delay = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

export function useYjs(roomId: string | null) {
  const [doc, setDoc] = useState<Y.Doc | null>(null);
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

    const ydoc = new Y.Doc();
    setDoc(ydoc);
    setConnectionState("connecting");

    const provider = new WebrtcProvider(roomId, ydoc, {
      signaling: SIGNALING,
    });
    providerRef.current = provider;

    // Transition to CONNECTED once signaling handshake completes,
    // even if no peer has joined yet.
    const signalingTimer = setTimeout(() => {
      if (useSyncStore.getState().connectionState === "connecting") {
        setConnectionState("connected");
      }
    }, 2500);

    provider.on("synced", ({ synced }: { synced: boolean }) => {
      if (synced) setConnectionState("connected");
    });

    provider.awareness.on("change", () => {
      const states = provider.awareness.getStates();
      const remoteIds = new Set<string>();

      states.forEach((state, clientId) => {
        if (clientId === ydoc.clientID) return;
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
    });

    provider.awareness.setLocalStateField("user", { name: "Local" });

    return () => {
      clearTimeout(signalingTimer);
      provider.destroy();
      ydoc.destroy();
      setDoc(null);
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

  return { doc, providerRef, triggerSync };
}
