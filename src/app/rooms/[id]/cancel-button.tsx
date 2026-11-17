"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function CancelButton({ id, title }: { id: number; title: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-label={`${title} を取り消す`}
      disabled={pending}
      className="text-xs text-red-600 hover:underline disabled:opacity-50"
      onClick={() =>
        startTransition(async () => {
          await fetch(`/api/reservations/${id}`, { method: "DELETE" });
          router.refresh();
        })
      }
    >
      取消
    </button>
  );
}
