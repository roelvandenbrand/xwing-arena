import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  value: string | null | undefined;
  onChange: (url: string) => void;
  /** Path inside the catalog-images bucket, WITHOUT extension. e.g. "ships/xwing" or "packages/core-set" */
  pathBase: string;
  label?: string;
  /** Tailwind classes for the preview image */
  previewClassName?: string;
};

export function ImageUpload({
  value,
  onChange,
  pathBase,
  label,
  previewClassName = "h-32 w-auto",
}: Props) {
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${pathBase}.${ext}`;
      const up = await supabase.storage
        .from("catalog-images")
        .upload(path, file, { upsert: true, contentType: file.type || "image/png" });
      if (up.error) throw new Error(up.error.message);
      const { data: pub } = supabase.storage.from("catalog-images").getPublicUrl(path);
      onChange(`${pub.publicUrl}?v=${Date.now()}`);
      toast.success("Image uploaded");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      {label && <div className="text-sm font-medium">{label}</div>}
      {value && (
        <img
          src={value}
          alt={label ?? "Preview"}
          className={`${previewClassName} rounded border bg-muted/30 object-contain`}
        />
      )}
      <div className="flex items-center gap-2">
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) handleFile(f);
          }}
          className="text-sm"
        />
        {value && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => onChange("")}
          >
            Remove
          </Button>
        )}
      </div>
      {busy && <p className="text-xs text-muted-foreground">Uploading…</p>}
    </div>
  );
}