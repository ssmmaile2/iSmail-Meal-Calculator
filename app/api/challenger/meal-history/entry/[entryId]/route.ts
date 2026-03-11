import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ entryId: string }> }
) {
  const { entryId } = await context.params;

  if (!entryId) {
    return NextResponse.json({ error: "entryId مفقود" }, { status: 400 });
  }

  const { data: entry, error: entryError } = await supabase
    .from("meal_history_entries")
    .select("id, created_at")
    .eq("id", entryId)
    .single();

  if (entryError) {
    return NextResponse.json(
      { error: `تعذر العثور على الوجبة: ${entryError.message}` },
      { status: 500 }
    );
  }

  const { data: entryItems, error: entryItemsError } = await supabase
    .from("meal_history_entry_items")
    .select("food_id, qty_g")
    .eq("entry_id", entryId);

  if (entryItemsError) {
    return NextResponse.json(
      { error: `تعذر جلب عناصر الوجبة: ${entryItemsError.message}` },
      { status: 500 }
    );
  }

  for (const item of entryItems ?? []) {
    const { error: consumptionDeleteError } = await supabase
      .from("food_consumption_logs")
      .delete()
      .eq("food_id", item.food_id)
      .eq("qty_g", item.qty_g)
      .eq("consumed_at", entry.created_at)
      .like("notes", "تم توليد هذا السجل تلقائيًا من وجبة محفوظة.%");

    if (consumptionDeleteError) {
      return NextResponse.json(
        {
          error: `فشل حذف سجل الاستهلاك التلقائي: ${consumptionDeleteError.message}`,
        },
        { status: 500 }
      );
    }
  }

  const { error: deleteItemsError } = await supabase
    .from("meal_history_entry_items")
    .delete()
    .eq("entry_id", entryId);

  if (deleteItemsError) {
    return NextResponse.json(
      { error: `فشل حذف عناصر الوجبة: ${deleteItemsError.message}` },
      { status: 500 }
    );
  }

  const { error: deleteEntryError } = await supabase
    .from("meal_history_entries")
    .delete()
    .eq("id", entryId);

  if (deleteEntryError) {
    return NextResponse.json(
      { error: `فشل حذف الوجبة نفسها: ${deleteEntryError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
