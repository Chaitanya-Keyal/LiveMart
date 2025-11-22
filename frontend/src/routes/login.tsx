import {
  Container,
  Flex,
  Heading,
  Image,
  Input,
  Separator,
  Stack,
  Tabs,
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
  const [activeTab, setActiveTab] = useState("password") // which tab is active
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
    <Flex flexDir={{ base: "column", md: "row" }} justify="center" h="100vh">
      <Container
        maxW="lg"
        px={{ base: 4, md: 6 }}
        alignItems="stretch"
        justifyContent="center"
        centerContent
      >
        <Stack gap={8} as="form" onSubmit={handleSubmit(onSubmit)} w="100%">
          {/* Header */}
          <Stack gap={2} textAlign="center">
            <Image
              src="/assets/images/logo.png"
              alt="logo"
              height="auto"
              maxW="2s"
              alignSelf="center"
            />
            <Heading size="lg" fontWeight="bold">
              Sign in to your account
            </Heading>
            <Text color="fg.muted" fontSize="sm">
              Welcome back! Please enter your details
            </Text>
          </Stack>

          {oauthErrorMessage && (
            <Text color="danger.solid" fontSize="sm" textAlign="center">
              {oauthErrorMessage}
            </Text>
          )}

          {/* Form Fields */}
          <Stack
            gap={6}
            p={{ base: 6, md: 8 }}
            borderRadius="xl"
            borderWidth="1px"
            borderColor="border.default"
            bg="bg.surface"
            shadow="sm"
          >
            {/* Shared Email */}
            <Field
              label="Email"
              required
              invalid={!!errors.username || !!error}
              errorText={errors.username?.message || error || undefined}
            >
              <InputGroup w="100%" startElement={<FiMail />}>
                <Input
                  {...register("username", {
                    required: "Email is required",
                    pattern: emailPattern,
                  })}
                  placeholder="you@example.com"
                  type="email"
                  id="login_email"
                />
              </InputGroup>
            </Field>

            {/* Tab-based Auth Options */}
            <Stack gap={4}>
              <Tabs.Root
                value={activeTab}
                onValueChange={(details) => setActiveTab(details.value)}
                variant="enclosed"
                fitted
              >
                <Tabs.List>
                  <Tabs.Trigger value="password" gap={2}>
                    <FiLock />
                    Password
                  </Tabs.Trigger>
                  <Tabs.Trigger value="otp" gap={2}>
                    <FiKey />
                    OTP
                  </Tabs.Trigger>
                </Tabs.List>

                <Tabs.Content value="password" pt={4}>
                  <Stack gap={3}>
                    <Field
                      label="Password"
                      required
                      invalid={!!errors.password}
                      errorText={errors.password?.message}
                    >
                      <PasswordInput
                        type="password"
                        startElement={<FiLock />}
                        {...register("password", passwordRules())}
                        placeholder="Enter your password"
                        errors={errors}
                      />
                    </Field>
                    <RouterLink to="/recover-password" className="main-link">
                      <Text fontSize="sm" fontWeight="medium">
                        Forgot Password?
                      </Text>
                    </RouterLink>
                  </Stack>
                </Tabs.Content>

                <Tabs.Content value="otp" pt={4}>
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
                      <Field label="OTP Code" required>
                        <Input
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          placeholder="Enter 6-digit code"
                          inputMode="numeric"
                        />
                      </Field>
                    )}
                  </Stack>
                </Tabs.Content>
              </Tabs.Root>
            </Stack>

            {/* Login Button */}
            <Button
              variant="solid"
              type="button"
              onClick={() => {
                if (activeTab === "otp") {
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
              size="lg"
              mt={2}
            >
              Log In
            </Button>
          </Stack>

          {/* OAuth */}
          <Stack direction="row" align="center" w="100%" my={2}>
            <Separator flex="1" />
            <Text fontSize="sm" color="fg.muted" px={2}>
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

          {/* Signup Link */}
          <Text textAlign="center" fontSize="sm" color="fg.muted">
            Don't have an account?{" "}
            <RouterLink to="/signup" className="main-link">
              <Text as="span" fontWeight="semibold" color="brand.primary">
                Sign Up
              </Text>
            </RouterLink>
          </Text>
        </Stack>
      </Container>
    </Flex>
  )
}
