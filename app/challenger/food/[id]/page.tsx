"use client";

import React, { useEffect, useMemo, useState } from "react";

type FoodDetails = {
  id: string;
  name_ar: string;
  aliases?: string[];
  notes?: string;
  renal_group?: string;
  renal_reason?: string;
  renal_max_per_meal_g?: number | null;
  renal_max_times_per_day?: number | null;
  renal_max_times_per_week?: number | null;
  renal_limit_details?: string | null;
  renal_min_gap_days?: number | null;
  renal_max_uses_per_7d?: number | null;
};

type LogRow = {
  id: string;
  consumed_at: string;
  qty_g: number;
  notes?: string | null;
  created_at: string;
};

type Interaction = {
  id: string;
  rule_type: string;
  target_limit_g?: number | null;
  notes?: string | null;
  related: string;
};

type StatusInfo = {
  latest_consumed_at: string | null;
  uses_today: number;
  uses_last_7d: number;
  days_since_last_use: number | null;
  blocked_by_gap: boolean;
  blocked_by_day: boolean;
  blocked_by_7d: boolean;
  can_consume_now: boolean;
};

export default function FoodDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [foodId, setFoodId] = useState<string>("");
  const [food, setFood] = useState<FoodDetails | null>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [status, setStatus] = useState<StatusInfo | null>(null);

  const [qty, setQty] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const p = await params;
      setFoodId(p.id);
    }
    init();
  }, [params]);

  async function loadData(id: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/challenger/foods/${id}`);
      const data