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
  const [p1Selection, setP1Selection] = useState<{ index: number; user: string } | null>(null);
  const [p2Selection, setP2Selection] = useState<{ index: number; user: string } | null>(null);
  const [p1Cursor, setP1Cursor] = useState(0);
  const [p2Cursor, setP2Cursor] = useState(0);
  const [isP1Turn, setIsP1Turn] = useState(true);
  const { toast } = useToast();

  const p1CursorRef = useRef(p1Cursor);
  const p2CursorRef = useRef(p2Cursor);
  const isP1TurnRef = useRef(isP1Turn);
  const userCooldownRef = useRef<Map<string, number>>(new Map());
  const COOLDOWN_MS = 5000; // 5 seconds

  p1CursorRef.current = p1Cursor;
  p2CursorRef.current = p2Cursor;
  isP1TurnRef.current = isP1Turn;

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

      // Check cooldown
      const now = Date.now();
      const lastAction = userCooldownRef.current.get(user) || 0;
      if (now - lastAction < COOLDOWN_MS) {
        return; // Ignore if within cooldown
      }

      // Update cooldown
      userCooldownRef.current.set(user, now);

      const currentTurn = isP1TurnRef.current;
      const currentCursor = currentTurn ? p1CursorRef.current : p2CursorRef.current;
      let newIndex = currentCursor;
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
        if (currentTurn && !p1Selection) {
          setP1Selection({ index: currentCursor, user });
          setIsP1Turn(false);
          setP2Cursor(0);
        } else if (!currentTurn && !p2Selection) {
          setP2Selection({ index: currentCursor, user });
        }
        handled = true;
      }

      // Boundary check for the last row if it's incomplete
      if (newIndex >= gridSize) {
        newIndex = gridSize - 1;
      }

      if (handled) {
        if (currentTurn) {
          setP1Cursor(newIndex);
        } else {
          setP2Cursor(newIndex);
        }
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
      setP1Selection(null);
      setP2Selection(null);
      setIsP1Turn(true);
      setP1Cursor(0);
      setP2Cursor(0);
      userCooldownRef.current.clear();
    }
  };

  return {
    connect,
    disconnect,
    isConnected,
    channel,
    cursorIndex: isP1Turn ? p1Cursor : p2Cursor,
    lastAction,
    p1Selection,
    p2Selection,
    isP1Turn,
    p1Cursor,
    p2Cursor,
    setCursorIndex: isP1Turn ? setP1Cursor : setP2Cursor,
  };
}
