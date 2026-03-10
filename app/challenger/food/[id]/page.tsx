"use client";

import React, { useEffect, useMemo, useState } from "react";

type FoodDetails = {
  id: string;
  name_ar: string;
  aliases?: string[];
  notes?: string;
  renal_group?: string;
  renal_reason?: string;
  renal_max_per_meal_g?: number | null;
  renal_max_times_per_day?: number | null;
  renal_max_times_per_week?: number | null;
  renal_limit_details?: string | null;
  renal_min_gap_days?: number | null;
  renal_max_uses_per_7d?: number | null;
};

type LogRow = {
  id: string;
  consumed_at: string;
  qty_g: number;
  notes?: string | null;
  created_at: string;
};

type Interaction = {
  id: string;
  rule_type: string;
  target_limit_g?: number | null;
  notes?: string | null;
  related: string;
};

type StatusInfo = {
  latest_consumed_at: string | null;
  uses_today: number;
  uses_last_7d: number;
  days_since_last_use: number | null;
  blocked_by_gap: boolean;
  blocked_by_day: boolean;
  blocked_by_7d: boolean;
  can_consume_now: boolean;
};

function renalGroupLabel(value?: string | null) {
  if (value === "excellent") return "ممتاز";
  if (value === "allowed") return "مسموح";
  if (value === "restricted") return "مسموح بشروط";
  if (value === "forbidden") return "محظور";
  return "—";
}

function normalizeArabic(text: string) {
  return (text || "")
    .toLowerCase()
    .trim()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/\s+/g, " ");
}

const NUTS_CONFLICT_NAMES = [
  "لوز",
  "جوز",
  "فول سوداني",
  "كاجو",
  "فستق",
  "بندق",
  "جوز البرازيل",
];

const DENSE_LEGUMES_CONFLICT_NAMES = [
  "عدس جاف",
  "حمص جاف",
  "فول مجفف",
  "فاصوليا بيضاء جافة",
  "فاصوليا حمراء جافة",
  "لوبيا جافة",
  "ترمس جاف",
  "بازلاء جافة",
  "طبق العدس الخاص بمسافرنا",
  "لوبيّة مسافرنا",
  "ترمس مسافرنا",
  "بيصارة البازلاء الخاصة",
  "بيصارة الفول الخاصة",
];

const DENSE_DAIRY_CONFLICT_NAMES = [
  "لبنة",
  "زبادي طبيعي كامل",
  "زبادي منزوع الدسم",
  "لبن رائب",
  "حليب كامل الدسم (تجاري)",
  "حليب نصف دسم",
  "حليب منزوع الدسم",
  "حليب بقري بلدي",
  "حليب إبل كامل الدسم",
  "جبن طري",
  "جبن شيدر",
  "جبن موزاريلا",
  "جبن قريش",
];

const DENSE_ANIMAL_PROTEIN_CONFLICT_NAMES = [
  "بيض دجاج",
  "بيض ديك رومي",
  "لحم بقر",
  "لحم غنم",
  "لحم ماعز",
  "دجاج",
  "دجاج بلدي",
  "أرنب",
  "لحم إبل (هبرة)",
  "لحم الديك الرومي",
  "لحم الدجاج الحبشي",
  "كبد الإبل",
  "قلب الإبل",
  "رئة الإبل",
  "كرشة الإبل",
];

const HIGH_POTASSIUM_FRUITS_CONFLICT_NAMES = [
  "أفوكادو",
  "افوكادو",
  "موز",
  "كيوي",
  "رمان",
  "تمر",
  "تين",
  "برقوق مجفف",
];

