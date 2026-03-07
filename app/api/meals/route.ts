import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST() {
  const { data, error } = await supabase
    .from("meals")
    .insert([{ title: "meal calculator" }])
    .select("id, title, created_at")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}