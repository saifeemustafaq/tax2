"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  HiOutlineCloudUpload,
  HiOutlineLockClosed,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineInformationCircle,
  HiOutlinePlusCircle,
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

// Static document types — W-2 is excluded here and handled dynamically as slots.
const STATIC_DOCUMENT_TYPES = [
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
  // W-2 slots are inserted here dynamically (see buildCardList)
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

type StaticDocumentId = (typeof STATIC_DOCUMENT_TYPES)[number]["id"];

// W-2 ordinal labels used when there are 2+ slots
const W2_ORDINALS = ["First", "Second", "Third", "Fourth", "Fifth"];

function getW2SlotId(index: number): string {
  return index === 0 ? "w2" : `w2-${index}`;
}

function getW2IndexFromSlotId(slotId: string): number | null {
  if (slotId === "w2") return 0;
  const match = slotId.match(/^w2-(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

function isW2SlotId(slotId: string): boolean {
  return getW2IndexFromSlotId(slotId) !== null;
}

function getW2SlotTitle(slotIndex: number, totalSlots: number): string {
  if (totalSlots === 1) return "W2";
  return `W2 (${W2_ORDINALS[slotIndex] ?? `#${slotIndex + 1}`})`;
}

type CardEntry =
  | { kind: "static"; id: StaticDocumentId; title: string; description: string; infoHref?: string; required: boolean }
  | { kind: "w2slot"; id: string; title: string; description: string; required: boolean; w2Index: number }
  | { kind: "add-w2" };

function buildCardList(w2SlotCount: number): CardEntry[] {
  const entries: CardEntry[] = [];

  // passport and i20 come first
  for (const doc of STATIC_DOCUMENT_TYPES) {
    if (doc.id === "travel-history" || doc.id === "visa" || doc.id === "i94" || doc.id === "ead") continue;
    entries.push({ kind: "static", ...doc });
  }

  // W-2 slots
  for (let i = 0; i < w2SlotCount; i++) {
    entries.push({
      kind: "w2slot",
      id: getW2SlotId(i),
      title: getW2SlotTitle(i, w2SlotCount),
      description: "Wage and Tax Statement",
      required: i === 0,
      w2Index: i,
    });
  }

  // Add W-2 button (shown as a special card)
  entries.push({ kind: "add-w2" });

  // Remaining static types
  for (const doc of STATIC_DOCUMENT_TYPES) {
    if (doc.id === "passport" || doc.id === "i20") continue;
    entries.push({ kind: "static", ...doc });
  }

  return entries;
}

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
  id: string;
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

function AddW2Card({ onClick }: { onClick: () => void }) {
  return (
    <Card
      className="flex cursor-pointer flex-col border-dashed transition-colors hover:border-muted-foreground/40 hover:bg-muted/30"
      onClick={onClick}
    >
      <CardHeader className="px-4 pb-1 pt-3">
        <div className="flex justify-center">
          <HiOutlinePlusCircle className="size-8 text-muted-foreground" />
        </div>
        <CardTitle className="text-center text-base text-muted-foreground">Add W-2</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col items-center gap-1 px-4 pb-3 pt-0 text-center">
        <p className="text-sm text-muted-foreground">Upload another W-2</p>
        <p className="text-xs text-muted-foreground">For multiple employers</p>
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
  const [w2SlotCount, setW2SlotCount] = useState(1);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [uploadState, setUploadState] = useState<Record<string, UploadState>>({});
  const [savedFilenames, setSavedFilenames] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/documents")
      .then((res) => res.ok ? res.json() : null)
      .then((body) => {
        if (!body?.documents) return;
        const names: Record<string, string> = {};
        const states: Record<string, UploadState> = {};
        const staticIds = new Set(STATIC_DOCUMENT_TYPES.map((d) => d.id as string));

        let maxW2Index = -1;

        for (const doc of body.documents as { documentType: string; originalFilename: string; w2Index?: number }[]) {
          if (doc.documentType === "w2") {
            const idx = doc.w2Index ?? 0;
            const slotId = getW2SlotId(idx);
            if (doc.originalFilename && !names[slotId]) {
              names[slotId] = doc.originalFilename;
              states[slotId] = { status: "done", progress: 100, error: null };
            }
            if (idx > maxW2Index) maxW2Index = idx;
          } else if (staticIds.has(doc.documentType) && doc.originalFilename && !names[doc.documentType]) {
            names[doc.documentType] = doc.originalFilename;
            states[doc.documentType] = { status: "done", progress: 100, error: null };
          }
        }

        if (maxW2Index >= 0) {
          setW2SlotCount(maxW2Index + 1);
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
      setW2SlotCount(1);
    };
    window.addEventListener("documents:deleted", handleDeleted);
    return () => window.removeEventListener("documents:deleted", handleDeleted);
  }, []);

  const progressIntervalRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const [error, setError] = useState<string | null>(null);
  const [ssnDialogOpen, setSsnDialogOpen] = useState(false);
  const [w2SsnLast4, setW2SsnLast4] = useState<string | null>(null);
  const [i20SchoolName, setI20SchoolName] = useState<string | null>(null);
  const [travelHistoryEntryDate, setTravelHistoryEntryDate] = useState<string | null>(null);

  const handleAddW2 = useCallback(() => {
    const lastSlotId = getW2SlotId(w2SlotCount - 1);
    if (uploadState[lastSlotId]?.status !== "done") {
      toast.error(w2SlotCount === 1
        ? "Please upload your first W-2 before adding another."
        : "Please upload the previous W-2 first."
      );
      return;
    }
    setW2SlotCount((c) => Math.min(c + 1, W2_ORDINALS.length));
  }, [w2SlotCount, uploadState]);

  const handleFileChange = useCallback((id: string, file: File | null) => {
    const w2Index = getW2IndexFromSlotId(id);
    const isW2 = w2Index !== null;
    // For W-2 slots, use "w2" as the document type sent to the API; for others use the id directly
    const docTypeForApi = isW2 ? "w2" : id;
    const supported = isW2 || SUPPORTED_IDS.has(id as (typeof SUPPORTED_DOCUMENT_TYPES)[number]);

    if (progressIntervalRef.current[id]) {
      clearInterval(progressIntervalRef.current[id]);
      delete progressIntervalRef.current[id];
    }

    setFiles((prev) => ({ ...prev, [id]: file }));
    setError(null);

    if (!file) {
      setUploadState((prev) => ({ ...prev, [id]: { ...initialUploadState } }));
      return;
    }

    if (!supported) {
      setUploadState((prev) => ({ ...prev, [id]: { status: "idle", progress: 0, error: null } }));
      return;
    }

    setUploadState((prev) => ({ ...prev, [id]: { status: "uploading", progress: 0, error: null } }));

    const MOCK_DURATION_MS = 6000;
    const MOCK_STEPS = 48;
    const stepMs = MOCK_DURATION_MS / MOCK_STEPS;
    const progressCap = 85;
    let step = 0;
    const intervalId = setInterval(() => {
      step += 1;
      const progress = Math.min(Math.round((step / MOCK_STEPS) * progressCap), progressCap);
      setUploadState((prev) => {
        const cur = prev[id];
        if (!cur || cur.status === "done" || cur.status === "error") return prev;
        return { ...prev, [id]: { ...cur, status: progress >= 40 ? "processing" : "uploading", progress } };
      });
      if (step >= MOCK_STEPS && progressIntervalRef.current[id] === intervalId) {
        clearInterval(intervalId);
        delete progressIntervalRef.current[id];
      }
    }, stepMs);
    progressIntervalRef.current[id] = intervalId;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("documentType", docTypeForApi);
    if (isW2) {
      formData.append("w2Index", String(w2Index));
    }

    fetch("/api/documents/upload", { method: "POST", body: formData })
      .then(async (res) => {
        if (progressIntervalRef.current[id]) {
          clearInterval(progressIntervalRef.current[id]);
          delete progressIntervalRef.current[id];
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const message = typeof body?.error === "string" ? body.error : "Upload failed. Please try again.";
          setUploadState((prev) => ({ ...prev, [id]: { status: "error", progress: 0, error: message } }));
          toast.error(message);
          return;
        }
        const body = await res.json().catch(() => ({}));
        // Capture SSN last4 from the first W-2 (index 0)
        if (isW2 && w2Index === 0 && typeof body?.ssnLast4 === "string") {
          setW2SsnLast4(body.ssnLast4);
        }
        if (id === "i20" && typeof body?.schoolName === "string") {
          setI20SchoolName(body.schoolName);
        }
        if (id === "travel-history" && typeof body?.entryDate === "string") {
          setTravelHistoryEntryDate(body.entryDate);
        }
        setUploadState((prev) => ({ ...prev, [id]: { status: "done", progress: 100, error: null } }));
        setSavedFilenames((prev) => ({ ...prev, [id]: file.name }));

        // Retroactively update W-2 titles if we now have 2+ slots — titles are derived
        // from w2SlotCount in buildCardList, so we just need the count to be right (already tracked).
        toast.success("Document saved.");
      })
      .catch(() => {
        if (progressIntervalRef.current[id]) {
          clearInterval(progressIntervalRef.current[id]);
          delete progressIntervalRef.current[id];
        }
        setUploadState((prev) => ({
          ...prev,
          [id]: { status: "error", progress: 0, error: "Upload failed. Please try again." },
        }));
        toast.error("Upload failed. Please try again.");
      });
  }, []);

  // Required: all static required docs + the first W-2 slot
  const allRequiredUploaded =
    STATIC_DOCUMENT_TYPES.filter((d) => d.required).every((d) => uploadState[d.id]?.status === "done") &&
    uploadState["w2"]?.status === "done";

  const handleContinue = useCallback(() => {
    setError(null);
    const missingStatic = STATIC_DOCUMENT_TYPES.filter((d) => d.required && uploadState[d.id]?.status !== "done");
    const missingW2 = uploadState["w2"]?.status !== "done";
    const missingNames: string[] = [
      ...missingStatic.map((d) => d.title),
      ...(missingW2 ? ["W2"] : []),
    ];
    if (missingNames.length > 0) {
      setError(`Please upload the following required documents: ${missingNames.join(", ")}`);
      return;
    }
    setSsnDialogOpen(true);
  }, [uploadState]);

  const cardList = buildCardList(w2SlotCount);

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
        {cardList.map((entry) => {
          if (entry.kind === "add-w2") {
            return <AddW2Card key="add-w2" onClick={handleAddW2} />;
          }
          const id = entry.id;
          const state = uploadState[id] ?? initialUploadState;
          return (
            <DocumentUploadCard
              key={id}
              id={id}
              title={entry.title}
              description={entry.description}
              infoHref={"infoHref" in entry ? entry.infoHref : undefined}
              required={entry.required}
              file={files[id] ?? null}
              savedFilename={savedFilenames[id]}
              uploadStatus={state.status}
              uploadProgress={state.progress}
              uploadError={state.error}
              onFileChange={(file) => handleFileChange(id, file)}
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
