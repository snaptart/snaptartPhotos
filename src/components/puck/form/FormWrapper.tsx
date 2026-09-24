"use client";

import { useRef, useCallback, useState, type CSSProperties } from "react";
import { DropZone } from "@puckeditor/core";
import { FormContext } from "./FormContext";
import { Editable } from "@/components/puck/inline/Editable";
import { textStyleCss, type TextStyleValue } from "@/lib/theme/text-style-value";
import { cssColor } from "@/lib/theme/color";

export type FieldLook = "box" | "underline";

/**
 * Everything about how a form looks is set once, on the Form block, so every
 * field in it matches. The fields read it through FormContext and CSS vars.
 */
export type FormWrapperProps = {
  formName: string;
  submitLabel: string;
  successMessage: string;
  recipientEmail: string;
  /** How every field label inside this form is set. */
  labelStyle?: TextStyleValue;
  /** What visitors type, and the text beside radio buttons and checkboxes. */
  fieldTextStyle?: TextStyleValue;
  /** Blank leaves the browser's own placeholder grey. */
  placeholderColor?: string;
  fieldLook?: FieldLook;
  fieldBorderColor?: string;
  fieldBackground?: string;
  fieldRadius?: number;
  submitTextStyle?: TextStyleValue;
  submitBgColor?: string;
  submitTextColor?: string;
  submitHoverBgColor?: string;
  submitRadius?: number;
  /** A recessed panel behind the whole form, as on the Contact board. */
  panel?: boolean;
  panelColor?: string;
  panelPadding?: number;
  panelRadius?: number;
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
  labelStyle,
  fieldTextStyle,
  placeholderColor,
  fieldLook,
  fieldBorderColor,
  fieldBackground,
  fieldRadius,
  submitTextStyle,
  submitBgColor,
  submitTextColor,
  submitHoverBgColor,
  submitRadius,
  panel,
  panelColor,
  panelPadding,
  panelRadius,
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

  // The fields' fallbacks (in fields.tsx) are the look forms had before these
  // settings, for a field dropped outside any Form.
  const formVars = {
    "--form-border": cssColor(fieldBorderColor, "#d4d4d4"),
    "--form-bg": cssColor(fieldBackground, "#ffffff"),
    "--form-radius": `${fieldRadius ?? 4}px`,
    "--form-placeholder": placeholderColor ? cssColor(placeholderColor) : undefined,
    "--form-focus": "var(--theme-color-text, #171717)",
  } as CSSProperties;

  const submitCss = {
    ...textStyleCss(submitTextStyle, "label", { withColor: false }),
    color: cssColor(submitTextColor, "#ffffff"),
    borderRadius: `${submitRadius ?? 4}px`,
    "--form-submit-bg": cssColor(submitBgColor, "#171717"),
    "--form-submit-hover": cssColor(submitHoverBgColor, "#404040"),
  } as CSSProperties;

  // The panel's padding eases off on small screens so the fields keep their width.
  const panelCss: CSSProperties = panel
    ? {
        background: cssColor(panelColor, "var(--theme-color-surface, #f2efe9)"),
        padding: `min(${panelPadding ?? 48}px, 7vw)`,
        borderRadius: panelRadius ?? 0,
      }
    : {};

  return (
    <FormContext.Provider value={{ register, update, labelStyle, fieldTextStyle, fieldLook }}>
      <form onSubmit={handleSubmit} className="@container space-y-4" style={{ ...formVars, ...panelCss }}>
        {/* Honeypot — hidden from real users */}
        <div style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0, overflow: "hidden" }} aria-hidden="true">
          <label>
            Do not fill this in
            <input type="text" name="_sa_p" tabIndex={-1} autoComplete="nope" />
          </label>
        </div>

        {/* Half-width fields pair up once the form is 512px wide. */}
        <DropZone zone="form-fields" className="grid grid-cols-1 gap-x-6 @min-[32rem]:grid-cols-2" />

        {errorMsg && (
          <p className="text-sm text-red-600">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={status === "submitting"}
          className="bg-[color:var(--form-submit-bg)] px-6 py-2.5 transition-colors hover:bg-[color:var(--form-submit-hover)] disabled:opacity-50"
          style={submitCss}
        >
          {status === "submitting" ? "Submitting..." : <Editable path="submitLabel" value={submitLabel} fallback="Submit" />}
        </button>
      </form>
    </FormContext.Provider>
  );
}
