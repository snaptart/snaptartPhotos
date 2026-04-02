"use client";

import { createContext, useContext } from "react";

type FormContextValue = {
  register: (name: string, value: string | string[], meta?: { required?: boolean; type?: string }) => void;
  update: (name: string, value: string | string[]) => void;
};

export const FormContext = createContext<FormContextValue | null>(null);

export function useFormContext() {
  return useContext(FormContext);
}
