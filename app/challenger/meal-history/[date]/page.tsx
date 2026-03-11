"use client";

import React, { useEffect, useState } from "react";

type EntryItem = {
  id: string;
  qty_g: number;
  food: {
    id: string;
    name_ar: string;
  };
};

type EntryRow = {
  id: string;
  notes?: string | null;
  created_at: string;
  items: EntryItem[];
};

function formatArabicDate(dateStr: string) {
  const date = new Date(`${dateStr}T12:00:00`);
  return new Intl.DateTimeFormat("ar-MA", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

function format24h(dateTimeStr: string) {
  return new Intl.DateTimeFormat("ar-MA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(dateTimeStr));
}

export default function MealHistoryDayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const [dateValue, setDateValue] = useState("");
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const p = await params;
      setDateValue(p.date);
    }
    init();
  }, [params]);

  async function loadDay(targetDate: string) {
    try {
      const res = await fetch(`/api/challenger/meal-history/${targetDate}`);
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "فشل في تحميل وجبات هذا اليوم");
        return;
      }

      setEntries(Array.isArray(data.entries) ? data.entries : []);
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء تحميل وجبات اليوم");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!dateValue) return;
    setLoading(true);
    loadDay(dateValue);
  }, [dateValue]);

  async function deleteEntry(entryId: string) {
    const confirmed = window.confirm("هل تريد حذف هذه الوجبة المسجلة؟");
    if (!confirmed) return;

    setDeletingId(entryId);
    try {
      const res = await fetch(`/api/challenger/meal-history/entry/${entryId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "فشل في حذف الوجبة");
        return;
      }

      await loadDay(dateValue);
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء حذف الوجبة");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: 16 }}>
      <p style={{ marginBottom: 12 }}>
        <a
          href="/challenger/meal-history"
          style={{ color: "#1a73e8", textDecoration: "none", fontWeight: 600 }}
        >
          العودة إلى سجل الوجبات
        </a>
      </p>

      <h1 style={{ fontSize: 30, fontWeight: 700, marginBottom: 16 }}>
        وجبات يوم {formatArabicDate(dateValue)}
      </h1>

      {loading ? (
        <p>جاري التحميل...</p>
      ) : entries.length === 0 ? (
        <p>لا توجد وجبات محفوظة في هذا اليوم.</p>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {entries.map((entry, index) => (
            <div
              key={entry.id}
              style={{
                border: "1px solid #e5e5e5",
                borderRadius: 14,
                padding: 16,
                background: "white",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 8 }}>
                الوجبة {index + 1}
              </div>

              <div style={{ marginBottom: 8, color: "#444" }}>
                <strong>الوقت:</strong> {format24h(entry.created_at)}
              </div>

              {entry.notes ? (
                <div style={{ marginBottom: 12, color: "#8a5a00" }}>
                  <strong>ملاحظة:</strong> {entry.notes}
                </div>
              ) : null}

              <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
                {entry.items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      border: "1px solid #eee",
                      borderRadius: 10,
                      padding: 10,
                      background: "#fafafa",
                    }}
                  >
                    <a
                      href={`/challenger/food/${item.food.id}`}
                      style={{
                        color: "#1a73e8",
                        textDecoration: "none",
                        fontWeight: 700,
                      }}
                    >
                      {item.food.name_ar}
                    </a>
                    <div style={{ marginTop: 4 }}>
                      الكمية: {item.qty_g}غ
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => deleteEntry(entry.id)}
                disabled={deletingId === entry.id}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #dc2626",
                  background: "#fee2e2",
                  color: "#b91c1c",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                {deletingId === entry.id ? "جاري الحذف..." : "حذف الوجبة"}
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
