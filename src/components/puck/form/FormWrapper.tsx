"use client";

import { useRef, useCallback, useState } from "react";
import { DropZone } from "@puckeditor/core";
import { FormContext } from "./FormContext";

export type FormWrapperProps = {
  formName: string;
  submitLabel: string;
  successMessage: string;
  recipientEmail: string;
};

type FieldEntry = {
  value: string | string[];
  required?: boolean;
  type?: string;
};

export function FormWrapperRender({
  formName,
  submitLabel,
  successMessage,
  recipientEmail,
}: FormWrapperProps) {
  const fieldsRef = useRef<Map<string, FieldEntry>>(new Map());
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const register = useCallback(
    (name: string, value: string | string[], meta?: { required?: boolean; type?: string }) => {
      fieldsRef.current.set(name, { value, required: meta?.required, type: meta?.type });
    },
    []
  );

  const update = useCallback((name: string, value: string | string[]) => {
    const existing = fieldsRef.current.get(name);
    if (existing) {
      existing.value = value;
    } else {
      fieldsRef.current.set(name, { value });
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    const data: Record<string, string | string[]> = {};
    const requiredFields: string[] = [];
    const emailFields: string[] = [];

    fieldsRef.current.forEach((entry, name) => {
      data[name] = entry.value;
      if (entry.required) requiredFields.push(name);
      if (entry.type === "email") emailFields.push(name);
    });

    // Client-side validation
    for (const field of requiredFields) {
      const val = data[field];
      if (!val || (Array.isArray(val) && val.length === 0)) {
        setStatus("error");
        setErrorMsg(`"${field}" is required.`);
        return;
      }
    }

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const field of emailFields) {
      const val = data[field];
      if (val && typeof val === "string" && !emailRe.test(val)) {
        setStatus("error");
        setErrorMsg(`"${field}" must be a valid email address.`);
        return;
      }
    }

    // Get honeypot value
    const hpInput = (e.target as HTMLFormElement).querySelector<HTMLInputElement>(
      'input[name="_hp_field"]'
    );

    try {
      const res = await fetch("/api/form-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formName,
          data,
          _requiredFields: requiredFields,
          _emailFields: emailFields,
          _recipientEmail: recipientEmail || undefined,
          _hp_field: hpInput?.value ?? "",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setStatus("error");
        setErrorMsg(err.error || "Submission failed.");
        return;
      }

      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded border border-green-200 bg-green-50 px-6 py-8 text-center text-green-800">
        {successMessage || "Thank you! Your submission has been received."}
      </div>
    );
  }

  return (
    <FormContext.Provider value={{ register, update }}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Honeypot — hidden from real users */}
        <div style={{ position: "absolute", left: "-9999px" }} aria-hidden="true">
          <input type="text" name="_hp_field" tabIndex={-1} autoComplete="off" />
        </div>

        <DropZone zone="form-fields" />

        {errorMsg && (
          <p className="text-sm text-red-600">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={status === "submitting"}
          className="rounded bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-700 disabled:opacity-50"
        >
          {status === "submitting" ? "Submitting..." : submitLabel || "Submit"}
        </button>
      </form>
    </FormContext.Provider>
  );
}
