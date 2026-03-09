import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

function daysBetween(a: Date, b: Date) {
  const ms = Math.abs(a.getTime() - b.getTime());
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const { data: food, error: foodError } = await supabase
    .from("foods")
    .select(`
      id,
      name_ar,
      aliases,
      notes,
      renal_group,
      renal_reason,
      renal_max_per_meal_g,
      renal_max_times_per_day,
      renal_max_times_per_week,
      renal_limit_details,
      renal_min_gap_days,
      renal_max_uses_per_7d
    `)
    .eq("id", id)
    .single();

  if (foodError) {
    return NextResponse.json({ error: foodError.message }, { status: 500 });
  }

  const { data: logs, error: logsError } = await supabase
    .from("food_consumption_logs")
    .select("id, consumed_at, qty_g, notes, created_at")
    .eq("food_id", id)
    .order("consumed_at", { ascending: false });

  if (logsError) {
    return NextResponse.json({ error: logsError.message }, { status: 500 });
  }

  const { data: allFoods, error: foodsError } = await supabase
    .from("foods")
    .select("id, name_ar");

  if (foodsError) {
    return NextResponse.json({ error: foodsError.message }, { status: 500 });
  }

  const foodNameMap = Object.fromEntries((allFoods ?? []).map((f) => [f.id, f.name_ar]));

  const { data: groupMemberships, error: membershipsError } = await supabase
    .from("food_group_members")
    .select("group_id")
    .eq("food_id", id);

  if (membershipsError) {
    return NextResponse.json({ error: membershipsError.message }, { status: 500 });
  }

  const ownGroupIds = (groupMemberships ?? []).map((x) => x.group_id);

  const { data: groups, error: groupsError } = await supabase
    .from("food_groups")
    .select("id, name_ar");

  if (groupsError) {
    return NextResponse.json({ error: groupsError.message }, { status: 500 });
  }

  const groupNameMap = Object.fromEntries((groups ?? []).map((g) => [g.id, g.name_ar]));

  const { data: rules, error: rulesError } = await supabase
    .from("food_interaction_rules")
    .select(`
      id,
      source_food_id,
      source_group_id,
      target_food_id,
      target_group_id,
      rule_type,
      target_limit_g,
      notes
    `);

  if (rulesError) {
    return NextResponse.json({ error: rulesError.message }, { status: 500 });
  }

  const interactions = (rules ?? [])
    .filter((rule) => {
      const sourceFood = rule.source_food_id === id;
      const sourceGroup =
        !!rule.source_group_id && ownGroupIds.includes(rule.source_group_id);
      const targetFood = rule.target_food_id === id;
      const targetGroup =
        !!rule.target_group_id && ownGroupIds.includes(rule.target_group_id);

      return sourceFood || sourceGroup || targetFood || targetGroup;
    })
    .map((rule) => {
      let related = "";

      if (
        rule.source_food_id === id ||
        (rule.source_group_id && ownGroupIds.includes(rule.source_group_id))
      ) {
        related = rule.target_food_id
          ? foodNameMap[rule.target_food_id] || "عنصر آخر"
          : rule.target_group_id
          ? groupNameMap[rule.target_group_id] || "مجموعة أخرى"
          : "";
      } else {
        related = rule.source_food_id
          ? foodNameMap[rule.source_food_id] || "عنصر آخر"
          : rule.source_group_id
          ? groupNameMap[rule.source_group_id] || "مجموعة أخرى"
          : "";
      }

      return {
        id: rule.id,
        rule_type: rule.rule_type,
        target_limit_g: rule.target_limit_g,
        notes: rule.notes,
        related,
      };
    });

  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);

  const logsList = logs ?? [];
  const latest = logsList.length > 0 ? logsList[0] : null;

  const usedToday = logsList.filter((log) => log.consumed_at.slice(0, 10) === todayIso);

  const since7d = logsList.filter((log) => {
    const d = new Date(log.consumed_at);
    const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  });

  let gapDaysPassed: number | null = null;
  if (latest?.consumed_at) {
    gapDaysPassed = daysBetween(now, new Date(latest.consumed_at));
  }

  const minGap = food.renal_min_gap_days ?? null;
  const maxPer7d = food.renal_max_uses_per_7d ?? food.renal_max_times_per_week ?? null;
  const maxPerDay = food.renal_max_times_per_day ?? null;

  const blockedByGap =
    minGap !== null && gapDaysPassed !== null && gapDaysPassed < minGap;

  const blockedByDay =
    maxPerDay !== null && usedToday.length >= maxPerDay;

  const blockedBy7d =
    maxPer7d !== null && since7d.length >= maxPer7d;

  return NextResponse.json({
    food,
    logs: logsList,
    interactions,
    status: {
      latest_consumed_at: latest?.consumed_at ?? null,
      uses_today: usedToday.length,
      uses_last_7d: since7d.length,
      days_since_last_use: gapDaysPassed,
      blocked_by_gap: blockedByGap,
      blocked_by_day: blockedByDay,
      blocked_by_7d: blockedBy7d,
      can_consume_now: !(blockedByGap || blockedByDay || blockedBy7d),
    },
  });
}