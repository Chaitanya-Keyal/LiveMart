import {
  Badge,
  Button,
  Flex,
  HStack,
  IconButton,
  Image,
  useBreakpointValue,
  useDisclosure,
  VStack,
} from "@chakra-ui/react"
import { Link, useLocation } from "@tanstack/react-router"
import { FiMenu, FiShoppingCart } from "react-icons/fi"
import useAuth from "@/hooks/useAuth"
import { useCart } from "@/hooks/useCart"
import {
  DrawerBackdrop,
  DrawerBody,
  DrawerCloseTrigger,
  DrawerContent,
  DrawerRoot,
  DrawerTrigger,
} from "../ui/drawer"
import UserMenu from "./UserMenu"

function Navbar() {
  const isMobile = useBreakpointValue({ base: true, md: false })
  const { cartQuery } = useCart()
  const { activeRole } = useAuth()
  const location = useLocation()
  const itemCount = (cartQuery.data?.items || []).reduce(
    (acc, it) => acc + it.quantity,
    0,
  )

  const showCart = activeRole === "customer" || activeRole === "retailer"

  // Role-based nav items with improved labels
  const roleItems: Record<string, { title: string; path: string }[]> = {
    admin: [{ title: "Admin Panel", path: "/admin" }],
    customer: [
      { title: "Shop", path: "/buy" },
      { title: "My Orders", path: "/orders/me" },
    ],
    retailer: [
      { title: "Shop", path: "/buy" },
      { title: "My Store", path: "/sell" },
      { title: "Orders", path: "/orders/me" },
    ],
    wholesaler: [
      { title: "Catalog", path: "/sell" },
      { title: "Orders", path: "/orders/me" },
    ],
    delivery_partner: [
      { title: "Available", path: "/delivery/available" },
      { title: "My Deliveries", path: "/delivery/mine" },
    ],
  }
  const navItems = activeRole ? roleItems[activeRole] || [] : []

  const { open, onOpen, onClose } = useDisclosure()

  const isActivePath = (path: string) => {
    // Exact match or starts with for nested routes
    return (
      location.pathname === path || location.pathname.startsWith(`${path}/`)
    )
  }

  return (
    <Flex
      as="nav"
      justify="space-between"
      align="center"
      bg="bg.surface"
      borderBottomWidth="1px"
      borderBottomColor="border.default"
      w="100%"
      position="sticky"
      top={0}
      zIndex={10}
      px={{ base: 4, md: 8 }}
      py={4}
      gap={6}
      shadow="md"
      backdropFilter="blur(10px)"
    >
      <HStack gap={{ base: 3, md: 6 }} align="center" flex={1}>
        {isMobile && (
          <DrawerRoot
            placement="start"
            open={open}
            onOpenChange={(e) => (e.open ? onOpen() : onClose())}
          >
            <DrawerBackdrop />
            <DrawerTrigger asChild>
              <IconButton
                aria-label="Open navigation"
                variant="ghost"
                size="lg"
                onClick={onOpen}
              >
                <FiMenu />
              </IconButton>
            </DrawerTrigger>
            <DrawerContent maxW="xs">
              <DrawerCloseTrigger />
              <DrawerBody>
                <VStack align="stretch" gap={2} py={4}>
                  {navItems.map((item) => (
                    <Button
                      key={item.title}
                      as={Link}
                      variant="ghost"
                      justifyContent="flex-start"
                      size="lg"
                      // @ts-expect-error to prop forwarded
                      to={item.path}
                      onClick={onClose}
                      bg={
                        isActivePath(item.path)
                          ? "brand.primary/10"
                          : "transparent"
                      }
                      color={
                        isActivePath(item.path) ? "brand.primary" : "fg.default"
                      }
                      fontWeight={isActivePath(item.path) ? "600" : "500"}
                      borderLeftWidth={isActivePath(item.path) ? "4px" : "0"}
                      borderLeftColor="brand.primary"
                      borderRadius="md"
                      _hover={{
                        bg: "brand.primary/10",
                        color: "brand.primary",
                      }}
                    >
                      {item.title}
                    </Button>
                  ))}
                </VStack>
              </DrawerBody>
              <DrawerCloseTrigger />
            </DrawerContent>
          </DrawerRoot>
        )}
        <Link to="/">
          <Image
            src={"/assets/images/logo.png"}
            alt="LiveMart"
            maxW={{ base: "110px", md: "130px" }}
            h="auto"
          />
        </Link>
        {!isMobile && navItems.length > 0 && (
          <HStack gap={2} align="center">
            {navItems.map((item) => (
              <Button
                key={item.title}
                as={Link}
                variant={isActivePath(item.path) ? "solid" : "ghost"}
                size="md"
                // @ts-expect-error to prop forwarded
                to={item.path}
                bg={isActivePath(item.path) ? "brand.primary" : "transparent"}
                color={isActivePath(item.path) ? "white" : "fg.default"}
                fontWeight="600"
                px={5}
                _hover={{
                  bg: isActivePath(item.path) ? "brand.accent" : "bg.subtle",
                }}
                transition="all 0.2s"
              >
                {item.title}
              </Button>
            ))}
          </HStack>
        )}
      </HStack>
      <HStack gap={4} alignItems="center">
        {showCart && (
          <Link to="/cart">
            <Button
              size="md"
              variant="outline"
              gap={2}
              position="relative"
              _hover={{
                bg: "bg.subtle",
                borderColor: "brand.primary",
              }}
              transition="all 0.2s"
            >
              <FiShoppingCart size={18} />
              {itemCount > 0 && (
                <>
                  <span>Cart</span>
                  <Badge
                    colorPalette="cyan"
                    variant="solid"
                    fontSize="xs"
                    px={2}
                    borderRadius="full"
                  >
                    {itemCount}
                  </Badge>
                </>
              )}
              {itemCount === 0 && <span>Cart</span>}
            </Button>
          </Link>
        )}
        <UserMenu />
      </HStack>
    </Flex>
  )
}

export default Navbar
