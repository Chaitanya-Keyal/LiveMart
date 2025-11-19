import { NativeSelect } from "@chakra-ui/react"
import type { CategoryEnum } from "@/client"
import { Field } from "@/components/ui/field"

interface CategoryFilterProps {
  value?: CategoryEnum | null
  onChange: (category: CategoryEnum | null) => void
}

const CATEGORIES: Array<{ value: CategoryEnum; label: string }> = [
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

export const CategoryFilter = ({ value, onChange }: CategoryFilterProps) => {
  return (
    <Field label="Category">
      <NativeSelect.Root>
        <NativeSelect.Field
          value={value || ""}
          onChange={(e) => {
            const selectedValue = e.target.value
            onChange(
              selectedValue === "" ? null : (selectedValue as CategoryEnum),
            )
          }}
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </NativeSelect.Field>
      </NativeSelect.Root>
    </Field>
  )
}
