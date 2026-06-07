'use client'
export const dynamic = 'force-dynamic';
/**
 * ============================================================
 * SERVEFLOW — ANALYTICS PAGE COMPONENT
 * File: src/app/(dashboard)/analytics/page.tsx
 *  OR   src/components/pages/AnalyticsPage.tsx
 *
 * Complete working Analytics page with all real data.
 * Replace the existing empty analytics page with this file.
 * ============================================================
 */


import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import {
  getFullAnalytics,
  exportAnalyticsReport,
} from '@/actions/analytics'

// ─────────────────────────────────────────────
// TYPES — inferred from server action returns
// ─────────────────────────────────────────────
type AnalyticsData = {
  health: {
    score: number
    status: string
    statusColor: string
    trend: 'up' | 'down' | 'stable'
    trendPercent: number
    details: string
  }
  weeklyStats: {
    ordersThisWeek: number
    ordersLastWeek: number
    ordersTrend: number
    revenueThisWeek: number
    revenueLastWeek: number
    revenueTrend: number
    topSellingItem: string | null
    topSellingCount: number
    peakTime: string | null
    peakTimeOrders: number
  }
  salesChart: {
    days: { date: string; dayName: string; orders: number; revenue: number }[]
    maxRevenue: number
    totalWeekRevenue: number
  }
  highDemand: {
    products: {
      rank: number; name: string; category: string
      orders: number; revenue: number; isVeg: boolean
      trend: 'up' | 'down' | 'stable'
    }[]
  }
  peakDay: { dayName: string; avgOrders: number; totalOrders: number; insight: string }
  bestSeller: { name: string; category: string; revenue: number; orders: number; isVeg: boolean; insight: string }
  lowDemand: { name: string; category: string; orders: number; isVeg: boolean; insight: string }
  prepInsight: { avgMinutes: number; insight: string; performance: string; todayOrders: number; servedToday: number }
}

// ─────────────────────────────────────────────
// MINI COMPONENTS
// ─────────────────────────────────────────────

// Trend badge — shows +12% ↑ or -5% ↓
function TrendBadge({ value }: { value: number }) {
  if (value === 0) return null
  const positive = value > 0
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 10,
      background: positive ? '#dcfce7' : '#fee2e2',
      color: positive ? '#16a34a' : '#dc2626',
    }}>
      {positive ? '↑' : '↓'} {Math.abs(value)}% vs last week
    </span>
  )
}

