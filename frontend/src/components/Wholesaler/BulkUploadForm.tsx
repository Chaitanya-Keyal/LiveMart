import {
  Alert,
  Box,
  Button,
  Container,
  FileUpload,
  Heading,
  HStack,
  Icon,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useState } from "react"
import { FiUpload } from "react-icons/fi"
import useCustomToast from "@/hooks/useCustomToast"
import { getCSVTemplate, type ParsedProduct, parseCSV } from "@/utils/csvParser"

export const BulkUploadForm = () => {
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([])
  const [errors, setErrors] = useState<any[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFileAccepted = async (files: File[]) => {
    const file = files?.[0]
    if (!file) return
    if (!file.name.toLowerCase().endsWith(".csv")) {
      showErrorToast("Please select a .csv file")
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

        <Alert.Root status="info" variant="surface" borderRadius="md">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>CSV Format</Alert.Title>
            <Alert.Description>
              <Text fontSize="sm">
                Columns: name, description, category, price, stock, sku, tags
              </Text>
            </Alert.Description>
            <HStack mt={3}>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadTemplate}
              >
                Download Template
              </Button>
            </HStack>
          </Alert.Content>
        </Alert.Root>

        <VStack align="stretch" gap={3}>
          <Text fontWeight="semibold">Select CSV File</Text>
          <FileUpload.Root
            accept={[".csv", "text/csv"]}
            maxFiles={1}
            onFileAccept={(accepted) =>
              handleFileAccepted(accepted.files ?? [])
            }
            alignItems="stretch"
          >
            <FileUpload.HiddenInput />

            <FileUpload.Dropzone>
              <Icon color="fg.muted">
                <FiUpload />
              </Icon>
              <FileUpload.DropzoneContent>
                <Box>Drag and drop your CSV here</Box>
                <Box color="fg.muted">.csv up to 5MB</Box>
              </FileUpload.DropzoneContent>
            </FileUpload.Dropzone>

            <HStack>
              <FileUpload.Trigger asChild>
                <Button size="sm" variant="outline" disabled={isProcessing}>
                  Browse CSV
                </Button>
              </FileUpload.Trigger>
              <FileUpload.ClearTrigger asChild>
                <Button size="sm" variant="plain">
                  Clear
                </Button>
              </FileUpload.ClearTrigger>
            </HStack>

            <FileUpload.List />
          </FileUpload.Root>
        </VStack>

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
