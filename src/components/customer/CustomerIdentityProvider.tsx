"use client";

import { useCustomerIdentity } from "@/hooks/useCustomerIdentity";

export function CustomerIdentityProvider({ children }: { children: React.ReactNode }) {
  // This hook will automatically generate and store the customer identity
  useCustomerIdentity();
  
  return <>{children}</>;
}
