"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label" // Need to create Label
import { FormSchema } from "@/types"

interface DynamicFormProps {
    schema: FormSchema
    onSubmit: (data: any) => void
    isSubmitting?: boolean
}

export function DynamicForm({ schema, onSubmit, isSubmitting }: DynamicFormProps) {
    const [formData, setFormData] = React.useState<Record<string, any>>({})

    const handleChange = (key: string, value: any) => {
        setFormData((prev) => ({ ...prev, [key]: value }))
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSubmit(formData)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {schema.pages.flatMap((page) =>
                page.sections.flatMap((section) =>
                    section.fields.map((field) => (
                        <div key={field.key} className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                {field.label} {field.required && <span className="text-red-500">*</span>}
                            </label>

                            {field.type === "text_multi" ? (
                                <textarea
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    required={!!field.required}
                                    onChange={(e) => handleChange(field.key, e.target.value)}
                                />
                            ) : field.type === "choice_single" ? (
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    required={!!field.required}
                                    onChange={(e) => handleChange(field.key, e.target.value)}
                                >
                                    <option value="">اختر...</option>
                                    {field.config?.options?.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <Input
                                    type={field.type === "date" ? "date" : field.type === "attachment" ? "file" : "text"}
                                    required={!!field.required}
                                    onChange={(e) => handleChange(field.key, e.target.value)}
                                />
                            )}
                        </div>
                    ))
                )
            )}

            <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "جاري الإرسال..." : "إرسال الطلب"}
            </Button>
        </form>
    )
}
