import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: mealId } = await context.params;

  if (!mealId) {
    return NextResponse.json({ error: "mealId is missing" }, { status: 400 });
  }

  // جلب الوجبة الحالية
  const { data: meal, error: mealError } = await supabase
    .from("meals")
    .select("id, title")
    .eq("id", mealId)
    .single();

  if (mealError || !meal) {
    return NextResponse.json(
      { error: mealError?.message || "Meal not found" },
      { status: 404 }
    );
  }

  // جلب عناصر الوجبة
  const { data: items, error: itemsError } = await supabase
    .from("meal_items")
    .select("food_id, qty_g")
    .eq("meal_id", mealId);

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  if (!items || items.length === 0) {
    return NextResponse.json(
      { error: "Cannot save hidden meal because it is empty" },
      { status: 400 }
    );
  }

  // إنشاء وجبة جديدة في السجل الخفي
  const { data: hiddenMeal, error: hiddenMealError } = await supabase
    .from("meals")
    .insert([
      {
        title: meal.title || "وجبة مخفية",
        is_hidden: true,
      },
    ])
    .select("id, title, is_hidden")
    .single();

  if (hiddenMealError || !hiddenMeal) {
    return NextResponse.json(
      { error: hiddenMealError?.message || "Failed to create hidden meal" },
      { status: 500 }
    );
  }

  // نسخ العناصر
  const rows = items.map((item) => ({
    meal_id: hiddenMeal.id,
    food_id: item.food_id,
    qty_g: item.qty_g,
  }));

  const { error: insertItemsError } = await supabase
    .from("meal_items")
    .insert(rows);

  if (insertItemsError) {
    return NextResponse.json(
      { error: insertItemsError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    meal: hiddenMeal,
  });
}
