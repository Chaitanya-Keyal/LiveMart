import { useQuery } from "@tanstack/react-query"

const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "")

export const fetchProductAutocomplete = async (
  query: string,
  limit = 8,
  extraParams?: Record<string, string | number | boolean | null | undefined>,
): Promise<string[]> => {
  if (!apiUrl) throw new Error("VITE_API_URL not configured")
  const params = new URLSearchParams()
  params.set("q", query)
  params.set("limit", String(limit))
  if (extraParams) {
    for (const [k, v] of Object.entries(extraParams)) {
      if (v !== undefined && v !== null && v !== "") params.set(k, String(v))
    }
  }
  const url = `${apiUrl}/api/v1/products/search/autocomplete?${params.toString()}`
  const headers: Record<string, string> = {}
  const token = localStorage.getItem("access_token")
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`Autocomplete failed: ${res.status}`)
  return (await res.json()) as string[]
}

export const useProductAutocomplete = (
  query: string,
  options?: { enabled?: boolean; limit?: number },
) => {
  const enabled = options?.enabled ?? true
  const limit = options?.limit ?? 8
  return useQuery<string[]>({
    queryKey: ["product-autocomplete", query, limit],
    queryFn: () => fetchProductAutocomplete(query, limit),
    enabled: enabled && query.trim().length >= 2,
    staleTime: 60_000,
  })
}

export default useProductAutocomplete
