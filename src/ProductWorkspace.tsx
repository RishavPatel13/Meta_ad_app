import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import CreativeFiles, { Detail } from "./CreativeFiles";
import { CREATIVE_TYPES } from "./types";
import type { Angle, Persona, ProductBundle, Script, TabId } from "./types";

const TABS: { id: TabId; label: string }[] = [
  { id: "research", label: "1. Research" },
  { id: "personas", label: "2. Personas" },
  { id: "angles", label: "3. Angles" },
  { id: "scripts", label: "4. Scripts & Meta" },
];

function statusClass(value: string) {
  const v = value.toLowerCase();
  if (
    v.includes("complete") ||
    v.includes("approved") ||
    v.includes("done") ||
    v.includes("selected for script") ||
    v.includes("generated")
  ) {
    return "ok";
  }
  if (v.includes("review") || v.includes("draft") || v.includes("queued")) {
    return "warn";
  }
  return "";
}

function asDisplay(value: unknown, empty = "Waiting on n8n / Airtable…") {
  if (value == null || value === "") return empty;
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object" && value !== null && "value" in value) {
    return asDisplay((value as { value: unknown }).value, empty);
  }
  return empty;
}

function ResearchBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="card">
      <h4>{title}</h4>
      <p className="prose muted" style={{ marginTop: 10 }}>
        {asDisplay(body)}
      </p>
    </div>
  );
}

