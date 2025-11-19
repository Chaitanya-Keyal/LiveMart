import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  type ApiError,
  type ImageReorderSchema,
  type ProductCreate,
  type ProductInventoryUpdate,
  type ProductPublic,
  type ProductsPublic,
  ProductsService,
  type ProductUpdate,
} from "@/client"
import { handleError } from "@/utils"

const invalidateProductQueries = async (
  queryClient: ReturnType<typeof useQueryClient>,
  productId?: string,
) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["products"] }),
    queryClient.invalidateQueries({ queryKey: ["product", productId] }),
  ])
}

import type { CategoryEnum } from "@/client"

interface UseProductsOptions {
  category?: CategoryEnum | null
  sellerType?: "retailer" | "wholesaler" | null
  sellerId?: string | null
  tags?: string[] | null
  isActive?: boolean
  skip?: number
  limit?: number
}

export const useProducts = (options: UseProductsOptions = {}) => {
  const { data, isPending, isFetching } = useQuery<ProductsPublic, ApiError>({
    queryKey: ["products", options],
    queryFn: () =>
      ProductsService.listProducts({
        category: options.category ?? null,
        sellerType: options.sellerType ?? null,
        sellerId: options.sellerId ?? null,
        tags: options.tags
          ? Array.isArray(options.tags)
            ? options.tags.join(",")
            : options.tags
          : null,
        isActive: options.isActive,
        skip: options.skip,
        limit: options.limit,
      }),
  })

  return {
    products: data?.data ?? [],
    count: data?.count ?? 0,
    isLoading: isPending || isFetching,
  }
}

export const useProduct = (productId: string) => {
  const {
    data: product,
    isPending,
    isFetching,
  } = useQuery<ProductPublic, ApiError>({
    queryKey: ["product", productId],
    queryFn: () => ProductsService.getProduct({ productId }),
    enabled: !!productId,
  })

  return {
    product,
    isLoading: isPending || isFetching,
  }
}

export const useCreateProduct = () => {
  const queryClient = useQueryClient()

  const createProductMutation = useMutation({
    mutationFn: (payload: ProductCreate) =>
      ProductsService.createProduct({ requestBody: payload }),
    onSuccess: async () => {
      await invalidateProductQueries(queryClient)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
  })

  return createProductMutation
}

export const useUpdateProduct = () => {
  const queryClient = useQueryClient()

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProductUpdate }) =>
      ProductsService.updateProduct({ productId: id, requestBody: data }),
    onSuccess: async (_, variables) => {
      await invalidateProductQueries(queryClient, variables.id)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
  })

  return updateProductMutation
}

export const useDeleteProduct = () => {
  const queryClient = useQueryClient()

  const deleteProductMutation = useMutation({
    mutationFn: (id: string) =>
      ProductsService.deleteProduct({ productId: id }),
    onSuccess: async () => {
      await invalidateProductQueries(queryClient)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
  })

  return deleteProductMutation
}

export const useUpdateInventory = () => {
  const queryClient = useQueryClient()

  const updateInventoryMutation = useMutation({
    mutationFn: ({
      productId,
      data,
    }: {
      productId: string
      data: ProductInventoryUpdate
    }) =>
      ProductsService.updateProductInventory({
        productId,
        requestBody: data,
      }),
    onSuccess: async (_, variables) => {
      await invalidateProductQueries(queryClient, variables.productId)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
  })

  return updateInventoryMutation
}

export const useUploadImage = () => {
  const queryClient = useQueryClient()

  const uploadImageMutation = useMutation({
    mutationFn: ({
      productId,
      formData,
    }: {
      productId: string
      formData: FormData
    }) => {
      const file = formData.get("file") as File
      return ProductsService.uploadProductImage({
        productId,
        formData: { file },
      })
    },
    onSuccess: async (_, variables) => {
      await invalidateProductQueries(queryClient, variables.productId)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
  })

  return uploadImageMutation
}

export const useDeleteImage = () => {
  const queryClient = useQueryClient()

  const deleteImageMutation = useMutation({
    mutationFn: ({
      productId,
      imagePath,
    }: {
      productId: string
      imagePath: string
    }) =>
      ProductsService.deleteProductImage({
        productId,
        imagePath,
      }),
    onSuccess: async (_, variables) => {
      await invalidateProductQueries(queryClient, variables.productId)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
  })

  return deleteImageMutation
}

export const useReorderImages = () => {
  const queryClient = useQueryClient()

  const reorderImagesMutation = useMutation({
    mutationFn: ({
      productId,
      data,
    }: {
      productId: string
      data: ImageReorderSchema
    }) =>
      ProductsService.reorderProductImages({
        productId,
        requestBody: data,
      }),
    onSuccess: async (_, variables) => {
      await invalidateProductQueries(queryClient, variables.productId)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
  })

  return reorderImagesMutation
}
