"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { addPhoto, getPhotos, deletePhoto, generateId } from "@/lib/db";
import { Plus, Trash2, X, Columns2, ArrowLeft, ImageIcon } from "lucide-react";

const MILESTONES = [
  "Starting Point",
  "1 Month",
  "3 Months",
  "6 Months",
  "1 Year",
  "Goal Reached",
];

interface Photo {
  id: string;
  date: string;
  dataUrl: string;
  caption?: string;
  milestone?: string;
}

function resizeImage(file: File, maxWidth: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) {
          h = Math.round((h * maxWidth) / w);
          w = maxWidth;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function TimelinePage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [caption, setCaption] = useState("");
  const [milestone, setMilestone] = useState("");
  const [customMilestone, setCustomMilestone] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Compare mode
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [showSlider, setShowSlider] = useState(false);
  const [clipPercent, setClipPercent] = useState(50);
  const sliderRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const loadPhotos = useCallback(async () => {
    const data = await getPhotos();
    setPhotos(data as Photo[]);
  }, []);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  // --- Upload handlers ---
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImage(file, 800);
      setPreview(dataUrl);
      setShowUpload(true);
    } catch {
      alert("Failed to load image");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const cancelUpload = () => {
    setShowUpload(false);
    setPreview(null);
    setCaption("");
    setMilestone("");
    setCustomMilestone("");
    setDate(new Date().toISOString().split("T")[0]);
  };

  const savePhoto = async () => {
    if (!preview) return;
    setSaving(true);
    const tag = milestone === "__custom" ? customMilestone.trim() : milestone;
    await addPhoto({
      id: generateId(),
      date: new Date(date + "T12:00:00").toISOString(),
      dataUrl: preview,
      caption: caption.trim() || undefined,
      milestone: tag || undefined,
    });
    cancelUpload();
    setSaving(false);
    await loadPhotos();
  };

  const handleDeletePhoto = async (id: string) => {
    await deletePhoto(id);
    setConfirmDeleteId(null);
    await loadPhotos();
  };

  // --- Compare handlers ---
  const toggleCompare = () => {
    if (compareMode) {
      setCompareMode(false);
      setSelected([]);
      setShowSlider(false);
      setClipPercent(50);
    } else {
      setCompareMode(true);
      setSelected([]);
    }
  };

  const toggleSelect = (id: string) => {
    if (!compareMode) return;
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  useEffect(() => {
    if (selected.length === 2) setShowSlider(true);
  }, [selected]);

  const getSliderPercent = (clientX: number) => {
    if (!sliderRef.current) return 50;
    const rect = sliderRef.current.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    return Math.max(0, Math.min(100, pct));
  };

  const onPointerDown = () => {
    dragging.current = true;
  };
  const onPointerUp = () => {
    dragging.current = false;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    setClipPercent(getSliderPercent(e.clientX));
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const photoA = photos.find((p) => p.id === selected[0]);
  const photoB = photos.find((p) => p.id === selected[1]);

  return (
    <div className="px-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Timeline</h1>
        <div className="flex items-center gap-2">
          {photos.length >= 2 && (
            <button
              onClick={toggleCompare}
              className={`flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl transition-colors ${
                compareMode
                  ? "bg-violet-600 text-white"
                  : "bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700"
              }`}
            >
              <Columns2 size={16} />
              {compareMode ? "Comparing" : "Compare"}
            </button>
          )}
          {!compareMode && (
            <button
              onClick={() => fileRef.current?.click()}
              className="btn-primary flex items-center gap-1.5 text-sm !px-4 !py-2"
            >
              <Plus size={18} /> Photo
            </button>
          )}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Upload Form */}
      {showUpload && preview && (
        <div className="card mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Add Photo</h2>
            <button onClick={cancelUpload} className="text-gray-400 hover:text-white">
              <X size={20} />
            </button>
          </div>

          <img
            src={preview}
            alt="Preview"
            className="w-full rounded-xl object-cover max-h-80"
          />

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Date</label>
            <input
              type="date"
              className="input-field"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Caption (optional)</label>
            <input
              type="text"
              className="input-field"
              placeholder="How are you feeling?"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Milestone (optional)</label>
            <select
              className="input-field"
              value={milestone}
              onChange={(e) => setMilestone(e.target.value)}
            >
              <option value="">None</option>
              {MILESTONES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
              <option value="__custom">Custom...</option>
            </select>
            {milestone === "__custom" && (
              <input
                type="text"
                className="input-field mt-2"
                placeholder="Enter milestone name"
                value={customMilestone}
                onChange={(e) => setCustomMilestone(e.target.value)}
              />
            )}
          </div>

          <button
            onClick={savePhoto}
            disabled={saving}
            className="btn-primary w-full disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Photo"}
          </button>
        </div>
      )}

      {/* Compare Slider */}
      {showSlider && photoA && photoB && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Before / After</h2>
            <button
              onClick={() => {
                setShowSlider(false);
                setSelected([]);
                setClipPercent(50);
              }}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white"
            >
              <ArrowLeft size={16} /> Back
            </button>
          </div>

          <div
            ref={sliderRef}
            className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden touch-none select-none cursor-col-resize"
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onPointerMove={onPointerMove}
          >
            {/* Right image (background layer) */}
            <img
              src={photoB.dataUrl}
              alt="After"
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
            />
            {/* Left image (clipped foreground) */}
            <img
              src={photoA.dataUrl}
              alt="Before"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ clipPath: `inset(0 ${100 - clipPercent}% 0 0)` }}
              draggable={false}
            />
            {/* Handle */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-white/90 shadow-lg"
              style={{ left: `${clipPercent}%`, transform: "translateX(-50%)" }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
                <Columns2 size={16} className="text-gray-800" />
              </div>
            </div>
          </div>

          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span>{formatDate(photoA.date)}</span>
            <span>{formatDate(photoB.date)}</span>
          </div>
        </div>
      )}

      {/* Compare mode instructions */}
      {compareMode && !showSlider && (
        <div className="card mb-4 text-center">
          <p className="text-sm text-gray-400">
            Tap two photos to compare them side by side
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {selected.length}/2 selected
          </p>
          <button
            onClick={toggleCompare}
            className="btn-secondary text-sm mt-3 !py-2 !px-4"
          >
            Exit Compare
          </button>
        </div>
      )}

      {/* Timeline */}
      {!showSlider && (
        <div className="space-y-4 pb-4">
          {photos.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <ImageIcon size={48} className="mx-auto mb-3 opacity-50" />
              <p className="text-lg">No photos yet</p>
              <p className="text-sm mt-1">Add your first progress photo above</p>
            </div>
          )}

          {photos.map((photo) => {
            const isSelected = selected.includes(photo.id);
            const hasMilestone = !!photo.milestone;

            return (
              <div
                key={photo.id}
                onClick={() => compareMode && toggleSelect(photo.id)}
                className={`card transition-all ${
                  hasMilestone ? "!border-violet-500/60" : ""
                } ${
                  isSelected
                    ? "!border-violet-400 ring-2 ring-violet-500/50"
                    : ""
                } ${
                  compareMode ? "cursor-pointer active:scale-[0.98]" : ""
                }`}
              >
                {/* Milestone badge */}
                {hasMilestone && (
                  <div className="inline-block bg-violet-600/20 text-violet-400 text-xs font-semibold px-2.5 py-1 rounded-lg mb-3">
                    {photo.milestone}
                  </div>
                )}

                <img
                  src={photo.dataUrl}
                  alt={photo.caption || "Progress photo"}
                  className="w-full rounded-xl object-cover max-h-96"
                  draggable={false}
                />

                <div className="flex items-start justify-between mt-3">
                  <div>
                    <p className="text-sm font-medium text-gray-300">
                      {formatDate(photo.date)}
                    </p>
                    {photo.caption && (
                      <p className="text-sm text-gray-400 mt-0.5">
                        {photo.caption}
                      </p>
                    )}
                  </div>

                  {!compareMode && (
                    <div>
                      {confirmDeleteId === photo.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDeletePhoto(photo.id)}
                            className="text-xs text-red-400 hover:text-red-300 font-medium"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs text-gray-500 hover:text-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(photo.id)}
                          className="text-gray-600 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Selection indicator in compare mode */}
                {compareMode && isSelected && (
                  <div className="mt-2 text-center">
                    <span className="text-xs font-semibold text-violet-400">
                      Selected {selected.indexOf(photo.id) === 0 ? "(Left)" : "(Right)"}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
