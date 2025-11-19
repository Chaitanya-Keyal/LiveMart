import type { ApiError } from "./client"
import useCustomToast from "./hooks/useCustomToast"

export const COORDINATE_PRECISION = 6
export const DEFAULT_COORDINATE = {
  lat: 17.545067,
  lng: 78.571545,
}

export const roundCoordinate = (value: number) =>
  Number(value.toFixed(COORDINATE_PRECISION))

export const emailPattern = {
  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
  message: "Invalid email address",
}

export const namePattern = {
  value: /^[A-Za-z\s\u00C0-\u017F]{1,30}$/,
  message: "Invalid name",
}

export const passwordRules = (isRequired = true) => {
  const rules: any = {
    minLength: {
      value: 8,
      message: "Password must be at least 8 characters",
    },
  }

  if (isRequired) {
    rules.required = "Password is required"
  }

  return rules
}

export const confirmPasswordRules = (
  getValues: () => any,
  isRequired = true,
) => {
  const rules: any = {
    validate: (value: string) => {
      const password = getValues().password || getValues().new_password
      return value === password ? true : "The passwords do not match"
    },
  }

  if (isRequired) {
    rules.required = "Password confirmation is required"
  }

  return rules
}

export const handleError = (err: ApiError) => {
  const { showErrorToast } = useCustomToast()
  const errDetail = (err.body as { detail?: unknown })?.detail
  let errorMessage: string = "Something went wrong."

  if (typeof errDetail === "string") {
    errorMessage = errDetail
  } else if (Array.isArray(errDetail) && errDetail.length > 0) {
    const first = errDetail[0] as unknown
    const maybeMsg =
      typeof first === "object" &&
      first !== null &&
      "msg" in (first as { msg?: unknown })
        ? (first as { msg?: unknown }).msg
        : undefined
    if (typeof maybeMsg === "string") {
      errorMessage = maybeMsg
    }
  } else if (typeof (err as { message?: unknown })?.message === "string") {
    errorMessage = (err as { message?: string }).message ?? errorMessage
  }

  showErrorToast(errorMessage)
}

export const formatPrice = (price: string | number): string => {
  const numPrice = typeof price === "string" ? parseFloat(price) : price
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(numPrice)
}
