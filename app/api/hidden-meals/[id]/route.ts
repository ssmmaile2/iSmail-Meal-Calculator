import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const { data: meal, error: mealError } = await supabase
    .from("hidden_meals")
    .select("id, title, created_at, updated_at")
    .eq("id", id)
    .single();

  if (mealError) {
    return NextResponse.json({ error: mealError.message }, { status: 500 });
  }

  const { data: items, error: itemsError } = await supabase
    .from("hidden_meal_items")
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
    .eq("hidden_meal_id", id)
    .order("created_at", { ascending: true });

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  return NextResponse.json({
    meal,
    items: items ?? [],
  });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = await req.json();
  const { title } = body;

  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("hidden_meals")
    .update({ title })
    .eq("id", id)
    .select("id, title, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const { error } = await supabase
    .from("hidden_meals")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
