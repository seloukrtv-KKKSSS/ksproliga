"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import {
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Heart,
  Camera,
} from "lucide-react"
import { InstagramIcon } from "@/components/icons/instagram-icon"
import type { Product } from "@/lib/supabase"

interface ShopLightboxProps {
  product: Product | null
  initialIndex?: number
  onClose: () => void
}

export function ShopLightbox({
  product,
  initialIndex = 0,
  onClose,
}: ShopLightboxProps) {
  const images = product?.images && product.images.length > 0 ? product.images : ["/placeholder.svg"]
  const totalImages = images.length
  const hasMultipleImages = totalImages > 1

  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [showHeart, setShowHeart] = useState(false)
  const [heartKey, setHeartKey] = useState(0)

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

  useEffect(() => {
    setCurrentIndex(initialIndex)
  }, [initialIndex])

  const goToSlide = useCallback(
    (newIndex: number) => {
      let target = newIndex
      if (target < 0) target = totalImages - 1
      if (target >= totalImages) target = 0

      setIsAnimating(true)
      setDragOffset(0)
      setCurrentIndex(target)

      setTimeout(() => {
        setIsAnimating(false)
      }, 350)
    },
    [totalImages]
  )

  const nextSlide = useCallback(() => {
    goToSlide(currentIndex + 1)
  }, [currentIndex, goToSlide])

  const prevSlide = useCallback(() => {
    goToSlide(currentIndex - 1)
  }, [currentIndex, goToSlide])

  // Keyboard navigation & Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      } else if (e.key === "ArrowLeft") {
        prevSlide()
      } else if (e.key === "ArrowRight") {
        nextSlide()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose, prevSlide, nextSlide])

  // Double-tap heart animation
  const triggerHeartBurst = () => {
    setHeartKey((prev) => prev + 1)
    setShowHeart(true)
    setTimeout(() => {
      setShowHeart(false)
    }, 850)
  }

  // ── Drag & Touch Handlers for Lightbox ──
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

    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6) {
        isHorizontalSwipeRef.current = Math.abs(deltaX) > Math.abs(deltaY)
      }
    }

    if (isHorizontalSwipeRef.current) {
      let resistance = 1
      if ((currentIndex === 0 && deltaX > 0) || (currentIndex === totalImages - 1 && deltaX < 0)) {
        resistance = 0.45
      }
      setDragOffset(deltaX * resistance)
    }
  }

  const handleDragEnd = () => {
    if (!isDragging) return
    setIsDragging(false)

    const dragDuration = Date.now() - dragStartTimeRef.current
    const containerWidth = containerRef.current?.offsetWidth || window.innerWidth
    const threshold = containerWidth * 0.15

    const wasHorizontal = isHorizontalSwipeRef.current
    isHorizontalSwipeRef.current = null

    const isQuickFlick = dragDuration < 280 && Math.abs(dragOffset) > 25

    if (wasHorizontal && hasMultipleImages && (Math.abs(dragOffset) > threshold || isQuickFlick)) {
      if (dragOffset < 0) {
        goToSlide(currentIndex + 1)
      } else {
        goToSlide(currentIndex - 1)
      }
    } else {
      setIsAnimating(true)
      setDragOffset(0)
      setTimeout(() => setIsAnimating(false), 350)
    }
  }

  // Handle click / tap on lightbox canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (Math.abs(dragOffset) > 8) return

    const now = Date.now()
    const timeSinceLast = now - lastTapTimeRef.current

    // Double tap triggers heart
    if (timeSinceLast < 300) {
      triggerHeartBurst()
      lastTapTimeRef.current = 0
      return
    }
    lastTapTimeRef.current = now

    // Tap zones (Instagram story tap style)
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const widthRatio = clickX / rect.width

    if (hasMultipleImages) {
      if (widthRatio < 0.3) {
        prevSlide()
      } else if (widthRatio > 0.7) {
        nextSlide()
      }
    }
  }

  if (!product) return null

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-between animate-in fade-in duration-200 select-none overflow-hidden touch-none"
      onClick={onClose}
    >
      {/* ── Top Header / Instagram Story Bar ── */}
      <div
        className="w-full max-w-2xl px-4 pt-4 pb-2 z-30 flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Instagram / Tinder Story Segmented Bars */}
        {hasMultipleImages && (
          <div className="flex items-center gap-1.5 w-full">
            {images.map((_, idx) => (
              <div
                key={idx}
                onClick={() => goToSlide(idx)}
                className="h-1 flex-1 rounded-full overflow-hidden bg-white/20 hover:bg-white/40 transition-all cursor-pointer"
              >
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    idx === currentIndex
                      ? "bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)]"
                      : idx < currentIndex
                      ? "bg-white/70"
                      : "bg-white/25"
                  }`}
                />
              </div>
            ))}
          </div>
        )}

        {/* Top Info Bar */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-black truncate max-w-[200px] sm:max-w-md">
              {product.title}
            </span>
            <span className="text-xs text-blue-400 font-extrabold bg-blue-500/20 border border-blue-400/30 px-2 py-0.5 rounded-full shrink-0">
              {product.price} ₴
            </span>
          </div>

          <div className="flex items-center gap-2">
            {hasMultipleImages && (
              <div className="text-[11px] font-bold text-white/80 bg-white/15 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1 border border-white/15">
                <Camera className="w-3 h-3" />
                <span>
                  {currentIndex + 1} / {totalImages}
                </span>
              </div>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer"
              title="Закрити (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Gesture Canvas with 1:1 Live Slide Tracking ── */}
      <div
        ref={containerRef}
        onClick={handleCanvasClick}
        onTouchStart={(e) => handleDragStart(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => handleDragMove(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={handleDragEnd}
        onTouchCancel={handleDragEnd}
        onMouseDown={(e) => {
          if (e.button === 0) handleDragStart(e.clientX, e.clientY)
        }}
        onMouseMove={(e) => {
          if (isDragging) handleDragMove(e.clientX, e.clientY)
        }}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        className={`relative flex-1 w-full max-w-3xl flex items-center justify-center px-4 overflow-hidden select-none ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        {/* Main Track */}
        <div
          className={`relative max-w-full max-h-[72vh] flex items-center justify-center will-change-transform ${
            isAnimating ? "transition-transform duration-350 ease-[cubic-bezier(0.2,0.9,0.3,1)]" : ""
          }`}
          style={{
            transform: `translateX(${dragOffset}px) rotate(${dragOffset * 0.015}deg)`,
          }}
        >
          <img
            src={images[currentIndex]}
            alt={product.title}
            className="max-w-full max-h-[72vh] object-contain rounded-2xl shadow-2xl pointer-events-none select-none"
            draggable={false}
          />
        </div>

        {/* Previous Image Slide Peek */}
        {hasMultipleImages && dragOffset > 0 && (
          <div
            className={`absolute inset-0 flex items-center justify-center pointer-events-none will-change-transform ${
              isAnimating ? "transition-transform duration-350 ease-[cubic-bezier(0.2,0.9,0.3,1)]" : ""
            }`}
            style={{
              transform: `translateX(calc(-100% + ${dragOffset}px))`,
            }}
          >
            <img
              src={images[currentIndex > 0 ? currentIndex - 1 : totalImages - 1]}
              alt=""
              className="max-w-full max-h-[72vh] object-contain rounded-2xl shadow-2xl"
              draggable={false}
            />
          </div>
        )}

        {/* Next Image Slide Peek */}
        {hasMultipleImages && dragOffset < 0 && (
          <div
            className={`absolute inset-0 flex items-center justify-center pointer-events-none will-change-transform ${
              isAnimating ? "transition-transform duration-350 ease-[cubic-bezier(0.2,0.9,0.3,1)]" : ""
            }`}
            style={{
              transform: `translateX(calc(100% + ${dragOffset}px))`,
            }}
          >
            <img
              src={images[currentIndex < totalImages - 1 ? currentIndex + 1 : 0]}
              alt=""
              className="max-w-full max-h-[72vh] object-contain rounded-2xl shadow-2xl"
              draggable={false}
            />
          </div>
        )}

        {/* Heart Burst on Double Tap */}
        {showHeart && (
          <div
            key={heartKey}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-40 animate-heart-burst drop-shadow-[0_12px_32px_rgba(236,72,153,0.8)]"
          >
            <Heart className="w-24 h-24 fill-pink-500 text-white stroke-[2]" />
          </div>
        )}

        {/* Floating PC Navigation Arrows */}
        {hasMultipleImages && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation()
                prevSlide()
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/20 hover:bg-white/35 text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 z-30 border border-white/25 sm:flex hidden backdrop-blur-md"
              title="Попереднє фото (←)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                nextSlide()
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/20 hover:bg-white/35 text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 z-30 border border-white/25 sm:flex hidden backdrop-blur-md"
              title="Наступне фото (→)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {/* ── Bottom Controls & Thumbnail Strip & CTA ── */}
      <div
        className="w-full max-w-2xl px-4 pb-5 pt-2 z-30 flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Thumbnails */}
        {hasMultipleImages && (
          <div className="flex items-center justify-center gap-2 overflow-x-auto scrollbar-none py-1">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => goToSlide(idx)}
                className={`w-12 h-12 rounded-xl overflow-hidden shrink-0 transition-all cursor-pointer border-2 ${
                  currentIndex === idx
                    ? "border-blue-400 scale-110 shadow-lg shadow-blue-500/30 opacity-100 ring-2 ring-white/30"
                    : "border-transparent opacity-40 hover:opacity-80"
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* CTA Button in Lightbox */}
        <a
          href={product.instagram_url || "https://www.instagram.com/ks_fan.shop/"}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white font-black text-xs sm:text-sm shadow-xl shadow-pink-500/25 hover:shadow-2xl active:scale-[0.98] transition-all cursor-pointer"
        >
          <InstagramIcon className="w-4 h-4" />
          <span>Замовити в Instagram ({product.price} ₴)</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-75" />
        </a>
      </div>
    </div>
  )
}
