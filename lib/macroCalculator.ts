/**
 * Macro Calculator Engine
 * Calcululates personalized daily macronutrient and calorie goals based on user metrics
 *
 * Uses Mifflin-St Jeor equation for BMR (most accurate)
 * Activity multipliers from standard TDEE calculations
 * Goal-based adjustments for weight loss/gain
 */

export interface MacroProfileInput {
  age: number;
  gender: 'male' | 'female';
  height: number; // in cm
  weight: number; // in kg
  bodyFat?: number; // optional, percentage
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very-active';
  goal: 'lose' | 'maintain' | 'gain';
  macroPreference: 'balanced' | 'low-carb' | 'keto' | 'high-protein' | 'custom';
  weeklyWeightChange: number; // in kg, negative for loss, positive for gain
}

export interface MacroProfileResult {
  bmr: number; // calories
  tdee: number; // calories
  targetCalories: number; // adjusted based on goal
  targetProtein: number; // grams
  targetCarbs: number; // grams
  targetFats: number; // grams
  targetFiber: number; // grams (recommended)
  targetWater: number; // ml (recommended)
  proteinGramsPerKg: number;
  carbCaloriesPercent: number;
  fatCaloriesPercent: number;
  proteinCaloriesPercent: number;
}

export function calculateBMR(weight: number, height: number, age: number, gender: 'male' | 'female'): number {
  let bmr = 10 * weight + 6.25 * height - 5 * age;
  if (gender === 'male') {
    bmr += 5;
  } else {
    bmr -= 161;
  }
  return Math.round(bmr);
}

export function getActivityMultiplier(activityLevel: MacroProfileInput['activityLevel']): number {
  const multipliers: Record<MacroProfileInput['activityLevel'], number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    'very-active': 1.9,
  };
  return multipliers[activityLevel];
}

export function calculateCalorieAdjustment(weeklyWeightChange: number, currentWeight: number): number {
  const weeklyCalories = weeklyWeightChange * 7700;
  const dailyAdjustment = weeklyCalories / 7;
  return Math.round(dailyAdjustment);
}

export function getMacroRatios(preference: MacroProfileInput['macroPreference']): {
  protein: number;
  carbRatio: number;
  fatRatio: number;
} {
  switch (preference) {
    case 'balanced': return { protein: 1.8, carbRatio: 0.5, fatRatio: 0.3 };
    case 'low-carb': return { protein: 1.8, carbRatio: 0.3, fatRatio: 0.4 };
    case 'keto': return { protein: 1.6, carbRatio: 0.05, fatRatio: 0.75 };
    case 'high-protein': return { protein: 2.2, carbRatio: 0.4, fatRatio: 0.2 };
    case 'custom':
    default: return { protein: 1.8, carbRatio: 0.5, fatRatio: 0.3 };
  }
}

export function calculateWaterIntake(weight: number): number {
  return Math.round(weight * 35);
}

export function calculateFiberIntake(calories: number): number {
  return Math.round(calories / 1000 * 14);
}

export function calculateMacros(input: MacroProfileInput): MacroProfileResult {
  const bmr = calculateBMR(input.weight, input.height, input.age, input.gender);
  const activityMultiplier = getActivityMultiplier(input.activityLevel);
  const tdee = Math.round(bmr * activityMultiplier);
  const calorieAdjustment = calculateCalorieAdjustment(input.weeklyWeightChange, input.weight);
  const targetCalories = Math.max(1500, tdee + calorieAdjustment);
  const { protein: proteinPerKg, carbRatio, fatRatio } = getMacroRatios(input.macroPreference);
  const targetProtein = Math.round(input.weight * proteinPerKg);
  const proteinCalories = targetProtein * 4;
  const fatCalories = Math.round(targetCalories * fatRatio);
  const targetFats = Math.round(fatCalories / 9);
  const remainingCalories = targetCalories - proteinCalories - fatCalories;
  const targetCarbs = Math.max(0, Math.round(remainingCalories / 4));
  const totalCalculated = proteinCalories + (targetFats * 9) + (targetCarbs * 4);
  const finalCalories = Math.round(totalCalculated);
  const proteinCaloriesPercent = (proteinCalories / finalCalories) * 100;
  const carbCaloriesPercent = ((targetCarbs * 4) / finalCalories) * 100;
  const fatCaloriesPercent = ((targetFats * 9) / finalCalories) * 100;
  const targetFiber = calculateFiberIntake(finalCalories);
  const targetWater = calculateWaterIntake(input.weight);
  return {
    bmr, tdee,
    targetCalories: finalCalories,
    targetProtein, targetCarbs, targetFats, targetFiber, targetWater,
    proteinGramsPerKg: Math.round(proteinPerKg * 10) / 10,
    carbCaloriesPercent: Math.round(carbCaloriesPercent * 10) / 10,
    fatCaloriesPercent: Math.round(fatCaloriesPercent * 10) / 10,
    proteinCaloriesPercent: Math.round(proteinCaloriesPercent * 10) / 10,
  };
}

export function validateMacroInput(input: Partial<MacroProfileInput>): string[] {
  const errors: string[] = [];
  if (!input.age || input.age < 10 || input.age > 100) errors.push('Age must be between 10 and 100');
  if (!input.height || input.height < 100 || input.height > 250) errors.push('Height must be between 100cm and 250cm');
  if (!input.weight || input.weight < 30 || input.weight > 300) errors.push('Weight must be between 30kg and 300kg');
  if (!input.activityLevel) errors.push('Activity level is required');
  if (!input.goal) errors.push('Goal is required');
  if (!input.macroPreference) errors.push('Macro preference is required');
  if (input.weeklyWeightChange !== undefined) {
    if (input.weeklyWeightChange < -1 || input.weeklyWeightChange > 1) {
      errors.push('Weekly weight change must be between -1kg and +1kg');
    }
  }
  return errors;
}
