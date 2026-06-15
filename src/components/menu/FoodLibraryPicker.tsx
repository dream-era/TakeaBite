/**
 * ============================================================
 * SERVEFLOW — FOOD LIBRARY PICKER COMPONENT
 * File: src/components/menu/FoodLibraryPicker.tsx
 *
 * A full-featured food picker that connects the food library
 * data to the Menu Management page. Owners can:
 *
 *   1. SEARCH — type to find items from 143 pre-built foods
 *   2. BROWSE — browse by category tabs
 *   3. ONE-CLICK ADD — click any item to add to menu
 *   4. BULK ADD — paste comma-separated names and add all at once
 *
 * HOW TO USE IN MENU MANAGEMENT PAGE:
 *   Import and render this component alongside the existing
 *   "Add New Item" button. It calls addMenuItem() from
 *   src/actions/menu.ts for each item added.
 *
 * PROPS:
 *   restaurantId: string  — current restaurant UUID
 *   onItemsAdded: (count: number) => void
 *                         — called after adding items so
 *                           the menu list refreshes
 *   onClose: () => void   — closes the picker modal/drawer
 * ============================================================
 */

'use client'

import { useState, useCallback, useTransition } from 'react'
import {
  FOOD_LIBRARY,
  searchFoodLibrary,
  parseBulkFoodInput,
  getAllCategories,
  getItemsByCategory,
  type FoodLibraryItem,
} from '@/data/foodLibrary'
import { addMenuItem } from '@/actions/menu'
import FoodImage from '@/components/shared/FoodImage'
import { useQueryClient } from '@tanstack/react-query'

// ─────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────
interface FoodLibraryPickerProps {
  restaurantId: string
  onItemsAdded: (count: number) => void
  onClose: () => void
}

// ─────────────────────────────────────────────
// ADD RESULT — track per-item add status
// ─────────────────────────────────────────────
type AddStatus = 'idle' | 'adding' | 'added' | 'error'

