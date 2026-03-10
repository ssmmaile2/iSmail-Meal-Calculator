"use client";

import React, { useEffect, useState } from "react";

type FoodItem = {
  id: string;
  name_ar: string;
  renal_group?: string | null;
  renal_reason?: string | null;
  renal_max_per_meal_g?: number | null;
  renal_max_times_per_day?: number | null;
  renal_max_times_per_week?: number | null;
  renal_limit_details?: string | null;
  renal_min_gap_days?: number | null;
  renal_max_uses_per_7d?: number | null;
};

type GroupInfo = {
  id: string;
  name_ar: string;
};

function renalGroupLabel(value?: string | null) {
  if (value === "excellent") return "ممتاز";
  if (value === "allowed") return "مسموح";
  if (value === "restricted") return "مسموح بشروط";
  if (value === "forbidden") return "محظور";
  return "—";
}

export default function GroupDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [groupId, setGroupId] = useState("");
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const p = await params;
      setGroupId(p.id);
    }
    init();
  }, [params]);

  useEffect(() => {
    if (!groupId) return;

    async function loadGroupDetails() {
      setLoading(true);
      try {
        const res = await fetch(`/api/challenger/groups/${groupId}`);
        const data = await res.json();

        if (!res.ok) {
          alert(data.error || "فشل في تحميل تفاصيل المجموعة");
          return;
        }

        setGroup(data.group || null);
        setFoods(Array.isArray(data.foods) ? data.foods : []);
      } catch (error) {
        console.error(error);
        alert("حدث خطأ أثناء تحميل تفاصيل المجموعة");
      } finally {
        setLoading(false);
      }
    }

    loadGroupDetails();
  }, [groupId]);

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: 16 }}>
      <p style={{ marginBottom: 12 }}>
        <a
          href="/challenger/groups"
          style={{ color: "#1a73e8", textDecoration: "none", fontWeight: 600 }}
        >
          العودة إلى صفحة المجموعات
        </a>
      </p>

      {loading ? (
        <p>جاري التحميل...</p>
      ) : !group ? (
        <p>المجموعة غير موجودة.</p>
      ) : (
        <>
          <h1 style={{ fontSize: 30, fontWeight: 700, marginBottom: 16 }}>
            {group.name_ar}
          </h1>

          {foods.length === 0 ? (
            <p>لا توجد عناصر في هذه المجموعة.</p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {foods.map((food) => (
                <div
                  key={food.id}
                  style={{
                    border: "1px solid #e5e5e5",
                    borderRadius: 14,
                    padding: 16,
                    background: "white",
                  }}
                >
                  <a
                    href={`/challenger/food/${food.id}`}
                    style={{
                      color: "#1a73e8",
                      textDecoration: "none",
                      fontWeight: 700,
                      fontSize: 20,
                    }}
                  >
                    {food.name_ar}
                  </a>

                  <div style={{ marginTop: 8, color: "#444" }}>
                    <strong>التصنيف:</strong> {renalGroupLabel(food.renal_group)}
                  </div>

                  {food.renal_reason ? (
                    <div style={{ marginTop: 6, color: "#444" }}>
                      <strong>سبب التقييد:</strong> {food.renal_reason}
                    </div>
                  ) : null}

                  {food.renal_limit_details ? (
                    <div style={{ marginTop: 6, color: "#8a5a00" }}>
                      <strong>تفاصيل التقييد:</strong> {food.renal_limit_details}
                    </div>
                  ) : null}

                  <div style={{ marginTop: 8, display: "grid", gap: 4, color: "#444" }}>
                    <div>
                      <strong>الحد لكل وجبة:</strong>{" "}
                      {food.renal_max_per_meal_g ? `${food.renal_max_per_meal_g}غ` : "—"}
                    </div>
                    <div>
                      <strong>الحد اليومي:</strong>{" "}
                      {food.renal_max_times_per_day ? `${food.renal_max_times_per_day} مرة` : "—"}
                    </div>
                    <div>
                      <strong>الحد الأسبوعي:</strong>{" "}
                      {food.renal_max_times_per_week ? `${food.renal_max_times_per_week} مرات` : "—"}
                    </div>
                    <div>
                      <strong>الحد خلال 7 أيام:</strong>{" "}
                      {food.renal_max_uses_per_7d ? `${food.renal_max_uses_per_7d} مرات` : "—"}
                    </div>
                    <div>
                      <strong>الفاصل الأدنى:</strong>{" "}
                      {food.renal_min_gap_days ? `${food.renal_min_gap_days} يوم` : "—"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}