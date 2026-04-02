"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StoryPasswordForm({
  slug,
  title,
}: {
  slug: string;
  title: string;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/stories/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, password }),
    });

    if (res.ok) {
      router.refresh();
    } else {
      setError("Incorrect password");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24">
      <h1
        className="mb-4 text-center text-3xl font-semibold tracking-tight"
        style={{ fontFamily: "var(--theme-font-headings)" }}
      >
        {title}
      </h1>
      <p className="mb-8 text-center text-neutral-500">
        This story is password protected.
      </p>
      <form onSubmit={handleSubmit} className="w-full space-y-4">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          required
          autoFocus
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-center focus:border-neutral-500 focus:outline-none"
        />
        {error && <p className="text-center text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-neutral-900 px-4 py-3 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {loading ? "Checking..." : "Read Story"}
        </button>
      </form>
    </div>
  );
}
