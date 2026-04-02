"use client";

import { useState, useEffect } from "react";
import { useFormContext } from "@/components/puck/form/FormContext";

/**
 * Shared hook for Puck form fields. Handles registration with FormContext
 * and two-way state sync via ctx.update().
 */
export function useFormField(
  name: string,
  defaultValue: string | string[],
  meta?: { required?: boolean; type?: string }
) {
  const ctx = useFormContext();
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    ctx?.register(name, defaultValue, meta);
  }, [name, meta?.required, meta?.type]); // eslint-disable-line react-hooks/exhaustive-deps

  function update(next: string | string[]) {
    setValue(next);
    ctx?.update(name, next);
  }

  return { value, update };
}
