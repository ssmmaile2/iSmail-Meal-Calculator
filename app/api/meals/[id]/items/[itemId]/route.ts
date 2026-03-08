import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id: mealId, itemId } = await context.params;
  const body = await req.json();
  const { qty_g } = body;

  if (typeof qty_g !== "number" || qty_g < 0) {
    return NextResponse.json(
      { error: "qty_g must be a positive number" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("meal_items")
    .update({ qty_g })
    .eq("id", itemId)
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

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id: mealId, itemId } = await context.params;

  const { error } = await supabase
    .from("meal_items")
    .delete()
    .eq("id", itemId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase
    .from("meals")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", mealId);

  return NextResponse.json({ success: true });
}import { supabase } from "@/lib/supabaseClient";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id: mealId, itemId } = await context.params;
  const body = await req.json();
  const { qty_g } = body;

  if (typeof qty_g !== "number" || qty_g < 0) {
    return NextResponse.json(
      { error: "qty_g must be a positive number" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("meal_items")
    .update({ qty_g })
    .eq("id", itemId)
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

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id: mealId, itemId } = await context.params;

  const { error } = await supabase
    .from("meal_items")
    .delete()
    .eq("id", itemId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase
    .from("meals")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", mealId);

  return NextResponse.json({ success: true });
}
