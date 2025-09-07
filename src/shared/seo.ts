import type { Category, FindCategoryBySlugResponse } from '@/api/categories'
import type {
  ProductForSale,
  ProductVariantResponse,
  SimpleProductForSale,
} from '@/api/products'
import { getImageUrl } from '@/shared/cdn'

export interface SEOConfig {
  title: string
  description: string
  keywords?: string
  canonicalUrl?: string
  noIndex?: boolean
  noFollow?: boolean
  ogTitle?: string
  ogDescription?: string
  ogImage?: string
  ogType?: string
  ogUrl?: string
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player'
  twitterTitle?: string
  twitterDescription?: string
  twitterImage?: string
  structuredData?: object[]
}

export function generateProductSEO(
  product: ProductForSale,
  variant: ProductVariantResponse,
  storeName: string,
  baseUrl: string,
  reviews?: Array<{
    id: string
    rating: number
    comment: string
    customerName: string
    createdAt: string
  }>,
): SEOConfig {
  const productUrl = `${baseUrl}/products/${product.slug}`
  const mainImage = getImageUrl(
    variant.images?.[0]?.imageUrl || 'placeholder.svg',
  )

  // Generate optimized title (recommended 50-60 characters)
  const title = `${product.name} | ${storeName}`.slice(0, 60)

  // Generate meta description (recommended 150-160 characters)
  let description: string
  if (product.description) {
    description = `${product.description.slice(0, 120)}... Precio: ${variant.price.toLocaleString(
      'es-CO',
      {
        style: 'currency',
        currency: 'COP',
      },
    )} | ${storeName}`
  } else {
    let ratingText = ''
    if (product.rating) {
      ratingText = `⭐ ${product.rating}/5 (${product.reviewsCount} reseñas)`
    }
    description = `Compra ${product.name} en ${storeName}. Precio: ${variant.price.toLocaleString(
      'es-CO',
      {
        style: 'currency',
        currency: 'COP',
      },
    )}. ${ratingText}`
  }

  // Generate keywords
  const keywords = [
    product.name,
    product.category || '',
    storeName,
    'comprar online',
    'ecommerce',
    'tienda online',
  ]
    .filter(Boolean)
    .join(', ')

  // Product structured data (JSON-LD)
  const productStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description:
      product.description || `${product.name} disponible en ${storeName}`,
    image: mainImage ? [mainImage] : [],
    brand: {
      '@type': 'Brand',
      name: storeName,
    },
    offers: {
      '@type': 'Offer',
      price: variant.price,
      priceCurrency: 'COP', // Assuming Colombian Peso based on Spanish content
      availability:
        variant.stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      url: productUrl,
      seller: {
        '@type': 'Organization',
        name: storeName,
      },
    },
    ...(product.rating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.rating,
        reviewCount: product.reviewsCount || 0,
        bestRating: 5,
        worstRating: 1,
      },
    }),
    ...(reviews &&
      reviews.length > 0 && {
        review: reviews.map((review) => ({
          '@type': 'Review',
          reviewRating: {
            '@type': 'Rating',
            ratingValue: review.rating,
            bestRating: 5,
            worstRating: 1,
          },
          author: {
            '@type': 'Person',
            name: review.customerName,
          },
          reviewBody: review.comment,
          datePublished: review.createdAt,
        })),
      }),
    ...(product.category && {
      category: product.category,
    }),
    sku: variant.sku,
    url: productUrl,
  }

  // Breadcrumb structured data
  const breadcrumbStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Inicio',
        item: baseUrl,
      },
      ...(product.category
        ? [
            {
              '@type': 'ListItem',
              position: 2,
              name: product.category,
              item: `${baseUrl}/categories/${encodeURIComponent(product.categorySlug.toLowerCase())}`,
            },
          ]
        : []),
      {
        '@type': 'ListItem',
        position: product.category ? 3 : 2,
        name: product.name,
        item: productUrl,
      },
    ],
  }

  // Generate additional schemas
  const faqSchema = generateProductFAQSchema(product, variant, storeName)
  const organizationSchema = generateOrganizationSchema(storeName, baseUrl)

  return {
    title,
    description: description.slice(0, 160),
    keywords,
    canonicalUrl: productUrl,
    ogTitle: title,
    ogDescription: description.slice(0, 160),
    ogImage: mainImage,
    ogType: 'product',
    ogUrl: productUrl,
    twitterCard: 'summary_large_image',
    twitterTitle: title,
    twitterDescription: description.slice(0, 160),
    twitterImage: mainImage,
    structuredData: [
      productStructuredData,
      breadcrumbStructuredData,
      faqSchema,
      organizationSchema,
    ],
  }
}

