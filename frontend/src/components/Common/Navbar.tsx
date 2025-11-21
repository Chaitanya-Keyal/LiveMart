import {
  Button,
  Flex,
  HStack,
  Image,
  Text,
  useBreakpointValue,
} from "@chakra-ui/react"
import { Link } from "@tanstack/react-router"
import useAuth from "@/hooks/useAuth"
import { useCart } from "@/hooks/useCart"

import UserMenu from "./UserMenu"

function Navbar() {
  const display = useBreakpointValue({ base: "none", md: "flex" })
  const { cartQuery } = useCart()
  const { activeRole } = useAuth()
  const itemCount = (cartQuery.data?.items || []).reduce(
    (acc, it) => acc + it.quantity,
    0,
  )

  const showCart = activeRole === "customer" || activeRole === "retailer"
  const roleLabel = activeRole
    ? activeRole
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    : null

  return (
    <Flex
      display={display}
      justify="space-between"
      position="sticky"
      color="white"
      align="center"
      bg="bg.muted"
      w="100%"
      top={0}
      p={4}
    >
      <Link to="/">
        <Image src={"/assets/images/logo.png"} alt="Logo" maxW="3xs" p={2} />
      </Link>
      <Flex gap={4} alignItems="center">
        <HStack gap={3} alignItems="center">
          {roleLabel && (
            <Text fontSize="sm" fontWeight="semibold" color="whiteAlpha.900">
              Active Role: {roleLabel}
            </Text>
          )}
          {showCart && (
            <Button
              as={Link}
              size="sm"
              variant="outline"
              colorPalette="blue"
              // @ts-expect-error: 'to' is passed to the Link component via 'as'
              to="/cart"
            >
              Cart{itemCount ? ` (${itemCount})` : ""}
            </Button>
          )}
        </HStack>
        <UserMenu />
      </Flex>
    </Flex>
  )
}

export default Navbar
