"use client";

import { useDashboardInsights } from '@/hooks/useDashboardInsights';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function FlashcardDifficultyDonut() {
  const { insights, loading, error } = useDashboardInsights();

  if (loading) {
    return (
      <div className="bg-card-bg border border-border rounded-2xl p-6">
        <div className="h-6 bg-secondary/20 rounded mb-4 animate-pulse w-32"></div>
        <div className="h-[240px] bg-secondary/10 rounded-full animate-pulse mx-auto max-w-[240px]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card-bg border border-border rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Flashcard Mix</h3>
        <div className="text-sm text-red-500">{error}</div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="bg-card-bg border border-border rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Flashcard Mix</h3>
        <div className="text-sm text-muted-foreground text-center py-12">
          Loading flashcard data...
        </div>
      </div>
    );
  }

  const difficulty = insights.flashcardDifficulty;
  const totalCards = difficulty.reduce((sum, d) => sum + d.count, 0);

  if (totalCards === 0) {
    return (
      <div className="bg-card-bg border border-border rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Flashcard Mix</h3>
        <div className="text-sm text-muted-foreground text-center py-12">
          No flashcards yet. Generate materials to see your difficulty breakdown!
        </div>
      </div>
    );
  }

  const labels = difficulty.map(
    (d) => d.difficulty.charAt(0).toUpperCase() + d.difficulty.slice(1)
  );
  const data = difficulty.map((d) => d.count);

  // Color scheme: easy (green), medium (yellow), hard (red)
  const colors = {
    easy: 'rgba(34, 197, 94, 0.8)', // green-500
    medium: 'rgba(234, 179, 8, 0.8)', // yellow-500
    hard: 'rgba(239, 68, 68, 0.8)', // red-500
  };

  const backgroundColors = difficulty.map((d) => colors[d.difficulty as keyof typeof colors]);

  // Find dominant difficulty
  const sortedDifficulty = [...difficulty].sort((a, b) => b.count - a.count);
  const dominant = sortedDifficulty[0];

  return (
    <div className="bg-card-bg border border-border rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-foreground mb-2">Flashcard Mix</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Difficulty breakdown of your AI-generated flashcards
      </p>

      <div className="flex items-center justify-center mb-6 p-4">
        <div className="w-[180px] h-[180px]">
          <Doughnut
            data={{
              labels,
              datasets: [
                {
                  data,
                  backgroundColor: backgroundColors,
                  borderWidth: 0,
                  hoverOffset: 4,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              layout: {
                padding: 0,
              },
              plugins: {
                legend: {
                  display: false,
                },
                tooltip: {
                  callbacks: {
                    label: (ctx) => {
                      const label = ctx.label || '';
                      const value = ctx.parsed || 0;
                      const percentage = difficulty[ctx.dataIndex].percentage;
                      return `${label}: ${value} cards (${percentage}%)`;
                    },
                  },
                },
              },
            }}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2">
        {difficulty.map((d) => (
          <div key={d.difficulty} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: colors[d.difficulty as keyof typeof colors] }}
              ></div>
              <span className="text-foreground capitalize">{d.difficulty}</span>
            </div>
            <span className="text-muted-foreground">
              {d.count} ({d.percentage}%)
            </span>
          </div>
        ))}
      </div>

      {/* Quick ratio summary */}
      <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
        <p>
          💡 <strong>Balance tip:</strong>{' '}
          {dominant.percentage > 60
            ? `Your deck is ${dominant.percentage}% ${dominant.difficulty} cards. Mix in more variety!`
            : `Nice balance! Varied difficulty helps long-term retention.`}
        </p>
      </div>
    </div>
  );
}
