import { FamilyMemberResponse } from "@shared/routes";
import { cn } from "@/lib/utils";
import { User, Phone, Crown, Cross } from "lucide-react";
import { motion } from "framer-motion";

interface MemberCardProps {
  member: FamilyMemberResponse;
  level: number;
  onClick: () => void;
}

// Color palette for levels - looping
const LEVEL_COLORS = [
  "bg-blue-100 border-blue-200 text-blue-900",     // Level 0 (Roots)
  "bg-emerald-100 border-emerald-200 text-emerald-900", // Level 1
  "bg-amber-100 border-amber-200 text-amber-900",       // Level 2
  "bg-rose-100 border-rose-200 text-rose-900",         // Level 3
  "bg-violet-100 border-violet-200 text-violet-900",     // Level 4
  "bg-cyan-100 border-cyan-200 text-cyan-900",         // Level 5
];

export function MemberCard({ member, level, onClick }: MemberCardProps) {
  const colorClass = member.isDeceased 
    ? "bg-slate-200 border-slate-300 text-slate-500 grayscale" 
    : LEVEL_COLORS[level % LEVEL_COLORS.length];

  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -5 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, type: "spring" }}
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center justify-center",
        "w-48 p-4 rounded-2xl cursor-pointer",
        "border-2 shadow-lg hover:shadow-xl transition-all duration-300",
        "backdrop-blur-sm",
        colorClass
      )}
    >
      {level === 0 && !member.isDeceased && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 p-1.5 rounded-full shadow-sm text-yellow-900">
          <Crown size={16} fill="currentColor" />
        </div>
      )}
      
      {member.isDeceased && (
        <div className="absolute top-2 right-2 text-slate-400">
          <Cross size={14} />
        </div>
      )}

      <div className={cn(
        "w-12 h-12 rounded-full flex items-center justify-center mb-3 text-lg font-display font-bold shadow-inner",
        member.isDeceased ? "bg-slate-300 text-slate-600" : "bg-white/50"
      )}>
        {member.name.charAt(0).toUpperCase()}
      </div>

      <h3 className="font-display font-bold text-center text-lg leading-tight line-clamp-2">
        {member.name}
      </h3>
      
      {member.phoneNumber && (
        <div className="flex items-center gap-1 mt-2 text-xs opacity-75 font-medium">
          <Phone size={10} />
          <span>{member.phoneNumber}</span>
        </div>
      )}
    </motion.div>
  );
}
