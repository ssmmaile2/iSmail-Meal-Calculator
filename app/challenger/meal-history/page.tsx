"use client";

import React, { useEffect, useState } from "react";

type DayRow = {
  date: string;
  count: number;
};

function formatArabicDate(dateStr: string) {
  const date = new Date(`${dateStr}T12:00:00`);
  return new Intl.DateTimeFormat("ar-MA", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export default function MealHistoryPage() {
  const [days, setDays] = useState<DayRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch("/api/challenger/meal-history");
        const data = await res.json();

        if (!res.ok) {
          alert(data.error || "فشل في تحميل سجل الوجبات");
          return;
        }

        setDays(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error(error);
        alert("حدث خطأ أثناء تحميل سجل الوجبات");
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, []);

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <p style={{ marginBottom: 12 }}>
        <a
          href="/challenger"
          style={{ color: "#1a73e8", textDecoration: "none", fontWeight: 600 }}
        >
          العودة إلى صفحة السيد رشيد
        </a>
      </p>

      <h1 style={{ fontSize: 30, fontWeight: 700, marginBottom: 16 }}>
        سجل الوجبات
      </h1>

      {loading ? (
        <p>جاري التحميل...</p>
      ) : days.length === 0 ? (
        <p>لا توجد وجبات محفوظة بعد.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {days.map((day) => (
            <a
              key={day.date}
              href={`/challenger/meal-history/${day.date}`}
              style={{
                display: "block",
                border: "1px solid #e5e5e5",
                borderRadius: 14,
                padding: 16,
                background: "white",
                textDecoration: "none",
                color: "#111",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 18 }}>
                {formatArabicDate(day.date)}
              </div>
              <div style={{ marginTop: 6, color: "#555" }}>
                عدد الوجبات: {day.count}
              </div>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
