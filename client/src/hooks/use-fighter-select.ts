import { useState, useRef } from "react";

interface UseFighterSelectProps {
  gridSize: number;
  columns: number;
}

// Twitch = always P1, Kick = always P2.
// Both players navigate simultaneously — no turn system, no cooldown.
export function useFighterSelect({ gridSize, columns }: UseFighterSelectProps) {
  const [p1Cursor, setP1Cursor] = useState(0);
  const [p2Cursor, setP2Cursor] = useState(0);
  const [p1Selection, setP1Selection] = useState<{ index: number; user: string } | null>(null);
  const [p2Selection, setP2Selection] = useState<{ index: number; user: string } | null>(null);
  const [lastP1Action, setLastP1Action] = useState<{ user: string; command: string } | null>(null);
  const [lastP2Action, setLastP2Action] = useState<{ user: string; command: string } | null>(null);

  const p1CursorRef    = useRef(0);
  const p2CursorRef    = useRef(0);
  const p1SelectionRef = useRef<{ index: number; user: string } | null>(null);
  const p2SelectionRef = useRef<{ index: number; user: string } | null>(null);

  p1CursorRef.current    = p1Cursor;
  p2CursorRef.current    = p2Cursor;
  p1SelectionRef.current = p1Selection;
  p2SelectionRef.current = p2Selection;

  const move = (cursor: number, cmd: string): number => {
    const rows       = Math.ceil(gridSize / columns);
    const currentRow = Math.floor(cursor / columns);
    const currentCol = cursor % columns;
    let newIndex     = cursor;

    if (cmd === "!up")    newIndex = currentRow > 0         ? cursor - columns                    : (rows - 1) * columns + currentCol;
    if (cmd === "!down")  newIndex = currentRow < rows - 1  ? cursor + columns                    : currentCol;
    if (cmd === "!left")  newIndex = currentCol > 0         ? cursor - 1                          : currentRow * columns + (columns - 1);
    if (cmd === "!right") newIndex = currentCol < columns-1 ? cursor + 1                          : currentRow * columns;

    return Math.min(newIndex, gridSize - 1);
  };

  // Twitch chat → always P1 (no cooldown)
  const handleP1Command = (user: string, cmd: string) => {
    const DIRECTIONAL = ["!up", "!down", "!left", "!right"];
    if (DIRECTIONAL.includes(cmd)) {
      if (p1SelectionRef.current) return;
      setP1Cursor(move(p1CursorRef.current, cmd));
      setLastP1Action({ user, command: cmd });
    } else if (cmd === "!select" && !p1SelectionRef.current) {
      setP1Selection({ index: p1CursorRef.current, user });
      setLastP1Action({ user, command: cmd });
    }
  };

  // Kick chat → always P2 (no cooldown)
  const handleP2Command = (user: string, cmd: string) => {
    const DIRECTIONAL = ["!up", "!down", "!left", "!right"];
    if (DIRECTIONAL.includes(cmd)) {
      if (p2SelectionRef.current) return;
      setP2Cursor(move(p2CursorRef.current, cmd));
      setLastP2Action({ user, command: cmd });
    } else if (cmd === "!select" && !p2SelectionRef.current) {
      setP2Selection({ index: p2CursorRef.current, user });
      setLastP2Action({ user, command: cmd });
    }
  };

  const reset = () => {
    setP1Cursor(0);
    setP2Cursor(0);
    setP1Selection(null);
    setP2Selection(null);
    setLastP1Action(null);
    setLastP2Action(null);
  };

  return {
    p1Cursor,
    p2Cursor,
    p1Selection,
    p2Selection,
    lastP1Action,
    lastP2Action,
    handleP1Command,
    handleP2Command,
    reset,
  };
}
