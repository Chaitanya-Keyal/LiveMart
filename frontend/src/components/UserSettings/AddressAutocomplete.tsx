/// <reference types="google.maps" />

import { Input, type InputProps } from "@chakra-ui/react"
import { StandaloneSearchBox } from "@react-google-maps/api"
import { useRef } from "react"

import { useGoogleMaps } from "@/hooks/useGoogleMaps"

type AddressAutocompleteProps = {
  value: string
  onChange: (value: string) => void
  onPlaceSelect?: (place: google.maps.places.PlaceResult) => void
} & Pick<InputProps, "placeholder" | "onBlur" | "name" | "disabled">

const AddressAutocomplete = ({
  value,
  onChange,
  onPlaceSelect,
  placeholder,
  onBlur,
  name,
  disabled,
}: AddressAutocompleteProps) => {
  const { isLoaded, apiKey } = useGoogleMaps()
  const searchBoxRef = useRef<google.maps.places.SearchBox | null>(null)

  const handlePlacesChanged = () => {
    if (!searchBoxRef.current) return
    const places = searchBoxRef.current.getPlaces()
    if (!places || places.length === 0) return

    const place = places[0]
    const formatted = place.formatted_address || place.name || value || ""
    onChange(formatted)

    if (onPlaceSelect) {
      onPlaceSelect(place)
    }
  }

  const input = (
    <Input
      name={name}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      onBlur={onBlur}
      disabled={disabled}
    />
  )

  if (!apiKey || !isLoaded) {
    return input
  }

  return (
    <StandaloneSearchBox
      onLoad={(ref) => {
        searchBoxRef.current = ref
      }}
      onPlacesChanged={handlePlacesChanged}
    >
      {input}
    </StandaloneSearchBox>
  )
}

export default AddressAutocomplete
