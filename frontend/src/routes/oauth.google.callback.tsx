import { Container, Spinner, Stack, Text } from "@chakra-ui/react"
import { useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"

export const Route = createFileRoute("/oauth/google/callback")({
  component: OAuthCallback,
  validateSearch: (search) => {
    const token = typeof search.token === "string" ? search.token : null
    const error = typeof search.error === "string" ? search.error : null
    const new_user =
      typeof search.new_user === "string" ? search.new_user : null
    return { token, error, new_user }
  },
})

function OAuthCallback() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { token, error, new_user } = Route.useSearch()

  useEffect(() => {
    const handleCallback = async () => {
      if (error) {
        await navigate({
          to: "/login",
          search: { error },
        })
        return
      }

      if (token) {
        localStorage.setItem("access_token", token)
        await queryClient.invalidateQueries({ queryKey: ["currentUser"] })
        if (new_user === "true") {
          await navigate({ to: "/select-role", search: { token, new_user } })
        } else {
          await navigate({ to: "/" })
        }
      } else {
        await navigate({
          to: "/login",
          search: { error: "missing_token" },
        })
      }
    }

    handleCallback()
  }, [error, navigate, queryClient.invalidateQueries, token, new_user])

  return (
    <Container
      h="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <Stack align="center" gap={4}>
        <Spinner size="xl" color="ui.main" />
        <Text color="ui.main" fontSize="lg">
          Completing sign in...
        </Text>
      </Stack>
    </Container>
  )
}
