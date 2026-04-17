"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineStar,
  HiOutlinePlus,
} from "react-icons/hi";

interface BankDetailItem {
  id: string;
  bankName: string;
  accountHolderName: string;
  routingNumber: string;
  accountNumber: string;
  accountType: "checking" | "savings";
  isDefault: boolean;
  createdAt: string;
}

type FormData = {
  bankName: string;
  accountHolderName: string;
  routingNumber: string;
  accountNumber: string;
  accountType: "checking" | "savings";
  isDefault: boolean;
};

const emptyForm: FormData = {
  bankName: "",
  accountHolderName: "",
  routingNumber: "",
  accountNumber: "",
  accountType: "checking",
  isDefault: false,
};

function maskNumber(value: string): string {
  if (value.length <= 4) return value;
  return "\u2022".repeat(value.length - 4) + value.slice(-4);
}

export default function BankDetailsPage() {
  const [items, setItems] = useState<BankDetailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BankDetailItem | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/bank-details");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems(data.bankDetails ?? []);
    } catch {
      toast.error("Failed to load bank details");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = useCallback(() => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((item: BankDetailItem) => {
    setEditingId(item.id);
    setForm({
      bankName: item.bankName,
      accountHolderName: item.accountHolderName,
      routingNumber: item.routingNumber,
      accountNumber: item.accountNumber,
      accountType: item.accountType,
      isDefault: item.isDefault,
    });
    setDialogOpen(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form.bankName || !form.accountHolderName || !form.routingNumber || !form.accountNumber) {
      toast.error("Please fill in all fields");
      return;
    }

    if (!/^\d{9}$/.test(form.routingNumber)) {
      toast.error("Routing number must be exactly 9 digits");
      return;
    }

    if (!/^\d{4,17}$/.test(form.accountNumber)) {
      toast.error("Account number must be 4-17 digits");
      return;
    }

    setSubmitting(true);
    try {
      const url = editingId ? `/api/bank-details/${editingId}` : "/api/bank-details";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Request failed");
      }
      toast.success(editingId ? "Bank account updated" : "Bank account added");
      setDialogOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save bank account");
    } finally {
      setSubmitting(false);
    }
  }, [form, editingId, load]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/bank-details/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Bank account deleted");
      setDeleteTarget(null);
      await load();
    } catch {
      toast.error("Failed to delete bank account");
    }
  }, [deleteTarget, load]);

  const handleSetDefault = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/bank-details/${id}`, { method: "PATCH" });
        if (!res.ok) throw new Error();
        toast.success("Default bank account updated");
        await load();
      } catch {
        toast.error("Failed to set default");
      }
    },
    [load]
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Bank Details
          </h1>
          <p className="text-base text-muted-foreground">
            Add bank accounts for receiving tax refunds. The default account
            will be applied to all your forms automatically.
          </p>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <HiOutlinePlus className="mr-1.5 size-4" />
          Add Account
        </Button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      )}

      {!loading && items.length === 0 && (
        <Card>
          <CardHeader className="items-center text-center">
            <CardTitle className="text-lg">No bank accounts yet</CardTitle>
            <CardDescription>
              Add a bank account to receive your tax refund via direct deposit.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {!loading && items.length > 0 && (
        <div className="grid gap-4">
          {items.map((item) => (
            <Card
              key={item.id}
              className={
                item.isDefault
                  ? "border-primary/40 bg-primary/[0.02]"
                  : undefined
              }
            >
              <CardContent className="flex items-center gap-4 p-4 sm:p-6">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {item.bankName}
                    </span>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {item.accountType}
                    </Badge>
                    {item.isDefault && (
                      <Badge variant="default" className="text-xs">
                        Default
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {item.accountHolderName}
                  </p>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 pt-1 text-xs text-muted-foreground">
                    <span>
                      Routing: {maskNumber(item.routingNumber)}
                    </span>
                    <span>
                      Account: {maskNumber(item.accountNumber)}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {!item.isDefault && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleSetDefault(item.id)}
                      aria-label="Set as default"
                      title="Set as default"
                    >
                      <HiOutlineStar className="size-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(item)}
                    aria-label="Edit"
                    title="Edit"
                  >
                    <HiOutlinePencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget(item)}
                    aria-label="Delete"
                    title="Delete"
                    className="text-destructive hover:text-destructive"
                  >
                    <HiOutlineTrash className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Bank Account" : "Add Bank Account"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update your bank account information."
                : "Enter your bank account details for direct deposit refunds."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                placeholder="e.g. Chase, Bank of America"
                value={form.bankName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, bankName: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="accountHolderName">Account Holder Name</Label>
              <Input
                id="accountHolderName"
                placeholder="Full name as it appears on the account"
                value={form.accountHolderName}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    accountHolderName: e.target.value,
                  }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="routingNumber">Routing Number</Label>
                <Input
                  id="routingNumber"
                  placeholder="9 digits"
                  maxLength={9}
                  value={form.routingNumber}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 9);
                    setForm((f) => ({ ...f, routingNumber: v }));
                  }}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  placeholder="4-17 digits"
                  maxLength={17}
                  value={form.accountNumber}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 17);
                    setForm((f) => ({ ...f, accountNumber: v }));
                  }}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="accountType">Account Type</Label>
              <Select
                value={form.accountType}
                onValueChange={(v: "checking" | "savings") =>
                  setForm((f) => ({ ...f, accountType: v }))
                }
              >
                <SelectTrigger id="accountType" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Checking</SelectItem>
                  <SelectItem value="savings">Savings</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting
                ? "Saving..."
                : editingId
                  ? "Update"
                  : "Add Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete bank account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the bank account
              {deleteTarget ? ` "${deleteTarget.bankName}"` : ""} from your
              saved details. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
