import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, ImageIcon, Upload } from "lucide-react";
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
import { usersService, uploadService } from "@/lib/services";
import type { User } from "@/lib/types";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/users")({
  head: () => ({
    meta: [
      { title: "Users & Sales — SIKOn ERP" },
      { name: "description", content: "Register and manage sales users." },
    ],
  }),
  component: UsersPage,
});

interface FormState {
  name: string;
  email: string;
  phone: string;
  role: string;
  password?: string;
  image_url: string;
  image_file: File | null;
  status_text: string;
  is_active: boolean;
  sort_order: number;
}

const emptyForm: FormState = {
  name: "",
  email: "",
  phone: "",
  role: "sales",
  password: "",
  image_url: "",
  image_file: null,
  status_text: "",
  is_active: true,
  sort_order: 0,
};

function UsersPage() {
  const [page, setPage] = useState(1);
  const limit = 10;
  const qc = useQueryClient();

  const [editing, setEditing] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewUser, setPreviewUser] = useState<User | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["users", { page, limit }],
    queryFn: () => usersService.list({ page, limit }),
  });

  const createMut = useMutation({
    mutationFn: (body: Partial<User> & { password?: string }) => usersService.create(body),
    onSuccess: () => {
      toast.success("User created");
      qc.invalidateQueries({ queryKey: ["users"] });
      closeDialog();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<User> }) =>
      usersService.update(id, body),
    onSuccess: () => {
      toast.success("User updated");
      qc.invalidateQueries({ queryKey: ["users"] });
      closeDialog();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => usersService.delete(id),
    onSuccess: () => {
      toast.success("User deleted");
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name ?? "",
        email: editing.email ?? "",
        phone: editing.phone ?? "",
        role: editing.role ?? "sales",
        image_url: editing.image_url ?? "",
        image_file: null,
        status_text: editing.status_text ?? "",
        is_active: editing.is_active ?? true,
        sort_order: editing.sort_order ?? 0,
      });
    } else {
      setForm(emptyForm);
    }
  }, [editing]);

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(u: User) {
    setEditing(u);
    setOpen(true);
  }
  function closeDialog() {
    setOpen(false);
    setEditing(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.role.trim()) {
      toast.error("Name and role are required");
      return;
    }
    
    let finalImageUrl = form.image_url;
    if (form.image_file) {
      try {
        setUploadingImage(true);
        const uploadRes = await uploadService.image(form.image_file, "profiles");
        finalImageUrl = uploadRes.data.url;
      } catch (err: any) {
        setUploadingImage(false);
        return toast.error(err.message || "Failed to upload image");
      }
      setUploadingImage(false);
    }
    
    const payloadExtra = form.role === "sales" ? {
      phone: form.phone.trim() || undefined,
      status_text: form.status_text.trim() || undefined,
      is_active: form.is_active,
      sort_order: form.sort_order,
    } : {};

    if (editing) {
      if (!form.email.trim()) {
        toast.error("Email is required");
        return;
      }
      updateMut.mutate({ 
        id: editing.id, 
        body: { 
          name: form.name.trim(), 
          email: form.email.trim(),
          role: form.role, 
          image_url: finalImageUrl || undefined,
          ...payloadExtra
        } 
      });
    } else {
      if (!form.email.trim() || !form.password?.trim()) {
        toast.error("Email and password are required for new users");
        return;
      }
      createMut.mutate({
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        password: form.password,
        image_url: finalImageUrl || undefined,
        ...payloadExtra
      });
    }
  }

  const rows = data?.data ?? [];
  const totalPage = data?.paging?.total_page ?? 1;
  const hasNextPage = data?.paging?.total_page
    ? page < data.paging.total_page
    : rows.length === limit;
  const saving = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users & Sales</h1>
          <p className="text-sm text-muted-foreground">
            Register and manage sales users in the system.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" /> New User
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status (Sales)</TableHead>
                <TableHead className="w-[1%]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Loading users…
                  </TableCell>
                </TableRow>
              )}
              {isError && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-destructive">
                    {(error as Error)?.message ?? "Failed to load"}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    {u.image_url ? (
                      <img
                        src={u.image_url}
                        alt={u.name}
                        className="h-10 w-10 rounded-full object-cover border cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setPreviewUser(u)}
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border bg-muted/50 text-muted-foreground">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.phone || "—"}</TableCell>
                  <TableCell>
                    {u.role === "admin" ? (
                      <Badge variant="secondary">Admin</Badge>
                    ) : (
                      <Badge variant="outline" className="capitalize">
                        {u.role || "Sales"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {u.role === "sales" ? (
                      <div className="flex flex-col gap-1 items-start">
                        <Badge variant={u.is_active !== false ? "default" : "secondary"} className="text-[10px]">
                          {u.is_active !== false ? "Active" : "Inactive"}
                        </Badge>
                        {u.status_text && (
                          <span className="text-xs text-muted-foreground">{u.status_text}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(u)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Delete user "${u.name}"?`)) deleteMut.mutate(u.id);
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
            disabled={!hasNextPage}
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
              <DialogTitle>{editing ? "Edit User" : "New User"}</DialogTitle>
              <DialogDescription>
                {editing ? "Update user details." : "Register a new user to the system."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Profile Image</Label>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap gap-4">
                    {(form.image_file || form.image_url) ? (
                      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border group">
                        <img 
                          src={form.image_file ? URL.createObjectURL(form.image_file) : form.image_url} 
                          alt="Preview" 
                          className="h-full w-full object-cover bg-muted/20" 
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setForm({ ...form, image_file: null, image_url: "" })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative flex h-24 w-24 shrink-0 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-muted-foreground/25 bg-muted/20 transition-colors hover:bg-muted/50 hover:border-muted-foreground/50">
                        <Input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setForm({ ...form, image_file: file });
                            e.target.value = "";
                          }}
                        />
                        <Upload className="mb-1 h-6 w-6 text-muted-foreground/50" />
                        <span className="text-[10px] font-medium text-muted-foreground">Upload</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                      Upload a profile picture for this user. <br />
                      Recommended: Square (1:1 ratio), up to 2MB.
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. John Doe"
                  autoFocus
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="john@example.com"
                  />
                </div>
                {!editing && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      placeholder="••••••••"
                    />
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={form.role}
                    onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}
                  >
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.role === "sales" && (
                  <div className="space-y-2">
                    <Label htmlFor="phone">WhatsApp Number (Optional)</Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="e.g. 6281200000001"
                    />
                  </div>
                )}
              </div>

              {form.role === "sales" && (
                <div className="grid gap-4 sm:grid-cols-2 rounded-xl border bg-gradient-to-br from-card to-muted/20 p-5 text-card-foreground shadow-sm mt-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <ImageIcon className="w-24 h-24" />
                  </div>
                  <div className="space-y-1 sm:col-span-2 border-b pb-3 mb-2">
                    <h4 className="text-base font-semibold tracking-tight text-primary">Marketing Details</h4>
                    <p className="text-sm text-muted-foreground">Configure how this sales contact appears on the public landing page.</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="status_text">Status Response</Label>
                    <Input
                      id="status_text"
                      value={form.status_text}
                      onChange={(e) => setForm((f) => ({ ...f, status_text: e.target.value }))}
                      placeholder="e.g. Online sekarang / Balas dlm 1 jam"
                      className="bg-background/50"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="sort_order">Priority Order</Label>
                    <Input
                      id="sort_order"
                      type="number"
                      value={form.sort_order}
                      onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
                      placeholder="0"
                      className="bg-background/50"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1.5 font-medium">Lower number = higher priority on landing page.</p>
                  </div>

                  <div className="flex flex-row items-center justify-between rounded-lg border bg-background/50 p-4 sm:col-span-2 shadow-sm mt-2">
                    <div className="space-y-1">
                      <Label className="text-sm font-semibold">Public Visibility</Label>
                      <p className="text-xs text-muted-foreground">
                        Show this sales contact on the landing page so customers can reach out.
                      </p>
                    </div>
                    <Switch
                      checked={form.is_active}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                    />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || uploadingImage}>
                {uploadingImage ? "Uploading…" : saving ? "Saving…" : editing ? "Save changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewUser} onOpenChange={(v) => !v && setPreviewUser(null)}>
        <DialogContent className="sm:max-w-[400px] p-0 bg-transparent border-none shadow-none flex justify-center">
          {previewUser?.image_url && (
            <img
              src={previewUser.image_url}
              alt={previewUser.name}
              className="w-full max-w-[400px] h-auto rounded-full object-cover bg-black/50 aspect-square"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
