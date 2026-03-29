import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

function normalizeText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = normalizeText(searchParams.get("query") || "");

  const baseSelect = `
    id,
    name_ar,
    aliases,
    kcal_100,
    protein_100,
    fat_100,
    carbs_total_100,
    fiber_100,
    notes,
    default_qty_g,
    is_preset
  `;

  try {
    // عند عدم وجود بحث: نرجع العناصر بشكل عادي
    if (!q) {
      const { data, error } = await supabase
        .from("foods")
        .select(baseSelect)
        .order("name_ar", { ascending: true });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(data ?? []);
    }

    // عند وجود بحث: نجلب كل العناصر ثم نفلتر بالاسم والـ alias
    const { data, error } = await supabase
      .from("foods")
      .select(baseSelect);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const filtered = (data ?? []).filter((food) => {
      const nameMatch = normalizeText(food.name_ar).includes(q);

      const aliasMatch =
        Array.isArray(food.aliases) &&
        food.aliases.some((alias) => normalizeText(alias).includes(q));

      return nameMatch || aliasMatch;
    });

    // ترتيب أفضل: الاسم المطابق مباشرة أولًا، ثم alias، ثم الباقي أبجديًا
    filtered.sort((a, b) => {
      const aName = normalizeText(a.name_ar);
      const bName = normalizeText(b.name_ar);

      const aStarts = aName.startsWith(q) ? 1 : 0;
      const bStarts = bName.startsWith(q) ? 1 : 0;

      if (aStarts !== bStarts) return bStarts - aStarts;

      const aIncludes = aName.includes(q) ? 1 : 0;
      const bIncludes = bName.includes(q) ? 1 : 0;

      if (aIncludes !== bIncludes) return bIncludes - aIncludes;

      return aName.localeCompare(bName, "ar");
    });

    return NextResponse.json(filtered);
  } catch (err) {
    console.error("GET /api/foods error:", err);
    return NextResponse.json(
      { error: "حدث خطأ أثناء البحث في العناصر الغذائية" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      name_ar,
      aliases,
      kcal_100,
      protein_100,
      fat_100,
      carbs_total_100,
      fiber_100,
      notes,
      default_qty_g,
      is_preset,
    } = body;

    if (!name_ar || typeof name_ar !== "string") {
      return NextResponse.json(
        { error: "name_ar is required" },
        { status: 400 }
      );
    }

    const parsedAliases = Array.isArray(aliases)
      ? aliases
          .filter((v) => typeof v === "string" && v.trim())
          .map((v) => v.trim())
      : [];

    const { data, error } = await supabase
      .from("foods")
      .insert([
        {
          name_ar: name_ar.trim(),
          aliases: parsedAliases,
          kcal_100: Number(kcal_100 || 0),
          protein_100: Number(protein_100 || 0),
          fat_100: Number(fat_100 || 0),
          carbs_total_100: Number(carbs_total_100 || 0),
          fiber_100: Number(fiber_100 || 0),
          notes: typeof notes === "string" ? notes.trim() : "",
          default_qty_g: Number(default_qty_g || 100),
          is_preset: typeof is_preset === "boolean" ? is_preset : true,
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("POST /api/foods error:", err);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إضافة العنصر" },
      { status: 500 }
    );
  }
}