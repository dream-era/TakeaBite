'use client'
export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react'
import { OwnerLayout } from '@/components/layout/OwnerLayout'
import { useAuthStore, useRestaurantId } from '@/store/authStore'
import {
  connectRazorpayKeys,
  disconnectRazorpay,
  getPaymentStatus,
  getRevenueData,
} from '@/actions/payments'
import { toast } from 'react-hot-toast'
import {
  CreditCard,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  TrendingUp,
  Banknote,
  Clock,
  Settings,
  XCircle,
  IndianRupee,
  Smartphone,
  Check,
  RefreshCw,
  Store
} from 'lucide-react'

import { useAuthReady } from '@/store/authStore'

export default function PaymentsPage() {
  const restaurantId = useRestaurantId()
  const [isLoaded, setIsLoaded] = useState(false)
  const [isConnected, setIsConnected] = useState(false)

  // Disconnected state form
  const [accountName, setAccountName] = useState('')
  const [keyId, setKeyId] = useState('')
  const [keySecret, setKeySecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)

  // Connected state data
  const [connectionDetails, setConnectionDetails] = useState<{
    accountName: string | null
    maskedSecret: string | null
    keyId: string | null
    connectedAt: string | null
  } | null>(null)
  
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('today')
  const [revenueData, setRevenueData] = useState<any>(null)
  const [isLoadingData, setIsLoadingData] = useState(false)

  // Modals / Dropdowns
  const [showManageDropdown, setShowManageDropdown] = useState(false)

  const { isReady } = useAuthReady()

  useEffect(() => {
    if (isReady) {
      if (restaurantId) {
        loadStatus()
      } else {
        // User has no restaurant setup yet, stop loading spinner
        setIsLoaded(true)
      }
    }
  }, [restaurantId, isReady])

  useEffect(() => {
    if (isConnected && restaurantId) {
      loadRevenueData()
    }
  }, [isConnected, restaurantId, dateRange])

  const loadStatus = async () => {
    if (!restaurantId) return
    const res = await getPaymentStatus(restaurantId)
    if (res.success && res.data) {
      setIsConnected(res.data.isConnected)
      if (res.data.isConnected) {
        setConnectionDetails({
          accountName: res.data.accountName,
          maskedSecret: res.data.maskedSecret,
          keyId: res.data.keyId,
          connectedAt: res.data.connectedAt,
        })
      }
    }
    setIsLoaded(true)
  }

  const loadRevenueData = async () => {
    if (!restaurantId) return
    setIsLoadingData(true)
    const res = await getRevenueData(restaurantId, dateRange)
    if (res.success && res.data) {
      setRevenueData(res.data)
    }
    setIsLoadingData(false)
  }

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!restaurantId) return
    setConnectError(null)

    if (accountName.length < 2) {
      setConnectError("Account name must be at least 2 characters")
      return
    }
    if (!keyId.startsWith('rzp_')) {
      setConnectError("Key ID must start with rzp_")
      return
    }
    if (keySecret.length < 10) {
      setConnectError("Invalid Key Secret length")
      return
    }

    setIsConnecting(true)
    const res = await connectRazorpayKeys({
      restaurantId,
      accountName,
      keyId,
      keySecret
    })

    setIsConnecting(false)

    if (res.success) {
      toast.success("Razorpay connected successfully!")
      // Clear form
      setKeyId('')
      setKeySecret('')
      // Reload status
      loadStatus()
    } else {
      setConnectError(res.error || "Failed to connect")
    }
  }

  const handleDisconnect = async () => {
    if (!restaurantId) return
    if (!confirm("Are you sure you want to disconnect Razorpay? Online payments will be disabled.")) return

    const res = await disconnectRazorpay(restaurantId)
    if (res.success) {
      toast.success("Razorpay disconnected")
      setIsConnected(false)
      setConnectionDetails(null)
      setShowManageDropdown(false)
    } else {
      toast.error(res.error || "Failed to disconnect")
    }
  }

  if (!isLoaded) {
    return (
      <OwnerLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
        </div>
      </OwnerLayout>
    )
  }

  if (isLoaded && !restaurantId) {
    return (
      <OwnerLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
          <div className="h-16 w-16 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mb-4 shadow-sm">
            <Store className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">Setup Your Restaurant</h2>
          <p className="text-neutral-500 max-w-md">
            You need to complete your restaurant setup before you can access payment settings.
          </p>
        </div>
      </OwnerLayout>
    )
  }

  const renderNotConnected = () => (
    <div className="max-w-2xl mx-auto mt-6">
      <div className="bg-white border border-neutral-200 rounded-3xl shadow-sm overflow-hidden">
        {/* Header / How it works */}
        <div className="bg-neutral-50 border-b border-neutral-100 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900">Connect Razorpay Account</h2>
              <p className="text-sm font-medium text-neutral-500 mt-1">Accept online payments directly to your bank</p>
            </div>
          </div>
          
          <div className="space-y-4 mb-6">
            <h3 className="text-sm font-bold text-neutral-900">How online payments work:</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm font-medium text-neutral-600">
                <span className="text-lg leading-none">📱</span> Customer scans QR and places order
              </li>
              <li className="flex items-start gap-3 text-sm font-medium text-neutral-600">
                <span className="text-lg leading-none">💳</span> Customer pays via UPI, card, or wallet
              </li>
              <li className="flex items-start gap-3 text-sm font-medium text-neutral-600">
                <span className="text-lg leading-none">🏦</span> Money goes directly to your Razorpay account
              </li>
              <li className="flex items-start gap-3 text-sm font-medium text-neutral-600">
                <span className="text-lg leading-none">✅</span> Razorpay settles to your bank in 2-3 days
              </li>
            </ul>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-xs font-medium text-blue-800">
              TakeaBite charges ₹0 platform fee on Basic plan. Razorpay charges ~1.8% per transaction (industry standard).
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleConnect} className="p-8">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-1.5">Account Name</label>
              <input
                type="text"
                value={accountName}
                onChange={e => setAccountName(e.target.value)}
                placeholder="Your name or shop name on Razorpay"
                className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-50 focus:border-brand-500 outline-none transition-all"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-1.5">Key ID</label>
              <input
                type="text"
                value={keyId}
                onChange={e => setKeyId(e.target.value)}
                placeholder="rzp_test_xxxxx or rzp_live_xxxxx"
                className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-brand-50 focus:border-brand-500 outline-none transition-all"
              />
              <p className="text-xs font-medium text-neutral-400 mt-1.5">Starts with rzp_test_ (testing) or rzp_live_ (production)</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-1.5">Key Secret</label>
              <div className="relative">
                <input
                  type={showSecret ? "text" : "password"}
                  value={keySecret}
                  onChange={e => setKeySecret(e.target.value)}
                  placeholder="Enter your key secret"
                  className="w-full border border-neutral-200 rounded-xl px-4 py-3 pr-10 text-sm font-mono focus:ring-2 focus:ring-brand-50 focus:border-brand-500 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs font-medium text-neutral-400 mt-1.5 flex items-center gap-1">
                <Lock className="h-3 w-3" /> Found in Razorpay Dashboard → Settings → API Keys
              </p>
            </div>
          </div>

          {connectError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2">
              <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-red-600">{connectError}</p>
            </div>
          )}

          <div className="mt-8 flex flex-col items-center">
            <button
              type="submit"
              disabled={isConnecting}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
            >
              {isConnecting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Verifying keys...
                </>
              ) : (
                "Connect Razorpay Account"
              )}
            </button>
            <p className="text-xs font-bold text-neutral-400 mt-4 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" /> Your keys are stored securely. We never share them.
            </p>
          </div>
        </form>
      </div>

      <div className="mt-8 text-center px-4">
        <p className="text-sm font-bold text-neutral-600 mb-2">💡 Don't have a Razorpay account?</p>
        <p className="text-sm font-medium text-neutral-500">Create one free at razorpay.com. Approval takes 10 minutes. You can use test keys first.</p>
        <div className="mt-8 pt-6 border-t border-neutral-200">
          <p className="text-xs font-medium text-neutral-400">
            Customers can still pay cash at the counter without this setup.<br/>Online payment setup is optional.
          </p>
        </div>
      </div>
    </div>
  )

  const renderConnected = () => {
    // Calculate percentages
    const totalRev = revenueData?.totalRevenue || 0
    const onlineRev = revenueData?.onlineRevenue || 0
    const cashRev = revenueData?.cashRevenue || 0
    const onlinePct = totalRev > 0 ? Math.round((onlineRev / totalRev) * 100) : 0
    const cashPct = totalRev > 0 ? 100 - onlinePct : 0

    return (
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Banner */}
        <div className="bg-[#E9F7EF] border border-[#D5F0E1] rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-[#27AE60] text-white rounded-full flex items-center justify-center shrink-0 shadow-sm">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                Razorpay Connected
              </h2>
              <p className="text-sm font-medium text-neutral-600 mt-0.5">
                {connectionDetails?.accountName} • <span className="font-mono text-xs bg-white/50 px-1.5 py-0.5 rounded">{connectionDetails?.keyId}</span>
              </p>
            </div>
          </div>
          <div className="relative">
            <button 
              onClick={() => setShowManageDropdown(!showManageDropdown)}
              className="bg-white border border-[#27AE60]/30 text-[#27AE60] font-bold px-4 py-2 rounded-xl text-sm hover:bg-[#27AE60]/5 transition-colors flex items-center gap-2"
            >
              <Settings className="h-4 w-4" /> Manage
            </button>
            {showManageDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-neutral-200 shadow-xl rounded-2xl py-2 z-10 animate-in fade-in slide-in-from-top-2">
                <button 
                  onClick={() => { setShowManageDropdown(false); setIsConnected(false) }} 
                  className="w-full text-left px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Update Keys
                </button>
                <button 
                  onClick={handleDisconnect}
                  className="w-full text-left px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
                >
                  Disconnect Razorpay
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Date Range Tabs */}
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-neutral-900">Revenue Overview</h3>
          <div className="bg-neutral-100 p-1 rounded-xl inline-flex">
            {(['today', 'week', 'month'] as const).map(range => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${
                  dateRange === range 
                    ? 'bg-white text-brand-600 shadow-sm' 
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State for Data */}
        {isLoadingData && !revenueData ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
          </div>
        ) : (
          <>
            {/* Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-neutral-200/60 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-bold text-neutral-500">Total Revenue</span>
                </div>
                <h4 className="text-3xl font-black text-neutral-900">₹{totalRev.toLocaleString()}</h4>
              </div>

              <div className="bg-white border border-neutral-200/60 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-bold text-neutral-500">Online Payments</span>
                </div>
                <h4 className="text-3xl font-black text-neutral-900">₹{onlineRev.toLocaleString()}</h4>
              </div>

              <div className="bg-white border border-neutral-200/60 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                    <Banknote className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-bold text-neutral-500">Cash Collected</span>
                </div>
                <h4 className="text-3xl font-black text-neutral-900">₹{cashRev.toLocaleString()}</h4>
              </div>

              <div className="bg-orange-50 border border-orange-100 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 bg-white text-orange-600 rounded-xl flex items-center justify-center shadow-sm">
                    <Clock className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-bold text-orange-800">Pending Cash</span>
                </div>
                <h4 className="text-3xl font-black text-orange-600">₹{(revenueData?.pendingCashCollection || 0).toLocaleString()}</h4>
                <p className="text-xs font-bold text-orange-700/70 mt-1 uppercase tracking-wider">to collect</p>
              </div>
            </div>

            {/* Revenue Split */}
            {totalRev > 0 && (
              <div className="bg-white border border-neutral-200/60 rounded-3xl p-6 shadow-sm">
                <h4 className="text-sm font-bold text-neutral-700 mb-4">Revenue Split</h4>
                <div className="h-6 w-full flex rounded-full overflow-hidden mb-3">
                  <div style={{ width: `${onlinePct}%` }} className="bg-blue-500 transition-all duration-500"></div>
                  <div style={{ width: `${cashPct}%` }} className="bg-emerald-500 transition-all duration-500"></div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 bg-blue-500 rounded-sm"></div>
                    <span className="text-sm font-bold text-neutral-600">Online {onlinePct}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 bg-emerald-500 rounded-sm"></div>
                    <span className="text-sm font-bold text-neutral-600">Cash {cashPct}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Pending Notice */}
            {(revenueData?.pendingCashCollection || 0) > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-2xl flex items-center gap-3">
                <Clock className="h-5 w-5 text-yellow-600" />
                <p className="text-sm font-bold text-yellow-800">
                  You have ₹{revenueData.pendingCashCollection.toLocaleString()} in cash orders pending collection. Check your order board.
                </p>
              </div>
            )}

            {/* Recent Transactions Table */}
            <div className="bg-white border border-neutral-200/60 rounded-3xl shadow-sm overflow-hidden flex flex-col">
              <div className="px-6 py-5 border-b border-neutral-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-neutral-900">Recent Transactions</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-neutral-600">
                  <thead className="bg-neutral-50/50 text-xs uppercase text-neutral-500">
                    <tr>
                      <th className="px-6 py-4 font-bold">Order ID</th>
                      <th className="px-6 py-4 font-bold">Table</th>
                      <th className="px-6 py-4 font-bold">Amount</th>
                      <th className="px-6 py-4 font-bold">Method</th>
                      <th className="px-6 py-4 font-bold">Status</th>
                      <th className="px-6 py-4 font-bold">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {revenueData?.recentTransactions?.length > 0 ? (
                      revenueData.recentTransactions.map((tx: any) => (
                        <tr key={tx.id} className="hover:bg-neutral-50/60 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs font-semibold text-neutral-900">#{tx.id}</td>
                          <td className="px-6 py-4 font-bold">Table {tx.tableNumber}</td>
                          <td className="px-6 py-4 font-black text-neutral-900">₹{tx.amount}</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-bold text-neutral-600 border border-neutral-200">
                              {tx.method === 'online' ? <Smartphone className="h-3 w-3 text-blue-500" /> : <Banknote className="h-3 w-3 text-emerald-500" />}
                              {tx.method === 'online' ? 'Online' : 'Cash'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {tx.status === 'paid' ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                                <Check className="h-4 w-4" /> Paid
                              </span>
                            ) : tx.status === 'pending' ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600">
                                <Clock className="h-4 w-4" /> Collect
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600">
                                <XCircle className="h-4 w-4" /> Failed
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 font-medium">{tx.time}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-sm font-bold text-neutral-400">
                          No transactions in this period
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <OwnerLayout>
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-8 py-8 pb-24">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Payments & Revenue</h1>
          <p className="mt-1 text-sm font-medium text-neutral-500">Track your earnings and transaction history.</p>
        </div>

        {isConnected ? renderConnected() : renderNotConnected()}
      </div>
    </OwnerLayout>
  )
}
