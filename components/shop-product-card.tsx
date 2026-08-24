"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import {
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  ExternalLink,
  Heart,
  Camera,
  Maximize2,
  Sparkles,
} from "lucide-react"
import { InstagramIcon } from "@/components/icons/instagram-icon"
import type { Product } from "@/lib/supabase"

interface ShopProductCardProps {
  product: Product
  onOpenLightbox: (product: Product, index: number) => void
  currentImageIndex?: number
  onImageIndexChange?: (index: number) => void
}

export function ShopProductCard({
  product,
  onOpenLightbox,
  currentImageIndex = 0,
  onImageIndexChange,
}: ShopProductCardProps) {
  const images = product.images && product.images.length > 0 ? product.images : ["/placeholder.svg"]
  const totalImages = images.length
  const hasMultipleImages = totalImages > 1

  const [activeIndex, setActiveIndex] = useState(currentImageIndex)
  const [isExpanded, setIsExpanded] = useState(false)
  const [showHeart, setShowHeart] = useState(false)
  const [heartKey, setHeartKey] = useState(0)
  const [tapFlashSide, setTapFlashSide] = useState<"left" | "right" | null>(null)

  // Drag & Swipe states
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const dragStartXRef = useRef(0)
  const dragStartYRef = useRef(0)
  const dragStartTimeRef = useRef(0)
  const isHorizontalSwipeRef = useRef<boolean | null>(null)
  const lastTapTimeRef = useRef(0)

  // Sync external index if provided
  useEffect(() => {
    if (currentImageIndex !== activeIndex && currentImageIndex >= 0 && currentImageIndex < totalImages) {
      setActiveIndex(currentImageIndex)
    }
  }, [currentImageIndex, totalImages])

  const goToSlide = useCallback(
    (newIndex: number) => {
      let target = newIndex
      if (target < 0) target = totalImages - 1
      if (target >= totalImages) target = 0

      setIsAnimating(true)
      setDragOffset(0)
      setActiveIndex(target)
      onImageIndexChange?.(target)

      setTimeout(() => {
        setIsAnimating(false)
      }, 350)
    },
    [totalImages, onImageIndexChange]
  )

  const nextSlide = useCallback(() => {
    goToSlide(activeIndex + 1)
  }, [activeIndex, goToSlide])

  const prevSlide = useCallback(() => {
    goToSlide(activeIndex - 1)
  }, [activeIndex, goToSlide])

  // Trigger Instagram-style heart burst
  const triggerHeartBurst = () => {
    setHeartKey((prev) => prev + 1)
    setShowHeart(true)
    setTimeout(() => {
      setShowHeart(false)
    }, 850)
  }

  // ── Drag & Touch Handlers (Fluid 1:1 Instagram/Tinder Physics) ──
  const handleDragStart = (clientX: number, clientY: number) => {
    dragStartXRef.current = clientX
    dragStartYRef.current = clientY
    dragStartTimeRef.current = Date.now()
    isHorizontalSwipeRef.current = null
    setIsDragging(true)
    setIsAnimating(false)
  }

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging || !hasMultipleImages) return

    const deltaX = clientX - dragStartXRef.current
    const deltaY = clientY - dragStartYRef.current

    // Lock direction on first significant movement
    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6) {
        isHorizontalSwipeRef.current = Math.abs(deltaX) > Math.abs(deltaY)
      }
    }

    if (isHorizontalSwipeRef.current) {
      // Elastic resistance at edge boundaries
      let resistance = 1
      if ((activeIndex === 0 && deltaX > 0) || (activeIndex === totalImages - 1 && deltaX < 0)) {
        resistance = 0.4
      }
      setDragOffset(deltaX * resistance)
    }
  }

  const handleDragEnd = () => {
    if (!isDragging) return
    setIsDragging(false)

    const dragDuration = Date.now() - dragStartTimeRef.current
    const containerWidth = containerRef.current?.offsetWidth || 300
    const threshold = containerWidth * 0.18 // 18% drag threshold

    const wasHorizontal = isHorizontalSwipeRef.current
    isHorizontalSwipeRef.current = null

    // Check if it was a quick flick (high velocity)
    const isQuickFlick = dragDuration < 280 && Math.abs(dragOffset) > 25

    if (wasHorizontal && hasMultipleImages && (Math.abs(dragOffset) > threshold || isQuickFlick)) {
      if (dragOffset < 0) {
        // Dragged Left -> Next Slide
        goToSlide(activeIndex + 1)
      } else {
        // Dragged Right -> Prev Slide
        goToSlide(activeIndex - 1)
      }
    } else {
      // Snap back to current slide
      setIsAnimating(true)
      setDragOffset(0)
      setTimeout(() => setIsAnimating(false), 350)
    }
  }

  // Handle tap / click (Instagram story left/right tap, double-tap heart, center open)
  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // If user was actively dragging, don't register as tap
    if (Math.abs(dragOffset) > 8) return

    const now = Date.now()
    const timeSinceLastTap = now - lastTapTimeRef.current

    // Double-tap heart animation!
    if (timeSinceLastTap < 300) {
      triggerHeartBurst()
      lastTapTimeRef.current = 0
      return
    }
    lastTapTimeRef.current = now

    // Determine tap region (Instagram / Tinder story tap zones)
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const widthRatio = clickX / rect.width

    if (hasMultipleImages) {
      if (widthRatio < 0.25) {
        // Left 25% -> Previous Photo
        prevSlide()
        setTapFlashSide("left")
        setTimeout(() => setTapFlashSide(null), 300)
        return
      } else if (widthRatio > 0.75) {
        // Right 25% -> Next Photo
        nextSlide()
        setTapFlashSide("right")
        setTimeout(() => setTapFlashSide(null), 300)
        return
      }
    }

    // Center 50% -> Open full-screen photo lightbox
    onOpenLightbox(product, activeIndex)
  }

  // Key navigation when focused or hovered
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault()
      prevSlide()
    } else if (e.key === "ArrowRight") {
      e.preventDefault()
      nextSlide()
    }
  }

  const hasDiscount = product.old_price && product.old_price > product.price
  const discountPercent = hasDiscount
    ? Math.round(((product.old_price! - product.price) / product.old_price!) * 100)
    : 0

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col group/card focus:outline-none focus:ring-2 focus:ring-blue-500/40"
    >
      {/* ── Instagram / Tinder Photo Carousel Canvas ── */}
      <div
        ref={containerRef}
        onClick={handleCardClick}
        onTouchStart={(e) => handleDragStart(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => handleDragMove(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={handleDragEnd}
        onTouchCancel={handleDragEnd}
        onMouseDown={(e) => {
          if (e.button === 0) {
            handleDragStart(e.clientX, e.clientY)
          }
        }}
        onMouseMove={(e) => {
          if (isDragging) handleDragMove(e.clientX, e.clientY)
        }}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        className={`relative aspect-[4/3] bg-slate-950 overflow-hidden select-none touch-pan-y ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        {/* ── Slide Track with Real-Time 1:1 Dragging Physics ── */}
        <div
          className={`relative w-full h-full will-change-transform ${
            isAnimating ? "transition-transform duration-350 ease-[cubic-bezier(0.2,0.9,0.3,1)]" : ""
          }`}
          style={{
            transform: `translateX(${dragOffset}px) rotate(${dragOffset * 0.015}deg)`,
          }}
        >
          {/* Main Current Slide Image */}
          <img
            src={images[activeIndex]}
            alt={product.title}
            className="w-full h-full object-cover pointer-events-none"
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        </div>

        {/* Previous Image Peek (rendered during drag right) */}
        {hasMultipleImages && dragOffset > 0 && (
          <div
            className={`absolute inset-0 w-full h-full pointer-events-none will-change-transform ${
              isAnimating ? "transition-transform duration-350 ease-[cubic-bezier(0.2,0.9,0.3,1)]" : ""
            }`}
            style={{
              transform: `translateX(calc(-100% + ${dragOffset}px))`,
            }}
          >
            <img
              src={images[activeIndex > 0 ? activeIndex - 1 : totalImages - 1]}
              alt=""
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        )}

        {/* Next Image Peek (rendered during drag left) */}
        {hasMultipleImages && dragOffset < 0 && (
          <div
            className={`absolute inset-0 w-full h-full pointer-events-none will-change-transform ${
              isAnimating ? "transition-transform duration-350 ease-[cubic-bezier(0.2,0.9,0.3,1)]" : ""
            }`}
            style={{
              transform: `translateX(calc(100% + ${dragOffset}px))`,
            }}
          >
            <img
              src={images[activeIndex < totalImages - 1 ? activeIndex + 1 : 0]}
              alt=""
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        )}

        {/* ── Instagram / Tinder Story Segmented Bars at Top ── */}
        {hasMultipleImages && (
          <div className="absolute top-2 left-2 right-2 flex items-center gap-1 z-20 pointer-events-none">
            {images.map((_, idx) => (
              <div
                key={idx}
                className="h-1 flex-1 rounded-full overflow-hidden bg-black/30 backdrop-blur-xs transition-all"
              >
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    idx === activeIndex
                      ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]"
                      : idx < activeIndex
                      ? "bg-white/70"
                      : "bg-white/30"
                  }`}
                />
              </div>
            ))}
          </div>
        )}

        {/* ── Tap Flash Feedback (Instagram story tap response) ── */}
        {tapFlashSide === "left" && (
          <div className="absolute inset-y-0 left-0 w-1/3 bg-white/25 pointer-events-none animate-tap-flash z-15" />
        )}
        {tapFlashSide === "right" && (
          <div className="absolute inset-y-0 right-0 w-1/3 bg-white/25 pointer-events-none animate-tap-flash z-15" />
        )}

        {/* ── Instagram Heart Burst Animation (Double Tap) ── */}
        {showHeart && (
          <div
            key={heartKey}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30 animate-heart-burst drop-shadow-[0_8px_24px_rgba(236,72,153,0.7)]"
          >
            <Heart className="w-20 h-20 fill-pink-500 text-white stroke-[2]" />
          </div>
        )}

        {/* ── Badges Top-Left ── */}
        <div className="absolute top-4 left-2.5 flex flex-col gap-1 items-start z-10 pointer-events-none">
          {product.badge && (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-slate-900 shadow-sm border border-amber-300 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-amber-900" />
              <span>{product.badge}</span>
            </span>
          )}
          {hasDiscount && (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-600 text-white shadow-sm border border-red-500">
              -{discountPercent}%
            </span>
          )}
        </div>

        {/* ── Status Badge Top-Right ── */}
        <div className="absolute top-4 right-2.5 z-10 pointer-events-none">
          <span
            className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full shadow-sm backdrop-blur-md flex items-center gap-1 ${
              product.is_available
                ? "bg-emerald-600/90 text-white border border-emerald-400/50"
                : "bg-red-600/90 text-white border border-red-400/50"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                product.is_available ? "bg-white animate-pulse" : "bg-white/70"
              }`}
            />
            <span>{product.is_available ? "В наявності" : "Продано"}</span>
          </span>
        </div>

        {/* ── Image Counter Pill (Bottom Left) ── */}
        {hasMultipleImages && (
          <div className="absolute bottom-2.5 left-2.5 text-[10px] font-bold text-white bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full z-10 pointer-events-none flex items-center gap-1 border border-white/15">
            <Camera className="w-3 h-3" />
            <span>
              {activeIndex + 1} / {totalImages}
            </span>
          </div>
        )}

        {/* ── Expand Fullscreen Hint (Bottom Right) ── */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onOpenLightbox(product, activeIndex)
          }}
          className="absolute bottom-2.5 right-2.5 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md text-white/90 hover:text-white hover:bg-black/80 flex items-center justify-center transition-all z-10 border border-white/15 cursor-pointer opacity-75 hover:opacity-100"
          title="Відкрити на весь екран"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        {/* ── PC Floating Glass Navigation Arrows ── */}
        {hasMultipleImages && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation()
                prevSlide()
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md backdrop-blur-md flex items-center justify-center cursor-pointer transition-all duration-200 z-20 opacity-0 group-hover/card:opacity-100 hover:scale-110 active:scale-95 sm:flex hidden border border-white/40"
              title="Попереднє фото (←)"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                nextSlide()
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md backdrop-blur-md flex items-center justify-center cursor-pointer transition-all duration-200 z-20 opacity-0 group-hover/card:opacity-100 hover:scale-110 active:scale-95 sm:flex hidden border border-white/40"
              title="Наступне фото (→)"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}

        {/* ── Modern Dynamic Instagram Dots (Bottom Center) ── */}
        {hasMultipleImages && (
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10 pointer-events-none">
            {images.map((_, idx) => {
              const distance = Math.abs(idx - activeIndex)
              const isCurrent = idx === activeIndex
              return (
                <span
                  key={idx}
                  className={`rounded-full transition-all duration-300 ${
                    isCurrent
                      ? "w-4 h-1.5 bg-white shadow-sm"
                      : distance === 1
                      ? "w-1.5 h-1.5 bg-white/70"
                      : "w-1 h-1 bg-white/40"
                  }`}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* ── Product Info & Actions ── */}
      <div className="p-3.5 sm:p-4 flex-1 flex flex-col gap-2.5">
        {/* Source label for announcements */}
        {product.is_official === false && (
          <div className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">
            Оголошення · {product.author_name || "Організатор"}
          </div>
        )}

        {/* Title */}
        <h3 className="font-extrabold text-slate-900 text-sm sm:text-[15px] leading-snug line-clamp-2">
          {product.title}
        </h3>

        {/* Price Row */}
        <div className="flex items-baseline gap-2">
          <span className="text-lg sm:text-xl font-black text-blue-600">
            {product.price} ₴
          </span>
          {product.old_price && (
            <span className="text-xs font-semibold text-slate-400 line-through">
              {product.old_price} ₴
            </span>
          )}
          {hasDiscount && (
            <span className="text-[10px] font-black text-red-600 ml-auto">
              −{discountPercent}%
            </span>
          )}
        </div>

        {/* Description — expandable */}
        {product.description && (
          <div className="text-xs sm:text-[13px] text-slate-500 leading-relaxed whitespace-pre-line">
            <p className={isExpanded ? "" : "line-clamp-2"}>{product.description}</p>
            {product.description.length > 90 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-blue-600 font-bold text-[11px] mt-0.5 hover:underline cursor-pointer"
              >
                {isExpanded ? "Згорнути ↑" : "Читати далі ↓"}
              </button>
            )}
          </div>
        )}

        {/* Thumbnail Preview Strip */}
        {hasMultipleImages && (
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none pt-1 -mx-1 px-1">
            {images.map((img: string, idx: number) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation()
                  goToSlide(idx)
                }}
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg overflow-hidden shrink-0 transition-all cursor-pointer border-2 ${
                  activeIndex === idx
                    ? "border-blue-500 ring-2 ring-blue-400/30 opacity-100 scale-105 shadow-xs"
                    : "border-transparent opacity-50 hover:opacity-85"
                }`}
              >
                <img
                  src={img}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                  draggable={false}
                />
              </button>
            ))}
          </div>
        )}

        {/* CTA Button to Instagram */}
        <a
          href={product.instagram_url || "https://www.instagram.com/ks_fan.shop/"}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white font-extrabold text-xs shadow-md shadow-pink-500/15 hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer"
        >
          <InstagramIcon className="h-3.5 w-3.5" />
          <span>Замовити в Instagram</span>
          <ExternalLink className="h-3 w-3 opacity-70" />
        </a>
      </div>
    </div>
  )
}
