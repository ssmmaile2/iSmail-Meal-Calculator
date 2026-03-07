import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

type FoodRow = {
  id: string;
  name_ar: string;
  aliases?: string[] | null;
  kcal_100: number;
  protein_100: number;
  fat_100: number;
  carbs_total_100: number;
  fiber_100: number;
  notes?: string | null;
  default_qty_g?: number | null;
  is_preset?: boolean | null;
};

function normalizeArabic(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[\u064B-\u065F\u0670]/g, "") // إزالة التشكيل
    .replace(/\s+/g, " ");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("query") || "").trim();

  if (!q) {
    return NextResponse.json([]);
  }

  const normalizedQ = normalizeArabic(q);

  const { data, error } = await supabase
    .from("foods")
    .select(
      "id, name_ar, aliases, kcal_100, protein_100, fat_100, carbs_total_100, fiber_100, notes, default_qty_g, is_preset"
    )
    .order("name_ar", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as FoodRow[];

  const filtered = rows.filter((item) => {
    const name = normalizeArabic(item.name_ar || "");
    const notes = normalizeArabic(item.notes || "");
    const aliases = Array.isArray(item.aliases)
      ? item.aliases.map((a) => normalizeArabic(a))
      : [];

    return (
      name.includes(normalizedQ) ||
      notes.includes(normalizedQ) ||
      aliases.some((alias) => alias.includes(normalizedQ))
    );
  });

  return NextResponse.json(filtered.slice(0, 20));
}