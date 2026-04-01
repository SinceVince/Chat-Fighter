import { motion } from "framer-motion";
import type { Fighter } from "@shared/schema";

// Hand cursor images — black background removed via mix-blend-mode: screen
const P1_HAND = "/images/cursor-p1.png";
const P2_HAND = "/images/cursor-p2.png";

interface FighterCardProps {
  fighter: Fighter;
  isActive: boolean;
  isSelected: boolean;
  isP1Active?: boolean;
  isP2Active?: boolean;
  onClick?: () => void;
}

export function FighterCard({ fighter, isActive, isSelected, isP1Active, isP2Active, onClick }: FighterCardProps) {
  const isHighlighted = isP1Active || isP2Active;
  const color         = isP2Active ? "#ff4d4d" : "#5b7fff";
  const handSrc       = isP2Active ? P2_HAND : P1_HAND;
  const cursorId      = isP2Active ? "cursor-p2" : "cursor-p1";

  return (
    <div
      className="relative flex flex-col items-center"
      style={{ paddingTop: 28 }}
      onClick={onClick}
      data-testid={`fighter-card-${fighter.id}`}
    >
      {/* ── Hand cursor (Smash Bros style) ── */}
      {isHighlighted && (
        <motion.div
          layoutId={cursorId}
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            x: "-50%",
            zIndex: 40,
            pointerEvents: "none",
          }}
          transition={{ type: "spring", stiffness: 380, damping: 34 }}
        >
          <img
            src={handSrc}
            alt={isP2Active ? "P2 cursor" : "P1 cursor"}
            style={{
              width: 52,
              height: 52,
              objectFit: "contain",
              // screen blend removes black background completely
              mixBlendMode: "screen",
              // flip vertically so finger points down at the fighter
              transform: "scaleY(-1)",
              filter: isP2Active
                ? "drop-shadow(0 0 6px #ff4d4dcc)"
                : "drop-shadow(0 0 6px #5b7fffcc)",
              imageRendering: "auto",
            }}
          />
        </motion.div>
      )}

      {/* ── Fighter image — greyscale unless cursor is on it ── */}
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
            ? `drop-shadow(0 0 16px ${color}) brightness(1.25) saturate(1.3)`
            : "grayscale(1) brightness(0.55)",
          transform: isHighlighted ? "scale(1.18)" : isSelected ? "scale(1.08)" : "scale(1)",
          transition: "transform 0.15s ease, filter 0.15s ease",
          zIndex: isHighlighted ? 20 : 1,
          position: "relative",
        }}
      />

      {/* ── Fighter name — bigger and glowing when active ── */}
      <div
        style={{
          fontSize: isHighlighted ? 13 : 11,
          fontFamily: "monospace",
          fontWeight: isHighlighted ? "bold" : "normal",
          textAlign: "center",
          marginTop: 3,
          maxWidth: "100%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          color: isSelected
            ? "gold"
            : isHighlighted
            ? color
            : "#555",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          textShadow: isHighlighted
            ? `0 0 8px ${color}, 0 0 16px ${color}88`
            : isSelected
            ? "0 0 8px gold, 0 0 16px goldenrod"
            : "none",
          transition: "color 0.15s ease, text-shadow 0.15s ease, font-size 0.15s ease",
        }}
      >
        {fighter.name}
      </div>
    </div>
  );
}
