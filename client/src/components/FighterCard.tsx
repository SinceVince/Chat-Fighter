import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Fighter } from "@shared/schema";

interface FighterCardProps {
  fighter: Fighter;
  isActive: boolean;
  isSelected: boolean;
  onClick?: () => void;
}

export function FighterCard({ fighter, isActive, isSelected, onClick }: FighterCardProps) {
  return (
    <div className="relative group perspective-500" onClick={onClick}>
      {/* Selection Ring */}
      {isActive && (
        <motion.div
          layoutId="cursor"
          className="absolute -inset-2 border-4 border-primary shadow-[0_0_20px_theme(colors.primary.DEFAULT)] z-20 rounded-lg pointer-events-none"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.15 }}
        >
          <div className="absolute top-0 left-0 bg-primary text-primary-foreground text-[10px] font-arcade px-2 py-1">
            P1
          </div>
        </motion.div>
      )}

      {/* Selected State (Locked In) */}
      {isSelected && (
        <motion.div
          className="absolute inset-0 bg-accent/20 z-30 pointer-events-none rounded-md border-4 border-accent"
          initial={{ opacity: 0, scale: 1.5 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="absolute bottom-0 right-0 bg-accent text-accent-foreground text-xs font-arcade px-2 py-1">
            SELECTED
          </div>
        </motion.div>
      )}

      {/* Card Content */}
      <div 
        className={cn(
          "relative h-32 md:h-40 w-full overflow-hidden rounded-md border-2 transition-all duration-200 bg-card",
          isActive ? "border-primary scale-105 z-10" : "border-border opacity-80 grayscale hover:grayscale-0"
        )}
      >
        <img 
          src={fighter.imageUrl || "https://images.unsplash.com/photo-1635515243457-32c954203641?q=80&w=800&auto=format&fit=crop"} 
          alt={fighter.name}
          className="h-full w-full object-cover"
        />
        
        {/* Name Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 border-t border-white/10">
          <p className={cn(
            "text-center text-xs md:text-sm font-bold uppercase truncate font-display tracking-wider",
            isActive ? "text-primary text-shadow-neon" : "text-muted-foreground"
          )}>
            {fighter.name}
          </p>
        </div>
      </div>
    </div>
  );
}
