import { Box, IconButton, Input, Text, VStack } from "@chakra-ui/react"
import { useEffect, useRef, useState } from "react"
import { FiSearch, FiX } from "react-icons/fi"
import { useProductAutocomplete } from "@/hooks/useProductAutocomplete"

interface SearchBarProps {
  value: string
  onChange: (v: string) => void
  onClear?: () => void
  placeholder?: string
  debounceMs?: number
  enableAutocomplete?: boolean
  onSelectSuggestion?: (v: string) => void
}

export const SearchBar = ({
  value,
  onChange,
  onClear,
  placeholder = "Search products...",
  debounceMs = 300,
  enableAutocomplete = true,
  onSelectSuggestion,
}: SearchBarProps) => {
  const [internal, setInternal] = useState(value)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState<number>(-1)
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => setInternal(value), [value])

  useEffect(() => {
    const id = setTimeout(() => onChange(internal), debounceMs)
    return () => clearTimeout(id)
  }, [internal, onChange, debounceMs])

  const { data: suggestions = [] } = useProductAutocomplete(internal, {
    enabled: enableAutocomplete,
    limit: 8,
  })

  // Reset active index when suggestions change or menu closes
  useEffect(() => {
    if (!open || suggestions.length === 0) setActiveIndex(-1)
    else setActiveIndex(0)
  }, [suggestions, open])

  // Scroll active item into view for long lists
  useEffect(() => {
    if (!listRef.current) return
    const container = listRef.current
    const active = container.querySelector<HTMLElement>(
      `[data-index="${activeIndex}"]`,
    )
    if (active) {
      const cTop = container.scrollTop
      const cBottom = cTop + container.clientHeight
      const aTop = active.offsetTop
      const aBottom = aTop + active.offsetHeight
      if (aTop < cTop) container.scrollTop = aTop
      else if (aBottom > cBottom)
        container.scrollTop = aBottom - container.clientHeight
    }
  }, [activeIndex])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((prev) => (prev + 1) % suggestions.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex(
        (prev) => (prev - 1 + suggestions.length) % suggestions.length,
      )
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        e.preventDefault()
        const s = suggestions[activeIndex]
        setInternal(s)
        onChange(s)
        onSelectSuggestion?.(s)
        setOpen(false)
      }
    } else if (e.key === "Escape") {
      e.preventDefault()
      setOpen(false)
    }
  }

  return (
    <Box position="relative">
      <Box position="absolute" left={2} top="50%" transform="translateY(-50%)">
        <FiSearch />
      </Box>
      <Input
        pl="28px"
        pr="28px"
        value={internal}
        onChange={(e) => {
          setInternal(e.target.value)
          setOpen(true)
        }}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={handleKeyDown}
      />
      {internal ? (
        <IconButton
          aria-label="Clear"
          size="xs"
          variant="ghost"
          position="absolute"
          right={2}
          top="50%"
          transform="translateY(-50%)"
          onClick={() => {
            setInternal("")
            onClear?.()
          }}
        >
          <FiX />
        </IconButton>
      ) : null}

      {enableAutocomplete && open && suggestions.length > 0 && (
        <Box
          role="listbox"
          position="absolute"
          top="100%"
          left={0}
          right={0}
          mt={1}
          bg="bg"
          borderWidth="1px"
          borderColor="border"
          borderRadius="l2"
          shadow="sm"
          zIndex={10}
          overflow="hidden"
        >
          <VStack
            ref={listRef}
            align="stretch"
            maxH="320px"
            overflowY="auto"
            p={2}
            gap={1}
          >
            {suggestions.map((s, idx) => {
              const active = idx === activeIndex
              return (
                <Box
                  key={`${s}-${idx}`}
                  data-index={idx}
                  role="option"
                  aria-selected={active}
                  px={3}
                  py={2}
                  borderRadius="none"
                  bg={active ? "bg.muted" : "transparent"}
                  _hover={{ bg: "bg.subtle", cursor: "pointer" }}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setInternal(s)
                    onChange(s)
                    onSelectSuggestion?.(s)
                    setOpen(false)
                  }}
                >
                  <Text fontSize="sm" color="fg">
                    {s}
                  </Text>
                </Box>
              )
            })}
          </VStack>
        </Box>
      )}
    </Box>
  )
}

export default SearchBar
