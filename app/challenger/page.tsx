"use client";

import React, { useEffect, useMemo, useState } from "react";

type Food = {
  id: string;
  name_ar: string;
  aliases?: string[];
  kcal_100: number;
  protein_100: number;
  fat_100: number;
  carbs_total_100: number;
  fiber_100: number;
  notes?: string;
  default_qty_g?: number | null;
  is_preset?: boolean | null;

  renal_group?: string | null;
  renal_reason?: string | null;
  renal_max_per_meal_g?: number | null;
  renal_max_times_per_day?: number | null;
  renal_max_times_per_week?: number | null;
  renal_limit_details?: string | null;

  is_high_potassium?: boolean | null;
  is_high_phosphorus?: boolean | null;
  is_dense_protein?: boolean | null;
  is_high_sodium?: boolean | null;
  renal_shared_load_score?: number | null;
  renal_combo_warning?: boolean | null;
  renal_combo_notes?: string | null;
};

type MealItem = {
  id: string;
  qty_g: number;
  foods: Food | null;
};

type MealRiskAnalysis = {
  totalSharedLoad: number;
  hasHighPotassium: boolean;
  hasHighPhosphorus: boolean;
  hasDenseProtein: boolean;
  hasHighSodium: boolean;
  redAlert: boolean;
  orangeAlert: boolean;
  riskFoods: string[];
  messages: string[];
};

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

