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
  const router = useRouter();

  const [mealId, setMealId] = useState<string | null>(null);
  const [mealTitle, setMealTitle] = useState("وجبة خفية جديدة");
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [savedMealsSearch, setSavedMealsSearch] = useState("");
  const [items, setItems] = useState<MealItem[]>([]);
  const [query, setQuery] = useState("");
  const [qty, setQty] = useState<number | "">(100);
  const [suggestions, setSuggestions] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [savingTitle, setSavingTitle] = useState(false);

  useEffect(() => {
    async function init() {
      await loadSavedMeals("");
      setLoading(false);
    }

    init();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSavedMeals(savedMealsSearch);
    }, 250);

    return () => clearTimeout(timer);
  }, [savedMealsSearch]);

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

  async function loadSavedMeals(search = "") {
    try {
      const res = await fetch(
        `/api/hidden-meals?with_items=true&query=${encodeURIComponent(search)}`
      );
      const data = await res.json();

      if (!res.ok) {
        console.error("Load hidden meals failed:", data);
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
      const res = await fetch(`/api/hidden-meals/${id}`);
      const data = await res.json();

      if (!res.ok) {
        console.error("GET /hidden-meal failed:", data);
        alert(data.error || "فشل في تحميل الوجبة");
        return;
      }

      setMealId(data.meal.id);
      setMealTitle(data.meal.title || "وجبة خفية جديدة");
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      console.error("refreshMeal error:", error);
      alert("حدث خطأ أثناء تحميل الوجبة");
    }
  }

  function createNewMeal() {
    setMealId(null);
    setMealTitle("وجبة خفية جديدة");
    setItems([]);
    setQuery("");
    setSuggestions([]);
    setQty(100);
  }

  async function deleteMeal(targetMealId: string) {
    const confirmed = window.confirm("هل تريد حذف هذه الوجبة نهائيًا؟");
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/hidden-meals/${targetMealId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "فشل في حذف الوجبة");
        return;
      }

      const wasCurrentMeal = mealId === targetMealId;

      await loadSavedMeals(savedMealsSearch);

      if (wasCurrentMeal) {
        createNewMeal();
      } else {
        setSavedMeals((prev) => prev.filter((meal) => meal.id !== targetMealId));
      }
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء حذف الوجبة");
    }
  }

  async function saveMealTitle() {
    setSavingTitle(true);

    try {
      let currentMealId = mealId;

      if (!currentMealId) {
        const createRes = await fetch("/api/hidden-meals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: mealTitle?.trim() || "وجبة خفية جديدة",
          }),
        });

        const created = await createRes.json();

        if (!createRes.ok) {
          console.error("Create hidden meal error:", created);
          alert(created.error || "فشل في إنشاء الوجبة");
          return;
        }

        currentMealId = created.id;
        setMealId(created.id);
      }

      const payload = {
        title: mealTitle?.trim() || "وجبة خفية جديدة",
        items: items
          .filter((item) => item.foods)
          .map((item) => ({
            food_id: item.foods!.id,
            qty_g: item.qty_g,
          })),
      };

      const res = await fetch(`/api/hidden-meals/${currentMealId}/full`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("PATCH full hidden meal error:", data);
        alert(data.error || `فشل في حفظ الوجبة (HTTP ${res.status})`);
        return;
      }

      await loadSavedMeals(savedMealsSearch);
      alert("تم الحفظ");
    } catch (error) {
      console.error("saveMealTitle error:", error);
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

  function addItem(food: Food) {
    const finalQty =
      food.default_qty_g && Number(food.default_qty_g) > 0
        ? Number(food.default_qty_g)
        : qty === "" || Number(qty) <= 0
          ? 100
          : Number(qty);

    setAdding(true);

    try {
      const newItem: MealItem = {
        id: crypto.randomUUID(),
        qty_g: finalQty,
        foods: food,
      };

      setItems((prev) => [...prev, newItem]);
      setQuery("");
      setSuggestions([]);
      setQty(100);
    } catch (error) {
      console.error("addItem error:", error);
      alert("حدث خطأ أثناء الإضافة");
    } finally {
      setAdding(false);
    }
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

          <div className="sidebar-search-wrap" style={{ marginBottom: 12 }}>
            <input
              value={savedMealsSearch}
              onChange={(e) => setSavedMealsSearch(e.target.value)}
              placeholder="ابحث في الوجبات المحفوظة..."
              className="app-input"
            />
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
                type="button"
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
                type="button"
              >
                {savingTitle ? "جاري الحفظ..." : "حفظ"}
              </button>

              <button
                onClick={() => router.push("/")}
                className="primary-btn"
                type="button"
              >
                الصفحة الرئيسية
              </button>
            </div>
            <div className="bottom-nav-buttons">
              <button
                className="primary-btn blue"
                onClick={() => router.push("/hidden-meals/composite-calculator")}
                type="button"
              >
                حساب الوجبات المركبة
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
                            type="button"
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
                    <td>{Math.round(totals.protein)} P</td>
                    <td>{Math.round(totals.fiber)}</td>
                    <td>{Math.round(totals.fat)}</td>
                    <td>{Math.round(totals.netCarb)} Crb</td>
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
