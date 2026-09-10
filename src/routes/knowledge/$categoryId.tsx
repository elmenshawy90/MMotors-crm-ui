import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageShell } from "@/components/AppTopbar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Search, Edit, Trash2, Loader2, FileText,
  Link as LinkIcon, BookOpen, HelpCircle, Video, File, StickyNote,
  ChevronRight, Eye, Folder, FolderOpen, Upload, Download,
  FileWarning, Table as TableIcon, RowsIcon, Columns, X,
  PlusSquare, Trash, AlertCircle, ExternalLink, ZoomIn,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";

export const Route = createFileRoute("/knowledge/$categoryId")({
  component: KnowledgeCategoryPage,
});

// ─── Type icons / colors ──────────────────────────────────────────────────────
const TYPE_ICONS: Record<string, any> = {
  article: FileText, faq: HelpCircle, guide: BookOpen,
  note: StickyNote, link: LinkIcon, file: File, video: Video,
};

const TYPE_COLORS: Record<string, string> = {
  article: "bg-blue-50 text-blue-700 border-blue-200",
  faq:     "bg-purple-50 text-purple-700 border-purple-200",
  guide:   "bg-green-50 text-green-700 border-green-200",
  note:    "bg-yellow-50 text-yellow-700 border-yellow-200",
  link:    "bg-cyan-50 text-cyan-700 border-cyan-200",
  file:    "bg-orange-50 text-orange-700 border-orange-200",
  video:   "bg-red-50 text-red-700 border-red-200",
};

// ─── Table Editor ─────────────────────────────────────────────────────────────

type TableData = { headers: string[]; rows: string[][] };

