import {
  Button,
  DialogActionTrigger,
  DialogBackdrop,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPositioner,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
  Input,
  VStack,
} from "@chakra-ui/react"
import { useForm } from "react-hook-form"
import { FiPackage } from "react-icons/fi"
import type { ProductPublic } from "@/client"
import { Field } from "@/components/ui/field"
import useCustomToast from "@/hooks/useCustomToast"
import { useUpdateInventory } from "@/hooks/useProducts"

interface StockUpdateDialogProps {
  product: ProductPublic
}

type StockFormValues = {
  stock_quantity: number
  low_stock_threshold: number
}

export const StockUpdateDialog = ({ product }: StockUpdateDialogProps) => {
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const updateInventoryMutation = useUpdateInventory()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StockFormValues>({
    defaultValues: {
      stock_quantity: product.inventory?.stock_quantity || 0,
      low_stock_threshold: product.inventory?.low_stock_threshold || 10,
    },
  })

  const onSubmit = async (data: StockFormValues) => {
    // Validate stock against pricing tier min_quantities
    const minQuantity = Math.max(
      ...(product.pricing_tiers
        ?.filter((tier) => tier.is_active)
        .map((tier) => tier.min_quantity || 1) || [1]),
    )

    if (data.stock_quantity < minQuantity) {
      showErrorToast(
        `Stock must be at least ${minQuantity} (minimum quantity for active pricing tier)`,
      )
      return
    }

    await updateInventoryMutation.mutateAsync({
      productId: product.id,
      data: {
        stock_quantity: data.stock_quantity,
        low_stock_threshold: data.low_stock_threshold,
      },
    })

    showSuccessToast("Stock updated successfully")
  }

  return (
    <DialogRoot>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" aria-label="Update Stock">
          <FiPackage />
        </Button>
      </DialogTrigger>
      <DialogBackdrop />
      <DialogPositioner>
        <DialogContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Update Stock - {product.name}</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <VStack gap={4}>
                <Field
                  required
                  invalid={!!errors.stock_quantity}
                  errorText={errors.stock_quantity?.message}
                  label="Stock Quantity"
                >
                  <Input
                    type="number"
                    min="0"
                    {...register("stock_quantity", {
                      required: "Stock quantity is required",
                      valueAsNumber: true,
                      min: {
                        value: 0,
                        message: "Stock quantity must be 0 or greater",
                      },
                    })}
                  />
                </Field>

                <Field
                  invalid={!!errors.low_stock_threshold}
                  errorText={errors.low_stock_threshold?.message}
                  label="Low Stock Threshold"
                >
                  <Input
                    type="number"
                    min="0"
                    {...register("low_stock_threshold", {
                      valueAsNumber: true,
                      min: {
                        value: 0,
                        message: "Threshold must be 0 or greater",
                      },
                    })}
                  />
                </Field>
              </VStack>
            </DialogBody>
            <DialogFooter gap={2}>
              <DialogActionTrigger asChild>
                <Button
                  variant="subtle"
                  colorPalette="gray"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </DialogActionTrigger>
              <Button
                type="submit"
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                Update Stock
              </Button>
            </DialogFooter>
          </form>
          <DialogCloseTrigger />
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  )
}
