import { Button, HStack, Text } from "@chakra-ui/react"

interface Props {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

export function PaginationBar({ page, pageSize, total, onPageChange }: Props) {
  const maxPage = Math.max(1, Math.ceil(total / pageSize))
  return (
    <HStack justify="space-between" mt={6}>
      <Button
        size="sm"
        variant="outline"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
      >
        Previous
      </Button>
      <Text fontSize="sm">
        Page {page} / {maxPage}
      </Text>
      <Button
        size="sm"
        variant="outline"
        onClick={() => onPageChange(Math.min(maxPage, page + 1))}
        disabled={page >= maxPage}
      >
        Next
      </Button>
    </HStack>
  )
}
