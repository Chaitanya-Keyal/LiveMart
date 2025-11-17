import { useJsApiLoader } from "@react-google-maps/api"

const libraries: ("places" | "geometry" | "drawing" | "visualization")[] = [
  "places",
]

export const useGoogleMaps = () => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

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
