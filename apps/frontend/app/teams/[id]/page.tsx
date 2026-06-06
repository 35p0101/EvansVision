"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { getTeam } from "@/services/api";
import { TeamComparison } from "@/components/teams/TeamComparison";
import { FormChart } from "@/components/charts/FormChart";

export default function TeamDetailPage() {
  const params = useParams();
  const { data: team, isLoading } = useQuery({
    queryKey: ["team", params.id],
    queryFn: () => getTeam(params.id as string),
  });

  if (isLoading) {
    return (
      <div className="pt-24 pb-20 max-w-7xl mx-auto px-6">
        <div className="text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="pt-24 pb-20 max-w-7xl mx-auto px-6">
        <div className="text-center text-muted-foreground">Team not found</div>
      </div>
    );
  }

  const allMatches = [
    ...(team.homeMatches || []).map((m: any) => ({ ...m, isHome: true })),
    ...(team.awayMatches || []).map((m: any) => ({ ...m, isHome: false })),
  ].sort(
    (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="pt-24 pb-20 max-w-7xl mx-auto px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl">
            {team.name?.charAt(0)}
          </div>
          <div>
            <h1 className="text-4xl font-bold">{team.name}</h1>
            <p className="text-muted-foreground">
              {team.league} · Elo {team.eloRating}
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        {team.statistics && (
          <motion.div
            className="glass rounded-xl p-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3 className="text-lg font-semibold mb-4">Statistics</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "xG", value: team.statistics.xg.toFixed(2) },
                { label: "xGA", value: team.statistics.xga.toFixed(2) },
                { label: "Shots", value: team.statistics.shots.toFixed(1) },
                {
                  label: "Win Rate",
                  value: `${(team.statistics.winRate * 100).toFixed(0)}%`,
                },
                {
                  label: "Form Points",
                  value: team.statistics.formPoints.toFixed(2),
                },
                {
                  label: "Possession",
                  value: `${team.statistics.possession.toFixed(0)}%`,
                },
              ].map((stat) => (
                <div key={stat.label} className="glass rounded-lg p-3">
                  <div className="text-xs text-muted-foreground">
                    {stat.label}
                  </div>
                  <div className="font-mono font-bold text-lg text-primary">
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div
          className="glass rounded-xl p-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-lg font-semibold mb-4">Recent Matches</h3>
          <div className="space-y-2">
            {allMatches.slice(0, 10).map((match: any) => {
              const won =
                match.isHome
                  ? (match.homeGoals ?? 0) > (match.awayGoals ?? 0)
                  : (match.awayGoals ?? 0) > (match.homeGoals ?? 0);
              return (
                <div
                  key={match.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/50 text-sm"
                >
                  <span className="text-muted-foreground">
                    {match.isHome ? "vs" : "@"}{" "}
                    {match.isHome
                      ? match.awayTeam?.name
                      : match.homeTeam?.name}
                  </span>
                  <span
                    className={`font-mono font-bold ${won ? "text-green-400" : "text-red-400"}`}
                  >
                    {match.homeGoals ?? "?"} - {match.awayGoals ?? "?"}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {allMatches.length > 0 && <FormChart matches={allMatches} teamName={team.name} />}
    </div>
  );
}
