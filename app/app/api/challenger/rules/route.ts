import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  const { data: groups, error: groupsError } = await supabase
    .from("food_groups")
    .select("id, code, name_ar")
    .order("name_ar", { ascending: true });

  if (groupsError) {
    return NextResponse.json({ error: groupsError.message }, { status: 500 });
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from("food_group_members")
    .select("food_id, group_id");

  if (membershipsError) {
    return NextResponse.json({ error: membershipsError.message }, { status: 500 });
  }

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

  const { data: foods, error: foodsError } = await supabase
    .from("foods")
    .select("id, name_ar");

  if (foodsError) {
    return NextResponse.json({ error: foodsError.message }, { status: 500 });
  }

  return NextResponse.json({
    groups: groups ?? [],
    memberships: memberships ?? [],
    rules: rules ?? [],
    foods: foods ?? [],
  });
}