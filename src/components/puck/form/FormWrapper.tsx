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
      'input[name="_sa_p"]'
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
          _sa_p: hpInput?.value ?? "",
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
      <div className="alert-success px-6 py-8 text-center">
        {successMessage || "Thank you! Your submission has been received."}
      </div>
    );
  }

  return (
    <FormContext.Provider value={{ register, update }}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Honeypot — hidden from real users */}
        <div style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0, overflow: "hidden" }} aria-hidden="true">
          <label>
            Do not fill this in
            <input type="text" name="_sa_p" tabIndex={-1} autoComplete="nope" />
          </label>
        </div>

        <DropZone zone="form-fields" />

        {errorMsg && (
          <p className="text-sm text-red-600">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={status === "submitting"}
          className="btn-primary px-6 py-2.5"
        >
          {status === "submitting" ? "Submitting..." : submitLabel || "Submit"}
        </button>
      </form>
    </FormContext.Provider>
  );
}
