"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

interface ExerciseProgressChartProps {
  labels: string[];
  weights: number[];
  oneRMs: number[];
}

export default function ExerciseProgressChart({
  labels,
  weights,
  oneRMs,
}: ExerciseProgressChartProps) {
  const lineData = {
    labels,
    datasets: [
      {
        label: "Max Weight (lbs)",
        data: weights,
        borderColor: "rgba(139, 92, 246, 0.9)",
        backgroundColor: "rgba(139, 92, 246, 0.1)",
        borderWidth: 2,
        pointBackgroundColor: "#8b5cf6",
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.35,
      },
      {
        label: "Est. 1RM (lbs)",
        data: oneRMs,
        borderColor: "rgba(6, 182, 212, 0.7)",
        backgroundColor: "transparent",
        borderWidth: 1.5,
        borderDash: [4, 3],
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: "#06b6d4",
        fill: false,
        tension: 0.35,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index" as const, intersect: false },
    plugins: {
      tooltip: {
        backgroundColor: "#1f2937",
        titleColor: "#fff",
        bodyColor: "#d1d5db",
        borderColor: "#374151",
        borderWidth: 1,
        cornerRadius: 8,
        padding: 10,
      },
      legend: { display: false },
    },
    scales: {
      x: {
        grid: { color: "rgba(75, 85, 99, 0.2)" },
        ticks: { color: "#6b7280", font: { size: 10 } },
      },
      y: {
        grid: { color: "rgba(75, 85, 99, 0.2)" },
        ticks: { color: "#6b7280", font: { size: 10 } },
        beginAtZero: false,
      },
    },
  };

  return <Line data={lineData} options={lineOptions} />;
}
