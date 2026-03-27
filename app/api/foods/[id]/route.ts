import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = await req.json();

  const {
    name_ar,
    aliases,
    kcal_100,
    protein_100,
    fat_100,
    carbs_total_100,
    fiber_100,
    notes,
    default_qty_g,
    is_preset,
  } = body;

  if (!name_ar || typeof name_ar !== "string") {
    return NextResponse.json({ error: "name_ar is required" }, { status: 400 });
  }

  const parsedAliases = Array.isArray(aliases)
    ? aliases.filter((v) => typeof v === "string" && v.trim())
    : [];

  const { data, error } = await supabase
    .from("foods")
    .update({
      name_ar: name_ar.trim(),
      aliases: parsedAliases,
      kcal_100: Number(kcal_100 || 0),
      protein_100: Number(protein_100 || 0),
      fat_100: Number(fat_100 || 0),
      carbs_total_100: Number(carbs_total_100 || 0),
      fiber_100: Number(fiber_100 || 0),
      notes: typeof notes === "string" ? notes.trim() : "",
      default_qty_g: Number(default_qty_g || 100),
      is_preset: typeof is_preset === "boolean" ? is_preset : true,
    })
    .eq("id", id)
    .select()
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
    .from("foods")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
