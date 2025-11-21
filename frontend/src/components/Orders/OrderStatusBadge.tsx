import { Badge } from "@chakra-ui/react"

const COLOR_MAP: Record<string, string> = {
  pending: "status.pending",
  confirmed: "status.confirmed",
  preparing: "status.preparing",
  ready_to_ship: "status.ready_to_ship",
  delivery_partner_assigned: "status.delivery_partner_assigned",
  picked_up: "status.picked_up",
  out_for_delivery: "status.out_for_delivery",
  delivered: "status.delivered",
  cancelled: "status.cancelled",
  returned: "status.returned",
  refunded: "status.refunded",
}

export function OrderStatusBadge({ status }: { status: string }) {
  const color = COLOR_MAP[status] || "gray.400"
  return (
    <Badge
      px={3}
      py={1.5}
      borderRadius="full"
      bg={color}
      color="white"
      fontSize="xs"
      fontWeight="semibold"
      letterSpacing="wide"
      textTransform="capitalize"
      lineHeight="1.2"
    >
      {status.replace(/_/g, " ")}
    </Badge>
  )
}
