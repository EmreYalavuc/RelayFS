import { useEffect, useRef, useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";
import { WebsocketProvider } from "y-websocket";
import { useSyncStore } from "../store/syncStore";

// Multiple signaling servers for WebRTC peer discovery
const SIGNALING = [
  "wss://signaling.yjs.dev",
  "wss://y-webrtc-eu.fly.dev",
];

// WebSocket relay — non-blocking fallback for cross-NAT sync
const WS_RELAY = "wss://demos.yjs.dev";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
  { urls: "stun:stun.relay.metered.ca:80" },
];

const delay = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));
const RECONNECT_DELAY_MS = 10_000;

export function useYjs(roomId: string | null) {
  const [doc, setDoc]                   = useState<Y.Doc | null>(null);
  const [reconnectKey, setReconnectKey] = useState(0);
  const providerRef   = useRef<WebrtcProvider | null>(null);
  const wsProviderRef = useRef<WebsocketProvider | null>(null);
  const triggerRef    = useRef<(() => Promise<void>) | null>(null);
  const autoSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPeerCount = useRef(0);

  const {
    setConnectionState,
    setSyncPhase,
    addPeer,
    removePeer,
    setLastSync,
    clearPending,
    setReconnectAt,
    setHostProjectInfo,
    setLocalPeerInfo,
  } = useSyncStore();

  // Initialize persistent peer identity once on mount
  useEffect(() => {
    let peerId = localStorage.getItem("relayfs-peer-id");
    if (!peerId) {
      peerId = Math.random().toString(36).slice(2, 9) + Math.random().toString(36).slice(2, 9);
      localStorage.setItem("relayfs-peer-id", peerId);
    }
    invoke<{ hostname: string; local_ip: string }>("get_local_info")
      .then(({ hostname, local_ip }) => {
        setLocalPeerInfo({ peerId, peerName: hostname, peerIp: local_ip });
      })
      .catch(() => {
        setLocalPeerInfo({ peerId, peerName: "unknown", peerIp: "unknown" });
      });
  }, []);

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

    // ── WebRTC provider (P2P + signaling for awareness) ────────────────────
    const provider = new WebrtcProvider(roomId, ydoc, {
      signaling: SIGNALING,
      peerOpts: { config: { iceServers: ICE_SERVERS } },
    });
    providerRef.current = provider;

    // ── WebSocket relay — wrapped so a failure never crashes the app ────────
    let wsProvider: WebsocketProvider | null = null;
    try {
      wsProvider = new WebsocketProvider(WS_RELAY, roomId, ydoc, { connect: true });
      wsProviderRef.current = wsProvider;
    } catch (e) {
      console.warn("[relayfs] WS relay unavailable:", e);
    }

    // ── Awareness processing ───────────────────────────────────────────────
    const readStates = (states: Map<number, Record<string, unknown>>) => {
      const myId    = ydoc.clientID;
      const ids     = new Set<string>();
      let count     = 0;

      states.forEach((state, clientId) => {
        if (clientId === myId) return;
        count++;
        ids.add(String(clientId));

        const u = state.user as { name?: string } | undefined;
        if (u?.name) addPeer({ id: String(clientId), name: u.name, connected: true, lastSeen: Date.now() });

        const hp = state.hostProject as { name?: string; fileCount?: number } | undefined;
        if (hp?.name) setHostProjectInfo({ name: hp.name, fileCount: hp.fileCount ?? 0 });
      });

      return { ids, count };
    };

    const onAwarenessChange = () => {
      const r1 = readStates(provider.awareness.getStates());
      const r2 = wsProvider ? readStates(wsProvider.awareness.getStates()) : { ids: new Set<string>(), count: 0 };

      const allIds   = new Set([...r1.ids, ...r2.ids]);
      const total    = allIds.size;

      useSyncStore.getState().peers.forEach((p) => {
        if (!allIds.has(p.id)) removePeer(p.id);
      });

      if (prevPeerCount.current > 0 && total === 0) {
        setConnectionState("diverged");
        setReconnectAt(Date.now() + RECONNECT_DELAY_MS);
      }
      prevPeerCount.current = total;
    };

    // ── Broadcast local state to both transports ───────────────────────────
    const broadcastSelf = () => {
      const { appMode, project, localPeerInfo } = useSyncStore.getState();

      const userField = {
        name: appMode === "host" ? "Host" : "Guest",
        peerId:    localPeerInfo?.peerId   ?? "",
        peerName:  localPeerInfo?.peerName ?? "",
        peerIp:    localPeerInfo?.peerIp   ?? "",
      };

      const state = appMode === "host" && project
        ? { user: userField, hostProject: { name: project.name, fileCount: project.fileCount } }
        : { user: userField };

      provider.awareness.setLocalState(state);
      wsProvider?.awareness.setLocalState(state);
    };

    // ── Event wiring ───────────────────────────────────────────────────────
    provider.on("synced", ({ synced }: { synced: boolean }) => {
      if (synced) { setConnectionState("connected"); onAwarenessChange(); }
    });

    wsProvider?.on("status", ({ status }: { status: string }) => {
      if (status === "connected") {
        setConnectionState("connected");
        broadcastSelf();
        setTimeout(onAwarenessChange, 400);
      }
    });

    provider.awareness.on("change", onAwarenessChange);
    wsProvider?.awareness.on("change", onAwarenessChange);

    broadcastSelf();

    // Heartbeat: host keeps project info alive; guest stays visible to host
    const heartbeat = setInterval(broadcastSelf, 4000);

    // After 3 s, unblock the UI regardless of signaling state
    const signalingTimer = setTimeout(() => {
      if (useSyncStore.getState().connectionState === "connecting") {
        setConnectionState("connected");
      }
    }, 3000);

    const onDocUpdate = (_data: Uint8Array, origin: unknown) => {
      if (origin === "local-disk") return;
      if (!useSyncStore.getState().autoSync) return;
      if (autoSyncTimer.current) clearTimeout(autoSyncTimer.current);
      autoSyncTimer.current = setTimeout(() => { triggerRef.current?.(); }, 400);
    };
    ydoc.on("update", onDocUpdate);

    return () => {
      clearTimeout(signalingTimer);
      clearInterval(heartbeat);
      if (autoSyncTimer.current) clearTimeout(autoSyncTimer.current);
      ydoc.off("update", onDocUpdate);
      provider.awareness.off("change", onAwarenessChange);
      wsProvider?.awareness.off("change", onAwarenessChange);
      provider.destroy();
      wsProvider?.destroy();
      ydoc.destroy();
      setDoc(null);
      providerRef.current   = null;
      wsProviderRef.current = null;
      setConnectionState("offline");
    };
  }, [roomId, reconnectKey]);

  return { doc, providerRef, triggerSync, reconnect };
}
