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
};

type MealItem = {
  id: string;
  qty_g: number;
  foods: Food | null;
};

type SavedMeal = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  items?: MealItem[];
};

export default function Page() {
  const [mealId, setMealId] = useState<string | null>(null);
  const [mealTitle, setMealTitle] = useState("وجبة جديدة");
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [items, setItems] = useState<MealItem[]>([]);
  const [query, setQuery] = useState("");
  const [qty, setQty] = useState<number | "">(100);
  const [suggestions, setSuggestions] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [savingTitle, setSavingTitle] = useState(false);

  useEffect(() => {
    async function init() {
      await loadSavedMeals();

      try {
        const res = await fetch("/api/meals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "وجبة جديدة" }),
        });

        const meal = await res.json();

        if (!res.ok) {
          alert(meal.error || "فشل في إنشاء الوجبة");
          return;
        }

        setMealId(meal.id);
        setMealTitle(meal.title || "وجبة جديدة");
        await refreshMeal(meal.id);
        await loadSavedMeals();
      } catch (error) {
        console.error(error);
        alert("حدث خطأ أثناء إنشاء الوجبة");
      } finally {
        setLoading(false);
      }
    }

    init();
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
          console.error("Food search failed:", data);
          return;
        }

        setSuggestions(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Food search error:", error);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  async function loadSavedMeals() {
    try {
      const res = await fetch("/api/meals?with_items=true");
      const data = await res.json();

      if (!res.ok) {
        console.error("Load meals failed:", data);
        return;
      }

      const filtered = Array.isArray(data)
        ? data.filter((meal) => Array.isArray(meal.items) && meal.items.length > 0)
        : [];

      setSavedMeals(filtered);
    } catch (error) {
      console.error("loadSavedMeals error:", error);
    }
  }

  async function refreshMeal(id: string) {
    try {
      const res = await fetch(`/api/meals/${id}`);
      const data = await res.json();

      if (!res.ok) {
        console.error("GET /meal failed:", data);
        alert(data.error || "فشل في تحميل الوجبة");
        return;
      }

      setMealId(data.meal.id);
      setMealTitle(data.meal.title || "وجبة جديدة");
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      console.error("refreshMeal error:", error);
      alert("حدث خطأ أثناء تحميل الوجبة");
    }
  }

  async function createNewMeal() {
    try {
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "وجبة جديدة" }),
      });

      const meal = await res.json();

      if (!res.ok) {
        alert(meal.error || "فشل في إنشاء وجبة جديدة");
        return;
      }

      setMealId(meal.id);
      setMealTitle(meal.title || "وجبة جديدة");
      setItems([]);
      setQuery("");
      setSuggestions([]);
      setQty(100);
      await loadSavedMeals();
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء إنشاء وجبة جديدة");
    }
  }

  async function deleteMeal(targetMealId: string) {
    const confirmed = window.confirm("هل تريد حذف هذه الوجبة نهائيًا؟");
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/meals/${targetMealId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "فشل في حذف الوجبة");
        return;
      }

      const wasCurrentMeal = mealId === targetMealId;

      await loadSavedMeals();

      if (wasCurrentMeal) {
        await createNewMeal();
      } else {
        setSavedMeals((prev) => prev.filter((meal) => meal.id !== targetMealId));
      }
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء حذف الوجبة");
    }
  }

  async function saveMealTitle() {
    if (!mealId) return;

    setSavingTitle(true);

    try {
      const res = await fetch(`/api/meals/${mealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: mealTitle }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "فشل في حفظ اسم الوجبة");
        return;
      }

      setMealTitle(data.title || "وجبة جديدة");
      await loadSavedMeals();
      alert("تم الحفظ");
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء الحفظ");
    } finally {
      setSavingTitle(false);
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

  function calcMealTotals(items: MealItem[] = []) {
    return items.reduce(
      (acc, item) => {
        if (!item.foods) return acc;

        const factor = item.qty_g / 100;

        acc.kcal += item.foods.kcal_100 * factor;
        acc.protein += item.foods.protein_100 * factor;
        acc.fat += item.foods.fat_100 * factor;
        acc.fiber += item.foods.fiber_100 * factor;

        const carbs = item.foods.carbs_total_100 * factor;
        acc.netCarb += carbs - item.foods.fiber_100 * factor;

        return acc;
      },
      { kcal: 0, protein: 0, fat: 0, fiber: 0, netCarb: 0 }
    );
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
        console.error("POST /items failed:", result);
        alert(result.error || "فشل في إضافة العنصر");
        return;
      }

      const newItem: MealItem = {
        id: result.id,
        qty_g: result.qty_g,
        foods: food,
      };

      setItems((prev) => [...prev, newItem]);
      setQuery("");
      setSuggestions([]);
      setQty(100);
      await loadSavedMeals();
    } catch (error) {
      console.error("addItem error:", error);
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
        console.error("PATCH /items failed:", result);
        alert(result.error || "فشل في تعديل الكمية");
        return;
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, qty_g: newQty } : item
        )
      );

      await loadSavedMeals();
    } catch (error) {
      console.error("updateQty error:", error);
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
        console.error("DELETE /items failed:", result);
        alert(result.error || "فشل في حذف العنصر");
        return;
      }

      setItems((prev) => prev.filter((item) => item.id !== itemId));
      await loadSavedMeals();
    } catch (error) {
      console.error("deleteItem error:", error);
      alert("حدث خطأ أثناء حذف العنصر");
    }
  }

  return (
    <main className="page-shell" dir="rtl">
      <div className="app-header centered">
        <h1 className="app-title">Meal Calculator</h1>
      </div>

      <div className="app-layout">
        <aside className="sidebar-card">
          <div className="sidebar-header">
            <strong>الوجبات المحفوظة</strong>
            <span className="sidebar-count">{savedMeals.length}</span>
          </div>

          <div className="saved-meals-list">
            {savedMeals.map((meal) => {
              const mealTotals = calcMealTotals(meal.items || []);

              return (
                <div
                  key={meal.id}
                  className={`saved-meal-card ${meal.id === mealId ? "active" : ""}`}
                >
                  <button
                    onClick={() => refreshMeal(meal.id)}
                    className="saved-meal-open-btn"
                  >
                    <div className="saved-meal-title">{meal.title}</div>
                    <div className="saved-meal-date">
                      آخر تعديل: {new Date(meal.updated_at).toLocaleString()}
                    </div>
                    <div className="saved-meal-macros">
                      <span>🌾 {Math.round(mealTotals.netCarb)}Crb</span>
                      <span>🧈 {Math.round(mealTotals.fat)}G</span>
                      <span>🌿 {Math.round(mealTotals.fiber)}F</span>
                      <span>🥩 {Math.round(mealTotals.protein)}P</span>
                      <span>🔥 {Math.round(mealTotals.kcal)}Kc</span>
                    </div>
                  </button>

                  <button
                    onClick={() => deleteMeal(meal.id)}
                    className="danger-btn"
                  >
                    حذف الوجبة
                  </button>
                </div>
              );
            })}
          </div>
        </aside>

        <section className="content-column">
          <div className="card form-card">
            <div className="meal-actions-row">
              <button
                onClick={createNewMeal}
                className="primary-btn green-btn"
              >
                وجبة جديدة
              </button>

              <input
                value={mealTitle}
                onChange={(e) => setMealTitle(e.target.value)}
                placeholder="اسم الوجبة"
                className="app-input"
              />

              <button
                onClick={saveMealTitle}
                disabled={savingTitle}
                className="primary-btn blue"
              >
                حفظ
              </button>
            </div>

            <div className="search-row">
              <input
                type="number"
                value={qty}
                onChange={(e) =>
                  setQty(e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="الكمية"
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
                    disabled={adding}
                    className="suggestion-item"
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
          </div>

          {loading ? (
            <div className="card loading-card">جاري التحميل...</div>
          ) : (
            <div className="desktop-table-wrap card">
              <table className="meal-table">
                <thead>
                  <tr>
                    <th>المكوّن</th>
                    <th>الكمية (غ)</th>
                    <th>Kc</th>
                    <th>P</th>
                    <th>F</th>
                    <th>G</th>
                    <th>Crb</th>
                    <th>حذف</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    if (!item.foods) return null;

                    const row = calcRow(item.foods, item.qty_g);

                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="table-food-title">{item.foods.name_ar}</div>
                          <div className="table-food-note">
                            {item.foods.notes || ""}
                          </div>
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
                        <td>{Math.round(row.kcal)}</td>
                        <td>{Math.round(row.protein)}</td>
                        <td>{Math.round(row.fiber)}</td>
                        <td>{Math.round(row.fat)}</td>
                        <td>{Math.round(row.netCarb)}</td>
                        <td>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="danger-btn small"
                          >
                            حذف
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  <tr className="totals-row">
                    <td className="totals-label">الإجمالي</td>
                    <td></td>
                    <td>{Math.round(totals.kcal)}</td>
                    <td>{Math.round(totals.protein)}</td>
                    <td>{Math.round(totals.fiber)}</td>
                    <td>{Math.round(totals.fat)}</td>
                    <td>{Math.round(totals.netCarb)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}