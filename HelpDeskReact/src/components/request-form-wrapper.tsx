"use client"

import { useState } from "react"
import { DynamicForm } from "@/components/dynamic-form"
import { FormSchema } from "@/types"
import { submitRequest } from "@/app/actions"

interface RequestFormWrapperProps {
    schema: FormSchema
    serviceId: string
}

export function RequestFormWrapper({ schema, serviceId }: RequestFormWrapperProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (data: any) => {
        setIsSubmitting(true)
        try {
            const result = await submitRequest({ ...data, serviceId })
            if (result.success) {
                alert(result.message) // Simple feedback for now
                // In real app: toast.success(result.message) and redirect
            }
        } catch (error) {
            console.error("Error submitting request:", error)
            alert("حدث خطأ أثناء تقديم الطلب")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <DynamicForm
            schema={schema}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
        />
    )
}
