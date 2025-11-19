import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useState } from "react"

import {
  type Body_login_login_access_token as AccessToken,
  type ApiError,
  LoginService,
  type RoleAdd,
  type RoleEnum,
  type RoleRemove,
  type RoleSwitch,
  type UserPublic,
  type UserPublicWithToken,
  type UserRegister,
  UsersService,
  UsersSignupService,
} from "@/client"
import { handleError } from "@/utils"

export const loginParams = { error: undefined } as const

const isLoggedIn = () => {
  return localStorage.getItem("access_token") !== null
}

type LoginVariables = AccessToken

const useAuth = () => {
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: user } = useQuery<UserPublic | null, Error>({
    queryKey: ["currentUser"],
    queryFn: UsersService.readUserMe,
    enabled: isLoggedIn(),
    retry: false,
  })

  const signUpMutation = useMutation({
    mutationFn: (data: UserRegister) =>
      UsersSignupService.registerUser({ requestBody: data }),

    onSuccess: (response: UserPublicWithToken) => {
      // Store the access token and pending email for verification
      localStorage.setItem("access_token", response.access_token)
      localStorage.setItem("pending_email", response.user.email)
      // Do NOT attempt to fetch current user yet (requires verified email)
      // Navigate to verify email page
      navigate({ to: "/verify-email" })
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })

  const login = async (credentials: LoginVariables) => {
    const response = await LoginService.loginAccessToken({
      formData: credentials,
    })
    localStorage.setItem("access_token", response.access_token)
    return response
  }

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["currentUser"] })
      navigate({ to: "/" })
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
  })

  const startGoogleLogin = () => {
    const apiUrl = import.meta.env.VITE_API_URL.replace(/\/$/, "")
    const url = `${apiUrl}/api/v1/login/google`
    globalThis.location.href = url
  }

  const logout = () => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("pending_email")
    localStorage.removeItem("email_verified")
    navigate({ to: "/login", search: () => loginParams })
  }

  const loginWithToken = async (token: string) => {
    localStorage.setItem("access_token", token)
    await queryClient.invalidateQueries({ queryKey: ["currentUser"] })
  }

  // Role management
  const switchRoleMutation = useMutation({
    mutationFn: (role: RoleEnum) =>
      UsersService.switchUserRole({ requestBody: { role } as RoleSwitch }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["currentUser"] })
      // Redirect to dashboard after role switch
      navigate({ to: "/" })
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
  })

  const addRoleMutation = useMutation({
    mutationFn: (role: RoleEnum) =>
      UsersService.addUserRole({ requestBody: { role } as RoleAdd }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["currentUser"] })
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
  })

  const removeRoleMutation = useMutation({
    mutationFn: (role: RoleEnum) =>
      UsersService.removeUserRole({ requestBody: { role } as RoleRemove }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["currentUser"] })
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
  })

  return {
    signUpMutation,
    loginMutation,
    logout,
    loginWithToken,
    user,
    error,
    resetError: () => setError(null),
    startGoogleLogin,
    switchRoleMutation,
    addRoleMutation,
    removeRoleMutation,
    activeRole: user?.active_role,
    availableRoles: user?.roles || [],
    isEmailVerified: localStorage.getItem("email_verified") === "true",
    pendingEmail: localStorage.getItem("pending_email"),
  }
}

export { isLoggedIn }
export default useAuth
