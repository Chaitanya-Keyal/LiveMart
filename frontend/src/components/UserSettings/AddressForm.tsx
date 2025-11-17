import {
  Button,
  Collapsible,
  chakra,
  createListCollection,
  Input,
  SimpleGrid,
  Stack,
  Textarea,
} from "@chakra-ui/react"
import { Controller, useForm } from "react-hook-form"

import type { AddressLabelEnum } from "@/client"
import MapPicker from "@/components/UserSettings/MapPicker"
import { Field } from "@/components/ui/field"
import {
  SelectContent,
  SelectItem,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
} from "@/components/ui/select"
import { roundCoordinate } from "@/utils"

export type AddressFormValues = {
  street_address: string
  apartment_suite?: string | null
  city: string
  state: string
  postal_code: string
  country: string
  label: AddressLabelEnum
  custom_label?: string | null
  latitude?: number | null
  longitude?: number | null
  additional_notes?: string | null
}

type AddressFormProps = {
  defaultValues: AddressFormValues
  mode: "create" | "edit"
  onSubmit: (values: AddressFormValues) => void
  onCancel: () => void
  isSubmitting: boolean
}

const labelOptions: { value: AddressLabelEnum; label: string }[] = [
  { value: "home", label: "Home" },
  { value: "work", label: "Work" },
  { value: "other", label: "Other" },
  { value: "custom", label: "Custom" },
]

const labelCollection = createListCollection({
  items: labelOptions.map((option) => ({
    value: option.value,
    label: option.label,
  })),
})

