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

  renal_group?: string | null;
  renal_reason?: string | null;
  renal_max_per_meal_g?: number | null;
  renal_max_times_per_day?: number | null;
  renal_max_times_per_week?: number | null;
  renal_limit_details?: string | null;

  is_high_potassium?: boolean | null;
  is_high_phosphorus?: boolean | null;
  is_dense_protein?: boolean | null;
  is_high_sodium?: boolean | null;
  renal_shared_load_score?: number | null;
  renal_combo_warning?: boolean | null;
  renal_combo_notes?: string | null;
};

type MealItem = {
  id: string;
  qty_g: number;
  foods: Food | null;
};

type Rule = {
  id: string;
  source_food_id?: string | null;
  source_group_id?: string | null;
  target_food_id?: string | null;
  target_group_id?: string | null;
  rule_type: string;
  target_limit_g?: number | null;
  notes?: string | null;
};

type Group = {
  id: string;
  code: string;
  name_ar: string;
};

type Membership = {
  food_id: string;
  group_id: string;
};

type FoodName = {
  id: string;
  name_ar: string;
};

type MealRiskAnalysis = {
  totalSharedLoad: number;
  hasHighPotassium: boolean;
  hasHighPhosphorus: boolean;
  hasDenseProtein: boolean;
  hasHighSodium: boolean;
  redAlert: boolean;
  orangeAlert: boolean;
  riskFoods: string[];
  messages: string[];
};

