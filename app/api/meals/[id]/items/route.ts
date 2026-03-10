import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

function diffDays(from: Date, to: Date) {
  const ms = to.getTime() - from.getTime();
  return ms / (1000 * 60 * 60 * 24);
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: mealId } = await context.params;

  if (!mealId) {
    return NextResponse.json({ error: "mealId is missing" }, { status: 400 });
  }

  const body = await req.json();
  const { food_id, qty_g } = body;

  if (!food_id || typeof qty_g !== "number") {
    return NextResponse.json(
      { error: "food_id and qty_g are required" },
      { status: 400 }
    );
  }

  // 1) جلب عضوية العنصر المطلوب إضافته في المجموعات
  const { data: targetMemberships, error: targetMembershipsError } = await supabase
    .from("food_group_members")
    .select("group_id")
    .eq("food_id", food_id);

  if (targetMembershipsError) {
    return NextResponse.json(
      { error: targetMembershipsError.message },
      { status: 500 }
    );
  }

  const targetGroupIds = (targetMemberships ?? []).map((x) => x.group_id);

  // 2) جلب قواعد المنع الزمني
  const { data: timeRules, error: timeRulesError } = await supabase
    .from("food_time_block_rules")
    .select(`
      id,
      source_food_id,
      source_group_id,
      blocked_food_id,
      blocked_group_id,
      block_days,
      notes
    `);

  if (timeRulesError) {
    return NextResponse.json(
      { error: timeRulesError.message },
      { status: 500 }
    );
  }

  // 3) جلب سجلات الاستهلاك السابقة
  const { data: logs, error: logsError } = await supabase
    .from("food_consumption_logs")
    .select("food_id, consumed_at")
    .order("consumed_at", { ascending: false })
    .limit(300);

  if (logsError) {
    return NextResponse.json(
      { error: logsError.message },
      { status: 500 }
    );
  }

  // 4) جلب عضويات مجموعات العناصر التي استُهلكت سابقًا
  const consumedFoodIds = Array.from(new Set((logs ?? []).map((l) => l.food_id)));

  let consumedGroupRows: Array<{ food_id: string; group_id: string }> = [];

  if (consumedFoodIds.length > 0) {
    const { data: membershipsForConsumed, error: membershipsForConsumedError } =
      await supabase
        .from("food_group_members")
        .select("food_id, group_id")
        .in("food_id", consumedFoodIds);

    if (membershipsForConsumedError) {
      return NextResponse.json(
        { error: membershipsForConsumedError.message },
        { status: 500 }
      );
    }

    consumedGroupRows = membershipsForConsumed ?? [];
  }

  // 5) فحص وجود منع زمني فعال
  const now = new Date();

  for (const rule of timeRules ?? []) {
    const blocksThisFood =
      (rule.blocked_food_id && rule.blocked_food_id === food_id) ||
      (rule.blocked_group_id && targetGroupIds.includes(rule.blocked_group_id));

    if (!blocksThisFood) continue;

    for (const log of logs ?? []) {
      const consumedAt = new Date(log.consumed_at);
      const daysPassed = diffDays(consumedAt, now);

      // ما زال داخل مدة المنع
      if (daysPassed < 0 || daysPassed >= rule.block_days) continue;

      const consumedGroups = consumedGroupRows
        .filter((x) => x.food_id === log.food_id)
        .map((x) => x.group_id);

      const sourceMatched =
        (rule.source_food_id && rule.source_food_id === log.food_id) ||
        (rule.source_group_id && consumedGroups.includes(rule.source_group_id));

      if (!sourceMatched) continue;

      return NextResponse.json(
        {
          error:
            rule.notes ||
            `هذا العنصر ممنوع مؤقتًا لمدة ${rule.block_days} يوم/أيام بعد استهلاك عنصر متعارض.`,
        },
        { status: 400 }
      );
    }
  }

  // 6) إذا لم يوجد منع زمني، أضف العنصر كالمعتاد
  const { data, error } = await supabase
    .from("meal_items")
    .insert([{ meal_id: mealId, food_id, qty_g }])
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