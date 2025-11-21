import { HStack, Stack, Text } from "@chakra-ui/react"
import { OrderStatusBadge } from "./OrderStatusBadge"

export interface OrderHistoryEntry {
  id: string
  status: string
  created_at: string
  notes?: string | null
}

export function OrderTimeline({ history }: { history: OrderHistoryEntry[] }) {
  if (!history || history.length === 0)
    return <Text fontSize="sm">No status history yet.</Text>

  return (
    <Stack gap={3}>
      {history.map((h) => (
        <HStack key={h.id} gap={3} align="start">
          <OrderStatusBadge status={h.status} />
          <Stack gap={0} flex={1}>
            <Text fontSize="sm" fontWeight="semibold">
              {new Date(h.created_at).toLocaleString()}
            </Text>
            {h.notes && (
              <Text fontSize="xs" color="gray.600">
                {h.notes}
              </Text>
            )}
          </Stack>
        </HStack>
      ))}
    </Stack>
  )
}