export default function ProductWorkspace({
  productId,
  onDeleted,
}: {
  productId: string;
  onDeleted?: (id: string) => void;
}) {
  const [bundle, setBundle] = useState<ProductBundle | null>(null);
  const [tab, setTab] = useState<TabId>("research");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([]);
  const [selectedAngles, setSelectedAngles] = useState<string[]>([]);
  const [creativeType, setCreativeType] = useState("");
  const [openScript, setOpenScript] = useState<string | null>(null);
  const [openPersona, setOpenPersona] = useState<string | null>(null);
  const [openAngle, setOpenAngle] = useState<string | null>(null);

  async function load() {
    const data = await api.product(productId);
    setBundle(data);
    return data;
  }

  useEffect(() => {
    setBundle(null);
    setError("");
    setNotice("");
    setSelectedPersonas([]);
    setSelectedAngles([]);
    setCreativeType("");
    setOpenScript(null);
    setOpenPersona(null);
    setOpenAngle(null);
    setTab("research");
    load().catch((err) =>
      setError(err instanceof Error ? err.message : "Failed to load product")
    );
  }, [productId]);

  useEffect(() => {
    if (!bundle) return;
    const researchBusy =
      bundle.product.runResearch ||
      bundle.product.generatePersonas ||
      bundle.product.researchStatus.toLowerCase() !== "complete";
    const interval = setInterval(() => {
      load().catch(() => undefined);
    }, researchBusy ? 8000 : 20000);
    return () => clearInterval(interval);
  }, [productId, bundle?.product.researchStatus, bundle?.product.runResearch]);

  const personasById = useMemo(() => {
    const map = new Map<string, Persona>();
    bundle?.personas.forEach((p) => map.set(p.id, p));
    return map;
  }, [bundle]);

  const anglesById = useMemo(() => {
    const map = new Map<string, Angle>();
    bundle?.angles.forEach((a) => map.set(a.id, a));
    return map;
  }, [bundle]);

  function toggle(list: string[], id: string, setter: (next: string[]) => void) {
    setter(list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);
  }

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(label);
    setError("");
    setNotice("");
    try {
      await fn();
      await load();
      setNotice(`${label} sent to Airtable and n8n.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy("");
    }
  }

  async function removeProduct() {
    if (!bundle) return;
    const ok = window.confirm(
      `Delete "${bundle.product.name}" and its personas, angles, and scripts from Airtable? This cannot be undone.`
    );
    if (!ok) return;
    setBusy("Delete product");
    setError("");
    try {
      await api.deleteProduct(bundle.product.id);
      onDeleted?.(bundle.product.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete product");
      setBusy("");
    }
  }

  if (error && !bundle) {
    return <div className="flash error">{error}</div>;
  }

  if (!bundle) {
    return <div className="empty">Loading product from Airtable…</div>;
  }

  const { product, personas, angles, scripts } = bundle;

  return (
    <div>
      <div className="topbar">
        <div className="product-hero">
          {product.image ? (
            <div>
              <img src={product.image.thumb} alt="" />
              <CreativeFiles
                kind="product-image"
                recordId={product.id}
                files={[product.image]}
                layout="button"
              />
            </div>
          ) : null}
          <div>
            <h2>{product.name}</h2>
            <p>
              {product.url ? (
                <a href={product.url} target="_blank" rel="noreferrer">
                  {product.url}
                </a>
              ) : (
                "No product URL"
              )}
            </p>
            <div className="row" style={{ marginTop: 10 }}>
              <span className={`badge ${statusClass(product.researchStatus)}`}>
                Research: {product.researchStatus}
              </span>
              <span className="badge">{personas.length} personas</span>
              <span className="badge">{angles.length} angles</span>
              <span className="badge">{scripts.length} scripts</span>
            </div>
          </div>
        </div>
        <div className="actions">
          <button
            className="btn primary"
            disabled={Boolean(busy)}
            onClick={() =>
              run("Run research", () => api.runResearch(product.id))
            }
          >
            {busy === "Run research" ? "Triggering…" : "Run research"}
          </button>
          <button
            className="btn secondary"
            disabled={Boolean(busy) || product.researchStatus.toLowerCase() !== "complete"}
            onClick={() =>
              run("Generate personas", () => api.generatePersonas(product.id))
            }
          >
            {busy === "Generate personas" ? "Triggering…" : "Generate personas"}
          </button>
          <button
            className="btn danger"
            disabled={Boolean(busy)}
            onClick={() => void removeProduct()}
          >
            {busy === "Delete product" ? "Deleting…" : "Delete product"}
          </button>
        </div>
      </div>

      {product.lastActionResult ? (
        <div className="flash">{product.lastActionResult}</div>
      ) : null}
      {notice ? <div className="flash">{notice}</div> : null}
      {error ? <div className="flash error">{error}</div> : null}

      <div className="tabs">
        {TABS.map((item) => (
          <button
            key={item.id}
            className={`tab ${tab === item.id ? "active" : ""}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "research" ? (
        <div>
          <div className="research-grid">
            <div className="card">
              <h4>Brief</h4>
              <p className="prose" style={{ marginTop: 10 }}>
                {product.description || "No description yet."}
              </p>
              <p className="muted" style={{ marginTop: 16 }}>
                <strong>Target audience</strong>
              </p>
              <p className="prose muted">{product.targetAudience || "—"}</p>
            </div>
            <ResearchBlock title="Concise summary" body={product.summary} />
          </div>
          <div className="grid" style={{ marginTop: 14 }}>
            <ResearchBlock title="Customer profile" body={product.customerProfile} />
            <ResearchBlock title="Product technicalities" body={product.technicalities} />
            <ResearchBlock title="Pricing analysis" body={product.pricing} />
            <ResearchBlock title="Brand identity" body={product.brandIdentity} />
            <ResearchBlock title="Market positioning" body={product.marketPositioning} />
            <ResearchBlock title="Research sources" body={product.sources} />
            <ResearchBlock title="Product notes" body={product.notes} />
          </div>
        </div>
      ) : null}

      {tab === "personas" ? (
        <div>
          {!personas.length ? (
            <div className="empty">
              No personas yet. Finish research, then click Generate personas.
            </div>
          ) : (
            <div className="grid">
              {personas.map((persona) => {
                const open = openPersona === persona.id;
                return (
                  <div key={persona.id} className="card">
                    <div className="card-head">
                      <div>
                        <h4>{persona.name}</h4>
                        <p className="muted">{persona.awarenessLevel}</p>
                      </div>
                      <label className="checkbox" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedPersonas.includes(persona.id)}
                          onChange={() =>
                            toggle(selectedPersonas, persona.id, setSelectedPersonas)
                          }
                        />
                        Select
                      </label>
                    </div>
                    <p className="muted">{persona.demographics}</p>
                    <p className="muted" style={{ marginTop: 10 }}>
                      {persona.purchaseMotivation}
                    </p>
                    <p className="muted" style={{ marginTop: 10 }}>
                      Score: {persona.confidenceScore ?? "—"} · Angles:{" "}
                      {persona.angleIds.length}
                    </p>
                    <div className="actions" style={{ marginTop: 12 }}>
                      <button
                        className="btn ghost"
                        type="button"
                        onClick={() => setOpenPersona(open ? null : persona.id)}
                      >
                        {open ? "Hide details" : "View all fields"}
                      </button>
                    </div>
                    {open ? (
                      <div className="detail-grid" style={{ marginTop: 14 }}>
                        <Detail label="Goals & frustrations" value={persona.goals} />
                        <Detail label="Expected tone" value={persona.expectedTone} />
                        <Detail
                          label="Communication style"
                          value={persona.communicationStyle}
                        />
                        <Detail label="Core psychology" value={persona.corePsychology} />
                        <Detail label="Triggers" value={persona.triggers} />
                        <Detail label="Top 10s" value={persona.top10s} />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
          <div className="sticky-actions">
            <span className="muted">
              Select the best personas, then generate angles for them.
            </span>
            <button
              className="btn primary"
              disabled={!selectedPersonas.length || Boolean(busy)}
              onClick={() =>
                run("Generate angles", () => api.generateAngles(selectedPersonas))
              }
            >
              {busy === "Generate angles"
                ? "Triggering…"
                : `Generate angles (${selectedPersonas.length})`}
            </button>
          </div>
        </div>
      ) : null}

      {tab === "angles" ? (
        <div>
          {!angles.length ? (
            <div className="empty">
              No angles yet. Select personas and generate angles.
            </div>
          ) : (
            <div className="grid">
              {angles.map((angle) => {
                const open = openAngle === angle.id;
                return (
                  <div key={angle.id} className="card">
                    <div className="card-head">
                      <div>
                        <h4>{angle.name}</h4>
                        <p className="muted">
                          {angle.personaIds
                            .map((id) => personasById.get(id)?.name)
                            .filter(Boolean)
                            .join(", ") || "Unlinked persona"}
                        </p>
                      </div>
                      <label className="checkbox">
                        <input
                          type="checkbox"
                          checked={selectedAngles.includes(angle.id)}
                          onChange={() =>
                            toggle(selectedAngles, angle.id, setSelectedAngles)
                          }
                        />
                        Select
                      </label>
                    </div>
                    <div className="row" style={{ marginBottom: 8 }}>
                      <span className={`badge ${statusClass(angle.status)}`}>
                        {angle.status || "No status"}
                      </span>
                      {angle.creativeType ? (
                        <span className="badge">{angle.creativeType}</span>
                      ) : (
                        <span className="badge warn">No creative type</span>
                      )}
                      {angle.overallScore != null ? (
                        <span className="badge">Score {angle.overallScore}</span>
                      ) : null}
                      <span className="badge">{angle.scriptIds.length} scripts</span>
                      <span className="badge">
                        {angle.generatedCreatives.length
                          ? `${angle.generatedCreatives.length} file${
                              angle.generatedCreatives.length === 1 ? "" : "s"
                            }`
                          : "No files"}
                      </span>
                    </div>
                    <p className="muted">
                      {angle.coreMessage || angle.vslSummary || angle.targetEmotion}
                    </p>
                    {angle.generatedCreatives.length ? (
                      <div style={{ marginTop: 12 }}>
                        <p className="muted" style={{ marginBottom: 8 }}>
                          Generated creatives
                        </p>
                        <CreativeFiles
                          kind="angle-creative"
                          recordId={angle.id}
                          files={angle.generatedCreatives}
                        />
                      </div>
                    ) : null}
                    <div className="actions" style={{ marginTop: 12 }}>
                      <button
                        className="btn ghost"
                        type="button"
                        onClick={() => setOpenAngle(open ? null : angle.id)}
                      >
                        {open ? "Hide details" : "View all fields"}
                      </button>
                    </div>
                    {open ? (
                      <div className="detail-grid" style={{ marginTop: 14 }}>
                        <Detail label="Creative status" value={angle.creativeStatus} />
                        <Detail label="Last action result" value={angle.lastActionResult} />
                        <Detail label="Angle type" value={angle.angleType} />
                        <Detail label="Target emotion" value={angle.targetEmotion} />
                        <Detail label="Core message" value={angle.coreMessage} />
                        <Detail label="Reason it works" value={angle.reasonItWorks} />
                        <Detail label="Funnel stage" value={angle.funnelStage} />
                        <Detail label="Suggested offer" value={angle.suggestedOffer} />
                        <Detail
                          label="Creative direction"
                          value={angle.creativeDirection}
                        />
                        <Detail
                          label="Messaging framework"
                          value={angle.messagingFramework}
                        />
                        <Detail label="VSL summary" value={angle.vslSummary} />
                        <Detail label="VSL full" value={angle.vslFull} />
                        <Detail
                          label="Video suggestions"
                          value={angle.videoSuggestions}
                        />
                        <Detail
                          label="Emotional triggers"
                          value={angle.emotionalTriggers}
                        />
                        <Detail
                          label="Cognitive biases"
                          value={angle.cognitiveBiases}
                        />
                        <Detail
                          label="Direct response techniques"
                          value={angle.drTechniques}
                        />
                        <Detail label="Meta compliance risk" value={angle.metaRisk} />
                        <Detail label="Other scores" value={angle.otherScores} />
                        <Detail
                          label="Effectiveness"
                          value={angle.effectiveness}
                        />
                        <Detail label="Buying intent" value={angle.buyingIntent} />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
          <div className="sticky-actions stack">
            <div>
              <p className="muted" style={{ margin: "0 0 10px" }}>
                Select winning angles and one creative type. n8n will not run
                without a type, so we do not generate every format and burn tokens.
              </p>
              <div className="chips" role="group" aria-label="Creative type">
                {CREATIVE_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`chip ${creativeType === type ? "active" : ""}`}
                    onClick={() => setCreativeType(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <div className="actions">
              <button
                className="btn primary"
                disabled={
                  !selectedAngles.length || !creativeType || Boolean(busy)
                }
                onClick={() =>
                  run("Generate script", () =>
                    api.generateScript(selectedAngles, creativeType)
                  )
                }
              >
                Generate script
              </button>
              <button
                className="btn secondary"
                disabled={
                  !selectedAngles.length || !creativeType || Boolean(busy)
                }
                onClick={() =>
                  run("Generate image copy", () =>
                    api.generateImageCopy(selectedAngles, creativeType)
                  )
                }
              >
                Generate image copy
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "scripts" ? (
        <div>
          {!scripts.length ? (
            <div className="empty">
              No scripts yet. Pick winning angles and generate scripts.
            </div>
          ) : (
            <div className="grid">
              {scripts.map((script: Script) => {
                const angleName =
                  script.angleIds
                    .map((id) => anglesById.get(id)?.name)
                    .filter(Boolean)
                    .join(", ") || "Unlinked angle";
                const open = openScript === script.id;
                return (
                  <div key={script.id} className="card">
                    <div className="card-head">
                      <div>
                        <h4>{script.name}</h4>
                        <p className="muted">{angleName}</p>
                      </div>
                      <span className={`badge ${statusClass(script.status)}`}>
                        {script.status || "Draft"}
                      </span>
                    </div>
                    {script.headline ? (
                      <p className="prose">{script.headline}</p>
                    ) : null}
                    <p className="muted">
                      {script.contentType || "Creative"} ·{" "}
                      {script.creativeStatus || "No creative yet"}
                      {script.metaAdId ? ` · Meta ${script.metaAdId}` : ""}
                    </p>
                    {(script.generatedCreatives.length
                      ? script.generatedCreatives
                      : script.generatedCreative
                        ? [script.generatedCreative]
                        : []
                    ).length ? (
                      <div style={{ marginTop: 12 }}>
                        <p className="muted" style={{ marginBottom: 8 }}>
                          Generated creatives
                        </p>
                        <CreativeFiles
                          kind="script-creative"
                          recordId={script.id}
                          files={
                            script.generatedCreatives.length
                              ? script.generatedCreatives
                              : script.generatedCreative
                                ? [script.generatedCreative]
                                : []
                          }
                        />
                      </div>
                    ) : null}
                    <div className="actions" style={{ marginTop: 12 }}>
                      <button
                        className="btn ghost"
                        type="button"
                        onClick={() => setOpenScript(open ? null : script.id)}
                      >
                        {open ? "Hide script" : "View script"}
                      </button>
                      <button
                        className="btn secondary"
                        disabled={Boolean(busy)}
                        onClick={() =>
                          run("Generate creative", () =>
                            api.generateCreative(script.id)
                          )
                        }
                      >
                        Generate creative
                      </button>
                      <button
                        className="btn primary"
                        disabled={Boolean(busy)}
                        onClick={() =>
                          run("Push to Meta", () => api.pushToMeta(script.id))
                        }
                      >
                        Push to Meta
                      </button>
                    </div>
                    {open ? (
                      <div className="script-grid" style={{ marginTop: 14 }}>
                        <div>
                          <p className="muted">Primary text / full script</p>
                          <p className="prose">
                            {script.primaryText || script.fullScript || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="muted">Shot breakdown</p>
                          <p className="prose">{script.shotBreakdown || "—"}</p>
                        </div>
                        <Detail label="Description" value={script.description} />
                        <Detail label="Video prompt" value={script.videoPrompt} />
                        <Detail label="Revision notes" value={script.revisionNotes} />
                        <Detail label="Suggested filename" value={script.filename} />
                        <Detail label="Ad account" value={script.adAccount} />
                        <Detail
                          label="Performance"
                          value={[
                            script.spend != null ? `Spend ${script.spend}` : "",
                            script.ctr != null ? `CTR ${script.ctr}` : "",
                            script.cpa != null ? `CPA ${script.cpa}` : "",
                            script.conversions != null
                              ? `Conversions ${script.conversions}`
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
