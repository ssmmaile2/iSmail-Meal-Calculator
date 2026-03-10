"use client";

import React, { useEffect, useMemo, useState } from "react";

type Food = {
  id: string;
  name_ar: string;
  aliases?: string[];
  kcal_100: number;
  protein_100: number;
  fat_100: number;
  carbs_total_100: number;
  fiber_100: number;
  notes?: string;
  default_qty_g?: number | null;
  is_preset?: boolean | null;
  renal_group?: string | null;
  renal_reason?: string | null;
  renal_max_per_meal_g?: number | null;
  renal_max_times_per_day?: number | null;
  renal_max_times_per_week?: number | null;
  renal_limit_details?: string | null;
  is_high_potassium?: boolean | null;
  is_high_phosphorus?: boolean | null;
  is_dense_protein?: boolean | null;
  is_high_sodium?: boolean | null;
  renal_shared_load_score?: number | null;
};

type MealItem = {
  id: string;
  qty_g: number;
  foods: Food | null;
};

type MealRiskAnalysis = {
  totalSharedLoad: number;
  hasHighPotassium: boolean;
  hasHighPhosphorus: boolean;
  hasDenseProtein: boolean;
  hasHighSodium: boolean;
  redAlert: boolean;
  orangeAlert: boolean;
  riskFoods: string[];
  messages: string[];
};

const NUTS_CONFLICT_NAMES = [
  "لوز",
  "جوز",
  "فول سوداني",
  "كاجو",
  "فستق",
  "بندق",
  "جوز البرازيل",
];

const DENSE_LEGUMES_CONFLICT_NAMES = [
  "عدس جاف",
  "حمص جاف",
  "فول مجفف",
  "فاصوليا بيضاء جافة",
  "فاصوليا حمراء جافة",
  "لوبيا جافة",
  "ترمس جاف",
  "بازلاء جافة",
  "طبق العدس الخاص بمسافرنا",
  "لوبيّة مسافرنا",
  "ترمس مسافرنا",
  "بيصارة البازلاء الخاصة",
  "بيصارة الفول الخاصة",
];

const DENSE_DAIRY_CONFLICT_NAMES = [
  "لبنة",
  "زبادي طبيعي كامل",
  "زبادي منزوع الدسم",
  "لبن رائب",
  "حليب كامل الدسم (تجاري)",
  "حليب نصف دسم",
  "حليب منزوع الدسم",
  "حليب بقري بلدي",
  "حليب إبل كامل الدسم",
  "جبن طري",
  "جبن شيدر",
  "جبن موزاريلا",
  "جبن قريش",
];

const DENSE_ANIMAL_PROTEIN_CONFLICT_NAMES = [
  "بيض دجاج",
  "بيض ديك رومي",
  "لحم بقر",
  "لحم غنم",
  "لحم ماعز",
  "دجاج",
  "دجاج بلدي",
  "أرنب",
  "لحم إبل (هبرة)",
  "لحم الديك الرومي",
  "لحم الدجاج الحبشي",
  "كبد الإبل",
  "قلب الإبل",
  "رئة الإبل",
  "كرشة الإبل",
];

const HIGH_POTASSIUM_FRUITS_CONFLICT_NAMES = [
  "أفوكادو",
  "افوكادو",
  "موز",
  "كيوي",
  "رمان",
  "تمر",
  "تين",
  "برقوق مجفف",
];

function normalizeArabic(text: string) {
  return (text || "")
    .toLowerCase()
    .trim()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/\s+/g, " ");
}

export default function ChallengerPage() {
  const [mealId, setMealId] = useState<string | null>(null);
  const [items, setItems] = useState<MealItem[]>([]);
  const [query, setQuery] = useState("");
  const [qty, setQty] = useState<number | "">(100);
  const [suggestions, setSuggestions] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    async function createMeal() {
      try {
        const res = await fetch("/api/meals", { method: "POST" });
        const meal = await res.json();

        if (!res.ok) {
          alert(meal.error || "فشل في إنشاء الوجبة");
          setLoading(false);
          return;
        }

        setMealId(meal.id);
        await refreshMeal(meal.id);
      } catch (error) {
        console.error(error);
        alert("حدث خطأ أثناء إنشاء الوجبة");
      } finally {
        setLoading(false);
      }
    }

    createMeal();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/foods?query=${encodeURIComponent(query)}`);
        const data = await res.json();

        if (!res.ok) return;
        setSuggestions(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error(error);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  async function refreshMeal(id: string) {
    try {
      const res = await fetch(`/api/meals/${id}`);
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "فشل في تحميل الوجبة");
        return;
      }

      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء تحميل الوجبة");
    }
  }

  function calcRow(food: Food, qty_g: number) {
    const factor = qty_g / 100;
    const kcal = food.kcal_100 * factor;
    const protein = food.protein_100 * factor;
    const fat = food.fat_100 * factor;
    const fiber = food.fiber_100 * factor;
    const carbsTotal = food.carbs_total_100 * factor;
    const netCarb = carbsTotal - fiber;
    return { kcal, protein, fat, fiber, netCarb };
  }

  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        if (!item.foods) return acc;
        const row = calcRow(item.foods, item.qty_g);
        acc.kcal += row.kcal;
        acc.protein += row.protein;
        acc.fat += row.fat;
        acc.fiber += row.fiber;
        acc.netCarb += row.netCarb;
        return acc;
      },
      { kcal: 0, protein: 0, fat: 0, fiber: 0, netCarb: 0 }
    );
  }, [items]);

  const mealRisk = useMemo<MealRiskAnalysis>(() => {
    const validFoods = items.map((item) => item.foods).filter((food): food is Food => !!food);

    const totalSharedLoad = validFoods.reduce(
      (sum, food) => sum + Number(food.renal_shared_load_score || 0),
      0
    );

    const highPotassiumFoods = validFoods.filter((f) => !!f.is_high_potassium);
    const highPhosphorusFoods = validFoods.filter((f) => !!f.is_high_phosphorus);
    const denseProteinFoods = validFoods.filter((f) => !!