export function generateSEOTags(config: SEOConfig) {
  const tags: Array<{
    name?: string
    property?: string
    content: string
    key?: string
  }> = []

  // Basic meta tags
  if (config.description) {
    tags.push({ name: 'description', content: config.description })
  }

  if (config.keywords) {
    tags.push({ name: 'keywords', content: config.keywords })
  }

  // Robots meta tag
  const robotsContent: string[] = []
  if (config.noIndex) {
    robotsContent.push('noindex')
  }
  if (config.noFollow) {
    robotsContent.push('nofollow')
  }
  if (robotsContent.length === 0) {
    robotsContent.push('index', 'follow')
  }

  tags.push({ name: 'robots', content: robotsContent.join(', ') })

  // Open Graph tags
  if (config.ogTitle) {
    tags.push({ property: 'og:title', content: config.ogTitle })
  }

  if (config.ogDescription) {
    tags.push({ property: 'og:description', content: config.ogDescription })
  }

  if (config.ogImage) {
    tags.push({ property: 'og:image', content: config.ogImage })
    tags.push({ property: 'og:image:alt', content: config.ogTitle || '' })
  }

  if (config.ogType) {
    tags.push({ property: 'og:type', content: config.ogType })
  }

  if (config.ogUrl) {
    tags.push({ property: 'og:url', content: config.ogUrl })
  }

  // Twitter Card tags
  if (config.twitterCard) {
    tags.push({ name: 'twitter:card', content: config.twitterCard })
  }

  if (config.twitterTitle) {
    tags.push({ name: 'twitter:title', content: config.twitterTitle })
  }

  if (config.twitterDescription) {
    tags.push({
      name: 'twitter:description',
      content: config.twitterDescription,
    })
  }

  if (config.twitterImage) {
    tags.push({ name: 'twitter:image', content: config.twitterImage })
  }

  return tags
}

// Utility function to generate JSON-LD script tag content
export function generateStructuredDataScript(structuredData: object[]): string {
  return structuredData
    .map(
      (data) =>
        `<script type="application/ld+json">${JSON.stringify(data, null, 2)}</script>`,
    )
    .join('\n')
}

// Generate FAQ structured data for common e-commerce questions
export function generateProductFAQSchema(
  product: ProductForSale,
  variant: ProductVariantResponse,
  storeName: string,
): object {
  const faqs = [
    {
      question: `¿Cuál es el precio de ${product.name}?`,
      answer: `El precio de ${product.name} es ${variant.price.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}.`,
    },
    {
      question: `¿${product.name} está disponible?`,
      answer:
        variant.stock > 0
          ? `Sí, ${product.name} está disponible en stock.`
          : `Lo sentimos, ${product.name} está actualmente agotado.`,
    },
    ...(product.category
      ? [
          {
            question: `¿A qué categoría pertenece ${product.name}?`,
            answer: `${product.name} pertenece a la categoría ${product.category}.`,
          },
        ]
      : []),
    {
      question: `¿Dónde puedo comprar ${product.name}?`,
      answer: `Puedes comprar ${product.name} en ${storeName}, nuestra tienda online.`,
    },
    ...(product.rating
      ? [
          {
            question: `¿Qué calificación tiene ${product.name}?`,
            answer: `${product.name} tiene una calificación de ${product.rating} de 5 estrellas, basada en ${product.reviewsCount || 0} reseñas de clientes.`,
          },
        ]
      : []),
  ]

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }
}

