import { useEffect, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useAuthStore } from "@/lib/auth-store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { bankAccountsService, usersService } from "@/lib/services";
import type { BankAccount } from "@/lib/types";

export const Route = createFileRoute("/bank-accounts")({
  head: () => ({
    meta: [
      { title: "Bank Accounts — SIKOn ERP" },
      { name: "description", content: "Manage company and sales bank accounts." },
    ],
  }),
  beforeLoad: () => {
    const { user } = useAuthStore.getState();
    if (!user || !["owner", "accounting"].includes(user.role)) throw redirect({ to: "/forbidden" });
  },
  component: BankAccountsPage,
});

interface FormState {
  bank_name: string;
  account_number: string;
  account_name: string;
  is_global: boolean;
  user_id: string;
}

const emptyForm: FormState = {
  bank_name: "",
  account_number: "",
  account_name: "",
  is_global: true,
  user_id: "",
};

function BankAccountsPage() {
  const [page, setPage] = useState(1);
  const limit = 10;
  const qc = useQueryClient();

  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["bank-accounts", { page, limit }],
    queryFn: () => bankAccountsService.list({ page, limit }),
  });

  const usersQ = useQuery({
    queryKey: ["users", { page: 1, limit: 100 }],
    queryFn: () => usersService.list({ page: 1, limit: 100 }),
  });

  const createMut = useMutation({
    mutationFn: (body: Partial<BankAccount>) => bankAccountsService.create(body),
    onSuccess: () => {
      toast.success("Bank account created");
      qc.invalidateQueries({ queryKey: ["bank-accounts"] });
      closeDialog();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<BankAccount> }) =>
      bankAccountsService.update(id, body),
    onSuccess: () => {
      toast.success("Bank account updated");
      qc.invalidateQueries({ queryKey: ["bank-accounts"] });
      closeDialog();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => bankAccountsService.delete(id),
    onSuccess: () => {
      toast.success("Bank account deleted");
      qc.invalidateQueries({ queryKey: ["bank-accounts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    if (editing) {
      setForm({
        bank_name: editing.bank_name ?? "",
        account_number: editing.account_number ?? "",
        account_name: editing.account_name ?? "",
        is_global: editing.is_global ?? !editing.user_id,
        user_id: editing.user_id ?? "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [editing]);

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(b: BankAccount) {
    setEditing(b);
    setOpen(true);
  }
  function closeDialog() {
    setOpen(false);
    setEditing(null);
    setForm(emptyForm);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.bank_name.trim() || !form.account_number.trim() || !form.account_name.trim()) {
      toast.error("Bank name, account number, and holder are required");
      return;
    }
    if (!form.is_global && !form.user_id) {
      toast.error("Select a sales user or mark as company-wide");
      return;
    }
    const body: Partial<BankAccount> = {
      bank_name: form.bank_name.trim(),
      account_number: form.account_number.trim(),
      account_name: form.account_name.trim(),
      is_global: form.is_global,
      user_id: form.is_global ? null : form.user_id,
    };
    if (editing) updateMut.mutate({ id: editing.id, body });
    else createMut.mutate(body);
  }

  const rows = data?.data ?? [];
  const totalPage = data?.paging?.total_page ?? 1;
  const saving = createMut.isPending || updateMut.isPending;
  const users = usersQ.data?.data ?? [];

  function userName(id?: string | null) {
    if (!id) return "—";
    return users.find((u) => u.id === id)?.name ?? id;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bank Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Company-wide and per-sales bank accounts used for payments.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" /> New Bank Account
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Bank Accounts</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bank</TableHead>
                <TableHead>Account Number</TableHead>
                <TableHead>Holder</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead className="w-[1%]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Loading bank accounts…
                  </TableCell>
                </TableRow>
              )}
              {isError && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-destructive">
                    {(error as Error)?.message ?? "Failed to load"}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No bank accounts found.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.bank_name}</TableCell>
                  <TableCell className="font-mono text-xs">{b.account_number}</TableCell>
                  <TableCell>{b.account_name}</TableCell>
                  <TableCell>
                    {b.is_global || !b.user_id ? (
                      <Badge variant="secondary">Company</Badge>
                    ) : (
                      <Badge variant="outline">Sales · {userName(b.user_id)}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(b)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Delete bank account "${b.bank_name}"?`))
                            deleteMut.mutate(b.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Page {page} of {totalPage}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPage}
            onClick={() => setPage((p) => p + 1)}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : closeDialog())}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle> {editing ? "Edit Bank Account" : "New Bank Account"} </DialogTitle>
              <DialogDescription>
                {editing
                  ? "Update bank account details."
                  : "Add a company-wide or per-sales bank account."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="bank-name">Bank Name</Label>
                <Input
                  id="bank-name"
                  value={form.bank_name}
                  onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))}
                  placeholder="e.g. BCA, Mandiri"
                  autoFocus
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="acc-number">Account Number</Label>
                  <Input
                    id="acc-number"
                    value={form.account_number}
                    onChange={(e) => setForm((f) => ({ ...f, account_number: e.target.value }))}
                    inputMode="numeric"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="acc-holder">Account Holder</Label>
                  <Input
                    id="acc-holder"
                    value={form.account_name}
                    onChange={(e) => setForm((f) => ({ ...f, account_name: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="is-global">Company-wide account</Label>
                  <p className="text-xs text-muted-foreground">
                    Available to all sales. Disable to assign to a specific sales user.
                  </p>
                </div>
                <Switch
                  id="is-global"
                  checked={form.is_global}
                  onCheckedChange={(v) =>
                    setForm((f) => ({ ...f, is_global: v, user_id: v ? "" : f.user_id }))
                  }
                />
              </div>
              {!form.is_global && (
                <div className="space-y-2">
                  <Label>Sales User</Label>
                  <Select
                    value={form.user_id}
                    onValueChange={(v) => setForm((f) => ({ ...f, user_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sales user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} {u.email ? `· ${u.email}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : editing ? "Save changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
