"use client";

import { useState } from "react";
import { useCustomerIdentity } from "@/hooks/useCustomerIdentity";
import { linkCustomerPhone } from "@/actions/customer";
import { toast } from "react-hot-toast";

export function PhoneRecoveryPrompt() {
  const { customerId } = useCustomerIdentity();
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!customerId || isSuccess) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }

    setIsSubmitting(true);
    const result = await linkCustomerPhone(customerId, phone);
    setIsSubmitting(false);

    if (result.success) {
      toast.success("Phone number saved! You can now view your order history across devices.");
      setIsSuccess(true);
    } else {
      toast.error(result.error || "Failed to link phone number");
    }
  };

  return (
    <div className="bg-surface-container-low p-4 rounded-xl mt-6 border border-surface-variant">
      <h3 className="font-headline-sm text-on-surface mb-2 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">devices</span>
        Save Order History?
      </h3>
      <p className="font-body-md text-secondary text-sm mb-4">
        Enter your phone number to access your order history from any device. No password needed!
      </p>
      
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input 
          type="tel" 
          placeholder="e.g. 9876543210"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="flex-1 bg-surface-container-lowest border border-surface-variant rounded-lg px-3 py-2 text-on-surface focus:outline-none focus:border-primary"
        />
        <button 
          type="submit"
          disabled={isSubmitting || !phone}
          className="bg-primary text-on-primary px-4 py-2 rounded-lg font-label-md hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-1"
        >
          {isSubmitting ? (
            <span className="material-symbols-outlined animate-spin text-sm">refresh</span>
          ) : (
            <>Save</>
          )}
        </button>
      </form>
    </div>
  );
}
