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

type MealItemRow = {
  id: string;
  qty_g: number;
  food_id: string;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const withItems = searchParams.get("with_items") === "true";

  const { data: meals, error: mealsError } = await supabase
    .from("meals")
    .select("id, title, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (mealsError) {
    return NextResponse.json({ error: mealsError.message }, { status: 500 });
  }

  if (!withItems) {
    return NextResponse.json(meals ?? []);
  }

  const mealIds = (meals ?? []).map((meal) => meal.id);

  if (mealIds.length === 0) {
    return NextResponse.json([]);
  }

  const { data: rawItems, error: itemsError } = await supabase
    .from("meal_items")
    .select("id, qty_g, food_id, meal_id")
    .in("meal_id", mealIds)
    .order("created_at", { ascending: true });

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  const foodIds = Array.from(
    new Set((rawItems ?? []).map((item) => item.food_id).filter(Boolean))
  );

  let foodsMap: Record<string, FoodRow> = {};

  if (foodIds.length > 0) {
    const { data: foods, error: foodsError } = await supabase
      .from("foods")
      .select(
        "id, name_ar, aliases, kcal_100, protein_100, fat_100, carbs_total_100, fiber_100, notes, default_qty_g, is_preset"
      )
      .in("id", foodIds);

    if (foodsError) {
      return NextResponse.json({ error: foodsError.message }, { status: 500 });
    }

    foodsMap = Object.fromEntries((foods ?? []).map((food) => [food.id, food]));
  }

  const itemsByMeal: Record<string, any[]> = {};

  for (const item of rawItems ?? []) {
    if (!itemsByMeal[item.meal_id]) {
      itemsByMeal[item.meal_id] = [];
    }

    itemsByMeal[item.meal_id].push({
      id: item.id,
      qty_g: item.qty_g,
      foods: foodsMap[item.food_id] || null,
    });
  }

  const result = (meals ?? []).map((meal) => ({
    ...meal,
    items: itemsByMeal[meal.id] || [],
  }));

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  let body: { title?: string } = {};

  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const title = body.title?.trim() || "وجبة جديدة";

  const { data, error } = await supabase
    .from("meals")
    .insert([{ title }])
    .select("id, title, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
