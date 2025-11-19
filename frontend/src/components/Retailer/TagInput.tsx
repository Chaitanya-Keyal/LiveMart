import { Badge, Box, Flex, Input, VStack } from "@chakra-ui/react"
import { useState } from "react"
import { FiX } from "react-icons/fi"

const COMMON_TAGS = [
  "featured",
  "local",
  "organic",
  "bestseller",
  "new",
  "sale",
  "premium",
  "eco-friendly",
  "handmade",
  "limited",
  "trending",
  "popular",
]

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
}

export const TagInput = ({ value, onChange }: TagInputProps) => {
  const [inputValue, setInputValue] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)

  const availableTags = COMMON_TAGS.filter((tag) => !value.includes(tag))

  const filteredSuggestions = availableTags.filter((tag) =>
    tag.toLowerCase().includes(inputValue.toLowerCase()),
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInputValue(val)
    setShowSuggestions(val.length > 0)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault()
      addTag(inputValue.trim())
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1])
    } else if (e.key === "Escape") {
      setShowSuggestions(false)
    }
  }

  const addTag = (tag: string) => {
    const normalizedTag = tag.toLowerCase().trim()
    if (normalizedTag && !value.includes(normalizedTag)) {
      onChange([...value, normalizedTag])
      setInputValue("")
      setShowSuggestions(false)
    }
  }

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag))
  }

  const handleSuggestionClick = (tag: string) => {
    addTag(tag)
  }

  return (
    <Box position="relative">
      <VStack align="stretch" gap={2}>
        <Flex
          wrap="wrap"
          gap={2}
          minH="40px"
          p={2}
          borderWidth={1}
          borderRadius="md"
        >
          {value.map((tag) => (
            <Badge
              key={tag}
              colorPalette="blue"
              variant="subtle"
              display="flex"
              alignItems="center"
              gap={1}
              px={2}
              py={1}
            >
              {tag}
              <Box
                as="button"
                onClick={() => removeTag(tag)}
                cursor="pointer"
                _hover={{ opacity: 0.7 }}
                ml={1}
              >
                <FiX size={12} />
              </Box>
            </Badge>
          ))}
          <Input
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            onFocus={() => setShowSuggestions(inputValue.length > 0)}
            onBlur={() => {
              // Delay to allow suggestion click
              setTimeout(() => setShowSuggestions(false), 200)
            }}
            placeholder={value.length === 0 ? "Type or select tags..." : ""}
            border="none"
            outline="none"
            flex={1}
            minW="120px"
            _focus={{ outline: "none", boxShadow: "none" }}
          />
        </Flex>

        {showSuggestions && filteredSuggestions.length > 0 && (
          <Box
            position="absolute"
            top="100%"
            left={0}
            right={0}
            zIndex={10}
            mt={1}
            bg="white"
            borderWidth={1}
            borderRadius="md"
            boxShadow="lg"
            maxH="200px"
            overflowY="auto"
          >
            <VStack align="stretch" p={2} gap={1}>
              {filteredSuggestions.slice(0, 8).map((tag) => (
                <Box
                  key={tag}
                  px={3}
                  py={2}
                  cursor="pointer"
                  borderRadius="md"
                  _hover={{ bg: "gray.100" }}
                  onClick={() => handleSuggestionClick(tag)}
                >
                  {tag}
                </Box>
              ))}
            </VStack>
          </Box>
        )}

        {availableTags.length > 0 && (
          <Box>
            <Box fontSize="xs" color="gray.600" mb={1}>
              Common tags:
            </Box>
            <Flex wrap="wrap" gap={1}>
              {availableTags.slice(0, 6).map((tag) => (
                <Badge
                  key={tag}
                  as="button"
                  variant="outline"
                  cursor="pointer"
                  fontSize="xs"
                  px={2}
                  py={1}
                  onClick={() => handleSuggestionClick(tag)}
                  _hover={{ bg: "gray.100" }}
                >
                  + {tag}
                </Badge>
              ))}
            </Flex>
          </Box>
        )}
      </VStack>
    </Box>
  )
}