// Generate organization structured data
export function generateOrganizationSchema(
  storeName: string,
  baseUrl: string,
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: storeName,
    url: baseUrl,
    sameAs: [
      // Add social media links here when available
      'https://www.instagram.com/teledigital_jya_',
    ],
  }
}

// Generate homepage SEO configuration
export function generateHomepageSEO(
  storeName: string,
  baseUrl: string,
  featuredProducts?: SimpleProductForSale[],
  popularProducts?: SimpleProductForSale[],
  categories?: Category[],
): SEOConfig {
  // Generate optimized homepage title (recommended 50-60 characters)
  const title = storeName

  // Generate compelling meta description (recommended 150-160 characters)
  const productCount =
    (featuredProducts?.length || 0) + (popularProducts?.length || 0)
  const categoryNames =
    categories
      ?.slice(0, 3)
      .map((cat) => cat.name)
      .join(', ') || ''

  let description = `Descubre ${storeName}, tu tienda online de confianza. `
  if (productCount > 0) {
    description += `Más de ${productCount} productos`
  } else {
    description += 'Productos'
  }
  if (categoryNames) {
    description += ` en ${categoryNames}`
  }
  description += '. Envío rápido y precios increíbles.'

  // Generate homepage-specific keywords
  const categoryKeywords = categories?.map((cat) => cat.name) || []
  const keywords = [
    storeName,
    'tienda online',
    'comprar en línea',
    'ecommerce',
    'productos',
    'ofertas',
    'envío gratis',
    'Colombia',
    ...categoryKeywords,
  ].join(', ')

  // Create WebSite schema for search box
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: storeName,
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/products?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }

  // Create ItemList schema for featured products
  const featuredProductsSchema = featuredProducts?.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Productos Destacados',
        itemListElement: featuredProducts
          .slice(0, 10)
          .map((product, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            item: {
              '@type': 'Product',
              name: product.name,
              url: `${baseUrl}/products/${product.slug}`,
              image: getImageUrl(product.imageUrl),
              offers: {
                '@type': 'Offer',
                price: product.price,
                priceCurrency: 'COP',
                availability: 'https://schema.org/InStock',
              },
              ...(product.rating && {
                aggregateRating: {
                  '@type': 'AggregateRating',
                  ratingValue: product.rating,
                  reviewCount: product.reviewsCount || 0,
                },
              }),
            },
          })),
      }
    : null

  // Create Organization schema
  const organizationSchema = generateOrganizationSchema(storeName, baseUrl)

  // Create breadcrumb schema for homepage
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Inicio',
        item: baseUrl,
      },
    ],
  }

  // Create FAQ schema for common e-commerce questions
  const homepageFAQSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `¿Qué productos puedo encontrar en ${storeName}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `En ${storeName} encontrarás una amplia variedad de productos${
            categoryNames ? ` incluyendo ${categoryNames}` : ''
          }. Ofrecemos productos de alta calidad con envío rápido.`,
        },
      },
      {
        '@type': 'Question',
        name: '¿Hacen envíos a toda Colombia?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Sí, ${storeName} realiza envíos a toda Colombia. Consulta los costos de envío según tu ubicación.`,
        },
      },
      {
        '@type': 'Question',
        name: '¿Cuáles son los métodos de pago disponibles?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Aceptamos diversos métodos de pago para tu comodidad, incluyendo tarjetas de crédito, débito y otras opciones seguras.',
        },
      },
      {
        '@type': 'Question',
        name: '¿Tienen garantía los productos?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Todos los productos en ${storeName} cuentan con garantía. Las condiciones específicas varían según el producto.`,
        },
      },
    ],
  }

  const structuredData = [
    websiteSchema,
    organizationSchema,
    breadcrumbSchema,
    homepageFAQSchema,
    ...(featuredProductsSchema ? [featuredProductsSchema] : []),
  ]

  return {
    title,
    description: description.slice(0, 160),
    keywords,
    canonicalUrl: baseUrl,
    ogTitle: title,
    ogDescription: description.slice(0, 160),
    ogImage: featuredProducts?.[0]?.imageUrl || undefined,
    ogType: 'website',
    ogUrl: baseUrl,
    twitterCard: 'summary_large_image',
    twitterTitle: title,
    twitterDescription: description.slice(0, 160),
    twitterImage: featuredProducts?.[0]?.imageUrl || undefined,
    structuredData,
  }
}

