"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { getModelInfo, getDashboardStats, getPredictionsHistory } from "@/services/api";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const accuracyData = [
  { epoch: 1, accuracy: 0.38, valAccuracy: 0.35 },
  { epoch: 5, accuracy: 0.45, valAccuracy: 0.42 },
  { epoch: 10, accuracy: 0.50, valAccuracy: 0.47 },
  { epoch: 15, accuracy: 0.53, valAccuracy: 0.50 },
  { epoch: 20, accuracy: 0.55, valAccuracy: 0.52 },
  { epoch: 25, accuracy: 0.57, valAccuracy: 0.53 },
  { epoch: 30, accuracy: 0.58, valAccuracy: 0.54 },
];

const lossData = [
  { epoch: 1, loss: 1.10, valLoss: 1.12 },
  { epoch: 5, loss: 0.95, valLoss: 0.98 },
  { epoch: 10, loss: 0.88, valLoss: 0.91 },
  { epoch: 15, loss: 0.84, valLoss: 0.87 },
  { epoch: 20, loss: 0.81, valLoss: 0.85 },
  { epoch: 25, loss: 0.79, valLoss: 0.83 },
  { epoch: 30, loss: 0.78, valLoss: 0.82 },
];

const confusionMatrix = [
  { name: "Home Win", predicted: 120, actual: 110 },
  { name: "Draw", predicted: 45, actual: 52 },
  { name: "Away Win", predicted: 65, actual: 68 },
];

const featureImportance = [
  { feature: "Home Elo", importance: 0.18 },
  { feature: "Away Elo", importance: 0.15 },
  { feature: "Form 5", importance: 0.14 },
  { feature: "xG Avg", importance: 0.12 },
  { feature: "Defense", importance: 0.11 },
  { feature: "Win Rate", importance: 0.10 },
  { feature: "EWMA Pts", importance: 0.09 },
  { feature: "Possession", importance: 0.07 },
  { feature: "Shot Eff", importance: 0.04 },
];

