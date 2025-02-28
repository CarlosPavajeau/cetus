import { type CSSProperties, useEffect, useRef, useState } from 'react'

// Define TypeScript interfaces
type Props = {
  /**
   * Source URL of the image
   */
  src: string

  /**
   * Alternative text for the image
   */
  alt: string

  /**
   * Width of the image in pixels
   */
  width?: number

  /**
   * Height of the image in pixels
   */
  height?: number

  /**
   * Layout mode for the image
   */
  layout?: 'fill' | 'fixed' | 'responsive' | 'intrinsic'

  /**
   * CSS object-fit property for the image
   */
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'

  /**
   * Quality of the image (1-100)
   */
  quality?: number

  /**
   * Whether to show blur effect while loading
   */
  blurEffect?: boolean

  /**
   * Base64 encoded small image for the blur effect
   */
  placeholderSrc?: string

  /**
   * Whether to load the image with higher priority
   */
  priority?: boolean

  /**
   * Additional CSS class for the image
   */
  className?: string

  /**
   * Style object for the image
   */
  style?: CSSProperties

  /**
   * Any additional props to pass to the image
   */
  [key: string]: unknown
}
export const Image = ({
  src,
  alt,
  width,
  height,
  layout = 'responsive',
  objectFit = 'cover',
  quality = 75,
  blurEffect = true,
  placeholderSrc,
  priority = false,
  className = '',
  style = {},
  ...restProps
}: Props) => {
  const [isLoaded, setIsLoaded] = useState<boolean>(false)
  const [error, setError] = useState<boolean>(false)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Default low-quality placeholder if none provided
  const defaultPlaceholder =
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiB2aWV3Qm94PSIwIDAgNDAwIDMwMCI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiNmNmY2ZjYiLz48L3N2Zz4='

  // Set up lazy loading with IntersectionObserver
  useEffect(() => {
    if (!priority && imgRef.current && 'IntersectionObserver' in window) {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }

      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const img = entry.target as HTMLImageElement
              const dataSrc = img.getAttribute('data-src')

              // Trigger load if image is in viewport and data-src exists
              if (dataSrc) {
                img.setAttribute('src', dataSrc)
              }

              observerRef.current?.unobserve(img)
            }
          })
        },
        {
          rootMargin: '200px 0px', // Start loading before image is in viewport
        },
      )

      observerRef.current.observe(imgRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [priority, src])

  // Handle image loading completion
  const handleImageLoad = (): void => {
    setIsLoaded(true)
  }

  // Handle image loading error
  const handleImageError = (): void => {
    setError(true)
  }

  // Prepare image styles based on layout
  const getImageStyle = (): CSSProperties => {
    const baseStyle: CSSProperties = {
      objectFit,
    }

    switch (layout) {
      case 'fill':
        return {
          ...baseStyle,
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
        }
      case 'fixed':
        return {
          ...baseStyle,
          width: width ? `${width}px` : 'auto',
          height: height ? `${height}px` : 'auto',
        }
      case 'intrinsic':
        return {
          ...baseStyle,
          width: '100%',
          height: 'auto',
          maxWidth: width ? `${width}px` : '100%',
        }
      case 'responsive':
      default:
        return {
          ...baseStyle,
          width: '100%',
          height: 'auto',
          maxWidth: '100%',
        }
    }
  }

  // Add blur effect styles when applicable
  const getLoadingStyle = (): CSSProperties => {
    if (blurEffect && !isLoaded && !error) {
      return {
        filter: 'blur(20px)',
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        transition: 'filter 0.5s ease-in-out',
      }
    }
    return {}
  }

  // Combine computed styles with user-provided styles and loading styles
  const computedStyle = {
    ...getImageStyle(),
    ...getLoadingStyle(),
    ...style,
  }

  // If there's an error, return an error placeholder
  if (error) {
    return (
      <div
        className={`image-error ${className}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f3f3f3',
          color: '#666',
          padding: '20px',
          fontSize: '14px',
          textAlign: 'center',
          width: width ? `${width}px` : '100%',
          height: height ? `${height}px` : 'auto',
          ...style,
        }}
        {...restProps}
      >
        {alt || 'Image failed to load'}
      </div>
    )
  }

  // Pick out props that shouldn't be passed to the img
  const {
    quality: _,
    blurEffect: __,
    placeholderSrc: ___,
    ...imgProps
  } = restProps

  return (
    <img
      ref={imgRef}
      src={
        priority ? src : isLoaded ? src : placeholderSrc || defaultPlaceholder
      }
      data-src={!priority ? src : undefined}
      alt={alt}
      className={className}
      style={computedStyle}
      onLoad={handleImageLoad}
      onError={handleImageError}
      loading={priority ? 'eager' : 'lazy'}
      width={width}
      height={height}
      {...imgProps}
    />
  )
}
