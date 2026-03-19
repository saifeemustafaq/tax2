"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  HiOutlineCloudUpload,
  HiOutlineLockClosed,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineInformationCircle,
} from "react-icons/hi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { SUPPORTED_DOCUMENT_TYPES } from "@/extraction/prompts";
import { SSNDialog } from "@/components/ssn-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type UploadStatus = "idle" | "uploading" | "processing" | "done" | "error";

const DOCUMENT_TYPES = [
  {
    id: "passport",
    title: "Passport",
    description: "Valid passport (Master document)",
    required: true,
  },
  {
    id: "i20",
    title: "I-20",
    description: "Certificate of Eligibility",
    required: true,
  },
  {
    id: "w2",
    title: "W2",
    description: "Wage and Tax Statement",
    required: true,
  },
  {
    id: "travel-history",
    title: "Travel History",
    description: "Travel records and stamps",
    infoHref: "https://i94.cbp.dhs.gov/",
    required: true,
  },
  {
    id: "visa",
    title: "Visa",
    description: "U.S. visa documentation",
    required: false,
  },
  {
    id: "i94",
    title: "I-94",
    description: "Arrival/Departure Record",
    required: false,
  },
  {
    id: "ead",
    title: "EAD Card",
    description: "Employment Authorization Document",
    required: false,
  },
] as const;

const REQUIRED_DOCUMENT_IDS = DOCUMENT_TYPES
  .filter((d) => d.required)
  .map((d) => d.id);

type DocumentId = (typeof DOCUMENT_TYPES)[number]["id"];

function DocumentUploadCard({
  id,
  title,
  description,
  infoHref,
  required,
  file,
  savedFilename,
  uploadStatus,
  uploadProgress,
  uploadError,
  onFileChange,
}: {
  id: DocumentId;
  title: string;
  description: string;
  infoHref?: string;
  required?: boolean;
  file: File | null;
  savedFilename?: string | null;
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
        "flex flex-col border-dashed transition-colors",
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
      <CardHeader className="px-4 pb-1 pt-3">
        <div className="flex justify-center">
          {isDone ? (
            <HiOutlineCheckCircle className="size-8 text-green-600 dark:text-green-500" />
          ) : (
            <HiOutlineCloudUpload className="size-8 text-muted-foreground" />
          )}
        </div>
        <CardTitle className="text-center text-base">
          {title}
          {required && !isDone && (
            <span className="ml-1 text-xs font-normal text-destructive">*</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col items-center gap-1 px-4 pb-3 pt-0 text-center">
        <p className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
          {description}
          {infoHref && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={infoHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label="Get your travel history"
                  >
                    <HiOutlineInformationCircle className="size-4" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Get your travel history at i94.cbp.dhs.gov</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          {file ? file.name : savedFilename ? savedFilename : "Drag & drop or click"}
        </p>

        <div className="mt-auto flex min-h-[1.5rem] w-full items-center justify-center">
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
        </div>
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
  const [aiAutoFill, setAiAutoFill] = useState(true);
  const [files, setFiles] = useState<Partial<Record<DocumentId, File | null>>>(
    {},
  );
  const [uploadState, setUploadState] = useState<
    Partial<Record<DocumentId, UploadState>>
  >({});
  const [savedFilenames, setSavedFilenames] = useState<Partial<Record<DocumentId, string>>>({});

  useEffect(() => {
    fetch("/api/documents")
      .then((res) => res.ok ? res.json() : null)
      .then((body) => {
        if (!body?.documents) return;
        const names: Partial<Record<DocumentId, string>> = {};
        const states: Partial<Record<DocumentId, UploadState>> = {};
        const validIds = new Set(DOCUMENT_TYPES.map((d) => d.id));
        for (const doc of body.documents as { documentType: string; originalFilename: string }[]) {
          const docId = doc.documentType as DocumentId;
          if (validIds.has(docId) && doc.originalFilename && !names[docId]) {
            names[docId] = doc.originalFilename;
            states[docId] = { status: "done", progress: 100, error: null };
          }
        }
        setSavedFilenames(names);
        setUploadState(states);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleDeleted = () => {
      setSavedFilenames({});
      setUploadState({});
      setFiles({});
    };
    window.addEventListener("documents:deleted", handleDeleted);
    return () => window.removeEventListener("documents:deleted", handleDeleted);
  }, []);
  const progressIntervalRef = useRef<
    Partial<Record<DocumentId, ReturnType<typeof setInterval>>>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [ssnDialogOpen, setSsnDialogOpen] = useState(false);
  const [w2SsnLast4, setW2SsnLast4] = useState<string | null>(null);
  const [i20SchoolName, setI20SchoolName] = useState<string | null>(null);
  const [travelHistoryEntryDate, setTravelHistoryEntryDate] = useState<string | null>(null);

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
        const body = await res.json().catch(() => ({}));
        if (id === "w2" && typeof body?.ssnLast4 === "string") {
          setW2SsnLast4(body.ssnLast4);
        }
        if (id === "i20" && typeof body?.schoolName === "string") {
          setI20SchoolName(body.schoolName);
        }
        if (id === "travel-history" && typeof body?.entryDate === "string") {
          setTravelHistoryEntryDate(body.entryDate);
        }
        setUploadState((prev) => ({
          ...prev,
          [id]: { status: "done", progress: 100, error: null },
        }));
        setSavedFilenames((prev) => ({ ...prev, [id]: file.name }));
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

  const allRequiredUploaded = REQUIRED_DOCUMENT_IDS.every(
    (id) => uploadState[id]?.status === "done",
  );

  const handleContinue = useCallback(() => {
    setError(null);
    const missing = REQUIRED_DOCUMENT_IDS.filter(
      (id) => uploadState[id]?.status !== "done",
    );
    if (missing.length > 0) {
      const names = missing.map(
        (id) => DOCUMENT_TYPES.find((d) => d.id === id)!.title,
      );
      setError(`Please upload the following required documents: ${names.join(", ")}`);
      return;
    }
    setSsnDialogOpen(true);
  }, [uploadState]);

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
              infoHref={"infoHref" in doc ? doc.infoHref : undefined}
              required={doc.required}
              file={files[doc.id] ?? null}
              savedFilename={savedFilenames[doc.id]}
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

      <div className="flex flex-col items-center gap-2 pt-4">
        {!allRequiredUploaded && (
          <p className="text-sm text-muted-foreground">
            Upload all required (*) documents to continue
          </p>
        )}
        <Button
          size="lg"
          className="min-w-[280px]"
          onClick={handleContinue}
          disabled={!allRequiredUploaded}
        >
          Continue with Uploaded Documents
        </Button>
      </div>

      <SSNDialog
        open={ssnDialogOpen}
        onOpenChange={setSsnDialogOpen}
        ssnLast4={w2SsnLast4}
        schoolName={i20SchoolName}
        entryDate={travelHistoryEntryDate}
      />
    </div>
  );
}
