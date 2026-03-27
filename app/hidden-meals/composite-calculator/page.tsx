"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
};

type RecipeItem = {
  id: string;
  qty_g: number;
  food: Food;
};

export default function CompositeCalculatorPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"recipe" | "manual">("recipe");

  const [mealName, setMealName] = useState("");
  const [alias1, setAlias1] = useState("");
  const [alias2, setAlias2] = useState("");
  const [notes, setNotes] = useState("");

  const [query, setQuery] = useState("");
  const [qty, setQty] = useState<number | "">(100);
  const [suggestions, setSuggestions] = useState<Food[]>([]);
  const [items, setItems] = useState<RecipeItem[]>([]);
  const [finalYieldG, setFinalYieldG] = useState<number | "">("");

  const [manualKcal, setManualKcal] = useState<number | "">("");
  const [manualProtein, setManualProtein] = useState<number | "">("");
  const [manualFat, setManualFat] = useState<number | "">("");
  const [manualCarbs, setManualCarbs] = useState<number | "">("");
  const [manualFiber, setManualFiber] = useState<number | "">("");

  const [copyingSql, setCopyingSql] = useState(false);
  const [savingToFoods, setSavingToFoods] = useState(false);

  useEffect(() => {
    if (mode !== "recipe") {
      setSuggestions([]);
      return;
    }

    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/foods?query=${encodeURIComponent(query)}`);
        const data = await res.json();

        if (!res.ok) {
          console.error("Food search failed:", data);
          return;
        }

        setSuggestions(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Food search error:", error);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, mode]);

  function addItem(food: Food) {
    const finalQtyValue =
      qty === "" || Number(qty) <= 0
        ? Number(food.default_qty_g || 100)
        : Number(qty);

    const newItem: RecipeItem = {
      id: crypto.randomUUID(),
      qty_g: finalQtyValue,
      food,
    };

    setItems((prev) => [...prev, newItem]);
    setQuery("");
    setSuggestions([]);
    setQty(100);
  }

  function updateQty(itemId: string, newQty: number) {
    if (Number.isNaN(newQty) || newQty < 0) return;

    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, qty_g: newQty } : item
      )
    );
  }

  function deleteItem(itemId: string) {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  }

  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        const factor = item.qty_g / 100;
        acc.kcal += item.food.kcal_100 * factor;
        acc.protein += item.food.protein_100 * factor;
        acc.fat += item.food.fat_100 * factor;
        acc.carbs_total += item.food.carbs_total_100 * factor;
        acc.fiber += item.food.fiber_100 * factor;
        return acc;
      },
      {
        kcal: 0,
        protein: 0,
        fat: 0,
        carbs_total: 0,
        fiber: 0,
      }
    );
  }, [items]);

  const per100 = useMemo(() => {
    if (mode === "manual") {
      return {
        kcal: manualKcal === "" ? 0 : Number(manualKcal),
        protein: manualProtein === "" ? 0 : Number(manualProtein),
        fat: manualFat === "" ? 0 : Number(manualFat),
        carbs_total: manualCarbs === "" ? 0 : Number(manualCarbs),
        fiber: manualFiber === "" ? 0 : Number(manualFiber),
      };
    }

    const yieldValue =
      finalYieldG === "" || Number(finalYieldG) <= 0 ? 0 : Number(finalYieldG);

    if (!yieldValue) {
      return {
        kcal: 0,
        protein: 0,
        fat: 0,
        carbs_total: 0,
        fiber: 0,
      };
    }

    const factor = 100 / yieldValue;

    return {
      kcal: totals.kcal * factor,
      protein: totals.protein * factor,
      fat: totals.fat * factor,
      carbs_total: totals.carbs_total * factor,
      fiber: totals.fiber * factor,
    };
  }, [
    mode,
    totals,
    finalYieldG,
    manualKcal,
    manualProtein,
    manualFat,
    manualCarbs,
    manualFiber,
  ]);

  const netCarbPer100 = per100.carbs_total - per100.fiber;

  const sqlSnippet = useMemo(() => {
    const safeName = mealName.trim() || "عنصر غذائي جديد";

    const aliases = [alias1.trim(), alias2.trim()]
      .filter(Boolean)
      .map((v) => `"${v.replace(/"/g, '\\"')}"`);

    const aliasArray = aliases.length > 0 ? `{${aliases.join(",")}}` : `{}`;

    const safeNotes = notes.trim().replace(/'/g, "''");
    const safeMealName = safeName.replace(/'/g, "''");

    return `insert into public.foods
(
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
)
values
(
  '${safeMealName}',
  '${aliasArray}',
  ${per100.kcal.toFixed(2)},
  ${per100.protein.toFixed(2)},
  ${per100.fat.toFixed(2)},
  ${per100.carbs_total.toFixed(2)},
  ${per100.fiber.toFixed(2)},
  '${safeNotes}',
  100,
  true
);`;
  }, [mealName, alias1, alias2, notes, per100]);

  async function copySqlToClipboard() {
    if (!mealName.trim()) {
      alert("يرجى إدخال اسم العنصر أولًا");
      return;
    }

    if (mode === "recipe") {
      if (items.length === 0) {
        alert("يرجى إضافة مكونات الوجبة أولًا");
        return;
      }

      if (finalYieldG === "" || Number(finalYieldG) <= 0) {
        alert("يرجى إدخال الوزن النهائي المتحصل عليه");
        return;
      }
    } else {
      if (
        manualKcal === "" ||
        manualProtein === "" ||
        manualFat === "" ||
        manualCarbs === "" ||
        manualFiber === ""
      ) {
        alert("يرجى إدخال جميع القيم الغذائية اليدوية");
        return;
      }
    }

    setCopyingSql(true);

    try {
      await navigator.clipboard.writeText(sqlSnippet);
      alert("تم نسخ SQL إلى الحافظة");
    } catch (error) {
      console.error(error);
      alert("تعذر النسخ إلى الحافظة");
    } finally {
      setCopyingSql(false);
    }
  }

  async function addCompositeMealToFoods() {
    if (!mealName.trim()) {
      alert("يرجى إدخال اسم العنصر");
      return;
    }

    setSavingToFoods(true);

    try {
      const aliases = [alias1.trim(), alias2.trim()].filter(Boolean);

      let payload;

      if (mode === "manual") {
        if (
          manualKcal === "" ||
          manualProtein === "" ||
          manualFat === "" ||
          manualCarbs === "" ||
          manualFiber === ""
        ) {
          alert("يرجى إدخال جميع القيم الغذائية");
          return;
        }

        payload = {
          name_ar: mealName.trim(),
          aliases,
          kcal_100: Number(manualKcal),
          protein_100: Number(manualProtein),
          fat_100: Number(manualFat),
          carbs_total_100: Number(manualCarbs),
          fiber_100: Number(manualFiber),
          notes: notes.trim(),
          default_qty_g: 100,
          is_preset: true,
        };
      } else {
        if (items.length === 0) {
          alert("يرجى إضافة مكونات الوجبة");
          return;
        }

        if (finalYieldG === "" || Number(finalYieldG) <= 0) {
          alert("يرجى إدخال الوزن النهائي");
          return;
        }

        payload = {
          name_ar: mealName.trim(),
          aliases,
          kcal_100: Number(per100.kcal.toFixed(2)),
          protein_100: Number(per100.protein.toFixed(2)),
          fat_100: Number(per100.fat.toFixed(2)),
          carbs_total_100: Number(per100.carbs_total.toFixed(2)),
          fiber_100: Number(per100.fiber.toFixed(2)),
          notes: notes.trim(),
          default_qty_g: 100,
          is_preset: true,
        };
      }

      const res = await fetch("/api/foods", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Add to foods failed:", data);
        alert(data.error || "فشل في إضافة العنصر إلى قاعدة البيانات");
        return;
      }

      alert("تمت إضافة العنصر إلى قاعدة البيانات بنجاح");
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء الإضافة إلى قاعدة البيانات");
    } finally {
      setSavingToFoods(false);
    }
  }

  function resetForm() {
    setMealName("");
    setAlias1("");
    setAlias2("");
    setNotes("");
    setQuery("");
    setQty(100);
    setSuggestions([]);
    setItems([]);
    setFinalYieldG("");
    setManualKcal("");
    setManualProtein("");
    setManualFat("");
    setManualCarbs("");
    setManualFiber("");
    setMode("recipe");
  }

  return (
    <main className="page-shell" dir="rtl">
      <div className="app-header centered">
        <h1 className="app-title">حاسبة الوجبات المركبة</h1>
      </div>

      <div
        className="content-column"
        style={{ maxWidth: 1100, margin: "0 auto" }}
      >
        <div className="card form-card">
          <div className="meal-actions-row">
            <button
              onClick={() => router.push("/hidden-meals")}
              className="primary-btn"
              type="button"
            >
              رجوع
            </button>

            <button
              onClick={copySqlToClipboard}
              className="primary-btn"
              type="button"
              disabled={copyingSql}
            >
              {copyingSql ? "جارٍ النسخ..." : "نسخ SQL"}
            </button>

            <button
              onClick={addCompositeMealToFoods}
              className="primary-btn blue"
              type="button"
              disabled={savingToFoods}
            >
              {savingToFoods ? "جارٍ الإضافة..." : "إضافة إلى قاعدة البيانات"}
            </button>

            <button
              onClick={resetForm}
              className="primary-btn green-btn"
              type="button"
            >
              مسح الحقول
            </button>
          </div>

          <div className="mode-toggle" style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            <button
              className={`primary-btn ${mode === "recipe" ? "blue" : ""}`}
              onClick={() => setMode("recipe")}
              type="button"
            >
              وصفة مركبة
            </button>

            <button
              className={`primary-btn ${mode === "manual" ? "blue" : ""}`}
              onClick={() => setMode("manual")}
              type="button"
            >
              إدخال يدوي
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gap: 10,
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              marginTop: 14,
            }}
          >
            <input
              value={mealName}
              onChange={(e) => setMealName(e.target.value)}
              placeholder="اسم العنصر أو الوجبة"
              className="app-input"
            />

            <input
              value={alias1}
              onChange={(e) => setAlias1(e.target.value)}
              placeholder="Alias 1"
              className="app-input"
            />

            <input
              value={alias2}
              onChange={(e) => setAlias2(e.target.value)}
              placeholder="Alias 2"
              className="app-input"
            />
          </div>

          <div style={{ marginTop: 10 }}>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes"
              className="app-input"
            />
          </div>

          {mode === "manual" && (
            <div
              style={{
                display: "grid",
                gap: 10,
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                marginTop: 14,
              }}
            >
              <input
                type="number"
                placeholder="Kcal /100g"
                value={manualKcal}
                onChange={(e) =>
                  setManualKcal(e.target.value === "" ? "" : Number(e.target.value))
                }
                className="app-input"
              />

              <input
                type="number"
                placeholder="Protein"
                value={manualProtein}
                onChange={(e) =>
                  setManualProtein(e.target.value === "" ? "" : Number(e.target.value))
                }
                className="app-input"
              />

              <input
                type="number"
                placeholder="Fat"
                value={manualFat}
                onChange={(e) =>
                  setManualFat(e.target.value === "" ? "" : Number(e.target.value))
                }
                className="app-input"
              />

              <input
                type="number"
                placeholder="Carbs"
                value={manualCarbs}
                onChange={(e) =>
                  setManualCarbs(e.target.value === "" ? "" : Number(e.target.value))
                }
                className="app-input"
              />

              <input
                type="number"
                placeholder="Fiber"
                value={manualFiber}
                onChange={(e) =>
                  setManualFiber(e.target.value === "" ? "" : Number(e.target.value))
                }
                className="app-input"
              />
            </div>
          )}

          {mode === "recipe" && (
            <>
              <div className="search-row" style={{ marginTop: 14 }}>
                <input
                  type="number"
                  value={qty}
                  onChange={(e) =>
                    setQty(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder="كمية المكون بالغرام"
                  className="qty-side-input"
                />

                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ابحث عن مكوّن..."
                  className="app-input"
                />
              </div>

              {suggestions.length > 0 && (
                <div className="suggestions-box">
                  {suggestions.map((food) => (
                    <button
                      key={food.id}
                      onClick={() => addItem(food)}
                      className="suggestion-item"
                      type="button"
                    >
                      <div className="suggestion-title">{food.name_ar}</div>
                      <div className="suggestion-meta">
                        {food.notes || ""}
                        {food.default_qty_g
                          ? ` — وزن افتراضي: ${food.default_qty_g}غ`
                          : ""}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {mode === "recipe" && (
          <>
            <div className="desktop-table-wrap card">
              <table className="meal-table">
                <thead>
                  <tr>
                    <th>المكوّن</th>
                    <th>الكمية (غ)</th>
                    <th>Kc</th>
                    <th>P</th>
                    <th>F</th>
                    <th>Carb</th>
                    <th>Fiber</th>
                    <th>حذف</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const factor = item.qty_g / 100;

                    const kcal = item.food.kcal_100 * factor;
                    const protein = item.food.protein_100 * factor;
                    const fat = item.food.fat_100 * factor;
                    const carbs = item.food.carbs_total_100 * factor;
                    const fiber = item.food.fiber_100 * factor;

                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="table-food-title">{item.food.name_ar}</div>
                          <div className="table-food-note">{item.food.notes || ""}</div>
                        </td>
                        <td>
                          <input
                            type="number"
                            value={item.qty_g}
                            onChange={(e) =>
                              updateQty(item.id, Number(e.target.value))
                            }
                            className="qty-input"
                          />
                        </td>
                        <td>{Math.round(kcal)}</td>
                        <td>{Math.round(protein)}</td>
                        <td>{Math.round(fat)}</td>
                        <td>{Math.round(carbs)}</td>
                        <td>{Math.round(fiber)}</td>
                        <td>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="danger-btn small"
                            type="button"
                          >
                            حذف
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  <tr className="totals-row">
                    <td className="totals-label">مجموع الطبق</td>
                    <td></td>
                    <td>{totals.kcal.toFixed(1)}</td>
                    <td>{totals.protein.toFixed(1)}</td>
                    <td>{totals.fat.toFixed(1)}</td>
                    <td>{totals.carbs_total.toFixed(1)}</td>
                    <td>{totals.fiber.toFixed(1)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="card form-card" style={{ marginTop: 16 }}>
              <div
                style={{
                  display: "grid",
                  gap: 12,
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  alignItems: "start",
                }}
              >
                <div>
                  <label
                    style={{ display: "block", marginBottom: 6, fontWeight: 700 }}
                  >
                    الوزن النهائي المتحصل عليه بعد النقع/الطبخ (غ)
                  </label>
                  <input
                    type="number"
                    value={finalYieldG}
                    onChange={(e) =>
                      setFinalYieldG(
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    placeholder="مثال: 3250"
                    className="app-input"
                  />
                </div>

                <div>
                  <label
                    style={{ display: "block", marginBottom: 6, fontWeight: 700 }}
                  >
                    القيم لكل 100غ من الناتج النهائي
                  </label>
                  <div
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 12,
                      padding: 12,
                      lineHeight: 1.9,
                    }}
                  >
                    <div>🔥 Kc: {per100.kcal.toFixed(2)}</div>
                    <div>🥩 P: {per100.protein.toFixed(2)}</div>
                    <div>🧈 F: {per100.fat.toFixed(2)}</div>
                    <div>🌾 Carb: {per100.carbs_total.toFixed(2)}</div>
                    <div>🌿 Fiber: {per100.fiber.toFixed(2)}</div>
                    <div>✅ Net Carb: {netCarbPer100.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {mode === "manual" && (
          <div className="card form-card" style={{ marginTop: 16 }}>
            <label
              style={{ display: "block", marginBottom: 6, fontWeight: 700 }}
            >
              القيم اليدوية لكل 100غ
            </label>
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 12,
                lineHeight: 1.9,
              }}
            >
              <div>🔥 Kc: {per100.kcal.toFixed(2)}</div>
              <div>🥩 P: {per100.protein.toFixed(2)}</div>
              <div>🧈 F: {per100.fat.toFixed(2)}</div>
              <div>🌾 Carb: {per100.carbs_total.toFixed(2)}</div>
              <div>🌿 Fiber: {per100.fiber.toFixed(2)}</div>
              <div>✅ Net Carb: {netCarbPer100.toFixed(2)}</div>
            </div>
          </div>
        )}

        <div className="card form-card" style={{ marginTop: 16 }}>
          <div style={{ marginTop: 14 }}>
            <label
              style={{ display: "block", marginBottom: 6, fontWeight: 700 }}
            >
              SQL الناتج
            </label>
            <textarea
              value={sqlSnippet}
              readOnly
              rows={14}
              className="app-input"
              style={{ resize: "vertical", fontFamily: "monospace" }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
