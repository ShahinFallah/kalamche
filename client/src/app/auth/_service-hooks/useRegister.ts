import axios from "@/lib/api/axios"
import { ServerError } from "@/types"
import { AxiosError } from "axios"
import { AuthBody, VerificationResponse } from "../_types"
import { API_ENDPOINTS } from "@/lib/api/ENDPOINTS"

type OnSuccess = (data: VerificationResponse) => void
type OnError = (error: AxiosError<ServerError>) => void

const useRegister = () => {
  const register = async (
    form: AuthBody,
    onSuccess?: OnSuccess,
    onError?: OnError
  ) => {
    try {
      const { data } = await axios.post<VerificationResponse>(
        API_ENDPOINTS.auth.register,
        form
      )
      if (onSuccess) onSuccess(data)
    } catch (e) {
      const error = e as AxiosError<ServerError>
      if (onError) onError(error)
    } finally {
    }
  }
  return { register }
}
export default useRegister