export function generateCategorySEO(
  category: FindCategoryBySlugResponse,
  storeName: string,
  baseUrl: string,
  products?: SimpleProductForSale[],
): SEOConfig {
  const categoryUrl = `${baseUrl}/categories/${category.slug}`

  // Generate optimized category title (recommended 50-60 characters)
  const title = `${category.name} | ${storeName}`.slice(0, 60)

  // Generate compelling meta description (recommended 150-160 characters)
  const productCount = products?.length || 0
  const description = `Explora ${category.name} en ${storeName}. ${
    productCount > 0
      ? `${productCount} productos disponibles`
      : 'Productos de calidad'
  } con los mejores precios y envío rápido a toda Colombia.`

  // Generate category-specific keywords
  const keywords = [
    category.name,
    storeName,
    'comprar online',
    'tienda virtual',
    'productos',
    'ofertas',
    'envío Colombia',
    'precios',
    'calidad',
    ...(products?.slice(0, 5).map((p) => p.name) || []),
  ].join(', ')

  // Create BreadcrumbList schema
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Inicio',
        item: baseUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: category.name,
        item: categoryUrl,
      },
    ],
  }

  // Create CollectionPage schema
  const collectionPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${category.name} - ${storeName}`,
    description,
    url: categoryUrl,
    mainEntity: {
      '@type': 'ItemList',
      name: category.name,
      numberOfItems: productCount,
      ...(products?.length && {
        itemListElement: products.slice(0, 20).map((product, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'Product',
            name: product.name,
            url: `${baseUrl}/products/${product.slug}`,
            image: getImageUrl(product.imageUrl),
            ...(product.price && {
              offers: {
                '@type': 'Offer',
                price: product.price,
                priceCurrency: 'COP',
                availability: 'https://schema.org/InStock',
                url: `${baseUrl}/products/${product.slug}`,
              },
            }),
          },
        })),
      }),
    },
  }

  // Create FAQ schema for category
  const categoryFAQSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `¿Qué productos hay en ${category.name}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `En la categoría ${category.name} de ${storeName} encontrarás ${
            productCount > 0
              ? `${productCount} productos`
              : 'una selección de productos'
          } de alta calidad con los mejores precios.`,
        },
      },
      {
        '@type': 'Question',
        name: '¿Hacen envíos de estos productos?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Sí, todos los productos de ${category.name} tienen envío disponible a toda Colombia desde ${storeName}.`,
        },
      },
      {
        '@type': 'Question',
        name: '¿Los productos tienen garantía?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Todos los productos en ${category.name} cuentan con garantía. Las condiciones específicas varían según el producto.`,
        },
      },
    ],
  }

  const structuredData = [
    breadcrumbSchema,
    collectionPageSchema,
    categoryFAQSchema,
  ]

  return {
    title,
    description: description.slice(0, 160),
    keywords,
    canonicalUrl: categoryUrl,
    ogTitle: title,
    ogDescription: description.slice(0, 160),
    ogImage: products?.[0]?.imageUrl || undefined,
    ogType: 'website',
    ogUrl: categoryUrl,
    twitterCard: 'summary_large_image',
    twitterTitle: title,
    twitterDescription: description.slice(0, 160),
    twitterImage: products?.[0]?.imageUrl || undefined,
    structuredData,
  }
}
