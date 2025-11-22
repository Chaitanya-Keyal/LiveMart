import { Container, type ContainerProps } from "@chakra-ui/react"
import type { ReactNode } from "react"

interface PageContainerProps extends ContainerProps {
  children: ReactNode
  variant?: "list" | "detail" | "form" | "narrow"
}

const maxWidthMap = {
  list: "7xl", // Wide for grids/tables (80rem)
  detail: "5xl", // Medium for detail views (64rem)
  form: "4xl", // Moderate for forms (56rem)
  narrow: "3xl", // Narrow for focused content like cart (48rem)
}

export const PageContainer = ({
  children,
  variant = "list",
  py = 8,
  px = { base: 4, md: 6 },
  ...props
}: PageContainerProps) => {
  return (
    <Container maxW={maxWidthMap[variant]} py={py} px={px} {...props}>
      {children}
    </Container>
  )
}

export default PageContainer
