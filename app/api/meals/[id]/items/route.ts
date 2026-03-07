import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: mealId } = await context.params;

  if (!mealId) {
    return NextResponse.json({ error: "mealId is missing" }, { status: 400 });
  }

  const body = await req.json();
  const { food_id, qty_g } = body;

  if (!food_id || typeof qty_g !== "number") {
    return NextResponse.json(
      { error: "food_id and qty_g are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("meal_items")
    .insert([{ meal_id: mealId, food_id, qty_g }])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase
    .from("meals")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", mealId);

  return NextResponse.json(data);
}