function TableEditor({
  value, onChange,
}: {
  value: TableData; onChange: (t: TableData) => void;
}) {
  const addCol = () => {
    onChange({
      headers: [...value.headers, `Column ${value.headers.length + 1}`],
      rows: value.rows.map((r) => [...r, ""]),
    });
  };

  const addRow = () => {
    onChange({
      ...value,
      rows: [...value.rows, Array(value.headers.length).fill("")],
    });
  };

  const removeCol = (ci: number) => {
    if (value.headers.length <= 1) return;
    onChange({
      headers: value.headers.filter((_, i) => i !== ci),
      rows: value.rows.map((r) => r.filter((_, i) => i !== ci)),
    });
  };

  const removeRow = (ri: number) => {
    onChange({ ...value, rows: value.rows.filter((_, i) => i !== ri) });
  };

  const setHeader = (ci: number, v: string) => {
    const h = [...value.headers]; h[ci] = v;
    onChange({ ...value, headers: h });
  };

  const setCell = (ri: number, ci: number, v: string) => {
    const rows = value.rows.map((r) => [...r]);
    rows[ri][ci] = v;
    onChange({ ...value, rows });
  };

  return (
    <div className="space-y-3">
      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button type="button" size="sm" variant="outline" onClick={addCol}>
          <Columns className="mr-1.5 h-3.5 w-3.5" /> Add Column
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={addRow}>
          <RowsIcon className="mr-1.5 h-3.5 w-3.5" /> Add Row
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              {value.headers.map((h, ci) => (
                <th key={ci} className="border-b border-border p-0 min-w-[120px]">
                  <div className="flex items-center gap-1 px-2 py-1">
                    <input
                      className="flex-1 bg-transparent font-semibold text-xs outline-none min-w-0 placeholder:text-muted-foreground"
                      value={h}
                      onChange={(e) => setHeader(ci, e.target.value)}
                      placeholder={`Header ${ci + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeCol(ci)}
                      className="text-muted-foreground hover:text-red-500 shrink-0"
                      title="Remove column"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </th>
              ))}
              <th className="w-8 border-b border-border" />
            </tr>
          </thead>
          <tbody>
            {value.rows.length === 0 && (
              <tr>
                <td
                  colSpan={value.headers.length + 1}
                  className="text-center text-xs text-muted-foreground py-6"
                >
                  No rows yet — click "Add Row"
                </td>
              </tr>
            )}
            {value.rows.map((row, ri) => (
              <tr key={ri} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                {row.map((cell, ci) => (
                  <td key={ci} className="p-0">
                    <input
                      className="w-full bg-transparent px-2 py-1.5 text-xs outline-none focus:bg-primary/5 transition-colors min-w-[100px]"
                      value={cell}
                      onChange={(e) => setCell(ri, ci, e.target.value)}
                      placeholder="—"
                    />
                  </td>
                ))}
                <td className="text-center w-8">
                  <button
                    type="button"
                    onClick={() => removeRow(ri)}
                    className="text-muted-foreground hover:text-red-500"
                  >
                    <Trash className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-muted-foreground">
        {value.rows.length} row{value.rows.length !== 1 ? "s" : ""} × {value.headers.length} column{value.headers.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

// ─── PDF / File Upload ────────────────────────────────────────────────────────

function FileUploadZone({
  onUploaded, existingUrl, existingName,
}: {
  onUploaded: (url: string, name: string, size: number) => void;
  existingUrl?: string;
  existingName?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const doUpload = async (file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File must be < 20 MB"); return;
    }
    setUploading(true);
    try {
      const result = await apiClient.uploadKnowledgeFile(file);
      onUploaded(result.url, result.filename, result.size);
      toast.success(`"${result.filename}" uploaded`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) doUpload(file);
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  return (
    <div className="space-y-2">
      {/* Existing file */}
      {existingUrl && (
        <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm">
          <File className="h-4 w-4 text-orange-600 shrink-0" />
          <a
            href={resolveFileUrl(existingUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-orange-700 hover:underline truncate text-xs font-medium"
          >
            {existingName || existingUrl.split("/").pop()}
          </a>
          <a href={resolveFileUrl(existingUrl)} download className="text-orange-600 hover:text-orange-800">
            <Download className="h-3.5 w-3.5" />
          </a>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 cursor-pointer transition-all",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/30"
        )}
      >
        {uploading ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Uploading…</p>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Drop file here or click to browse</p>
            <p className="text-xs text-muted-foreground">
              PDF, Word, Excel, JPG, PNG — max 20 MB
            </p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) doUpload(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// ─── Table serialiser ─────────────────────────────────────────────────────────

function tableToText(t: TableData): string {
  const sep = " | ";
  const header = t.headers.join(sep);
  const divider = t.headers.map(() => "---").join(sep);
  const rows = t.rows.map((r) => r.join(sep));
  return [header, divider, ...rows].join("\n");
}

function textToTable(text: string): TableData | null {
  try {
    const lines = text.split("\n");
    if (lines.length < 2) return null;
    const headers = lines[0].split(" | ");
    const rows = lines.slice(2).map((l) => l.split(" | "));
    return { headers, rows };
  } catch { return null; }
}

// ─── Item Form Dialog ─────────────────────────────────────────────────────────

function ItemDialog({
  open, onClose, categoryId, initialData, onSaved,
}: {
  open: boolean; onClose: () => void;
  categoryId: string; initialData?: any; onSaved: () => void;
}) {
  const queryClient = useQueryClient();

  // Parse existing tables from meta
  const existingTables: TableData[] = initialData?.meta?.tables || [];

  const [form, setForm] = useState({
    title:        initialData?.title        || "",
    content:      initialData?.content      || "",
    item_type:    initialData?.item_type    || "article",
    tags:         initialData?.tags?.join(", ") || "",
    meta_url:     initialData?.meta?.url    || "",
    meta_source:  initialData?.meta?.source || "",
    meta_author:  initialData?.meta?.author || "",
    meta_file_url:    initialData?.meta?.file_url    || "",
    meta_file_name:   initialData?.meta?.file_name   || "",
    meta_file_size:   initialData?.meta?.file_size   || 0,
    is_published: initialData?.is_published ?? true,
    order_index:  initialData?.order_index  ?? 0,
  });

  const [tables, setTables] = useState<TableData[]>(existingTables);
  const [activeEditorTab, setActiveEditorTab] = useState<"content" | "tables" | "files" | "meta">("content");

  const isEditing = !!initialData;

  const mutation = useMutation({
    mutationFn: (data: any) =>
      isEditing
        ? apiClient.updateKnowledgeItem(initialData.id, data)
        : apiClient.createKnowledgeItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-items", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["knowledge-tree"] });
      toast.success(isEditing ? "Item updated!" : "Item created!");
      onSaved();
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Error saving item"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Title is required");

    const tags = form.tags
      ? form.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    const meta: any = {};
    if (form.meta_url)       meta.url       = form.meta_url;
    if (form.meta_source)    meta.source    = form.meta_source;
    if (form.meta_author)    meta.author    = form.meta_author;
    if (form.meta_file_url)  meta.file_url  = form.meta_file_url;
    if (form.meta_file_name) meta.file_name = form.meta_file_name;
    if (form.meta_file_size) meta.file_size = form.meta_file_size;
    if (tables.length > 0)   meta.tables    = tables;

    mutation.mutate({
      category_id:  categoryId,
      title:        form.title,
      content:      form.content,
      item_type:    form.item_type,
      tags, meta,
      is_published: form.is_published,
      order_index:  form.order_index,
    });
  };

  const addTable = () =>
    setTables([...tables, { headers: ["Column 1", "Column 2", "Column 3"], rows: [] }]);

  const removeTable = (i: number) =>
    setTables(tables.filter((_, idx) => idx !== i));

  const ItemIcon = TYPE_ICONS[form.item_type] || FileText;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ItemIcon className="w-5 h-5 text-primary" />
            {isEditing ? "Edit Item" : "Add New Item"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type selector */}
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {Object.entries(TYPE_ICONS).map(([type, Icon]) => (
              <button
                key={type} type="button"
                onClick={() => setForm({ ...form, item_type: type })}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all",
                  form.item_type === type
                    ? "border-primary bg-primary/5 text-primary font-semibold"
                    : "border-transparent hover:border-muted-foreground/30 text-muted-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="capitalize">{type}</span>
              </button>
            ))}
          </div>

          {/* Title */}
          <div className="space-y-1">
            <Label>Title <span className="text-red-500">*</span></Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Item title…" autoFocus
            />
          </div>

          {/* Editor tabs */}
          <Tabs value={activeEditorTab} onValueChange={(v) => setActiveEditorTab(v as any)}>
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="content" className="text-xs gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Content
              </TabsTrigger>
              <TabsTrigger value="tables" className="text-xs gap-1.5">
                <TableIcon className="h-3.5 w-3.5" /> Tables
                {tables.length > 0 && (
                  <Badge className="ml-1 h-4 px-1 text-[10px]">{tables.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="files" className="text-xs gap-1.5">
                <Upload className="h-3.5 w-3.5" /> File / PDF
                {form.meta_file_url && (
                  <span className="ml-1 h-2 w-2 rounded-full bg-green-500 inline-block" />
                )}
              </TabsTrigger>
              <TabsTrigger value="meta" className="text-xs gap-1.5">
                <LinkIcon className="h-3.5 w-3.5" /> Metadata
              </TabsTrigger>
            </TabsList>

            {/* CONTENT */}
            <TabsContent value="content" className="space-y-2 mt-3">
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Write the full content, instructions, details, FAQs…"
                rows={10}
                className="font-mono text-sm resize-y"
              />
              <p className="text-[10px] text-muted-foreground">
                {form.content.length} characters
              </p>
            </TabsContent>

            {/* TABLES */}
            <TabsContent value="tables" className="space-y-4 mt-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Add structured tables with custom columns and rows.
                </p>
                <Button type="button" size="sm" variant="outline" onClick={addTable}>
                  <PlusSquare className="mr-1.5 h-4 w-4" /> Add Table
                </Button>
              </div>

              {tables.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-12 gap-3 text-muted-foreground">
                  <TableIcon className="h-10 w-10 opacity-30" />
                  <p className="text-sm">No tables yet — click "Add Table"</p>
                </div>
              )}

              {tables.map((table, ti) => (
                <div key={ti} className="rounded-xl border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TableIcon className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold">Table {ti + 1}</span>
                      <span className="text-xs text-muted-foreground">
                        {table.rows.length}r × {table.headers.length}c
                      </span>
                    </div>
                    <Button
                      type="button" size="sm" variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-red-50"
                      onClick={() => removeTable(ti)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <TableEditor
                    value={table}
                    onChange={(t) => setTables(tables.map((tb, i) => i === ti ? t : tb))}
                  />
                </div>
              ))}
            </TabsContent>

            {/* FILES */}
            <TabsContent value="files" className="space-y-3 mt-3">
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  Upload PDF, Word, Excel or image files (max 20 MB). The file will be saved
                  and linked to this item so users can download it.
                </p>
              </div>

              <FileUploadZone
                existingUrl={form.meta_file_url}
                existingName={form.meta_file_name}
                onUploaded={(url, name, size) =>
                  setForm({ ...form, meta_file_url: url, meta_file_name: name, meta_file_size: size })
                }
              />

              {form.meta_file_url && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {form.meta_file_name}{" "}
                    {form.meta_file_size > 0 && (
                      <span>
                        ({form.meta_file_size >= 1_048_576
                          ? `${(form.meta_file_size / 1_048_576).toFixed(1)} MB`
                          : `${(form.meta_file_size / 1024).toFixed(0)} KB`})
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    className="text-red-500 hover:text-red-700 ml-auto"
                    onClick={() => setForm({ ...form, meta_file_url: "", meta_file_name: "", meta_file_size: 0 })}
                  >
                    Remove
                  </button>
                </div>
              )}
            </TabsContent>

            {/* META */}
            <TabsContent value="meta" className="space-y-3 mt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Tags</Label>
                  <Input
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    placeholder="tag1, tag2, tag3"
                  />
                  <p className="text-[10px] text-muted-foreground">Comma-separated</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Order Index</Label>
                  <Input
                    type="number" value={form.order_index}
                    onChange={(e) =>
                      setForm({ ...form, order_index: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">External URL</Label>
                  <Input
                    value={form.meta_url}
                    onChange={(e) => setForm({ ...form, meta_url: e.target.value })}
                    placeholder="https://…"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Author</Label>
                  <Input
                    value={form.meta_author}
                    onChange={(e) => setForm({ ...form, meta_author: e.target.value })}
                    placeholder="Author name"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Source / Reference</Label>
                  <Input
                    value={form.meta_source}
                    onChange={(e) => setForm({ ...form, meta_source: e.target.value })}
                    placeholder="Reference source"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox" id="published"
                  checked={form.is_published}
                  onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <Label htmlFor="published" className="cursor-pointer">
                  Published (visible to all users)
                </Label>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? "Save Changes" : "Create Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Inline table renderer (for display) ─────────────────────────────────────
function TableRenderer({ table }: { table: TableData }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border text-xs mt-2">
      <table className="w-full">
        <thead>
          <tr className="bg-muted/50">
            {table.headers.map((h, i) => (
              <th key={i} className="px-3 py-2 text-left font-semibold border-b border-border">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2">{cell || "—"}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── API base URL helper ──────────────────────────────────────────────────────
const API_BASE = (import.meta.env as any).VITE_API_BASE_URL?.replace(/\/api$/, "") || "https://crm-api.modernmotorseg.com";

function resolveFileUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${API_BASE}${url}`;
}

type FileType = "image" | "pdf" | "video" | "audio" | "office" | "text" | "other";

function getFileType(filename: string): FileType {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (["mp4", "webm", "ogg", "mov"].includes(ext)) return "video";
  if (["mp3", "wav", "aac"].includes(ext)) return "audio";
  if (["xls", "xlsx", "doc", "docx", "ppt", "pptx", "csv"].includes(ext)) return "office";
  if (["txt", "md", "json", "xml", "html", "css", "js", "ts"].includes(ext)) return "text";
  return "other";
}

// ─── File Preview Modal ───────────────────────────────────────────────────────
function FilePreviewModal({
  open, onClose, fileUrl, fileName,
}: {
  open: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
}) {
  const fileType = getFileType(fileName);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between px-4 py-3 border-b shrink-0">
          <DialogTitle className="text-sm font-semibold truncate max-w-[calc(100%-10rem)] flex items-center gap-2">
            <File className="w-4 h-4 text-orange-500 shrink-0" />
            {fileName}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <a
              href={fileUrl}
              download={fileName}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              تحميل
            </a>
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              فتح
            </a>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-auto min-h-0 bg-muted/30">
          {fileType === "image" && (
            <div className="flex items-center justify-center p-4 min-h-[60vh]">
              <img
                src={fileUrl}
                alt={fileName}
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow"
              />
            </div>
          )}

          {fileType === "pdf" && (
            <iframe
              src={`${fileUrl}#toolbar=1&navpanes=0`}
              className="w-full min-h-[75vh]"
              title={fileName}
            />
          )}

          {fileType === "video" && (
            <div className="flex items-center justify-center p-4 min-h-[60vh]">
              <video src={fileUrl} controls className="max-w-full max-h-[75vh] rounded-lg shadow" />
            </div>
          )}

          {fileType === "audio" && (
            <div className="flex items-center justify-center p-8 min-h-[20vh]">
              <audio src={fileUrl} controls className="w-full max-w-md" />
            </div>
          )}

          {(fileType === "office" || fileType === "other" || fileType === "text") && (
            <div className="flex flex-col items-center justify-center gap-4 p-8 min-h-[40vh] text-center">
              <File className="w-16 h-16 text-orange-400" />
              <p className="text-sm text-muted-foreground">
                لا يمكن عرض هذا النوع من الملفات مباشرة في المتصفح.
              </p>
              <a
                href={fileUrl}
                download={fileName}
                className="inline-flex items-center gap-2 rounded-lg bg-orange-500 text-white px-4 py-2 text-sm font-medium hover:bg-orange-600 transition-colors"
              >
                <Download className="w-4 h-4" />
                تحميل الملف
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


// ─── Item Card (with expand/collapse) ─────────────────────────────────────────
function ItemCard({
  item, ItemIcon, tables, onEdit, onDelete,
}: {
  item: any;
  ItemIcon: any;
  tables: TableData[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileUrl = resolveFileUrl(item.meta?.file_url || "");
  const fileName = item.meta?.file_name || "file";
  const hasLongContent = (item.content || "").length > 200 || tables.length > 0 || fileUrl;

  return (
    <Card className="glass-card hover-lift group transition-all">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 mt-0.5",
            TYPE_COLORS[item.item_type] || "bg-gray-50 text-gray-600 border-gray-200"
          )}>
            <ItemIcon className="w-4 h-4" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
              <button
                type="button"
                onClick={() => hasLongContent && setExpanded(!expanded)}
                className={cn(
                  "flex-1 text-left font-semibold text-sm leading-tight",
                  hasLongContent && "hover:text-primary cursor-pointer"
                )}
              >
                {item.title}
                {hasLongContent && (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    {expanded ? "▲ collapse" : "▼ expand"}
                  </span>
                )}
              </button>
              <div className="hidden group-hover:flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={onEdit}
                  className="p-1.5 rounded hover:bg-blue-100 text-muted-foreground hover:text-blue-600"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onDelete}
                  className="p-1.5 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Content — always show first 200 chars, expand for rest */}
            {item.content && (
              <p className={cn(
                "text-xs text-muted-foreground mt-1 whitespace-pre-wrap",
                !expanded && "line-clamp-3"
              )}>
                {item.content}
              </p>
            )}

            {/* Tables — only when expanded */}
            {expanded && tables.length > 0 && (
              <div className="mt-3 space-y-3">
                {tables.map((tbl, ti) => (
                  <div key={ti}>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 mb-1">
                      <TableIcon className="h-3 w-3" /> Table {ti + 1}
                    </p>
                    <TableRenderer table={tbl} />
                  </div>
                ))}
              </div>
            )}

            {/* File attachment */}
            {fileUrl && (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                {/* View button */}
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs text-orange-700 hover:bg-orange-100 transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" />
                  {fileName}
                  <ZoomIn className="h-3.5 w-3.5 ml-1" />
                </button>
                {/* Download button */}
                <a
                  href={fileUrl}
                  download={fileName}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  تحميل
                </a>
              </div>
            )}

            {/* File preview modal */}
            {fileUrl && (
              <FilePreviewModal
                open={previewOpen}
                onClose={() => setPreviewOpen(false)}
                fileUrl={fileUrl}
                fileName={fileName}
              />
            )}

            {/* Badges row */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="outline" className={cn("text-xs capitalize", TYPE_COLORS[item.item_type] || "")}>
                {item.item_type}
              </Badge>
              {tables.length > 0 && (
                <Badge variant="outline" className="text-xs bg-violet-50 text-violet-700 border-violet-200">
                  <TableIcon className="h-2.5 w-2.5 mr-1" />
                  {tables.length} table{tables.length > 1 ? "s" : ""}
                </Badge>
              )}
              {fileUrl && (
                <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                  <File className="h-2.5 w-2.5 mr-1" /> Attachment
                </Badge>
              )}
              {item.tags?.map((tag: string) => (
                <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
              ))}
              {!item.is_published && (
                <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-300">Draft</Badge>
              )}
              {item.view_count > 0 && (
                <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                  <Eye className="w-3 h-3" /> {item.view_count}
                </span>
              )}
            </div>

            {item.meta?.url && (
              <a
                href={item.meta.url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-primary hover:underline mt-1 flex items-center gap-1"
              >
                <LinkIcon className="w-3 h-3" />
                {item.meta.url}
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function KnowledgeCategoryPage() {
  const { categoryId } = Route.useParams();
  const queryClient = useQueryClient();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [itemDialog, setItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);

  const { data: category, isLoading: loadingCat } = useQuery({
    queryKey: ["knowledge-category", categoryId],
    queryFn: () => apiClient.getKnowledgeCategory(categoryId),
  });

  const { data: itemsData, isLoading: loadingItems } = useQuery({
    queryKey: ["knowledge-items", categoryId, search, filterType],
    queryFn: () =>
      apiClient.getKnowledgeItems(categoryId, {
        ...(search      ? { search }               : {}),
        ...(filterType !== "all" ? { item_type: filterType } : {}),
      }),
    select: (d) => d.data || [],
  });

  const items: any[] = itemsData || [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteKnowledgeItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-items", categoryId] });
      queryClient.invalidateQueries({ queryKey: ["knowledge-tree"] });
      toast.success("Item deleted");
      setDeleteConfirm(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Delete failed"),
  });

  const isLoading = loadingCat || loadingItems;

  const buildBreadcrumb = () => {
    if (!category) return [];
    const crumbs = [];
    if (category.parent) crumbs.push({ id: category.parent.id, name: category.parent.name });
    crumbs.push({ id: category.id, name: category.name });
    return crumbs;
  };

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        currentTitle={category?.name || "Knowledge"}
      />
      <div className={cn("transition-all duration-300", sidebarCollapsed ? "ml-16" : "ml-64")}>
        <PageShell
          title={category?.name || "…"}
          subtitle={category?.description || "Knowledge category"}
          showTopbar={false}
        >
          {/* Breadcrumb */}
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            <Button variant="ghost" size="sm" asChild className="h-7 px-2">
              <Link to="/knowledge"><ArrowLeft className="mr-1 h-3.5 w-3.5" /> Knowledge Base</Link>
            </Button>
            {buildBreadcrumb().map((crumb, i, arr) => (
              <span key={crumb.id} className="flex items-center gap-2">
                <ChevronRight className="h-3.5 w-3.5" />
                {i < arr.length - 1 ? (
                  <Link
                    to="/knowledge/$categoryId" params={{ categoryId: crumb.id }}
                    className="hover:text-foreground"
                  >
                    {crumb.name}
                  </Link>
                ) : (
                  <span className="font-medium" style={{ color: category?.color || undefined }}>
                    {crumb.name}
                  </span>
                )}
              </span>
            ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-4">
              {/* Sidebar */}
              <div className="lg:col-span-1 space-y-3">
                <Card
                  className="glass-card"
                  style={{ borderTop: `3px solid ${category?.color || "#6366f1"}` }}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: (category?.color || "#6366f1") + "20" }}
                      >
                        <Folder className="w-5 h-5" style={{ color: category?.color || "#6366f1" }} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{category?.name}</h3>
                        {category?.name_ar && (
                          <p className="text-xs text-muted-foreground" dir="rtl">{category.name_ar}</p>
                        )}
                      </div>
                    </div>
                    {category?.description && (
                      <p className="text-xs text-muted-foreground">{category.description}</p>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                      <span>{items.length} items</span>
                      <Badge variant="secondary" className="text-xs">
                        Level {category?.parent ? "2+" : "1"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {category?.children && category.children.length > 0 && (
                  <Card className="glass-card">
                    <CardHeader className="py-3 px-4 border-b">
                      <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                        <FolderOpen className="w-3.5 h-3.5" /> Sub-categories
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 space-y-0.5">
                      {category.children.map((child: any) => (
                        <Link
                          key={child.id}
                          to="/knowledge/$categoryId" params={{ categoryId: child.id }}
                          className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted/60 transition-colors text-sm group"
                        >
                          <Folder className="w-4 h-4 flex-shrink-0" style={{ color: child.color || category?.color || "#6366f1" }} />
                          <span className="flex-1 truncate">{child.name}</span>
                          {child.children?.length > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                        </Link>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Items */}
              <div className="lg:col-span-3 space-y-4">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={search} onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search items…" className="pl-9 w-56"
                      />
                    </div>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {Object.keys(TYPE_ICONS).map((t) => (
                          <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={() => { setEditingItem(null); setItemDialog(true); }} className="hover-lift">
                    <Plus className="mr-2 h-4 w-4" /> Add Item
                  </Button>
                </div>

                {items.length === 0 ? (
                  <Card className="glass-card">
                    <CardContent className="py-16 text-center">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-muted-foreground text-sm">No items yet</p>
                      <Button className="mt-4" onClick={() => setItemDialog(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Add First Item
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {items.map((item: any) => {
                      const ItemIcon = TYPE_ICONS[item.item_type] || FileText;
                      const tables: TableData[] = item.meta?.tables || [];
                      return (
                        <ItemCard
                          key={item.id}
                          item={item}
                          ItemIcon={ItemIcon}
                          tables={tables}
                          onEdit={() => { setEditingItem(item); setItemDialog(true); }}
                          onDelete={() => setDeleteConfirm({ id: item.id, title: item.title })}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </PageShell>
      </div>

      {/* Item dialog */}
      {itemDialog && (
        <ItemDialog
          open={itemDialog}
          onClose={() => { setItemDialog(false); setEditingItem(null); }}
          categoryId={categoryId}
          initialData={editingItem}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["knowledge-items", categoryId] });
            queryClient.invalidateQueries({ queryKey: ["knowledge-tree"] });
          }}
        />
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <Dialog open onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Delete Item</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">
              Delete <span className="font-semibold text-foreground">"{deleteConfirm.title}"</span>?
              This cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button
                variant="destructive" disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteConfirm.id)}
              >
                {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
