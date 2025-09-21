// Use backend to handle removed_image_ids


import type React from "react"
import type { ReactElement } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {Image} from "@/components/utils/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, File, FileText, ImageIcon, Music, Upload, Video, X, Undo2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MediaType } from "@/types/media-type"

interface UploadedFile {
    id: string
    name: string
    file: File
    preview?: string
    progress: number
    error?: string
    uploaded: boolean
    isNew: true
}

interface DisplayFile extends MediaType {
    isNew: false
}

interface UndoableRemoval {
    id: number
    file: DisplayFile
    removedAt: number
}

type FileItem = UploadedFile | DisplayFile

type FileTypeCategory = "image" | "video" | "audio" | "document" | "all"

const FILE_TYPE_MAPPINGS: Record<FileTypeCategory, string> = {
    image: "image/*",
    video: "video/*",
    audio: "audio/*",
    document: ".pdf,.doc,.docx,.txt,.rtf,.odt",
    all: "image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.rtf,.odt",
}

interface MediaUploaderProps {
    label?: string
    placeholder?: string
    accept?: string
    fileTypes?: FileTypeCategory[]
    multiple?: boolean
    maxFiles?: number
    maxSize?: number
    existingFiles?: MediaType[]
    onExistingFileRemove?: (file: MediaType) => void
    className?: string
    disabled?: boolean
    onFilesChange?: (files: File[]) => void
    onUploadComplete?: (files: UploadedFile[]) => void
    onError?: (error: string) => void
    showProgress?: boolean
    showPreview?: boolean
    allowRemove?: boolean
    singleFile?: boolean
    autoUpload?: boolean
    name?: string
}