export default function ChallengerPage() {
  const [mealId, setMealId] = useState<string | null>(null);
  const [items, setItems] = useState<MealItem[]>([]);
  const [query, setQuery] = useState("");
  const [qty, setQty] = useState<number | "">(100);
  const [suggestions, setSuggestions] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const [rules, setRules] = useState<Rule[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [foodNames, setFoodNames] = useState<FoodName[]>([]);

  useEffect(() => {
    async function createMeal() {
      try {
        const res = await fetch("/api/meals", { method: "POST" });
        const meal = await res.json();

        if (!res.ok) {
          console.error("Create meal failed:", meal);
          alert(meal.error || "فشل في إنشاء الوجبة");
          setLoading(false);
          return;
        }

        setMealId(meal.id);
        await refreshMeal(meal.id);
      } catch (error) {
        console.error("createMeal error:", error);
        alert("حدث خطأ أثناء إنشاء الوجبة");
      } finally {
        setLoading(false);
      }
    }

    async function loadRules() {
      try {
        const res = await fetch("/api/challenger/rules");
        const data = await res.json();

        if (!res.ok) {
          console.error("Rules API failed:", data);
          alert(data.error || "فشل في تحميل قواعد المتحدي");
          return;
        }

        setRules(Array.isArray(data.rules) ? data.rules : []);
        setGroups(Array.isArray(data.groups) ? data.groups : []);
        setMemberships(Array.isArray(data.memberships) ? data.memberships : []);
        setFoodNames(Array.isArray(data.foods) ? data.foods : []);

        console.log("Loaded rules:", data.rules);
      } catch (error) {
        console.error("loadRules error:", error);
      }
    }

    createMeal();
    loadRules();
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

  async function refreshMeal(id: string) {
    try {
      const res = await fetch(`/api/meals/${id}`);
      const data = await res.json();

      if (!res.ok) {
        console.error("GET /meal failed:", data);
        alert(data.error || "فشل في تحميل الوجبة");
        return;
      }

      console.log("Loaded items:", data.items);
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      console.error("refreshMeal error:", error);
      alert("حدث خطأ أثناء تحميل الوجبة");
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

  const mealRisk = useMemo<MealRiskAnalysis>(() => {
    const validFoods = items
      .map((item) => item.foods)
      .filter((food): food is Food => !!food);

    const totalSharedLoad = validFoods.reduce(
      (sum, food) => sum + Number(food.renal_shared_load_score || 0),
      0
    );

    const highPotassiumFoods = validFoods.filter((f) => !!f.is_high_potassium);
    const highPhosphorusFoods = validFoods.filter((f) => !!f.is_high_phosphorus);
    const denseProteinFoods = validFoods.filter((f) => !!f.is_dense_protein);
    const highSodiumFoods = validFoods.filter((f) => !!f.is_high_sodium);

    const hasHighPotassium = highPotassiumFoods.length > 0;
    const hasHighPhosphorus = highPhosphorusFoods.length > 0;
    const hasDenseProtein = denseProteinFoods.length > 0;
    const hasHighSodium = highSodiumFoods.length > 0;

    const redAlert =
      hasHighSodium ||
      (hasHighPotassium && hasHighPhosphorus && hasDenseProtein);

    const orangeAlert =
      !redAlert &&
      (totalSharedLoad >= 4 ||
        (hasHighPotassium && hasHighPhosphorus) ||
        (hasHighPotassium && hasDenseProtein) ||
        (hasHighPhosphorus && hasDenseProtein));

    const riskFoods = Array.from(
      new Set([
        ...highPotassiumFoods.map((f) => f.name_ar),
        ...highPhosphorusFoods.map((f) => f.name_ar),
        ...denseProteinFoods.map((f) => f.name_ar),
        ...highSodiumFoods.map((f) => f.name_ar),
      ])
    );

    const messages: string[] = [];

    if (hasHighSodium) {
      messages.push("الوجبة تحتوي عنصرًا مرتفع الصوديوم، وهذا غير مناسب كلويًا.");
    }

    if (hasHighPotassium && hasHighPhosphorus && hasDenseProtein) {
      messages.push(
        "الوجبة تجمع بين عنصر مرتفع البوتاسيوم وعنصر مرتفع الفوسفور وبروتين مركز، وهذه حمولة مشتركة عالية."
      );
    } else {
      if (hasHighPotassium && hasHighPhosphorus) {
        messages.push("الوجبة تجمع بين عنصر مرتفع البوتاسيوم وعنصر مرتفع الفوسفور.");
      }
      if (hasHighPotassium && hasDenseProtein) {
        messages.push("الوجبة تجمع بين عنصر مرتفع البوتاسيوم وبروتين مركز.");
      }
      if (hasHighPhosphorus && hasDenseProtein) {
        messages.push("الوجبة تجمع بين عنصر مرتفع الفوسفور وبروتين مركز.");
      }
    }

    if (!redAlert && totalSharedLoad >= 4) {
      messages.push("الحمولة المشتركة للوجبة مرتفعة نسبيًا حتى دون بلوغ أعلى مستوى تحذير.");
    }

    return {
      totalSharedLoad,
      hasHighPotassium,
      hasHighPhosphorus,
      hasDenseProtein,
      hasHighSodium,
      redAlert,
      orangeAlert,
      riskFoods,
      messages,
    };
  }, [items]);

  const violationsByItem = useMemo(() => {
    const result: Record<string, string[]> = {};

    const foodNameMap = Object.fromEntries(foodNames.map((f) => [f.id, f.name_ar]));
    const groupNameMap = Object.fromEntries(groups.map((g) => [g.id, g.name_ar]));

    const groupIdsByFood: Record<string, string[]> = {};
    for (const m of memberships) {
      if (!groupIdsByFood[m.food_id]) groupIdsByFood[m.food_id] = [];
      groupIdsByFood[m.food_id].push(m.group_id);
    }

    const itemsWithFood = items.filter(
      (item): item is MealItem & { foods: Food } => !!item.foods
    );

    function addViolation(itemId: string, message: string) {
      if (!result[itemId]) result[itemId] = [];
      if (!result[itemId].includes(message)) result[itemId].push(message);
    }

    for (const item of itemsWithFood) {
      const food = item.foods;

      if (food.renal_group === "forbidden") {
        addViolation(item.id, "هذا العنصر محظور على المتحدي.");
      }

      if (
        food.renal_max_per_meal_g &&
        item.qty_g > Number(food.renal_max_per_meal_g)
      ) {
        addViolation(
          item.id,
          `تم تجاوز الحد المسموح لكل وجبة: ${food.renal_max_per_meal_g}غ`
        );
      }

      const ownGroupIds = groupIdsByFood[food.id] || [];
      const otherItems = itemsWithFood.filter((x) => x.id !== item.id);

      for (const rule of rules) {
        const sourceMatchesFood = rule.source_food_id === food.id;
        const sourceMatchesGroup =
          !!rule.source_group_id && ownGroupIds.includes(rule.source_group_id);

        if (!sourceMatchesFood && !sourceMatchesGroup) continue;

        if (rule.rule_type === "forbid_same_day" || rule.rule_type === "forbid_same_meal") {
          if (rule.target_food_id) {
            const exists = otherItems.some((x) => x.foods.id === rule.target_food_id);
            if (exists) {
              const targetName = foodNameMap[rule.target_food_id] || "عنصر آخر";
              addViolation(item.id, `لا ينبغي جمع هذا العنصر مع: ${targetName}`);
            }
          }

          if (rule.target_group_id) {
            const exists = otherItems.some((x) =>
              (groupIdsByFood[x.foods.id] || []).includes(rule.target_group_id!)
            );
            if (exists) {
              const targetGroup = groupNameMap[rule.target_group_id] || "مجموعة أخرى";
              addViolation(
                item.id,
                `لا ينبغي جمع هذا العنصر مع عناصر من مجموعة: ${targetGroup}`
              );
            }
          }
        }

        if (rule.rule_type === "allow_only_one_from_target_group_per_day") {
          if (rule.target_group_id) {
            const sameGroupItems = itemsWithFood.filter((x) =>
              (groupIdsByFood[x.foods.id] || []).includes(rule.target_group_id!)
            );

            if (sameGroupItems.length > 1) {
              if ((groupIdsByFood[food.id] || []).includes(rule.target_group_id)) {
                const groupName = groupNameMap[rule.target_group_id] || "هذه المجموعة";
                addViolation(
                  item.id,
                  `يُسمح بعنصر واحد فقط يوميًا من مجموعة: ${groupName}`
                );
              }
            }
          }
        }
      }

      for (const rule of rules) {
        const targetIsCurrentFood = rule.target_food_id === food.id;
        const targetIsCurrentGroup =
          !!rule.target_group_id && ownGroupIds.includes(rule.target_group_id);

        if (!targetIsCurrentFood && !targetIsCurrentGroup) continue;

        let sourceExists = false;
        let sourceName = "";

        if (rule.source_food_id) {
          sourceExists = otherItems.some((x) => x.foods.id === rule.source_food_id);
          sourceName = foodNameMap[rule.source_food_id] || "عنصر آخر";
        } else if (rule.source_group_id) {
          sourceExists = otherItems.some((x) =>
            (groupIdsByFood[x.foods.id] || []).includes(rule.source_group_id!)
          );
          sourceName = groupNameMap[rule.source_group_id] || "مجموعة أخرى";
        }

        if (!sourceExists) continue;

        if (rule.rule_type === "forbid_same_day" || rule.rule_type === "forbid_same_meal") {
          addViolation(item.id, `هذا العنصر لا ينبغي أن يجتمع مع: ${sourceName}`);
        }

        if (rule.rule_type === "reduce_target_limit_same_day") {
          if (rule.target_limit_g && item.qty_g > Number(rule.target_limit_g)) {
            addViolation(
              item.id,
              `بسبب وجود ${sourceName} تم خفض الحد المسموح لهذا العنصر إلى ${rule.target_limit_g}غ`
            );
          }
        }
      }
    }

    return result;
  }, [items, rules, memberships, groups, foodNames]);

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

      await refreshMeal(mealId);
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
    } catch (error) {
      console.error("deleteItem error:", error);
      alert("حدث خطأ أثناء حذف العنصر");
    }
  }

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
        حاسبة المُتحدي
      </h1>

      <p style={{ marginBottom: 16, color: "#555" }}>
        هذه الواجهة خاصة بالمُتحدي، وتراعي التقييدات الكلوية والحمولة المشتركة.
      </p>

      <p style={{ marginBottom: 16 }}>
        <a
          href="/renal"
          style={{ color: "#1a73e8", textDecoration: "none", fontWeight: 600 }}
        >
          الدليل الكلوي
        </a>
        {" — "}
        <a
          href="/restricted"
          style={{ color: "#b26a00", textDecoration: "none", fontWeight: 600 }}
        >
          عناصر مسموحة بقيود
        </a>
      </p>

      {(mealRisk.redAlert || mealRisk.orangeAlert) && (
        <div
          style={{
            marginBottom: 18,
            padding: 14,
            borderRadius: 12,
            border: mealRisk.redAlert
              ? "1px solid #f3b8b2"
              : "1px solid #f5d48a",
            background: mealRisk.redAlert ? "#fdecea" : "#fff7e0",
            color: mealRisk.redAlert ? "#b42318" : "#8a5a00",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>
            {mealRisk.redAlert ? "تحذير كلوي مرتفع" : "تنبيه كلوي"}
          </div>

          <div style={{ marginBottom: 8 }}>
            نقاط الحمولة المشتركة الحالية: <strong>{mealRisk.totalSharedLoad}</strong>
          </div>

          {mealRisk.riskFoods.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              العناصر المساهمة: <strong>{mealRisk.riskFoods.join("، ")}</strong>
            </div>
          )}

          <ul style={{ margin: 0, paddingInlineStart: 20 }}>
            {mealRisk.messages.map((msg, idx) => (
              <li key={idx} style={{ marginBottom: 4 }}>
                {msg}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gap: 12,
          marginBottom: 20,
          padding: 16,
          border: "1px solid #e5e5e5",
          borderRadius: 12,
          background: "#fafafa",
        }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث: أفوكادو / سردين / لوبيا / لبنة / بطاطس"
          style={inputStyle}
        />

        <input
          type="number"
          value={qty}
          onChange={(e) =>
            setQty(e.target.value === "" ? "" : Number(e.target.value))
          }
          placeholder="الكمية بالغرام"
          style={inputStyle}
        />

        {suggestions.length > 0 && (
          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 10,
              overflow: "hidden",
              background: "white",
            }}
          >
            {suggestions.map((food) => (
              <button
                key={food.id}
                onClick={() => addItem(food)}
                disabled={adding}
                style={{
                  width: "100%",
                  padding: 12,
                  border: "none",
                  borderBottom: "1px solid #eee",
                  textAlign: "right",
                  cursor: "pointer",
                  background: "white",
                }}
              >
                <div style={{ fontWeight: 600 }}>{food.name_ar}</div>
                <div style={{ fontSize: 12, color: "#666" }}>
                  {food.notes || ""}
                  {food.default_qty_g ? ` — وزن افتراضي: ${food.default_qty_g}غ` : ""}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <p>جاري التحميل...</p>
      ) : (
        <div
          style={{
            overflowX: "auto",
            border: "1px solid #e5e5e5",
            borderRadius: 12,
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 1150,
            }}
          >
            <thead>
              <tr style={{ background: "#f7f7f7" }}>
                <th style={thStyle}>المكوّن</th>
                <th style={thStyle}>الكمية (غ)</th>
                <th style={thStyle}>السعرات</th>
                <th style={thStyle}>البروتين</th>
                <th style={thStyle}>الدهون</th>
                <th style={thStyle}>الألياف</th>
                <th style={thStyle}>الكارب الصافي</th>
                <th style={thStyle}>التصنيف الكلوي</th>
                <th style={thStyle}>الحد لكل وجبة</th>
                <th style={thStyle}>حذف</th>
              </tr>
            </thead>

            <tbody>
              {items.map((item) => {
                if (!item.foods) {
                  return (
                    <tr key={item.id}>
                      <td style={tdStyle}>عنصر غير موجود</td>
                      <td style={tdStyle}>{item.qty_g}</td>
                      <td style={tdStyle}>-</td>
                      <td style={tdStyle}>-</td>
                      <td style={tdStyle}>-</td>
                      <td style={tdStyle}>-</td>
                      <td style={tdStyle}>-</td>
                      <td style={tdStyle}>-</td>
                      <td style={tdStyle}>-</td>
                      <td style={tdStyle}>
                        <button onClick={() => deleteItem(item.id)} style={deleteButtonStyle}>
                          حذف
                        </button>
                      </td>
                    </tr>
                  );
                }

                const row = calcRow(item.foods, item.qty_g);
                const violations = violationsByItem[item.id] || [];

                return (
                  <tr key={item.id}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600 }}>{item.foods.name_ar}</div>
                      <div style={{ fontSize: 12, color: "#666" }}>
                        {item.foods.notes || ""}
                      </div>

                      {item.foods.renal_limit_details ? (
                        <div style={{ fontSize: 12, color: "#8a5a00", marginTop: 4 }}>
                          {item.foods.renal_limit_details}
                        </div>
                      ) : null}

                      {violations.length > 0 && (
                        <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                          {violations.map((msg, idx) => (
                            <div
                              key={idx}
                              style={{
                                color: "#b42318",
                                background: "#fdecea",
                                border: "1px solid #f3b8b2",
                                borderRadius: 8,
                                padding: "6px 8px",
                                fontSize: 12,
                                lineHeight: 1.5,
                              }}
                            >
                              {msg}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>

                    <td style={tdStyle}>
                      <input
                        type="number"
                        value={item.qty_g}
                        onChange={(e) => updateQty(item.id, Number(e.target.value))}
                        style={{
                          width: 90,
                          padding: 8,
                          border: "1px solid #ddd",
                          borderRadius: 8,
                        }}
                      />
                    </td>

                    <td style={tdStyle}>{row.kcal.toFixed(1)}</td>
                    <td style={tdStyle}>{row.protein.toFixed(1)}</td>
                    <td style={tdStyle}>{row.fat.toFixed(1)}</td>
                    <td style={tdStyle}>{row.fiber.toFixed(1)}</td>
                    <td style={tdStyle}>{row.netCarb.toFixed(1)}</td>

                    <td style={tdStyle}>
                      <RenalBadge food={item.foods} />
                    </td>

                    <td style={tdStyle}>
                      {item.foods.renal_max_per_meal_g
                        ? `${item.foods.renal_max_per_meal_g}غ`
                        : "—"}
                    </td>

                    <td style={tdStyle}>
                      <button onClick={() => deleteItem(item.id)} style={deleteButtonStyle}>
                        حذف
                      </button>
                    </td>
                  </tr>
                );
              })}

              <tr style={{ background: "#fafafa", fontWeight: 700 }}>
                <td style={tdStyle}>المجموع</td>
                <td style={tdStyle}></td>
                <td style={tdStyle}>{totals.kcal.toFixed(1)}</td>
                <td style={tdStyle}>{totals.protein.toFixed(1)}</td>
                <td style={tdStyle}>{totals.fat.toFixed(1)}</td>
                <td style={tdStyle}>{totals.fiber.toFixed(1)}</td>
                <td style={tdStyle}>{totals.netCarb.toFixed(1)}</td>
                <td style={tdStyle}></td>
                <td style={tdStyle}></td>
                <td style={tdStyle}></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function RenalBadge({ food }: { food: Food }) {
  let label = "غير مصنف";
  let style: React.CSSProperties = {
    background: "#f4f4f4",
    color: "#555",
    border: "1px solid #ddd",
  };

  if (food.renal_group === "excellent") {
    label = "ممتازة";
    style = {
      background: "#e8f5e9",
      color: "#0f9d58",
      border: "1px solid #b7dfc2",
    };
  } else if (food.renal_group === "allowed") {
    label = "مسموحة";
    style = {
      background: "#e8f0fe",
      color: "#1a73e8",
      border: "1px solid #bfd3fb",
    };
  } else if (food.renal_group === "restricted") {
    label = "بقيود";
    style = {
      background: "#fff7e0",
      color: "#b26a00",
      border: "1px solid #f5d48a",
    };
  } else if (food.renal_group === "forbidden") {
    label = "محظورة";
    style = {
      background: "#fdecea",
      color: "#d93025",
      border: "1px solid #f3b8b2",
    };
  }

  return (
    <span
      title={food.renal_combo_notes || food.renal_reason || ""}
      style={{
        ...style,
        padding: "6px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

const inputStyle: React.CSSProperties = {
  padding: 12,
  border: "1px solid #ddd",
  borderRadius: 10,
  fontSize: 14,
};

const thStyle: React.CSSProperties = {
  textAlign: "right",
  padding: 12,
  borderBottom: "1px solid #ddd",
  fontSize: 14,
};

const tdStyle: React.CSSProperties = {
  textAlign: "right",
  padding: 12,
  borderBottom: "1px solid #eee",
  fontSize: 14,
  verticalAlign: "top",
};

const deleteButtonStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #ddd",
  background: "white",
  cursor: "pointer",
};