"use client";

import React, { useState, useEffect } from "react";
import { StaffLayout } from "@/components/staff/StaffLayout";
import { useStaffStore } from "@/store/useStaffStore";
import { User, LogOut, Phone, Store, Calendar, RefreshCw, Activity, CheckCircle2, PhoneCall, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { fetchStaffDailyMetrics } from "@/lib/api/metrics";

export default function StaffProfilePage() {
  const { currentSession, logout } = useStaffStore();
  const router = useRouter();
  
  const [mounted, setMounted] = useState(false);
  const [metrics, setMetrics] = useState({ completed: 0, pending: 0, avgTime: '0 min', recentActivity: [] as any[] });
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && currentSession) {
      loadMetrics();
    }
  }, [mounted, currentSession]);

  const loadMetrics = async () => {
    if (!currentSession) return;
    setIsRefreshing(true);
    try {
      const data = await fetchStaffDailyMetrics(currentSession.restaurantId, currentSession.role);
      setMetrics(data);
    } catch (error) {
      console.error("Failed to load metrics", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!mounted) return null;
  if (!currentSession) return null;

  const isCook = currentSession.role === 'Cook' || currentSession.role === 'chef' || currentSession.role === 'cook';
  const isJuice = currentSession.role === 'Juice Maker' || currentSession.role === 'juice' || currentSession.role === 'juice_maker';
  const isServer = currentSession.role === 'server' || currentSession.role === 'Server' || currentSession.role === 'servant';
  
  const themeColor = isCook ? 'red' : isServer ? 'blue' : 'green';
  
  const themeClasses = isCook 
    ? {
        bg: 'bg-[#D32F2F]',
        text: 'text-[#D32F2F]',
        lightBg: 'bg-rose-50',
        border: 'border-rose-200'
      }
    : isServer 
    ? {
        bg: 'bg-[#1976D2]',
        text: 'text-[#1976D2]',
        lightBg: 'bg-blue-50',
        border: 'border-blue-200'
      }
    : {
        bg: 'bg-[#1B5E20]',
        text: 'text-[#1B5E20]',
        lightBg: 'bg-green-50',
        border: 'border-green-200'
      };

  const displayRole = isServer ? 'Servant' : isJuice ? 'Juice Maker' : isCook ? 'Cook' : currentSession.role;

  const getMetricLabels = () => {
    if (isCook) {
      return { completed: "Orders Completed", pending: "Pending Orders", time: "Avg Prep Time" };
    }
    if (isJuice) {
      return { completed: "Drinks Completed", pending: "Pending Drink Orders", time: "Avg Prep Time" };
    }
    return { completed: "Orders Delivered", pending: "Pending Deliveries", time: "Avg Delivery Time" };
  };

  const labels = getMetricLabels();

  const handleLogout = () => {
    logout();
    router.push('/staff-login');
  };

  return (
    <StaffLayout allowedRoles={['cook', 'chef', 'Cook', 'Juice Maker', 'juice', 'juice_maker', 'Manager', 'manager', 'server', 'Server']} themeColor={themeColor as any}>
      {/* Header Profile Section */}
      <div className="px-4 py-8 flex flex-col items-center bg-white border-b border-neutral-100 shadow-sm relative overflow-hidden">
        {/* Accent Background blur */}
        <div className={`absolute top-0 left-0 right-0 h-32 opacity-10 ${themeClasses.bg} blur-2xl rounded-b-full`} />
        
        <button onClick={() => router.back()} className="absolute top-4 left-4 p-2 z-20 text-neutral-500 hover:text-neutral-900 transition-colors active:scale-95">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="relative h-24 w-24 bg-neutral-100 text-neutral-400 rounded-full flex items-center justify-center mb-4 shadow-sm border-4 border-white z-10">
          <User className="h-10 w-10" />
        </div>
        
        <h2 className="text-2xl font-black text-neutral-900 tracking-tight mb-1 relative z-10">{currentSession.name}</h2>
        <p className="text-sm text-neutral-500 font-medium mb-3 relative z-10">{displayRole}</p>
        
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${themeClasses.lightBg} ${themeClasses.text} border ${themeClasses.border} relative z-10`}>
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${themeClasses.bg}`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${themeClasses.bg}`}></span>
          </span>
          Active
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Today's Performance Card */}
        <div>
          <h3 className="text-sm font-bold text-neutral-900 mb-3 uppercase tracking-wider px-1">Today's Performance</h3>
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-5 grid grid-cols-2 gap-4">
            <div className="col-span-2 flex justify-between items-center pb-4 border-b border-neutral-100">
              <span className="text-neutral-500 font-medium text-sm">{labels.completed}</span>
              <span className={`text-3xl font-black ${themeClasses.text}`}>{metrics.completed}</span>
            </div>
            <div className="flex flex-col gap-1 border-r border-neutral-100 pr-2">
              <span className="text-neutral-500 font-medium text-xs">{labels.time}</span>
              <span className="text-xl font-bold text-neutral-900">{metrics.avgTime}</span>
            </div>
            <div className="flex flex-col gap-1 pl-2">
              <span className="text-neutral-500 font-medium text-xs">{labels.pending}</span>
              <span className="text-xl font-bold text-neutral-900">{metrics.pending}</span>
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div>
          <h3 className="text-sm font-bold text-neutral-900 mb-3 uppercase tracking-wider px-1">Account Information</h3>
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
            <div className="p-4 flex items-center gap-3 border-b border-neutral-100">
              <User className="h-5 w-5 text-neutral-400" />
              <div>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Name</p>
                <p className="text-sm font-bold text-neutral-900">{currentSession.name}</p>
              </div>
            </div>
            <div className="p-4 flex items-center gap-3 border-b border-neutral-100">
              <Phone className="h-5 w-5 text-neutral-400" />
              <div>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Phone</p>
                <p className="text-sm font-bold text-neutral-900">{currentSession.phone || "Not provided"}</p>
              </div>
            </div>
            <div className="p-4 flex items-center gap-3 border-b border-neutral-100">
              <Store className="h-5 w-5 text-neutral-400" />
              <div>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Restaurant</p>
                <p className="text-sm font-bold text-neutral-900">{currentSession.restaurantName}</p>
              </div>
            </div>
            <div className="p-4 flex items-center gap-3">
              <Calendar className="h-5 w-5 text-neutral-400" />
              <div>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Joined Date</p>
                <p className="text-sm font-bold text-neutral-900">{new Date(currentSession.expiry).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-sm font-bold text-neutral-900 mb-3 uppercase tracking-wider px-1">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <button className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-100 flex flex-col items-center justify-center gap-2 active:bg-neutral-50 transition-colors">
              <div className={`p-2 rounded-full ${themeClasses.lightBg} ${themeClasses.text}`}>
                <PhoneCall className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold text-neutral-700">Contact Mgr</span>
            </button>
            <button onClick={loadMetrics} className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-100 flex flex-col items-center justify-center gap-2 active:bg-neutral-50 transition-colors">
              <div className={`p-2 rounded-full ${themeClasses.lightBg} ${themeClasses.text}`}>
                <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </div>
              <span className="text-xs font-bold text-neutral-700">Refresh</span>
            </button>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full mt-3 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 active:bg-rose-100 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>

        {/* Notifications */}
        <div>
          <h3 className="text-sm font-bold text-neutral-900 mb-3 uppercase tracking-wider px-1">Notifications</h3>
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-4">
            {metrics.recentActivity.length === 0 ? (
              <p className="text-sm text-neutral-500 text-center py-4">No recent activity found.</p>
            ) : (
              <div className="space-y-4">
                {metrics.recentActivity.map((activity, index) => (
                  <div key={index} className="flex gap-3 items-start relative">
                    {index !== metrics.recentActivity.length - 1 && (
                      <div className="absolute top-6 bottom-0 left-2 w-px bg-neutral-200 -z-0" />
                    )}
                    <div className={`mt-0.5 rounded-full p-1 border-2 border-white bg-neutral-100 z-10 shrink-0`}>
                      <Activity className={`w-3 h-3 ${themeClasses.text}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-800">{activity.message}</p>
                      <p className="text-xs text-neutral-400 mt-0.5">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </StaffLayout>
  );
}
