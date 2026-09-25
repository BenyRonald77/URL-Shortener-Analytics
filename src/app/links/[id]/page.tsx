"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Nav } from "@/components/nav";
import { useAuthGuard } from "@/lib/use-auth-guard";

type Analytics = {
  link: { id: string; code: string; longUrl: string; clickCount: number; createdAt: string };
  dailyClicks: { date: string; count: number }[];
  byCountry: { country: string; count: number }[];
  byDevice: { device: string; count: number }[];
  totalClicks: number;
};

const DEVICE_COLORS: Record<string, string> = {
  mobile: "#4f46e5",
  desktop: "#0ea5e9",
  tablet: "#f59e0b",
  bot: "#94a3b8",
  unknown: "#cbd5e1",
};

const deviceLabel: Record<string, string> = {
  mobile: "Mobile",
  desktop: "Desktop",
  tablet: "Tablet",
  bot: "Bot",
  unknown: "Tidak diketahui",
};

function formatDateLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

export default function LinkAnalyticsPage({ params }: { params: { id: string } }) {
  const { me, checking } = useAuthGuard();
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/links/${params.id}/analytics`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    if (me) loadData();
  }, [me, loadData]);

  if (checking) return <p className="p-10 text-center text-slate-500">Memuat...</p>;
  if (!me) return null;
  if (loading || !data) return <p className="p-10 text-center text-slate-500">Memuat analytics...</p>;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Nav />

      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-500">/{data.link.code}</p>
        <h1 className="truncate text-xl font-bold text-brand-700" title={data.link.longUrl}>
          {data.link.longUrl}
        </h1>
        <p className="mt-2 text-3xl font-black text-slate-800">{data.link.clickCount}</p>
        <p className="text-sm text-slate-500">total klik</p>
      </div>

      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-semibold text-slate-800">Tren Klik Harian</h2>
        {data.dailyClicks.length === 0 ? (
          <p className="text-sm text-slate-400">Belum ada data klik.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.dailyClicks} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tickFormatter={formatDateLabel} tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip labelFormatter={formatDateLabel} />
              <Line
                type="monotone"
                dataKey="count"
                name="Klik"
                stroke="#4f46e5"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>

      <div className="grid gap-8 sm:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 font-semibold text-slate-800">Klik per Negara</h2>
          {data.byCountry.length === 0 ? (
            <p className="text-sm text-slate-400">Belum ada data.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.byCountry} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="country" width={40} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" name="Klik" fill="#4f46e5" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 font-semibold text-slate-800">Klik per Perangkat</h2>
          {data.byDevice.length === 0 ? (
            <p className="text-sm text-slate-400">Belum ada data.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={data.byDevice}
                  dataKey="count"
                  nameKey="device"
                  outerRadius={80}
                  label={(entry) => deviceLabel[entry.device] ?? entry.device}
                >
                  {data.byDevice.map((entry) => (
                    <Cell key={entry.device} fill={DEVICE_COLORS[entry.device] ?? "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, _name, item) => [value, deviceLabel[item.payload.device] ?? item.payload.device]} />
                <Legend formatter={(value) => deviceLabel[value] ?? value} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </section>
      </div>
    </main>
  );
}
