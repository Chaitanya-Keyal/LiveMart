import {
  Badge,
  Box,
  Button,
  DialogActionTrigger,
  DialogTitle,
  HStack,
  Input,
  NativeSelect,
  Table,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { FaPlus, FaTrash } from "react-icons/fa"
import { LuPencil } from "react-icons/lu"

import type {
  CouponCreate,
  CouponPublic,
  CouponUpdate,
  DiscountType,
} from "@/client"
import { useCoupons } from "@/hooks/useCoupons"
import useCustomToast from "@/hooks/useCustomToast"
import { Checkbox } from "../ui/checkbox"
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTrigger,
} from "../ui/dialog"
import { Field } from "../ui/field"

interface CouponFormData {
  code: string
  discount_type: DiscountType
  discount_value: number
  min_order_value: number | null
  max_discount: number | null
  usage_limit: number | null
  valid_from: string
  valid_until: string
  is_active: boolean
  is_featured: boolean
  target_emails: string
}

const CouponForm = ({
  coupon,
  onClose,
}: {
  coupon?: CouponPublic
  onClose: () => void
}) => {
  const { createCoupon, updateCoupon, isCreating, isUpdating } = useCoupons()
  const { showSuccessToast } = useCustomToast()
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<CouponFormData>({
    mode: "onBlur",
    defaultValues: coupon
      ? {
          code: coupon.code,
          discount_type: coupon.discount_type,
          discount_value: Number(coupon.discount_value),
          min_order_value: coupon.min_order_value
            ? Number(coupon.min_order_value)
            : null,
          max_discount: coupon.max_discount
            ? Number(coupon.max_discount)
            : null,
          usage_limit: coupon.usage_limit,
          valid_from: new Date(coupon.valid_from).toISOString().slice(0, 16),
          valid_until: new Date(coupon.valid_until).toISOString().slice(0, 16),
          is_active: coupon.is_active,
          is_featured: coupon.is_featured,
          target_emails: coupon.target_emails?.join(", ") || "",
        }
      : {
          code: "",
          discount_type: "percentage",
          discount_value: 0,
          min_order_value: null,
          max_discount: null,
          usage_limit: null,
          valid_from: new Date().toISOString().slice(0, 16),
          valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 16),
          is_active: true,
          is_featured: false,
          target_emails: "",
        },
  })

  const onSubmit = (data: CouponFormData) => {
    const payload: CouponCreate | CouponUpdate = {
      code: data.code,
      discount_type: data.discount_type,
      discount_value: String(data.discount_value),
      min_order_value: data.min_order_value
        ? String(data.min_order_value)
        : null,
      max_discount: data.max_discount ? String(data.max_discount) : null,
      usage_limit: data.usage_limit,
      valid_from: new Date(data.valid_from).toISOString(),
      valid_until: new Date(data.valid_until).toISOString(),
      is_active: data.is_active,
      is_featured: data.is_featured,
      target_emails: data.target_emails
        ? data.target_emails.split(",").map((e) => e.trim())
        : null,
    }

    if (coupon) {
      updateCoupon(
        { id: coupon.id, data: payload },
        {
          onSuccess: () => {
            showSuccessToast("Coupon updated successfully")
            onClose()
          },
        },
      )
    } else {
      createCoupon(payload as CouponCreate, {
        onSuccess: () => {
          showSuccessToast("Coupon created successfully")
          onClose()
        },
      })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <DialogHeader>
        <DialogTitle>{coupon ? "Edit Coupon" : "Create Coupon"}</DialogTitle>
      </DialogHeader>
      <DialogBody>
        <VStack gap={4}>
          <Field
            required
            invalid={!!errors.code}
            errorText={errors.code?.message}
            label="Coupon Code"
          >
            <Input
              {...register("code", { required: "Code is required" })}
              placeholder="SAVE10"
              textTransform="uppercase"
            />
          </Field>

          <Field
            required
            invalid={!!errors.discount_type}
            errorText={errors.discount_type?.message}
            label="Discount Type"
          >
            <Controller
              control={control}
              name="discount_type"
              render={({ field }) => (
                <NativeSelect.Root {...field}>
                  <NativeSelect.Field placeholder="Select type">
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </NativeSelect.Field>
                </NativeSelect.Root>
              )}
            />
          </Field>

          <Field
            required
            invalid={!!errors.discount_value}
            errorText={errors.discount_value?.message}
            label="Discount Value"
          >
            <Input
              {...register("discount_value", {
                required: "Value is required",
                min: { value: 0, message: "Must be positive" },
              })}
              type="number"
              step="0.01"
            />
          </Field>

          <Field
            invalid={!!errors.min_order_value}
            errorText={errors.min_order_value?.message}
            label="Minimum Order Value"
          >
            <Input
              {...register("min_order_value", {
                min: { value: 0, message: "Must be positive" },
              })}
              type="number"
              step="0.01"
              placeholder="Optional"
            />
          </Field>

          <Field
            invalid={!!errors.max_discount}
            errorText={errors.max_discount?.message}
            label="Maximum Discount"
          >
            <Input
              {...register("max_discount", {
                min: { value: 0, message: "Must be positive" },
              })}
              type="number"
              step="0.01"
              placeholder="Optional"
            />
          </Field>

          <Field
            invalid={!!errors.usage_limit}
            errorText={errors.usage_limit?.message}
            label="Usage Limit"
          >
            <Input
              {...register("usage_limit", {
                min: { value: 1, message: "Must be at least 1" },
              })}
              type="number"
              placeholder="Optional (unlimited)"
            />
          </Field>

          <Field
            required
            invalid={!!errors.valid_from}
            errorText={errors.valid_from?.message}
            label="Valid From"
          >
            <Input
              {...register("valid_from", { required: "Required" })}
              type="datetime-local"
            />
          </Field>

          <Field
            required
            invalid={!!errors.valid_until}
            errorText={errors.valid_until?.message}
            label="Valid Until"
          >
            <Input
              {...register("valid_until", { required: "Required" })}
              type="datetime-local"
            />
          </Field>

          <Field
            invalid={!!errors.target_emails}
            errorText={errors.target_emails?.message}
            label="Target Emails (comma-separated)"
            helperText="Leave empty for all users"
          >
            <Textarea
              {...register("target_emails")}
              placeholder="user1@example.com, user2@example.com"
            />
          </Field>

          <HStack w="100%" gap={6}>
            <Controller
              control={control}
              name="is_active"
              render={({ field }) => (
                <Field colorPalette="teal">
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={({ checked }) => field.onChange(checked)}
                  >
                    Active
                  </Checkbox>
                </Field>
              )}
            />

            <Controller
              control={control}
              name="is_featured"
              render={({ field }) => (
                <Field colorPalette="purple">
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={({ checked }) => field.onChange(checked)}
                  >
                    Featured
                  </Checkbox>
                </Field>
              )}
            />
          </HStack>
        </VStack>
      </DialogBody>

      <DialogFooter gap={2}>
        <DialogActionTrigger asChild>
          <Button variant="outline">Cancel</Button>
        </DialogActionTrigger>
        <Button
          type="submit"
          disabled={!isValid}
          loading={isCreating || isUpdating}
        >
          {coupon ? "Update" : "Create"}
        </Button>
      </DialogFooter>
    </form>
  )
}

