import { motion } from "framer-motion";
import type { Fighter } from "@shared/schema";

interface FighterCardProps {
  fighter: Fighter;
  isActive: boolean;
  isSelected: boolean;
  isP1Active?: boolean;
  isP2Active?: boolean;
  onClick?: () => void;
}

// ── Smash-Bros-style gloved hand cursor ─────────────────────────────────────
function HandCursor({ player }: { player: 1 | 2 }) {
  const cuffColor  = player === 1 ? "#5b7fff" : "#ff4d4d";
  const gloveLight = player === 1 ? "#d8e4ff" : "#ffe0e0";
  const label      = player === 1 ? "P1" : "P2";

  return (
    <svg
      width="46"
      height="62"
      viewBox="0 0 46 62"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: `drop-shadow(0 2px 6px ${cuffColor}cc)` }}
    >
      {/* Cuff with P label */}
      <rect x="5" y="0" width="36" height="15" rx="5" fill={cuffColor} />
      <rect x="7" y="2" width="32" height="5" rx="2" fill="rgba(255,255,255,0.2)" />
      <text x="23" y="12" textAnchor="middle" fill="white" fontFamily="monospace" fontSize="8" fontWeight="bold">
        {label}
      </text>

      {/* Palm */}
      <rect x="5" y="13" width="36" height="24" rx="7" fill="white" />
      <rect x="8" y="15" width="30" height="4" rx="2" fill={gloveLight} />

      {/* Curled finger bumps (3 knuckles) */}
      <ellipse cx="12" cy="15" rx="5" ry="3.5" fill="#ececec" />
      <ellipse cx="23" cy="14" rx="5" ry="3.5" fill="#ececec" />
      <ellipse cx="34" cy="15" rx="5" ry="3.5" fill="#ececec" />

      {/* Index finger pointing down */}
      <rect x="18" y="33" width="10" height="27" rx="5" fill="white" />
      <rect x="19.5" y="35" width="7" height="3" rx="1.5" fill={gloveLight} />

      {/* Knuckle crease */}
      <line x1="18" y1="45" x2="28" y2="45" stroke="#ddd" strokeWidth="1.5" strokeLinecap="round" />

      {/* Finger tip highlight */}
      <ellipse cx="23" cy="58" rx="4.5" ry="2.5" fill="#ddd" />
    </svg>
  );
}

// ── Fighter card — no box, just image + name ─────────────────────────────────
export function FighterCard({ fighter, isActive, isSelected, isP1Active, isP2Active, onClick }: FighterCardProps) {
  const isHighlighted = isP1Active || isP2Active;
  const color         = isP2Active ? "#ff4d4d" : "#5b7fff";
  const player        = isP2Active ? 2 : 1;

  return (
    <div
      className="relative flex flex-col items-center"
      style={{ paddingTop: 56 }} // room for the hand cursor above
      onClick={onClick}
      data-testid={`fighter-card-${fighter.id}`}
    >
      {/* ── Hand cursor ── */}
      {isHighlighted && (
        <motion.div
          layoutId={isP2Active ? "cursor-p2" : "cursor-p1"}
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            x: "-50%",
            zIndex: 40,
            pointerEvents: "none",
          }}
          transition={{ type: "spring", stiffness: 350, damping: 32 }}
        >
          <HandCursor player={player} />
        </motion.div>
      )}

      {/* ── Fighter image ── */}
      <img
        src={fighter.imageUrl}
        alt={fighter.name}
        style={{
          width: "100%",
          aspectRatio: "1 / 1",
          objectFit: "contain",
          imageRendering: "pixelated",
          display: "block",
          filter: isSelected
            ? "drop-shadow(0 0 10px gold) brightness(1.1)"
            : isHighlighted
            ? `drop-shadow(0 0 14px ${color}) brightness(1.2)`
            : "brightness(0.65) saturate(0.7)",
          transform: isHighlighted ? "scale(1.15)" : isSelected ? "scale(1.08)" : "scale(1)",
          transition: "transform 0.15s ease, filter 0.15s ease",
          zIndex: isHighlighted ? 20 : 1,
          position: "relative",
        }}
      />

      {/* ── Name label ── */}
      <div
        style={{
          fontSize: 8,
          fontFamily: "monospace",
          textAlign: "center",
          marginTop: 2,
          padding: "2px 4px",
          maxWidth: "100%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          color: isSelected ? "gold" : isHighlighted ? color : "#666",
          textTransform: "uppercase",
          letterSpacing: 1,
          fontWeight: isHighlighted ? "bold" : "normal",
          transition: "color 0.15s ease",
        }}
      >
        {fighter.name}
      </div>
    </div>
  );
}
