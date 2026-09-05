"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Download,
  Eye,
  File as FileIcon,
  Folder,
  History,
  Trash2,
  Upload,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { FileRecord, FileVersion, FolderItem } from "@/lib/types";
import { useApp } from "@/components/layout/app-provider";
import { logActivity } from "@/lib/activity";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, formatBytes, formatDate, isUploadTooLarge, MAX_UPLOAD_BYTES } from "@/lib/utils";

export default function FilesPage() {
  const { isAdmin, profile } = useApp();
  const [folders, setFolders] = React.useState<FolderItem[]>([]);
  const [files, setFiles] = React.useState<FileRecord[]>([]);
  const [activeFolder, setActiveFolder] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [dragOver, setDragOver] = React.useState(false);
  const [previewFile, setPreviewFile] = React.useState<FileRecord | null>(null);
  const [versionsFile, setVersionsFile] = React.useState<FileRecord | null>(null);
  const [replacingFile, setReplacingFile] = React.useState<FileRecord | null>(null);
  const uploadRef = React.useRef<HTMLInputElement>(null);

  const load = React.useCallback(async () => {
    const supabase = createClient();
    const { data: folderData } = await supabase
      .from("folders")
      .select("*")
      .order("name");
    setFolders((folderData ?? []) as FolderItem[]);
    const { data: fileData } = await supabase
      .from("files")
      .select("*, folder:folders(*), uploader:profiles!files_uploaded_by_fkey(*)")
      .order("created_at", { ascending: false });
    setFiles((fileData ?? []) as unknown as FileRecord[]);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const activeFolderRecord = folders.find((f) => f.id === activeFolder);
  const visibleFiles = activeFolder
    ? files.filter((f) => f.folder_id === activeFolder)
    : files;

  const uploadFiles = async (fileList: File[]) => {
    if (fileList.length === 0) return;
    const tooLarge = fileList.filter(isUploadTooLarge);
    if (tooLarge.length > 0) {
      toast.error(
        `File too large (max ${formatBytes(MAX_UPLOAD_BYTES)}): ${tooLarge.map((f) => f.name).join(", ")}`
      );
      fileList = fileList.filter((f) => !isUploadTooLarge(f));
      if (fileList.length === 0) return;
    }
    const supabase = createClient();
    for (const file of fileList as File[]) {
      const folderSlug = activeFolderRecord?.slug ?? "miscellaneous";
      const path = `${folderSlug}/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
      const { error } = await supabase.storage.from("files").upload(path, file);
      if (error) {
        toast.error(`Upload failed for ${file.name}.`);
        continue;
      }
      const { data: created, error: insertError } = await supabase
        .from("files")
        .insert({
          folder_id: activeFolder ?? null,
          name: file.name,
          storage_path: path,
          mime_type: file.type,
          size_bytes: file.size,
          version: 1,
          uploaded_by: profile?.id ?? null,
        })
        .select("id")
        .single();
      if (insertError) {
        toast.error(`Could not register ${file.name}.`);
        continue;
      }
      if (created) {
        await supabase.from("file_versions").insert({
          file_id: created.id,
          version: 1,
          storage_path: path,
          size_bytes: file.size,
          uploaded_by: profile?.id ?? null,
        });
      }
      await logActivity({
        action: "upload",
        entityType: "file",
        entityId: path,
        details: { name: file.name, folder: folderSlug },
      });
    }
    toast.success(`${fileList.length} file${fileList.length > 1 ? "s" : ""} uploaded.`);
    load();
  };

  const uploadNewVersion = async (file: File) => {
    if (!replacingFile) return;
    const supabase = createClient();
    const nextVersion = replacingFile.version + 1;
    const path = `${replacingFile.storage_path.startsWith(replacingFile.folder?.slug ?? "miscellaneous") ? replacingFile.folder?.slug ?? "miscellaneous" : "miscellaneous"}/v${nextVersion}-${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const { error } = await supabase.storage.from("files").upload(path, file);
    if (error) {
      toast.error("Upload failed.");
      return;
    }
    await supabase
      .from("files")
      .update({
        storage_path: path,
        version: nextVersion,
        size_bytes: file.size,
        mime_type: file.type,
        updated_at: new Date().toISOString(),
      })
      .eq("id", replacingFile.id);
    await supabase.from("file_versions").insert({
      file_id: replacingFile.id,
      version: nextVersion,
      storage_path: path,
      size_bytes: file.size,
      uploaded_by: profile?.id ?? null,
    });
    await logActivity({
      action: "upload",
      entityType: "file_version",
      entityId: replacingFile.id,
      details: { name: replacingFile.name, version: nextVersion },
    });
    toast.success(`Uploaded as version ${nextVersion}.`);
    setReplacingFile(null);
    load();
  };

  const deleteFile = async (file: FileRecord) => {
    if (!window.confirm(`Delete "${file.name}"? This cannot be undone.`)) return;
    const supabase = createClient();
    await supabase.from("files").delete().eq("id", file.id);
    await supabase.storage.from("files").remove([file.storage_path]);
    await logActivity({
      action: "delete",
      entityType: "file",
      entityId: file.id,
      details: { name: file.name },
    });
    toast.success("File deleted.");
    load();
  };

  const totalSize = files.reduce((acc, f) => acc + f.size_bytes, 0);

  return (
    <div>
      <PageHeader
        title="Files"
        description={`${files.length} files · ${formatBytes(totalSize)} stored · drag & drop to upload`}
        actions={
          <Button onClick={() => uploadRef.current?.click()}>
            <Upload className="h-4 w-4" /> Upload
          </Button>
        }
      />

      <input
        ref={uploadRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          uploadFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-1 rounded-xl border bg-card p-2 h-fit">
          <button
            onClick={() => setActiveFolder(null)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
              activeFolder === null
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:bg-accent"
            )}
          >
            <Folder className="h-4 w-4" /> All files
          </button>
          {folders.map((folder) => {
            const count = files.filter((f) => f.folder_id === folder.id).length;
            return (
              <button
                key={folder.id}
                onClick={() => setActiveFolder(folder.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  activeFolder === folder.id
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-accent"
                )}
              >
                <Folder className="h-4 w-4" />
                <span className="truncate">{folder.name}</span>
                <span className="ml-auto text-xs">{count}</span>
              </button>
            );
          })}
        </aside>

        <div>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              uploadFiles(Array.from(e.dataTransfer.files));
            }}
            className={cn(
              "mb-4 rounded-xl border-2 border-dashed p-6 text-center text-sm text-muted-foreground transition-colors",
              dragOver && "border-primary bg-primary/5 text-foreground"
            )}
          >
            <Upload className="mx-auto mb-1 h-6 w-6" />
            Drag &amp; drop files here
            {activeFolderRecord && (
              <span className="ml-1 font-medium">
                (uploads go to “{activeFolderRecord.name}”)
              </span>
            )}
            , or click Upload.
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : visibleFiles.length === 0 ? (
            <EmptyState
              icon={<FileIcon />}
              title="No files here yet"
              description="Upload files by dragging them onto the drop zone above."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="hidden px-4 py-3 sm:table-cell">Uploader</th>
                    <th className="hidden px-4 py-3 md:table-cell">Size</th>
                    <th className="hidden px-4 py-3 md:table-cell">Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleFiles.map((file) => {
                    return (
                      <tr key={file.id} className="border-t transition-colors hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FileIcon className="h-4 w-4 shrink-0 text-primary" />
                            <div className="min-w-0">
                              <p className="truncate font-medium">{file.name}</p>
                              <p className="text-xs text-muted-foreground">
                                v{file.version}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden px-4 py-3 sm:table-cell">
                          <div className="flex items-center gap-2">
                            <Avatar
                              src={file.uploader?.avatar_url}
                              name={file.uploader?.full_name ?? "?"}
                              size="sm"
                            />
                            <span className="truncate text-xs">
                              {file.uploader?.full_name ?? "Unknown"}
                            </span>
                          </div>
                        </td>
                        <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
                          {formatBytes(file.size_bytes)}
                        </td>
                        <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
                          {formatDate(file.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Preview"
                              onClick={() => setPreviewFile(file)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Version history"
                              onClick={() => setVersionsFile(file)}
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            <a
                              href={fileUrl(file.storage_path)}
                              target="_blank"
                              rel="noreferrer"
                              download
                            >
                              <Button variant="ghost" size="icon" title="Download">
                                <Download className="h-4 w-4" />
                              </Button>
                            </a>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Upload new version"
                              onClick={() => setReplacingFile(file)}
                            >
                              <Upload className="h-4 w-4" />
                            </Button>
                            {(isAdmin || file.uploaded_by === profile?.id) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Delete"
                                className="text-destructive hover:text-destructive"
                                onClick={() => deleteFile(file)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <FilePreviewDialog file={previewFile} onClose={() => setPreviewFile(null)} />
      <VersionsDialog
        file={versionsFile}
        onClose={() => setVersionsFile(null)}
      />
      <Dialog
        open={!!replacingFile}
        onClose={() => setReplacingFile(null)}
        title={`Upload new version of “${replacingFile?.name ?? ""}”`}
        description="The previous version stays in the version history."
      >
        <input
          type="file"
          className="w-full text-sm"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadNewVersion(file);
            e.target.value = "";
          }}
        />
      </Dialog>
    </div>
  );
}

function fileUrl(path: string): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${url}/storage/v1/object/public/files/${path}`;
}

function FilePreviewDialog({
  file,
  onClose,
}: {
  file: FileRecord | null;
  onClose: () => void;
}) {
  if (!file) return null;
  const url = fileUrl(file.storage_path);
  const isImage = (file.mime_type ?? "").startsWith("image/");
  const isPdf = (file.mime_type ?? "").includes("pdf");

  return (
    <Dialog open={!!file} onClose={onClose} title={file.name} className="max-w-3xl">
      <div className="max-h-[65vh] overflow-auto rounded-lg border bg-muted/30 p-2 thin-scroll">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={file.name} className="mx-auto max-h-[60vh] rounded" />
        ) : isPdf ? (
          <iframe src={url} title={file.name} className="h-[60vh] w-full rounded" />
        ) : (
          <EmptyState
            icon={<FileIcon />}
            title="No inline preview available"
            description="You can download this file instead."
            action={
              <a href={url} target="_blank" rel="noreferrer" download>
                <Button>
                  <Download className="h-4 w-4" /> Download
                </Button>
              </a>
            }
          />
        )}
      </div>
    </Dialog>
  );
}

function VersionsDialog({
  file,
  onClose,
}: {
  file: FileRecord | null;
  onClose: () => void;
}) {
  const [versions, setVersions] = React.useState<FileVersion[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!file) return;
    setLoading(true);
    const supabase = createClient();
    supabase
      .from("file_versions")
      .select("*, uploader:profiles!file_versions_uploaded_by_fkey(*)")
      .eq("file_id", file.id)
      .order("version", { ascending: false })
      .then(({ data }) => {
        setVersions((data ?? []) as unknown as FileVersion[]);
        setLoading(false);
      });
  }, [file]);

  if (!file) return null;

  return (
    <Dialog open={!!file} onClose={onClose} title={`Version history — ${file.name}`}>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading versions…</p>
      ) : versions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No previous versions. Upload a new version to start a history.
        </p>
      ) : (
        <div className="space-y-2">
          {versions.map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between gap-2 rounded-lg border bg-background p-3 text-sm"
            >
              <div>
                <p className="font-medium">Version {v.version}</p>
                <p className="text-xs text-muted-foreground">
                  {v.uploader?.full_name ?? "Unknown"} · {formatBytes(v.size_bytes)} ·{" "}
                  {formatDate(v.created_at)}
                </p>
              </div>
              <a href={fileUrl(v.storage_path)} target="_blank" rel="noreferrer" download>
                <Button variant="outline" size="sm">
                  <Download className="h-3.5 w-3.5" /> Download
                </Button>
              </a>
            </div>
          ))}
        </div>
      )}
    </Dialog>
  );
}
