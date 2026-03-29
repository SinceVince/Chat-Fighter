import { useState, useRef } from "react";

interface UseFighterSelectProps {
  gridSize: number;
  columns: number;
}

export function useFighterSelect({ gridSize, columns }: UseFighterSelectProps) {
  const [p1Cursor, setP1Cursor] = useState(0);
  const [p2Cursor, setP2Cursor] = useState(0);
  const [isP1Turn, setIsP1Turn] = useState(true);
  const [p1Selection, setP1Selection] = useState<{ index: number; user: string } | null>(null);
  const [p2Selection, setP2Selection] = useState<{ index: number; user: string } | null>(null);
  const [lastAction, setLastAction] = useState<{ user: string; command: string } | null>(null);

  const p1CursorRef = useRef(p1Cursor);
  const p2CursorRef = useRef(p2Cursor);
  const isP1TurnRef = useRef(isP1Turn);
  const p1SelectionRef = useRef(p1Selection);
  const p2SelectionRef = useRef(p2Selection);
  const userCooldownRef = useRef<Map<string, number>>(new Map());
  const COOLDOWN_MS = 5000;

  p1CursorRef.current = p1Cursor;
  p2CursorRef.current = p2Cursor;
  isP1TurnRef.current = isP1Turn;
  p1SelectionRef.current = p1Selection;
  p2SelectionRef.current = p2Selection;

  const handleCommand = (user: string, cmd: string) => {
    const now = Date.now();
    const lastUse = userCooldownRef.current.get(user) || 0;
    if (now - lastUse < COOLDOWN_MS) return;
    userCooldownRef.current.set(user, now);

    const currentTurn = isP1TurnRef.current;
    const currentCursor = currentTurn ? p1CursorRef.current : p2CursorRef.current;
    let newIndex = currentCursor;
    const rows = Math.ceil(gridSize / columns);
    const currentRow = Math.floor(newIndex / columns);
    const currentCol = newIndex % columns;

    let handled = false;

    if (cmd === "!up") {
      newIndex = currentRow > 0 ? newIndex - columns : (rows - 1) * columns + currentCol;
      handled = true;
    } else if (cmd === "!down") {
      newIndex = currentRow < rows - 1 ? newIndex + columns : currentCol;
      handled = true;
    } else if (cmd === "!left") {
      newIndex = currentCol > 0 ? newIndex - 1 : currentRow * columns + (columns - 1);
      handled = true;
    } else if (cmd === "!right") {
      newIndex = currentCol < columns - 1 ? newIndex + 1 : currentRow * columns;
      handled = true;
    } else if (cmd === "!select") {
      if (currentTurn && !p1SelectionRef.current) {
        setP1Selection({ index: currentCursor, user });
        setIsP1Turn(false);
        setP2Cursor(0);
      } else if (!currentTurn && !p2SelectionRef.current) {
        setP2Selection({ index: currentCursor, user });
      }
      handled = true;
    }

    if (newIndex >= gridSize) newIndex = gridSize - 1;

    if (handled) {
      if (currentTurn) setP1Cursor(newIndex);
      else setP2Cursor(newIndex);
      setLastAction({ user, command: cmd });
    }
  };

  const reset = () => {
    setP1Cursor(0);
    setP2Cursor(0);
    setIsP1Turn(true);
    setP1Selection(null);
    setP2Selection(null);
    setLastAction(null);
    userCooldownRef.current.clear();
  };

  return {
    p1Cursor,
    p2Cursor,
    isP1Turn,
    p1Selection,
    p2Selection,
    lastAction,
    handleCommand,
    reset,
  };
}
