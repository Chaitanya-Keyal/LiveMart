import { useEffect, useState } from "react"

interface GeoState {
  lat: number | null
  lon: number | null
  loading: boolean
  error: string | null
}

export function useGeolocation(): GeoState {
  const [state, setState] = useState<GeoState>({
    lat: null,
    lon: null,
    loading: true,
    error: null,
  })
  useEffect(() => {
    if (!navigator.geolocation) {
      setState({
        lat: null,
        lon: null,
        loading: false,
        error: "Geolocation not supported",
      })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          loading: false,
          error: null,
        })
      },
      (err) => {
        setState({
          lat: null,
          lon: null,
          loading: false,
          error: err.message || "Permission denied",
        })
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }, [])
  return state
}
