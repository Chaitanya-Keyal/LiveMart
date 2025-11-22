import { Box, Heading, Tabs, Text, VStack } from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"
import PageContainer from "@/components/Common/PageContainer"
import Appearance from "@/components/UserSettings/Appearance"
import ChangePassword from "@/components/UserSettings/ChangePassword"
import ManageRoles from "@/components/UserSettings/ManageRoles"
import UserInformation from "@/components/UserSettings/UserInformation"
import useAuth from "@/hooks/useAuth"

const tabsConfig = [
  { value: "my-profile", title: "My profile", component: UserInformation },
  { value: "password", title: "Password", component: ChangePassword },
  { value: "roles", title: "Roles", component: ManageRoles },
  { value: "appearance", title: "Appearance", component: Appearance },
]

export const Route = createFileRoute("/_layout/settings")({
  component: UserSettings,
})

function UserSettings() {
  const { user: currentUser } = useAuth()

  if (!currentUser) {
    return null
  }

  return (
    <PageContainer variant="form">
      <VStack align="start" gap={8} w="100%">
        <Box>
          <Heading size="xl" mb={2}>
            User Settings
          </Heading>
          <Text fontSize="lg" color="fg.muted">
            Manage your account preferences
          </Text>
        </Box>

        <Tabs.Root defaultValue="my-profile" w="100%">
          <Tabs.List
            bg="transparent"
            borderBottomWidth="2px"
            borderColor="border.default"
            rounded="none"
            mb={6}
            gap={4}
          >
            {tabsConfig.map((tab) => (
              <Tabs.Trigger
                key={tab.value}
                value={tab.value}
                px={4}
                py={3}
                borderBottomWidth="3px"
                borderColor="transparent"
                rounded="none"
                _selected={{
                  borderColor: "brand.primary",
                  color: "brand.primary",
                  fontWeight: "600",
                  bg: "transparent",
                }}
                _hover={{
                  bg: "bg.subtle",
                }}
                transition="all 0.2s"
              >
                {tab.title}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          {tabsConfig.map((tab) => (
            <Tabs.Content key={tab.value} value={tab.value}>
              <tab.component />
            </Tabs.Content>
          ))}
        </Tabs.Root>
      </VStack>
    </PageContainer>
  )
}
