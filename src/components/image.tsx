'use client'

import type React from 'react'
import { useEffect, useRef, useState } from 'react'

export interface ImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  fill?: boolean
  sizes?: string
  quality?: number
  priority?: boolean
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
  style?: React.CSSProperties
  className?: string
  onLoad?: () => void
  onError?: () => void
  unoptimized?: boolean
}

export const Image: React.FC<ImageProps> = ({
  src,
  alt,
  width,
  height,
  fill = false,
  sizes = '100vw',
  quality = 75,
  priority = false,
  placeholder = 'empty',
  blurDataURL,
  style,
  className = '',
  onLoad,
  onError,
  unoptimized = false,
}) => {
  const [isLoading, setIsLoading] = useState(true)
  const [_, setError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Generate srcSet for responsive images
  const generateSrcSet = () => {
    if (unoptimized) return undefined

    // For remote images, create a basic srcSet with 1x, 2x
    const widths = [1, 2]
    return widths
      .map((factor) => {
        const w = width ? width * factor : undefined
        const h = height ? height * factor : undefined
        const url = optimizeImageUrl(src, w, h, quality)
        return `${url} ${factor}x`
      })
      .join(', ')
  }

  // Simple client-side image URL optimization function
  // In a real implementation, you might use a third-party service
  const optimizeImageUrl = (
    url: string,
    w?: number,
    h?: number,
    q?: number,
  ): string => {
    if (unoptimized) return url

    // If it's a remote URL that supports image optimization (like Cloudinary, Imgix)
    if (url.includes('cloudinary.com')) {
      const params = []
      if (w) params.push(`w_${w}`)
      if (h) params.push(`h_${h}`)
      if (q) params.push(`q_${q}`)

      // Insert optimization parameters into Cloudinary URL
      return url.replace('/upload/', `/upload/${params.join(',')}/`)
    }

    // For other URLs, return as is (no optimization)
    return url
  }

  // Handle image loading
  const handleLoad = () => {
    setIsLoading(false)
    onLoad?.()
  }

  // Handle image error
  const handleError = () => {
    setIsLoading(false)
    setError(true)
    onError?.()
  }

  // Set up intersection observer for lazy loading
  useEffect(() => {
    if (priority || !imgRef.current) return

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // Load the image when it enters the viewport
          const img = entry.target as HTMLImageElement
          if (img.dataset.src) {
            img.src = img.dataset.src
          }
          if (img.dataset.srcset) {
            img.srcset = img.dataset.srcset
          }
          observerRef.current?.unobserve(img)
        }
      })
    })

    observerRef.current.observe(imgRef.current)

    return () => {
      observerRef.current?.disconnect()
    }
  }, [priority])

  // Compute styles
  const computedStyle: React.CSSProperties = {
    ...style,
  }

  if (fill) {
    computedStyle.position = 'absolute'
    computedStyle.height = '100%'
    computedStyle.width = '100%'
    computedStyle.inset = '0'
    computedStyle.objectFit = style?.objectFit || 'cover'
  }

  // Blur placeholder style
  const blurStyle: React.CSSProperties =
    placeholder === 'blur' && isLoading && blurDataURL
      ? {
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundImage: `url(${blurDataURL})`,
          filter: 'blur(20px)',
        }
      : {}

  // Combine all styles
  const finalStyle = {
    ...computedStyle,
    ...blurStyle,
  }

  // Prepare image attributes
  const imgAttributes: React.ImgHTMLAttributes<HTMLImageElement> = {
    src: priority ? src : undefined,
    // @ts-ignore define data-src for lazy loading
    'data-src': !priority ? src : undefined,
    srcSet: priority ? generateSrcSet() : undefined,
    'data-srcset': !priority ? generateSrcSet() : undefined,
    sizes,
    width: !fill ? width : undefined,
    height: !fill ? height : undefined,
    loading: priority ? 'eager' : 'lazy',
    decoding: 'async',
    style: finalStyle,
    className: `custom-image ${className} ${isLoading ? 'loading' : 'loaded'}`,
    alt,
    onLoad: handleLoad,
    onError: handleError,
    ref: imgRef,
  }

  return <img {...imgAttributes} />
}

export default Image
