"use client";

import { motion } from "framer-motion";
import type { Team } from "@/types";

interface Props {
  homeTeam: Team;
  awayTeam: Team;
}

export function TeamComparison({ homeTeam, awayTeam }: Props) {
  const homeStats = homeTeam.statistics;
  const awayStats = awayTeam.statistics;

  if (!homeStats || !awayStats) return null;

  const stats = [
    { label: "xG", home: homeStats.xg, away: awayStats.xg, higher: homeStats.xg > awayStats.xg },
    { label: "xGA", home: homeStats.xga, away: awayStats.xga, higher: homeStats.xga > awayStats.xga },
    { label: "Shots", home: homeStats.shots, away: awayStats.shots, higher: homeStats.shots > awayStats.shots },
    { label: "Possession", home: homeStats.possession, away: awayStats.possession, higher: homeStats.possession > awayStats.possession },
    { label: "Win Rate", home: homeStats.winRate * 100, away: awayStats.winRate * 100, higher: homeStats.winRate > awayStats.winRate },
    { label: "Form", home: homeStats.formPoints, away: awayStats.formPoints, higher: homeStats.formPoints > awayStats.formPoints },
  ];

  return (
    <motion.div
      className="glass rounded-2xl p-6 border border-white/5"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <h3 className="text-lg font-semibold mb-6">Team Comparison</h3>
      <div className="space-y-4">
        {stats.map((stat, i) => {
          const maxVal = Math.max(stat.home, stat.away, 1);
          return (
            <div key={stat.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">{homeTeam.name}</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  {stat.label}
                </span>
                <span className="font-medium">{awayTeam.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <motion.div
                  className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-blue-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${(stat.home / maxVal) * 50}%` }}
                  transition={{ duration: 0.6, delay: 0.1 * i }}
                />
                <motion.div
                  className="h-2.5 rounded-full bg-gradient-to-r from-purple-500 to-purple-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${(stat.away / maxVal) * 50}%` }}
                  transition={{ duration: 0.6, delay: 0.1 * i }}
                  style={{ direction: "rtl" }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
