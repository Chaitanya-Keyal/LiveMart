import {
  Badge,
  Box,
  Button,
  Card,
  DialogActionTrigger,
  DialogTitle,
  Grid,
  HStack,
  Input,
  Stat,
  Table,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { FaEye, FaMoneyBillWave } from "react-icons/fa"

import type { PaymentSettlementCreate } from "@/client"
import useCustomToast from "@/hooks/useCustomToast"
import {
  useCreateSettlement,
  usePendingSettlements,
  useSettlementById,
  useSettlementHistory,
} from "@/hooks/useSettlements"
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
} from "../ui/dialog"
import { Field } from "../ui/field"

interface CreateSettlementFormData {
  user_id: string
  order_ids: string
  notes: string
}

interface PendingSettlementSummary {
  user_id: string
  user_type: string
  user_name: string
  user_email: string
  total_amount: string
  commission_amount: string
  net_amount: string
  order_count: number
  order_ids: string[]
}

const CreateSettlementDialog = ({
  pendingData,
  onClose,
}: {
  pendingData?: PendingSettlementSummary
  onClose: () => void
}) => {
  const { createSettlement, isCreating } = useCreateSettlement()
  const { showSuccessToast } = useCustomToast()

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<CreateSettlementFormData>({
    mode: "onBlur",
    defaultValues: {
      user_id: pendingData?.user_id || "",
      order_ids: pendingData?.order_ids.join(", ") || "",
      notes: "",
    },
  })

  const onSubmit = (data: CreateSettlementFormData) => {
    const payload: PaymentSettlementCreate = {
      user_id: data.user_id,
      order_ids: data.order_ids
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id),
      notes: data.notes || null,
    }

    createSettlement(payload, {
      onSuccess: () => {
        showSuccessToast("Settlement processed successfully")
        onClose()
      },
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <DialogHeader>
        <DialogTitle>Process Settlement</DialogTitle>
      </DialogHeader>
      <DialogBody>
        <VStack gap={4}>
          {pendingData && (
            <Card.Root w="100%" borderColor="border" variant="outline">
              <Card.Body>
                <VStack align="start" gap={2}>
                  <Text fontWeight="bold">{pendingData.user_name}</Text>
                  <Text fontSize="sm" color="fg.muted">
                    {pendingData.user_email}
                  </Text>
                  <HStack gap={4} mt={2}>
                    <Stat.Root key="amount">
                      <Stat.Label>Amount</Stat.Label>
                      <Stat.ValueText>
                        ₹{pendingData.total_amount}
                      </Stat.ValueText>
                    </Stat.Root>
                    <Stat.Root key="commission">
                      <Stat.Label>Commission (5%)</Stat.Label>
                      <Stat.ValueText>
                        ₹{pendingData.commission_amount}
                      </Stat.ValueText>
                    </Stat.Root>
                    <Stat.Root key="net">
                      <Stat.Label>Net Payout</Stat.Label>
                      <Stat.ValueText colorPalette="green">
                        ₹{pendingData.net_amount}
                      </Stat.ValueText>
                    </Stat.Root>
                  </HStack>
                  <Text fontSize="sm" mt={2}>
                    {pendingData.order_count} orders
                  </Text>
                </VStack>
              </Card.Body>
            </Card.Root>
          )}

          <Field
            required
            invalid={!!errors.user_id}
            errorText={errors.user_id?.message}
            label="User ID"
          >
            <Input
              {...register("user_id", { required: "User ID is required" })}
              placeholder="User UUID"
              readOnly={!!pendingData}
            />
          </Field>

          <Field
            required
            invalid={!!errors.order_ids}
            errorText={errors.order_ids?.message}
            label="Order IDs (comma-separated)"
            helperText={
              pendingData
                ? `${pendingData.order_count} unsettled orders`
                : undefined
            }
          >
            <Textarea
              {...register("order_ids", { required: "Order IDs are required" })}
              placeholder="order-uuid-1, order-uuid-2"
              rows={3}
              readOnly={!!pendingData}
            />
          </Field>

          <Field
            invalid={!!errors.notes}
            errorText={errors.notes?.message}
            label="Notes (optional)"
            helperText="Add payment reference or any notes"
          >
            <Textarea
              {...register("notes")}
              placeholder="e.g., Bank transfer ref: TXN123456"
            />
          </Field>
        </VStack>
      </DialogBody>

      <DialogFooter gap={2}>
        <DialogActionTrigger asChild>
          <Button variant="outline">Cancel</Button>
        </DialogActionTrigger>
        <Button
          type="submit"
          disabled={!isValid}
          loading={isCreating}
          colorPalette="green"
        >
          Process Settlement
        </Button>
      </DialogFooter>
    </form>
  )
}

const ViewOrdersDialog = ({ settlementId }: { settlementId: string }) => {
  const { settlement, orders, isLoading, error } =
    useSettlementById(settlementId)

  // Deduplicate orders by ID
  const uniqueOrders = orders
    ? Array.from(
        new Map(orders.map((order: any) => [order.id, order])).values(),
      )
    : []

  return (
    <>
      <DialogHeader>
        <DialogTitle>Settlement Orders</DialogTitle>
      </DialogHeader>
      <DialogBody>
        {isLoading ? (
          <Text>Loading...</Text>
        ) : error ? (
          <Text color="red.500">Error loading settlement: {error.message}</Text>
        ) : (
          <VStack align="start" gap={4} w="100%">
            {settlement && (
              <Card.Root w="100%" borderColor="border" variant="outline">
                <Card.Body>
                  <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                    <Stat.Root key="total">
                      <Stat.Label>Total Amount</Stat.Label>
                      <Stat.ValueText>₹{settlement.amount}</Stat.ValueText>
                    </Stat.Root>
                    <Stat.Root key="commission">
                      <Stat.Label>Commission</Stat.Label>
                      <Stat.ValueText>
                        ₹{settlement.commission_amount}
                      </Stat.ValueText>
                    </Stat.Root>
                    <Stat.Root key="net-payout">
                      <Stat.Label>Net Payout</Stat.Label>
                      <Stat.ValueText colorPalette="green">
                        ₹{settlement.net_amount}
                      </Stat.ValueText>
                    </Stat.Root>
                    <Stat.Root key="status">
                      <Stat.Label>Status</Stat.Label>
                      <Badge
                        colorPalette={
                          settlement.status === "completed" ? "green" : "yellow"
                        }
                      >
                        {settlement.status}
                      </Badge>
                    </Stat.Root>
                  </Grid>
                  {settlement.notes && (
                    <Text mt={4} fontSize="sm" color="fg.muted">
                      <strong>Notes:</strong> {settlement.notes}
                    </Text>
                  )}
                </Card.Body>
              </Card.Root>
            )}

            <Box w="100%">
              <Text fontWeight="bold" mb={2}>
                Orders ({uniqueOrders.length})
              </Text>
              <Box
                borderWidth={1}
                borderRadius="lg"
                overflow="hidden"
                borderColor="muted"
              >
                <Table.Root size="sm">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>Order ID</Table.ColumnHeader>
                      <Table.ColumnHeader>Subtotal</Table.ColumnHeader>
                      <Table.ColumnHeader>Status</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {uniqueOrders.map((order: any) => (
                      <Table.Row key={order.id}>
                        <Table.Cell fontFamily="mono" fontSize="sm">
                          {order.id.slice(0, 8)}...
                        </Table.Cell>
                        <Table.Cell>₹{order.order_subtotal}</Table.Cell>
                        <Table.Cell>
                          <Badge>{order.status}</Badge>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Box>
            </Box>
          </VStack>
        )}
      </DialogBody>
      <DialogFooter>
        <DialogActionTrigger asChild>
          <Button variant="outline">Close</Button>
        </DialogActionTrigger>
      </DialogFooter>
    </>
  )
}

const PaymentSettlements = () => {
  const { pendingSettlements, isLoading: isPendingLoading } =
    usePendingSettlements()
  const { settlements, isLoading: isHistoryLoading } = useSettlementHistory()
  const [creatingForUser, setCreatingForUser] =
    useState<PendingSettlementSummary | null>(null)
  const [viewingSettlement, setViewingSettlement] = useState<string | null>(
    null,
  )

  const pendingData = pendingSettlements?.pending_settlements
    ? (pendingSettlements.pending_settlements as PendingSettlementSummary[])
    : []
  const summary = pendingSettlements?.summary as
    | {
        total_platform_commission: string
        total_pending_payouts: string
        pending_settlement_count: number
      }
    | undefined

  return (
    <VStack align="start" gap={6} w="100%">
      {/* Summary Section */}
      {summary && (
        <Grid templateColumns="repeat(3, 1fr)" gap={4} w="100%">
          <Card.Root key="pending-count" borderColor="border" variant="outline">
            <Card.Body>
              <Stat.Root>
                <Stat.Label>Pending Settlements</Stat.Label>
                <Stat.ValueText fontSize="3xl">
                  {summary.pending_settlement_count}
                </Stat.ValueText>
              </Stat.Root>
            </Card.Body>
          </Card.Root>
          <Card.Root
            key="pending-payouts"
            borderColor="border"
            variant="outline"
          >
            <Card.Body>
              <Stat.Root>
                <Stat.Label>Total Pending Payouts</Stat.Label>
                <Stat.ValueText fontSize="3xl" colorPalette="green">
                  ₹{summary.total_pending_payouts}
                </Stat.ValueText>
              </Stat.Root>
            </Card.Body>
          </Card.Root>
          <Card.Root
            key="platform-commission"
            borderColor="border"
            variant="outline"
          >
            <Card.Body>
              <Stat.Root>
                <Stat.Label>Platform Commission</Stat.Label>
                <Stat.ValueText fontSize="3xl" colorPalette="blue">
                  ₹{summary.total_platform_commission}
                </Stat.ValueText>
              </Stat.Root>
            </Card.Body>
          </Card.Root>
        </Grid>
      )}

      {/* Pending Settlements Section */}
      <Box w="100%">
        <Text fontSize="2xl" fontWeight="bold" mb={4}>
          Pending Settlements
        </Text>

        {isPendingLoading ? (
          <Text>Loading...</Text>
        ) : pendingData.length === 0 ? (
          <Card.Root borderColor="border" variant="outline">
            <Card.Body>
              <Text color="fg.muted">No pending settlements</Text>
            </Card.Body>
          </Card.Root>
        ) : (
          <Grid templateColumns="repeat(auto-fill, minmax(300px, 1fr))" gap={4}>
            {pendingData.map((pending) => (
              <Card.Root
                key={pending.user_id}
                borderColor="border"
                variant="outline"
              >
                <Card.Body>
                  <VStack align="start" gap={2}>
                    <Text fontWeight="bold">{pending.user_name}</Text>
                    <Text fontSize="sm" color="fg.muted">
                      {pending.user_email}
                    </Text>
                    <Stat.Root mt={2}>
                      <Stat.Label>Net Payout</Stat.Label>
                      <Stat.ValueText colorPalette="green" fontSize="2xl">
                        ₹{pending.net_amount}
                      </Stat.ValueText>
                      <Stat.HelpText>
                        {pending.order_count} orders • ₹
                        {pending.commission_amount} commission
                      </Stat.HelpText>
                    </Stat.Root>
                    <Button
                      size="sm"
                      w="100%"
                      mt={2}
                      onClick={() => setCreatingForUser(pending)}
                    >
                      <FaMoneyBillWave />
                      Settle Payment
                    </Button>
                  </VStack>
                </Card.Body>
              </Card.Root>
            ))}
          </Grid>
        )}
      </Box>

      {/* Settlement History Section */}
      <Box w="100%">
        <Text fontSize="2xl" fontWeight="bold" mb={4}>
          Settlement History
        </Text>

        {isHistoryLoading ? (
          <Text>Loading...</Text>
        ) : (
          <Box
            borderWidth={1}
            borderRadius="lg"
            overflow="hidden"
            borderColor="muted"
          >
            <Table.Root size={{ base: "sm", md: "md" }}>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Date</Table.ColumnHeader>
                  <Table.ColumnHeader>Amount</Table.ColumnHeader>
                  <Table.ColumnHeader>Commission</Table.ColumnHeader>
                  <Table.ColumnHeader>Net Payout</Table.ColumnHeader>
                  <Table.ColumnHeader>Status</Table.ColumnHeader>
                  <Table.ColumnHeader>Actions</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {settlements?.data.map((settlement) => (
                  <Table.Row key={settlement.id}>
                    <Table.Cell>
                      {new Date(
                        settlement.settlement_date,
                      ).toLocaleDateString()}
                    </Table.Cell>
                    <Table.Cell>₹{settlement.amount}</Table.Cell>
                    <Table.Cell>₹{settlement.commission_amount}</Table.Cell>
                    <Table.Cell fontWeight="bold" colorPalette="green">
                      ₹{settlement.net_amount}
                    </Table.Cell>
                    <Table.Cell>
                      <Badge
                        colorPalette={
                          settlement.status === "completed" ? "green" : "yellow"
                        }
                      >
                        {settlement.status}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setViewingSettlement(settlement.id)}
                      >
                        <FaEye />
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Box>
        )}
      </Box>

      {/* Create Settlement Dialog */}
      <DialogRoot
        size={{ base: "xs", md: "lg" }}
        open={!!creatingForUser}
        onOpenChange={({ open }) => !open && setCreatingForUser(null)}
      >
        <DialogContent>
          {creatingForUser && (
            <CreateSettlementDialog
              pendingData={creatingForUser}
              onClose={() => setCreatingForUser(null)}
            />
          )}
          <DialogCloseTrigger />
        </DialogContent>
      </DialogRoot>

      {/* View Orders Dialog */}
      <DialogRoot
        size={{ base: "xs", md: "xl" }}
        open={!!viewingSettlement}
        onOpenChange={({ open }) => !open && setViewingSettlement(null)}
      >
        <DialogContent>
          {viewingSettlement && (
            <ViewOrdersDialog settlementId={viewingSettlement} />
          )}
          <DialogCloseTrigger />
        </DialogContent>
      </DialogRoot>
    </VStack>
  )
}

export default PaymentSettlements
