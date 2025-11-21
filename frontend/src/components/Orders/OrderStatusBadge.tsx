import { Badge } from "@chakra-ui/react"

export function OrderStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      px={3}
      py={1.5}
      borderRadius="full"
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
