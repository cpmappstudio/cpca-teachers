import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { Upload, Trash2, ImageIcon } from "lucide-react"
import { useState, useRef } from "react"
import Image from "next/image"

export function CampusImageUploadExample() {
    const [selectedImage, setSelectedImage] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (file) {
            setSelectedImage(file)
            const reader = new FileReader()
            reader.onload = (e) => {
                setImagePreview(e.target?.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleImageRemove = () => {
        setSelectedImage(null)
        setImagePreview(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
    }

    const triggerFileUpload = () => {
        fileInputRef.current?.click()
    }

    return (
        <div className="max-w-2xl mx-auto p-6 space-y-6">
            <div className="space-y-2">
                <h3 className="text-lg font-medium">Campus Image Upload Example</h3>
                <p className="text-sm text-muted-foreground">
                    Upload and manage campus images with preview and controls.
                </p>
            </div>

            <div className="space-y-4">
                <h4 className="text-sm font-medium border-b pb-2">Campus Image</h4>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Image Preview */}
                    <div className="space-y-3">
                        <Label>Preview</Label>
                        <AspectRatio ratio={1} className="bg-muted rounded-lg">
                            {imagePreview ? (
                                <Image
                                    src={imagePreview}
                                    alt="Campus preview"
                                    fill
                                    className="h-full w-full rounded-lg object-cover"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center rounded-lg bg-muted">
                                    <div className="text-center">
                                        <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                        <span className="text-sm text-muted-foreground">No Image</span>
                                    </div>
                                </div>
                            )}
                        </AspectRatio>
                    </div>

                    {/* Upload Controls */}
                    <div className="space-y-4 lg:col-span-2">
                        <div className="space-y-3">
                            <Label>Upload Campus Image</Label>
                            <p className="text-sm text-muted-foreground">
                                Choose a square image that represents your campus. Recommended size: 400x400px or larger.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={triggerFileUpload}
                                className="gap-2"
                            >
                                <Upload className="h-4 w-4" />
                                Upload Image
                            </Button>

                            {(selectedImage || imagePreview) && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleImageRemove}
                                    className="gap-2 text-destructive hover:text-destructive"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Remove
                                </Button>
                            )}
                        </div>

                        {selectedImage && (
                            <div className="p-3 bg-muted rounded-md">
                                <div className="text-sm">
                                    <strong>Selected File:</strong>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    Name: {selectedImage.name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    Size: {Math.round(selectedImage.size / 1024)}KB
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    Type: {selectedImage.type}
                                </div>
                            </div>
                        )}

                        {/* Hidden file input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}