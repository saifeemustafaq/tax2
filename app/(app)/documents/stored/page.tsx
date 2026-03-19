import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { columns, type DocumentRow } from "../../../../components/ui/data-table/columns";
import { DataTable } from "../../../../components/ui/data-table/data-table";
import { verifyToken, COOKIE_NAME } from "@/lib/jwt";
import { getDocumentsCollection, ensureDocumentsIndexes } from "@/lib/mongodb";

async function getData(): Promise<DocumentRow[]> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return [];

  const payload = await verifyToken(token);
  if (!payload) return [];

  await ensureDocumentsIndexes();
  const documents = await getDocumentsCollection();
  const cursor = documents.find(
    { userId: new ObjectId(payload.sub) },
    { projection: { originalFilename: 1, documentType: 1, createdAt: 1 }, sort: { createdAt: -1 } }
  );

  const list: DocumentRow[] = [];
  for await (const doc of cursor) {
    list.push({
      id: doc._id!.toString(),
      originalFilename: doc.originalFilename ?? "",
      documentType: doc.documentType,
      createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    });
  }
  return list;
}

export default async function DocumentsStoredPage() {
  const data = await getData();

  if (data.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Stored documents
        </h1>
        <Card>
          <CardHeader>
            <CardTitle>No documents stored yet</CardTitle>
            <CardDescription>
              Documents you upload will appear here. Go to Upload to add your
              required documents.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Uploaded documents will be listed on this page for reference and
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
        Stored documents
      </h1>
      <DataTable columns={columns} data={data} />
    </div>
  );
}
