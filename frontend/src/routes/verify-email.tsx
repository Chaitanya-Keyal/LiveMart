import { Container, Heading, Input, Stack, Text } from "@chakra-ui/react"
import { useMutation } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useMemo, useState } from "react"

import { type ApiError, UsersSignupService } from "@/client"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { InputGroup } from "@/components/ui/input-group"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

export const Route = createFileRoute("/verify-email")({
  component: VerifyEmail,
})

function VerifyEmail() {
  const navigate = useNavigate()
  const { showSuccessToast } = useCustomToast()
  const { user, pendingEmail } = useAuth()

  const email = pendingEmail || user?.email || ""
  const [code, setCode] = useState<string>("")

  const canSubmit = useMemo(() => email && code.length >= 4, [email, code])

  const verifyMutation = useMutation({
    mutationFn: () =>
      UsersSignupService.verifyEmail({
        requestBody: { email, code },
      }),
    onSuccess: () => {
      showSuccessToast("Email verified successfully")
      localStorage.setItem("email_verified", "true")
      localStorage.removeItem("pending_email")
      navigate({ to: "/" })
    },
    onError: (err: ApiError) => handleError(err),
  })

  const resendMutation = useMutation({
    mutationFn: () => UsersSignupService.resendVerificationOtp(),
    onSuccess: () => showSuccessToast("Verification code sent"),
    onError: (err: ApiError) => handleError(err),
  })

  return (
    <Container
      h="100vh"
      maxW="sm"
      alignItems="stretch"
      justifyContent="center"
      centerContent
      gap={6}
    >
      <Heading size="lg">Verify your email</Heading>
      <Text color="fg.muted">Enter the code sent to your email</Text>

      <Stack gap={4} w="100%">
        <Text color="fg.muted" fontSize="sm" mb={2}>
          Code sent to:{" "}
          <Text as="span" fontWeight="medium">
            {email || "(email unavailable)"}
          </Text>
        </Text>

        <Field label="Verification code" required>
          <InputGroup w="100%">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter code"
              type="text"
              inputMode="numeric"
            />
          </InputGroup>
        </Field>

        <Button
          variant="solid"
          onClick={() => verifyMutation.mutate()}
          loading={verifyMutation.isPending}
          disabled={!canSubmit}
          w="100%"
        >
          Verify Email
        </Button>

        <Button
          variant="outline"
          onClick={() => resendMutation.mutate()}
          loading={resendMutation.isPending}
          w="100%"
        >
          Resend Code
        </Button>
      </Stack>
    </Container>
  )
}

export default VerifyEmail
