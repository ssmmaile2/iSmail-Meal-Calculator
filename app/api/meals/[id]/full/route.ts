import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: mealId } = await context.params;
  const body = await req.json();

  const { title, items } = body;

  if (!mealId) {
    return NextResponse.json({ error: "mealId is missing" }, { status: 400 });
  }

  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  if (!Array.isArray(items)) {
    return NextResponse.json({ error: "items must be an array" }, { status: 400 });
  }

  const { error: updateMealError } = await supabase
    .from("meals")
    .update({ title })
    .eq("id", mealId);

  if (updateMealError) {
    return NextResponse.json({ error: updateMealError.message }, { status: 500 });
  }

  const { error: deleteOldItemsError } = await supabase
    .from("meal_items")
    .delete()
    .eq("meal_id", mealId);

  if (deleteOldItemsError) {
    return NextResponse.json({ error: deleteOldItemsError.message }, { status: 500 });
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
      meal_id: mealId,
      food_id: item.food_id,
      qty_g: item.qty_g,
    }));

  if (cleanItems.length > 0) {
    const { error: insertItemsError } = await supabase
      .from("meal_items")
      .insert(cleanItems);

    if (insertItemsError) {
      return NextResponse.json({ error: insertItemsError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
