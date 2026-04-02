"use client";

import { useEffect, useState } from "react";
import { useFormContext } from "./FormContext";

// ---------- Shared label ----------

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className="mb-1 block text-sm font-medium text-neutral-700">
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
  const ctx = useFormContext();
  const [value, setValue] = useState("");

  useEffect(() => {
    ctx?.register(name, "", { required, type: fieldType });
  }, [name, required, fieldType]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="py-2">
      <FieldLabel label={label} required={required} />
      <input
        type={fieldType}
        name={name}
        placeholder={placeholder}
        required={required}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          ctx?.update(name, e.target.value);
        }}
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
  const ctx = useFormContext();
  const [value, setValue] = useState("");

  useEffect(() => {
    ctx?.register(name, "", { required });
  }, [name, required]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="py-2">
      <FieldLabel label={label} required={required} />
      <textarea
        name={name}
        placeholder={placeholder}
        required={required}
        rows={rows}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          ctx?.update(name, e.target.value);
        }}
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
  const ctx = useFormContext();
  const [value, setValue] = useState("");

  const optList = options
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  useEffect(() => {
    ctx?.register(name, "", { required });
  }, [name, required]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="py-2">
      <FieldLabel label={label} required={required} />
      <select
        name={name}
        required={required}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          ctx?.update(name, e.target.value);
        }}
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
  const ctx = useFormContext();
  const [value, setValue] = useState("");

  const optList = options
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  useEffect(() => {
    ctx?.register(name, "", { required });
  }, [name, required]); // eslint-disable-line react-hooks/exhaustive-deps

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
                onChange={() => {
                  setValue(val);
                  ctx?.update(name, val);
                }}
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
  const ctx = useFormContext();
  const [selected, setSelected] = useState<string[]>([]);

  const optList = options
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  useEffect(() => {
    ctx?.register(name, []);
  }, [name]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggle(val: string) {
    const next = selected.includes(val)
      ? selected.filter((s) => s !== val)
      : [...selected, val];
    setSelected(next);
    ctx?.update(name, next);
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
  const ctx = useFormContext();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    ctx?.register(name, "false");
  }, [name]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <label className="flex items-center gap-2 py-2 text-sm text-neutral-700">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => {
          setChecked(e.target.checked);
          ctx?.update(name, e.target.checked ? "true" : "false");
        }}
        className="accent-neutral-900"
      />
      {label}
    </label>
  );
}
