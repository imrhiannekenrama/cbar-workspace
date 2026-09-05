"use client";

import * as React from "react";
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Table as TableIcon,
  Type,
  Underline,
  Undo2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn, isUploadTooLarge, MAX_UPLOAD_BYTES } from "@/lib/utils";
import { toast } from "sonner";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  readOnly?: boolean;
}

function exec(command: string, value?: string) {
  document.execCommand(command, false, value);
}

const toolbarButton =
  "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground";

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = 400,
  readOnly = false,
}: RichTextEditorProps) {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const lastEmitted = React.useRef<string>(value);
  const [uploading, setUploading] = React.useState(false);

  // Sync external value changes (e.g. version restore) into the DOM,
  // but never while the user is typing (to avoid caret jumps).
  React.useEffect(() => {
    if (!editorRef.current) return;
    if (value !== lastEmitted.current && document.activeElement !== editorRef.current) {
      editorRef.current.innerHTML = value;
      lastEmitted.current = value;
    }
  }, [value]);

  // Set initial content once
  React.useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInput = () => {
    const html = editorRef.current?.innerHTML ?? "";
    lastEmitted.current = html;
    onChange(html);
  };

  const withFocus = (fn: () => void) => {
    editorRef.current?.focus();
    fn();
    handleInput();
  };

  const handleImageUpload = async (file: File) => {
    if (isUploadTooLarge(file)) {
      toast.error(`Image too large (max ${MAX_UPLOAD_BYTES / 1024 / 1024} MB).`);
      return;
    }
    setUploading(true);
    try {
      const supabase = createClient();
      const path = `editor-images/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
      const { error } = await supabase.storage.from("files").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("files").getPublicUrl(path);
      withFocus(() =>
        exec(
          "insertHTML",
          `<img src="${data.publicUrl}" alt="${file.name}" />`
        )
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const insertTable = () => {
    const html =
      '<table><thead><tr><th><br/></th><th><br/></th><th><br/></th></tr></thead>' +
      '<tbody><tr><td><br/></td><td><br/></td><td><br/></td></tr>' +
      "<tr><td><br/></td><td><br/></td><td><br/></td></tr></tbody></table><p><br/></p>";
    withFocus(() => exec("insertHTML", html));
  };

  if (readOnly) {
    return (
      <div
        className="rte-content"
        // Content is authored only by authenticated team members.
        dangerouslySetInnerHTML={{ __html: value || "<p></p>" }}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/40 px-2 py-1.5">
        <button type="button" className={toolbarButton} title="Undo" onClick={() => withFocus(() => exec("undo"))}>
          <Undo2 className="h-4 w-4" />
        </button>
        <button type="button" className={toolbarButton} title="Redo" onClick={() => withFocus(() => exec("redo"))}>
          <Redo2 className="h-4 w-4" />
        </button>
        <ToolbarDivider />
        <button type="button" className={toolbarButton} title="Paragraph" onClick={() => withFocus(() => exec("formatBlock", "<p>"))}>
          <Type className="h-4 w-4" />
        </button>
        <button type="button" className={toolbarButton} title="Heading 1" onClick={() => withFocus(() => exec("formatBlock", "<h1>"))}>
          <Heading1 className="h-4 w-4" />
        </button>
        <button type="button" className={toolbarButton} title="Heading 2" onClick={() => withFocus(() => exec("formatBlock", "<h2>"))}>
          <Heading2 className="h-4 w-4" />
        </button>
        <button type="button" className={toolbarButton} title="Heading 3" onClick={() => withFocus(() => exec("formatBlock", "<h3>"))}>
          <Heading3 className="h-4 w-4" />
        </button>
        <ToolbarDivider />
        <button type="button" className={toolbarButton} title="Bold" onClick={() => withFocus(() => exec("bold"))}>
          <Bold className="h-4 w-4" />
        </button>
        <button type="button" className={toolbarButton} title="Italic" onClick={() => withFocus(() => exec("italic"))}>
          <Italic className="h-4 w-4" />
        </button>
        <button type="button" className={toolbarButton} title="Underline" onClick={() => withFocus(() => exec("underline"))}>
          <Underline className="h-4 w-4" />
        </button>
        <button type="button" className={toolbarButton} title="Strikethrough" onClick={() => withFocus(() => exec("strikeThrough"))}>
          <Strikethrough className="h-4 w-4" />
        </button>
        <ToolbarDivider />
        <button type="button" className={toolbarButton} title="Bullet list" onClick={() => withFocus(() => exec("insertUnorderedList"))}>
          <List className="h-4 w-4" />
        </button>
        <button type="button" className={toolbarButton} title="Numbered list" onClick={() => withFocus(() => exec("insertOrderedList"))}>
          <ListOrdered className="h-4 w-4" />
        </button>
        <button type="button" className={toolbarButton} title="Blockquote" onClick={() => withFocus(() => exec("formatBlock", "<blockquote>"))}>
          <Quote className="h-4 w-4" />
        </button>
        <ToolbarDivider />
        <button
          type="button"
          className={toolbarButton}
          title="Insert link"
          onClick={() => {
            const url = window.prompt("Link URL (https://…)");
            if (url) withFocus(() => exec("createLink", url));
          }}
        >
          <LinkIcon className="h-4 w-4" />
        </button>
        <button type="button" className={toolbarButton} title="Insert table" onClick={insertTable}>
          <TableIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={toolbarButton}
          title="Insert horizontal rule"
          onClick={() => withFocus(() => exec("insertHorizontalRule"))}
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={toolbarButton}
          title="Insert image"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageIcon className="h-4 w-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageUpload(file);
            e.target.value = "";
          }}
        />
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        data-placeholder={placeholder}
        style={{ minHeight }}
        className={cn(
          "rte-content max-w-none px-4 py-4 focus:outline-none",
          "empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]"
        )}
      />
    </div>
  );
}

function ToolbarDivider() {
  return <div className="mx-1 h-5 w-px bg-border" />;
}
