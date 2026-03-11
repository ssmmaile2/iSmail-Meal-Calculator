"use client";

import { useEffect, useState } from "react";

type HiddenMeal = {
  id: string;
  title: string;
  created_at: string;
  is_hidden: boolean;
};

export default function HiddenMealsPage() {
  const [meals, setMeals] = useState<HiddenMeal[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadHiddenMeals() {
    try {
      const res = await fetch("/api/meals/hidden");
      const data = await res.json();
      setMeals(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      alert("تعذر تحميل السجل الخفي");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHiddenMeals();
  }, []);

  async function renameMeal(mealId: string, currentTitle: string) {
    const newTitle = prompt("أدخل الاسم الجديد للوجبة:", currentTitle);
    if (!newTitle || !newTitle.trim()) return;

    try {
      const res = await fetch(`/api/meals/${mealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "فشل في إعادة التسمية");
        return;
      }

      setMeals((prev) =>
        prev.map((meal) =>
          meal.id === mealId ? { ...meal, title: data.title } : meal
        )
      );
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء إعادة التسمية");
    }
  }

  async function deleteMeal(mealId: string) {
    const ok = confirm("هل تريد حذف هذه الوجبة من السجل الخفي؟");
    if (!ok) return;

    try {
      const res = await fetch(`/api/meals/${mealId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "فشل في حذف الوجبة");
        return;
      }

      setMeals((prev) => prev.filter((meal) => meal.id !== mealId));
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء حذف الوجبة");
    }
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>
        السجل الخفي
      </h1>

      {loading ? (
        <p>جاري التحميل...</p>
      ) : meals.length === 0 ? (
        <p>لا توجد وجبات مخفية بعد.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {meals.map((meal) => (
            <div
              key={meal.id}
              style={{
                border: "1px solid #e5e5e5",
                borderRadius: 12,
                padding: 12,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 8 }}>{meal.title}</div>
              <div style={{ fontSize: 13, color: "#666", marginBottom: 10 }}>
                {new Date(meal.created_at).toLocaleString("fr-FR", {
                  hour12: false,
                })}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => renameMeal(meal.id, meal.title)}>
                  إعادة التسمية
                </button>

                <button onClick={() => deleteMeal(meal.id)}>
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
