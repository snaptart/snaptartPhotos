"use client";

import type { ReactNode } from "react";
import { useFormField } from "@/lib/hooks/useFormField";
import { textStyleCss } from "@/lib/theme/text-style-value";
import { useFormContext } from "./FormContext";
import { Editable } from "@/components/puck/inline/Editable";

// ---------- Shared look ----------

// Colours and corners come from CSS vars the Form sets; the fallbacks are the
// look fields had before, for one dropped outside any Form.
const BOX =
  "w-full rounded-[var(--form-radius,4px)] border border-[color:var(--form-border,#d4d4d4)] bg-[color:var(--form-bg,#ffffff)] px-3 py-2 outline-none transition-colors placeholder:text-[color:var(--form-placeholder,darkgray)] focus:border-[color:var(--form-focus,#737373)] focus:ring-1 focus:ring-[color:var(--form-focus,#737373)]";
const UNDERLINE =
  "w-full rounded-none border-0 border-b border-[color:var(--form-border,#d4d4d4)] bg-[color:var(--form-bg,transparent)] px-0 py-2 outline-none transition-colors placeholder:text-[color:var(--form-placeholder,darkgray)] focus:border-[color:var(--form-focus,#737373)]";
const CHOICE = "accent-[color:var(--form-focus,#171717)]";

/** Class and text style for an input, textarea or select in this form. */
function useInputLook() {
  const form = useFormContext();
  return {
    className: form?.fieldLook === "underline" ? UNDERLINE : BOX,
    style: textStyleCss(form?.fieldTextStyle, "body"),
  };
}

/** The text beside a radio button or checkbox. */
function useOptionText() {
  const form = useFormContext();
  return textStyleCss(form?.fieldTextStyle, "body");
}

// ---------- Width ----------

/** A field takes the form's whole row, or half of it beside another half field. */
export type FieldWidth = "full" | "half";

/**
 * The field's cell in the Form's grid. It carries Puck's drag handle, so in the
 * editor the field itself (not a wrapper Puck adds) is the grid item. Half
 * fields pair up once the form is 512px wide; below that every field is full.
 */
export function FormFieldCell({
  width,
  dragRef,
  children,
}: {
  width?: FieldWidth;
  dragRef?: ((el: Element | null) => void) | null;
  children: ReactNode;
}) {
  return (
    <div ref={dragRef ?? undefined} className={width === "half" ? "min-w-0" : "min-w-0 @min-[32rem]:col-span-2"}>
      {children}
    </div>
  );
}

// ---------- Shared label ----------

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  const form = useFormContext();
  return (
    <label className="mb-1 block" style={textStyleCss(form?.labelStyle, "label")}>
      <Editable path="label" value={label} placeholder="Label" />
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}

// ---------- TextField ----------

export type TextFieldProps = {
  label: string;
  name: string;
  placeholder: string;
  required: boolean;
  fieldType: "text" | "email" | "tel" | "url";
  width?: FieldWidth;
};

export function TextFieldRender({ label, name, placeholder, required, fieldType }: TextFieldProps) {
  const { value, update } = useFormField(name, "", { required, type: fieldType });
  const look = useInputLook();

  return (
    <div className="py-2">
      <FieldLabel label={label} required={required} />
      <input
        type={fieldType}
        name={name}
        placeholder={placeholder}
        required={required}
        value={value as string}
        onChange={(e) => update(e.target.value)}
        className={look.className}
        style={look.style}
      />
    </div>
  );
}

// ---------- TextArea ----------

export type TextAreaProps = {
  label: string;
  name: string;
  placeholder: string;
  required: boolean;
  rows: number;
  width?: FieldWidth;
};

export function TextAreaRender({ label, name, placeholder, required, rows }: TextAreaProps) {
  const { value, update } = useFormField(name, "", { required });
  const look = useInputLook();

  return (
    <div className="py-2">
      <FieldLabel label={label} required={required} />
      <textarea
        name={name}
        placeholder={placeholder}
        required={required}
        rows={rows}
        value={value as string}
        onChange={(e) => update(e.target.value)}
        className={look.className + " resize-y"}
        style={look.style}
      />
    </div>
  );
}

// ---------- Select ----------

export type SelectFieldProps = {
  label: string;
  name: string;
  required: boolean;
  options: string;
  width?: FieldWidth;
};

export function SelectFieldRender({ label, name, required, options }: SelectFieldProps) {
  const { value, update } = useFormField(name, "", { required });
  const look = useInputLook();

  const optList = options
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="py-2">
      <FieldLabel label={label} required={required} />
      <select
        name={name}
        required={required}
        value={value as string}
        onChange={(e) => update(e.target.value)}
        className={look.className}
        style={look.style}
      >
        <option value="">Select...</option>
        {optList.map((opt) => {
          const [val, lbl] = opt.includes("|") ? opt.split("|", 2) : [opt, opt];
          return (
            <option key={val} value={val}>
              {lbl}
            </option>
          );
        })}
      </select>
    </div>
  );
}

// ---------- RadioGroup ----------

export type RadioGroupProps = {
  label: string;
  name: string;
  required: boolean;
  options: string;
  width?: FieldWidth;
};

export function RadioGroupRender({ label, name, required, options }: RadioGroupProps) {
  const { value, update } = useFormField(name, "", { required });
  const optionText = useOptionText();

  const optList = options
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <fieldset className="py-2">
      <FieldLabel label={label} required={required} />
      <div className="mt-1 space-y-1">
        {optList.map((opt) => {
          const [val, lbl] = opt.includes("|") ? opt.split("|", 2) : [opt, opt];
          return (
            <label key={val} className="flex items-center gap-2" style={optionText}>
              <input
                type="radio"
                name={name}
                value={val}
                required={required}
                checked={value === val}
                onChange={() => update(val)}
                className={CHOICE}
              />
              {lbl}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

// ---------- CheckboxGroup ----------

export type CheckboxGroupProps = {
  label: string;
  name: string;
  options: string;
  width?: FieldWidth;
};

export function CheckboxGroupRender({ label, name, options }: CheckboxGroupProps) {
  const { value, update } = useFormField(name, [] as string[]);

  const optionText = useOptionText();
  const selected = value as string[];
  const optList = options
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  function toggle(val: string) {
    const next = selected.includes(val)
      ? selected.filter((s) => s !== val)
      : [...selected, val];
    update(next);
  }

  return (
    <fieldset className="py-2">
      <FieldLabel label={label} />
      <div className="mt-1 space-y-1">
        {optList.map((opt) => {
          const [val, lbl] = opt.includes("|") ? opt.split("|", 2) : [opt, opt];
          return (
            <label key={val} className="flex items-center gap-2" style={optionText}>
              <input
                type="checkbox"
                name={name}
                value={val}
                checked={selected.includes(val)}
                onChange={() => toggle(val)}
                className={CHOICE}
              />
              {lbl}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

// ---------- Single Checkbox ----------

export type CheckboxProps = {
  label: string;
  name: string;
  width?: FieldWidth;
};

export function CheckboxRender({ label, name }: CheckboxProps) {
  const { value, update } = useFormField(name, "false");
  const optionText = useOptionText();

  return (
    <label className="flex items-center gap-2 py-2" style={optionText}>
      <input
        type="checkbox"
        name={name}
        checked={value === "true"}
        onChange={(e) => update(e.target.checked ? "true" : "false")}
        className={CHOICE}
      />
      <Editable path="label" value={label} placeholder="Label" />
    </label>
  );
}
