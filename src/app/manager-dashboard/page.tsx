import React from 'react';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { ShieldCheck } from 'lucide-react';

export default function ManagerDashboard() {
  return (
    <StaffLayout allowedRoles={['manager']} themeColor="red">
      <div className="p-6 pt-12 text-center">
        <ShieldCheck className="h-16 w-16 mx-auto text-brand-600 mb-4" />
        <h1 className="text-2xl font-bold text-neutral-900">Manager Dashboard</h1>
        <p className="text-neutral-500 mt-2">Manage operations and oversee the restaurant.</p>
      </div>
    </StaffLayout>
  );
}
