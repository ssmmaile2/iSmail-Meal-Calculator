"use client";

import React, { useEffect, useState } from "react";

type GroupRow = {
  id: string;
  name_ar: string;
};

export default function ChallengerGroupsPage() {
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadGroups() {
      try {
        const res = await fetch("/api/challenger/groups");
        const data = await res.json();

        if (!res.ok) {
          alert(data.error || "فشل في تحميل المجموعات");
          return;
        }

        setGroups(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error(error);
        alert("حدث خطأ أثناء تحميل المجموعات");
      } finally {
        setLoading(false);
      }
    }

    loadGroups();
  }, []);

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: 16 }}>
      <p style={{ marginBottom: 12 }}>
        <a
          href="/challenger"
          style={{ color: "#1a73e8", textDecoration: "none", fontWeight: 600 }}
        >
          العودة إلى صفحة السيد رشيد
        </a>
      </p>

      <h1 style={{ fontSize: 30, fontWeight: 700, marginBottom: 16 }}>
        المجموعات ذات التقييد
      </h1>

      {loading ? (
        <p>جاري التحميل...</p>
      ) : groups.length === 0 ? (
        <p>لا توجد مجموعات.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {groups.map((group) => (
            <a
              key={group.id}
              href={`/challenger/groups/${group.id}`}
              style={{
                display: "block",
                border: "1px solid #e5e5e5",
                borderRadius: 14,
                padding: 16,
                background: "white",
                textDecoration: "none",
                color: "#111",
                fontWeight: 700,
              }}
            >
              {group.name_ar}
            </a>
          ))}
        </div>
      )}
    </main>
  );
}