export default function FoodDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [foodId, setFoodId] = useState("");
  const [food, setFood] = useState<FoodDetails | null>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [status, setStatus] = useState<StatusInfo | null>(null);
  const [qty, setQty] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const p = await params;
      setFoodId(p.id);
    }
    init();
  }, [params]);

  async function loadData(id: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/challenger/foods/${id}`);
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "فشل في تحميل بيانات العنصر");
        return;
      }

      setFood(data.food);
      setLogs(Array.isArray(data.logs) ? data.logs : []);
      setInteractions(Array.isArray(data.interactions) ? data.interactions : []);
      setStatus(data.status || null);
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء تحميل الصفحة");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (foodId) loadData(foodId);
  }, [foodId]);

  async function saveConsumption() {
    if (!foodId) return;

    try {
      const res = await fetch(`/api/challenger/foods/${foodId}/consume`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          qty_g: Number(qty),
          consumed_at: new Date(date).toISOString(),
          notes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "تعذر تسجيل الاستهلاك");
        return;
      }

      setQty("");
      setNotes("");
      await loadData(foodId);
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء تسجيل الاستهلاك");
    }
  }

  const statusBox = useMemo(() => {
    if (!status) return null;

    if (status.can_consume_now) {
      return {
        text: "يمكن استهلاك هذا العنصر الآن",
        bg: "#e8f5e9",
        color: "#0f9d58",
        border: "#b7dfc2",
      };
    }

    return {
      text: "غير مسموح باستهلاك هذا العنصر الآن",
      bg: "#fdecea",
      color: "#b42318",
      border: "#f3b8b2",
    };
  }, [status]);

  const uniqueInteractions = useMemo(() => {
    return interactions.filter(
      (item, index, arr) =>
        index ===
        arr.findIndex(
          (x) => normalizeArabic(x.related) === normalizeArabic(item.related)
        )
    );
  }, [interactions]);

  const fallbackGroups = useMemo(() => {
    if (!food) return [];

    const n = normalizeArabic(food.name_ar);
    const groups: Array<{ title: string; items: string[]; note: string }> = [];

    const isNut = NUTS_CONFLICT_NAMES.map(normalizeArabic).includes(n);
    const isLegume = DENSE_LEGUMES_CONFLICT_NAMES.map(normalizeArabic).includes(n);
    const isDairy = DENSE_DAIRY_CONFLICT_NAMES.map(normalizeArabic).includes(n);
    const isAnimalProtein = DENSE_ANIMAL_PROTEIN_CONFLICT_NAMES.map(normalizeArabic).includes(n);
    const isHighPotFruit = HIGH_POTASSIUM_FRUITS_CONFLICT_NAMES.map(normalizeArabic).includes(n);

    if (isNut) {
      groups.push({
        title: "مجموعة المكسرات العالية الفوسفور",
        items: NUTS_CONFLICT_NAMES.filter((x) => normalizeArabic(x) !== n),
        note: "لا يُفضّل جمعه مع مكسرات أخرى من نفس المجموعة في نفس اليوم.",
      });

      groups.push({
        title: "مجموعة البقول المركزة",
        items: DENSE_LEGUMES_CONFLICT_NAMES,
        note: "منطق احترازي: لا يُفضّل جمع المكسرات العالية الفوسفور مع البقول المركزة في نفس اليوم.",
      });

      groups.push({
        title: "مجموعة الألبان المركزة",
        items: DENSE_DAIRY_CONFLICT_NAMES,
        note: "منطق احترازي: لا يُفضّل جمع المكسرات العالية الفوسفور مع الألبان المركزة في نفس اليوم.",
      });

      groups.push({
        title: "مجموعة البروتين الحيواني المركز",
        items: DENSE_ANIMAL_PROTEIN_CONFLICT_NAMES,
        note: "منطق احترازي: لا يُفضّل جمع المكسرات العالية الفوسفور مع البروتين الحيواني المركز في نفس اليوم.",
      });
    }

    if (isLegume) {
      groups.push({
        title: "مجموعة البقول المركزة",
        items: DENSE_LEGUMES_CONFLICT_NAMES.filter((x) => normalizeArabic(x) !== n),
        note: "لا يُفضّل جمعه مع بقول مركزة أخرى في نفس اليوم.",
      });
    }

    if (isDairy) {
      groups.push({
        title: "مجموعة الألبان المركزة",
        items: DENSE_DAIRY_CONFLICT_NAMES.filter((x) => normalizeArabic(x) !== n),
        note: "لا يُفضّل جمعه مع ألبان مركزة أخرى في نفس اليوم.",
      });
    }

    if (isAnimalProtein) {
      groups.push({
        title: "مجموعة البروتين الحيواني المركز",
        items: DENSE_ANIMAL_PROTEIN_CONFLICT_NAMES.filter((x) => normalizeArabic(x) !== n),
        note: "لا يُفضّل جمعه مع بروتين حيواني مركز آخر في نفس اليوم.",
      });
    }

    if (isHighPotFruit) {
      groups.push({
        title: "مجموعة الفواكه الأعلى بوتاسيوم",
        items: HIGH_POTASSIUM_FRUITS_CONFLICT_NAMES.filter((x) => normalizeArabic(x) !== n),
        note: "لا يُفضّل جمعه مع فواكه أخرى أعلى بوتاسيوم في نفس اليوم.",
      });
    }

    return groups;
  }, [food]);

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: 16 }}>
      <p style={{ marginBottom: 12 }}>
        <a
          href="/challenger"
          style={{ color: "#1a73e8", textDecoration: "none", fontWeight: 600 }}
        >
          العودة إلى صفحة السيد رشيد
        </a>
      </p>

      {loading ? (
        <p>جاري التحميل...</p>
      ) : !food ? (
        <p>العنصر غير موجود.</p>
      ) : (
        <>
          <h1 style={{ fontSize: 30, fontWeight: 700, marginBottom: 8 }}>
            {food.name_ar}
          </h1>

          <div style={cardStyle}>
            <div style={{ marginBottom: 8 }}>
              <strong>التصنيف:</strong> {renalGroupLabel(food.renal_group)}
            </div>
            <div style={{ marginBottom: 8 }}>
              <strong>سبب التقييد:</strong> {food.renal_reason || "—"}
            </div>
            <div style={{ marginBottom: 8 }}>
              <strong>تفاصيل التقييد:</strong> {food.renal_limit_details || "—"}
            </div>
            <div style={{ marginBottom: 8 }}>
              <strong>الحد لكل وجبة:</strong> {food.renal_max_per_meal_g ? `${food.renal_max_per_meal_g}غ` : "—"}
            </div>
            <div style={{ marginBottom: 8 }}>
              <strong>الحد اليومي:</strong> {food.renal_max_times_per_day ? `${food.renal_max_times_per_day} مرة` : "—"}
            </div>
            <div style={{ marginBottom: 8 }}>
              <strong>الحد الأسبوعي:</strong> {food.renal_max_times_per_week ? `${food.renal_max_times_per_week} مرات` : "—"}
            </div>
            <div style={{ marginBottom: 8 }}>
              <strong>أقصى استعمال خلال 7 أيام:</strong> {food.renal_max_uses_per_7d ? `${food.renal_max_uses_per_7d} مرات` : "—"}
            </div>
            <div>
              <strong>الفاصل الأدنى بين الاستهلاكات:</strong> {food.renal_min_gap_days ? `${food.renal_min_gap_days} يوم` : "—"}
            </div>
          </div>

          {statusBox && (
            <div
              style={{
                ...cardStyle,
                background: statusBox.bg,
                color: statusBox.color,
                border: `1px solid ${statusBox.border}`,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 8 }}>{statusBox.text}</div>
              {status && (
                <div style={{ display: "grid", gap: 6, fontSize: 14 }}>
                  <div>مرات الاستهلاك اليوم: {status.uses_today}</div>
                  <div>مرات الاستهلاك خلال آخر 7 أيام: {status.uses_last_7d}</div>
                  <div>الأيام منذ آخر استهلاك: {status.days_since_last_use ?? "—"}</div>
                </div>
              )}
            </div>
          )}

          <div style={cardStyle}>
            <h2 style={{ fontSize: 20, marginBottom: 12 }}>العناصر/المجموعات التي لا يجتمع معها</h2>

            {uniqueInteractions.length === 0 && fallbackGroups.length === 0 ? (
              <p>لا توجد قواعد مسجلة بعد.</p>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {uniqueInteractions.map((it) => (
                  <div key={it.id} style={miniCardStyle}>
                    <div style={{ fontWeight: 600 }}>{it.related}</div>
                    {it.notes ? (
                      <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>
                        {it.notes}
                      </div>
                    ) : null}
                    {it.target_limit_g ? (
                      <div style={{ fontSize: 13, color: "#8a5a00", marginTop: 4 }}>
                        الحد المعدل: {it.target_limit_g}غ
                      </div>
                    ) : null}
                  </div>
                ))}

                {fallbackGroups.map((group) => (
                  <div key={group.title} style={miniCardStyle}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>{group.title}</div>
                    <div style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>
                      {group.note}
                    </div>
                    <div>{group.items.join("، ")}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={cardStyle}>
            <h2 style={{ fontSize: 20, marginBottom: 12 }}>تسجيل استهلاك جديد</h2>
            <div style={{ display: "grid", gap: 10 }}>
              <input
                type="number"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="الكمية بالغرام"
                style={inputStyle}
              />
              <input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={inputStyle}
              />
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ملاحظة اختيارية"
                style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
              />
              <button onClick={saveConsumption} style={saveButtonStyle}>
                تسجيل الاستهلاك
              </button>
            </div>
          </div>

          <div style={cardStyle}>
            <h2 style={{ fontSize: 20, marginBottom: 12 }}>سجل الاستهلاك</h2>
            {logs.length === 0 ? (
              <p>لا يوجد سجل استهلاك بعد.</p>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {logs.map((log) => (
                  <div key={log.id} style={miniCardStyle}>
                    <div><strong>التاريخ:</strong> {new Date(log.consumed_at).toLocaleString()}</div>
                    <div><strong>الكمية:</strong> {log.qty_g}غ</div>
                    {log.notes ? <div><strong>ملاحظة:</strong> {log.notes}</div> : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}

const cardStyle: React.CSSProperties = {
  border: "1px solid #e5e5e5",
  borderRadius: 14,
  padding: 16,
  background: "white",
  marginBottom: 16,
};

const miniCardStyle: React.CSSProperties = {
  border: "1px solid #eee",
  borderRadius: 10,
  padding: 10,
  background: "#fafafa",
};

const inputStyle: React.CSSProperties = {
  padding: 12,
  border: "1px solid #ddd",
  borderRadius: 10,
  fontSize: 14,
};

const saveButtonStyle: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "#111827",
  color: "white",
  cursor: "pointer",
  fontWeight: 600,
};