const DeleteCouponDialog = ({
  coupon,
  onClose,
}: {
  coupon: CouponPublic
  onClose: () => void
}) => {
  const { deleteCoupon, isDeleting } = useCoupons()
  const { showSuccessToast } = useCustomToast()

  const handleDelete = () => {
    deleteCoupon(coupon.id, {
      onSuccess: () => {
        showSuccessToast("Coupon deleted successfully")
        onClose()
      },
    })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Delete Coupon</DialogTitle>
      </DialogHeader>
      <DialogBody>
        <Text>
          Are you sure you want to delete coupon <strong>{coupon.code}</strong>?
          This action cannot be undone.
        </Text>
      </DialogBody>
      <DialogFooter gap={2}>
        <DialogActionTrigger asChild>
          <Button variant="outline">Cancel</Button>
        </DialogActionTrigger>
        <Button colorPalette="red" onClick={handleDelete} loading={isDeleting}>
          Delete
        </Button>
      </DialogFooter>
    </>
  )
}

const CouponManagement = () => {
  const { coupons, isLoading } = useCoupons()
  const [editingCoupon, setEditingCoupon] = useState<CouponPublic | null>(null)
  const [deletingCoupon, setDeletingCoupon] = useState<CouponPublic | null>(
    null,
  )
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  if (isLoading) {
    return <Text>Loading coupons...</Text>
  }

  return (
    <VStack align="start" gap={4} w="100%">
      <DialogRoot
        size={{ base: "xs", md: "lg" }}
        open={isCreateOpen}
        onOpenChange={({ open }) => setIsCreateOpen(open)}
      >
        <DialogTrigger asChild>
          <Button>
            <FaPlus />
            Create Coupon
          </Button>
        </DialogTrigger>
        <DialogContent>
          <CouponForm onClose={() => setIsCreateOpen(false)} />
          <DialogCloseTrigger />
        </DialogContent>
      </DialogRoot>

      <Box
        borderWidth={1}
        borderRadius="lg"
        overflow="hidden"
        borderColor="muted"
        w="100%"
      >
        <Table.Root size={{ base: "sm", md: "md" }}>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Code</Table.ColumnHeader>
              <Table.ColumnHeader>Type</Table.ColumnHeader>
              <Table.ColumnHeader>Value</Table.ColumnHeader>
              <Table.ColumnHeader>Used</Table.ColumnHeader>
              <Table.ColumnHeader>Status</Table.ColumnHeader>
              <Table.ColumnHeader>Actions</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {coupons?.data.map((coupon) => (
              <Table.Row key={coupon.id}>
                <Table.Cell fontWeight="bold">
                  {coupon.code}
                  {coupon.is_featured && (
                    <Badge ml={2} colorPalette="purple">
                      Featured
                    </Badge>
                  )}
                </Table.Cell>
                <Table.Cell>
                  {coupon.discount_type === "percentage" ? "%" : "₹"}
                </Table.Cell>
                <Table.Cell>
                  {coupon.discount_type === "percentage"
                    ? `${coupon.discount_value}%`
                    : `₹${coupon.discount_value}`}
                </Table.Cell>
                <Table.Cell>
                  {coupon.used_count}
                  {coupon.usage_limit ? ` / ${coupon.usage_limit}` : ""}
                </Table.Cell>
                <Table.Cell>
                  <Badge colorPalette={coupon.is_active ? "green" : "gray"}>
                    {coupon.is_active ? "Active" : "Inactive"}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <HStack gap={2}>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingCoupon(coupon)}
                    >
                      <LuPencil />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      colorPalette="red"
                      onClick={() => setDeletingCoupon(coupon)}
                    >
                      <FaTrash />
                    </Button>
                  </HStack>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>

      {/* Edit Dialog */}
      <DialogRoot
        size={{ base: "xs", md: "lg" }}
        open={!!editingCoupon}
        onOpenChange={({ open }) => !open && setEditingCoupon(null)}
      >
        <DialogContent>
          {editingCoupon && (
            <CouponForm
              coupon={editingCoupon}
              onClose={() => setEditingCoupon(null)}
            />
          )}
          <DialogCloseTrigger />
        </DialogContent>
      </DialogRoot>

      {/* Delete Dialog */}
      <DialogRoot
        size={{ base: "xs", md: "md" }}
        open={!!deletingCoupon}
        onOpenChange={({ open }) => !open && setDeletingCoupon(null)}
      >
        <DialogContent>
          {deletingCoupon && (
            <DeleteCouponDialog
              coupon={deletingCoupon}
              onClose={() => setDeletingCoupon(null)}
            />
          )}
          <DialogCloseTrigger />
        </DialogContent>
      </DialogRoot>
    </VStack>
  )
}

export default CouponManagement
