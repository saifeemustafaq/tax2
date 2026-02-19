import Link from "next/link";
import { HiOutlineCloudUpload } from "react-icons/hi";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Let&apos;s determine your personal details
      </h1>
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HiOutlineCloudUpload className="size-5 text-muted-foreground" />
            Upload required documents
          </CardTitle>
          <CardDescription>
            Add your required documents so we can determine your details and
            prepare your filing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Go to Documents &rarr; Upload to add your passport, visa, I-94,
            I-20, travel history, EAD card, and W2.
          </p>
        </CardContent>
        <CardFooter>
          <Button asChild>
            <Link href="/documents/upload">Go to Upload</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
