"use client";

import { useState, useCallback } from "react";

type MessageType = "success" | "error";

interface Message {
  text: string;
  type: MessageType;
}

export function useMessage() {
  const [message, setMessage] = useState<Message | null>(null);

  const showSuccess = useCallback((text: string) => {
    setMessage({ text, type: "success" });
  }, []);

  const showError = useCallback((text: string) => {
    setMessage({ text, type: "error" });
  }, []);

  const clear = useCallback(() => {
    setMessage(null);
  }, []);

  const alertClass = message?.type === "error" ? "alert-error" : "alert-success";

  return { message, showSuccess, showError, clear, alertClass };
}