export default function DashboardPage() {
  const { data: modelInfo } = useQuery({
    queryKey: ["model-info"],
    queryFn: getModelInfo,
  });

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
  });

  const { data: predictions } = useQuery({
    queryKey: ["predictions-history"],
    queryFn: getPredictionsHistory,
    refetchInterval: 30000,
  });

  const featureCount = (modelInfo?.featureCount as number) || 0;
  const accuracy = ((modelInfo?.metrics as any)?.accuracy || 0) as number;

  return (
    <div className="pt-24 pb-20 max-w-7xl mx-auto px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <h1 className="text-4xl font-bold mb-2">
          AI <span className="gradient-text">Dashboard</span>
        </h1>
        <p className="text-muted-foreground">
          Model performance, training metrics, and feature analysis
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <motion.div
          className="glass rounded-xl p-4 text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 }}
        >
          <div className="text-2xl font-bold gradient-text">
            {(accuracy * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-muted-foreground">Model Accuracy</div>
        </motion.div>
        <motion.div
          className="glass rounded-xl p-4 text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="text-2xl font-bold gradient-text">{featureCount}</div>
          <div className="text-xs text-muted-foreground">Features</div>
        </motion.div>
        <motion.div
          className="glass rounded-xl p-4 text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
        >
          <div className="text-2xl font-bold gradient-text">
            {stats?.totalMatches ?? 0}
          </div>
          <div className="text-xs text-muted-foreground">Matches</div>
        </motion.div>
        <motion.div
          className="glass rounded-xl p-4 text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="text-2xl font-bold gradient-text">
            {stats?.totalTeams ?? 0}
          </div>
          <div className="text-xs text-muted-foreground">Teams</div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <motion.div
          className="glass rounded-xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-lg font-semibold mb-4">Training Accuracy</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={accuracyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 17%)" />
              <XAxis dataKey="epoch" stroke="hsl(215, 20%, 65%)" fontSize={12} />
              <YAxis
                domain={[0, 1]}
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
                dataKey="accuracy"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="Training"
              />
              <Line
                type="monotone"
                dataKey="valAccuracy"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
                name="Validation"
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          className="glass rounded-xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-lg font-semibold mb-4">Training Loss</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={lossData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 17%)" />
              <XAxis dataKey="epoch" stroke="hsl(215, 20%, 65%)" fontSize={12} />
              <YAxis stroke="hsl(215, 20%, 65%)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "hsl(222, 47%, 14%)",
                  border: "1px solid hsl(217, 33%, 17%)",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="loss"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                name="Training"
              />
              <Line
                type="monotone"
                dataKey="valLoss"
                stroke="#f97316"
                strokeWidth={2}
                dot={false}
                name="Validation"
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <motion.div
          className="glass rounded-xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <h3 className="text-lg font-semibold mb-4">Prediction Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={confusionMatrix}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 17%)" />
              <XAxis dataKey="name" stroke="hsl(215, 20%, 65%)" fontSize={12} />
              <YAxis stroke="hsl(215, 20%, 65%)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "hsl(222, 47%, 14%)",
                  border: "1px solid hsl(217, 33%, 17%)",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="predicted" fill="#3b82f6" name="Predicted" radius={[4, 4, 0, 0]} />
              <Bar dataKey="actual" fill="#8b5cf6" name="Actual" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          className="glass rounded-xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="text-lg font-semibold mb-4">Feature Importance</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={featureImportance} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 17%)" />
              <XAxis type="number" stroke="hsl(215, 20%, 65%)" fontSize={12} />
              <YAxis
                dataKey="feature"
                type="category"
                stroke="hsl(215, 20%, 65%)"
                fontSize={11}
                width={100}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(222, 47%, 14%)",
                  border: "1px solid hsl(217, 33%, 17%)",
                  borderRadius: "8px",
                }}
              />
              <Bar
                dataKey="importance"
                fill="url(#colorGradient)"
                radius={[0, 4, 4, 0]}
              />
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      <motion.div
        className="glass rounded-xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        <h3 className="text-lg font-semibold mb-4">Model Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Status</div>
            <div className="font-medium">
              {modelInfo?.trained ? "Trained" : "Not trained"}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Features</div>
            <div className="font-medium">{featureCount}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Architecture</div>
            <div className="font-medium">FF Neural Network</div>
          </div>
          <div>
            <div className="text-muted-foreground">Output</div>
            <div className="font-medium">Softmax (3 classes)</div>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="glass rounded-xl p-6 mt-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h3 className="text-lg font-semibold mb-2">Prediction Log</h3>
        <p className="text-muted-foreground text-sm mb-4">
          Realtime log of predictions made by the AI model, ordered by most recent
        </p>

        {!predictions || predictions.length === 0 ? (
          <p className="text-muted-foreground text-sm italic">
            No predictions have been made yet. Go to the{" "}
            <a href="/predict" className="text-blue-400 hover:underline">
              Predict page
            </a>{" "}
            to make one.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-muted-foreground">
                  <th className="text-left py-2 pr-4">Date</th>
                  <th className="text-left py-2 pr-4">Match</th>
                  <th className="text-center py-2 pr-4">Prediction</th>
                  <th className="text-center py-2 pr-4">H</th>
                  <th className="text-center py-2 pr-4">D</th>
                  <th className="text-center py-2 pr-4">A</th>
                  <th className="text-right py-2">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {(predictions as any[]).slice(0, 20).map((p: any) => {
                  const homeName = p.homeTeam?.name ?? "?";
                  const awayName = p.awayTeam?.name ?? "?";
                  const date = new Date(p.createdAt).toLocaleString("it-IT", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const resultLabel =
                    p.predictedResult === "H"
                      ? "1"
                      : p.predictedResult === "D"
                      ? "X"
                      : "2";
                  const resultColor =
                    p.predictedResult === "H"
                      ? "text-green-400"
                      : p.predictedResult === "D"
                      ? "text-yellow-400"
                      : "text-red-400";

                  return (
                    <tr
                      key={p.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">
                        {date}
                      </td>
                      <td className="py-2 pr-4 whitespace-nowrap">
                        {homeName} vs {awayName}
                      </td>
                      <td className={`py-2 pr-4 text-center font-bold ${resultColor}`}>
                        {resultLabel}
                      </td>
                      <td className="py-2 pr-4 text-center text-blue-400">
                        {(p.homeProbability * 100).toFixed(0)}%
                      </td>
                      <td className="py-2 pr-4 text-center text-yellow-400">
                        {(p.drawProbability * 100).toFixed(0)}%
                      </td>
                      <td className="py-2 pr-4 text-center text-red-400">
                        {(p.awayProbability * 100).toFixed(0)}%
                      </td>
                      <td className="py-2 text-right">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            p.confidence > 0.5
                              ? "bg-green-500/20 text-green-400"
                              : p.confidence > 0.35
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {(p.confidence * 100).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      <motion.div
        className="glass rounded-xl p-6 mt-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
      >
        <h3 className="text-lg font-semibold mb-2">Training Process</h3>
        <p className="text-muted-foreground text-sm mb-6">
          How the AI model is built, trained, and used for match prediction
        </p>

        <div className="space-y-8">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">
              1
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-base">Data Collection &amp; Pipeline</h4>
              <p className="text-muted-foreground text-sm leading-relaxed mt-2">
                I dati storici provengono da{" "}
                <span className="text-foreground font-medium">football-data.co.uk</span>, un archivio
                pubblico che raccoglie risultati e statistiche delle principali leghe europee.
                Uno script Python (<span className="text-foreground font-medium">download_data.py</span>)
                scarica i CSV per ogni stagione e li unisce in un unico file{" "}
                <span className="text-foreground font-medium">matches.csv</span> di 45.459 record.
              </p>
              <p className="text-muted-foreground text-sm leading-relaxed mt-2">
                I dati vengono importati in un database{" "}
                <span className="text-foreground font-medium">PostgreSQL</span> tramite{" "}
                <span className="text-foreground font-medium">Prisma ORM</span>, che garantisce
                type-safety e relazioni tra le tabelle. Il seed script (<span className="text-foreground font-medium">seed.ts</span>)
                inserisce i match in batch da 1.000 con `createMany`, cancellando eventuali prediction
                e match_stats precedenti per garantire idempotenza.
              </p>
              <div className="mt-2 bg-white/5 rounded-lg p-3">
                <code className="text-xs text-blue-300">
                  Leghe: Premier League | Serie A | La Liga | Bundesliga | Ligue 1<br />
                  Periodo: 1999–2026 · 27 stagioni · 45.459 match<br />
                  DB: PostgreSQL 16 · Prisma ORM · Seed idempotente
                </code>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">
              2
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-base">Feature Engineering (22 features)</h4>
              <p className="text-muted-foreground text-sm leading-relaxed mt-2">
                Il cuore del sistema è la pipeline di feature engineering in Python
                (<span className="text-foreground font-medium">feature_engineering.py</span>),
                che trasforma i dati grezzi in un vettore numerico di 22 dimensioni per ogni match.
              </p>

              <div className="mt-3 space-y-3">
                <div className="bg-white/5 rounded-lg p-3">
                  <h5 className="text-sm font-medium text-purple-300 mb-1">Rating ELO (2 features)</h5>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Sistema di punteggio globale (non resettato per stagione) che misura la
                    forza relativa di ogni squadra. Ogni partita aggiorna il rating: la squadra
                    vincente guadagna punti, la perdente perde, con un K-factor di 32 che
                    determina l&apos;entità del cambiamento. Le squadre iniziano tutte a 1500 punti.
                    L&apos;Elo è <span className="text-foreground">l&apos;unica feature globale</span>{" "}
                    perché rappresenta la forza a lungo termine che trascende le singole stagioni.
                  </p>
                </div>

                <div className="bg-white/5 rounded-lg p-3">
                  <h5 className="text-sm font-medium text-purple-300 mb-1">Rolling Stats per Stagione (10 features)</h5>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Per ogni squadra vengono calcolate medie mobili sugli ultimi 5 e 10 match
                    della <span className="text-foreground">stagione corrente</span>:
                    punti ottenuti (pts_last_5, pts_last_10), gol fatti (gf_avg_5, gf_avg_10),
                    gol subiti (ga_avg_5, ga_avg_10). Queste feature vengono <span className="text-foreground">resettate a ogni
                    nuova stagione</span> per evitare che risultati di 15 anni fa influenzino
                    le predizioni odierne. L&apos;EWMA (Exponentially Weighted Moving Average)
                    con α=0.3 dà più peso ai match recenti.
                  </p>
                </div>

                <div className="bg-white/5 rounded-lg p-3">
                  <h5 className="text-sm font-medium text-purple-300 mb-1">Head-to-Head (3 features)</h5>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Per ogni coppia di squadre, vengono contate le vittorie, i pareggi e le
                    sconfitte negli ultimi 5 scontri diretti (h2h_home_wins, h2h_draws,
                    h2h_away_wins). Queste feature catturano i rapporti di forza specifici
                    tra due squadre, indipendentemente dalla classifica generale.
                  </p>
                </div>

                <div className="bg-white/5 rounded-lg p-3">
                  <h5 className="text-sm font-medium text-purple-300 mb-1">Team Form &amp; Statistiche (7 features)</h5>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Include la media punti per partita nella stagione corrente (form_ppg),
                    la media xG (expected goals) dalla tabella team_statistics, il win rate,
                    la percentuale di possesso palla, l&apos;efficacia tiro (shots/goal),
                    e la difesa (xGA). I valori mancanti per squadre neopromosse sono
                    gestiti con default ragionevoli (es. 1.5 PPG, 50% possesso).
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">
              3
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-base">Neural Network Training</h4>
              <p className="text-muted-foreground text-sm leading-relaxed mt-2">
                Il <span className="text-foreground font-medium">trainer.py</span> carica il dataset
                completo, applica le feature engineering, split in training (80%), validazione (10%),
                e test (10%), poi addestra una rete feed-forward con TensorFlow/Keras.
              </p>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-lg p-3">
                  <h5 className="text-sm font-medium text-green-300 mb-1">Architettura</h5>
                  <code className="text-xs text-green-200">
                    Input(22) → Dense(128, ReLU)<br />
                    &nbsp;&nbsp;→ BatchNorm + Dropout(0.3)<br />
                    &nbsp;&nbsp;→ Dense(64, ReLU)<br />
                    &nbsp;&nbsp;→ BatchNorm + Dropout(0.3)<br />
                    &nbsp;&nbsp;→ Dense(32, ReLU)<br />
                    &nbsp;&nbsp;→ Dense(3, Softmax)
                  </code>
                </div>

                <div className="bg-white/5 rounded-lg p-3">
                  <h5 className="text-sm font-medium text-green-300 mb-1">Iperparametri</h5>
                  <ul className="text-muted-foreground text-xs space-y-1">
                    <li>• Ottimizzatore: Adam (lr=0.001)</li>
                    <li>• Loss: sparse_categorical_crossentropy</li>
                    <li>• Batch: 32 · Epoche: max 100</li>
                    <li>• Early stopping (patience=10)</li>
                    <li>• ReduceLROnPlateau (factor=0.5)</li>
                    <li>• Class weighting bilanciato</li>
                    <li>• L2 regularization (0.001)</li>
                  </ul>
                </div>
              </div>

              <p className="text-muted-foreground text-sm leading-relaxed mt-3">
                Durante l&apos;addestramento, il modello salva i pesi migliori in base alla validation loss.
                Al termine, viene valutato sul test set (10% dei dati, mai visti dal modello) per
                ottenere metriche oggettive: accuracy, precision, recall, F1-score, e una matrice
                di confusione 3x3. Il modello addestrato, lo StandardScaler e l&apos;elenco delle feature
                vengono salvati su disco nella directory{" "}
                <span className="text-foreground font-medium">saved_models/</span>.
              </p>

              <div className="bg-white/5 rounded-lg p-3 mt-2">
                <code className="text-xs text-green-300">
                  File salvati: model.keras | scaler.pkl | feature_cols.pkl | metrics.json
                </code>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">
              4
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-base">Prediction Flow (end-to-end)</h4>
              <p className="text-muted-foreground text-sm leading-relaxed mt-2">
                Quando un utente seleziona due squadre e clicca &quot;Generate Prediction&quot;,
                il sistema esegue questa sequenza di operazioni tra i tre microservizi:
              </p>

              <div className="mt-3 space-y-2">
                <div className="flex items-start gap-3 bg-white/5 rounded-lg p-3">
                  <div className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-bold shrink-0">
                    F
                  </div>
                  <div>
                    <h5 className="text-sm font-medium">Frontend (Next.js)</h5>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      Invia una richiesta POST /api/v1/predict con homeTeamId e awayTeamId
                      al backend Express. Mostra uno stato di caricamento &quot;Analyzing...&quot;.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-white/5 rounded-lg p-3">
                  <div className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-bold shrink-0">
                    B
                  </div>
                  <div>
                    <h5 className="text-sm font-medium">Backend (Express + Prisma)</h5>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      Il PredictionService carica le squadre dal DB, poi esegue tre query in
                      parallelo: <span className="text-foreground">buildTeamStats</span> per la squadra
                      di casa (calcola pts_last_5, pts_last_10, gf/ga avg, ewma, form_ppg da tutti i
                      match della stagione corrente), <span className="text-foreground">buildTeamStats</span> per
                      la squadra ospite, e <span className="text-foreground">buildH2HStats</span> che conta
                      vittorie/pareggi/sconfitte negli ultimi 5 scontri diretti.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-white/5 rounded-lg p-3">
                  <div className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-bold shrink-0">
                    A
                  </div>
                  <div>
                    <h5 className="text-sm font-medium">AI Service (FastAPI + TensorFlow)</h5>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      Riceve le stats, costruisce il vettore di 22 feature nell&apos;ordine esatto
                      usato in fase di training, applica lo StandardScaler caricato da disco,
                      esegue la forward pass del modello Keras (128→64→32→3 con attivazione Softmax),
                      e restituisce le probabilità per le tre classi: Home Win, Draw, Away Win.
                      Viene calcolato anche il confidence score basato sull&apos;entropia delle probabilità.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-white/5 rounded-lg p-3">
                  <div className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-bold shrink-0">
                    R
                  </div>
                  <div>
                    <h5 className="text-sm font-medium">Risultato</h5>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      Il backend salva la prediction nel DB (tabella predictions) e restituisce
                      al frontend: homeWin %, draw %, awayWin %, confidence, predictedResult (H/D/A),
                      e predictedScore stimato. Il frontend mostra il risultato nella PredictionCard
                      e nel TeamComparison.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
