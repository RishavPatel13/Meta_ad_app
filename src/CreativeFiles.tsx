import { useState } from "react";
import { downloadFile, type FileKind } from "./api";
import type { Attachment } from "./types";

function isVideo(file: Attachment) {
  return (
    file.type.startsWith("video/") ||
    /\.(mp4|mov|webm|m4v)$/i.test(file.filename)
  );
}

function isImage(file: Attachment) {
  return (
    file.type.startsWith("image/") ||
    /\.(png|jpe?g|gif|webp|bmp)$/i.test(file.filename)
  );
}

function formatSize(size: number | null) {
  if (!size) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CreativeFiles({
  kind,
  recordId,
  files,
  empty = "No files saved on this record yet.",
  layout = "grid",
}: {
  kind: FileKind;
  recordId: string;
  files: Attachment[];
  empty?: string;
  layout?: "grid" | "button";
}) {
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  async function onDownload(file: Attachment) {
    setBusyId(file.id);
    setError("");
    try {
      await downloadFile(kind, recordId, file.id, file.filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not download file");
    } finally {
      setBusyId("");
    }
  }

  if (!files.length) {
    if (layout === "button") return null;
    return <p className="muted">{empty}</p>;
  }

  if (layout === "button") {
    return (
      <div className="creative-buttons">
        {error ? <span className="muted">{error}</span> : null}
        {files.map((file) => (
          <button
            key={file.id}
            className="btn ghost"
            type="button"
            disabled={Boolean(busyId)}
            onClick={() => onDownload(file)}
          >
            {busyId === file.id ? "Saving…" : `Download ${file.filename}`}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div>
      {error ? <div className="flash error">{error}</div> : null}
      <div className="creative-grid">
        {files.map((file) => (
          <div key={file.id} className="creative-tile">
            {isVideo(file) ? (
              <video src={file.url} controls preload="metadata" />
            ) : isImage(file) ? (
              <img src={file.thumb || file.url} alt={file.filename} />
            ) : (
              <div className="creative-fallback">{file.filename}</div>
            )}
            <div className="creative-meta">
              <div>
                <strong>{file.filename}</strong>
                <span className="muted">
                  {[file.type.split("/")[1], formatSize(file.size)]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
              <button
                className="btn secondary"
                type="button"
                disabled={Boolean(busyId)}
                onClick={() => onDownload(file)}
              >
                {busyId === file.id ? "Saving…" : "Download"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Detail({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  if (value == null || value === "") return null;
  return (
    <div className="detail">
      <p className="muted">{label}</p>
      <p className="prose">{String(value)}</p>
    </div>
  );
}
