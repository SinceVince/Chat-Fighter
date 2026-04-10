import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

// Kick uses Pusher under the hood. We connect via raw WebSocket to the Pusher endpoint.
const PUSHER_URL = "wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=8.4.0&flash=false";

interface UseKickControlsProps {
  onCommand: (user: string, cmd: string) => void;
}

export function useKickControls({ onCommand }: UseKickControlsProps) {
  const [channel, setChannel] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (pingRef.current) clearInterval(pingRef.current);
    if (wsRef.current) {
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const connect = async (channelName: string) => {
    if (!channelName) return;
    cleanup();
    let chatroomId: number | null = null;
    const slug = channelName.toLowerCase().trim();

    // If a numeric chatroom ID was entered directly, skip the lookup
    if (/^\d+$/.test(slug)) {
      chatroomId = Number(slug);
    }

    // Step 1: Resolve chatroom ID — try directly from the browser first (avoids
    // Cloudflare blocking server-side requests), then fall back to our proxy.
    let chatroomId: number | null = null;

    // 1a. Direct browser fetch — Kick allows CORS from browsers
    for (const url of [
      `https://kick.com/api/v2/channels/${encodeURIComponent(slug)}`,
      `https://kick.com/api/v1/channels/${encodeURIComponent(slug)}`,
    ]) {
      try {
        const r = await fetch(url, { headers: { Accept: "application/json" } });
        if (!r.ok) continue;
        const d = await r.json();
        if (d?.chatroom?.id) { chatroomId = d.chatroom.id; break; }
      } catch { /* cors / network error — try next */ }
    }

    // 1b. Server-side proxy fallback
    if (!chatroomId) {
      try {
        const res = await fetch(`/api/kick-channel/${encodeURIComponent(slug)}`, {
          signal: AbortSignal.timeout(8000),
        });
        });
        if (res.ok) {
          const data = await res.json();
          chatroomId = data.chatroomId ?? null;
        }
      } catch { /* ignore */ }
    }

    if (!chatroomId) {
      toast({
        variant: "destructive",
        title: "Kick Channel Not Found",
        description: `Could not find Kick channel "${channelName}". Check the channel name and try again.`,
      });
      return;
    }

    // Step 2: Connect to Pusher WebSocket
    const ws = new WebSocket(PUSHER_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      // Subscribe to the chatroom channel
      ws.send(JSON.stringify({
        event: "pusher:subscribe",
        data: { auth: "", channel: `chatrooms.${chatroomId}.v2` },
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        // Respond to Pusher pings
        if (msg.event === "pusher:ping") {
          ws.send(JSON.stringify({ event: "pusher:pong", data: {} }));
          return;
        }
        // Handle subscription failure
        if (msg.event === "pusher_internal:subscription_error") {
          setIsConnected(false);
          toast({
            variant: "destructive",
            title: "Kick Subscription Failed",
            description: `Could not subscribe to channel. Check the channel name is correct.`,
          });
          ws.close();
          return;
        }
        // Confirm subscription
        if (msg.event === "pusher_internal:subscription_succeeded") {
          setChannel(slug);
          setIsConnected(true);
          toast({
            title: "Connected to Kick",
            description: `Listening to kick.com/${slug}`,
          });
          // Keep-alive ping every 30s
          pingRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ event: "pusher:ping", data: {} }));
            }
          }, 30000);
          return;
        }

        // Handle incoming chat messages
        if (msg.event === "App\\Events\\ChatMessageEvent") {
          const payload = typeof msg.data === "string" ? JSON.parse(msg.data) : msg.data;
          const content: string = payload?.content || "";
          const username: string = payload?.sender?.username || payload?.sender?.slug || "Anonymous";
          const cmd = content.toLowerCase().trim();
          onCommand(username, cmd);
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onerror = () => {
      setIsConnected(false);
      toast({
        variant: "destructive",
        title: "Kick Connection Error",
        description: "Lost connection to Kick chat.",
      });
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      if (!event.wasClean && event.code !== 1000) {
        toast({
          variant: "destructive",
          title: "Kick Disconnected",
          description: `Connection closed (code ${event.code}). Try reconnecting.`,
        });
      }
    };
  };

  const disconnect = () => {
    cleanup();
    setIsConnected(false);
    setChannel("");
    toast({
      title: "Disconnected from Kick",
      description: "Kick chat disconnected.",
    });
  };

  return {
    connect,
    disconnect,
    isConnected,
    channel,
  };
}
