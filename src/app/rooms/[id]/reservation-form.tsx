"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function ReservationForm({ roomId, date }: { roomId: number; date: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const body = { ...Object.fromEntries(new FormData(form)), date };

    startTransition(async () => {
      const res = await fetch(`/api/rooms/${roomId}/reservations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setError((await res.json()).error ?? "予約に失敗しました");
        return;
      }
      setError(null);
      form.reset();
      router.refresh();
    });
  }

  const input = "w-full rounded border px-2 py-1";

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border bg-white p-4" aria-label="予約フォーム">
      <h2 className="font-semibold">新規予約 ({date})</h2>
      <label className="block text-sm">
        件名
        <input name="title" required className={input} />
      </label>
      <label className="block text-sm">
        予約者
        <input name="reservedBy" required className={input} />
      </label>
      <div className="flex gap-2">
        <label className="block flex-1 text-sm">
          開始
          <input name="start" type="time" step={900} required defaultValue="10:00" className={input} />
        </label>
        <label className="block flex-1 text-sm">
          終了
          <input name="end" type="time" step={900} required defaultValue="11:00" className={input} />
        </label>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        予約する
      </button>
    </form>
  );
}