function normalizeArabic(text: string) {
  return text
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

export default function ChallengerPage() {
  const [mealId, setMealId] = useState<string | null>(null);
  const [items, setItems] = useState<MealItem[]>([]);
  const [query, setQuery] = useState("");
  const [qty, setQty] = useState<number | "">(100);
  const [suggestions, setSuggestions] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    async function createMeal() {
      try {
        const res = await fetch("/api/meals", { method: "POST" });
        const meal = await res.json();

        if (!res.ok) {
          alert(meal.error || "فشل في إنشاء الوجبة");
          setLoading(false);
          return;
        }

        setMealId(meal.id);
        await refreshMeal(meal.id);
      } catch (error) {
        console.error(error);
        alert("حدث خطأ أثناء إنشاء الوجبة");
      } finally {
        setLoading(false);
      }
    }

    createMeal();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/foods?query=${encodeURIComponent(query)}`);
        const data = await res.json();

        if (!res.ok) {
          console.error(data);
          return;
        }

        setSuggestions(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error(error);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  async function refreshMeal(id: string) {
    try {
      const res = await fetch(`/api/meals/${id}`);
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "فشل في تحميل الوجبة");
        return;
      }

      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء تحميل الوجبة");
    }
  }

  function calcRow(food: Food, qty_g: number) {
    const factor = qty_g / 100;
    const kcal = food.kcal_100 * factor;
    const protein = food.protein_100 * factor;
    const fat = food.fat_100 * factor;
    const fiber = food.fiber_100 * factor;
    const carbsTotal = food.carbs_total_100 * factor;
    const netCarb = carbsTotal - fiber;

    return { kcal, protein, fat, fiber, netCarb };
  }

  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        if (!item.foods) return acc;
        const row = calcRow(item.foods, item.qty_g);
        acc.kcal += row.kcal;
        acc.protein += row.protein;
        acc.fat += row.fat;
        acc.fiber += row.fiber;
        acc.netCarb += row.netCarb;
        return acc;
      },
      { kcal: 0, protein: 0, fat: 0, fiber: 0, netCarb: 0 }
    );
  }, [items]);

  const mealRisk = useMemo<MealRiskAnalysis>(() => {
    const validFoods = items
      .map((item) => item.foods)
      .filter((food): food is Food => !!food);

    const totalSharedLoad = validFoods.reduce(
      (sum, food) => sum + Number(food.renal_shared_load_score || 0),
      0
    );

    const highPotassiumFoods = validFoods.filter((f) => !!f.is_high_potassium);
    const highPhosphorusFoods = validFoods.filter((f) => !!f.is_high_phosphorus);
    const denseProteinFoods = validFoods.filter((f) => !!f.is_dense_protein);
    const highSodiumFoods = validFoods.filter((f) => !!f.is_high_sodium);

    const hasHighPotassium = highPotassiumFoods.length > 0;
    const hasHighPhosphorus = highPhosphorusFoods.length > 0;
    const hasDenseProtein = denseProteinFoods.length > 0;
    const hasHighSodium = highSodiumFoods.length > 0;

    const redAlert =
      hasHighSodium ||
      (hasHighPotassium && hasHighPhosphorus && hasDenseProtein);

    const orangeAlert =
      !redAlert &&
      (totalSharedLoad >= 4 ||
        (hasHighPotassium && hasHighPhosphorus) ||
        (hasHighPotassium && hasDenseProtein) ||
        (hasHighPhosphorus && hasDenseProtein));

    const riskFoods = Array.from(
      new Set([
        ...highPotassiumFoods.map((f) => f.name_ar),
        ...highPhosphorusFoods.map((f) => f.name_ar),
        ...denseProteinFoods.map((f) => f.name_ar),
        ...highSodiumFoods.map((f) => f.name_ar),
      ])
    );

    const messages: string[] = [];

    if (hasHighSodium) {
      messages.push("الوجبة تحتوي عنصرًا مرتفع الصوديوم، وهذا غير مناسب كلويًا.");
    }

    if (hasHighPotassium && hasHighPhosphorus && hasDenseProtein) {
      messages.push(
        "الوجبة تجمع بين عنصر مرتفع البوتاسيوم وعنصر مرتفع الفوسفور وبروتين مركز."
      );
    } else {
      if (hasHighPotassium && hasHighPhosphorus) {
        messages.push("الوجبة تجمع بين عنصر مرتفع البوتاسيوم وعنصر مرتفع الفوسفور.");
      }
      if (hasHighPotassium && hasDenseProtein) {
        messages.push("الوجبة تجمع بين عنصر مرتفع البوتاسيوم وبروتين مركز.");
      }
      if (hasHighPhosphorus && hasDenseProtein) {
        messages.push("الوجبة تجمع بين عنصر مرتفع الفوسفور وبروتين مركز.");
      }
    }

    if (!redAlert && totalSharedLoad >= 4) {
      messages.push("الحمولة المشتركة للوجبة مرتفعة نسبيًا حتى دون بلوغ أعلى مستوى تحذير.");
    }

    return {
      totalSharedLoad,
      hasHighPotassium,
      hasHighPhosphorus,
      hasDenseProtein,
      hasHighSodium,
      redAlert,
      orangeAlert,
      riskFoods,
      messages,
    };
  }, [items]);

  const violationsByItem = useMemo(() => {
    const result: Record<string, string[]> = {};

    function addViolation(itemId: string, msg: string) {
      if (!result[itemId]) result[itemId] = [];
      if (!result[itemId].includes(msg)) result[itemId].push(msg);
    }

    const itemsWithFood = items.filter(
      (item): item is MealItem & { foods: Food } => !!item.foods
    );

    // 1) تجاوز الحد لكل وجبة + المحظور
    for (const item of itemsWithFood) {
      const max = item.foods.renal_max_per_meal_g;
      if (max && item.qty_g > Number(max)) {
        addViolation(item.id, `تم تجاوز الحد المسموح لكل وجبة: ${max}غ`);
      }

      if (item.foods.renal_group === "forbidden") {
        addViolation(item.id, "هذا العنصر محظور على المتحدي.");
      }
    }

    // 2) منع اجتماع المكسرات المتنافسة
    const nutItems = itemsWithFood.filter((item) =>
      NUTS_CONFLICT_NAMES.map(normalizeArabic).includes(
        normalizeArabic(item.foods.name_ar)
      )
    );

    if (nutItems.length > 1) {
      for (const item of nutItems) {
        const others = nutItems
          .filter((x) => x.id !== item.id)
          .map((x) => x.foods.name_ar);

        if (others.length > 0) {
          addViolation(
            item.id,
            `لا ينبغي جمع هذا العنصر مع: ${others.join("، ")}`
          );
        }
      }
    }

    // 3) منع اجتماع البقول المركزة
    const denseLegumeItems = itemsWithFood.filter((item) =>
      DENSE_LEGUMES_CONFLICT_NAMES.map(normalizeArabic).includes(
        normalizeArabic(item.foods.name_ar)
      )
    );

    if (denseLegumeItems.length > 1) {
      for (const item of denseLegumeItems) {
        const others = denseLegumeItems
          .filter((x) => x.id !== item.id)
          .map((x) => x.foods.name_ar);

        if (others.length > 0) {
          addViolation(
            item.id,
            `لا ينبغي جمع هذا العنصر مع بقول مركزة أخرى في نفس اليوم: ${others.join("، ")}`
          );
        }
      }
    }

    return result;
  }, [items]);

  async function addItem(food: Food) {
    if (!mealId) return;

    const finalQty =
      food.default_qty_g && Number(food.default_qty_g) > 0
        ? Number(food.default_qty_g)
        : qty === "" || Number(qty) <= 0
        ? 100
        : Number(qty);

    setAdding(true);

    try {
      const res = await fetch(`/api/meals/${mealId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          food_id: food.id,
          qty_g: finalQty,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        alert(result.error || "فشل في إضافة العنصر");
        return;
      }

      await refreshMeal(mealId);
      setQuery("");
      setSuggestions([]);
      setQty(100);
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء الإضافة");
    } finally {
      setAdding(false);
    }
  }

  async function updateQty(itemId: string, newQty: number) {
    if (!mealId || Number.isNaN(newQty) || newQty < 0) return;

    try {
      const res = await fetch(`/api/meals/${mealId}/items/${itemId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ qty_g: newQty }),
      });

      const result = await res.json();

      if (!res.ok) {
        alert(result.error || "فشل في تعديل الكمية");
        return;
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, qty_g: newQty } : item
        )
      );
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء تعديل الكمية");
    }
  }

  async function deleteItem(itemId: string) {
    if (!mealId) return;

    try {
      const res = await fetch(`/api/meals/${mealId}/items/${itemId}`, {
        method: "DELETE",
      });

      const result = await res.json();

      if (!res.ok) {
        alert(result.error || "فشل في حذف العنصر");
        return;
      }

      setItems((prev) => prev.filter((item) => item.id !== itemId));
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء حذف العنصر");
    }
  }

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
        حاسبة المُتحدي
      </h1>

      <p style={{ marginBottom: 16, color: "#555" }}>
        هذه الواجهة خاصة بالمُتحدي، وتراعي التقييدات الكلوية والحمولة المشتركة.
      </p>

      {(mealRisk.redAlert || mealRisk.orangeAlert) && (
        <div
          style={{
            marginBottom: 18,
            padding: 14,
            borderRadius: 12,
            border: mealRisk.redAlert
              ? "1px solid #f3b8b2"
              : "1px solid #f5d48a",
            background: mealRisk.redAlert ? "#fdecea" : "#fff7e0",
            color: mealRisk.redAlert ? "#b42318" : "#8a5a00",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>
            {mealRisk.redAlert ? "تحذير كلوي مرتفع" : "تنبيه كلوي"}
          </div>

          {mealRisk.messages.length > 0 && (
            <ul style={{ margin: 0, paddingInlineStart: 20 }}>
              {mealRisk.messages.map((msg, idx) => (
                <li key={idx}>{msg}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gap: 12,
          marginBottom: 20,
          padding: 16,
          border: "1px solid #e5e5e5",
          borderRadius: 12,
          background: "#fafafa",
        }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث: لوز / جوز / فول سوداني / عدس / لوبيا / أفوكادو"
          style={inputStyle}
        />

        <input
          type="number"
          value={qty}
          onChange={(e) =>
            setQty(e.target.value === "" ? "" : Number(e.target.value))
          }
          placeholder="الكمية بالغرام"
          style={inputStyle}
        />

        {suggestions.length > 0 && (
          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 10,
              overflow: "hidden",
              background: "white",
            }}
          >
            {suggestions.map((food) => (
              <button
                key={food.id}
                onClick={() => addItem(food)}
                disabled={adding}
                style={{
                  width: "100%",
                  padding: 12,
                  border: "none",
                  borderBottom: "1px solid #eee",
                  textAlign: "right",
                  cursor: "pointer",
                  background: "white",
                }}
              >
                <div style={{ fontWeight: 600 }}>{food.name_ar}</div>
                <div style={{ fontSize: 12, color: "#666" }}>
                  {food.notes || ""}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <p>جاري التحميل...</p>
      ) : (
        <div
          style={{
            overflowX: "auto",
            border: "1px solid #e5e5e5",
            borderRadius: 12,
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 1100,
            }}
          >
            <thead>
              <tr style={{ background: "#f7f7f7" }}>
                <th style={thStyle}>المكوّن</th>
                <th style={thStyle}>الكمية (غ)</th>
                <th style={thStyle}>السعرات</th>
                <th style={thStyle}>البروتين</th>
                <th style={thStyle}>الدهون</th>
                <th style={thStyle}>الألياف</th>
                <th style={thStyle}>الكارب الصافي</th>
                <th style={thStyle}>التصنيف</th>
                <th style={thStyle}>الحد لكل وجبة</th>
                <th style={thStyle}>حذف</th>
              </tr>
            </thead>

            <tbody>
              {items.map((item) => {
                if (!item.foods) return null;

                const row = calcRow(item.foods, item.qty_g);
                const violations = violationsByItem[item.id] || [];

                return (
                  <tr key={item.id}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600 }}>{item.foods.name_ar}</div>
                      {item.foods.renal_limit_details ? (
                        <div style={{ fontSize: 12, color: "#8a5a00", marginTop: 4 }}>
                          {item.foods.renal_limit_details}
                        </div>
                      ) : null}

                      {violations.length > 0 && (
                        <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                          {violations.map((msg, idx) => (
                            <div
                              key={idx}
                              style={{
                                color: "#b42318",
                                background: "#fdecea",
                                border: "1px solid #f3b8b2",
                                borderRadius: 8,
                                padding: "6px 8px",
                                fontSize: 12,
                                lineHeight: 1.5,
                              }}
                            >
                              {msg}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>

                    <td style={tdStyle}>
                      <input
                        type="number"
                        value={item.qty_g}
                        onChange={(e) => updateQty(item.id, Number(e.target.value))}
                        style={{
                          width: 90,
                          padding: 8,
                          border: "1px solid #ddd",
                          borderRadius: 8,
                        }}
                      />
                    </td>

                    <td style={tdStyle}>{row.kcal.toFixed(1)}</td>
                    <td style={tdStyle}>{row.protein.toFixed(1)}</td>
                    <td style={tdStyle}>{row.fat.toFixed(1)}</td>
                    <td style={tdStyle}>{row.fiber.toFixed(1)}</td>
                    <td style={tdStyle}>{row.netCarb.toFixed(1)}</td>
                    <td style={tdStyle}>{item.foods.renal_group || "—"}</td>
                    <td style={tdStyle}>
                      {item.foods.renal_max_per_meal_g
                        ? `${item.foods.renal_max_per_meal_g}غ`
                        : "—"}
                    </td>
                    <td style={tdStyle}>
                      <button onClick={() => deleteItem(item.id)} style={deleteButtonStyle}>
                        حذف
                      </button>
                    </td>
                  </tr>
                );
              })}

              <tr style={{ background: "#fafafa", fontWeight: 700 }}>
                <td style={tdStyle}>المجموع</td>
                <td style={tdStyle}></td>
                <td style={tdStyle}>{totals.kcal.toFixed(1)}</td>
                <td style={tdStyle}>{totals.protein.toFixed(1)}</td>
                <td style={tdStyle}>{totals.fat.toFixed(1)}</td>
                <td style={tdStyle}>{totals.fiber.toFixed(1)}</td>
                <td style={tdStyle}>{totals.netCarb.toFixed(1)}</td>
                <td style={tdStyle}></td>
                <td style={tdStyle}></td>
                <td style={tdStyle}></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  padding: 12,
  border: "1px solid #ddd",
  borderRadius: 10,
  fontSize: 14,
};

const thStyle: React.CSSProperties = {
  textAlign: "right",
  padding: 12,
  borderBottom: "1px solid #ddd",
  fontSize: 14,
};

const tdStyle: React.CSSProperties = {
  textAlign: "right",
  padding: 12,
  borderBottom: "1px solid #eee",
  fontSize: 14,
  verticalAlign: "top",
};

const deleteButtonStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #ddd",
  background: "white",
  cursor: "pointer",
};