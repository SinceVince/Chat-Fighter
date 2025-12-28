import { useState, useEffect, useRef } from "react";
import tmi from "tmi.js";
import { useToast } from "@/hooks/use-toast";

interface UseTwitchControlsProps {
  gridSize: number; // Total number of items
  columns: number; // Items per row
  enabled: boolean;
}

export function useTwitchControls({ gridSize, columns, enabled }: UseTwitchControlsProps) {
  const [client, setClient] = useState<tmi.Client | null>(null);
  const [channel, setChannel] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  const [cursorIndex, setCursorIndex] = useState(0);
  const [lastAction, setLastAction] = useState<{ user: string; command: string } | null>(null);
  const [selection, setSelection] = useState<{ index: number; user: string } | null>(null);
  const { toast } = useToast();

  const cursorRef = useRef(cursorIndex);
  cursorRef.current = cursorIndex; // Keep ref updated for closure access

  useEffect(() => {
    return () => {
      if (client) {
        client.disconnect().catch(console.error);
      }
    };
  }, [client]);

  const connect = async (channelName: string) => {
    if (!channelName) return;
    
    // Disconnect existing if any
    if (client) {
      await client.disconnect().catch(() => {});
    }

    const newClient = new tmi.Client({
      channels: [channelName],
    });

    newClient.on("message", (channel, tags, message, self) => {
      if (self) return;
      
      const cmd = message.toLowerCase().trim();
      const user = tags["display-name"] || "Anonymous";

      let newIndex = cursorRef.current;
      const rows = Math.ceil(gridSize / columns);
      const currentRow = Math.floor(newIndex / columns);
      const currentCol = newIndex % columns;

      let handled = false;

      // Handle simple directional commands
      if (cmd === "!up") {
        if (currentRow > 0) newIndex -= columns;
        else newIndex = (rows - 1) * columns + currentCol; // Wrap to bottom
        handled = true;
      } else if (cmd === "!down") {
        if (currentRow < rows - 1) newIndex += columns;
        else newIndex = currentCol; // Wrap to top
        handled = true;
      } else if (cmd === "!left") {
        if (currentCol > 0) newIndex -= 1;
        else newIndex = currentRow * columns + (columns - 1); // Wrap to right
        handled = true;
      } else if (cmd === "!right") {
        if (currentCol < columns - 1) newIndex += 1;
        else newIndex = currentRow * columns; // Wrap to left
        handled = true;
      } else if (cmd === "!select") {
        setSelection({ index: cursorRef.current, user });
        handled = true;
      }

      // Boundary check for the last row if it's incomplete
      if (newIndex >= gridSize) {
        newIndex = gridSize - 1;
      }

      if (handled) {
        setCursorIndex(newIndex);
        setLastAction({ user, command: cmd });
      }
    });

    try {
      await newClient.connect();
      setClient(newClient);
      setChannel(channelName);
      setIsConnected(true);
      toast({
        title: "Connected to Twitch",
        description: `Listening to chat in #${channelName}`,
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Connection Failed",
        description: "Could not connect to Twitch chat.",
      });
      setIsConnected(false);
    }
  };

  const disconnect = async () => {
    if (client) {
      await client.disconnect();
      setClient(null);
      setIsConnected(false);
      setChannel("");
    }
  };

  return {
    connect,
    disconnect,
    isConnected,
    channel,
    cursorIndex,
    lastAction,
    selection,
    setCursorIndex, // Manual control for testing
  };
}