interface ItemAddState {
  [itemId: string]: AddStatus
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function FoodLibraryPicker({
  restaurantId,
  onItemsAdded,
  onClose,
}: FoodLibraryPickerProps) {
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()

  // ── View mode ─────────────────────────────
  type ViewMode = 'search' | 'browse' | 'bulk'
  const [viewMode, setViewMode] = useState<ViewMode>('search')

  // ── Search state ──────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<FoodLibraryItem[]>([])

  // ── Browse state ──────────────────────────
  const categories = getAllCategories()
  const [activeCategory, setActiveCategory] = useState(categories[0])
  const browseItems = getItemsByCategory(activeCategory)

  // ── Bulk state ────────────────────────────
  const [bulkText, setBulkText] = useState('')
  const [bulkParsed, setBulkParsed] = useState<{
    matched: FoodLibraryItem[]
    unmatched: string[]
  } | null>(null)
  const [bulkAdding, setBulkAdding] = useState(false)
  const [bulkProgress, setBulkProgress] = useState(0)

  // ── Item add state tracking ───────────────
  const [addStates, setAddStates] = useState<ItemAddState>({})

  // ── Toast messages ────────────────────────
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error'
  } | null>(null)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── SEARCH HANDLER ────────────────────────
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setSearchResults([])
      return
    }
    const results = searchFoodLibrary(query)
    setSearchResults(results)
  }, [])

  // ── BULK PARSE HANDLER ────────────────────
  const handleBulkParse = () => {
    if (!bulkText.trim()) return
    const result = parseBulkFoodInput(bulkText)
    setBulkParsed(result)
  }

  // ── SINGLE ITEM ADD ───────────────────────
  // Adds one item from the library to the restaurant menu.
  // Maps FoodLibraryItem to the addMenuItem() input shape.
  const handleAddItem = async (item: FoodLibraryItem) => {
    // Prevent double-add
    if (addStates[item.id] === 'added' || addStates[item.id] === 'adding') return

    setAddStates(prev => ({ ...prev, [item.id]: 'adding' }))

    startTransition(async () => {
      const result = await addMenuItem({
        restaurantId,
        name: item.name,
        category: item.category,
        price: item.defaultPrice,
        isVeg: item.isVeg,
        description: item.description,
        station: item.station,
        isAvailable: true,
        displayOrder: 0,
      })

      if (result.success) {
        setAddStates(prev => ({ ...prev, [item.id]: 'added' }))
        queryClient.invalidateQueries({ queryKey: ['menu', restaurantId] })
        onItemsAdded(1)
      } else {
        setAddStates(prev => ({ ...prev, [item.id]: 'error' }))
        showToast(result.error, 'error')
        // Reset error state after 3 seconds so user can retry
        setTimeout(() => {
          setAddStates(prev => ({ ...prev, [item.id]: 'idle' }))
        }, 3000)
      }
    })
  }

  // ── BULK ADD ──────────────────────────────
  // Adds all matched items one by one with progress tracking.
  const handleBulkAdd = async () => {
    if (!bulkParsed || bulkParsed.matched.length === 0) return

    setBulkAdding(true)
    setBulkProgress(0)
    let addedCount = 0
    const errors: string[] = []

    for (let i = 0; i < bulkParsed.matched.length; i++) {
      const item = bulkParsed.matched[i]

      // Skip already added items
      if (addStates[item.id] === 'added') {
        setBulkProgress(i + 1)
        addedCount++
        continue
      }

      const result = await addMenuItem({
        restaurantId,
        name: item.name,
        category: item.category,
        price: item.defaultPrice,
        isVeg: item.isVeg,
        description: item.description,
        station: item.station,
        isAvailable: true,
        displayOrder: i,
      })

      if (result.success) {
        setAddStates(prev => ({ ...prev, [item.id]: 'added' }))
        addedCount++
      } else {
        errors.push(item.name)
        setAddStates(prev => ({ ...prev, [item.id]: 'error' }))
      }

      setBulkProgress(i + 1)

      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 150))
    }

    setBulkAdding(false)
    queryClient.invalidateQueries({ queryKey: ['menu', restaurantId] })
    onItemsAdded(addedCount)

    if (errors.length === 0) {
      showToast(`${addedCount} items added to your menu!`, 'success')
    } else {
      showToast(
        `${addedCount} added. ${errors.length} failed: ${errors.join(', ')}`,
        'error'
      )
    }
  }

  // ── ITEM CARD ─────────────────────────────
  const ItemCard = ({ item }: { item: FoodLibraryItem }) => {
    const status = addStates[item.id] ?? 'idle'

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '10px 14px',
          borderRadius: 8,
          border: '0.5px solid #e5e7eb',
          marginBottom: 6,
          background: status === 'added' ? '#f0fdf4' : '#fff',
          gap: 12,
        }}
      >
        <FoodImage
          imageSlug={item.imageSlug}
          itemName={item.name}
          size="sm"
        />

        {/* Veg/Non-veg indicator */}
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: 2,
            border: `2px solid ${item.isVeg ? '#16a34a' : '#dc2626'}`,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: item.isVeg ? '#16a34a' : '#dc2626',
            }}
          />
        </div>

        {/* Item info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>
            {item.name}
          </div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>
            {item.category} · ₹{item.defaultPrice} ·{' '}
            <span style={{ color: item.station === 'juice' ? '#0891b2' : '#ea580c' }}>
              {item.station === 'juice' ? 'Juice station' : item.station === 'both' ? 'Both stations' : 'Chef station'}
            </span>
          </div>
        </div>

        {/* Add button */}
        <button
          onClick={() => handleAddItem(item)}
          disabled={status === 'adding' || status === 'added'}
          style={{
            padding: '5px 12px',
            borderRadius: 6,
            border: 'none',
            cursor: status === 'added' ? 'default' : 'pointer',
            fontSize: 12,
            fontWeight: 500,
            background:
              status === 'added'
                ? '#dcfce7'
                : status === 'adding'
                ? '#f3f4f6'
                : status === 'error'
                ? '#fee2e2'
                : '#E8570C',
            color:
              status === 'added'
                ? '#16a34a'
                : status === 'adding'
                ? '#9ca3af'
                : status === 'error'
                ? '#dc2626'
                : '#fff',
            minWidth: 70,
            transition: 'all 0.15s',
          }}
        >
          {status === 'added'
            ? '✓ Added'
            : status === 'adding'
            ? 'Adding...'
            : status === 'error'
            ? 'Retry'
            : '+ Add'}
        </button>
      </div>
    )
  }

  // ── RENDER ────────────────────────────────
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          width: '100%',
          maxWidth: 600,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        {/* ── HEADER ── */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '0.5px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>
              Add from Food Library
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
              {FOOD_LIBRARY.length} pre-built items — search, browse, or paste a list
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              border: '0.5px solid #e5e7eb',
              background: '#f9fafb',
              cursor: 'pointer',
              fontSize: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        {/* ── TAB SWITCHER ── */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            padding: '10px 20px',
            borderBottom: '0.5px solid #e5e7eb',
          }}
        >
          {(['search', 'browse', 'bulk'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 500,
                background: viewMode === mode ? '#E8570C' : '#f3f4f6',
                color: viewMode === mode ? '#fff' : '#374151',
                textTransform: 'capitalize',
              }}
            >
              {mode === 'bulk' ? '📋 Bulk paste' : mode === 'search' ? '🔍 Search' : '📂 Browse'}
            </button>
          ))}
        </div>

        {/* ── CONTENT ── */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>

          {/* SEARCH MODE */}
          {viewMode === 'search' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
              <div style={{ padding: '12px 20px', borderBottom: '0.5px solid #f3f4f6' }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="Search dosa, juice, burger, pasta..."
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px', minHeight: 0 }}>
                {!searchQuery && (
                  <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0', fontSize: 13 }}>
                    Type to search from {FOOD_LIBRARY.length} food items
                  </div>
                )}
                {searchQuery && searchResults.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0', fontSize: 13 }}>
                    No items found for &quot;{searchQuery}&quot;. Add it manually with the Add New Item button.
                  </div>
                )}
                {searchResults.map(item => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}

          {/* BROWSE MODE */}
          {viewMode === 'browse' && (
            <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
              {/* Category sidebar */}
              <div
                style={{
                  width: 140,
                  borderRight: '0.5px solid #e5e7eb',
                  overflowY: 'auto',
                  flexShrink: 0,
                }}
              >
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      textAlign: 'left',
                      border: 'none',
                      borderBottom: '0.5px solid #f3f4f6',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: activeCategory === cat ? 600 : 400,
                      background: activeCategory === cat ? '#fff7ed' : '#fff',
                      color: activeCategory === cat ? '#E8570C' : '#374151',
                      lineHeight: 1.3,
                    }}
                  >
                    {cat}
                    <span style={{ display: 'block', fontSize: 10, color: '#9ca3af', fontWeight: 400 }}>
                      {getItemsByCategory(cat).length} items
                    </span>
                  </button>
                ))}
              </div>

              {/* Items list */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 10 }}>
                  {activeCategory} · {browseItems.length} items
                </div>
                {browseItems.map(item => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}

          {/* BULK MODE */}
          {viewMode === 'bulk' && (
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                  Paste your food items (separated by comma or new line)
                </div>
                <textarea
                  value={bulkText}
                  onChange={e => {
                    setBulkText(e.target.value)
                    setBulkParsed(null)
                  }}
                  placeholder="Example:&#10;Dosa, Idli, Vada, Masala Dosa&#10;Mango Juice, Orange Juice&#10;Chicken Biryani, Veg Biryani"
                  rows={5}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    fontSize: 13,
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={handleBulkParse}
                  disabled={!bulkText.trim()}
                  style={{
                    marginTop: 8,
                    padding: '8px 20px',
                    background: '#111827',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    cursor: bulkText.trim() ? 'pointer' : 'not-allowed',
                    fontSize: 13,
                    fontWeight: 500,
                    opacity: bulkText.trim() ? 1 : 0.5,
                  }}
                >
                  Preview items →
                </button>
              </div>

              {/* Bulk parse results */}
              {bulkParsed && (
                <div>
                  {/* Matched items */}
                  {bulkParsed.matched.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{
                        fontSize: 12, fontWeight: 500, color: '#16a34a',
                        marginBottom: 8, display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span>✓ Found {bulkParsed.matched.length} items in library</span>
                        {!bulkAdding && (
                          <button
                            onClick={handleBulkAdd}
                            style={{
                              padding: '6px 16px',
                              background: '#E8570C',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 6,
                              cursor: 'pointer',
                              fontSize: 12,
                              fontWeight: 500,
                            }}
                          >
                            Add all {bulkParsed.matched.length} items →
                          </button>
                        )}
                      </div>

                      {/* Progress bar during bulk add */}
                      {bulkAdding && (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                            Adding {bulkProgress} / {bulkParsed.matched.length} items...
                          </div>
                          <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                            <div
                              style={{
                                height: '100%',
                                background: '#E8570C',
                                borderRadius: 3,
                                width: `${(bulkProgress / bulkParsed.matched.length) * 100}%`,
                                transition: 'width 0.2s',
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {bulkParsed.matched.map(item => (
                        <ItemCard key={item.id} item={item} />
                      ))}
                    </div>
                  )}

                  {/* Unmatched items */}
                  {bulkParsed.unmatched.length > 0 && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: '#d97706', marginBottom: 8 }}>
                        ⚠ {bulkParsed.unmatched.length} items not found in library
                        — add these manually
                      </div>
                      {bulkParsed.unmatched.map((name, i) => (
                        <div
                          key={i}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 6,
                            background: '#fffbeb',
                            border: '0.5px solid #fde68a',
                            marginBottom: 4,
                            fontSize: 12,
                            color: '#92400e',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <span>{name}</span>
                          <span style={{ fontSize: 11, color: '#b45309' }}>Add manually</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── TOAST ── */}
        {toast && (
          <div
            style={{
              position: 'absolute',
              bottom: 20,
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '8px 20px',
              borderRadius: 20,
              background: toast.type === 'success' ? '#16a34a' : '#dc2626',
              color: '#fff',
              fontSize: 12,
              fontWeight: 500,
              whiteSpace: 'nowrap',
              zIndex: 10,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            {toast.message}
          </div>
        )}
      </div>
    </div>
  )
}
