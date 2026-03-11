import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  const { data: entries, error } = await supabase
    .from("meal_history_entries")
    .select("id, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const grouped = new Map<string, number>();

  for (const entry of entries ?? []) {
    const day = new Date(entry.created_at).toISOString().slice(0, 10);
    grouped.set(day, (grouped.get(day) || 0) + 1);
  }

  const result = Array.from(grouped.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const body = await req.json();
  const meal_id = body.meal_id as string | undefined;
  const notes = body.notes ? String(body.notes) : null;

  if (!meal_id) {
    return NextResponse.json({ error: "meal_id مطلوب" }, { status: 400 });
  }

  // 1) جلب مكونات الوجبة الحالية
  const { data: mealItems, error: mealItemsError } = await supabase
    .from("meal_items")
    .select("food_id, qty_g")
    .eq("meal_id", meal_id);

  if (mealItemsError) {
    return NextResponse.json({ error: mealItemsError.message }, { status: 500 });
  }

  if (!mealItems || mealItems.length === 0) {
    return NextResponse.json({ error: "لا توجد مكونات لحفظها" }, { status: 400 });
  }

  // 2) إنشاء مدخل سجل الوجبة
  const { data: entry, error: entryError } = await supabase
    .from("meal_history_entries")
    .insert([{ notes }])
    .select()
    .single();

  if (entryError) {
    return NextResponse.json({ error: entryError.message }, { status: 500 });
  }

  // 3) حفظ مكونات الوجبة داخل سجل الوجبات
  const mealHistoryRows = mealItems.map((item) => ({
    entry_id: entry.id,
    food_id: item.food_id,
    qty_g: item.qty_g,
  }));

  const { error: historyItemsError } = await supabase
    .from("meal_history_entry_items")
    .insert(mealHistoryRows);

  if (historyItemsError) {
    return NextResponse.json({ error: historyItemsError.message }, { status: 500 });
  }

  // 4) توليد سجلات استهلاك تلقائيًا من نفس الوجبة
  // created_at الخاص بالوجبة سيكون هو مرجع الاستهلاك
  const consumptionRows = mealItems.map((item) => ({
    food_id: item.food_id,
    qty_g: item.qty_g,
    consumed_at: entry.created_at,
    notes: notes
      ? `تم توليد هذا السجل تلقائيًا من وجبة محفوظة. ملاحظة الوجبة: ${notes}`
      : "تم توليد هذا السجل تلقائيًا من وجبة محفوظة.",
  }));

  const { error: consumptionError } = await supabase
    .from("food_consumption_logs")
    .insert(consumptionRows);

  if (consumptionError) {
    return NextResponse.json({ error: consumptionError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    entry_id: entry.id,
    created_at: entry.created_at,
    generated_consumption_logs: consumptionRows.length,
  });
}
