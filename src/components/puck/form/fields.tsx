"use client";

import { useFormField } from "@/lib/hooks/useFormField";

// ---------- Shared label ----------

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className="mb-1 block font-medium text-neutral-700">
      {label}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}

const inputClasses =
  "w-full rounded border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none transition-colors focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500";

// ---------- TextField ----------

export type TextFieldProps = {
  label: string;
  name: string;
  placeholder: string;
  required: boolean;
  fieldType: "text" | "email" | "tel" | "url";
};

export function TextFieldRender({ label, name, placeholder, required, fieldType }: TextFieldProps) {
  const { value, update } = useFormField(name, "", { required, type: fieldType });

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
        className={inputClasses}
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
};

export function TextAreaRender({ label, name, placeholder, required, rows }: TextAreaProps) {
  const { value, update } = useFormField(name, "", { required });

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
        className={inputClasses + " resize-y"}
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
};

export function SelectFieldRender({ label, name, required, options }: SelectFieldProps) {
  const { value, update } = useFormField(name, "", { required });

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
        className={inputClasses}
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
};

export function RadioGroupRender({ label, name, required, options }: RadioGroupProps) {
  const { value, update } = useFormField(name, "", { required });

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
            <label key={val} className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="radio"
                name={name}
                value={val}
                required={required}
                checked={value === val}
                onChange={() => update(val)}
                className="accent-neutral-900"
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
};

export function CheckboxGroupRender({ label, name, options }: CheckboxGroupProps) {
  const { value, update } = useFormField(name, [] as string[]);

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
            <label key={val} className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                name={name}
                value={val}
                checked={selected.includes(val)}
                onChange={() => toggle(val)}
                className="accent-neutral-900"
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
};

export function CheckboxRender({ label, name }: CheckboxProps) {
  const { value, update } = useFormField(name, "false");

  return (
    <label className="flex items-center gap-2 py-2 text-sm text-neutral-700">
      <input
        type="checkbox"
        name={name}
        checked={value === "true"}
        onChange={(e) => update(e.target.checked ? "true" : "false")}
        className="accent-neutral-900"
      />
      {label}
    </label>
  );
}
