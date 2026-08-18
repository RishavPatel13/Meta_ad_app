import { FormEvent, useMemo, useState } from "react";
import { api } from "./api";

type Props = {
  onCreated: (id: string) => void;
  onCancel: () => void;
};

export default function NewProductForm({ onCreated, onCancel }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [runResearch, setRunResearch] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canSave = useMemo(
    () => name.trim().length > 0 && !saving,
    [name, saving]
  );

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const result = await api.createProduct({
        name,
        description,
        targetAudience,
        url,
        notes,
        runResearch,
      });
      onCreated(result.product.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create product");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card" onSubmit={onSubmit}>
      <div className="card-head">
        <div>
          <h3>New product</h3>
          <p className="muted">
            Writes to the Airtable Products table. If research is checked, it also
            ticks ▶ Run Research and pings n8n.
          </p>
        </div>
      </div>

      {error ? <div className="flash error">{error}</div> : null}

      <div className="field">
        <label htmlFor="name">Product name</label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Nanny in Gurgaon"
          required
        />
      </div>
      <div className="field">
        <label htmlFor="description">Product description</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What are we advertising?"
        />
      </div>
      <div className="field">
        <label htmlFor="audience">Target audience</label>
        <textarea
          id="audience"
          value={targetAudience}
          onChange={(e) => setTargetAudience(e.target.value)}
          placeholder="Who is this for?"
        />
      </div>
      <div className="field">
        <label htmlFor="url">Product URL (optional)</label>
        <input
          id="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://"
        />
      </div>
      <div className="field">
        <label htmlFor="notes">Notes (optional)</label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Creative constraints, market, language..."
        />
      </div>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={runResearch}
          onChange={(e) => setRunResearch(e.target.checked)}
        />
        Start research immediately
      </label>
      <div className="actions" style={{ marginTop: 16 }}>
        <button className="btn primary" type="submit" disabled={!canSave}>
          {saving ? "Saving…" : "Save to Airtable"}
        </button>
        <button className="btn ghost" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