const AddressForm = ({
  defaultValues,
  mode,
  onSubmit,
  onCancel,
  isSubmitting,
}: AddressFormProps) => {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AddressFormValues>({
    defaultValues,
  })

  const selectedLabel = watch("label")
  const longitude = watch("longitude")

  const handlePlaceSelect = (place: google.maps.places.PlaceResult) => {
    // Auto-fill address fields from place result
    const addressComponents = place.address_components || []

    let street = ""
    let city = ""
    let state = ""
    let postalCode = ""
    let country = ""

    for (const component of addressComponents) {
      const types = component.types

      if (types.includes("street_number")) {
        street = `${component.long_name} `
      } else if (types.includes("route")) {
        street += component.long_name
      } else if (types.includes("locality")) {
        city = component.long_name
      } else if (types.includes("administrative_area_level_1")) {
        state = component.short_name
      } else if (types.includes("postal_code")) {
        postalCode = component.long_name
      } else if (types.includes("country")) {
        country = component.long_name
      }
    }

    if (street) setValue("street_address", street.trim())
    if (city) setValue("city", city)
    if (state) setValue("state", state)
    if (postalCode) setValue("postal_code", postalCode)
    if (country) setValue("country", country)

    // If place has geometry, populate latitude & longitude too (helps when place select happens before onChange)
    const loc = (place as any)?.geometry?.location
    if (loc && typeof loc.lat === "function" && typeof loc.lng === "function") {
      setValue("latitude", roundCoordinate(loc.lat()), { shouldValidate: true })
      setValue("longitude", roundCoordinate(loc.lng()), {
        shouldValidate: true,
      })
    }
  }

  return (
    <chakra.form
      onSubmit={handleSubmit(onSubmit)}
      id="user-address-form"
      noValidate
    >
      <Stack gap={4}>
        <Field
          label="Label"
          required
          errorText={errors.label?.message}
          invalid={!!errors.label}
        >
          <Controller
            control={control}
            name="label"
            rules={{ required: "Label is required" }}
            render={({ field }) => (
              <SelectRoot
                name={field.name}
                collection={labelCollection}
                value={[field.value]}
                defaultValue={[defaultValues.label]}
                onValueChange={(details) => {
                  const nextLabel =
                    (details.value[0] as AddressLabelEnum) ?? "home"
                  field.onChange(nextLabel)
                  if (nextLabel !== "custom") {
                    setValue("custom_label", "", { shouldValidate: true })
                  }
                }}
                onInteractOutside={() => field.onBlur()}
              >
                <SelectTrigger>
                  <SelectValueText placeholder="Choose a label" />
                </SelectTrigger>
                <SelectContent zIndex={10001}>
                  {labelOptions.map((option) => (
                    <SelectItem
                      key={option.value}
                      item={{ value: option.value, label: option.label }}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectRoot>
            )}
          />
        </Field>

        <Collapsible.Root open={selectedLabel === "custom"}>
          <Collapsible.Content>
            <Field
              label="Custom label"
              required={selectedLabel === "custom"}
              invalid={!!errors.custom_label}
              errorText={errors.custom_label?.message}
            >
              <Input
                {...register("custom_label", {
                  required:
                    selectedLabel === "custom"
                      ? "Please provide a custom label"
                      : false,
                  maxLength: {
                    value: 255,
                    message: "Label must be under 255 characters",
                  },
                })}
                placeholder="e.g. Parents' Home"
              />
            </Field>
          </Collapsible.Content>
        </Collapsible.Root>

        <Field
          label="Drop a pin"
          required
          errorText={
            errors.latitude?.message || errors.longitude?.message || undefined
          }
        >
          <Controller
            control={control}
            name="latitude"
            rules={{ required: "Please pin your delivery location" }}
            render={({ field }) => (
              <MapPicker
                value={
                  typeof field.value === "number" &&
                  typeof longitude === "number"
                    ? { lat: field.value, lng: longitude }
                    : null
                }
                onChange={(coords) => {
                  field.onChange(coords.lat)
                  setValue("longitude", coords.lng, { shouldValidate: true })
                }}
                onPlaceSelect={handlePlaceSelect}
                error={
                  errors.latitude?.message ||
                  errors.longitude?.message ||
                  undefined
                }
              />
            )}
          />
          <input
            type="hidden"
            {...register("longitude", {
              required: true,
              valueAsNumber: true,
            })}
          />
        </Field>

        <Field
          label="Street address"
          required
          invalid={!!errors.street_address}
          errorText={errors.street_address?.message}
        >
          <Input
            {...register("street_address", {
              required: "Street address is required",
              maxLength: {
                value: 255,
                message: "Street address must be under 255 characters",
              },
            })}
            placeholder="123 Main St"
          />
        </Field>

        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          <Field label="Apartment / Suite" invalid={!!errors.apartment_suite}>
            <Input
              {...register("apartment_suite")}
              placeholder="Apt, Suite, etc."
            />
          </Field>
          <Field label="City" required invalid={!!errors.city}>
            <Input
              {...register("city", {
                required: "City is required",
                maxLength: 128,
              })}
              placeholder="City"
            />
          </Field>
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
          <Field label="State" required invalid={!!errors.state}>
            <Input
              {...register("state", {
                required: "State is required",
                maxLength: 128,
              })}
              placeholder="State"
              readOnly
              cursor="not-allowed"
            />
          </Field>
          <Field label="Postal code" required invalid={!!errors.postal_code}>
            <Input
              {...register("postal_code", {
                required: "Postal code is required",
                maxLength: 64,
              })}
              placeholder="Postal code"
              readOnly
              cursor="not-allowed"
            />
          </Field>
          <Field label="Country" required invalid={!!errors.country}>
            <Input
              {...register("country", {
                required: "Country is required",
                maxLength: 128,
              })}
              placeholder="Country"
              readOnly
              cursor="not-allowed"
            />
          </Field>
        </SimpleGrid>

        <Field label="Delivery notes" invalid={!!errors.additional_notes}>
          <Textarea
            {...register("additional_notes", {
              maxLength: 512,
            })}
            placeholder="Add extra instructions for the courier"
          />
        </Field>

        <Stack direction="row" justify="flex-end" gap={3} pt={4}>
          <Button variant="ghost" onClick={onCancel} type="button">
            Cancel
          </Button>
          <Button variant="solid" type="submit" loading={isSubmitting}>
            {mode === "create" ? "Save address" : "Update address"}
          </Button>
        </Stack>
      </Stack>
    </chakra.form>
  )
}

export default AddressForm
