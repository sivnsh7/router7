"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Award, ChevronLeft, ChevronRight, Zap, Trophy, Flame } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface Competitor {
  id: string;
  name: string;
  provider?: string;
  score?: number;
  metric?: string; // e.g. "142ms", "$0.15/M"
  isWinner?: boolean;
  avatar?: string;
}

export interface Match {
  id: string;
  roundId: string;
  nextMatchId?: string | null;
  competitors: [Competitor, Competitor];
  status: "completed" | "live" | "upcoming";
  title?: string;
  winningReason?: string;
}

export interface Round {
  id: string;
  title: string;
  phase?: string;
  matches: Match[];
}

export interface KnockoutBracketProps {
  rounds?: Round[];
  onMatchClick?: (match: Match) => void;
  className?: string;
}

export const ROUNDS: Round[] = [
  {
    id: "round-qf",
    title: "Quarter-Finals",
    phase: "Latency & Throughput Elimination",
    matches: [
      {
        id: "m-qf-1",
        roundId: "round-qf",
        status: "completed",
        title: "Speed Gauntlet 1",
        winningReason: "Sub-120ms TTFT advantage",
        competitors: [
          {
            id: "claude-3-5-sonnet",
            name: "Claude 3.5 Sonnet",
            provider: "Anthropic",
            score: 98,
            metric: "118ms",
            isWinner: true,
          },
          {
            id: "gpt-4o",
            name: "GPT-4o",
            provider: "OpenAI",
            score: 91,
            metric: "164ms",
            isWinner: false,
          },
        ],
      },
      {
        id: "m-qf-2",
        roundId: "round-qf",
        status: "completed",
        title: "Speed Gauntlet 2",
        winningReason: "Specialized inference engine",
        competitors: [
          {
            id: "inception-flash",
            name: "Inception Mercury",
            provider: "Inception Labs",
            score: 96,
            metric: "94ms",
            isWinner: true,
          },
          {
            id: "literouter-fast",
            name: "LiteRouter Swift",
            provider: "LiteRouter",
            score: 89,
            metric: "148ms",
            isWinner: false,
          },
        ],
      },
      {
        id: "m-qf-3",
        roundId: "round-qf",
        status: "completed",
        title: "Reasoning Gauntlet 1",
        winningReason: "Zero reasoning drift",
        competitors: [
          {
            id: "gemini-2-5-pro",
            name: "Gemini 2.5 Pro",
            provider: "Google",
            score: 95,
            metric: "210ms",
            isWinner: true,
          },
          {
            id: "deepseek-r1",
            name: "DeepSeek R1",
            provider: "DeepSeek",
            score: 93,
            metric: "320ms",
            isWinner: false,
          },
        ],
      },
      {
        id: "m-qf-4",
        roundId: "round-qf",
        status: "completed",
        title: "Cost Efficiency Gauntlet",
        winningReason: "Cheapest per 1M tokens",
        competitors: [
          {
            id: "claude-3-5-haiku",
            name: "Claude 3.5 Haiku",
            provider: "Anthropic",
            score: 94,
            metric: "88ms",
            isWinner: true,
          },
          {
            id: "gpt-4o-mini",
            name: "GPT-4o Mini",
            provider: "OpenAI",
            score: 90,
            metric: "112ms",
            isWinner: false,
          },
        ],
      },
    ],
  },
  {
    id: "round-sf",
    title: "Semi-Finals",
    phase: "High Concurrency Stress",
    matches: [
      {
        id: "m-sf-1",
        roundId: "round-sf",
        status: "completed",
        title: "Throughput Championship",
        winningReason: "High resilience under 10k RPM",
        competitors: [
          {
            id: "claude-3-5-sonnet",
            name: "Claude 3.5 Sonnet",
            provider: "Anthropic",
            score: 97,
            metric: "122ms",
            isWinner: true,
          },
          {
            id: "inception-flash",
            name: "Inception Mercury",
            provider: "Inception Labs",
            score: 94,
            metric: "102ms",
            isWinner: false,
          },
        ],
      },
      {
        id: "m-sf-2",
        roundId: "round-sf",
        status: "completed",
        title: "Accuracy Championship",
        winningReason: "Higher mathematical accuracy",
        competitors: [
          {
            id: "gemini-2-5-pro",
            name: "Gemini 2.5 Pro",
            provider: "Google",
            score: 96,
            metric: "198ms",
            isWinner: true,
          },
          {
            id: "claude-3-5-haiku",
            name: "Claude 3.5 Haiku",
            provider: "Anthropic",
            score: 92,
            metric: "91ms",
            isWinner: false,
          },
        ],
      },
    ],
  },
  {
    id: "round-f",
    title: "Grand Championship",
    phase: "Ultimate Routing Benchmark",
    matches: [
      {
        id: "m-f-1",
        roundId: "round-f",
        status: "live",
        title: "Router7 Sovereign Final",
        winningReason: "Real-time automated failover",
        competitors: [
          {
            id: "claude-3-5-sonnet",
            name: "Claude 3.5 Sonnet",
            provider: "Anthropic",
            score: 99,
            metric: "115ms",
            isWinner: true,
          },
          {
            id: "gemini-2-5-pro",
            name: "Gemini 2.5 Pro",
            provider: "Google",
            score: 97,
            metric: "185ms",
            isWinner: false,
          },
        ],
      },
    ],
  },
];

