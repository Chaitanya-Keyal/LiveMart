import { Box, Flex, HStack, RatingGroup, Text } from "@chakra-ui/react"
import { FaStar } from "react-icons/fa"

interface StarRatingProps {
  value: number
  count?: number
  size?: "xs" | "sm" | "md" | "lg"
  readOnly?: boolean
  onChange?: (value: number) => void
  showCount?: boolean
}

export const StarRating = ({
  value,
  count,
  size = "md",
  readOnly = true,
  onChange,
  showCount = false,
}: StarRatingProps) => {
  return (
    <Flex align="center" gap={2}>
      <RatingGroup.Root
        count={5}
        value={value}
        size={size}
        readOnly={readOnly}
        onValueChange={(details) => onChange?.(details.value)}
        colorPalette="orange"
      >
        <RatingGroup.Control>
          {Array.from({ length: 5 }, (_, index) => (
            <RatingGroup.Item key={index} index={index + 1}>
              <RatingGroup.ItemIndicator icon={<FaStar />} />
            </RatingGroup.Item>
          ))}
        </RatingGroup.Control>
      </RatingGroup.Root>
      {showCount && count !== undefined && (
        <Text fontSize="sm" color="gray.600">
          ({count})
        </Text>
      )}
    </Flex>
  )
}

interface StarRatingInputProps {
  value: number
  onChange: (value: number) => void
  size?: "xs" | "sm" | "md" | "lg"
  required?: boolean
}

export const StarRatingInput = ({
  value,
  onChange,
  size = "lg",
  required = false,
}: StarRatingInputProps) => {
  return (
    <Box>
      <RatingGroup.Root
        count={5}
        value={value}
        size={size}
        readOnly={false}
        required={required}
        onValueChange={(details) => onChange(details.value)}
        colorPalette="orange"
      >
        <HStack gap={1}>
          <RatingGroup.Control>
            {Array.from({ length: 5 }, (_, index) => (
              <RatingGroup.Item key={index} index={index + 1}>
                <RatingGroup.ItemIndicator icon={<FaStar />} />
              </RatingGroup.Item>
            ))}
          </RatingGroup.Control>
        </HStack>
      </RatingGroup.Root>
    </Box>
  )
}
