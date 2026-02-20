"use client"

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import {
  HiOutlineCloudUpload,
  HiOutlineLockClosed,
} from "react-icons/hi";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const DOCUMENT_TYPES = [
  {
    id: "passport",
    title: "Passport",
    description: "Valid passport (Master document)",
  },
  {
    id: "i20",
    title: "I-20",
    description: "Certificate of Eligibility",
  },
  {
    id: "w2",
    title: "W2",
    description: "Wage and Tax Statement",
  },
  {
    id: "visa",
    title: "Visa",
    description: "U.S. visa documentation",
  },
  {
    id: "i94",
    title: "I-94",
    description: "Arrival/Departure Record",
  },
  {
    id: "travel-history",
    title: "Travel History",
    description: "Travel records and stamps",
  },
  {
    id: "ead",
    title: "EAD Card",
    description: "Employment Authorization Document",
  },
] as const

type DocumentId = (typeof DOCUMENT_TYPES)[number]["id"]

function DocumentUploadCard({
  id,
  title,
  description,
  file,
  onFileChange,
}: {
  id: DocumentId
  title: string
  description: string
  file: File | null
  onFileChange: (file: File | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleClick = () => inputRef.current?.click()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    onFileChange(selected ?? null)
    e.target.value = ""
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const dropped = e.dataTransfer.files?.[0]
      if (dropped) onFileChange(dropped)
    },
    [onFileChange]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  return (
    <Card
      className={cn(
        "cursor-pointer border-dashed transition-colors hover:border-muted-foreground/40 hover:bg-muted/30",
        isDragging && "border-primary/50 bg-muted/50",
        file && "border-solid border-primary/30 bg-muted/20"
      )}
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept=".pdf,image/*"
        aria-label={`Upload ${title}`}
        onChange={handleChange}
      />
      <CardHeader className="pb-2">
        <div className="flex justify-center">
          <HiOutlineCloudUpload className="size-12 text-muted-foreground" />
        </div>
        <CardTitle className="text-center text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-1 px-6 pb-4 pt-0 text-center">
        <p className="text-sm text-muted-foreground">{description}</p>
        <p className="text-xs text-muted-foreground">
          {file ? file.name : "Drag & drop or click"}
        </p>
      </CardContent>
    </Card>
  )
}

export default function DocumentsUploadPage() {
  const [aiAutoFill, setAiAutoFill] = useState(true)
  const [files, setFiles] = useState<Partial<Record<DocumentId, File | null>>>(
    {}
  )

  const handleFileChange = useCallback((id: DocumentId, file: File | null) => {
    setFiles((prev) => ({ ...prev, [id]: file }))
  }, [])

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Required Documents
        </h1>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox
            id="ai-autofill"
            checked={aiAutoFill}
            onCheckedChange={(v) => setAiAutoFill(v === true)}
            aria-label="AI Auto-Fill"
          />
          <HiOutlineLockClosed className="size-4 text-muted-foreground" />
          <span>AI Auto-Fill</span>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {DOCUMENT_TYPES.map((doc) => (
          <DocumentUploadCard
            key={doc.id}
            id={doc.id}
            title={doc.title}
            description={doc.description}
            file={files[doc.id] ?? null}
            onFileChange={(file) => handleFileChange(doc.id, file)}
          />
        ))}
      </div>

      <div className="flex justify-center pt-4">
        <Button size="lg" className="min-w-[280px]" asChild>
          <Link href="/duration">Continue with Uploaded Documents</Link>
        </Button>
      </div>
    </div>
  )
}
