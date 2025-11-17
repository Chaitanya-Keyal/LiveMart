import {
  Accordion,
  Box,
  Container,
  Image,
  Input,
  Separator,
  Stack,
  Text,
} from "@chakra-ui/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  createFileRoute,
  Link as RouterLink,
  redirect,
  useNavigate,
} from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"
import { type SubmitHandler, useForm } from "react-hook-form"
import { FcGoogle } from "react-icons/fc"
import { FiKey, FiLock, FiMail } from "react-icons/fi"

import {
  type Body_login_login_access_token as AccessToken,
  type ApiError,
  LoginService,
} from "@/client"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { InputGroup } from "@/components/ui/input-group"
import { PasswordInput } from "@/components/ui/password-input"
import useAuth, { isLoggedIn } from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import { emailPattern, handleError, passwordRules } from "../utils"

export const Route = createFileRoute("/login")({
  component: Login,
  beforeLoad: async () => {
    if (isLoggedIn()) {
      throw redirect({
        to: "/",
      })
    }
  },
  validateSearch: (search) => {
    const error = typeof search.error === "string" ? search.error : undefined
    return { error }
  },
})

function Login() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const { loginMutation, error, resetError, startGoogleLogin } = useAuth()
  const { error: oauthError } = Route.useSearch()
  const [otpCode, setOtpCode] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [otpTimer, setOtpTimer] = useState(0)
  const [accordionValue, setAccordionValue] = useState<string[]>(["password"]) // which panel is open
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<AccessToken>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      username: "",
      password: "",
    },
  })

  const onSubmit: SubmitHandler<AccessToken> = async (data) => {
    if (isSubmitting) return

    resetError()

    try {
      await loginMutation.mutateAsync(data)
    } catch {
      // error is handled by useAuth hook
    }
  }

  const requestOtpMutation = useMutation({
    mutationFn: async (email: string) =>
      LoginService.requestLoginOtp({ requestBody: { email } }),
    onSuccess: () => {
      showSuccessToast("If the email exists, an OTP has been sent")
      setOtpSent(true)
      setOtpTimer(60)
    },
    onError: (err: ApiError) => handleError(err),
  })

  const verifyOtpMutation = useMutation({
    mutationFn: async ({ email, code }: { email: string; code: string }) =>
      LoginService.verifyLoginOtp({ requestBody: { email, code } }),
    onSuccess: async (token) => {
      localStorage.setItem("access_token", token.access_token)
      await queryClient.invalidateQueries({ queryKey: ["currentUser"] })
      showSuccessToast("Logged in with OTP")
      await navigate({ to: "/" })
    },
    onError: (err: ApiError) => handleError(err),
  })

  const oauthErrorMessage = useMemo(() => {
    switch (oauthError) {
      case "oauth_error":
        return "Google sign-in failed. Please try again."
      case "email_not_verified":
        return "Please verify your Google account email before signing in."
      case "inactive_user":
        return "Your account is inactive. Contact an administrator."
      case "missing_token":
        return "Unable to complete Google sign-in."
      default:
        return null
    }
  }, [oauthError])

  // OTP countdown timer effect

  useEffect(() => {
    if (otpTimer <= 0) return
    const id = setInterval(() => setOtpTimer((t) => (t > 0 ? t - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [otpTimer])

  return (
    <Container
      h="100vh"
      maxW="lg"
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <Stack gap={6} as="form" onSubmit={handleSubmit(onSubmit)}>
        <Stack align="center" gap={2}>
          <Image
            src="/assets/images/logo.png"
            alt="logo"
            height="auto"
            maxW="2s"
          />
        </Stack>

        {oauthErrorMessage && (
          <Text color="red.500" fontSize="sm" textAlign="center">
            {oauthErrorMessage}
          </Text>
        )}

        {/* Shared Email */}
        <Field
          label="Email"
          invalid={!!errors.username || !!error}
          errorText={errors.username?.message || error || undefined}
        >
          <InputGroup w="100%" startElement={<FiMail />}>
            <Input
              {...register("username", {
                required: "Email is required",
                pattern: emailPattern,
              })}
              placeholder="Email"
              type="email"
              id="login_email"
            />
          </InputGroup>
        </Field>

        {/* Collapsible Auth Options (Chakra v3 API) */}
        <Accordion.Root
          multiple={false}
          value={accordionValue}
          onValueChange={(details: any) =>
            setAccordionValue(details?.value ?? ["password"])
          }
          style={{ width: "100%" }}
        >
          {/* Password Panel */}
          <Box borderRadius="0.75rem" overflow="hidden">
            <Accordion.Item value="password">
              <Accordion.ItemTrigger
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: ".5rem",
                  padding: ".875rem 1rem",
                  width: "100%",
                  cursor: "pointer",
                }}
              >
                <FiLock />
                <Text flex="1" textAlign="left" fontWeight="semibold">
                  Login with Password
                </Text>
                <Accordion.ItemIndicator />
              </Accordion.ItemTrigger>
              <Accordion.ItemContent style={{ padding: "1rem" }}>
                <Stack gap={3}>
                  <PasswordInput
                    type="password"
                    startElement={<FiLock />}
                    {...register("password", passwordRules())}
                    placeholder="Password"
                    errors={errors}
                  />
                  <RouterLink to="/recover-password" className="main-link">
                    Forgot Password?
                  </RouterLink>
                </Stack>
              </Accordion.ItemContent>
            </Accordion.Item>
          </Box>

          {/* OTP Panel */}
          <Box mt={3} borderRadius="0.75rem" overflow="hidden">
            <Accordion.Item value="otp">
              <Accordion.ItemTrigger
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: ".5rem",
                  padding: ".875rem 1rem",
                  width: "100%",
                  cursor: "pointer",
                }}
              >
                <FiKey />
                <Text flex="1" textAlign="left" fontWeight="semibold">
                  Login with OTP
                </Text>
                <Accordion.ItemIndicator />
              </Accordion.ItemTrigger>
              <Accordion.ItemContent style={{ padding: "1rem" }}>
                <Stack gap={3}>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() =>
                      requestOtpMutation.mutate(getValues("username") || "")
                    }
                    w="100%"
                    loading={requestOtpMutation.isPending}
                    disabled={otpTimer > 0}
                  >
                    {(() => {
                      if (otpTimer > 0) return `Resend OTP (${otpTimer}s)`
                      return otpSent ? "Resend OTP" : "Send OTP"
                    })()}
                  </Button>
                  {otpSent && (
                    <Field label="Code">
                      <Input
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="Enter OTP code"
                        inputMode="numeric"
                      />
                    </Field>
                  )}
                </Stack>
              </Accordion.ItemContent>
            </Accordion.Item>
          </Box>
        </Accordion.Root>

        {/* Common Login button (handles password or OTP based on active panel) */}
        <Button
          variant="solid"
          type="button"
          onClick={() => {
            if (accordionValue.includes("otp")) {
              const email = getValues("username") || ""
              if (!otpSent) {
                showErrorToast("Please send OTP first")
                return
              }
              if (!otpCode) {
                showErrorToast("Enter the OTP code")
                return
              }
              verifyOtpMutation.mutate({ email, code: otpCode })
            } else {
              if (isSubmitting) return
              resetError()
              handleSubmit(onSubmit)()
            }
          }}
          loading={isSubmitting || verifyOtpMutation.isPending}
          w="100%"
        >
          Log In
        </Button>

        <Stack direction="row" align="center" w="100%">
          <Separator flex="1" />
          <Text fontSize="sm" color="gray.500" px={2}>
            or
          </Text>
          <Separator flex="1" />
        </Stack>

        <Button
          variant="outline"
          type="button"
          onClick={() => startGoogleLogin()}
          w="100%"
          gap={2}
        >
          <FcGoogle size={20} />
          Continue with Google
        </Button>

        <Stack direction="row" gap={1} justify="center">
          <Text fontSize="sm">Don't have an account?</Text>
          <RouterLink to="/signup" className="main-link">
            <Text fontSize="sm" fontWeight="semibold">
              Sign Up
            </Text>
          </RouterLink>
        </Stack>
      </Stack>
    </Container>
  )
}
