import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ logId: string }> }
) {
  const { logId } = await context.params;
  const body = await req.json();

  const payload: Record<string, unknown> = {};

  if (body.qty_g !== undefined) payload.qty_g = Number(body.qty_g);
  if (body.consumed_at !== undefined) payload.consumed_at = body.consumed_at;
  if (body.notes !== undefined) payload.notes = body.notes || null;

  if (Object.keys(payload).length === 0) {
    return NextResponse.json(
      { error: "لا توجد حقول للتعديل" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("food_consumption_logs")
    .update(payload)
    .eq("id", logId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ logId: string }> }
) {
  const { logId } = await context.params;

  const { error } = await supabase
    .from("food_consumption_logs")
    .delete()
    .eq("id", logId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}