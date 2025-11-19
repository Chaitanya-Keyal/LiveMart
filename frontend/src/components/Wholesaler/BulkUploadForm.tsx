import {
  Box,
  Button,
  Container,
  Heading,
  Input,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react"
import type React from "react"
import { useState } from "react"
import { FiUpload } from "react-icons/fi"
import { Field } from "@/components/ui/field"
import useCustomToast from "@/hooks/useCustomToast"
import { getCSVTemplate, type ParsedProduct, parseCSV } from "@/utils/csvParser"

export const BulkUploadForm = () => {
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([])
  const [errors, setErrors] = useState<any[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith(".csv")) {
      showErrorToast("Please select a CSV file")
      return
    }

    setIsProcessing(true)
    try {
      const result = await parseCSV(file)
      setParsedProducts(result.products)
      setErrors(result.errors)

      if (result.errors.length > 0) {
        showErrorToast(
          `Found ${result.errors.length} errors in CSV. Please review and fix them.`,
        )
      } else {
        showSuccessToast(
          `Successfully parsed ${result.products.length} products`,
        )
      }
    } catch (error: any) {
      showErrorToast(error.message || "Failed to parse CSV file")
    } finally {
      setIsProcessing(false)
    }

    // Reset input
    e.target.value = ""
  }

  const handleImport = async () => {
    if (parsedProducts.length === 0) {
      showErrorToast("No products to import")
      return
    }

    if (errors.length > 0) {
      showErrorToast("Please fix all errors before importing")
      return
    }

    // Note: Bulk import endpoint not yet implemented
    showErrorToast(
      "Bulk import functionality will be available in a future update",
    )
  }

  const handleDownloadTemplate = () => {
    const template = getCSVTemplate()
    const blob = new Blob([template], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "product_template.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Container maxW="6xl" py={8}>
      <VStack align="stretch" gap={6}>
        <Box>
          <Heading size="lg" mb={2}>
            Bulk Product Upload
          </Heading>
          <Text color="gray.600">
            Upload a CSV file to import multiple products at once. Maximum 500
            rows per upload.
          </Text>
        </Box>

        <Box p={4} borderWidth={1} borderRadius="md" bg="blue.50">
          <VStack align="stretch" gap={2}>
            <Text fontWeight="semibold">CSV Format:</Text>
            <Text fontSize="sm">
              Columns: name, description, category, price, stock, sku, tags
            </Text>
            <Button size="sm" onClick={handleDownloadTemplate}>
              Download Template
            </Button>
          </VStack>
        </Box>

        <Field label="Select CSV File">
          <Input
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            disabled={isProcessing}
          />
        </Field>

        {errors.length > 0 && (
          <Box
            p={4}
            borderWidth={1}
            borderRadius="md"
            borderColor="red.200"
            bg="red.50"
          >
            <Text fontWeight="semibold" color="red.600" mb={2}>
              Validation Errors ({errors.length})
            </Text>
            <VStack align="stretch" gap={1}>
              {errors.slice(0, 10).map((error, index) => (
                <Text key={index} fontSize="sm" color="red.600">
                  Row {error.row}, {error.field}: {error.message}
                </Text>
              ))}
              {errors.length > 10 && (
                <Text fontSize="sm" color="red.600">
                  ... and {errors.length - 10} more errors
                </Text>
              )}
            </VStack>
          </Box>
        )}

        {parsedProducts.length > 0 && (
          <>
            <Box>
              <Text fontWeight="semibold" mb={2}>
                Preview ({parsedProducts.length} products)
              </Text>
              <Table.Root size="sm">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Name</Table.ColumnHeader>
                    <Table.ColumnHeader>Category</Table.ColumnHeader>
                    <Table.ColumnHeader>Price</Table.ColumnHeader>
                    <Table.ColumnHeader>Stock</Table.ColumnHeader>
                    <Table.ColumnHeader>SKU</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {parsedProducts.slice(0, 10).map((item, index) => (
                    <Table.Row key={index}>
                      <Table.Cell>{item.product.name}</Table.Cell>
                      <Table.Cell>{item.product.category}</Table.Cell>
                      <Table.Cell>
                        {item.product.pricing_tiers?.[0]?.price || "N/A"}
                      </Table.Cell>
                      <Table.Cell>{item.product.initial_stock || 0}</Table.Cell>
                      <Table.Cell>{item.product.sku || "Auto"}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
              {parsedProducts.length > 10 && (
                <Text fontSize="sm" color="gray.500" mt={2}>
                  ... and {parsedProducts.length - 10} more products
                </Text>
              )}
            </Box>

            <Button
              onClick={handleImport}
              disabled={errors.length > 0 || isProcessing}
              loading={isProcessing}
              size="lg"
            >
              <FiUpload />
              Import {parsedProducts.length} Products
            </Button>
          </>
        )}
      </VStack>
    </Container>
  )
}
