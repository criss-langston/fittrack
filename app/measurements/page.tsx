"use client";

import { useState, useEffect, useCallback } from "react";
import {
  addMeasurement,
  getMeasurements,
  deleteMeasurement,
  generateId,
  type Measurement,
} from "@/lib/db";
import { Trash2, ChevronDown, ChevronUp } from "lucide-react";
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

const MEASUREMENT_FIELDS: { key: keyof Measurement; label: string; short: string }[] = [
  { key: "chest", label: "Chest", short: "Chest" },
  { key: "waist", label: "Waist", short: "Waist" },
  { key: "hips", label: "Hips", short: "Hips" },
  { key: "bicepLeft", label: "Bicep (Left)", short: "L Bicep" },
  { key: "bicepRight", label: "Bicep (Right)", short: "R Bicep" },
  { key: "thighLeft", label: "Thigh (Left)", short: "L Thigh" },
  { key: "thighRight", label: "Thigh (Right)", short: "R Thigh" },
  { key: "neck", label: "Neck", short: "Neck" },
];

export default function MeasurementsPage() {
  const [entries, setEntries] = useState<Measurement[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [chartField, setChartField] = useState<keyof Measurement>("chest");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadEntries = useCallback(async () => {
    const data = await getMeasurements();
    setEntries(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleLog = async () => {
    const hasValue = MEASUREMENT_FIELDS.some((f) => {
      const val = parseFloat(formValues[f.key] || "");
      return !isNaN(val) && val > 0;
    });
    if (!hasValue) return;

    const parseVal = (key: string): number | undefined => {
      const v = parseFloat(formValues[key] || "");
      return !isNaN(v) && v > 0 ? v : undefined;
    };

    const measurement: Measurement = {
      id: generateId(),
      date: new Date().toISOString(),
      chest: parseVal("chest"),
      waist: parseVal("waist"),
      hips: parseVal("hips"),
      bicepLeft: parseVal("bicepLeft"),
      bicepRight: parseVal("bicepRight"),
      thighLeft: parseVal("thighLeft"),
      thighRight: parseVal("thighRight"),
      neck: parseVal("neck"),
      notes: notes.trim() || undefined,
    };

    await addMeasurement(measurement);
    setFormValues({});
    setNotes("");
    await loadEntries();
  };

  const handleDelete = async (id: string) => {
    await deleteMeasurement(id);
    await loadEntries();
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

  const formatShortDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

  const chartEntries = [...entries]
    .filter((e) => {
      const val = e[chartField];
      return typeof val === "number" && val > 0;
    })
    .reverse()
    .slice(-30);

  const chartData = {
    labels: chartEntries.map((e) => formatShortDate(e.date)),
    datasets: [
      {
        label: MEASUREMENT_FIELDS.find((f) => f.key === chartField)?.label || "",
        data: chartEntries.map((e) => e[chartField] as number),
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
          label: (ctx: { parsed: { y: number | null } }) => `${ctx.parsed.y ?? 0} in`,
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
          callback: (value: string | number) => `${value}"`,
        },
        grid: { color: "rgba(75, 85, 99, 0.3)" },
      },
    },
  } as const;

  if (loading) {
    return (
      <div className="px-4 pt-6 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Measurements</h1>
        <p className="text-sm text-gray-400 mt-0.5">Track your body measurements over time</p>
      </div>

      <div className="card mb-6 space-y-3">
        <h2 className="text-sm font-semibold text-gray-400">Log Measurements (inches)</h2>
        <div className="grid grid-cols-2 gap-3">
          {MEASUREMENT_FIELDS.map((field) => (
            <div key={field.key}>
              <label className="text-xs text-gray-400 mb-1 block">{field.label}</label>
              <input
                type="number"
                className="input-field text-center text-sm"
                placeholder="--"
                step="0.1"
                value={formValues[field.key] || ""}
                onChange={(e) =>
                  setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
              />
            </div>
          ))}
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Notes (optional)</label>
          <input
            type="text"
            className="input-field"
            placeholder="Morning, post-workout, etc."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <button onClick={handleLog} className="btn-primary w-full">
          Log Measurements
        </button>
      </div>

      {chartEntries.length >= 2 && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-400">Trend</h2>
            <select
              className="text-xs bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-gray-300"
              value={chartField as string}
              onChange={(e) => setChartField(e.target.value as keyof Measurement)}
            >
              {MEASUREMENT_FIELDS.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div className="h-48">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-400 mb-2">History</h2>
        {entries.length === 0 && (
          <p className="text-center py-10 text-gray-500 text-sm">
            No measurements yet. Log your first entry above.
          </p>
        )}
        {entries.map((entry) => {
          const isExpanded = expandedId === entry.id;
          const filledFields = MEASUREMENT_FIELDS.filter((f) => {
            const val = entry[f.key];
            return typeof val === "number" && val > 0;
          });

          return (
            <div key={entry.id} className="card">
              <button
                onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                className="w-full flex items-center justify-between"
              >
                <div className="text-left">
                  <p className="font-semibold text-sm">{formatDate(entry.date)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {filledFields.map((f) => `${f.short}: ${entry[f.key]}"`).join("  |  ")}
                  </p>
                </div>
                {isExpanded ? (
                  <ChevronUp size={18} className="text-gray-500 flex-shrink-0" />
                ) : (
                  <ChevronDown size={18} className="text-gray-500 flex-shrink-0" />
                )}
              </button>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-800">
                  <div className="grid grid-cols-2 gap-2">
                    {filledFields.map((f) => (
                      <div key={f.key} className="flex justify-between text-xs">
                        <span className="text-gray-400">{f.label}</span>
                        <span className="font-medium text-gray-200">{entry[f.key]}"</span>
                      </div>
                    ))}
                  </div>
                  {entry.notes && (
                    <p className="text-xs text-gray-500 mt-2">{entry.notes}</p>
                  )}
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 mt-3"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
