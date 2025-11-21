import {
  Button,
  Flex,
  HStack,
  IconButton,
  Image,
  useBreakpointValue,
  useDisclosure,
  VStack,
} from "@chakra-ui/react"
import { Link } from "@tanstack/react-router"
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
  const itemCount = (cartQuery.data?.items || []).reduce(
    (acc, it) => acc + it.quantity,
    0,
  )

  const showCart = activeRole === "customer" || activeRole === "retailer"

  // Role-based nav items (excludes dashboard & user settings as per requirements)
  const roleItems: Record<string, { title: string; path: string }[]> = {
    admin: [{ title: "Admin Panel", path: "/admin" }],
    customer: [
      { title: "Browse Products", path: "/buy" },
      { title: "My Orders", path: "/orders/me" },
    ],
    retailer: [
      { title: "Buy", path: "/buy" },
      { title: "Sell", path: "/sell" },
      { title: "Orders", path: "/orders/me" },
    ],
    wholesaler: [
      { title: "Sell", path: "/sell" },
      { title: "Retailer Orders", path: "/orders/me" },
    ],
    delivery_partner: [
      { title: "Look for Orders", path: "/delivery/available" },
      { title: "My Deliveries", path: "/delivery/mine" },
    ],
  }
  const navItems = activeRole ? roleItems[activeRole] || [] : []

  const { open, onOpen, onClose } = useDisclosure()

  return (
    <Flex
      justify="space-between"
      position="sticky"
      align="center"
      bg="bg.muted"
      w="100%"
      top={0}
      p={4}
      gap={4}
    >
      <HStack gap={4} align="center">
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
                onClick={onOpen}
              >
                <FiMenu />
              </IconButton>
            </DrawerTrigger>
            <DrawerContent maxW="xs">
              <DrawerCloseTrigger />
              <DrawerBody>
                <VStack align="stretch" gap={1} py={2}>
                  {navItems.map((item) => (
                    <Button
                      key={item.title}
                      as={Link}
                      variant="ghost"
                      justifyContent="flex-start"
                      size="sm"
                      // @ts-expect-error to prop forwarded
                      to={item.path}
                      onClick={onClose}
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
          <Image src={"/assets/images/logo.png"} alt="Logo" maxW="3xs" p={2} />
        </Link>
        {!isMobile && navItems.length > 0 && (
          <HStack gap={2} align="center">
            {navItems.map((item) => (
              <Button
                key={item.title}
                as={Link}
                variant="ghost"
                size="sm"
                // @ts-expect-error to prop forwarded
                to={item.path}
              >
                {item.title}
              </Button>
            ))}
          </HStack>
        )}
      </HStack>
      <Flex gap={4} alignItems="center">
        {showCart && (
          <Link to="/cart">
            <Button size="sm" variant="outline" colorPalette="blue">
              <HStack gap={1}>
                <FiShoppingCart />
                <span>Cart{itemCount ? ` (${itemCount})` : ""}</span>
              </HStack>
            </Button>
          </Link>
        )}
        <UserMenu />
      </Flex>
    </Flex>
  )
}

export default Navbar
