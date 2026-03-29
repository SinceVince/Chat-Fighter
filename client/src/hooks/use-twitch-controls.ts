import { useState, useEffect } from "react";
import tmi from "tmi.js";
import { useToast } from "@/hooks/use-toast";

interface UseTwitchControlsProps {
  onCommand: (user: string, cmd: string) => void;
}

export function useTwitchControls({ onCommand }: UseTwitchControlsProps) {
  const [client, setClient] = useState<tmi.Client | null>(null);
  const [channel, setChannel] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (client) client.disconnect().catch(console.error);
    };
  }, [client]);

  const connect = async (channelName: string) => {
    if (!channelName) return;
    if (client) await client.disconnect().catch(() => {});

    const newClient = new tmi.Client({ channels: [channelName] });

    newClient.on("message", (_ch, tags, message, self) => {
      if (self) return;
      const cmd = message.toLowerCase().trim();
      const user = tags["display-name"] || "Anonymous";
      onCommand(user, cmd);
    });

    try {
      await newClient.connect();
      setClient(newClient);
      setChannel(channelName);
      setIsConnected(true);
      toast({
        title: "Connected to Twitch",
        description: `Listening to #${channelName}`,
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Twitch Connection Failed",
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

  return { connect, disconnect, isConnected, channel };
}
