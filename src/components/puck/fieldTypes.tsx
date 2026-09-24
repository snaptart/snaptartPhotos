"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createUsePuck, type Overrides } from "@puckeditor/core";
import { RotateCcw } from "lucide-react";
import { SegmentedControl } from "@/components/admin/controls";

/**
 * Every field in the properties panel goes through here, so they all share one
 * look (the admin's) and one behaviour: a label, and — once a value differs
 * from the block's default — a dot and a reset.
 *
 * Puck draws no label for `custom` fields itself, which is why colour pickers
 * used to sit in the panel unnamed. Overriding `custom` too puts a label on
 * every one of them without touching the field definitions.
 */

const usePuckSelector = createUsePuck();

const INPUT =
  "w-full rounded-md border border-admin-border-strong bg-admin-surface px-2.5 py-1.5 text-[13px] text-admin-ink placeholder:text-admin-ink-faint focus:border-admin-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50";

/**
 * The selected block's default for a top-level prop. Nested names
 * ("items[0].label") have no single default, so they get none.
 */
function useFieldDefault(name: string | undefined): unknown {
  return usePuckSelector((s) => {
    if (!name || /[.[]/.test(name)) return undefined;
    const type = s.selectedItem?.type;
    const component = type ? s.config.components[type] : undefined;
    return (component?.defaultProps as Record<string, unknown> | undefined)?.[name];
  });
}

export function sameValue(a: unknown, b: unknown): boolean {
  return a === b || JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Whether a custom field's value is a setting (a number, a switch, a colour)
 * rather than content. Content — an image, a picked gallery, a list of items,
 * rich text — never gets a reset: "back to default" there means "delete it".
 */
function isSettingValue(value: unknown): boolean {
  if (typeof value === "number" || typeof value === "boolean") return true;
  if (typeof value === "string") {
    return value === "transparent" || value.startsWith("token:") || /^#[0-9a-fA-F]{3,8}$/.test(value);
  }
  return false;
}

function FieldShell({
  label,
  name,
  id,
  value,
  onChange,
  labelFor = true,
  resettable = true,
  children,
}: {
  label?: string;
  name?: string;
  id?: string;
  value: unknown;
  onChange: (v: unknown) => void;
  labelFor?: boolean;
  resettable?: boolean;
  children: ReactNode;
}) {
  const fallback = useFieldDefault(resettable ? name : undefined);
  const changed = fallback !== undefined && value !== undefined && !sameValue(value, fallback);

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <div className="flex min-h-5 items-center gap-1.5">
          {labelFor && id ? (
            <label htmlFor={id} className="text-[12px] font-medium text-admin-ink">
              {label}
            </label>
          ) : (
            <span className="text-[12px] font-medium text-admin-ink">{label}</span>
          )}
          {changed && (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-admin-accent" title="Changed from the default" />
              <button
                type="button"
                onClick={() => onChange(fallback)}
                title="Reset to default"
                aria-label={`Reset ${label} to default`}
                className="ml-auto rounded p-0.5 text-admin-ink-faint hover:text-admin-accent"
              >
                <RotateCcw size={13} />
              </button>
            </>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

type AnyFieldProps = {
  field: {
    type: string;
    label?: string;
    placeholder?: string;
    min?: number;
    max?: number;
    step?: number;
    options?: readonly { label: string; value: unknown }[];
    render?: (props: AnyFieldProps) => ReactNode;
  };
  name: string;
  id: string;
  value: unknown;
  onChange: (value: unknown) => void;
  readOnly?: boolean;
  children?: ReactNode;
};

function TextField(props: AnyFieldProps) {
  const { field, id, value, onChange, readOnly } = props;
  return (
    <FieldShell label={field.label} name={props.name} id={id} value={value} onChange={onChange} resettable={false}>
      <input
        id={id}
        type="text"
        value={(value as string) ?? ""}
        placeholder={field.placeholder}
        disabled={readOnly}
        onChange={(e) => onChange(e.target.value)}
        className={INPUT}
      />
    </FieldShell>
  );
}

function TextareaField(props: AnyFieldProps) {
  const { field, id, value, onChange, readOnly } = props;
  return (
    <FieldShell label={field.label} name={props.name} id={id} value={value} onChange={onChange} resettable={false}>
      <textarea
        id={id}
        rows={4}
        value={(value as string) ?? ""}
        placeholder={field.placeholder}
        disabled={readOnly}
        onChange={(e) => onChange(e.target.value)}
        className={`${INPUT} resize-y`}
      />
    </FieldShell>
  );
}

function NumberField(props: AnyFieldProps) {
  const { field, id, value, onChange, readOnly } = props;
  const [text, setText] = useState(value == null ? "" : String(value));
  useEffect(() => setText(value == null ? "" : String(value)), [value]);
  return (
    <FieldShell label={field.label} name={props.name} id={id} value={value} onChange={onChange}>
      <input
        id={id}
        type="number"
        value={text}
        min={field.min}
        max={field.max}
        step={field.step}
        placeholder={field.placeholder}
        disabled={readOnly}
        onChange={(e) => {
          setText(e.target.value);
          const n = Number(e.target.value);
          if (e.target.value.trim() !== "" && !Number.isNaN(n)) onChange(n);
        }}
        onBlur={() => setText(value == null ? "" : String(value))}
        className={`${INPUT} tabular-nums`}
      />
    </FieldShell>
  );
}

function SelectField(props: AnyFieldProps) {
  const { field, id, value, onChange, readOnly } = props;
  const options = field.options ?? [];
  return (
    <FieldShell label={field.label} name={props.name} id={id} value={value} onChange={onChange}>
      <select
        id={id}
        disabled={readOnly}
        // Values may be booleans or numbers; JSON keeps their type through the DOM.
        value={JSON.stringify({ value })}
        onChange={(e) => onChange(JSON.parse(e.target.value).value)}
        className={`${INPUT} pr-8`}
      >
        {options.map((opt) => (
          <option key={opt.label + JSON.stringify(opt.value)} value={JSON.stringify({ value: opt.value })}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

function RadioField(props: AnyFieldProps) {
  const { field, value, onChange, readOnly } = props;
  return (
    <FieldShell label={field.label} name={props.name} value={value} onChange={onChange} labelFor={false}>
      <SegmentedControl
        options={(field.options ?? []).map((o) => ({ label: o.label, value: o.value }))}
        value={value}
        onChange={onChange}
        disabled={readOnly}
      />
    </FieldShell>
  );
}

function CustomField(props: AnyFieldProps) {
  const Render = props.field.render;
  if (!Render) return null;
  return (
    <FieldShell
      label={props.field.label}
      name={props.name}
      value={props.value}
      onChange={props.onChange}
      labelFor={false}
      resettable={isSettingValue(props.value)}
    >
      <Render {...props} />
    </FieldShell>
  );
}

// Puck's types leave `custom` out of fieldTypes, though its AutoField honours it.
export const puckFieldTypes = {
  text: TextField,
  textarea: TextareaField,
  number: NumberField,
  select: SelectField,
  radio: RadioField,
  custom: CustomField,
} as unknown as Overrides["fieldTypes"];
