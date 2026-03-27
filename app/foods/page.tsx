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

const emptyForm = {
  name_ar: "",
  alias1: "",
  alias2: "",
  kcal_100: "",
  protein_100: "",
  fat_100: "",
  carbs_total_100: "",
  fiber_100: "",
  notes: "",
  default_qty_g: "100",
  is_preset: true,
};

export default function FoodsAdminPage() {
  const router = useRouter();

  const [foods, setFoods] = useState<Food[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadFoods(query);
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    loadFoods("");
  }, []);

  async function loadFoods(search: string) {
    try {
      setLoading(true);
      const url = `/api/foods${search.trim() ? `?query=${encodeURIComponent(search)}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        console.error(data);
        alert(data.error || "فشل في تحميل العناصر");
        return;
      }

      setFoods(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء تحميل العناصر");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function startEdit(food: Food) {
    setEditingId(food.id);
    setForm({
      name_ar: food.name_ar || "",
      alias1: food.aliases?.[0] || "",
      alias2: food.aliases?.[1] || "",
      kcal_100: String(food.kcal_100 ?? ""),
      protein_100: String(food.protein_100 ?? ""),
      fat_100: String(food.fat_100 ?? ""),
      carbs_total_100: String(food.carbs_total_100 ?? ""),
      fiber_100: String(food.fiber_100 ?? ""),
      notes: food.notes || "",
      default_qty_g: String(food.default_qty_g ?? 100),
      is_preset: !!food.is_preset,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveFood() {
    if (!form.name_ar.trim()) {
      alert("يرجى إدخال اسم العنصر");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name_ar: form.name_ar.trim(),
        aliases: [form.alias1.trim(), form.alias2.trim()].filter(Boolean),
        kcal_100: Number(form.kcal_100 || 0),
        protein_100: Number(form.protein_100 || 0),
        fat_100: Number(form.fat_100 || 0),
        carbs_total_100: Number(form.carbs_total_100 || 0),
        fiber_100: Number(form.fiber_100 || 0),
        notes: form.notes.trim(),
        default_qty_g: Number(form.default_qty_g || 100),
        is_preset: !!form.is_preset,
      };

      const url = editingId ? `/api/foods/${editingId}` : "/api/foods";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error(data);
        alert(data.error || "فشل في الحفظ");
        return;
      }

      alert(editingId ? "تم تعديل العنصر بنجاح" : "تمت إضافة العنصر بنجاح");
      resetForm();
      await loadFoods(query);
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  }

  async function deleteFood(id: string) {
    const confirmed = window.confirm("هل تريد حذف هذا العنصر نهائيًا؟");
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/foods/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        console.error(data);
        alert(data.error || "فشل في الحذف");
        return;
      }

      if (editingId === id) {
        resetForm();
      }

      setFoods((prev) => prev.filter((food) => food.id !== id));
      alert("تم حذف العنصر");
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء الحذف");
    }
  }

  const foodsCount = useMemo(() => foods.length, [foods]);

  return (
    <main className="page-shell" dir="rtl">
      <div className="app-header centered">
        <h1 className="app-title">إدارة العناصر الغذائية</h1>
      </div>

      <div className="content-column" style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div className="card form-card">
          <div className="meal-actions-row">
            <button
              onClick={() => router.back()}
              className="primary-btn"
              type="button"
            >
              رجوع
            </button>

            <button
              onClick={saveFood}
              className="primary-btn blue"
              type="button"
              disabled={saving}
            >
              {saving ? "جارٍ الحفظ..." : editingId ? "حفظ التعديل" : "إضافة العنصر"}
            </button>

            <button
              onClick={resetForm}
              className="primary-btn green-btn"
              type="button"
            >
              مسح الحقول
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
              value={form.name_ar}
              onChange={(e) => setForm((prev) => ({ ...prev, name_ar: e.target.value }))}
              placeholder="اسم العنصر"
              className="app-input"
            />

            <input
              value={form.alias1}
              onChange={(e) => setForm((prev) => ({ ...prev, alias1: e.target.value }))}
              placeholder="Alias 1"
              className="app-input"
            />

            <input
              value={form.alias2}
              onChange={(e) => setForm((prev) => ({ ...prev, alias2: e.target.value }))}
              placeholder="Alias 2"
              className="app-input"
            />
          </div>

          <div
            style={{
              display: "grid",
              gap: 10,
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              marginTop: 12,
            }}
          >
            <input
              type="number"
              value={form.kcal_100}
              onChange={(e) => setForm((prev) => ({ ...prev, kcal_100: e.target.value }))}
              placeholder="Kcal /100g"
              className="app-input"
            />

            <input
              type="number"
              value={form.protein_100}
              onChange={(e) => setForm((prev) => ({ ...prev, protein_100: e.target.value }))}
              placeholder="Protein"
              className="app-input"
            />

            <input
              type="number"
              value={form.fat_100}
              onChange={(e) => setForm((prev) => ({ ...prev, fat_100: e.target.value }))}
              placeholder="Fat"
              className="app-input"
            />

            <input
              type="number"
              value={form.carbs_total_100}
              onChange={(e) => setForm((prev) => ({ ...prev, carbs_total_100: e.target.value }))}
              placeholder="Carbs"
              className="app-input"
            />

            <input
              type="number"
              value={form.fiber_100}
              onChange={(e) => setForm((prev) => ({ ...prev, fiber_100: e.target.value }))}
              placeholder="Fiber"
              className="app-input"
            />

            <input
              type="number"
              value={form.default_qty_g}
              onChange={(e) => setForm((prev) => ({ ...prev, default_qty_g: e.target.value }))}
              placeholder="الكمية الافتراضية"
              className="app-input"
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <input
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Notes"
              className="app-input"
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={form.is_preset}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, is_preset: e.target.checked }))
                }
              />
              <span>عنصر جاهز للاستعمال</span>
            </label>
          </div>
        </div>

        <div className="card form-card" style={{ marginTop: 16 }}>
          <div className="sidebar-header" style={{ marginBottom: 12 }}>
            <strong>العناصر الغذائية</strong>
            <span className="sidebar-count">{foodsCount}</span>
          </div>

          <div style={{ marginBottom: 14 }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن عنصر غذائي..."
              className="app-input"
            />
          </div>

          {loading ? (
            <div className="loading-card">جاري التحميل...</div>
          ) : foods.length === 0 ? (
            <div className="loading-card">لا توجد عناصر مطابقة.</div>
          ) : (
            <div className="saved-meals-list">
              {foods.map((food) => (
                <div key={food.id} className="saved-meal-card">
                  <div className="saved-meal-open-btn" style={{ cursor: "default" }}>
                    <div className="saved-meal-title">{food.name_ar}</div>

                    <div className="saved-meal-date" style={{ marginTop: 6 }}>
                      aliases: {(food.aliases || []).join(" ، ") || "—"}
                    </div>

                    <div className="saved-meal-macros" style={{ marginTop: 8 }}>
                      <span>🌾 {Math.round((food.carbs_total_100 || 0) - (food.fiber_100 || 0))} Crb</span>
                      <span>🧈 {Math.round(food.fat_100 || 0)} G</span>
                      <span>🌿 {Math.round(food.fiber_100 || 0)} F</span>
                      <span>🥩 {Math.round(food.protein_100 || 0)} P</span>
                      <span>🔥 {Math.round(food.kcal_100 || 0)} Kc</span>
                    </div>

                    {food.notes ? (
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 13,
                          color: "#666",
                          lineHeight: 1.6,
                        }}
                      >
                        {food.notes}
                      </div>
                    ) : null}
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                    <button
                      onClick={() => startEdit(food)}
                      className="primary-btn"
                      type="button"
                    >
                      تعديل
                    </button>

                    <button
                      onClick={() => deleteFood(food.id)}
                      className="danger-btn"
                      type="button"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
