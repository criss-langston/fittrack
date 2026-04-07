"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { addMeasurement, getMeasurements, deleteMeasurement, addPhoto, getPhotos, deletePhoto, addWeightEntry, getWeightEntries, generateId, type Measurement } from "@/lib/db";
import { Plus, Camera, Scale, Trash2, ChevronDown, ChevronUp, X, TrendingUp, Image as ImageIcon, Activity } from "lucide-react";
import dynamic from "next/dynamic";

const WeightLineChart = dynamic(() => import("@/components/WeightLineChart"), { loading: () => <div className="h-40 bg-gray-800 rounded-lg animate-pulse" />, ssr: false });
const MeasurementLineChart = dynamic(() => import("@/components/MeasurementLineChart"), { loading: () => <div className="h-40 bg-gray-800 rounded-lg animate-pulse" />, ssr: false });

const MEASUREMENT_FIELDS: { key: keyof Measurement; label: string; short: string }[] = [
  { key: "chest", label: "Chest", short: "Chest" },
  { key: "waist", label: "Waist", short: "Waist" },
  { key: "hips", label: "Hips", short: "Hips" },
  { key: "bicepLeft", label: "Bicep (Left)", short: "L Arm" },
  { key: "bicepRight", label: "Bicep (Right)", short: "R Arm" },
  { key: "thighLeft", label: "Thigh (Left)", short: "L Thigh" },
  { key: "thighRight", label: "Thigh (Right)", short: "R Thigh" },
  { key: "neck", label: "Neck", short: "Neck" },
];

interface WeightEntry { id: string; date: string; weight: number; calories?: number; notes?: string; }
interface Photo { id: string; date: string; dataUrl: string; caption?: string; milestone?: string; }

function monthKey(dateStr: string) { const d = new Date(dateStr); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
function formatMonthLabel(key: string) { const [y, m] = key.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }); }
function formatFullDate(dateStr: string) { return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }
function resizeImage(file: File, maxWidth: number): Promise<string> { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => { const img = new Image(); img.onload = () => { const canvas = document.createElement('canvas'); let w = img.width, h = img.height; if (w > maxWidth) { h = Math.round((h * maxWidth) / w); w = maxWidth; } canvas.width = w; canvas.height = h; const ctx = canvas.getContext('2d'); if (!ctx) return reject(new Error('Canvas not supported')); ctx.drawImage(img, 0, 0, w, h); resolve(canvas.toDataURL('image/jpeg', 0.85)); }; img.onerror = reject; img.src = reader.result as string; }; reader.onerror = reject; reader.readAsDataURL(file); }); }

