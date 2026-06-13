"use client";

import { useEffect, useState } from "react";

export const CUSTOMER_ID_KEY = "serveflow_customer_id";

// Basic UUID fallback if crypto.randomUUID is not available
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function useCustomerIdentity() {
  const [customerId, setCustomerId] = useState<string | null>(null);

  useEffect(() => {
    // Check localStorage first
    let id = localStorage.getItem(CUSTOMER_ID_KEY);
    
    // Also check cookies
    const match = document.cookie.match(new RegExp('(^| )' + CUSTOMER_ID_KEY + '=([^;]+)'));
    if (!id && match) {
      id = match[2];
      localStorage.setItem(CUSTOMER_ID_KEY, id);
    }

    // Generate new UUID if neither exists
    if (!id) {
      id = generateUUID();
      localStorage.setItem(CUSTOMER_ID_KEY, id);
      // Set cookie to expire in 1 year
      const date = new Date();
      date.setTime(date.getTime() + (365 * 24 * 60 * 60 * 1000));
      document.cookie = `${CUSTOMER_ID_KEY}=${id}; expires=${date.toUTCString()}; path=/`;
    }

    setCustomerId(id);
  }, []);

  return { customerId };
}
