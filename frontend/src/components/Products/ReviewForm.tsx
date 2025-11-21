import {
  Box,
  Button,
  Field,
  Flex,
  Heading,
  Input,
  Textarea,
  VStack,
} from "@chakra-ui/react"
import { useState } from "react"
import type { ReviewCreate, ReviewPublic, ReviewUpdate } from "@/client"
import { StarRatingInput } from "./StarRating"

interface ReviewFormProps {
  onSubmit: (review: ReviewCreate | ReviewUpdate) => void
  onCancel?: () => void
  existingReview?: ReviewPublic
  isLoading?: boolean
}

export const ReviewForm = ({
  onSubmit,
  onCancel,
  existingReview,
  isLoading = false,
}: ReviewFormProps) => {
  const [rating, setRating] = useState(existingReview?.rating ?? 0)
  const [title, setTitle] = useState(existingReview?.title ?? "")
  const [content, setContent] = useState(existingReview?.content ?? "")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) {
      return
    }
    onSubmit({ rating, title, content })
  }

  const isValid =
    rating > 0 && title.trim().length > 0 && content.trim().length > 0

  return (
    <Box
      as="form"
      onSubmit={handleSubmit}
      p={6}
      borderRadius="lg"
      shadow="sm"
      borderWidth="1px"
    >
      <VStack gap={4} align="stretch">
        <Heading size="lg">
          {existingReview ? "Edit Your Review" : "Write a Review"}
        </Heading>

        <Field.Root required>
          <Field.Label>Rating</Field.Label>
          <StarRatingInput
            value={rating}
            onChange={setRating}
            size="lg"
            required
          />
          {rating === 0 && (
            <Field.ErrorText>Please select a rating</Field.ErrorText>
          )}
        </Field.Root>

        <Field.Root required>
          <Field.Label>Review Title</Field.Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Summarize your experience"
            maxLength={255}
            required
          />
        </Field.Root>

        <Field.Root required>
          <Field.Label>Review</Field.Label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your thoughts about this product..."
            rows={5}
            maxLength={2000}
            required
          />
          <Field.HelperText>{content.length}/2000 characters</Field.HelperText>
        </Field.Root>

        <Flex gap={3} justify="flex-end">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            colorPalette="blue"
            disabled={!isValid || isLoading}
            loading={isLoading}
          >
            {existingReview ? "Update Review" : "Submit Review"}
          </Button>
        </Flex>
      </VStack>
    </Box>
  )
}