export function KnockoutBracket({
  rounds = ROUNDS,
  onMatchClick,
  className,
}: KnockoutBracketProps) {
  const [activeRoundIdx, setActiveRoundIdx] = useState(rounds.length - 1);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  const activeRound = rounds[activeRoundIdx] ?? rounds[0];

  return (
    <div
      className={cn(
        "relative w-full rounded-xl border border-border/60 bg-card/60 p-4 md:p-6 backdrop-blur-sm shadow-sm",
        className
      )}
    >
      {/* Header controls with round stepper */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-[var(--clay)]" />
            <span className="text-xs uppercase tracking-widest font-mono text-muted-foreground">
              MODEL ARENA // KNOCKOUT BENCHMARK
            </span>
          </div>
          <h3 className="text-lg font-bold font-display tracking-tight text-foreground flex items-center gap-2 mt-1">
            {activeRound.title}
            {activeRound.phase && (
              <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {activeRound.phase}
              </span>
            )}
          </h3>
        </div>

        {/* Round Tabs & Stepper */}
        <div className="flex items-center gap-2">
          <div className="flex bg-muted/60 p-1 rounded-lg border border-border/40 text-xs font-mono">
            {rounds.map((r, idx) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setActiveRoundIdx(idx)}
                className={cn(
                  "px-3 py-1.5 rounded-md transition-all font-medium",
                  activeRoundIdx === idx
                    ? "bg-background text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {r.title}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={activeRoundIdx === 0}
              onClick={() => setActiveRoundIdx((i) => Math.max(0, i - 1))}
              className="p-1.5 rounded-md border border-border/40 hover:bg-muted/60 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              aria-label="Previous Round"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={activeRoundIdx === rounds.length - 1}
              onClick={() => setActiveRoundIdx((i) => Math.min(rounds.length - 1, i + 1))}
              className="p-1.5 rounded-md border border-border/40 hover:bg-muted/60 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              aria-label="Next Round"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bracket Rounds View */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeRound.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4"
        >
          {activeRound.matches.map((match) => {
            const [c1, c2] = match.competitors;
            const isMatchSelected = selectedMatch?.id === match.id;

            return (
              <div
                key={match.id}
                onClick={() => {
                  setSelectedMatch(match);
                  onMatchClick?.(match);
                }}
                className={cn(
                  "group relative cursor-pointer rounded-lg border bg-background/80 p-4 transition-all hover:border-[var(--clay)]/80 hover:shadow-md",
                  isMatchSelected
                    ? "border-[var(--clay)] ring-1 ring-[var(--clay)]/50"
                    : "border-border/60",
                  match.status === "live" && "border-amber-500/50 bg-amber-500/[0.02]"
                )}
              >
                {/* Match title & status bar */}
                <div className="flex items-center justify-between mb-3 text-xs font-mono text-muted-foreground border-b border-border/30 pb-2">
                  <span className="font-semibold">{match.title || match.id}</span>
                  <div className="flex items-center gap-1.5">
                    {match.status === "live" && (
                      <span className="flex items-center gap-1 text-amber-500 font-bold animate-pulse">
                        <Flame className="h-3 w-3" /> LIVE
                      </span>
                    )}
                    {match.status === "completed" && (
                      <span className="flex items-center gap-1 text-[var(--green)]">
                        <Award className="h-3 w-3" /> VERIFIED
                      </span>
                    )}
                    {match.status === "upcoming" && (
                      <span className="text-muted-foreground">QUEUED</span>
                    )}
                  </div>
                </div>

                {/* Competitors List */}
                <div className="space-y-2">
                  {[c1, c2].map((comp, i) => (
                    <div
                      key={comp.id || i}
                      className={cn(
                        "flex items-center justify-between rounded-md p-2.5 transition-colors border",
                        comp.isWinner
                          ? "bg-[var(--green-tint)]/30 border-[var(--green)]/40 text-foreground font-semibold"
                          : "bg-muted/30 border-transparent text-muted-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {comp.isWinner ? (
                          <Trophy className="h-3.5 w-3.5 text-[var(--clay)] shrink-0" />
                        ) : (
                          <div className="h-3.5 w-3.5 rounded-full border border-border/60 shrink-0" />
                        )}
                        <div className="truncate">
                          <span className="text-sm font-medium block truncate text-foreground">
                            {comp.name}
                          </span>
                          {comp.provider && (
                            <span className="text-[10px] uppercase font-mono text-muted-foreground">
                              {comp.provider}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 font-mono text-xs">
                        {comp.metric && (
                          <span className="text-muted-foreground text-[11px] flex items-center gap-0.5">
                            <Zap className="h-3 w-3 text-primary/70" /> {comp.metric}
                          </span>
                        )}
                        {comp.score !== undefined && (
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-xs font-bold",
                              comp.isWinner
                                ? "bg-[var(--green)] text-white"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {comp.score}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {match.winningReason && (
                  <div className="mt-3 text-[11px] font-mono text-muted-foreground/80 bg-muted/20 px-2 py-1 rounded border border-border/20 truncate">
                    ✦ {match.winningReason}
                  </div>
                )}
              </div>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export const Skiper107 = () => {
  return (
    <div className="flex w-full justify-center py-6">
      <KnockoutBracket rounds={ROUNDS} />
    </div>
  );
};

export default KnockoutBracket;
