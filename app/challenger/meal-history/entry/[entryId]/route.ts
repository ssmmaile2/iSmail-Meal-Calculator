import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ entryId: string }> }
) {
  const { entryId } = await context.params;

  // جلب تاريخ إنشاء الوجبة أولًا
  const { data: entry, error: entryError } = await supabase
    .from("meal_history_entries")
    .select("id, created_at")
    .eq("id", entryId)
    .single();

  if (entryError) {
    return NextResponse.json({ error: entryError.message }, { status: 500 });
  }

  // جلب العناصر التابعة لهذه الوجبة
  const { data: entryItems, error: entryItemsError } = await supabase
    .from("meal_history_entry_items")
    .select("food_id, qty_g")
    .eq("entry_id", entryId);

  if (entryItemsError) {
    return NextResponse.json({ error: entryItemsError.message }, { status: 500 });
  }

  // حذف سجلات الاستهلاك المولّدة تلقائيًا من هذه الوجبة
  // نعتمد على نفس التاريخ + نفس العناصر + الملاحظة التلقائية
  for (const item of entryItems ?? []) {
    await supabase
      .from("food_consumption_logs")
      .delete()
      .eq("food_id", item.food_id)
      .eq("qty_g", item.qty_g)
      .eq("consumed_at", entry.created_at)
      .like("notes", "تم توليد هذا السجل تلقائيًا من وجبة محفوظة.%");
  }

  // حذف الوجبة نفسها (وسيُحذف entry_items تلقائيًا بسبب on delete cascade)
  const { error: deleteEntryError } = await supabase
    .from("meal_history_entries")
    .delete()
    .eq("id", entryId);

  if (deleteEntryError) {
    return NextResponse.json({ error: deleteEntryError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
