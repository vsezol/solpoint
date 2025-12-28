"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "./button";
import { Loader2, Camera, X, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value?: string; // текущий URL изображения
  onChange: (url: string | null) => void;
  onUpload?: (file: File) => Promise<string>; // функция для загрузки файла
  onDelete?: () => Promise<void>; // функция для удаления
  accept?: string;
  maxSize?: number; // в байтах
  className?: string;
  disabled?: boolean;
  label?: string;
  previewClassName?: string;
}

export function ImageUpload({
  value,
  onChange,
  onUpload,
  onDelete,
  accept = "image/jpeg,image/png,image/webp,image/gif",
  maxSize = 5 * 1024 * 1024, // 5MB по умолчанию
  className,
  disabled = false,
  label,
  previewClassName,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Валидация размера
    if (file.size > maxSize) {
      alert(`File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`);
      return;
    }

    // Валидация типа
    const allowedTypes = accept.split(",").map((t) => t.trim());
    if (!allowedTypes.includes(file.type)) {
      alert("Invalid file type. Please select an image file.");
      return;
    }

    // Создаем preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Загружаем файл если есть функция onUpload
    if (onUpload) {
      setIsUploading(true);
      try {
        const url = await onUpload(file);
        onChange(url);
        setPreview(url);
      } catch (error) {
        console.error("Error uploading image:", error);
        alert(error instanceof Error ? error.message : "Failed to upload image");
        setPreview(value || null);
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    } else {
      // Если нет функции onUpload, просто обновляем preview
      onChange(URL.createObjectURL(file));
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to remove this image?")) {
      return;
    }

    if (onDelete) {
      setIsUploading(true);
      try {
        await onDelete();
        onChange(null);
        setPreview(null);
      } catch (error) {
        console.error("Error deleting image:", error);
        alert(error instanceof Error ? error.message : "Failed to delete image");
      } finally {
        setIsUploading(false);
      }
    } else {
      onChange(null);
      setPreview(null);
    }
  };

  // Обновляем preview когда value меняется извне
  useEffect(() => {
    if (!isUploading) {
      setPreview(value || null);
    }
  }, [value, isUploading]);

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
          {label}
        </label>
      )}
      
      <div className="relative">
        {preview ? (
          <div className={cn("relative group", previewClassName || "w-full h-48 rounded-lg overflow-hidden border border-[var(--color-surface-border)] bg-[var(--color-surface)]")}>
            <Image
              src={preview}
              alt="Preview"
              fill
              className="object-cover"
              unoptimized
            />
            {!disabled && (
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={accept}
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={isUploading || disabled}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || disabled}
                  className="bg-white/90 hover:bg-white"
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                  Change
                </Button>
                {onDelete && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDelete}
                    disabled={isUploading || disabled}
                    className="bg-white/90 hover:bg-white"
                  >
                    <X className="w-4 h-4" />
                    Remove
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className={cn("border-2 border-dashed border-[var(--color-surface-border)] rounded-lg p-6 text-center", previewClassName || "h-48")}>
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              className="hidden"
              onChange={handleFileSelect}
              disabled={isUploading || disabled}
            />
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <ImageIcon className="w-12 h-12 text-[var(--color-text-muted)]" />
              <div className="text-sm text-[var(--color-text-secondary)]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || disabled}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4 mr-2" />
                      Upload Image
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">
                JPEG, PNG, WebP, GIF up to {Math.round(maxSize / 1024 / 1024)}MB
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

