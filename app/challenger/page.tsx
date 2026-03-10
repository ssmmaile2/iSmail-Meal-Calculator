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
    .replace(/[أإآ]/