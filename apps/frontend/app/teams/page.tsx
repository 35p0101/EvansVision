"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";
import { getTeams } from "@/services/api";
import type { Team } from "@/types";

export default function TeamsPage() {
  const { data: teams = [] } = useQuery({
    queryKey: ["teams"],
    queryFn: getTeams,
  });

  return (
    <div className="pt-24 pb-20 max-w-7xl mx-auto px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <h1 className="text-4xl font-bold mb-2">
          Team <span className="gradient-text">Analysis</span>
        </h1>
        <p className="text-muted-foreground">
          In-depth statistics and performance analytics
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map((team: Team, i: number) => (
          <Link key={team.id} href={`/teams/${team.id}`}>
            <motion.div
              className="glass rounded-xl p-5 glass-hover"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                  {team.name.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-lg">{team.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {team.league} · Elo {team.eloRating}
                  </div>
                </div>
              </div>
              {team.statistics && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-muted-foreground">xG</div>
                    <div className="font-mono font-medium">
                      {team.statistics.xg.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">xGA</div>
                    <div className="font-mono font-medium">
                      {team.statistics.xga.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Win Rate</div>
                    <div className="font-mono font-medium">
                      {(team.statistics.winRate * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Possession</div>
                    <div className="font-mono font-medium">
                      {team.statistics.possession.toFixed(0)}%
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}
