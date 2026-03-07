import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: mealId } = await context.params;

  if (!mealId) {
    return NextResponse.json({ error: "mealId is missing" }, { status: 400 });
  }

  const { data: meal, error: mealError } = await supabase
    .from("meals")
    .select("id, title, created_at")
    .eq("id", mealId)
    .single();

  if (mealError) {
    return NextResponse.json({ error: mealError.message }, { status: 500 });
  }

  const { data: items, error: itemsError } = await supabase
    .from("meal_items")
    .select(`
      id,
      qty_g,
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
    .eq("meal_id", mealId)
    .order("created_at", { ascending: true });

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  return NextResponse.json({
    meal,
    items: items ?? [],
  });
}