import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DocumentsStoredPage() {
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
