"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Nav } from "@/components/nav";
import { useAuthGuard } from "@/lib/use-auth-guard";

type LinkItem = {
  id: string;
  code: string;
  longUrl: string;
  clickCount: number;
  createdAt: string;
};

export default function DashboardPage() {
  const { me, checking } = useAuthGuard();
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [longUrl, setLongUrl] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [origin, setOrigin] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const loadLinks = useCallback(async () => {
    const res = await fetch("/api/links");
    if (res.ok) setLinks((await res.json()).links);
  }, []);

  useEffect(() => {
    if (me) loadLinks();
  }, [me, loadLinks]);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ longUrl, customSlug: customSlug || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal membuat short link");
        return;
      }
      setLongUrl("");
      setCustomSlug("");
      await loadLinks();
    } catch {
      setError("Terjadi kesalahan jaringan");
    } finally {
      setBusy(false);
    }
  }

  function handleCopy(code: string) {
    navigator.clipboard.writeText(`${origin}/${code}`).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 1500);
    });
  }

  if (checking) return <p className="p-10 text-center text-slate-500">Memuat...</p>;
  if (!me) return null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Nav />

      <h1 className="mb-6 text-2xl font-bold text-brand-700">Short Link Saya</h1>

      <form
        onSubmit={handleSubmit}
        className="mb-8 grid gap-4 rounded-xl border border-slate-200 bg-white p-6 sm:grid-cols-3"
      >
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
          URL Panjang
          <input
            type="url"
            value={longUrl}
            onChange={(event) => setLongUrl(event.target.value)}
            required
            placeholder="https://contoh.com/halaman-panjang"
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Custom Slug (opsional)
          <input
            value={customSlug}
            onChange={(event) => setCustomSlug(event.target.value)}
            placeholder="promo-lebaran"
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        {error && <p className="text-sm text-rose-600 sm:col-span-3">{error}</p>}
        <div className="sm:col-span-3">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? "Membuat..." : "Buat Short Link"}
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">Short Link</th>
              <th className="px-4 py-3">URL Tujuan</th>
              <th className="px-4 py-3">Klik</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {links.map((link) => (
              <tr key={link.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleCopy(link.code)}
                    className="font-medium text-brand-600 hover:underline"
                    title="Klik untuk salin"
                  >
                    {origin ? `${origin.replace(/^https?:\/\//, "")}/${link.code}` : link.code}
                  </button>
                  {copiedCode === link.code && (
                    <span className="ml-2 text-xs text-brand-500">Disalin!</span>
                  )}
                </td>
                <td className="max-w-xs truncate px-4 py-3 text-slate-500" title={link.longUrl}>
                  {link.longUrl}
                </td>
                <td className="px-4 py-3">{link.clickCount}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/links/${link.id}`} className="text-brand-600 hover:underline">
                    Analytics
                  </Link>
                </td>
              </tr>
            ))}
            {links.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  Belum ada link.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
