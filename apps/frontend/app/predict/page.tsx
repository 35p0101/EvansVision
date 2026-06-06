"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { getTeams, requestPrediction } from "@/services/api";
import { PredictionCard } from "@/components/prediction/PredictionCard";
import { TeamComparison } from "@/components/teams/TeamComparison";
import { CustomSelect } from "@/components/ui/CustomSelect";
import type { Team } from "@/types";

export default function PredictPage() {
  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");

  const { data: teams = [] } = useQuery({
    queryKey: ["teams"],
    queryFn: getTeams,
  });

  const homeTeamOptions = useMemo(
    () => [{ value: "", label: "Select home team" }, ...teams.map((t: Team) => ({ value: t.id, label: t.name }))],
    [teams],
  );
  const awayTeamOptions = useMemo(
    () => [{ value: "", label: "Select away team" }, ...teams.map((t: Team) => ({ value: t.id, label: t.name }))],
    [teams],
  );

  const predictMutation = useMutation({
    mutationFn: () => requestPrediction(homeTeamId, awayTeamId),
  });

  const homeTeam = teams.find((t: Team) => t.id === homeTeamId);
  const awayTeam = teams.find((t: Team) => t.id === awayTeamId);
  const sameTeam = homeTeamId && awayTeamId && homeTeamId === awayTeamId;
  const result = predictMutation.data;

  return (
    <div className="pt-24 pb-20 max-w-7xl mx-auto px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <h1 className="text-4xl font-bold mb-2">
          Match <span className="gradient-text">Prediction</span>
        </h1>
        <p className="text-muted-foreground">
          Select two teams to get AI-powered predictions
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Training data: 1999&ndash;2026 &middot; 45&thinsp;459 matches
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        <motion.div
          className="glass rounded-xl p-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <label className="text-sm font-medium text-muted-foreground mb-2 block">
            Home Team
          </label>
          <CustomSelect
            value={homeTeamId}
            onChange={setHomeTeamId}
            options={homeTeamOptions}
            placeholder="Search home team..."
            searchable
          />
        </motion.div>

        <motion.div
          className="glass rounded-xl p-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <label className="text-sm font-medium text-muted-foreground mb-2 block">
            Away Team
          </label>
          <CustomSelect
            value={awayTeamId}
            onChange={setAwayTeamId}
            options={awayTeamOptions}
            placeholder="Search away team..."
            searchable
          />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {sameTeam && (
          <div className="glass rounded-xl p-4 border border-yellow-500/20 text-yellow-400 mb-4 text-sm text-center">
            Cannot predict a match between the same team.
          </div>
        )}
        <button
          onClick={() => predictMutation.mutate()}
          disabled={!homeTeamId || !awayTeamId || sameTeam || predictMutation.isPending}
          className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-medium text-lg hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed mb-10"
        >
          {predictMutation.isPending ? "Analyzing..." : "Generate Prediction"}
        </button>
      </motion.div>

      {predictMutation.isError && (
        <div className="glass rounded-xl p-4 border border-red-500/20 text-red-400 mb-6">
          Prediction failed. Train the AI model first or check that the AI service is running.
        </div>
      )}

      {result && homeTeam && awayTeam && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <PredictionCard
            homeTeam={homeTeam.name}
            awayTeam={awayTeam.name}
            homeWin={result.homeWin}
            draw={result.draw}
            awayWin={result.awayWin}
            confidence={result.confidence}
            predictedResult={result.predictedResult}
            predictedScore={result.predictedScore}
          />

          <TeamComparison
            homeTeam={homeTeam}
            awayTeam={awayTeam}
          />
        </motion.div>
      )}
    </div>
  );
}
