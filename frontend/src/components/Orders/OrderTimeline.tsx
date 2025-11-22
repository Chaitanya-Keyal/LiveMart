import { Box, HStack, Stack, Text } from "@chakra-ui/react"
import { FiCheckCircle, FiCircle } from "react-icons/fi"
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
    <Stack gap={0} position="relative" pl={8}>
      {/* Timeline line */}
      <Box
        position="absolute"
        left="11px"
        top="16px"
        bottom="16px"
        width="2px"
        bg="border.default"
      />

      {history.map((h, index) => (
        <HStack key={h.id} gap={4} align="start" py={3} position="relative">
          {/* Timeline dot */}
          <Box position="absolute" left="-32px" top="16px" zIndex={1}>
            {index === 0 ? (
              <FiCheckCircle
                size={24}
                style={{
                  color: "var(--chakra-colors-brand-primary)",
                  fill: "var(--chakra-colors-brand-primary)",
                  stroke: "white",
                  strokeWidth: 2,
                }}
              />
            ) : (
              <FiCircle
                size={24}
                style={{
                  color: "var(--chakra-colors-fg-muted)",
                  fill: "var(--chakra-colors-bg-surface)",
                }}
              />
            )}
          </Box>

          <Stack gap={2} flex={1}>
            <HStack gap={3} flexWrap="wrap">
              <OrderStatusBadge status={h.status} />
              <Text fontSize="sm" fontWeight="600" color="fg.muted">
                {new Date(h.created_at).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </HStack>
            {h.notes && (
              <Text fontSize="sm" color="fg.muted">
                {h.notes}
              </Text>
            )}
          </Stack>
        </HStack>
      ))}
    </Stack>
  )
}
