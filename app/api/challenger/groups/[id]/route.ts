import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

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

  return NextResponse.json({
    group,
    foods,
  });
}