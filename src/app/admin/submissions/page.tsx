"use client";

import { useEffect, useState, useCallback } from "react";

interface Submission {
  id: string;
  formName: string;
  data: Record<string, string | string[]>;
  ipAddress: string | null;
  submittedAt: string;
}

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchSubmissions = useCallback(async () => {
    const params = filter ? `?formName=${encodeURIComponent(filter)}` : "";
    const res = await fetch(`/api/form-submissions${params}`);
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = await res.json();
    setSubmissions(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this submission?")) return;
    const res = await fetch(`/api/form-submissions?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
    }
  }

  // Get unique form names for the filter
  const formNames = [...new Set(submissions.map((s) => s.formName))];

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString();
  }

  function renderValue(val: string | string[]) {
    if (Array.isArray(val)) return val.join(", ");
    return val;
  }

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="mb-6 font-serif text-2xl">Form Submissions</h1>
        <p className="text-neutral-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl">Form Submissions</h1>
        <span className="text-sm text-neutral-400">
          {submissions.length} submission{submissions.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Filter by form name */}
      {formNames.length > 1 && (
        <div className="mb-4">
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setLoading(true);
            }}
            className="rounded border border-neutral-300 px-3 py-1.5 text-sm"
          >
            <option value="">All forms</option>
            {formNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      )}

      {submissions.length === 0 ? (
        <p className="text-neutral-400">No submissions yet.</p>
      ) : (
        <div className="space-y-3">
          {submissions.map((sub) => {
            const isExpanded = expandedId === sub.id;
            // Show a preview of the first 2 fields
            const entries = Object.entries(sub.data);
            const preview = entries
              .slice(0, 2)
              .map(([k, v]) => `${k}: ${renderValue(v)}`)
              .join(" · ");

            return (
              <div
                key={sub.id}
                className="rounded border border-neutral-200 bg-white"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                        {sub.formName}
                      </span>
                      <span className="text-xs text-neutral-400">
                        {formatDate(sub.submittedAt)}
                      </span>
                    </div>
                    {!isExpanded && (
                      <p className="mt-1 truncate text-sm text-neutral-500">
                        {preview}
                        {entries.length > 2 && ` (+${entries.length - 2} more)`}
                      </p>
                    )}
                  </div>
                  <span className="ml-2 text-neutral-400">
                    {isExpanded ? "▲" : "▼"}
                  </span>
                </button>

                {isExpanded && (
                  <div className="border-t border-neutral-100 px-4 py-3">
                    <table className="w-full text-sm">
                      <tbody>
                        {entries.map(([key, val]) => (
                          <tr key={key} className="border-b border-neutral-50 last:border-0">
                            <td className="py-1.5 pr-4 font-medium text-neutral-600 align-top whitespace-nowrap">
                              {key}
                            </td>
                            <td className="py-1.5 text-neutral-800 whitespace-pre-wrap">
                              {renderValue(val)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {sub.ipAddress && (
                      <p className="mt-2 text-xs text-neutral-400">
                        IP: {sub.ipAddress}
                      </p>
                    )}

                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => handleDelete(sub.id)}
                        className="rounded px-3 py-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
