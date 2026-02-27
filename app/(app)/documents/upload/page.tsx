"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import {
  HiOutlineCloudUpload,
  HiOutlineLockClosed,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
} from "react-icons/hi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { SUPPORTED_DOCUMENT_TYPES } from "@/extraction/prompts";

type UploadStatus = "idle" | "uploading" | "processing" | "done" | "error";

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
] as const;

type DocumentId = (typeof DOCUMENT_TYPES)[number]["id"];

function DocumentUploadCard({
  id,
  title,
  description,
  file,
  uploadStatus,
  uploadProgress,
  uploadError,
  onFileChange,
}: {
  id: DocumentId;
  title: string;
  description: string;
  file: File | null;
  uploadStatus: UploadStatus;
  uploadProgress: number;
  uploadError: string | null;
  onFileChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isBusy = uploadStatus === "uploading" || uploadStatus === "processing";
  const isDone = uploadStatus === "done";
  const isError = uploadStatus === "error";

  const handleClick = () => {
    if (!isBusy) inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    onFileChange(selected ?? null);
    e.target.value = "";
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (isBusy) return;
      const dropped = e.dataTransfer.files?.[0];
      if (dropped) onFileChange(dropped);
    },
    [onFileChange, isBusy],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const statusLabel =
    uploadStatus === "uploading"
      ? "Uploading…"
      : uploadStatus === "processing"
        ? "Processing…"
        : uploadStatus === "done"
          ? "Done"
          : uploadStatus === "error"
            ? "Upload failed"
            : null;

  return (
    <Card
      className={cn(
        "border-dashed transition-colors",
        !isBusy &&
          "cursor-pointer hover:border-muted-foreground/40 hover:bg-muted/30",
        isDragging && "border-primary/50 bg-muted/50",
        (file || isDone) && "border-solid border-primary/30 bg-muted/20",
        isError && "border-destructive/30",
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
          {isDone ? (
            <HiOutlineCheckCircle className="size-12 text-green-600 dark:text-green-500" />
          ) : (
            <HiOutlineCloudUpload className="size-12 text-muted-foreground" />
          )}
        </div>
        <CardTitle className="text-center text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-2 px-6 pb-4 pt-0 text-center">
        <p className="text-sm text-muted-foreground">{description}</p>
        <p className="text-xs text-muted-foreground">
          {file ? file.name : "Drag & drop or click"}
        </p>
        {(uploadStatus === "uploading" || uploadStatus === "processing") && (
          <div className="w-full space-y-1">
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-xs text-muted-foreground">{statusLabel}</p>
          </div>
        )}
        {isDone && (
          <p className="flex items-center gap-1 text-xs text-green-600 dark:text-green-500">
            <HiOutlineCheckCircle className="size-4 shrink-0" />
            {statusLabel}
          </p>
        )}
        {isError && uploadError && (
          <p
            className="flex items-center gap-1 text-xs text-destructive"
            role="alert"
          >
            <HiOutlineExclamationCircle className="size-4 shrink-0" />
            {uploadError}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

const SUPPORTED_IDS = new Set(SUPPORTED_DOCUMENT_TYPES);

type UploadState = {
  status: UploadStatus;
  progress: number;
  error: string | null;
};

const initialUploadState: UploadState = {
  status: "idle",
  progress: 0,
  error: null,
};

export default function DocumentsUploadPage() {
  const router = useRouter();
  const [aiAutoFill, setAiAutoFill] = useState(true);
  const [files, setFiles] = useState<Partial<Record<DocumentId, File | null>>>(
    {},
  );
  const [uploadState, setUploadState] = useState<
    Partial<Record<DocumentId, UploadState>>
  >({});
  const progressIntervalRef = useRef<
    Partial<Record<DocumentId, ReturnType<typeof setInterval>>>
  >({});
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = useCallback((id: DocumentId, file: File | null) => {
    const supported = SUPPORTED_IDS.has(
      id as (typeof SUPPORTED_DOCUMENT_TYPES)[number],
    );

    if (progressIntervalRef.current[id]) {
      clearInterval(progressIntervalRef.current[id]);
      progressIntervalRef.current[id] = undefined;
    }

    setFiles((prev) => ({ ...prev, [id]: file }));
    setError(null);

    if (!file) {
      setUploadState((prev) => ({
        ...prev,
        [id]: { ...initialUploadState },
      }));
      return;
    }

    if (!supported) {
      setUploadState((prev) => ({
        ...prev,
        [id]: { status: "idle", progress: 0, error: null },
      }));
      return;
    }

    setUploadState((prev) => ({
      ...prev,
      [id]: { status: "uploading", progress: 0, error: null },
    }));

      const MOCK_DURATION_MS = 6000;
      const MOCK_STEPS = 48;
      const stepMs = MOCK_DURATION_MS / MOCK_STEPS;
      const progressCap = 85;
    let step = 0;
    const intervalId = setInterval(() => {
      step += 1;
      const progress = Math.min(
        Math.round((step / MOCK_STEPS) * progressCap),
        progressCap,
      );
      setUploadState((prev) => {
        const cur = prev[id];
        if (!cur || cur.status === "done" || cur.status === "error")
          return prev;
        return {
          ...prev,
          [id]: {
            ...cur,
            status: progress >= 40 ? "processing" : "uploading",
            progress,
          },
        };
      });
      if (
        step >= MOCK_STEPS &&
        progressIntervalRef.current[id] === intervalId
      ) {
        clearInterval(intervalId);
        progressIntervalRef.current[id] = undefined;
      }
    }, stepMs);
    progressIntervalRef.current[id] = intervalId;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("documentType", id);
    fetch("/api/documents/upload", { method: "POST", body: formData })
      .then(async (res) => {
        if (progressIntervalRef.current[id]) {
          clearInterval(progressIntervalRef.current[id]);
          progressIntervalRef.current[id] = undefined;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const message =
            typeof body?.error === "string"
              ? body.error
              : "Upload failed. Please try again.";
          setUploadState((prev) => ({
            ...prev,
            [id]: { status: "error", progress: 0, error: message },
          }));
          toast.error(message);
          return;
        }
        setUploadState((prev) => ({
          ...prev,
          [id]: { status: "done", progress: 100, error: null },
        }));
        toast.success("Document saved.");
      })
      .catch(() => {
        if (progressIntervalRef.current[id]) {
          clearInterval(progressIntervalRef.current[id]);
          progressIntervalRef.current[id] = undefined;
        }
        setUploadState((prev) => ({
          ...prev,
          [id]: {
            status: "error",
            progress: 0,
            error: "Upload failed. Please try again.",
          },
        }));
        toast.error("Upload failed. Please try again.");
      });
  }, []);

  const handleContinue = useCallback(() => {
    setError(null);
    router.push("/duration");
  }, [router]);

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
        {DOCUMENT_TYPES.map((doc) => {
          const state = uploadState[doc.id] ?? initialUploadState;
          return (
            <DocumentUploadCard
              key={doc.id}
              id={doc.id}
              title={doc.title}
              description={doc.description}
              file={files[doc.id] ?? null}
              uploadStatus={state.status}
              uploadProgress={state.progress}
              uploadError={state.error}
              onFileChange={(file) => handleFileChange(doc.id, file)}
            />
          );
        })}
      </div>

      {error && (
        <p className="text-center text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex justify-center pt-4">
        <Button size="lg" className="min-w-[280px]" onClick={handleContinue}>
          Continue with Uploaded Documents
        </Button>
      </div>
    </div>
  );
}
