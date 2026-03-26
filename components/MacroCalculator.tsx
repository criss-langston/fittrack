"use client";

import React, { useState, useEffect } from 'react';
import { X, Save, Calculator, Beef, Wheat, Fish } from 'lucide-react';
import { calculateMacros, validateMacroInput, MacroProfileInput, MacroProfileResult } from '@/lib/macroCalculator';
import { saveUserProfile, getUserProfile } from '@/lib/db';

interface MacroCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileSaved: () => void;
}

export default function MacroCalculator({ isOpen, onClose, onProfileSaved }: MacroCalculatorProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [profile, setProfile] = useState<MacroProfileInput>({
    age: 30, gender: 'male', height: 175, weight: 70, bodyFat: undefined,
    activityLevel: 'moderate', goal: 'maintain', macroPreference: 'balanced', weeklyWeightChange: 0,
  });
  const [result, setResult] = useState<MacroProfileResult | null>(null);
  const [savedProfile, setSavedProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'input' | 'results'>('input');

  useEffect(() => { if (isOpen) { loadSavedProfile(); } }, [isOpen]);

  const loadSavedProfile = async () => {
    try {
      const existing = await getUserProfile();
      if (existing) {
        setSavedProfile(existing);
        setProfile({ age: existing.age, gender: existing.gender, height: existing.height, weight: existing.weight,
          bodyFat: existing.bodyFat, activityLevel: existing.activityLevel, goal: existing.goal,
          macroPreference: existing.macroPreference, weeklyWeightChange: existing.weeklyWeightChange });
        const calculated = calculateMacros({ age: existing.age, gender: existing.gender, height: existing.height,
          weight: existing.weight, bodyFat: existing.bodyFat, activityLevel: existing.activityLevel,
          goal: existing.goal, macroPreference: existing.macroPreference, weeklyWeightChange: existing.weeklyWeightChange });
        setResult(calculated); setActiveTab('results');
      }
    } catch (err) { console.error('Failed to load profile:', err); }
  };

  const calculate = () => {
    const validationErrors = validateMacroInput(profile);
    if (validationErrors.length > 0) { setErrors(validationErrors); return; }
    const calculated = calculateMacros(profile);
    setResult(calculated); setActiveTab('results');
  };

  const handleSave = async () => {
    if (!result) return;
    setLoading(true);
    try {
      await saveUserProfile({ ...profile, id: savedProfile?.id || ('profile_' + Date.now()),
        bmr: result.bmr, tdee: result.tdee, targetProtein: result.targetProtein,
        targetCarbs: result.targetCarbs, targetFats: result.targetFats, targetCalories: result.targetCalories,
        targetWater: result.targetWater, lastUpdated: new Date().toISOString() });
      onProfileSaved(); onClose();
    } catch (err) { setErrors(['Failed to save profile.']); } finally { setLoading(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Calculator className="text-violet-500" size={24} />
            <h2 className="text-xl font-bold text-white">Macro Calculator</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-800 transition-colors"><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="flex border-b border-gray-800">
          <button onClick={() => setActiveTab('input')} className={`flex-1 py-3 text-sm font-medium ${activeTab === 'input' ? 'text-violet-500 border-b-2 border-violet-500' : 'text-gray-400'}`}>Input</button>
          <button onClick={() => setActiveTab('results')} disabled={!result} className={`flex-1 py-3 text-sm font-medium ${activeTab === 'results' ? 'text-violet-500 border-b-2 border-violet-500' : 'text-gray-400'}`}>Results</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {errors.length > 0 && <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg"><ul className="text-sm text-red-300">{errors.map((e, i) => <li key={i}>• {e}</li>)}</ul></div>}
          {activeTab === 'input' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm text-gray-300 mb-1">Age</label><input type="number" value={profile.age} onChange={(e) => setProfile(p => ({...p, age: parseInt(e.target.value)||0}))} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white" /></div>
              <div><label className="block text-sm text-gray-300 mb-1">Gender</label><select value={profile.gender} onChange={(e) => setProfile(p => ({...p, gender: e.target.value as any}))} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"><option value="male">Male</option><option value="female">Female</option></select></div>
              <div><label className="block text-sm text-gray-300 mb-1">Height (cm)</label><input type="number" value={profile.height} onChange={(e) => setProfile(p => ({...p, height: parseFloat(e.target.value)||0}))} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white" /></div>
              <div><label className="block text-sm text-gray-300 mb-1">Weight (kg)</label><input type="number" value={profile.weight} onChange={(e) => setProfile(p => ({...p, weight: parseFloat(e.target.value)||0}))} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white" /></div>
              <div><label className="block text-sm text-gray-300 mb-1">Activity Level</label><select value={profile.activityLevel} onChange={(e) => setProfile(p => ({...p, activityLevel: e.target.value as any}))} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"><option value="sedentary">Sedentary</option><option value="light">Light</option><option value="moderate">Moderate</option><option value="active">Active</option><option value="very-active">Very Active</option></select></div>
              <div><label className="block text-sm text-gray-300 mb-1">Goal</label><select value={profile.goal} onChange={(e) => setProfile(p => ({...p, goal: e.target.value as any}))} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"><option value="lose">Lose Weight</option><option value="maintain">Maintain</option><option value="gain">Gain Muscle</option></select></div>
            </div>
          )}
          {activeTab === 'results' && result && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4"><div className="text-sm text-gray-400">BMR</div><div className="text-2xl font-bold">{result.bmr}</div></div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4"><div className="text-sm text-gray-400">TDEE</div><div className="text-2xl font-bold">{result.tdee}</div></div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4"><div className="text-sm text-gray-400">Target Cal</div><div className="text-2xl font-bold text-violet-400">{result.targetCalories}</div></div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4"><div className="text-sm text-gray-400">Water (ml)</div><div className="text-2xl font-bold text-blue-400">{result.targetWater}</div></div>
              </div>
              <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-4 space-y-3">
                <div className="flex justify-between"><span className="flex items-center gap-2"><Beef size={16} className="text-red-500" />Protein</span><span className="font-bold">{result.targetProtein}g</span></div>
                <div className="flex justify-between"><span className="flex items-center gap-2"><Wheat size={16} className="text-blue-500" />Carbs</span><span className="font-bold">{result.targetCarbs}g</span></div>
                <div className="flex justify-between"><span className="flex items-center gap-2"><Fish size={16} className="text-yellow-500" />Fats</span><span className="font-bold">{result.targetFats}g</span></div>
              </div>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-gray-800 flex justify-end gap-3">
          {activeTab === 'input' ? (
            <button onClick={calculate} className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium flex items-center gap-2"><Calculator size={18} />Calculate</button>
          ) : (
            <><button onClick={() => setActiveTab('input')} className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium">Edit</button>
            <button onClick={handleSave} disabled={loading} className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"><Save size={18} />Save Profile</button></>
          )}
        </div>
      </div>
    </div>
  );
}
