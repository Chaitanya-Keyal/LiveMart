import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  type AddressCreate,
  AddressesService,
  type AddressPublic,
  type AddressUpdate,
  type ApiError,
} from "@/client"
import { handleError } from "@/utils"

const invalidateAddressQueries = async (
  queryClient: ReturnType<typeof useQueryClient>,
) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["addresses"] }),
    queryClient.invalidateQueries({ queryKey: ["currentUser"] }),
  ])
}

const useAddresses = () => {
  const queryClient = useQueryClient()
  const {
    data: addresses = [],
    isPending,
    isFetching,
  } = useQuery<AddressPublic[], ApiError>({
    queryKey: ["addresses"],
    queryFn: AddressesService.listAddresses,
  })

  const createAddressMutation = useMutation({
    mutationFn: (payload: AddressCreate) =>
      AddressesService.createAddress({ requestBody: payload }),
    onSuccess: async () => {
      await invalidateAddressQueries(queryClient)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
  })

  const updateAddressMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AddressUpdate }) =>
      AddressesService.updateAddress({
        addressId: id,
        requestBody: data,
      }),
    onSuccess: async () => {
      await invalidateAddressQueries(queryClient)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
  })

  const deleteAddressMutation = useMutation({
    mutationFn: (id: string) =>
      AddressesService.deleteAddress({ addressId: id }),
    onSuccess: async () => {
      await invalidateAddressQueries(queryClient)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
  })

  const setActiveAddressMutation = useMutation({
    mutationFn: (id: string) =>
      AddressesService.setActiveAddress({ addressId: id }),
    onSuccess: async () => {
      await invalidateAddressQueries(queryClient)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
  })

  return {
    addresses,
    isLoading: isPending || isFetching,
    createAddressMutation,
    updateAddressMutation,
    deleteAddressMutation,
    setActiveAddressMutation,
  }
}

export default useAddresses
