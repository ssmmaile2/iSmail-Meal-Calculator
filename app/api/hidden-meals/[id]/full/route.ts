import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = await req.json();
  const { title, items } = body;

  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  if (!Array.isArray(items)) {
    return NextResponse.json({ error: "items must be an array" }, { status: 400 });
  }

  const { error: mealError } = await supabase
    .from("hidden_meals")
    .update({ title })
    .eq("id", id);

  if (mealError) {
    return NextResponse.json({ error: mealError.message }, { status: 500 });
  }

  const { error: deleteError } = await supabase
    .from("hidden_meal_items")
    .delete()
    .eq("hidden_meal_id", id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  const cleanItems = items
    .filter(
      (item) =>
        item &&
        item.food_id &&
        typeof item.qty_g === "number" &&
        item.qty_g >= 0
    )
    .map((item) => ({
      hidden_meal_id: id,
      food_id: item.food_id,
      qty_g: item.qty_g,
    }));

  if (cleanItems.length > 0) {
    const { error: insertError } = await supabase
      .from("hidden_meal_items")
      .insert(cleanItems);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
