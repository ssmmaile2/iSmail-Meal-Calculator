import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const withItems = searchParams.get("with_items") === "true";
  const q = (searchParams.get("query") || "").trim();

  let query = supabase
    .from("hidden_meals")
    .select("id, title, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (q) {
    query = query.ilike("title", `%${q}%`);
  }

  const { data: meals, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!withItems || !meals || meals.length === 0) {
    return NextResponse.json(meals ?? []);
  }

  const mealIds = meals.map((m) => m.id);

  const { data: items, error: itemsError } = await supabase
    .from("hidden_meal_items")
    .select(`
      id,
      qty_g,
      hidden_meal_id,
      foods:food_id (
        id,
        name_ar,
        aliases,
        kcal_100,
        protein_100,
        fat_100,
        carbs_total_100,
        fiber_100,
        notes,
        default_qty_g,
        is_preset
      )
    `)
    .in("hidden_meal_id", mealIds)
    .order("created_at", { ascending: true });

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  const mealsWithItems = meals.map((meal) => ({
    ...meal,
    items: (items ?? []).filter((item) => item.hidden_meal_id === meal.id),
  }));

  return NextResponse.json(mealsWithItems);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const title =
    typeof body?.title === "string" && body.title.trim()
      ? body.title.trim()
      : "وجبة خفية جديدة";

  const { data, error } = await supabase
    .from("hidden_meals")
    .insert([{ title }])
    .select("id, title, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
