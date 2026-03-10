import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

function diffDays(from: Date, to: Date) {
  const ms = to.getTime() - from.getTime();
  return ms / (1000 * 60 * 60 * 24);
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const { data: group, error: groupError } = await supabase
    .from("food_groups")
    .select("id, name_ar")
    .eq("id", id)
    .single();

  if (groupError) {
    return NextResponse.json({ error: groupError.message }, { status: 500 });
  }

  const { data: members, error: membersError } = await supabase
    .from("food_group_members")
    .select(`
      food_id,
      foods (
        id,
        name_ar,
        renal_group,
        renal_reason,
        renal_max_per_meal_g,
        renal_max_times_per_day,
        renal_max_times_per_week,
        renal_limit_details,
        renal_min_gap_days,
        renal_max_uses_per_7d
      )
    `)
    .eq("group_id", id);

  if (membersError) {
    return NextResponse.json({ error: membersError.message }, { status: 500 });
  }

  const foods = (members ?? [])
    .map((m: any) => m.foods)
    .filter(Boolean)
    .sort((a: any, b: any) => (a.name_ar || "").localeCompare(b.name_ar || "", "ar"));

  const foodIds = foods.map((f: any) => f.id);

  const { data: foodGroupsRows, error: foodGroupsRowsError } = await supabase
    .from("food_group_members")
    .select("food_id, group_id")
    .in("food_id", foodIds);

  if (foodGroupsRowsError) {
    return NextResponse.json({ error: foodGroupsRowsError.message }, { status: 500 });
  }

  const { data: logs, error: logsError } = await supabase
    .from("food_consumption_logs")
    .select("id, food_id, consumed_at")
    .order("consumed_at", { ascending: false })
    .limit(400);

  if (logsError) {
    return NextResponse.json({ error: logsError.message }, { status: 500 });
  }

  const consumedFoodIds = Array.from(new Set((logs ?? []).map((l) => l.food_id)));

  const { data: consumedFoods, error: consumedFoodsError } = await supabase
    .from("foods")
    .select("id, name_ar")
    .in("id", consumedFoodIds.length > 0 ? consumedFoodIds : ["00000000-0000-0000-0000-000000000000"]);

  if (consumedFoodsError) {
    return NextResponse.json({ error: consumedFoodsError.message }, { status: 500 });
  }

  const consumedFoodNameMap = Object.fromEntries(
    (consumedFoods ?? []).map((f) => [f.id, f.name_ar])
  );

  const { data: consumedMemberships, error: consumedMembershipsError } = await supabase
    .from("food_group_members")
    .select("food_id, group_id")
    .in("food_id", consumedFoodIds.length > 0 ? consumedFoodIds : ["00000000-0000-0000-0000-000000000000"]);

  if (consumedMembershipsError) {
    return NextResponse.json({ error: consumedMembershipsError.message }, { status: 500 });
  }

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
    return NextResponse.json({ error: timeRulesError.message }, { status: 500 });
  }

  const now = new Date();

  const enrichedFoods = foods.map((food: any) => {
    const targetGroups = (foodGroupsRows ?? [])
      .filter((x: any) => x.food_id === food.id)
      .map((x: any) => x.group_id);

    let blockingInfo: null | {
      blocking_food_id: string;
      blocking_food_name: string;
      consumed_at: string;
      note: string;
      block_days: number;
    } = null;

    for (const rule of timeRules ?? []) {
      const blocksThisFood =
        (rule.blocked_food_id && rule.blocked_food_id === food.id) ||
        (rule.blocked_group_id && targetGroups.includes(rule.blocked_group_id));

      if (!blocksThisFood) continue;

      for (const log of logs ?? []) {
        const consumedAt = new Date(log.consumed_at);
        const daysPassed = diffDays(consumedAt, now);

        if (daysPassed < 0 || daysPassed >= rule.block_days) continue;

        const consumedGroups = (consumedMemberships ?? [])
          .filter((x: any) => x.food_id === log.food_id)
          .map((x: any) => x.group_id);

        const sourceMatched =
          (rule.source_food_id && rule.source_food_id === log.food_id) ||
          (rule.source_group_id && consumedGroups.includes(rule.source_group_id));

        if (!sourceMatched) continue;

        blockingInfo = {
          blocking_food_id: log.food_id,
          blocking_food_name: consumedFoodNameMap[log.food_id] || "عنصر سابق",
          consumed_at: log.consumed_at,
          note:
            rule.notes ||
            `هذا العنصر ممنوع مؤقتًا لمدة ${rule.block_days} يوم/أيام بعد استهلاك عنصر متعارض.`,
          block_days: rule.block_days,
        };

        break;
      }

      if (blockingInfo) break;
    }

    return {
      ...food,
      time_status: blockingInfo
        ? {
            available_now: false,
            ...blockingInfo,
          }
        : {
            available_now: true,
          },
    };
  });

  return NextResponse.json({
    group,
    foods: enrichedFoods,
  });
}