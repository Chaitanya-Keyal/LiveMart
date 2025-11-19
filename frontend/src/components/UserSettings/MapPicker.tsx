/// <reference types="google.maps" />

import { Alert, Box, Input, Spinner, Stack, Text } from "@chakra-ui/react"
import { Autocomplete, GoogleMap, Marker } from "@react-google-maps/api"
import { useEffect, useMemo, useRef, useState } from "react"

import { useGoogleMaps } from "@/hooks/useGoogleMaps"
import { DEFAULT_COORDINATE, roundCoordinate } from "@/utils"

// Add global style for autocomplete dropdown
const autocompleteStyle = `
  .pac-container {
    z-index: 10000 !important;
    margin-top: 4px;
    border-radius: 8px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    pointer-events: auto !important;
  }
  .pac-item {
    cursor: pointer;
    pointer-events: auto !important;
  }
  .pac-item:hover {
    background-color: #f3f4f6;
  }
`

type MapPickerProps = {
  value: google.maps.LatLngLiteral | null
  onChange: (coords: google.maps.LatLngLiteral) => void
  onPlaceSelect?: (place: google.maps.places.PlaceResult) => void
  error?: string
}

const containerStyle = {
  width: "100%",
  height: "320px",
}

const DEFAULT_ZOOM = 15

const MapPicker = ({
  value,
  onChange,
  onPlaceSelect,
  error,
}: MapPickerProps) => {
  const { isLoaded, loadError, apiKey } = useGoogleMaps()
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [center, setCenter] = useState<google.maps.LatLngLiteral>(
    value ?? DEFAULT_COORDINATE,
  )
  const [markerPosition, setMarkerPosition] =
    useState<google.maps.LatLngLiteral | null>(value)

  // Inject style for autocomplete dropdown
  useEffect(() => {
    const styleEl = document.createElement("style")
    styleEl.textContent = autocompleteStyle
    document.head.appendChild(styleEl)
    return () => {
      styleEl.remove()
    }
  }, [])

  useEffect(() => {
    if (value) {
      setCenter(value)
      setMarkerPosition(value)
      return
    }

    if (!navigator.geolocation) {
      setCenter(DEFAULT_COORDINATE)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: roundCoordinate(position.coords.latitude),
          lng: roundCoordinate(position.coords.longitude),
        }
        setCenter(coords)
      },
      () => {
        setCenter(DEFAULT_COORDINATE)
      },
      { enableHighAccuracy: true, timeout: 5000 },
    )
  }, [value])

  const mapOptions = useMemo<google.maps.MapOptions>(
    () => ({
      disableDefaultUI: true,
      zoomControl: true,
    }),
    [],
  )

  const handleMapClick = (event: google.maps.MapMouseEvent) => {
    if (!event.latLng) return
    const coords = {
      lat: roundCoordinate(event.latLng.lat()),
      lng: roundCoordinate(event.latLng.lng()),
    }
    setCenter(coords)
    setMarkerPosition(coords)
    onChange(coords)
    // Reverse geocode the coordinates and call onPlaceSelect so parent can autofill
    if (
      typeof globalThis !== "undefined" &&
      (globalThis as { google?: typeof google })?.google?.maps?.Geocoder
    ) {
      const geocoder = new google.maps.Geocoder()
      geocoder.geocode({ location: coords }, (results, status) => {
        if (status === "OK" && results && results.length > 0) {
          const result = results[0]
          // Cast GeocoderResult -> PlaceResult (they share address_components and formatted_address)
          if (onPlaceSelect) {
            onPlaceSelect(result as unknown as google.maps.places.PlaceResult)
          }
        }
      })
    }
  }

  const handlePlacesChanged = () => {
    if (!autocompleteRef.current) return
    const place = autocompleteRef.current.getPlace()
    if (!place) return

    // Call onPlaceSelect first with full place details including address_components
    if (onPlaceSelect) {
      onPlaceSelect(place)
    }

    const location = place.geometry?.location
    if (!location) return

    const coords = {
      lat: roundCoordinate(location.lat()),
      lng: roundCoordinate(location.lng()),
    }
    setCenter(coords)
    setMarkerPosition(coords)
    onChange(coords)
  }

  if (!apiKey) {
    return (
      <Alert.Root status="warning" borderRadius="md">
        <Alert.Indicator />
        <Alert.Content>
          Add VITE_GOOGLE_MAPS_API_KEY to your .env to enable map selection.
        </Alert.Content>
      </Alert.Root>
    )
  }

  if (loadError) {
    return (
      <Alert.Root status="error" borderRadius="md">
        <Alert.Indicator />
        <Alert.Content>
          Unable to load Google Maps. Please try again later.
        </Alert.Content>
      </Alert.Root>
    )
  }

  if (!isLoaded) {
    return (
      <Stack
        justify="center"
        align="center"
        height={containerStyle.height}
        borderWidth="1px"
        borderRadius="lg"
      >
        <Spinner />
        <Text fontSize="sm" color="gray.600">
          Loading map...
        </Text>
      </Stack>
    )
  }

  return (
    <Stack gap={3} width="100%">
      <Box position="relative" width="100%" height="320px">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={DEFAULT_ZOOM}
          options={mapOptions}
          onClick={handleMapClick}
        >
          {markerPosition && <Marker position={markerPosition} />}
        </GoogleMap>
        <Box
          position="absolute"
          top={3}
          left="50%"
          transform="translateX(-50%)"
          zIndex={1000}
          width="calc(100% - 32px)"
          maxWidth="400px"
          pointerEvents="auto"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          <Autocomplete
            onLoad={(autocomplete) => {
              autocompleteRef.current = autocomplete
            }}
            onPlaceChanged={handlePlacesChanged}
            options={{
              fields: [
                "address_components",
                "formatted_address",
                "geometry",
                "name",
              ],
            }}
          >
            <Input
              placeholder="Search for a location"
              bg="white"
              color="gray.900"
              borderWidth="1px"
              borderColor="gray.300"
              boxShadow="lg"
              _placeholder={{ color: "gray.500" }}
              _focus={{
                borderColor: "blue.500",
                boxShadow: "0 0 0 1px var(--chakra-colors-blue-500)",
              }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            />
          </Autocomplete>
        </Box>
      </Box>
      <Text fontSize="sm" color="gray.600">
        {markerPosition
          ? `Lat: ${markerPosition.lat.toFixed(6)} | Lng: ${markerPosition.lng.toFixed(6)}`
          : "Search or tap on the map to pin your delivery location."}
      </Text>
      {error && (
        <Text fontSize="sm" color="red.500">
          {error}
        </Text>
      )}
    </Stack>
  )
}

export default MapPicker
