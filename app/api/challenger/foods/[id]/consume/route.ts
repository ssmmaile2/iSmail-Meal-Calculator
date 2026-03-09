import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

function daysBetween(a: Date, b: Date) {
  const ms = Math.abs(a.getTime() - b.getTime());
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = await req.json();

  const qty_g = Number(body.qty_g);
  const consumed_at = body.consumed_at;
  const notes = body.notes || null;

  if (!qty_g || !consumed_at) {
    return NextResponse.json(
      { error: "qty_g و consumed_at مطلوبان" },
      { status: 400 }
    );
  }

  const { data: food, error: foodError } = await supabase
    .from("foods")
    .select(`
      id,
      name_ar,
      renal_max_times_per_day,
      renal_max_times_per_week,
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
    .select("id, consumed_at")
    .eq("food_id", id)
    .order("consumed_at", { ascending: false });

  if (logsError) {
    return NextResponse.json({ error: logsError.message }, { status: 500 });
  }

  const consumeDate = new Date(consumed_at);
  const dayIso = consumeDate.toISOString().slice(0, 10);

  const usedSameDay = (logs ?? []).filter(
    (log) => log.consumed_at.slice(0, 10) === dayIso
  );

  const usedLast7d = (logs ?? []).filter((log) => {
    const d = new Date(log.consumed_at);
    const diff = (consumeDate.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  });

  const latest = logs && logs.length > 0 ? logs[0] : null;
  const daysSinceLast =
    latest?.consumed_at ? daysBetween(consumeDate, new Date(latest.consumed_at)) : null;

  const maxPerDay = food.renal_max_times_per_day ?? null;
  const maxPer7d = food.renal_max_uses_per_7d ?? food.renal_max_times_per_week ?? null;
  const minGap = food.renal_min_gap_days ?? null;

  if (maxPerDay !== null && usedSameDay.length >= maxPerDay) {
    return NextResponse.json(
      { error: "تم بلوغ الحد اليومي لهذا العنصر" },
      { status: 400 }
    );
  }

  if (maxPer7d !== null && usedLast7d.length >= maxPer7d) {
    return NextResponse.json(
      { error: "تم بلوغ الحد الأسبوعي/7 أيام لهذا العنصر" },
      { status: 400 }
    );
  }

  if (minGap !== null && daysSinceLast !== null && daysSinceLast < minGap) {
    return NextResponse.json(
      { error: `يجب الانتظار ${minGap} يومًا على الأقل بين الاستهلاكات` },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("food_consumption_logs")
    .insert({
      food_id: id,
      consumed_at,
      qty_g,
      notes,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}