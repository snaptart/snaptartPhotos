"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import {
  Button,
  Card,
  Pill,
  Select,
  SectionLabel,
  Topbar,
} from "@/components/admin/ui";

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
    const res = await fetch(`/api/form-submissions?id=${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
    }
  }

  const formNames = [...new Set(submissions.map((s) => s.formName))];

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString();
  }
  function renderValue(val: string | string[]) {
    if (Array.isArray(val)) return val.join(", ");
    return val;
  }

  return (
    <div className="-m-8 min-h-[calc(100vh-0px)] bg-admin-bg">
      <Topbar
        title="Submissions"
        subtitle={`${submissions.length} submission${
          submissions.length !== 1 ? "s" : ""
        }${filter ? ` in "${filter}"` : ""}`}
        actions={
          formNames.length > 1 ? (
            <Select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setLoading(true);
              }}
              className="w-auto min-w-[160px]"
            >
              <option value="">All forms</option>
              {formNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          ) : null
        }
      />

      <div className="p-7">
        {loading ? (
          <div className="text-admin-ink-soft">Loading...</div>
        ) : submissions.length === 0 ? (
          <EmptyState
            title="No submissions yet"
            body="Form responses from your public site will appear here."
          />
        ) : (
          <div className="space-y-2">
            {submissions.map((sub) => {
              const isExpanded = expandedId === sub.id;
              const entries = Object.entries(sub.data);
              const preview = entries
                .slice(0, 2)
                .map(([k, v]) => `${k}: ${renderValue(v)}`)
                .join(" · ");

              return (
                <Card padded={false} key={sub.id}>
                  <button
                    onClick={() =>
                      setExpandedId(isExpanded ? null : sub.id)
                    }
                    className="flex w-full items-center justify-between gap-4 px-5 py-3 text-left hover:bg-admin-surface-2 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Pill>{sub.formName}</Pill>
                        <span className="text-[11px] font-mono uppercase tracking-[1.5px] text-admin-ink-soft">
                          {formatDate(sub.submittedAt)}
                        </span>
                      </div>
                      {!isExpanded && (
                        <p className="mt-1 truncate text-[13px] text-admin-ink-soft">
                          {preview}
                          {entries.length > 2 &&
                            ` (+${entries.length - 2} more)`}
                        </p>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-admin-ink-faint shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-admin-ink-faint shrink-0" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="border-t border-admin-border px-5 py-4">
                      <SectionLabel className="mb-3">Form data</SectionLabel>
                      <table className="w-full text-[13px]">
                        <tbody>
                          {entries.map(([key, val]) => (
                            <tr
                              key={key}
                              className="border-b border-admin-border last:border-0"
                            >
                              <td className="py-2 pr-4 font-medium text-admin-ink-soft align-top whitespace-nowrap">
                                {key}
                              </td>
                              <td className="py-2 text-admin-ink whitespace-pre-wrap">
                                {renderValue(val)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {sub.ipAddress && (
                        <p className="mt-3 text-[11px] font-mono text-admin-ink-faint">
                          IP: {sub.ipAddress}
                        </p>
                      )}

                      <div className="mt-4 flex justify-end">
                        <Button
                          kind="danger"
                          size="sm"
                          icon={<Trash2 className="h-3 w-3" />}
                          onClick={() => handleDelete(sub.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="font-serif italic text-[22px] text-admin-ink mb-2">
        {title}
      </div>
      <p className="text-[13px] text-admin-ink-soft max-w-sm">{body}</p>
    </div>
  );
}
