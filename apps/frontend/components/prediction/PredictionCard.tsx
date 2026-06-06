"use client";

import { motion } from "framer-motion";
import { ProbabilityBar } from "./ProbabilityBar";

interface Props {
  homeTeam: string;
  awayTeam: string;
  homeWin: number;
  draw: number;
  awayWin: number;
  confidence: number;
  predictedResult: string;
  predictedScore?: string;
}

export function PredictionCard({
  homeTeam,
  awayTeam,
  homeWin,
  draw,
  awayWin,
  confidence,
  predictedResult,
  predictedScore,
}: Props) {
  return (
    <motion.div
      className="glass rounded-2xl p-8 border border-white/5"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between mb-8">
        <div className="text-center flex-1">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl mx-auto mb-2">
            {homeTeam.charAt(0)}
          </div>
          <div className="font-semibold text-lg">{homeTeam}</div>
          <div className="text-sm text-muted-foreground">Home</div>
        </div>

        <div className="text-center px-6">
          <div className="text-3xl font-bold gradient-text mb-1">
            {predictedScore || "?-?"}
          </div>
          <div className="text-xs text-muted-foreground">Predicted Score</div>
          <motion.div
            className="mt-3 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium inline-block"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {predictedResult}
          </motion.div>
        </div>

        <div className="text-center flex-1">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl mx-auto mb-2">
            {awayTeam.charAt(0)}
          </div>
          <div className="font-semibold text-lg">{awayTeam}</div>
          <div className="text-sm text-muted-foreground">Away</div>
        </div>
      </div>

      <div className="space-y-4">
        <ProbabilityBar
          label="Home Win"
          value={homeWin}
          color="from-blue-500 to-blue-600"
        />
        <ProbabilityBar
          label="Draw"
          value={draw}
          color="from-gray-400 to-gray-500"
        />
        <ProbabilityBar
          label="Away Win"
          value={awayWin}
          color="from-purple-500 to-purple-600"
        />
      </div>

      <motion.div
        className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse-glow" />
        Confidence: {(confidence * 100).toFixed(1)}%
      </motion.div>
    </motion.div>
  );
}