// Metric card — used for the 4 top stat cards
function MetricCard({
  icon, label, value, sub, trend, color = '#E8570C', loading
}: {
  icon: string; label: string; value: string
  sub?: string; trend?: number; color?: string; loading?: boolean
}) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, padding: '18px 20px',
      border: '1px solid #f0f0f0',
      boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
      flex: 1, minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: color + '15',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>{icon}</div>
        <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>{label}</span>
      </div>
      {loading ? (
        <div style={{ height: 28, background: '#f3f4f6', borderRadius: 6, width: '60%' }} />
      ) : (
        <div style={{ fontSize: 26, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
          {value}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {sub && <span style={{ fontSize: 11, color: '#9ca3af' }}>{sub}</span>}
        {trend !== undefined && <TrendBadge value={trend} />}
      </div>
    </div>
  )
}

// Bar chart — pure CSS, no library needed
function SalesBarChart({
  days, maxRevenue
}: {
  days: { dayName: string; orders: number; revenue: number }[]
  maxRevenue: number
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  if (days.length === 0 || maxRevenue === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: 180, color: '#9ca3af',
      }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
        <div style={{ fontSize: 13 }}>No chart data available</div>
        <div style={{ fontSize: 11, marginTop: 2 }}>Orders will appear here</div>
      </div>
    )
  }

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160 }}>
        {days.map((day, idx) => {
          const heightPct = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0
          const isHovered = hoveredIdx === idx
          const isToday = idx === days.length - 1

          return (
            <div
              key={day.dayName}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 4, cursor: 'pointer',
              }}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Tooltip */}
              {isHovered && (
                <div style={{
                  position: 'absolute', background: '#111827', color: '#fff',
                  padding: '4px 8px', borderRadius: 6, fontSize: 11,
                  whiteSpace: 'nowrap', zIndex: 10, marginTop: -36,
                  transform: 'translateX(-50%)',
                }}>
                  ₹{day.revenue.toLocaleString('en-IN')} · {day.orders} orders
                </div>
              )}

              {/* Amount label on hover */}
              <div style={{
                fontSize: 10, color: '#6b7280', fontWeight: 500,
                opacity: isHovered ? 1 : 0, transition: 'opacity 0.15s',
                whiteSpace: 'nowrap',
              }}>
                ₹{day.revenue > 999 ? (day.revenue / 1000).toFixed(1) + 'k' : day.revenue}
              </div>

              {/* Bar */}
              <div style={{
                width: '100%', borderRadius: '6px 6px 0 0',
                background: isToday
                  ? '#E8570C'
                  : isHovered ? '#f97316' : '#fde8d5',
                height: `${Math.max(heightPct, day.revenue > 0 ? 4 : 0)}%`,
                minHeight: day.revenue > 0 ? 4 : 0,
                transition: 'all 0.2s',
                position: 'relative',
              }} />

              {/* Day label */}
              <div style={{
                fontSize: 11, color: isToday ? '#E8570C' : '#6b7280',
                fontWeight: isToday ? 700 : 400,
              }}>
                {day.dayName}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Veg/non-veg indicator dot
function VegDot({ isVeg }: { isVeg: boolean }) {
  return (
    <div style={{
      width: 12, height: 12, borderRadius: 2, flexShrink: 0,
      border: `2px solid ${isVeg ? '#16a34a' : '#dc2626'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 5, height: 5, borderRadius: '50%',
        background: isVeg ? '#16a34a' : '#dc2626',
      }} />
    </div>
  )
}

// ─────────────────────────────────────────────
// SKELETON LOADER
// ─────────────────────────────────────────────
function Skeleton({ width = '100%', height = 20, radius = 6 }: {
  width?: string | number; height?: number; radius?: number
}) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
    }} />
  )
}

// ─────────────────────────────────────────────
// MAIN PAGE COMPONENT
// ─────────────────────────────────────────────
export default function AnalyticsPage() {
  const router = useRouter()
  const restaurantId = useAuthStore(s => s.restaurant?.id)
  const restaurantName = useAuthStore(s => s.restaurant?.name)
  const isOnboardingComplete = useAuthStore(s => s.restaurant?.onboarding_complete)

  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [showAllProducts, setShowAllProducts] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Load all analytics data
  const loadAnalytics = useCallback(async () => {
    if (!restaurantId) return
    setLoading(true)
    setError(null)

    const result = await getFullAnalytics()

    if (result.success) {
      setData(result.data as unknown as AnalyticsData)
      setLastUpdated(new Date())
    } else {
      setError(result.error)
    }
    setLoading(false)
  }, [restaurantId])

  // Load on mount
  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  // Auto-refresh every 30 minutes
  useEffect(() => {
    const interval = setInterval(loadAnalytics, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [loadAnalytics])

  // Real-time subscription
  useEffect(() => {
    if (!restaurantId) return
    const supabase = createBrowserSupabase()

    const channel = supabase
      .channel(`analytics_${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          setTimeout(() => loadAnalytics(), 2000)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          setTimeout(() => loadAnalytics(), 2000)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [restaurantId, loadAnalytics])

  // Export CSV
  const handleExport = async () => {
    setExporting(true)
    const result = await exportAnalyticsReport()
    if (result.success) {
      const blob = new Blob([result.data.csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = result.data.filename
      a.click()
      URL.revokeObjectURL(url)
    }
    setExporting(false)
  }

  const formatCurrency = (n: number) =>
    n >= 100000 ? `₹${(n / 100000).toFixed(1)}L`
    : n >= 1000 ? `₹${(n / 1000).toFixed(1)}k`
    : `₹${n}`

  const productsToShow = showAllProducts
    ? data?.highDemand.products ?? []
    : (data?.highDemand.products ?? []).slice(0, 5)

  if (!isOnboardingComplete) {
    return (
      <div style={{ padding: '40px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>
          Analytics not available yet
        </h2>
        <p style={{ fontSize: 14, color: '#6b7280', maxWidth: 400, margin: '8px auto 24px' }}>
          Complete your shop setup to start receiving orders.
          Analytics will populate automatically as orders come in.
        </p>
        <button
          onClick={() => router.push('/onboarding')}
          style={{
            padding: '10px 24px', background: '#E8570C',
            color: '#fff', border: 'none', borderRadius: 8,
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Complete Setup →
        </button>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '40px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>
          Analytics temporarily unavailable.
        </h2>
        <p style={{ fontSize: 14, color: '#dc2626', maxWidth: 400, margin: '8px auto 24px' }}>
          {error}
        </p>
        <button
          onClick={loadAnalytics}
          style={{
            padding: '10px 24px', background: '#E8570C',
            color: '#fff', border: 'none', borderRadius: 8,
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <>
      {/* Shimmer animation */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>

        {/* ── PAGE HEADER ── */}
        <div style={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', marginBottom: 24,
        }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: '#111827' }}>
              Analytics 📈
            </h1>
            <p style={{ fontSize: 14, color: '#6b7280', margin: '4px 0 0' }}>
              Understand your business performance and make smarter decisions.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {lastUpdated && (
              <span style={{ fontSize: 11, color: '#9ca3af' }}>
                Updated {lastUpdated.toLocaleTimeString('en-IN', {
                  hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
                })}
              </span>
            )}
            <button
              onClick={loadAnalytics}
              disabled={loading}
              style={{
                padding: '8px 14px', background: '#f3f4f6',
                border: '1px solid #e5e7eb', borderRadius: 8,
                fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer',
                color: '#374151', fontWeight: 500,
              }}
            >
              {loading ? '...' : '↻ Refresh'}
            </button>
            <button
              onClick={handleExport}
              disabled={exporting || !data}
              style={{
                padding: '8px 16px', background: '#111827',
                border: 'none', borderRadius: 8,
                fontSize: 12, cursor: 'pointer', color: '#fff', fontWeight: 500,
              }}
            >
              {exporting ? 'Exporting...' : '⬇ Export Report'}
            </button>
          </div>
        </div>



        {/* ── BUSINESS HEALTH BANNER ── */}
        <div style={{
          background: loading ? '#f9fafb' : (data?.health.score ?? 0) >= 60 ? '#f0fdf4' : '#fff7ed',
          border: `1px solid ${loading ? '#e5e7eb' : (data?.health.score ?? 0) >= 60 ? '#bbf7d0' : '#fed7aa'}`,
          borderRadius: 14, padding: '16px 20px', marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: loading ? '#e5e7eb' : (data?.health.statusColor ?? '#e5e7eb') + '20',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{ fontSize: 22 }}>
              {loading ? '⏳' : (data?.health.score ?? 0) >= 80 ? '🚀' : (data?.health.score ?? 0) >= 60 ? '✅' : (data?.health.score ?? 0) >= 40 ? '📊' : '⚠️'}
            </span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', color: '#6b7280' }}>
                BUSINESS HEALTH
              </span>
              {!loading && data && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 8px',
                  borderRadius: 20, background: data.health.statusColor + '20',
                  color: data.health.statusColor,
                }}>
                  {data.health.status}
                </span>
              )}
            </div>
            {loading ? (
              <Skeleton width="40%" height={22} />
            ) : (
              <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>
                {data?.health.details}
              </div>
            )}
          </div>
          {!loading && data && (
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{
                fontSize: 32, fontWeight: 800, color: data.health.statusColor
              }}>
                {data.health.score}
              </div>
              <div style={{ fontSize: 10, color: '#9ca3af' }}>/ 100</div>
            </div>
          )}
        </div>

        {/* ── METRIC CARDS ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
          gap: 14,
          marginBottom: 24
        }}>
          <MetricCard
            icon="🛒"
            label="Orders This Week"
            value={loading ? '...' : String(data?.weeklyStats.ordersThisWeek ?? 0)}
            sub={data?.weeklyStats.ordersLastWeek ? `${data.weeklyStats.ordersLastWeek} last week` : undefined}
            trend={data?.weeklyStats.ordersTrend}
            color="#E8570C"
            loading={loading}
          />
          <MetricCard
            icon="₹"
            label="Revenue This Week"
            value={loading ? '...' : formatCurrency(data?.weeklyStats.revenueThisWeek ?? 0)}
            sub={data?.weeklyStats.revenueLastWeek ? `${formatCurrency(data.weeklyStats.revenueLastWeek)} last week` : undefined}
            trend={data?.weeklyStats.revenueTrend}
            color="#16a34a"
            loading={loading}
          />
          <MetricCard
            icon="⭐"
            label="Top Selling Item"
            value={loading ? '...' : (data?.weeklyStats.topSellingItem ?? 'N/A')}
            sub={data?.weeklyStats.topSellingCount ? `${data.weeklyStats.topSellingCount} orders` : undefined}
            color="#d97706"
            loading={loading}
          />
          <MetricCard
            icon="🕐"
            label="Peak Time"
            value={loading ? '...' : (data?.weeklyStats.peakTime ?? 'N/A')}
            sub={data?.weeklyStats.peakTimeOrders ? `${data.weeklyStats.peakTimeOrders} orders at peak` : undefined}
            color="#7c3aed"
            loading={loading}
          />
        </div>

        {/* ── CHARTS SECTION ── */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 380px', gap: 20, marginBottom: 24 }}>

          {/* Sales bar chart */}
          <div style={{
            background: '#fff', borderRadius: 14, padding: '20px 24px',
            border: '1px solid #f0f0f0', boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>
                  📈 Sales This Week
                </div>
                {!loading && data && (
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                    Total: {formatCurrency(data.salesChart.totalWeekRevenue)}
                  </div>
                )}
              </div>
            </div>

            {loading ? (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160 }}>
                {[70, 40, 90, 55, 80, 35, 100].map((h, i) => (
                  <div key={i} style={{ flex: 1, background: '#f3f4f6', borderRadius: '4px 4px 0 0', height: `${h}%` }} />
                ))}
              </div>
            ) : (
              <SalesBarChart
                days={data?.salesChart.days ?? []}
                maxRevenue={data?.salesChart.maxRevenue ?? 0}
              />
            )}
          </div>

          {/* High demand products */}
          <div style={{
            background: '#fff', borderRadius: 14, padding: '20px 24px',
            border: '1px solid #f0f0f0', boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>
                🔥 High Demand Products
              </div>
              <button
                onClick={() => setShowAllProducts(!showAllProducts)}
                style={{
                  fontSize: 11, color: '#E8570C', background: 'none',
                  border: 'none', cursor: 'pointer', fontWeight: 600,
                }}
              >
                {showAllProducts ? 'Show less' : 'View All'}
              </button>
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1,2,3,4,5].map(i => <Skeleton key={i} height={36} radius={8} />)}
              </div>
            ) : productsToShow.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: '#9ca3af' }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>📦</div>
                <div style={{ fontSize: 12 }}>No products data</div>
                <div style={{ fontSize: 11, marginTop: 2 }}>Place orders to see demand</div>
              </div>
            ) : (
              <>
                <div style={{
                  display: 'grid', gridTemplateColumns: '24px 1fr 48px',
                  gap: '0 8px', marginBottom: 6,
                }}>
                  <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>#</span>
                  <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>PRODUCT</span>
                  <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textAlign: 'right' }}>ORDERS</span>
                </div>
                {productsToShow.map(p => (
                  <div key={p.rank} style={{
                    display: 'grid', gridTemplateColumns: '24px 1fr 48px',
                    gap: '0 8px', padding: '7px 0',
                    borderBottom: '0.5px solid #f3f4f6',
                    alignItems: 'center',
                  }}>
                    <span style={{
                      fontSize: 12, fontWeight: 700, color: p.rank <= 3 ? '#E8570C' : '#9ca3af'
                    }}>{p.rank}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      <VegDot isVeg={p.isVeg} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontSize: 12, fontWeight: 500, color: '#111827',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{p.name}</div>
                        <div style={{ fontSize: 10, color: '#9ca3af' }}>{p.category}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{p.orders}</span>
                      <span style={{
                        fontSize: 10, marginLeft: 3,
                        color: p.trend === 'up' ? '#16a34a' : p.trend === 'down' ? '#dc2626' : '#9ca3af'
                      }}>
                        {p.trend === 'up' ? '↑' : p.trend === 'down' ? '↓' : '–'}
                      </span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* ── INSIGHT CARDS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>

          {/* Peak Day */}
          <div style={{
            background: '#fff', borderRadius: 14, padding: '18px 20px',
            border: '1px solid #f0f0f0', boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 18 }}>📅</span>
              <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>Peak Day</span>
            </div>
            {loading ? <Skeleton height={28} width="60%" /> : (
              <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 4 }}>
                {data?.peakDay.dayName ?? 'N/A'}
              </div>
            )}
            <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.4 }}>
              {loading ? <Skeleton height={14} /> : (data?.peakDay.avgOrders ? `~${data.peakDay.avgOrders} orders avg` : 'Not enough data')}
            </div>
          </div>

          {/* Best Seller */}
          <div style={{
            background: '#fff', borderRadius: 14, padding: '18px 20px',
            border: '1px solid #f0f0f0', boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 18 }}>🏆</span>
              <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>Best Seller</span>
            </div>
            {loading ? <Skeleton height={28} width="80%" /> : (
              <div style={{
                fontSize: 15, fontWeight: 700, color: '#111827',
                marginBottom: 4, lineHeight: 1.3,
              }}>
                {data?.bestSeller.name ?? 'N/A'}
              </div>
            )}
            <div style={{ fontSize: 11, color: '#16a34a' }}>
              {loading ? <Skeleton height={14} /> : (data?.bestSeller.revenue ? formatCurrency(data.bestSeller.revenue) + ' this month' : 'No data')}
            </div>
          </div>

          {/* Low Demand Item */}
          <div style={{
            background: '#fff', borderRadius: 14, padding: '18px 20px',
            border: '1px solid #f0f0f0', boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 18 }}>⚠️</span>
              <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>Low Demand Item</span>
            </div>
            {loading ? <Skeleton height={28} width="80%" /> : (
              <div style={{
                fontSize: 15, fontWeight: 700, color: '#111827',
                marginBottom: 4, lineHeight: 1.3,
              }}>
                {data?.lowDemand.name ?? 'N/A'}
              </div>
            )}
            <div style={{ fontSize: 11, color: '#d97706' }}>
              {loading ? <Skeleton height={14} /> : (
                data?.lowDemand.orders === 0
                  ? 'Never ordered — consider removing'
                  : `${data?.lowDemand.orders} orders this month`
              )}
            </div>
          </div>

          {/* Preparation Insight */}
          <div style={{
            background: '#fff', borderRadius: 14, padding: '18px 20px',
            border: '1px solid #f0f0f0', boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 18 }}>⏱</span>
              <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>Kitchen Speed</span>
            </div>
            {loading ? <Skeleton height={28} width="50%" /> : (
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4, color: '#111827' }}>
                {data?.prepInsight.avgMinutes
                  ? `${data.prepInsight.avgMinutes} min`
                  : 'N/A'}
              </div>
            )}
            <div style={{ fontSize: 11, color: data?.prepInsight.performance === 'fast' ? '#16a34a' : data?.prepInsight.performance === 'slow' ? '#dc2626' : '#6b7280' }}>
              {loading ? <Skeleton height={14} /> : (
                data?.prepInsight.performance === 'fast' ? '🚀 Excellent speed!'
                : data?.prepInsight.performance === 'slow' ? '🐢 Could be faster'
                : data?.prepInsight.avgMinutes ? 'Good performance'
                : 'Complete orders to see'
              )}
            </div>
          </div>
        </div>

        {/* ── INSIGHTS ROW (detailed text) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>

          {/* Business insights */}
          <div style={{
            background: '#fff', borderRadius: 14, padding: '20px 24px',
            border: '1px solid #f0f0f0', boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: '#111827' }}>
              💡 Smart Insights
            </div>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1,2,3].map(i => <Skeleton key={i} height={16} />)}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  data?.peakDay.insight,
                  data?.bestSeller.insight,
                  data?.lowDemand.insight,
                  data?.prepInsight.insight,
                ].filter(Boolean).map((insight, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                    padding: '8px 10px', background: '#f9fafb',
                    borderRadius: 8, fontSize: 12, color: '#374151',
                    lineHeight: 1.5,
                  }}>
                    <span style={{ fontSize: 14, flexShrink: 0 }}>
                      {i === 0 ? '📅' : i === 1 ? '🏆' : i === 2 ? '⚠️' : '⏱'}
                    </span>
                    {insight}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Demand Forecast - Coming Soon */}
          <div style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
            borderRadius: 14, padding: '20px 24px',
            boxShadow: '0 1px 6px rgba(0,0,0,0.1)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
                  🤖 AI Demand Forecast
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 8px',
                  background: 'rgba(99,102,241,0.3)', color: '#a5b4fc',
                  borderRadius: 20, letterSpacing: '0.05em',
                }}>COMING SOON</span>
              </div>
            </div>
            <p style={{ fontSize: 12, color: '#c7d2fe', margin: '12px 0', lineHeight: 1.6 }}>
              Predict future demand using AI insights based on your order history.
            </p>
            {['Predict best-selling items', 'Forecast daily demand', 'Smart inventory suggestions', 'Reduce waste and increase profit']
              .map((feature, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  marginBottom: 6, fontSize: 12, color: '#a5b4fc',
                }}>
                  <span style={{ color: '#6366f1', fontSize: 14 }}>✓</span>
                  {feature}
                </div>
              ))}
          </div>
        </div>

        {/* ── QUICK ACTIONS ── */}
        <div style={{
          background: '#fff', borderRadius: 14, padding: '20px 24px',
          border: '1px solid #f0f0f0', boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 16 }}>
            ⚡ Quick Actions
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { icon: '➕', label: 'Add Menu Item', sub: 'Expand your menu', href: '/menu-management', color: '#E8570C' },
              { icon: '🔲', label: 'Generate QR', sub: 'Share your menu', href: '/qr-generation', color: '#0891b2' },
              { icon: '👤', label: 'Manage Staff', sub: 'Add or edit staff', href: '/staff-management', color: '#7c3aed' },
              { icon: '⬇', label: 'Export Report', sub: 'Download analytics', onClick: handleExport, color: '#16a34a' },
            ].map((action, i) => (
              <button
                key={i}
                onClick={action.onClick ?? (() => router.push(action.href!))}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', borderRadius: 10,
                  background: '#f9fafb', border: '1px solid #e5e7eb',
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
                onMouseLeave={e => (e.currentTarget.style.background = '#f9fafb')}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: action.color + '15',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, flexShrink: 0,
                }}>{action.icon}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{action.label}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{action.sub}</div>
                </div>
              </button>
            ))}
          </div>
          <div style={{
            fontSize: 11, color: '#9ca3af', textAlign: 'center',
            marginTop: 14, paddingTop: 12, borderTop: '0.5px solid #f3f4f6',
          }}>
            ⏱ Analytics data is updated every 30 minutes · Last refresh: {lastUpdated?.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) ?? 'Never'}
          </div>
        </div>

      </div>
    </>
  )
}
