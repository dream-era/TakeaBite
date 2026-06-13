"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { recoverCustomerId } from "@/actions/customer";
import { CUSTOMER_ID_KEY } from "@/hooks/useCustomerIdentity";
import { toast } from "react-hot-toast";

export default function RecoverPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;
  
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }

    setIsSubmitting(true);
    const result = await recoverCustomerId(phone);
    setIsSubmitting(false);

    if (result.success && result.data) {
      // Overwrite identity in localStorage & cookie
      localStorage.setItem(CUSTOMER_ID_KEY, result.data.customerId);
      const date = new Date();
      date.setTime(date.getTime() + (365 * 24 * 60 * 60 * 1000));
      document.cookie = `${CUSTOMER_ID_KEY}=${result.data.customerId}; expires=${date.toUTCString()}; path=/`;

      toast.success("Order history recovered!");
      router.push(`/shop/${workspaceId}/order-tracking`);
    } else {
      toast.error(result.error || "No order history found for this number.");
    }
  };

  return (
    <div className="bg-background min-h-screen flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
      <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-container text-on-primary-container rounded-full mb-6">
        <span className="material-symbols-outlined text-5xl">manage_history</span>
      </div>
      <h2 className="font-headline-xl text-on-surface mb-2">
        Find Your Orders
      </h2>
      <p className="font-body-lg text-secondary mb-8">
        Enter the phone number you used previously to restore your order history on this device.
      </p>

      <form onSubmit={handleSubmit} className="w-full space-y-4">
        <input 
          type="tel" 
          placeholder="Mobile Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full bg-surface-container-lowest border border-surface-variant rounded-xl p-4 font-body-md text-on-surface focus:outline-none focus:border-primary transition-colors text-center"
        />
        
        <button 
          type="submit"
          disabled={isSubmitting || !phone}
          className="w-full flex justify-center items-center h-14 bg-primary text-on-primary font-label-lg rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {isSubmitting ? (
            <span className="material-symbols-outlined animate-spin">refresh</span>
          ) : (
            "Recover History"
          )}
        </button>

        <button 
          type="button"
          onClick={() => router.push(`/shop/${workspaceId}`)}
          className="w-full flex justify-center items-center h-14 bg-surface-container text-on-surface font-label-lg rounded-xl transition-all"
        >
          Return to Menu
        </button>
      </form>
    </div>
  );
}
