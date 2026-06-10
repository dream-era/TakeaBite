"use client";

import React, { useState } from "react";
import { OwnerLayout } from "@/components/layout/OwnerLayout";
import { EmptyState } from "@/components/ui/EmptyState";
import { Users, UserPlus, Settings, Shield, CheckCircle2, XCircle, MoreVertical, Copy, KeyRound, Ban, Trash2, Edit2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { useRestaurantId } from "@/store/authStore";
import { getStaffList, addStaff, deactivateStaff, reactivateStaff, resetStaffPin, deleteStaff, updateStaff } from "@/actions/staff";
import { StaffRole } from "@/types/database";

export default function StaffManagementPage() {
  const restaurantId = useRestaurantId();
  const queryClient = useQueryClient();

  const { data: staffData, isLoading } = useQuery({
    queryKey: ['staff', restaurantId],
    queryFn: () => getStaffList(restaurantId!).then(res => {
      if (!res.success) throw new Error(res.error);
      return res.data;
    }),
    enabled: !!restaurantId,
  });

  const staff = staffData || [];

  const [activeTab, setActiveTab] = useState<'members' | 'roles'>('members');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [generatedPin, setGeneratedPin] = useState("");
  
  const [inviteData, setInviteData] = useState({
    name: '',
    phone: '',
    email: '',
    role: 'cook' as StaffRole
  });

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const addMutation = useMutation({
    mutationFn: async (data: typeof inviteData) => {
      const res = await addStaff({
        restaurantId: restaurantId!,
        name: data.name,
        phone: data.phone,
        email: data.email || undefined,
        role: data.role,
      });
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (data) => {
      const loginUrl = `${window.location.origin}/staff-login`;
      const whatsappMsg = `Welcome to TakeaBite\nYou have been added to the team.\n\nRole: ${inviteData.role}\nLogin: ${loginUrl}\nPhone: ${inviteData.phone}\nPIN: ${data.plainPin}`;
      
      setGeneratedPin(data.plainPin);
      setGeneratedLink(whatsappMsg);
      setInviteSuccess(true);
      setInviteData({ name: '', phone: '', email: '', role: 'cook' });
      queryClient.invalidateQueries({ queryKey: ['staff', restaurantId] });
      toast.success("Staff added successfully");
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const resetPinMutation = useMutation({
    mutationFn: async (staffId: string) => {
      const res = await resetStaffPin({ staffId });
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`New PIN generated: ${data.plainPin}`, { duration: 10000 });
      setActiveMenuId(null);
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ staffId, currentStatus }: { staffId: string, currentStatus: string }) => {
      if (currentStatus === 'active') {
        const res = await deactivateStaff(staffId);
        if (!res.success) throw new Error(res.error);
      } else {
        const res = await reactivateStaff(staffId);
        if (!res.success) throw new Error(res.error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', restaurantId] });
      toast.success("Status updated");
      setActiveMenuId(null);
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const deleteMutation = useMutation({
    mutationFn: async (staffId: string) => {
      const res = await deleteStaff(staffId);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', restaurantId] });
      toast.success("Staff deleted successfully");
      setActiveMenuId(null);
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const editMutation = useMutation({
    mutationFn: async (data: { staffId: string, name: string, phone: string, email?: string, role: StaffRole }) => {
      const res = await updateStaff(data);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', restaurantId] });
      toast.success("Staff updated successfully");
      setIsEditModalOpen(false);
      setEditingStaffId(null);
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteData.name || !inviteData.phone || !restaurantId) return;
    addMutation.mutate(inviteData);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaffId || !inviteData.name || !inviteData.phone) return;
    editMutation.mutate({
      staffId: editingStaffId,
      name: inviteData.name,
      phone: inviteData.phone,
      email: inviteData.email || undefined,
      role: inviteData.role,
    });
  };

  const handleWhatsAppShare = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(generatedLink)}`;
    window.open(url, '_blank');
  };

  return (
    <OwnerLayout>
      <div className="mx-auto w-full max-w-[1400px] px-8 py-8 pb-24">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-neutral-900 tracking-tight">Staff Workspace</h2>
            <p className="mt-1 text-sm text-neutral-500">Manage your team, invite members, and configure roles.</p>
          </div>
          <button 
            onClick={() => {
              if (!restaurantId) {
                toast.error("Please complete your workspace setup in Settings first.");
                return;
              }
              setIsInviteModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-700"
          >
            <UserPlus className="h-4 w-4" /> Add Staff
          </button>
        </div>

        {/* Content Box */}
        <div className="rounded-3xl border border-neutral-200 bg-white shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          {/* Tabs */}
          <div className="border-b border-neutral-100 bg-neutral-50/50">
            <div className="flex px-6 pt-4 gap-8">
              <button 
                onClick={() => setActiveTab('members')}
                className={`pb-4 text-sm font-semibold transition-colors ${activeTab === 'members' ? 'border-b-2 border-brand-500 text-brand-600' : 'border-b-2 border-transparent text-neutral-500 hover:text-neutral-700'}`}
              >
                Team Members
              </button>
              <button 
                onClick={() => setActiveTab('roles')}
                className={`pb-4 text-sm font-semibold transition-colors ${activeTab === 'roles' ? 'border-b-2 border-brand-500 text-brand-600' : 'border-b-2 border-transparent text-neutral-500 hover:text-neutral-700'}`}
              >
                Roles & Permissions
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6" onClick={() => setActiveMenuId(null)}>
            {activeTab === 'members' && (
              isLoading ? (
                <div className="py-12 flex justify-center">
                  <div className="animate-pulse flex flex-col items-center">
                    <div className="h-12 w-12 bg-neutral-200 rounded-xl mb-4"></div>
                    <div className="h-4 w-32 bg-neutral-200 rounded"></div>
                  </div>
                </div>
              ) : staff.length === 0 ? (
                <div className="py-12">
                  <EmptyState 
                    icon={Users}
                    title="No team members yet"
                    description="Invite your kitchen staff, servers, and managers to collaborate in this workspace."
                    actionButton={
                      <button onClick={() => {
                        if (!restaurantId) {
                          toast.error("Please complete your workspace setup in Settings first.");
                          return;
                        }
                        setIsInviteModalOpen(true);
                      }} className="flex items-center gap-2 bg-neutral-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-neutral-800 transition-colors">
                        <UserPlus className="h-4 w-4" /> Add Staff
                      </button>
                    }
                    className="border-none"
                  />
                </div>
              ) : (
                <div className="overflow-visible min-h-[300px]">
                  <table className="w-full text-left text-sm text-neutral-600 relative">
                    <thead className="bg-neutral-50/50 text-xs uppercase text-neutral-500 rounded-lg">
                      <tr>
                        <th className="px-6 py-4 font-semibold">Member</th>
                        <th className="px-6 py-4 font-semibold">Contact</th>
                        <th className="px-6 py-4 font-semibold">Role</th>
                        <th className="px-6 py-4 font-semibold">Status</th>
                        <th className="px-6 py-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {staff.map((member) => (
                        <tr key={member.id} className="hover:bg-neutral-50/60 transition-colors">
                          <td className="px-6 py-4">
                            <span className="font-semibold text-neutral-900">{member.name}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-neutral-900">{member.phone}</span>
                              {member.email && <span className="text-xs text-neutral-500">{member.email}</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4 capitalize">{member.role.replace('_', ' ')}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${member.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-neutral-50 text-neutral-700 border-neutral-200'}`}>
                              {member.status === 'active' ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right relative">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(activeMenuId === member.id ? null : member.id);
                              }}
                              className="text-neutral-400 hover:text-neutral-600 p-2"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                            {activeMenuId === member.id && (
                              <div className="absolute right-6 top-10 w-48 bg-white border border-neutral-200 rounded-xl shadow-lg z-50 py-1 overflow-hidden" onClick={e => e.stopPropagation()}>
                                <button 
                                  onClick={() => {
                                    setInviteData({
                                      name: member.name,
                                      phone: member.phone || '',
                                      email: member.email || '',
                                      role: member.role as StaffRole
                                    });
                                    setEditingStaffId(member.id);
                                    setIsEditModalOpen(true);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
                                >
                                  <Edit2 className="h-4 w-4" /> Edit Staff
                                </button>
                                <button 
                                  onClick={() => resetPinMutation.mutate(member.id)}
                                  className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
                                >
                                  <KeyRound className="h-4 w-4" /> Reset PIN
                                </button>
                                <button 
                                  onClick={() => toggleStatusMutation.mutate({ staffId: member.id, currentStatus: member.status })}
                                  className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
                                >
                                  <Ban className="h-4 w-4" /> {member.status === 'active' ? 'Disable Staff' : 'Enable Staff'}
                                </button>
                                <button 
                                  onClick={() => {
                                    if (confirm("Are you sure you want to delete this staff member?")) {
                                      deleteMutation.mutate(member.id);
                                    }
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <Trash2 className="h-4 w-4" /> Delete Staff
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {activeTab === 'roles' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-neutral-200 rounded-xl p-5 hover:border-brand-300 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-neutral-100 rounded-lg"><Shield className="h-5 w-5 text-neutral-600" /></div>
                    <h3 className="font-bold text-neutral-900">Manager</h3>
                  </div>
                  <p className="text-sm text-neutral-500">Full access to dashboard, menu management, and staff settings. Cannot delete workspace.</p>
                </div>
                <div className="border border-neutral-200 rounded-xl p-5 hover:border-brand-300 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-neutral-100 rounded-lg"><Settings className="h-5 w-5 text-neutral-600" /></div>
                    <h3 className="font-bold text-neutral-900">Kitchen Staff (Cook / Juice Maker)</h3>
                  </div>
                  <p className="text-sm text-neutral-500">Access to kitchen display system and order status updates only.</p>
                </div>
                <div className="border border-neutral-200 rounded-xl p-5 hover:border-brand-300 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-neutral-100 rounded-lg"><Users className="h-5 w-5 text-neutral-600" /></div>
                    <h3 className="font-bold text-neutral-900">Cashier</h3>
                  </div>
                  <p className="text-sm text-neutral-500">Access to billing, order creation, and payment collection.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invite Modal Placeholder */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {inviteSuccess ? (
              <div className="p-8 flex flex-col">
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="h-16 w-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 mb-2">Staff Created!</h3>
                  <p className="text-neutral-500 text-sm">Please securely share the PIN below with the new staff member.</p>
                </div>
                
                <div className="bg-neutral-50 p-6 rounded-xl border border-neutral-200 flex flex-col items-center gap-2 mb-6 text-center">
                  <span className="text-xs text-neutral-500 uppercase tracking-widest font-bold">Login PIN</span>
                  <span className="text-4xl font-mono text-neutral-900 font-bold tracking-[0.2em]">{generatedPin}</span>
                </div>
                
                <div className="flex gap-3 mb-6">
                  <button 
                    onClick={handleWhatsAppShare}
                    className="flex-1 bg-[#25D366] text-white py-3 rounded-xl font-bold hover:bg-[#1ebd5a] transition-colors flex justify-center items-center gap-2"
                  >
                    Send WhatsApp
                  </button>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(generatedLink);
                      toast.success("Invite copied to clipboard");
                    }}
                    className="px-4 bg-white border border-neutral-200 text-neutral-700 py-3 rounded-xl font-bold hover:bg-neutral-50 transition-colors flex justify-center items-center gap-2"
                    title="Copy Invite"
                  >
                    <Copy className="h-5 w-5" />
                  </button>
                </div>
                
                <button 
                  onClick={() => {
                    setInviteSuccess(false);
                    setIsInviteModalOpen(false);
                  }} 
                  className="w-full bg-neutral-900 text-white py-3 rounded-xl font-bold hover:bg-neutral-800 transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="px-6 py-5 border-b border-neutral-100 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-neutral-900">Add Staff Member</h3>
                  <button onClick={() => setIsInviteModalOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>
                <form onSubmit={handleInviteSubmit} className="p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">Full Name</label>
                      <input value={inviteData.name} onChange={e => setInviteData({...inviteData, name: e.target.value})} type="text" className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-50 focus:border-brand-500 outline-none" placeholder="Ravi Kumar" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">Phone Number</label>
                      <input value={inviteData.phone} onChange={e => setInviteData({...inviteData, phone: e.target.value})} type="tel" className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-50 focus:border-brand-500 outline-none" placeholder="+91 9876543210" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">Email Address (Optional)</label>
                      <input value={inviteData.email} onChange={e => setInviteData({...inviteData, email: e.target.value})} type="email" className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-50 focus:border-brand-500 outline-none" placeholder="john@example.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">Role</label>
                      <select value={inviteData.role} onChange={e => setInviteData({...inviteData, role: e.target.value as StaffRole})} className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-50 focus:border-brand-500 outline-none bg-white">
                        <option value="cook">Cook</option>
                        <option value="juice_maker">Juice Maker</option>
                        <option value="manager">Manager</option>
                        <option value="cashier">Cashier</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" disabled={addMutation.isPending} className="w-full mt-6 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50">
                    <UserPlus className="h-4 w-4" /> {addMutation.isPending ? "Adding..." : "Create Staff"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal Placeholder */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-neutral-900">Edit Staff Member</h3>
              <button onClick={() => { setIsEditModalOpen(false); setEditingStaffId(null); }} className="text-neutral-400 hover:text-neutral-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Full Name</label>
                  <input value={inviteData.name} onChange={e => setInviteData({...inviteData, name: e.target.value})} type="text" className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-50 focus:border-brand-500 outline-none" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Phone Number</label>
                  <input value={inviteData.phone} onChange={e => setInviteData({...inviteData, phone: e.target.value})} type="tel" className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-50 focus:border-brand-500 outline-none" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Email Address (Optional)</label>
                  <input value={inviteData.email} onChange={e => setInviteData({...inviteData, email: e.target.value})} type="email" className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-50 focus:border-brand-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Role</label>
                  <select value={inviteData.role} onChange={e => setInviteData({...inviteData, role: e.target.value as StaffRole})} className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-50 focus:border-brand-500 outline-none bg-white">
                    <option value="cook">Cook</option>
                    <option value="juice_maker">Juice Maker</option>
                    <option value="manager">Manager</option>
                    <option value="cashier">Cashier</option>
                  </select>
                </div>
              </div>
              <button type="submit" disabled={editMutation.isPending} className="w-full mt-6 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50">
                <Edit2 className="h-4 w-4" /> {editMutation.isPending ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      )}
    </OwnerLayout>
  );
}
