import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(
  _req: Request,
  context: { params: Promise<{ date: string }> }
) {
  const { date } = await context.params;

  const start = `${date}T00:00:00.000Z`;
  const end = `${date}T23:59:59.999Z`;

  const { data: entries, error: entriesError } = await supabase
    .from("meal_history_entries")
    .select("id, notes, created_at")
    .gte("created_at", start)
    .lte("created_at", end)
    .order("created_at", { ascending: false });

  if (entriesError) {
    return NextResponse.json({ error: entriesError.message }, { status: 500 });
  }

  const entryIds = (entries ?? []).map((e) => e.id);

  if (entryIds.length === 0) {
    return NextResponse.json({ date, entries: [] });
  }

  const { data: items, error: itemsError } = await supabase
    .from("meal_history_entry_items")
    .select(`
      id,
      entry_id,
      qty_g,
      foods (
        id,
        name_ar
      )
    `)
    .in("entry_id", entryIds);

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  const result = (entries ?? []).map((entry) => ({
    ...entry,
    items: (items ?? [])
      .filter((item: any) => item.entry_id === entry.id)
      .map((item: any) => ({
        id: item.id,
        qty_g: item.qty_g,
        food: item.foods,
      })),
  }));

  return NextResponse.json({
    date,
    entries: result,
  });
}