import { useJsApiLoader } from "@react-google-maps/api"

const libraries: ("places" | "geometry" | "drawing" | "visualization")[] = [
  "places",
]

export const useGoogleMaps = () => {
  const rawKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined
  // Sanitize key to remove potential trailing backslashes or quotes
  const apiKey = (rawKey || "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\\$/g, "")

  const { isLoaded, loadError } = useJsApiLoader({
    id: "livemart-google-maps",
    googleMapsApiKey: apiKey || "",
    libraries,
  })

  return {
    isLoaded,
    loadError,
    apiKey,
  }
}
