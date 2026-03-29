import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

// Kick uses Pusher under the hood. We connect via raw WebSocket to the Pusher endpoint.
const PUSHER_URL = "wss://ws-us2.pusher.com/app/eb1d5f283081a78b932c?protocol=7&client=js&version=7.6.0&flash=false";

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
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const connect = async (channelName: string) => {
    if (!channelName) return;
    cleanup();

    // Step 1: Fetch the Kick chatroom ID via our backend proxy (avoids CORS issues)
    let chatroomId: number;
    try {
      const res = await fetch(`/api/kick-channel/${encodeURIComponent(channelName.toLowerCase())}`);
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Kick Channel Not Found",
          description: `Could not find Kick channel: ${channelName}`,
        });
        return;
      }
      const data = await res.json();
      chatroomId = data.chatroomId;
    } catch {
      toast({
        variant: "destructive",
        title: "Kick Connection Failed",
        description: "Could not look up Kick channel info.",
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

        // Confirm subscription
        if (msg.event === "pusher_internal:subscription_succeeded") {
          setChannel(channelName);
          setIsConnected(true);
          toast({
            title: "Connected to Kick",
            description: `Listening to kick.com/${channelName}`,
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

    ws.onclose = () => {
      setIsConnected(false);
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
