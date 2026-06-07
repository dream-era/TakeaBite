"use client";
export const dynamic = 'force-dynamic';

import React, { useState } from "react";
import { OwnerLayout } from "@/components/layout/OwnerLayout";
import { EmptyState } from "@/components/ui/EmptyState";
import { QrCode, Plus, Download, Printer, Share, Link as LinkIcon, Edit, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { useRestaurantId } from "@/store/authStore";
import { getTableList, addTable, deleteTable, deactivateTable } from "@/actions/tables";
import { getRestaurantProfile } from "@/actions/restaurant";

export default function QRGenerationPage() {
  const restaurantId = useRestaurantId();
  const queryClient = useQueryClient();

  const { data: tableData, isLoading } = useQuery({
    queryKey: ['tables', restaurantId],
    queryFn: () => getTableList(restaurantId!).then(res => {
      if (!res.success) throw new Error(res.error);
      return res.data;
    }),
    enabled: !!restaurantId,
  });

  const { data: restaurantData } = useQuery({
    queryKey: ['restaurantProfile', restaurantId],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryFn: () => getRestaurantProfile(restaurantId!).then((res: any) => {
      if (!res.success) throw new Error(res.error);
      return res.data;
    }),
    enabled: !!restaurantId,
  });

  const universalQrUrl = restaurantData?.universal_qr_url;

  const tables = tableData?.tables?.filter(t => t.qr_code_url) || [];

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTableNum, setNewTableNum] = useState("");

  const addMutation = useMutation({
    mutationFn: async (tableNum: string) => {
      const parsedNum = parseInt(tableNum);
      const res = await addTable({ 
        restaurantId: restaurantId!, 
        tableNumber: isNaN(parsedNum) ? undefined : parsedNum,
        tableName: isNaN(parsedNum) ? tableNum : `Table ${tableNum}`
      });
      if (!res.success) throw new Error(res.error);
      
      const qrRes = await fetch('/api/generate-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId, tableId: res.data.id, mode: 'single' })
      });
      if (!qrRes.ok) throw new Error("Failed to generate QR code");
      return res.data;
    },
    onSuccess: () => {
      toast.success("Table created and QR generated!");
      queryClient.invalidateQueries({ queryKey: ['tables', restaurantId] });
      setIsAddModalOpen(false);
      setNewTableNum("");
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const deleteMutation = useMutation({
    mutationFn: async (table: { id: string; is_active: boolean }) => {
      if (table.is_active) {
        const deactRes = await deactivateTable(table.id);
        if (!deactRes.success) throw new Error(deactRes.error);
      }
      const res = await deleteTable(table.id);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Table deleted");
      queryClient.invalidateQueries({ queryKey: ['tables', restaurantId] });
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const handleAddTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableNum || !restaurantId) return;
    addMutation.mutate(newTableNum);
  };

  const generateUniversalMutation = useMutation({
    mutationFn: async () => {
      const qrRes = await fetch('/api/generate-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId, mode: 'universal' })
      });
      if (!qrRes.ok) throw new Error("Failed to generate Universal QR");
      return await qrRes.json();
    },
    onSuccess: () => {
      toast.success("Universal QR generated!");
      queryClient.invalidateQueries({ queryKey: ['restaurantProfile', restaurantId] });
    },
    onError: (err: Error) => toast.error(err.message)
  });

  return (
    <OwnerLayout>
      <div className="mx-auto w-full max-w-[1400px] px-8 py-8 pb-24">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-neutral-900 tracking-tight">QR & Tables</h2>
            <p className="mt-1 text-sm text-neutral-500">Manage your physical tables and generate ordering QR codes.</p>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            disabled={!restaurantId}
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Create Table QR
          </button>
        </div>

        {/* Global QR Settings */}
        <div className="mb-8 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm flex flex-col md:flex-row items-center gap-6 justify-between">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-100 flex items-center justify-center">
              {universalQrUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={universalQrUrl} alt="Universal QR" className="h-12 w-12 object-contain mix-blend-multiply" />
              ) : (
                <QrCode className="h-12 w-12 text-neutral-800" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-neutral-900">Universal Shop QR</h3>
              <p className="text-sm text-neutral-500">Links directly to your shop menu without specifying a table.</p>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            {!universalQrUrl ? (
              <button 
                onClick={() => generateUniversalMutation.mutate()}
                disabled={generateUniversalMutation.isPending || !restaurantId}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-neutral-200 rounded-xl text-sm font-medium hover:bg-neutral-50 transition-colors disabled:opacity-50"
              >
                {generateUniversalMutation.isPending ? "Generating..." : "Generate QR"}
              </button>
            ) : (
              <>
                <button 
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = universalQrUrl;
                    link.download = 'Universal_QR.png';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-neutral-200 rounded-xl text-sm font-medium hover:bg-neutral-50 transition-colors"
                >
                  <Download className="h-4 w-4" /> Download
                </button>
                <button 
                  onClick={() => {
                    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
                    navigator.clipboard.writeText(`${appUrl}/shop/${restaurantId}`);
                    toast.success("Link copied!");
                  }}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-neutral-200 rounded-xl text-sm font-medium hover:bg-neutral-50 transition-colors"
                >
                  <LinkIcon className="h-4 w-4" /> Copy Link
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tables Grid */}
        <div className="rounded-3xl border border-neutral-200 bg-white shadow-sm min-h-[500px]">
          <div className="border-b border-neutral-100 bg-neutral-50/50 px-6 py-4">
            <h3 className="font-semibold text-neutral-900">Physical Tables</h3>
          </div>
          
          <div className="p-6">
            {isLoading ? (
              <div className="py-12 flex justify-center">
                <div className="animate-pulse flex flex-col items-center">
                  <div className="h-12 w-12 bg-neutral-200 rounded-xl mb-4"></div>
                  <div className="h-4 w-32 bg-neutral-200 rounded"></div>
                </div>
              </div>
            ) : tables.length === 0 ? (
              <div className="py-12">
                <EmptyState 
                  icon={QrCode}
                  title="No tables created"
                  description="Add your physical tables to generate unique QR codes for each. When customers scan a table's QR, their orders will be automatically mapped to that table."
                  actionButton={
                    <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 bg-neutral-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-neutral-800 transition-colors">
                      <Plus className="h-4 w-4" /> Create Table QR
                    </button>
                  }
                  className="border-none"
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tables.map(table => (
                  <div key={table.id} className="border border-neutral-200 rounded-2xl p-5 hover:shadow-md transition-shadow relative group">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-lg text-neutral-900">{table.table_name || `Table ${table.table_number}`}</h4>
                        <p className="text-xs text-neutral-500 font-mono mt-1">/shop/table/{table.id}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm rounded-lg p-1 border border-neutral-100 absolute top-4 right-4">
                        <button className="p-1.5 text-neutral-400 hover:text-brand-600 rounded-md hover:bg-neutral-50"><Edit className="h-3.5 w-3.5" /></button>
                        <button 
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this table?")) {
                              deleteMutation.mutate(table);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-md hover:bg-rose-50 disabled:opacity-50"
                        ><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-center justify-center p-6 bg-neutral-50 rounded-xl border border-neutral-100 mb-4 overflow-hidden">
                      {table.qr_code_url ? (
                        <img src={table.qr_code_url} alt="QR Code" className="h-24 w-24 object-contain mb-2 mix-blend-multiply" />
                      ) : (
                        <QrCode className="h-20 w-20 text-neutral-800 mb-2" />
                      )}
                      <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Scan to Order</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <button className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg hover:bg-neutral-50 text-neutral-600 transition-colors">
                        <Download className="h-4 w-4" />
                        <span className="text-[10px] font-medium">Save</span>
                      </button>
                      <button className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg hover:bg-neutral-50 text-neutral-600 transition-colors">
                        <Printer className="h-4 w-4" />
                        <span className="text-[10px] font-medium">Print</span>
                      </button>
                      <button className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg hover:bg-neutral-50 text-neutral-600 transition-colors">
                        <Share className="h-4 w-4" />
                        <span className="text-[10px] font-medium">Share</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Table Modal Placeholder */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-neutral-900">Create Table QR</h3>
            </div>
            <form onSubmit={handleAddTable} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Table Number</label>
                  <input 
                    type="text" 
                    value={newTableNum}
                    onChange={(e) => setNewTableNum(e.target.value)}
                    className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-50 focus:border-brand-500 outline-none" 
                    placeholder="e.g. 1, VIP 1, Outdoor 2" 
                    required
                    autoFocus
                  />
                </div>
              </div>
              <div className="mt-6 flex items-center gap-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50 rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={addMutation.isPending} className="flex-1 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors disabled:opacity-50">
                  {addMutation.isPending ? "Generating..." : "Generate QR"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </OwnerLayout>
  );
}
