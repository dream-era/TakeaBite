'use client'

import Image from 'next/image'
import { useState } from 'react'

interface FoodImageProps {
  imageSlug?: string | null   // from food library e.g. 'masala-dosa.jpg'
  imageUrl?: string | null    // from Supabase Storage (owner-uploaded custom image)
  itemName: string            // used for alt text and fallback initial
  size?: 'sm' | 'md' | 'lg'  // sm=60px, md=120px, lg=200px
  className?: string
  style?: React.CSSProperties
}

const SIZES = {
  sm: { width: 60,  height: 60  },
  md: { width: 120, height: 120 },
  lg: { width: 200, height: 150 },
}

export default function FoodImage({
  imageSlug,
  imageUrl,
  itemName,
  size = 'md',
  className,
  style,
}: FoodImageProps) {
  const [imgError, setImgError] = useState(false)
  const { width, height } = SIZES[size]

  // Priority order:
  // 1. Custom image uploaded by owner (imageUrl from Supabase Storage)
  // 2. Library image from public/food-images/ (imageSlug)
  // 3. Colored placeholder with item initial

  const src = !imgError
    ? (imageUrl || (imageSlug ? `/food-images/${imageSlug}` : null))
    : null

  if (!src) {
    // Colored placeholder — uses item name initial
    // Color based on first letter for visual variety
    const colors = [
      '#E8570C', '#16a34a', '#0891b2', '#7c3aed',
      '#db2777', '#d97706', '#059669', '#dc2626'
    ]
    const colorIndex = itemName.charCodeAt(0) % colors.length
    const bg = colors[colorIndex]
    const initial = itemName.charAt(0).toUpperCase()

    return (
      <div
        className={className}
        style={{
          width,
          height,
          borderRadius: size === 'lg' ? 12 : 8,
          background: bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: '#fff',
          fontSize: size === 'lg' ? 40 : size === 'md' ? 28 : 20,
          fontWeight: 700,
          letterSpacing: -1,
          ...style,
        }}
      >
        {initial}
      </div>
    )
  }

  return (
    <div
      className={className}
      style={{
        width,
        height,
        borderRadius: size === 'lg' ? 12 : 8,
        overflow: 'hidden',
        flexShrink: 0,
        background: '#f3f4f6',
        ...style,
      }}
    >
      <Image
        src={src}
        alt={itemName}
        width={width}
        height={height}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
        onError={() => setImgError(true)}
        loading="lazy"
      />
    </div>
  )
}