export function MediaUploader({
                                  label = "Upload Files",
                                  placeholder = "Drop files here or click to browse",
                                  accept,
                                  fileTypes = ["all"],
                                  multiple = true,
                                  maxFiles = 10,
                                  maxSize = 10,
                                  existingFiles = [],
                                  onExistingFileRemove,
                                  className = "",
                                  disabled = false,
                                  onFilesChange,
                                  onUploadComplete,
                                  onError,
                                  showProgress = true,
                                  showPreview = true,
                                  allowRemove = true,
                                  singleFile = false,
                                  autoUpload = true,
                                  name,
                              }: MediaUploaderProps): ReactElement {
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
    const [displayExistingFiles, setDisplayExistingFiles] = useState<DisplayFile[]>([])
    const [removedImageIds, setRemovedImageIds] = useState<number[]>([])
    const [undoableRemovals, setUndoableRemovals] = useState<UndoableRemoval[]>([])
    const [isDragOver, setIsDragOver] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const ui = {
        thumbSize: "w-20 h-20",
        cardPadding: "p-2",
        textSizes: {
            label: "text-sm",
            primary: "text-sm",
            secondary: "text-xs",
            meta: "text-xs",
        },
    }

    const onUploadCompleteRef = useRef<MediaUploaderProps["onUploadComplete"]>(onUploadComplete)
    useEffect(() => {
        onUploadCompleteRef.current = onUploadComplete
    }, [onUploadComplete])

    // Initialize existing files
    useEffect(() => {
        const mapped: DisplayFile[] = existingFiles.map((file) => ({
            ...file,
            isNew: false,
        }))
        setDisplayExistingFiles((prev) => {
            if (prev.length === mapped.length && prev.every((p, i) => p.id === mapped[i]?.id)) {
                return prev
            }
            return mapped
        })
    }, [existingFiles])

    const getFileIcon = (fileType?: string) => {
        if (!fileType) return <File className="h-4 w-4" />
        if (fileType.startsWith("image/")) return <ImageIcon className="h-4 w-4" />
        if (fileType.startsWith("video/")) return <Video className="h-4 w-4" />
        if (fileType.startsWith("audio/")) return <Music className="h-4 w-4" />
        if (fileType.includes("pdf") || fileType.includes("document")) return <FileText className="h-4 w-4" />
        return <File className="h-4 w-4" />
    }

    const generatePreview = (file: File): Promise<string | undefined> => {
        return new Promise((resolve) => {
            if (file.type.startsWith("image/")) {
                const reader = new FileReader()
                reader.onload = (e) => resolve(e.target?.result as string)
                reader.onerror = () => resolve(undefined)
                reader.readAsDataURL(file)
            } else {
                resolve(undefined)
            }
        })
    }

    const acceptString = useMemo(() => {
        if (accept) return accept
        if (fileTypes.includes("all")) return FILE_TYPE_MAPPINGS.all
        return fileTypes.map((type) => FILE_TYPE_MAPPINGS[type]).join(",")
    }, [accept, fileTypes])

    const validateFile = (file: File): string | null => {
        if (file.size > maxSize * 1024 * 1024) {
            return `File size must be less than ${maxSize}MB`
        }
        if (
            acceptString !== "*" &&
            !acceptString.split(",").some((type) => {
                const trimmedType = type.trim()
                if (trimmedType.startsWith(".")) {
                    return file.name.toLowerCase().endsWith(trimmedType.toLowerCase())
                }
                const pattern = new RegExp("^" + trimmedType.replace("*", ".*") + "$")
                return pattern.test(file.type)
            })
        ) {
            return "File type not supported"
        }
        return null
    }

    const simulateUpload = (fileId: string) => {
        let progress = 0
        const interval = setInterval(() => {
            progress += Math.random() * 25
            if (progress >= 100) {
                progress = 100
                clearInterval(interval)
                setUploadedFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, progress: 100, uploaded: true } : f)))
            } else {
                setUploadedFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, progress } : f)))
            }
        }, 200)
    }

    const getTotalFileCount = () => displayExistingFiles.length + uploadedFiles.length

    const processFiles = useCallback(
        async (files: FileList | File[]) => {
            const fileArray = Array.from(files)
            const currentCount = getTotalFileCount()
            const availableSlots = maxFiles - currentCount

            if (singleFile && currentCount > 0) {
                onError?.("Only one file allowed. Remove existing file first.")
                return
            }
            if (availableSlots <= 0) {
                onError?.(`Maximum ${maxFiles} files allowed`)
                return
            }

            const filesToProcess = fileArray.slice(0, availableSlots)
            const newUploadedFiles: UploadedFile[] = []

            for (const file of filesToProcess) {
                const error = validateFile(file)
                const preview = await generatePreview(file)
                const uploadedFile: UploadedFile = {
                    id: Math.random().toString(36).slice(2, 11),
                    name: file.name,
                    file,
                    preview,
                    progress: 0,
                    error: error || undefined,
                    uploaded: false,
                    isNew: true,
                }
                newUploadedFiles.push(uploadedFile)
            }

            if (singleFile) {
                setUploadedFiles(newUploadedFiles)
                setDisplayExistingFiles([])
            } else {
                setUploadedFiles((prev) => [...prev, ...newUploadedFiles])
            }

            if (autoUpload) {
                newUploadedFiles.forEach((file) => {
                    if (!file.error) simulateUpload(file.id)
                })
            }

            const validFiles = newUploadedFiles.filter((f) => !f.error).map((f) => f.file)
            if (validFiles.length > 0) {
                const allNewFiles = [...uploadedFiles.map((f) => f.file), ...validFiles]
                onFilesChange?.(allNewFiles)
            }
        },
        [getTotalFileCount, maxFiles, singleFile, autoUpload, onError, validateFile, uploadedFiles, onFilesChange],
    )

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            processFiles(e.target.files)
        }
    }

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragOver(false)
        if (!disabled) {
            processFiles(e.dataTransfer.files)
        }
    }

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        if (!disabled) setIsDragOver(true)
    }

    const handleDragLeave = () => {
        setIsDragOver(false)
    }

    const removeNewFile = (fileId: string) => {
        setUploadedFiles((prev) => {
            const updated = prev.filter((f) => f.id !== fileId)
            onFilesChange?.(updated.map((f) => f.file))
            return updated
        })
    }

    const removeExistingFile = (file: DisplayFile) => {
        // Move file to undoable removals instead of immediately removing
        const undoableRemoval: UndoableRemoval = {
            id: file.id,
            file,
            removedAt: Date.now()
        }

        setUndoableRemovals((prev) => [...prev, undoableRemoval])
        setDisplayExistingFiles((prev) => prev.filter((f) => f.id !== file.id))
        onExistingFileRemove?.(file)

    }

    const undoRemoval = (fileId: number) => {
        const undoableRemoval = undoableRemovals.find(r => r.id === fileId)
        if (undoableRemoval) {
            setDisplayExistingFiles((prev) => [...prev, undoableRemoval.file])
            setUndoableRemovals((prev) => prev.filter(r => r.id !== fileId))
        }
    }

    const confirmRemoval = (fileId: number) => {
        setUndoableRemovals((prev) => prev.filter(r => r.id !== fileId))
        setRemovedImageIds((prev) => [...prev, fileId])
    }

    const clearAll = () => {
        setUploadedFiles([])
        setDisplayExistingFiles([])
        onFilesChange?.([])
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
    }

    const manualUpload = () => {
        uploadedFiles.forEach((file) => {
            if (!file.error && !file.uploaded) {
                simulateUpload(file.id)
            }
        })
    }

    const formatFileSize = (bytes?: number | string) => {
        const numBytes = typeof bytes === "string" ? Number.parseInt(bytes) || 0 : bytes || 0
        if (numBytes === 0) return "Unknown size"
        const k = 1024
        const sizes = ["Bytes", "KB", "MB", "GB"]
        const i = Math.floor(Math.log(numBytes) / Math.log(k))
        return Number.parseFloat((numBytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
    }

    const allFiles: FileItem[] = useMemo(
        () => [...displayExistingFiles, ...uploadedFiles],
        [displayExistingFiles, uploadedFiles],
    )

    const allNewUploaded = uploadedFiles.length > 0 && uploadedFiles.every((f) => f.uploaded || f.error)

    useEffect(() => {
        if (allNewUploaded && uploadedFiles.some((f) => f.uploaded)) {
            onUploadCompleteRef.current?.(uploadedFiles.filter((f) => f.uploaded))
        }
    }, [allNewUploaded, uploadedFiles])

    // Timer for updating countdown displays and handling auto-removal
    useEffect(() => {
        if (undoableRemovals.length === 0) return

        const interval = setInterval(() => {
            const now = Date.now()
            setUndoableRemovals((prev) => {
                const updated = prev.filter((removal) => {
                    const timeLeft = removal.removedAt + 10000 - now
                    if (timeLeft <= 0) {
                        // Auto-confirm removal
                        setRemovedImageIds((prevIds) => [...prevIds, removal.id])
                        return false
                    }
                    return true
                })
                return updated
            })
        }, 1000)

        return () => clearInterval(interval)
    }, [undoableRemovals.length])

    return (
        <div className={cn("space-y-2", className)}>
            {label && <Label className={cn("text-foreground", ui.textSizes.label)}>{label}</Label>}

            <div
                className={cn(
                    "mt-2 border-2 border-dashed rounded-lg p-4 text-center transition-all duration-200",
                    "hover:border-primary/60 hover:bg-accent/50",
                    isDragOver ? "border-primary bg-primary/5 scale-[1.02]" : "border-border",
                    disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                )}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => !disabled && fileInputRef.current?.click()}
                role="button"
                aria-disabled={disabled}
                aria-label={placeholder}
            >
                <Upload
                    className={cn(
                        "mx-auto mb-3 transition-colors",
                        "h-8 w-8",
                        isDragOver ? "text-primary" : "text-muted-foreground",
                    )}
                />
                <p className={cn("font-medium mb-1", ui.textSizes.primary)}>{placeholder}</p>
                <p className={cn("text-muted-foreground mb-2", ui.textSizes.secondary)}>
                    {singleFile ? "Single file" : `Up to ${maxFiles} files`} • Max {maxSize}MB each
                </p>
                {getTotalFileCount() > 0 && (
                    <p className={cn("text-muted-foreground", ui.textSizes.secondary)}>
                        {getTotalFileCount()} of {maxFiles} files selected
                    </p>
                )}
            </div>

            <Input
                ref={fileInputRef}
                type="file"
                accept={acceptString}
                multiple={multiple && !singleFile}
                onChange={handleFileInput}
                className="hidden"
                disabled={disabled}
                name={name}
            />

            {allFiles.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h4 className={cn("font-semibold text-foreground", ui.textSizes.label)}>Files ({allFiles.length})</h4>
                        <div className="flex gap-2">
                            {!autoUpload && uploadedFiles.length > 0 && (
                                <Button size="sm" onClick={manualUpload} disabled={uploadedFiles.every((f) => f.uploaded || f.error)}>
                                    Upload
                                </Button>
                            )}
                            {allowRemove && (
                                <Button size="sm" variant="destructive" onClick={clearAll}>
                                    Clear All
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        {allFiles.map((fileItem) => (
                            <Card key={`${fileItem.isNew ? "new" : "existing"}-${fileItem.id}`} className="overflow-hidden p-2">
                                <CardContent className={ui.cardPadding}>
                                    <div className="flex items-center gap-3">
                                        {showPreview && (
                                            <div className="flex-shrink-0">
                                                {(() => {
                                                    const previewSrc = fileItem.isNew ? fileItem.preview : fileItem.url
                                                    const isImageFile = fileItem.isNew
                                                        ? fileItem.file.type.startsWith("image/")
                                                        : fileItem.mime_type?.startsWith("image/") ||
                                                        previewSrc?.match(/\.(jpg|jpeg|png|gif|webp)$/i)

                                                    return previewSrc && isImageFile ? (
                                                        <div className={cn("w-60 h-60 rounded border", ui.thumbSize)}>
                                                            <Image
                                                                src={previewSrc}
                                                                alt={fileItem.isNew ? fileItem.name : fileItem.file_name}
                                                                className="object-contain"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div
                                                            className={cn(
                                                                "rounded-md border flex items-center justify-center bg-muted",
                                                                ui.thumbSize,
                                                            )}
                                                        >
                                                            {getFileIcon(fileItem.isNew ? fileItem.file.type : fileItem.mime_type)}
                                                        </div>
                                                    )
                                                })()}
                                            </div>
                                        )}

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p
                                                            className={cn("font-medium truncate", ui.textSizes.primary)}
                                                            title={fileItem.isNew ? fileItem.name : fileItem.file_name}
                                                        >
                                                            {fileItem.isNew ? fileItem.name : fileItem.file_name}
                                                        </p>
                                                        {!fileItem.isNew && (
                                                            <div className="flex items-center gap-1">
                                                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                                                                    Existing
                                                                </Badge>
                                                                {"url" in fileItem && fileItem.url && (
                                                                    <a
                                                                        href={fileItem.url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex h-5 w-5 items-center justify-center hover:bg-accent rounded"
                                                                        aria-label="Open file in new tab"
                                                                    >
                                                                        <ExternalLink className="h-3 w-3" />
                                                                    </a>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className={cn("text-muted-foreground", ui.textSizes.meta)}>
                                                        {formatFileSize(fileItem.isNew ? fileItem.file.size : fileItem.size)}
                                                    </p>
                                                </div>

                                                {allowRemove && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => (fileItem.isNew ? removeNewFile(fileItem.id) : removeExistingFile(fileItem))}
                                                        className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                                                        aria-label="Remove file"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>

                                            {fileItem.isNew && showProgress && fileItem.progress < 100 && !fileItem.error && (
                                                <div className="mt-2">
                                                    <Progress value={fileItem.progress} className="h-1" />
                                                    <p className={cn("text-muted-foreground mt-1", ui.textSizes.meta)}>
                                                        {Math.round(fileItem.progress)}% uploaded
                                                    </p>
                                                </div>
                                            )}

                                            <div className="flex gap-1.5 mt-1">
                                                {fileItem.isNew && fileItem.uploaded && (
                                                    <Badge variant="default" className="text-[10px] px-1.5 py-0.5">
                                                        ✓ Uploaded
                                                    </Badge>
                                                )}
                                                {fileItem.isNew && fileItem.error && (
                                                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">
                                                        {fileItem.error}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Undo notifications for recently removed files */}
            {undoableRemovals.length > 0 && (
                <div className="space-y-2">
                    <h4 className={cn("font-semibold text-foreground", ui.textSizes.label)}>
                        Recently Removed ({undoableRemovals.length})
                    </h4>
                    {undoableRemovals.map((removal) => (
                        <Card key={`undo-${removal.id}`} className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
                            <CardContent className="p-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex-shrink-0">
                                            {removal.file.url && (removal.file.mime_type?.startsWith("image/") || removal.file.url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) ? (
                                                <div className="w-12 h-12 rounded border">
                                                    <Image
                                                        src={removal.file.url}
                                                        alt={removal.file.file_name}
                                                        className="object-cover rounded"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-12 h-12 rounded-md border flex items-center justify-center bg-muted">
                                                    {getFileIcon(removal.file.mime_type)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className={cn("font-medium truncate", ui.textSizes.primary)} title={removal.file.file_name}>
                                                {removal.file.file_name}
                                            </p>
                                            <p className={cn("text-muted-foreground", ui.textSizes.meta)}>
                                                Removed • Will be permanently deleted in {Math.max(0, Math.ceil((removal.removedAt + 10000 - Date.now()) / 1000))}s
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => undoRemoval(removal.id)}
                                            className="h-8 px-3 text-xs"
                                        >
                                            <Undo2 className="h-3 w-3 mr-1" />
                                            Undo
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => confirmRemoval(removal.id)}
                                            className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                                            aria-label="Confirm removal"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Hidden inputs for removed image IDs */}
            {removedImageIds.map((imageId) => (
                <input
                    key={imageId}
                    type="hidden"
                    name="removed_image_ids[]"
                    value={imageId}
                />
            ))}
        </div>
    )
}
