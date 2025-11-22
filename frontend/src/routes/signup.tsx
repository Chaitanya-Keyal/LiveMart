import {
  Container,
  createListCollection,
  Flex,
  Heading,
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
import { useState } from "react"
import { type SubmitHandler, useForm } from "react-hook-form"
import { FcGoogle } from "react-icons/fc"
import { FiLock, FiMail, FiUser } from "react-icons/fi"

import type { RoleEnum, UserRegister } from "@/client"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { InputGroup } from "@/components/ui/input-group"
import { PasswordInput } from "@/components/ui/password-input"
import {
  SelectContent,
  SelectItem,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
} from "@/components/ui/select"
import useAuth, { isLoggedIn } from "@/hooks/useAuth"
import { confirmPasswordRules, emailPattern, passwordRules } from "@/utils"

export const Route = createFileRoute("/signup")({
  component: SignUp,
  beforeLoad: async () => {
    if (isLoggedIn()) {
      throw redirect({
        to: "/",
      })
    }
  },
})

interface UserRegisterForm extends UserRegister {
  confirm_password: string
}

const roleCollection = createListCollection({
  items: [
    { value: "customer" as RoleEnum, label: "Customer" },
    { value: "retailer" as RoleEnum, label: "Retailer" },
    { value: "wholesaler" as RoleEnum, label: "Wholesaler" },
    { value: "delivery_partner" as RoleEnum, label: "Delivery Partner" },
  ],
})

function SignUp() {
  const { signUpMutation, startGoogleLogin } = useAuth()
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["customer"])
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<UserRegisterForm>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      email: "",
      full_name: "",
      password: "",
      confirm_password: "",
    },
  })

  const onSubmit: SubmitHandler<UserRegisterForm> = (data) => {
    // Guard against duplicate submissions while the mutation is in flight
    if (signUpMutation.isPending) return
    signUpMutation.mutate({
      ...data,
      roles: selectedRoles as RoleEnum[],
    })
  }

  return (
    <Flex flexDir={{ base: "column", md: "row" }} justify="center" h="100vh">
      <Container
        maxW="lg"
        px={{ base: 4, md: 6 }}
        alignItems="stretch"
        justifyContent="center"
        centerContent
      >
        <Stack gap={8} as="form" onSubmit={handleSubmit(onSubmit)}>
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
              Create your account
            </Heading>
            <Text color="fg.muted" fontSize="sm">
              Get started with LiveMart today
            </Text>
          </Stack>

          {/* Form Fields */}
          <Stack
            gap={4}
            p={{ base: 6, md: 8 }}
            borderRadius="xl"
            borderWidth="1px"
            borderColor="border.default"
            bg="bg.surface"
            shadow="sm"
          >
            <Field
              label="Full Name"
              required
              invalid={!!errors.full_name}
              errorText={errors.full_name?.message}
            >
              <InputGroup w="100%" startElement={<FiUser />}>
                <Input
                  {...register("full_name", {
                    required: "Full Name is required",
                    minLength: {
                      value: 3,
                      message: "Full Name must be at least 3 characters",
                    },
                  })}
                  placeholder="John Doe"
                  type="text"
                />
              </InputGroup>
            </Field>

            <Field
              label="Email"
              required
              invalid={!!errors.email}
              errorText={errors.email?.message}
            >
              <InputGroup w="100%" startElement={<FiMail />}>
                <Input
                  {...register("email", {
                    required: "Email is required",
                    pattern: emailPattern,
                  })}
                  placeholder="you@example.com"
                  type="email"
                />
              </InputGroup>
            </Field>

            <Field label="Select your role" required>
              <SelectRoot
                collection={roleCollection}
                multiple
                value={selectedRoles}
                onValueChange={(details: { value: string[] }) =>
                  setSelectedRoles(details.value)
                }
              >
                <SelectTrigger>
                  <SelectValueText placeholder="Select one or more roles" />
                </SelectTrigger>
                <SelectContent>
                  {roleCollection.items.map((role) => (
                    <SelectItem item={role} key={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectRoot>
              <Text fontSize="xs" color="fg.muted" mt={1}>
                You can select multiple roles to access different features
              </Text>
            </Field>

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
                placeholder="Password"
                errors={errors}
              />
            </Field>

            <Field
              label="Confirm Password"
              required
              invalid={!!errors.confirm_password}
              errorText={errors.confirm_password?.message}
            >
              <PasswordInput
                type="confirm_password"
                startElement={<FiLock />}
                {...register(
                  "confirm_password",
                  confirmPasswordRules(getValues),
                )}
                placeholder="Confirm password"
                errors={errors}
              />
            </Field>

            <Button
              variant="solid"
              type="submit"
              loading={isSubmitting || signUpMutation.isPending}
              size="lg"
              mt={2}
            >
              Sign Up
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

          {/* Login Link */}
          <Text textAlign="center" fontSize="sm" color="fg.muted">
            Already have an account?{" "}
            <RouterLink
              to="/login"
              search={{ error: undefined }}
              className="main-link"
            >
              <Text as="span" fontWeight="semibold" color="brand.primary">
                Log In
              </Text>
            </RouterLink>
          </Text>
        </Stack>
      </Container>
    </Flex>
  )
}

export default SignUp
