'use client';

import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ImageIcon, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadButtonProps {
    onImageSelected: (base64: string | null) => void;
    disabled?: boolean;
    className?: string;
}

export function ImageUploadButton({ onImageSelected, disabled, className }: ImageUploadButtonProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [isConverting, setIsConverting] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validations
        if (!file.type.startsWith('image/')) {
            alert('يرجى اختيار ملف صورة صحيح (JPG, PNG, WebP)');
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            alert('حجم الصورة يجب أن لا يتجاوز 5 ميجابايت');
            return;
        }

        setIsConverting(true);
        try {
            const base64 = await convertToBase64(file);
            setPreview(base64);
            onImageSelected(base64);
        } catch (err) {
            console.error('Image conversion error:', err);
            alert('حدث خطأ أثناء معالجة الصورة');
        } finally {
            setIsConverting(false);
            // Reset input so same file can be selected again if needed (after clear)
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleClear = () => {
        setPreview(null);
        onImageSelected(null);
    };

    const convertToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    return (
        <div className={cn("inline-flex items-center", className)}>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
                disabled={disabled || isConverting}
            />

            {preview ? (
                <div className="relative group inline-block">
                    {/* Preview Thumbnail */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={preview}
                            alt="Preview"
                            className="w-full h-full object-cover"
                        />
                    </div>

                    {/* Clear Button (Absolute) */}
                    <button
                        onClick={handleClear}
                        className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-0.5 hover:bg-red-200 transition-colors shadow-sm"
                        type="button"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled || isConverting}
                    className="h-10 w-10 shrink-0"
                    title="إرفاق صورة"
                >
                    {isConverting ? (
                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    ) : (
                        <ImageIcon className="w-5 h-5 text-gray-500 hover:text-blue-600" />
                    )}
                </Button>
            )}
        </div>
    );
}
