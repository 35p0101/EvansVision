"use client";

import { motion } from "framer-motion";

interface Props {
  label: string;
  value: number;
  color: string;
}

export function ProbabilityBar({ label, value, color }: Props) {
  const percentage = (value * 100).toFixed(1);

  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-bold">{percentage}%</span>
      </div>
      <div className="h-3 rounded-full bg-secondary overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
