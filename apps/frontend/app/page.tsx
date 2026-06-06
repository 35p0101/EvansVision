"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "@/services/api";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function HomePage() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
  });

  return (
    <div className="pt-24 pb-20">
      <section className="max-w-7xl mx-auto px-6 mb-20">
        <motion.div
          className="text-center max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
            AI-Powered Predictions
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            Predict Football
            <br />
            <span className="gradient-text">with Machine Learning</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Advanced neural networks analyze thousands of matches to deliver
            realistic win, draw, and loss probabilities.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/predict"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
            >
              Make a Prediction
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl glass glass-hover font-medium"
            >
              View AI Dashboard
            </Link>
          </div>
        </motion.div>
      </section>

      <section className="max-w-7xl mx-auto px-6 mb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            className="glass rounded-xl p-6 text-center"
            {...fadeUp}
            transition={{ delay: 0.1 }}
          >
            <div className="text-3xl font-bold gradient-text mb-1">
              {stats?.totalTeams ?? 0}
            </div>
            <div className="text-sm text-muted-foreground">Teams Tracked</div>
          </motion.div>
          <motion.div
            className="glass rounded-xl p-6 text-center"
            {...fadeUp}
            transition={{ delay: 0.2 }}
          >
            <div className="text-3xl font-bold gradient-text mb-1">
              {stats?.totalMatches ?? 0}
            </div>
            <div className="text-sm text-muted-foreground">Matches Analyzed</div>
          </motion.div>
          <motion.div
            className="glass rounded-xl p-6 text-center"
            {...fadeUp}
            transition={{ delay: 0.3 }}
          >
            <div className="text-3xl font-bold gradient-text mb-1">
              {stats?.totalPredictions ?? 0}
            </div>
            <div className="text-sm text-muted-foreground">Predictions Made</div>
          </motion.div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 mb-20">
        <motion.h2
          className="text-2xl font-bold mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Top Teams by Elo Rating
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats?.topTeams?.map((team: any, i: number) => (
            <motion.div
              key={team.id}
              className="glass rounded-xl p-4 flex items-center gap-4 glass-hover"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * i }}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                {team.name.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="font-medium">{team.name}</div>
                <div className="text-xs text-muted-foreground">{team.league}</div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-primary">
                  {team.eloRating}
                </div>
                <div className="text-xs text-muted-foreground">Elo</div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
