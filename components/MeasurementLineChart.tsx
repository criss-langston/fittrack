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
import type { Measurement } from "@/lib/db";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler);

interface MeasurementLineChartProps {
  entries: (Measurement & { id: string })[];
  chartField: keyof Measurement;
  fieldLabel: string;
  unit?: string;
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function MeasurementLineChart({
  entries,
  chartField,
  fieldLabel,
  unit = "in",
}: MeasurementLineChartProps) {
  const chartData = {
    labels: entries.map((e) => formatShortDate(e.date)),
    datasets: [
      {
        label: fieldLabel,
        data: entries.map((e) => e[chartField] as number),
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
        callbacks: {
          label: (ctx: { parsed: { y: number | null } }) => `${ctx.parsed.y ?? 0} ${unit}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: "#6b7280", font: { size: 10 } },
        grid: { display: false },
      },
      y: {
        ticks: {
          color: "#6b7280",
          font: { size: 10 },
          callback: (value: string | number) => `${value}${unit === "%" ? "%" : '"'}`,
        },
        grid: { color: "rgba(75, 85, 99, 0.3)" },
      },
    },
  } as const;

  return <Line data={chartData} options={chartOptions} />;
}
