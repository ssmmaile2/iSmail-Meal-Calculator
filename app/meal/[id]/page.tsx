"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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
};

type MealItem = {
  id?: string;
  qty_g: number;
  foods: Food | null;
};

export default function MealDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const mealId = params.id as string;

  const [mealTitle, setMealTitle] = useState("وجبة");
  const [items, setItems] = useState<MealItem[]>([]);
  const [query, setQuery] = useState("");
  const [qty, setQty] = useState<number | "">(100);
  const [suggestions, setSuggestions] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadMeal();
  }, [mealId]);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/foods?query=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (res.ok) setSuggestions(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error(error);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  async function loadMeal() {
    try {
      const res = await fetch(`/api/meals/${mealId}`);
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "فشل في تحميل الوجبة");
        return;
      }

      setMealTitle(data.meal?.title || "وجبة");
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء تحميل الوجبة");
    } finally {
      setLoading(false);
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

  function addLocalItem(food: Food) {
    const finalQty =
      food.default_qty_g && Number(food.default_qty_g) > 0
        ? Number(food.default_qty_g)
        : qty === "" || Number(qty) <= 0
          ? 100
          : Number(qty);

    setItems((prev) => [...prev, { qty_g: finalQty, foods: food }]);
    setQuery("");
    setSuggestions([]);
    setQty(100);
  }

  function updateLocalQty(index: number, newQty: number) {
    if (Number.isNaN(newQty) || newQty < 0) return;

    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, qty_g: newQty } : item))
    );
  }

  function deleteLocalItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveAllChanges() {
    setSaving(true);

    try {
      const payload = {
        title: mealTitle,
        items: items
          .filter((item) => item.foods)
          .map((item) => ({
            food_id: item.foods!.id,
            qty_g: item.qty_g,
          })),
      };

      const res = await fetch(`/api/meals/${mealId}/full`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "فشل في حفظ التعديلات");
        return;
      }

      alert("تم حفظ التعديلات");
      await loadMeal();
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء حفظ التعديلات");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main style={{ padding: 16 }} dir="rtl">جاري التحميل...</main>;
  }

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }} dir="rtl">
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <button onClick={() => router.back()}>رجوع</button>
        <button onClick={saveAllChanges} disabled={saving}>
          {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
        </button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <input
          value={mealTitle}
          onChange={(e) => setMealTitle(e.target.value)}
          placeholder="اسم الوجبة"
          style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #ddd" }}
        />
      </div>

      <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
        <input
          type="number"
          value={qty}
          onChange={(e) => setQty(e.target.value === "" ? "" : Number(e.target.value))}
          placeholder="الكمية"
          style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
        />

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن مكوّن..."
          style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
        />

        {suggestions.length > 0 && (
          <div style={{ border: "1px solid #eee", borderRadius: 10, overflow: "hidden" }}>
            {suggestions.map((food) => (
              <button
                key={food.id}
                onClick={() => addLocalItem(food)}
                style={{
                  width: "100%",
                  textAlign: "right",
                  padding: 10,
                  border: "none",
                  background: "#fff",
                  cursor: "pointer",
                  borderBottom: "1px solid #f2f2f2",
                }}
              >
                <div>{food.name_ar}</div>
                <div style={{ fontSize: 12, color: "#666" }}>{food.notes || ""}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ overflowX: "auto", border: "1px solid #eee", borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
          <thead>
            <tr style={{ background: "#fafafa" }}>
              <th style={th}>المكوّن</th>
              <th style={th}>الكمية (غ)</th>
              <th style={th}>Kc</th>
              <th style={th}>P</th>
              <th style={th}>F</th>
              <th style={th}>G</th>
              <th style={th}>Crb</th>
              <th style={th}>حذف</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              if (!item.foods) return null;
              const row = calcRow(item.foods, item.qty_g);

              return (
                <tr key={index}>
                  <td style={td}>
                    <div>{item.foods.name_ar}</div>
                    <div style={{ fontSize: 12, color: "#666" }}>{item.foods.notes || ""}</div>
                  </td>
                  <td style={td}>
                    <input
                      type="number"
                      value={item.qty_g}
                      onChange={(e) => updateLocalQty(index, Number(e.target.value))}
                      style={{ width: 90, padding: 6 }}
                    />
                  </td>
                  <td style={td}>{Math.round(row.kcal)}</td>
                  <td style={td}>{Math.round(row.protein)}</td>
                  <td style={td}>{Math.round(row.fiber)}</td>
                  <td style={td}>{Math.round(row.fat)}</td>
                  <td style={td}>{Math.round(row.netCarb)}</td>
                  <td style={td}>
                    <button onClick={() => deleteLocalItem(index)}>حذف</button>
                  </td>
                </tr>
              );
            })}

            <tr style={{ background: "#fafafa", fontWeight: 700 }}>
              <td style={td}>الإجمالي</td>
              <td style={td}></td>
              <td style={td}>{Math.round(totals.kcal)}</td>
              <td style={td}>{Math.round(totals.protein)}</td>
              <td style={td}>{Math.round(totals.fiber)}</td>
              <td style={td}>{Math.round(totals.fat)}</td>
              <td style={td}>{Math.round(totals.netCarb)}</td>
              <td style={td}></td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  );
}

const th: React.CSSProperties = {
  padding: 10,
  borderBottom: "1px solid #eee",
  textAlign: "right",
  fontSize: 13,
};

const td: React.CSSProperties = {
  padding: 10,
  borderBottom: "1px solid #f2f2f2",
  textAlign: "right",
  fontSize: 13,
};
