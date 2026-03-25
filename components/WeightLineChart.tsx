"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler);

interface WeightEntry {
  date: string;
  weight: number;
}

interface WeightLineChartProps {
  entries: WeightEntry[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function WeightLineChart({ entries }: WeightLineChartProps) {
  const chartData = {
    labels: entries.map((e) => formatDate(e.date)),
    datasets: [
      {
        label: "Weight (lbs)",
        data: entries.map((e) => e.weight),
        borderColor: "#8b5cf6",
        backgroundColor: (context: { chart: ChartJS }) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 200);
          gradient.addColorStop(0, "rgba(139, 92, 246, 0.3)");
          gradient.addColorStop(1, "rgba(139, 92, 246, 0)");
          return gradient;
        },
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: "#8b5cf6",
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: { display: false },
      tooltip: {
        backgroundColor: "#1f2937",
        titleColor: "#fff",
        bodyColor: "#d1d5db",
        borderColor: "#374151",
        borderWidth: 1,
        cornerRadius: 8,
        padding: 10,
      },
    },
    scales: {
      x: {
        ticks: { color: "#6b7280", font: { size: 10 } },
        grid: { display: false },
      },
      y: {
        ticks: { color: "#6b7280", font: { size: 10 } },
        grid: { color: "rgba(75, 85, 99, 0.3)" },
      },
    },
  } as const;

  return <Line data={chartData} options={chartOptions} />;
}
