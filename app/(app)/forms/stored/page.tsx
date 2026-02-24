import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { columns, type DocumentRow } from "@/components/ui/data-table/columns";
import { DataTable } from "@/components/ui/data-table/data-table";
import { cookies } from "next/headers";
import type { DocumentListItem } from "@/app/api/documents/route";

const FORM_TYPES = new Set(["8843", "1040nr", "1040nro", "540nr"]);

async function getData(): Promise<DocumentRow[]> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const res = await fetch(`${base}/api/documents`, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { documents?: DocumentListItem[] };
  return (json.documents ?? [])
    .filter((d) => FORM_TYPES.has(d.documentType))
    .map((d) => ({
      id: d.id,
      originalFilename: d.originalFilename,
      documentType: d.documentType,
      createdAt: d.createdAt,
    }));
}

export default async function FormsStoredPage() {
  const data = await getData();

  if (data.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Stored Forms
        </h1>
        <Card>
          <CardHeader>
            <CardTitle>No generated forms yet</CardTitle>
            <CardDescription>
              Completed tax forms you generate will appear here. Go to Forms to
              view, download, or generate your 8843, 1040-NR, and 540NR.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Generated forms will be listed on this page for reference and
              download.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Stored Forms
      </h1>
      <DataTable columns={columns} data={data} />
    </div>
  );
}
