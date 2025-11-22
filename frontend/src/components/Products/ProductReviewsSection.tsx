import {
  Badge,
  Box,
  Button,
  Card,
  createListCollection,
  Flex,
  Heading,
  HStack,
  IconButton,
  Portal,
  Select,
  Separator,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useState } from "react"
import { FaEdit, FaTrash } from "react-icons/fa"
import type { ReviewPublic } from "@/client"
import useAuth from "@/hooks/useAuth"
import {
  useCreateReview,
  useDeleteReview,
  useHasPurchasedProduct,
  useProductReviews,
  useUpdateReview,
} from "@/hooks/useReviews"
import { ReviewForm } from "./ReviewForm"
import { StarRating } from "./StarRating"

interface ProductReviewsSectionProps {
  productId: string
}

export const ProductReviewsSection = ({
  productId,
}: ProductReviewsSectionProps) => {
  const { user } = useAuth()
  const [sort, setSort] = useState<"newest" | "rating_desc" | "rating_asc">(
    "newest",
  )
  const [showForm, setShowForm] = useState(false)
  const [editingReview, setEditingReview] = useState<ReviewPublic | null>(null)

  const { reviews, count, isPending } = useProductReviews({
    productId,
    sort,
    limit: 50,
  })

  const createMutation = useCreateReview()
  const updateMutation = useUpdateReview()
  const deleteMutation = useDeleteReview()

  const { hasPurchased, isPending: isPurchaseCheckPending } =
    useHasPurchasedProduct(productId, !!user)

  const userReview = reviews.find((r) => r.author_user_id === user?.id)

  const handleCreateReview = (reviewData: any) => {
    createMutation.mutate(
      { productId, review: reviewData },
      {
        onSuccess: () => {
          setShowForm(false)
        },
      },
    )
  }

  const handleUpdateReview = (reviewData: any) => {
    if (!editingReview) return
    updateMutation.mutate(
      {
        reviewId: editingReview.id,
        productId,
        update: reviewData,
      },
      {
        onSuccess: () => {
          setEditingReview(null)
        },
      },
    )
  }

  const handleDeleteReview = (reviewId: string) => {
    if (!confirm("Are you sure you want to delete this review?")) return
    deleteMutation.mutate({ reviewId, productId })
  }

  if (isPending) {
    return (
      <Box py={8}>
        <Text>Loading reviews...</Text>
      </Box>
    )
  }

  return (
    <Box py={8}>
      <VStack gap={6} align="stretch">
        <Flex justify="space-between" align="center">
          <Heading size="xl">Customer Reviews ({count})</Heading>
          {user &&
            !userReview &&
            !showForm &&
            !editingReview &&
            hasPurchased &&
            !isPurchaseCheckPending && (
              <Button onClick={() => setShowForm(true)}>Write a Review</Button>
            )}
        </Flex>

        {/* Review Form */}
        {showForm && (
          <ReviewForm
            onSubmit={handleCreateReview}
            onCancel={() => setShowForm(false)}
            isLoading={createMutation.isPending}
          />
        )}

        {editingReview && (
          <ReviewForm
            onSubmit={handleUpdateReview}
            onCancel={() => setEditingReview(null)}
            existingReview={editingReview}
            isLoading={updateMutation.isPending}
          />
        )}

        {/* Sort Controls */}
        {count > 0 && (
          <Flex gap={3} align="center">
            <Text fontWeight="medium">Sort by:</Text>
            <Select.Root
              collection={createListCollection({
                items: [
                  { label: "Most Recent", value: "newest" },
                  { label: "Highest Rating", value: "rating_desc" },
                  { label: "Lowest Rating", value: "rating_asc" },
                ],
              })}
              size="sm"
              width="200px"
              value={[sort]}
              onValueChange={(e) => setSort(e.value[0] as typeof sort)}
            >
              <Select.Control>
                <Select.Trigger>
                  <Select.ValueText />
                </Select.Trigger>
                <Select.IndicatorGroup>
                  <Select.Indicator />
                </Select.IndicatorGroup>
              </Select.Control>
              <Portal>
                <Select.Positioner>
                  <Select.Content>
                    <Select.Item
                      item={{ label: "Most Recent", value: "newest" }}
                    >
                      Most Recent
                      <Select.ItemIndicator />
                    </Select.Item>
                    <Select.Item
                      item={{ label: "Highest Rating", value: "rating_desc" }}
                    >
                      Highest Rating
                      <Select.ItemIndicator />
                    </Select.Item>
                    <Select.Item
                      item={{ label: "Lowest Rating", value: "rating_asc" }}
                    >
                      Lowest Rating
                      <Select.ItemIndicator />
                    </Select.Item>
                  </Select.Content>
                </Select.Positioner>
              </Portal>
            </Select.Root>
          </Flex>
        )}

        {/* Reviews List */}
        {count === 0 ? (
          hasPurchased && !isPurchaseCheckPending ? (
            <Box textAlign="center" py={8}>
              <Text fontSize="lg" color="fg.muted">
                No reviews yet. Be the first to review this product!
              </Text>
            </Box>
          ) : (
            <Box textAlign="center" py={8}>
              <Text fontSize="lg" color="fg.muted">
                No reviews yet.
              </Text>
            </Box>
          )
        ) : (
          <VStack gap={4} align="stretch">
            {reviews.map((review) => (
              <Card.Root key={review.id} variant="outline">
                <Card.Body>
                  <VStack gap={3} align="stretch">
                    <Flex justify="space-between" align="start">
                      <Box>
                        <HStack gap={2} mb={2}>
                          <StarRating value={review.rating} size="sm" />
                          {review.author_user_id === user?.id && (
                            <Badge colorPalette="cyan">Your Review</Badge>
                          )}
                        </HStack>
                        <Heading size="md" mb={1}>
                          {review.title}
                        </Heading>
                        <Text fontSize="sm" color="fg.muted">
                          By {review.author_name || "Anonymous"} •{" "}
                          {new Date(review.created_at).toLocaleDateString()}
                        </Text>
                      </Box>
                      {review.author_user_id === user?.id && (
                        <HStack gap={2}>
                          <IconButton
                            aria-label="Edit review"
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingReview(review)}
                          >
                            <FaEdit />
                          </IconButton>
                          <IconButton
                            aria-label="Delete review"
                            size="sm"
                            variant="ghost"
                            colorPalette="red"
                            onClick={() => handleDeleteReview(review.id)}
                            loading={deleteMutation.isPending}
                          >
                            <FaTrash />
                          </IconButton>
                        </HStack>
                      )}
                    </Flex>
                    <Separator />
                    <Text>{review.content}</Text>
                  </VStack>
                </Card.Body>
              </Card.Root>
            ))}
          </VStack>
        )}
      </VStack>
    </Box>
  )
}
