"use client";

import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Props {
  matches: any[];
  teamName: string;
}

export function FormChart({ matches, teamName }: Props) {
  const formData = matches
    .slice(0, 20)
    .reverse()
    .map((m: any, i: number) => {
      const won = m.isHome
        ? (m.homeGoals ?? 0) > (m.awayGoals ?? 0)
        : (m.awayGoals ?? 0) > (m.homeGoals ?? 0);
      const pts = won ? 3 : m.homeGoals === m.awayGoals ? 1 : 0;
      return {
        match: i + 1,
        points: pts,
        opponent: m.isHome ? m.awayTeam?.name : m.homeTeam?.name,
      };
    });

  return (
    <motion.div
      className="glass rounded-xl p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <h3 className="text-lg font-semibold mb-4">{teamName} — Recent Form</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={formData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 17%)" />
          <XAxis dataKey="match" stroke="hsl(215, 20%, 65%)" fontSize={12} />
          <YAxis
            domain={[0, 3.5]}
            ticks={[0, 1, 3]}
            stroke="hsl(215, 20%, 65%)"
            fontSize={12}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(222, 47%, 14%)",
              border: "1px solid hsl(217, 33%, 17%)",
              borderRadius: "8px",
            }}
          />
          <Line
            type="monotone"
            dataKey="points"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: "#3b82f6", r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
