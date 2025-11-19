import {
  Box,
  Button,
  Checkbox,
  HStack,
  Input,
  NativeSelect,
  Text,
  VStack,
} from "@chakra-ui/react"
import type { CategoryEnum } from "@/client"

interface FilterSidebarProps {
  category: CategoryEnum | null
  onCategoryChange: (c: CategoryEnum | null) => void
  brands: string[]
  onBrandsChange: (b: string[]) => void
  tags: string[]
  onTagsChange: (t: string[]) => void
  inStockOnly: boolean
  onInStockOnlyChange: (v: boolean) => void
  minPrice: number | null
  maxPrice: number | null
  onPriceChange: (min: number | null, max: number | null) => void
  latitude: number | null
  longitude: number | null
  radiusKm: number | null
  onRadiusChange: (v: number | null) => void
  sortBy: "newest" | "price_asc" | "price_desc" | "distance_asc"
  onSortByChange: (
    v: "newest" | "price_asc" | "price_desc" | "distance_asc",
  ) => void
  onClearFilters: () => void
}

const CATEGORY_OPTIONS: Array<{ value: CategoryEnum; label: string }> = [
  { value: "electronics", label: "Electronics" },
  { value: "clothing", label: "Clothing" },
  { value: "food_beverage", label: "Food & Beverage" },
  { value: "home_garden", label: "Home & Garden" },
  { value: "health_beauty", label: "Health & Beauty" },
  { value: "sports", label: "Sports" },
  { value: "toys", label: "Toys" },
  { value: "books", label: "Books" },
  { value: "automotive", label: "Automotive" },
  { value: "office_supplies", label: "Office Supplies" },
  { value: "pet_supplies", label: "Pet Supplies" },
  { value: "jewellery", label: "Jewellery" },
  { value: "furniture", label: "Furniture" },
]

export const FilterSidebar = (props: FilterSidebarProps) => {
  const {
    category,
    onCategoryChange,
    brands,
    onBrandsChange,
    tags,
    onTagsChange,
    inStockOnly,
    onInStockOnlyChange,
    minPrice,
    maxPrice,
    onPriceChange,
    radiusKm,
    onRadiusChange,
    sortBy,
    onSortByChange,
    onClearFilters,
  } = props

  return (
    <VStack align="stretch" gap={4}>
      <HStack justify="space-between">
        <Text fontWeight="semibold">Filters</Text>
        <Button size="xs" variant="ghost" onClick={onClearFilters}>
          Clear all
        </Button>
      </HStack>

      <Box>
        <Text fontSize="sm" mb={2}>
          Category
        </Text>
        <NativeSelect.Root>
          <NativeSelect.Field
            value={category || ""}
            onChange={(e) =>
              onCategoryChange((e.target.value || null) as CategoryEnum | null)
            }
          >
            <option value="">All Categories</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </NativeSelect.Field>
        </NativeSelect.Root>
      </Box>

      <Box>
        <Text fontSize="sm" mb={2}>
          Brands (comma separated)
        </Text>
        <Input
          value={brands.join(", ")}
          onChange={(e) =>
            onBrandsChange(
              e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
          placeholder="e.g. Nike, Adidas"
        />
      </Box>

      <Box>
        <Text fontSize="sm" mb={2}>
          Tags (comma separated)
        </Text>
        <Input
          value={tags.join(", ")}
          onChange={(e) =>
            onTagsChange(
              e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
          placeholder="e.g. featured, bestseller"
        />
      </Box>

      <Box>
        <Text fontSize="sm" mb={2}>
          Price
        </Text>
        <HStack>
          <Input
            type="number"
            placeholder="Min"
            value={minPrice ?? ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onPriceChange(
                e.target.value ? Number(e.target.value) : null,
                maxPrice,
              )
            }
          />
          <Input
            type="number"
            placeholder="Max"
            value={maxPrice ?? ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onPriceChange(
                minPrice,
                e.target.value ? Number(e.target.value) : null,
              )
            }
          />
        </HStack>
      </Box>

      <Checkbox.Root
        checked={inStockOnly}
        onCheckedChange={(e) => onInStockOnlyChange(!!e.checked)}
      >
        <Checkbox.HiddenInput />
        <Checkbox.Control />
        <Checkbox.Label>In Stock only</Checkbox.Label>
      </Checkbox.Root>

      <Box>
        <Text fontSize="sm" mb={2}>
          Sort by
        </Text>
        <NativeSelect.Root>
          <NativeSelect.Field
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value as any)}
          >
            <option value="newest">Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="distance_asc">Nearest</option>
          </NativeSelect.Field>
        </NativeSelect.Root>
      </Box>

      {sortBy === "distance_asc" && (
        <VStack align="stretch" gap={2}>
          <HStack justify="space-between">
            <Text fontWeight="semibold">Distance</Text>
          </HStack>
          <Input
            type="number"
            min={1}
            max={200}
            step={1}
            value={radiusKm ?? 25}
            onChange={(e) => onRadiusChange(Number(e.target.value))}
          />
          <Text fontSize="xs" color="gray.600">
            Radius (km)
          </Text>
        </VStack>
      )}
    </VStack>
  )
}

export default FilterSidebar
