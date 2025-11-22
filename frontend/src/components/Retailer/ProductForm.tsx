import {
  Badge,
  Box,
  Button,
  createListCollection,
  Flex,
  HStack,
  IconButton,
  Image,
  Input,
  Separator,
  SimpleGrid,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react"
import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { FiChevronLeft, FiChevronRight, FiUpload, FiX } from "react-icons/fi"
import type {
  BuyerType,
  CategoryEnum,
  ProductCreate,
  ProductPublic,
  ProductUpdate,
} from "@/client"
import { ProductsService } from "@/client"
import { Field } from "@/components/ui/field"
import {
  SelectContent,
  SelectItem,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
} from "@/components/ui/select"
import useAddresses from "@/hooks/useAddresses"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import {
  useCreateProduct,
  useDeleteImage,
  useReorderImages,
  useUpdateInventory,
  useUpdateProduct,
  useUploadImage,
} from "@/hooks/useProducts"
import { getProductImageUrl } from "@/utils/images"
import { TagInput } from "./TagInput"

interface ProductFormProps {
  product?: ProductPublic
  onSuccess?: () => void
  onCancel?: () => void
}

type ProductFormValues = {
  name: string
  description?: string
  category: CategoryEnum
  tags: string[]
  brand?: string
  address_id?: string
  sku?: string
  price: number | string
  min_quantity?: number
  max_quantity?: number | null
  initial_stock?: number
  imageFiles: File[]
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

const categoryCollection = createListCollection({
  items: CATEGORIES.map((cat) => ({
    value: cat.value,
    label: cat.label,
  })),
})

const MAX_IMAGES = 5
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]

export const ProductForm = ({
  product,
  onSuccess,
  onCancel,
}: ProductFormProps) => {
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const { activeRole } = useAuth()
  const createProductMutation = useCreateProduct()
  const { addresses } = useAddresses()
  const updateProductMutation = useUpdateProduct()
  const uploadImageMutation = useUploadImage()
  const deleteImageMutation = useDeleteImage()
  const reorderImagesMutation = useReorderImages()
  const updateInventoryMutation = useUpdateInventory()

  const isEditMode = !!product
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [imageOrder, setImageOrder] = useState<number[]>([])
  const [primaryImageIndex, setPrimaryImageIndex] = useState<number | null>(
    null,
  )
  const [existingImages, setExistingImages] = useState<
    Array<{ path: string; order: number; is_primary: boolean }>
  >([])
  const [deletedImagePaths, setDeletedImagePaths] = useState<Set<string>>(
    new Set(),
  )
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Determine buyer type based on active role
  // Retailer sells to customers, Wholesaler sells to retailers
  const buyerType: BuyerType =
    activeRole === "wholesaler" ? "retailer" : "customer"

  // Get the appropriate pricing tier from existing product
  const existingPricingTier = product?.pricing_tiers?.find(
    (tier) => tier.buyer_type === buyerType && tier.is_active,
  )

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    defaultValues: {
      name: product?.name || "",
      description: product?.description || "",
      category: product?.category || "electronics",
      tags: product?.tags || [],
      brand: (product as any)?.brand || "",
      address_id: (product as any)?.address_id || "",
      sku: product?.sku || "",
      price: existingPricingTier
        ? parseFloat(existingPricingTier.price) || 0
        : 0,
      min_quantity: existingPricingTier?.min_quantity || 1,
      max_quantity: existingPricingTier?.max_quantity || null,
      initial_stock: product?.inventory?.stock_quantity || 0,
      imageFiles: [],
    },
  })

  const minQuantity = watch("min_quantity")
  const initialStock = watch("initial_stock")

  // Load existing images when in edit mode
  useEffect(() => {
    if (isEditMode && product?.images) {
      const images = product.images
        .map((img) => ({
          path: img.path,
          order: img.order,
          is_primary: img.is_primary ?? false,
        }))
        .sort((a, b) => a.order - b.order)
      setExistingImages(images)

      // Set primary image index if there's a primary image
      const primaryIndex = images.findIndex((img) => img.is_primary)
      if (primaryIndex !== -1) {
        setPrimaryImageIndex(primaryIndex)
      } else if (images.length > 0) {
        // If no primary image, set first image as primary
        setPrimaryImageIndex(0)
      }
    } else if (!isEditMode) {
      // Reset for new product
      setExistingImages([])
      setPrimaryImageIndex(null)
      setDeletedImagePaths(new Set())
    }
  }, [isEditMode, product])

  // Validate pricing
  const validatePricing = (): string | null => {
    // Validate min_quantity <= initial_stock
    if (
      initialStock !== undefined &&
      initialStock > 0 &&
      minQuantity !== undefined &&
      minQuantity > initialStock
    ) {
      return `Minimum quantity (${minQuantity}) cannot exceed initial stock (${initialStock})`
    }

    return null
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const totalImages = existingImages.length + imagePreviews.length

    if (totalImages + files.length > MAX_IMAGES) {
      showErrorToast(
        `Maximum ${MAX_IMAGES} images allowed. You currently have ${totalImages} images.`,
      )
      return
    }

    const validFiles: File[] = []
    const previews: string[] = []

    for (const file of files) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        showErrorToast(
          `${file.name}: Invalid file type. Only JPEG, PNG, and WebP are allowed.`,
        )
        continue
      }

      if (file.size > MAX_IMAGE_SIZE) {
        showErrorToast(`${file.name}: File too large. Maximum size is 5MB.`)
        continue
      }

      validFiles.push(file)
      previews.push(URL.createObjectURL(file))
    }

    if (validFiles.length > 0) {
      const currentFiles = watch("imageFiles")
      setValue("imageFiles", [...currentFiles, ...validFiles])
      setImagePreviews([...imagePreviews, ...previews])
      setImageOrder([
        ...imageOrder,
        ...Array.from(
          { length: validFiles.length },
          (_, i) => existingImages.length + imagePreviews.length + i,
        ),
      ])

      if (
        primaryImageIndex === null &&
        existingImages.length === 0 &&
        imagePreviews.length === 0
      ) {
        setPrimaryImageIndex(existingImages.length)
      }
    }

    // Reset input
    e.target.value = ""
  }

  const handleDeleteExistingImage = async (imagePath: string) => {
    if (!product) return

    if (
      !confirm(
        "Are you sure you want to delete this image? This cannot be undone.",
      )
    ) {
      return
    }

    try {
      await deleteImageMutation.mutateAsync({
        productId: product.id,
        imagePath,
      })

      // Remove from existing images
      setExistingImages((prev) => prev.filter((img) => img.path !== imagePath))
      setDeletedImagePaths((prev) => new Set(prev).add(imagePath))

      // Update primary image index if needed
      const deletedIndex = existingImages.findIndex(
        (img) => img.path === imagePath,
      )
      if (deletedIndex !== -1 && primaryImageIndex === deletedIndex) {
        // Set first available image as primary
        const remaining = existingImages.filter((img) => img.path !== imagePath)
        setPrimaryImageIndex(remaining.length > 0 ? 0 : null)
      } else if (
        deletedIndex !== -1 &&
        primaryImageIndex !== null &&
        primaryImageIndex > deletedIndex
      ) {
        setPrimaryImageIndex(primaryImageIndex - 1)
      }

      showSuccessToast("Image deleted successfully")
    } catch (_error) {
      // Error handling is done in the mutation
    }
  }

  const handleSetPrimaryImage = (index: number, isExisting: boolean) => {
    if (isExisting) {
      setPrimaryImageIndex(index)
    } else {
      // For new images, index is offset by existing images count
      setPrimaryImageIndex(existingImages.length + index)
    }
  }

  const getTotalImageCount = () => {
    return existingImages.length + imagePreviews.length
  }

  const handleUploadButtonClick = () => {
    fileInputRef.current?.click()
  }

  const moveExistingImage = (index: number, direction: "left" | "right") => {
    setExistingImages((prev) => {
      const visible = prev.filter((img) => !deletedImagePaths.has(img.path))
      const all = [...prev]
      // Map visible index to actual index in all
      const actualIndex = prev.findIndex(
        (img) => img.path === visible[index]?.path,
      )
      if (actualIndex === -1) return prev
      const targetIndex =
        direction === "left" ? actualIndex - 1 : actualIndex + 1
      if (
        targetIndex < 0 ||
        targetIndex >= prev.length ||
        deletedImagePaths.has(prev[targetIndex].path)
      ) {
        return prev
      }
      const swapped = [...all]
      const tmp = swapped[actualIndex]
      swapped[actualIndex] = swapped[targetIndex]
      swapped[targetIndex] = tmp

      // Maintain primary selection relative to movement
      if (primaryImageIndex !== null) {
        const visBefore = prev.filter((i) => !deletedImagePaths.has(i.path))
        const oldPrimaryPath = visBefore[primaryImageIndex]?.path
        const visAfter = swapped.filter((i) => !deletedImagePaths.has(i.path))
        const newPrimaryIdx = visAfter.findIndex(
          (i) => i.path === oldPrimaryPath,
        )
        if (newPrimaryIdx !== -1) setPrimaryImageIndex(newPrimaryIdx)
      }

      return swapped
    })
  }

  // Reorder newly added (not yet uploaded) images among themselves
  const moveNewImage = (index: number, direction: "left" | "right") => {
    const files = [...watch("imageFiles")]
    const previews = [...imagePreviews]
    const targetIndex = direction === "left" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= previews.length) return

    // Swap previews
    const tmpPreview = previews[index]
    previews[index] = previews[targetIndex]
    previews[targetIndex] = tmpPreview

    // Swap files to preserve upload order
    const tmpFile = files[index]
    files[index] = files[targetIndex]
    files[targetIndex] = tmpFile

    setImagePreviews(previews)
    setValue("imageFiles", files)

    // Adjust primary image index if primary is one of the swapped new images
    if (primaryImageIndex !== null) {
      const offset = existingImages.filter(
        (img) => !deletedImagePaths.has(img.path),
      ).length
      const primaryIsNew = primaryImageIndex >= offset
      if (primaryIsNew) {
        const primaryLocalIndex = primaryImageIndex - offset
        if (primaryLocalIndex === index) {
          setPrimaryImageIndex(offset + targetIndex)
        } else if (primaryLocalIndex === targetIndex) {
          setPrimaryImageIndex(offset + index)
        }
      }
    }
  }

  const removeImage = (index: number) => {
    const currentFiles = watch("imageFiles")
    const newFiles = currentFiles.filter((_, i) => i !== index)
    const newPreviews = imagePreviews.filter((_, i) => i !== index)

    setValue("imageFiles", newFiles)
    setImagePreviews(newPreviews)

    // Update order
    const newOrder = imageOrder
      .filter((order) => order !== index)
      .map((order) => (order > index ? order - 1 : order))
    setImageOrder(newOrder)

    // Update primary image index
    if (primaryImageIndex === index) {
      setPrimaryImageIndex(newPreviews.length > 0 ? 0 : null)
    } else if (primaryImageIndex !== null && primaryImageIndex > index) {
      setPrimaryImageIndex(primaryImageIndex - 1)
    }
  }

  // Apply current UI image order and primary selection to backend
  const applyImageOrdering = async (productId: string) => {
    // Fetch current images from server after any uploads/deletes
    const serverProduct = await ProductsService.getProduct({ productId })
    const serverPaths = serverProduct.images.map((img) => img.path)

    // Visible existing paths in the order shown in the UI
    const visibleExistingPaths = existingImages
      .filter((img) => !deletedImagePaths.has(img.path))
      .map((img) => img.path)

    // New paths are whatever exists on server minus the visible existing
    const newPaths = serverPaths.filter(
      (p) => !visibleExistingPaths.includes(p),
    )

    const orderedPaths = [...visibleExistingPaths, ...newPaths]
    if (orderedPaths.length === 0) return

    // Clamp primary index to available range; default to 0
    const primaryIdx = Math.max(
      0,
      Math.min(primaryImageIndex ?? 0, orderedPaths.length - 1),
    )

    const imagesPayload = orderedPaths.map((path, idx) => ({
      path,
      order: idx,
      is_primary: idx === primaryIdx,
    }))

    await reorderImagesMutation.mutateAsync({
      productId,
      data: { images: imagesPayload },
    })
  }

  const onSubmit = async (data: ProductFormValues) => {
    // Validate pricing
    const pricingError = validatePricing()
    if (pricingError) {
      showErrorToast(pricingError)
      return
    }

    const priceValue =
      typeof data.price === "string" ? parseFloat(data.price) : data.price

    try {
      if (isEditMode && product) {
        // Update product - Note: ProductUpdate doesn't support pricing_tiers
        // We'll need to handle pricing updates separately if needed
        const updateData: ProductUpdate = {
          name: data.name,
          description: data.description || null,
          category: data.category,
          tags: data.tags,
          sku: data.sku || null,
          brand: data.brand || null,
          // Prefer user's selection; backend fallback to active address if empty
          address_id: data.address_id || undefined,
          pricing_tier: {
            price: priceValue,
            min_quantity: data.min_quantity ?? null,
            max_quantity: data.max_quantity ?? null,
          },
        }

        await updateProductMutation.mutateAsync({
          id: product.id,
          data: updateData,
        })

        // Upload new images if any
        if (data.imageFiles.length > 0) {
          for (const file of data.imageFiles) {
            const formDataObj = new FormData()
            formDataObj.append("file", file)
            await uploadImageMutation.mutateAsync({
              productId: product.id,
              formData: formDataObj,
            })
          }
        }

        // Reorder images and set primary image per UI selection
        await applyImageOrdering(product.id)

        // Update inventory if changed
        if (
          data.initial_stock !== undefined &&
          data.initial_stock !== product.inventory?.stock_quantity
        ) {
          await updateInventoryMutation.mutateAsync({
            productId: product.id,
            data: { stock_quantity: data.initial_stock },
          })
        }

        showSuccessToast("Product updated successfully")
      } else {
        // Create product
        const createData: ProductCreate = {
          name: data.name,
          description: data.description || null,
          category: data.category,
          tags: data.tags,
          sku: data.sku || null,
          brand: data.brand || null,
          address_id: data.address_id || undefined,
          pricing_tiers: [
            {
              buyer_type: buyerType,
              price: priceValue,
              min_quantity: data.min_quantity || 1,
              max_quantity: data.max_quantity || null,
              is_active: true,
            },
          ],
          initial_stock: data.initial_stock || 0,
        }

        const newProduct = await createProductMutation.mutateAsync(createData)

        // Upload images
        if (data.imageFiles.length > 0) {
          for (const file of data.imageFiles) {
            const formData = new FormData()
            formData.append("file", file)
            await uploadImageMutation.mutateAsync({
              productId: newProduct.id,
              formData,
            })
          }
        }

        // Reorder images and set primary image per UI selection
        await applyImageOrdering(newProduct.id)

        showSuccessToast("Product created successfully")
      }

      onSuccess?.()
    } catch (_error) {
      // Error handling is done in the mutation
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <VStack align="stretch" gap={6}>
        {/* Basic Information */}
        <Box>
          <Text fontSize="lg" fontWeight="semibold" mb={4}>
            Basic Information
          </Text>
          <VStack align="stretch" gap={4}>
            <Field
              required
              invalid={!!errors.name}
              errorText={errors.name?.message}
              label="Product Name"
            >
              <Input
                {...register("name", { required: "Product name is required" })}
                placeholder="Enter product name"
              />
            </Field>

            <Field
              invalid={!!errors.description}
              errorText={errors.description?.message}
              label="Description"
            >
              <Textarea
                {...register("description")}
                placeholder="Enter product description"
                rows={4}
              />
            </Field>

            <Field
              required
              invalid={!!errors.category}
              errorText={errors.category?.message}
              label="Category"
            >
              <Controller
                name="category"
                control={control}
                rules={{ required: "Category is required" }}
                render={({ field }) => (
                  <SelectRoot
                    collection={categoryCollection}
                    value={[field.value]}
                    onValueChange={(e) => field.onChange(e.value[0])}
                  >
                    <SelectTrigger>
                      <SelectValueText placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} item={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </SelectRoot>
                )}
              />
            </Field>

            <Field
              invalid={!!errors.sku}
              errorText={errors.sku?.message}
              label="SKU (optional)"
            >
              <Input
                {...register("sku")}
                placeholder="Leave empty for auto-generated SKU"
              />
            </Field>

            <Field label="Brand (optional)">
              <Input {...register("brand")} placeholder="e.g., Nike" />
            </Field>

            <Field required label="Product Address">
              {(() => {
                const addressItems = (addresses || []).map((addr: any) => ({
                  value: addr.id as string,
                  label: `${String(addr.label).toUpperCase()} - ${addr.city}, ${addr.state}${
                    addr.is_active ? " (Active)" : ""
                  }`,
                }))
                const addressCollection = createListCollection({
                  items: addressItems,
                })
                const current = watch("address_id") || ""
                const hasAddresses = (addresses?.length ?? 0) > 0
                return (
                  <SelectRoot
                    collection={addressCollection}
                    value={current ? [current] : []}
                    onValueChange={(e) => setValue("address_id", e.value[0])}
                    disabled={!hasAddresses}
                  >
                    <SelectTrigger>
                      <SelectValueText
                        placeholder={
                          hasAddresses
                            ? "Select address (defaults to active)"
                            : "Add an address first in Settings"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {addressItems.map((item) => (
                        <SelectItem key={item.value} item={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </SelectRoot>
                )
              })()}
            </Field>

            <Field label="Tags">
              <TagInput
                value={watch("tags") || []}
                onChange={(tags) => setValue("tags", tags)}
              />
            </Field>
          </VStack>
        </Box>

        <Separator />

        {/* Pricing */}
        <Box>
          <Box mb={4}>
            <Text fontSize="lg" fontWeight="semibold">
              Pricing
            </Text>
            {activeRole === "retailer" && (
              <Text fontSize="sm" color="fg.muted" fontWeight="normal" mt={1}>
                Set price for customers
              </Text>
            )}
            {activeRole === "wholesaler" && (
              <Text fontSize="sm" color="fg.muted" fontWeight="normal" mt={1}>
                Set price for retailers
              </Text>
            )}
          </Box>
          <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
            <Field label="Price" required>
              <Input
                type="number"
                step="0.01"
                min="0"
                {...register("price", {
                  required: "Price is required",
                  valueAsNumber: true,
                })}
                placeholder="0.00"
              />
            </Field>

            <Field label="Min Quantity">
              <Input
                type="number"
                min="1"
                {...register("min_quantity", {
                  valueAsNumber: true,
                })}
                placeholder="1"
              />
            </Field>

            <Field label="Max Quantity (optional)">
              <Input
                type="number"
                min="1"
                {...register("max_quantity", {
                  valueAsNumber: true,
                  setValueAs: (v) => (v === "" ? null : v),
                })}
                placeholder="Leave empty for no limit"
              />
            </Field>
          </SimpleGrid>
        </Box>

        <Separator />

        {/* Inventory */}
        <Box>
          <Text fontSize="lg" fontWeight="semibold" mb={4}>
            Inventory
          </Text>
          <Field
            invalid={!!errors.initial_stock}
            errorText={errors.initial_stock?.message}
            label="Initial Stock"
          >
            <Input
              type="number"
              min="0"
              {...register("initial_stock", {
                valueAsNumber: true,
                validate: (value) => {
                  if (value === undefined || value === null) return true
                  if (minQuantity !== undefined && value < minQuantity) {
                    return `Stock must be at least ${minQuantity} (minimum quantity)`
                  }
                  return true
                },
              })}
              placeholder="0"
            />
          </Field>
        </Box>

        <Separator />

        {/* Image Upload */}
        <Box>
          <Flex justify="space-between" align="center" mb={4}>
            <Text fontSize="lg" fontWeight="semibold">
              Product Images
            </Text>
            <Text fontSize="sm" color="fg.muted">
              {getTotalImageCount()} / {MAX_IMAGES} images
            </Text>
          </Flex>
          <VStack align="stretch" gap={4}>
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleImageSelect}
              display="none"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleUploadButtonClick}
              disabled={getTotalImageCount() >= MAX_IMAGES}
            >
              <FiUpload />
              {getTotalImageCount() >= MAX_IMAGES
                ? "Maximum images reached"
                : "Upload Images"}
            </Button>

            {(existingImages.filter((img) => !deletedImagePaths.has(img.path))
              .length > 0 ||
              imagePreviews.length > 0) && (
              <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} gap={4}>
                {/* Existing Images */}
                {existingImages
                  .filter((img) => !deletedImagePaths.has(img.path))
                  .map((img, index) => {
                    // Primary image index is based on visible existing images only
                    const isPrimary =
                      primaryImageIndex !== null &&
                      primaryImageIndex <
                        existingImages.filter(
                          (i) => !deletedImagePaths.has(i.path),
                        ).length &&
                      index === primaryImageIndex

                    return (
                      <Box key={`existing-${img.path}`} position="relative">
                        <Box
                          aspectRatio="1"
                          borderRadius="md"
                          overflow="hidden"
                          borderWidth={isPrimary ? 3 : 1}
                          borderColor={isPrimary ? "blue.500" : "gray.200"}
                          cursor="pointer"
                          onClick={() => handleSetPrimaryImage(index, true)}
                        >
                          <Image
                            src={getProductImageUrl(img.path)}
                            alt={`Existing ${index + 1}`}
                            w="100%"
                            h="100%"
                            objectFit="cover"
                          />
                        </Box>
                        <IconButton
                          type="button"
                          size="xs"
                          position="absolute"
                          top={1}
                          right={1}
                          colorScheme="red"
                          onClick={() => handleDeleteExistingImage(img.path)}
                          aria-label="Delete image"
                          loading={deleteImageMutation.isPending}
                        >
                          <FiX />
                        </IconButton>
                        <HStack
                          position="absolute"
                          bottom={1}
                          right={1}
                          gap={1}
                        >
                          <IconButton
                            type="button"
                            size="xs"
                            variant="subtle"
                            aria-label="Move left"
                            onClick={() => moveExistingImage(index, "left")}
                            disabled={index === 0}
                          >
                            <FiChevronLeft />
                          </IconButton>
                          <IconButton
                            type="button"
                            size="xs"
                            variant="subtle"
                            aria-label="Move right"
                            onClick={() => moveExistingImage(index, "right")}
                            disabled={
                              index ===
                              existingImages.filter(
                                (i) => !deletedImagePaths.has(i.path),
                              ).length -
                                1
                            }
                          >
                            <FiChevronRight />
                          </IconButton>
                        </HStack>
                        {isPrimary && (
                          <Badge
                            position="absolute"
                            bottom={1}
                            left={1}
                            colorScheme="blue"
                            variant="solid"
                          >
                            Primary
                          </Badge>
                        )}
                        <Badge
                          position="absolute"
                          top={1}
                          left={1}
                          colorScheme="gray"
                          variant="solid"
                          fontSize="xs"
                        >
                          Existing
                        </Badge>
                      </Box>
                    )
                  })}

                {/* New Image Previews */}
                {imagePreviews.map((preview, index) => {
                  const totalIndex = existingImages.length + index
                  const isPrimary = primaryImageIndex === totalIndex

                  return (
                    <Box key={`new-${index}`} position="relative">
                      <Box
                        aspectRatio="1"
                        borderRadius="md"
                        overflow="hidden"
                        borderWidth={isPrimary ? 3 : 1}
                        borderColor={isPrimary ? "blue.500" : "gray.200"}
                        cursor="pointer"
                        onClick={() => handleSetPrimaryImage(index, false)}
                      >
                        <Image
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          w="100%"
                          h="100%"
                          objectFit="cover"
                        />
                      </Box>
                      <IconButton
                        type="button"
                        size="xs"
                        position="absolute"
                        top={1}
                        right={1}
                        colorScheme="red"
                        onClick={() => removeImage(index)}
                        aria-label="Remove image"
                      >
                        <FiX />
                      </IconButton>
                      <HStack position="absolute" bottom={1} right={1} gap={1}>
                        <IconButton
                          type="button"
                          size="xs"
                          variant="subtle"
                          aria-label="Move left"
                          onClick={() => moveNewImage(index, "left")}
                          disabled={index === 0}
                        >
                          <FiChevronLeft />
                        </IconButton>
                        <IconButton
                          type="button"
                          size="xs"
                          variant="subtle"
                          aria-label="Move right"
                          onClick={() => moveNewImage(index, "right")}
                          disabled={index === imagePreviews.length - 1}
                        >
                          <FiChevronRight />
                        </IconButton>
                      </HStack>
                      {isPrimary && (
                        <Badge
                          position="absolute"
                          bottom={1}
                          left={1}
                          colorScheme="blue"
                          variant="solid"
                        >
                          Primary
                        </Badge>
                      )}
                      <Badge
                        position="absolute"
                        top={1}
                        left={1}
                        colorScheme="green"
                        variant="solid"
                        fontSize="xs"
                      >
                        New
                      </Badge>
                    </Box>
                  )
                })}
              </SimpleGrid>
            )}
          </VStack>
        </Box>

        {/* Address Requirement Notice */}
        {(addresses?.length ?? 0) === 0 && (
          <Box>
            <Text color="danger.solid" fontSize="sm">
              You need to add an address in Settings before creating a product.
            </Text>
          </Box>
        )}

        {/* Form Actions */}
        <Flex justify="flex-end" gap={4} pt={4}>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={isSubmitting || (addresses?.length ?? 0) === 0}
          >
            {isEditMode ? "Update Product" : "Create Product"}
          </Button>
        </Flex>
      </VStack>
    </form>
  )
}
