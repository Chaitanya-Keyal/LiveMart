import type { ProductPublic } from "@/client"

/**
 * Constructs full URL from image path
 * @param path - Image path from product (e.g., "/static/products/{id}/{filename}")
 * @returns Full URL to the image
 */
export const getProductImageUrl = (path: string): string => {
  if (!path) return ""

  // If path already starts with http, return as-is
  if (path.startsWith("http")) {
    return path
  }

  // Get API URL from environment
  const apiUrl = import.meta.env.VITE_API_URL.replace(/\/$/, "")

  // Ensure path starts with /
  const normalizedPath = path.startsWith("/") ? path : `/${path}`

  return `${apiUrl}${normalizedPath}`
}

/**
 * Extracts primary image URL from product or returns placeholder
 * @param product - Product object with images array
 * @returns URL to primary image or placeholder
 */
export const getPrimaryImageUrl = (
  product: ProductPublic | null | undefined,
): string => {
  if (!product) {
    return getPlaceholderImageUrl()
  }

  // Use primary_image if available
  if (product.primary_image) {
    return getProductImageUrl(product.primary_image)
  }

  // Find primary image in images array
  const primaryImage = product.images?.find((img) => img.is_primary)
  if (primaryImage) {
    return getProductImageUrl(primaryImage.path)
  }

  // Use first image if available
  if (product.images && product.images.length > 0) {
    return getProductImageUrl(product.images[0].path)
  }

  // Return placeholder if no images
  return getPlaceholderImageUrl()
}

/**
 * Gets placeholder image URL
 * @returns Placeholder image URL
 */
export const getPlaceholderImageUrl = (): string => {
  // Using a placeholder service or local placeholder
  return "https://via.placeholder.com/400x400?text=No+Image"
}

/**
 * Gets all image URLs from product
 * @param product - Product object with images array
 * @returns Array of image URLs
 */
export const getAllProductImageUrls = (
  product: ProductPublic | null | undefined,
): string[] => {
  if (!product || !product.images || product.images.length === 0) {
    return [getPlaceholderImageUrl()]
  }

  // Sort images by order and return URLs
  return product.images
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((img) => getProductImageUrl(img.path))
}
