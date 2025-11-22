import type {
  CategoryEnum,
  ProductCreate,
  ProductPricingCreate,
} from "@/client"

export interface CSVParseError {
  row: number
  field: string
  message: string
}

export interface ParsedProduct {
  product: ProductCreate
  errors: CSVParseError[]
}

const CATEGORY_MAP: Record<string, CategoryEnum> = {
  electronics: "electronics",
  clothing: "clothing",
  "food & beverage": "food_beverage",
  food_beverage: "food_beverage",
  "home & garden": "home_garden",
  home_garden: "home_garden",
  "health & beauty": "health_beauty",
  health_beauty: "health_beauty",
  sports: "sports",
  toys: "toys",
  books: "books",
  automotive: "automotive",
  "office supplies": "office_supplies",
  office_supplies: "office_supplies",
  "pet supplies": "pet_supplies",
  pet_supplies: "pet_supplies",
  jewellery: "jewellery",
  jewelry: "jewellery",
  furniture: "furniture",
}

const parseCSVLine = (line: string): string[] => {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === "," && !inQuotes) {
      result.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

const validateProductRow = (
  row: string[],
  rowIndex: number,
): { product: Partial<ProductCreate>; errors: CSVParseError[] } => {
  const errors: CSVParseError[] = []
  const product: Partial<ProductCreate> = {
    pricing_tiers: [],
  }

  const [
    name,
    description,
    category,
    price,
    minQuantity,
    maxQuantity,
    initialStock,
    brand,
    tags,
  ] = row

  // Validate name (required)
  if (!name || name.trim().length === 0) {
    errors.push({
      row: rowIndex + 1,
      field: "name",
      message: "Name is required",
    })
  } else {
    product.name = name.trim()
  }

  // Description (optional)
  if (description) {
    product.description = description.trim() || null
  }

  // Validate category (required)
  if (!category || category.trim().length === 0) {
    errors.push({
      row: rowIndex + 1,
      field: "category",
      message: "Category is required",
    })
  } else {
    const normalizedCategory = category.trim().toLowerCase()
    const mappedCategory = CATEGORY_MAP[normalizedCategory]
    if (!mappedCategory) {
      errors.push({
        row: rowIndex + 1,
        field: "category",
        message: `Invalid category: ${category}. Valid categories: ${Object.keys(CATEGORY_MAP).join(", ")}`,
      })
    } else {
      product.category = mappedCategory
    }
  }

  // Validate price (required)
  if (!price || price.trim().length === 0) {
    errors.push({
      row: rowIndex + 1,
      field: "price",
      message: "Price is required",
    })
  } else {
    const priceNum = parseFloat(price.trim())
    if (Number.isNaN(priceNum) || priceNum < 0) {
      errors.push({
        row: rowIndex + 1,
        field: "price",
        message: "Price must be a valid positive number",
      })
    } else {
      const minQty =
        minQuantity && minQuantity.trim().length > 0
          ? parseInt(minQuantity.trim(), 10)
          : 1
      if (Number.isNaN(minQty) || minQty < 1) {
        errors.push({
          row: rowIndex + 1,
          field: "min_quantity",
          message: "Minimum quantity must be a valid positive integer",
        })
      }
      let maxQty: number | null = null
      if (maxQuantity && maxQuantity.trim().length > 0) {
        maxQty = parseInt(maxQuantity.trim(), 10)
        if (Number.isNaN(maxQty) || maxQty < minQty) {
          errors.push({
            row: rowIndex + 1,
            field: "max_quantity",
            message: "Max quantity must be a valid integer >= min quantity",
          })
          maxQty = null
        }
      }
      product.pricing_tiers = [
        {
          buyer_type: "retailer",
          price: priceNum,
          min_quantity: minQty,
          max_quantity: maxQty,
          is_active: true,
        } as ProductPricingCreate,
      ]
    }
  }

  // Initial stock (optional, defaults to 1)
  if (initialStock && initialStock.trim().length > 0) {
    const stockNum = parseInt(initialStock.trim(), 10)
    if (Number.isNaN(stockNum) || stockNum < 0) {
      errors.push({
        row: rowIndex + 1,
        field: "initial_stock",
        message: "Initial stock must be a valid non-negative integer",
      })
    } else {
      product.initial_stock = stockNum
    }
  } else {
    product.initial_stock = 1
  }

  // Brand (optional)
  if (brand && brand.trim().length > 0) {
    product.brand = brand.trim()
  }

  // Tags (optional, pipe-separated to avoid comma conflicts)
  if (tags && tags.trim().length > 0) {
    product.tags = tags
      .split("|")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
  }

  return { product: product as Partial<ProductCreate>, errors }
}

export const parseCSV = async (
  file: File,
  maxRows: number = 500,
): Promise<{ products: ParsedProduct[]; errors: CSVParseError[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const lines = text.split("\n").filter((line) => line.trim().length > 0)

        // Skip header row
        const dataLines = lines.slice(1)

        if (dataLines.length > maxRows) {
          reject(new Error(`CSV file exceeds maximum ${maxRows} rows`))
          return
        }

        const parsedProducts: ParsedProduct[] = []
        const allErrors: CSVParseError[] = []

        dataLines.forEach((line, index) => {
          const row = parseCSVLine(line)
          const { product, errors } = validateProductRow(row, index)

          if (errors.length > 0) {
            allErrors.push(...errors)
          }

          // Only add product if it has required fields
          if (product.name && product.category && product.pricing_tiers) {
            parsedProducts.push({
              product: product as ProductCreate,
              errors,
            })
          }
        })

        resolve({ products: parsedProducts, errors: allErrors })
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error("Failed to read CSV file"))
    }

    reader.readAsText(file)
  })
}

export const getCSVTemplate = (): string => {
  return `name,description,category,price,min_quantity,max_quantity,initial_stock,brand,tags
Wireless Mouse,"Ergonomic wireless mouse with adjustable DPI",electronics,24.99,10,100,500,TechBrand,wireless|computer|office
Premium Coffee Beans,"Arabica coffee beans - medium roast",food_beverage,12.99,50,500,1000,CoffeeCo,organic|local
Cotton T-Shirt,"100% organic cotton t-shirt",clothing,14.99,20,100,300,FashionBrand,organic|sustainable`
}
