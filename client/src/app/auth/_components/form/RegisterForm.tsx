"use client"

import { Button } from "@/components/ui/button"
import { Form, FormDescription } from "@/components/ui/form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { RegisterFormValues, registerSchema } from "../../_schema/formSchema"
import FormInput from "./FormInput"
import TermsCheckbox from "./TermsCheckbox"
import VerificationCodeModal from "../VerificationCodeModal/VerificationCodeModal"
import { useState } from "react"

const RegisterForm = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false)

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      terms: false
    }
  })
  const {
    control,
    handleSubmit,
    formState: { isSubmitting }
  } = form

  const onSubmit = (data: RegisterFormValues) => {
    console.log(data)
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormInput
            control={control}
            label="Email"
            name="email"
            placeholder="name@example.com"
            type="email"
          />
          <div>
            <FormInput
              control={control}
              label="Password"
              name="password"
              placeholder="••••••••"
              type="password"
            />
            <FormDescription>
              Password must be at least 8 characters and include uppercase,
              lowercase, and numbers.
            </FormDescription>
          </div>
          <FormInput
            control={control}
            name="confirmPassword"
            label="Confirm Password"
            placeholder="••••••••"
            type="password"
          />
          <TermsCheckbox control={control} name="terms" />
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
            onClick={() => setIsOpen((prev) => !prev)}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Please wait
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </form>
      </Form>
      <VerificationCodeModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onResend={async () => {
          await new Promise((resolve) => {
            setTimeout(() => {
              resolve("")
            }, 1000)
          })
          console.log(123)
        }}
        onVerify={async (code) => {
          await new Promise((resolve) => {
            setTimeout(() => {
              return resolve(code)
            }, 2000)
          })
          console.log(code)
        }}
        codeLength={6}
        email={"shahinfallah@gmail.com"}
      />
    </>
  )
}
export default RegisterForm
