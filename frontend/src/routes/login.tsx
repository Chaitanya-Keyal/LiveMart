import {
  Container,
  Image,
  Input,
  Separator,
  Stack,
  Text,
} from "@chakra-ui/react"
import {
  createFileRoute,
  Link as RouterLink,
  redirect,
} from "@tanstack/react-router"
import { useMemo } from "react"
import { type SubmitHandler, useForm } from "react-hook-form"
import { FcGoogle } from "react-icons/fc"
import { FiLock, FiMail } from "react-icons/fi"

import type { Body_login_login_access_token as AccessToken } from "@/client"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { InputGroup } from "@/components/ui/input-group"
import { PasswordInput } from "@/components/ui/password-input"
import useAuth, { isLoggedIn } from "@/hooks/useAuth"
import { emailPattern, passwordRules } from "../utils"

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
  const { loginMutation, error, resetError, startGoogleLogin } = useAuth()
  const { error: oauthError } = Route.useSearch()
  const {
    register,
    handleSubmit,
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

  return (
    <Container
      as="form"
      onSubmit={handleSubmit(onSubmit)}
      h="100vh"
      maxW="sm"
      alignItems="stretch"
      justifyContent="center"
      gap={4}
      centerContent
    >
      <Image
        src="/assets/images/logo.png"
        alt="logo"
        height="auto"
        maxW="2s"
        alignSelf="center"
      />

      {oauthErrorMessage && (
        <Text color="red.500" fontSize="sm" textAlign="center" mb={2}>
          {oauthErrorMessage}
        </Text>
      )}

      <Field
        invalid={!!errors.username}
        errorText={errors.username?.message || !!error}
      >
        <InputGroup w="100%" startElement={<FiMail />}>
          <Input
            {...register("username", {
              required: "Username is required",
              pattern: emailPattern,
            })}
            placeholder="Email"
            type="email"
          />
        </InputGroup>
      </Field>
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
      <Button variant="solid" type="submit" loading={isSubmitting} w="100%">
        Log In
      </Button>

      <Stack direction="row" align="center" w="100%" my={2}>
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

      <Stack direction="row" gap={1} justify="center" mt={2}>
        <Text fontSize="sm">Don't have an account?</Text>
        <RouterLink to="/signup" className="main-link">
          <Text fontSize="sm" fontWeight="semibold">
            Sign Up
          </Text>
        </RouterLink>
      </Stack>
    </Container>
  )
}