export default function MeasurementsPage() {
  const [entries, setEntries] = useState<Measurement[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [month, setMonth] = useState(monthKey(new Date().toISOString()));
  const [expandedSection, setExpandedSection] = useState<string | null>('chest');
  const [showMeasurementModal, setShowMeasurementModal] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [previewPhotoId, setPreviewPhotoId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [measurementDate, setMeasurementDate] = useState(new Date().toISOString().split('T')[0]);
  const [weightInput, setWeightInput] = useState('');
  const [bodyFatInput, setBodyFatInput] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoCaption, setPhotoCaption] = useState('');
  const [photoDate, setPhotoDate] = useState(new Date().toISOString().split('T')[0]);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadAll = useCallback(async () => {
    const [m, p, w] = await Promise.all([getMeasurements(), getPhotos(), getWeightEntries()]);
    setEntries(m as Measurement[]); setPhotos(p as Photo[]); setWeights(w as WeightEntry[]);
  }, []);
  useEffect(() => { loadAll(); }, [loadAll]);

  const monthOptions = useMemo(() => {
    const keys = new Set<string>([monthKey(new Date().toISOString())]);
    entries.forEach((e) => keys.add(monthKey(e.date)));
    photos.forEach((p) => keys.add(monthKey(p.date)));
    weights.forEach((w) => keys.add(monthKey(w.date)));
    return Array.from(keys).sort().reverse();
  }, [entries, photos, weights]);

  const monthEntries = entries.filter((e) => monthKey(e.date) === month);
  const monthPhotos = photos.filter((p) => monthKey(p.date) === month);
  const monthWeights = weights.filter((w) => monthKey(w.date) === month);
  const weight30 = weights.slice(0, 30).reverse();
  const weight90 = weights.slice(0, 90).reverse();
  const bodyFatEntries = entries.filter((e) => typeof e.bodyFat === 'number').slice().reverse();
  const latestWeight = weights[0]?.weight ?? null;
  const latestBodyFat = entries.find((e) => typeof e.bodyFat === 'number')?.bodyFat ?? null;
  const latestMeasurementDate = entries[0]?.date ?? null;
  const latestWeightDelta = weights.length >= 2 ? Number((weights[0].weight - weights[1].weight).toFixed(1)) : null;

  const handleMeasurementSave = async () => {
    const parseVal = (key: string): number | undefined => { const v = parseFloat(formValues[key] || ''); return !isNaN(v) && v > 0 ? v : undefined; };
    const measurement: Measurement = { id: generateId(), date: new Date(measurementDate + 'T12:00:00').toISOString(), chest: parseVal('chest'), waist: parseVal('waist'), hips: parseVal('hips'), bicepLeft: parseVal('bicepLeft'), bicepRight: parseVal('bicepRight'), thighLeft: parseVal('thighLeft'), thighRight: parseVal('thighRight'), neck: parseVal('neck'), bodyFat: parseFloat(bodyFatInput) || undefined, notes: notes.trim() || undefined };
    await addMeasurement(measurement);
    setShowMeasurementModal(false); setFormValues({}); setNotes(''); setBodyFatInput('');
    await loadAll();
  };

  const handleDeleteMeasurement = async (id: string) => { await deleteMeasurement(id); await loadAll(); };
  const handleQuickWeight = async () => { const value = parseFloat(weightInput); if (!value) return; await addWeightEntry({ id: generateId(), date: new Date().toISOString(), weight: value }); setWeightInput(''); setShowWeightModal(false); await loadAll(); };
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; const dataUrl = await resizeImage(file, 900); setPhotoPreview(dataUrl); if (fileRef.current) fileRef.current.value = ''; };
  const savePhoto = async () => { if (!photoPreview) return; await addPhoto({ id: generateId(), date: new Date(photoDate + 'T12:00:00').toISOString(), dataUrl: photoPreview, caption: photoCaption.trim() || undefined }); setPhotoPreview(null); setPhotoCaption(''); await loadAll(); };
  const handleDeletePhoto = async () => { if (!previewPhotoId) return; await deletePhoto(previewPhotoId); setPreviewPhoto(null); setPreviewPhotoId(null); await loadAll(); };

  return (
    <div className="px-4 pt-6 pb-28 animate-fade-in max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Measure</h1>
          <p className="text-sm text-gray-500">Weight, body measurements, body fat, and progress photos.</p>
        </div>
        <select className="input-field !w-auto !py-2 !px-3 text-sm" value={month} onChange={(e) => setMonth(e.target.value)}>{monthOptions.map((key) => <option key={key} value={key}>{formatMonthLabel(key)}</option>)}</select>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="card"><div className="flex items-center gap-2 mb-2"><Scale size={16} className="text-violet-400" /><h2 className="text-sm font-semibold">Latest Weight</h2></div><p className="text-3xl font-bold">{latestWeight ?? '--'}</p><p className="text-xs text-gray-500">lbs {latestWeightDelta !== null && `· ${latestWeightDelta > 0 ? '+' : ''}${latestWeightDelta} from last entry`}</p></div>
        <div className="card"><div className="flex items-center gap-2 mb-2"><Activity size={16} className="text-cyan-400" /><h2 className="text-sm font-semibold">Latest Body Fat</h2></div><p className="text-3xl font-bold">{latestBodyFat ?? '--'}</p><p className="text-xs text-gray-500">% {latestMeasurementDate && `· ${formatFullDate(latestMeasurementDate)}`}</p></div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="card"><div className="flex items-center gap-2 mb-2"><TrendingUp size={16} className="text-emerald-400" /><h2 className="text-sm font-semibold">Weight Trend (30)</h2></div>{weight30.length >= 2 ? <div className="h-40"><WeightLineChart entries={weight30} /></div> : <p className="text-sm text-gray-500">Add more weight entries to see a chart.</p>}</div>
        <div className="card"><div className="flex items-center gap-2 mb-2"><TrendingUp size={16} className="text-amber-400" /><h2 className="text-sm font-semibold">Weight Trend (90)</h2></div>{weight90.length >= 2 ? <div className="h-40"><WeightLineChart entries={weight90} /></div> : <p className="text-sm text-gray-500">Add more weight entries to see a chart.</p>}</div>
      </div>

      <div className="card mb-4">
        <div className="flex items-center gap-2 mb-3"><Activity size={16} className="text-violet-400" /><h2 className="text-sm font-semibold">Body Fat %</h2></div>
        {bodyFatEntries.length >= 2 ? <div className="h-40"><MeasurementLineChart entries={bodyFatEntries} chartField="bodyFat" fieldLabel="Body Fat %" unit="%" /></div> : <p className="text-sm text-gray-500">Add body fat values in measurements to view a trend.</p>}
      </div>

      <div className="card mb-4">
        <div className="flex items-center justify-between mb-3"><h2 className="text-sm font-semibold">Month Summary</h2><span className="text-xs text-gray-500">{formatMonthLabel(month)}</span></div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-gray-900/60 px-3 py-3"><p className="text-xs text-gray-500">Weights</p><p className="text-xl font-bold">{monthWeights.length}</p></div>
          <div className="rounded-xl bg-gray-900/60 px-3 py-3"><p className="text-xs text-gray-500">Measurements</p><p className="text-xl font-bold">{monthEntries.length}</p></div>
          <div className="rounded-xl bg-gray-900/60 px-3 py-3"><p className="text-xs text-gray-500">Photos</p><p className="text-xl font-bold">{monthPhotos.length}</p></div>
        </div>
      </div>

      <div className="card mb-4">
        <h2 className="text-sm font-semibold mb-3">Body Measurements</h2>
        <div className="space-y-2">
          {MEASUREMENT_FIELDS.map((field) => {
            const fieldEntries = monthEntries.filter((e) => typeof e[field.key] === 'number');
            const isOpen = expandedSection === field.key;
            return (
              <div key={field.key} className="rounded-xl border border-gray-800 bg-gray-900/40">
                <button onClick={() => setExpandedSection(isOpen ? null : (field.key as string))} className="flex w-full items-center justify-between px-3 py-3">
                  <div className="text-left"><p className="font-medium text-sm">{field.label}</p><p className="text-xs text-gray-500">{fieldEntries.length > 0 ? `${fieldEntries[0][field.key]} in latest this month` : 'No entries this month'}</p></div>
                  {isOpen ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                </button>
                {isOpen && <div className="border-t border-gray-800 px-3 py-3">{fieldEntries.length >= 2 ? <div className="h-40 mb-3"><MeasurementLineChart entries={fieldEntries.slice().reverse()} chartField={field.key} fieldLabel={field.label} unit="in" /></div> : <p className="text-sm text-gray-500 mb-3">Not enough entries for a chart yet.</p>}<div className="space-y-2">{fieldEntries.slice(0, 5).map((entry) => <div key={entry.id} className="flex items-center justify-between text-sm"><span className="text-gray-400">{new Date(entry.date).toLocaleDateString()}</span><span className="font-medium">{entry[field.key]} in</span></div>)}</div></div>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card mb-4">
        <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><ImageIcon size={16} className="text-violet-400" /><h2 className="text-sm font-semibold">Progress Photos</h2></div><button onClick={() => fileRef.current?.click()} className="btn-secondary !px-3 !py-2 text-sm flex items-center gap-2"><Camera size={15} /> Take Photo</button></div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
        {monthPhotos.length === 0 ? <p className="text-sm text-gray-500">No photos for this month yet.</p> : <div className="grid grid-cols-3 gap-2">{monthPhotos.map((photo) => <button key={photo.id} onClick={() => { setPreviewPhoto(photo.dataUrl); setPreviewPhotoId(photo.id); }} className="aspect-square overflow-hidden rounded-xl border border-gray-800"><img src={photo.dataUrl} alt={photo.caption || 'Progress photo'} className="h-full w-full object-cover" /></button>)}</div>}
      </div>

      <div className="card mb-20">
        <h2 className="text-sm font-semibold mb-3">Recent Measurement Entries</h2>
        {monthEntries.length === 0 ? <p className="text-sm text-gray-500">No measurement entries for this month yet.</p> : <div className="space-y-2">{monthEntries.slice(0, 5).map((entry) => <div key={entry.id} className="rounded-xl bg-gray-900/60 px-3 py-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium">{formatFullDate(entry.date)}</p><p className="text-xs text-gray-500 mt-1">{MEASUREMENT_FIELDS.filter((field) => typeof entry[field.key] === 'number').map((field) => `${field.short}: ${entry[field.key]}`).join(' · ') || 'Body fat only entry'}</p>{typeof entry.bodyFat === 'number' && <p className="text-xs text-cyan-400 mt-1">Body Fat: {entry.bodyFat}%</p>}{entry.notes && <p className="text-xs text-gray-500 mt-1">{entry.notes}</p>}</div><button onClick={() => handleDeleteMeasurement(entry.id)} className="text-gray-500 hover:text-red-400"><Trash2 size={16} /></button></div></div>)}</div>}
      </div>

      <div className="fixed bottom-20 left-0 right-0 z-40 mx-auto flex max-w-lg items-center gap-2 px-4">
        <button onClick={() => setShowWeightModal(true)} className="btn-secondary flex items-center gap-2 !px-4 !py-3"><Scale size={16} /> Quick Weight</button>
        <button onClick={() => fileRef.current?.click()} className="btn-secondary flex items-center gap-2 !px-4 !py-3"><Camera size={16} /> Take Photo</button>
        <button onClick={() => setShowMeasurementModal(true)} className="btn-primary ml-auto flex items-center gap-2 !px-5 !py-3 shadow-lg"><Plus size={16} /> Add Measurement</button>
      </div>

      {showMeasurementModal && <div className="fixed inset-0 z-50 flex items-end bg-black/60 p-4 sm:items-center sm:justify-center"><div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-950 p-4"><div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">Add Measurement</h2><button onClick={() => setShowMeasurementModal(false)} className="text-gray-400 hover:text-white"><X size={18} /></button></div><div className="space-y-3"><input type="date" className="input-field" value={measurementDate} onChange={(e) => setMeasurementDate(e.target.value)} /><div className="grid grid-cols-2 gap-3">{MEASUREMENT_FIELDS.map((field) => <div key={field.key}><label className="text-xs text-gray-400 mb-1 block">{field.label}</label><input type="number" step="0.1" className="input-field" value={formValues[field.key] || ''} onChange={(e) => setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))} /></div>)}</div><div><label className="text-xs text-gray-400 mb-1 block">Body Fat %</label><input type="number" step="0.1" className="input-field" value={bodyFatInput} onChange={(e) => setBodyFatInput(e.target.value)} /></div><textarea className="input-field min-h-20 resize-none" placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} /><button onClick={handleMeasurementSave} className="btn-primary w-full">Save Measurement</button></div></div></div>}

      {showWeightModal && <div className="fixed inset-0 z-50 flex items-end bg-black/60 p-4 sm:items-center sm:justify-center"><div className="w-full max-w-sm rounded-2xl border border-gray-800 bg-gray-950 p-4"><div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">Quick Weight Entry</h2><button onClick={() => setShowWeightModal(false)} className="text-gray-400 hover:text-white"><X size={18} /></button></div><input type="number" step="0.1" className="input-field mb-3 text-center text-xl font-bold" placeholder="Weight (lbs)" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} /><button onClick={handleQuickWeight} className="btn-primary w-full">Save Weight</button></div></div>}

      {photoPreview && <div className="fixed inset-0 z-50 flex items-end bg-black/60 p-4 sm:items-center sm:justify-center"><div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-950 p-4"><div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold">Add Progress Photo</h2><button onClick={() => setPhotoPreview(null)} className="text-gray-400 hover:text-white"><X size={18} /></button></div><img src={photoPreview} alt="Preview" className="mb-3 max-h-96 w-full rounded-xl object-cover" /><input type="date" className="input-field mb-3" value={photoDate} onChange={(e) => setPhotoDate(e.target.value)} /><input className="input-field mb-3" placeholder="Caption (optional)" value={photoCaption} onChange={(e) => setPhotoCaption(e.target.value)} /><button onClick={savePhoto} className="btn-primary w-full">Save Photo</button></div></div>}

      {previewPhoto && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"><div className="relative max-w-3xl w-full"><button onClick={() => { setPreviewPhoto(null); setPreviewPhotoId(null); }} className="absolute -top-10 right-0 text-white"><X size={20} /></button><img src={previewPhoto} alt="Progress photo full size" className="max-h-[85vh] rounded-xl mx-auto" />{previewPhotoId && <div className="mt-3 flex justify-center"><button onClick={handleDeletePhoto} className="btn-secondary !px-4 !py-2 text-red-300 border-red-500/30">Delete Photo</button></div>}</div></div>}
    </div>
  );
}
