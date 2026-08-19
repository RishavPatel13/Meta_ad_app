import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
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
}: {
  productId: string;
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
            <img src={product.image.thumb} alt="" />
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
              {personas.map((persona) => (
                <label key={persona.id} className="card" style={{ cursor: "pointer" }}>
                  <div className="card-head">
                    <div>
                      <h4>{persona.name}</h4>
                      <p className="muted">{persona.awarenessLevel}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedPersonas.includes(persona.id)}
                      onChange={() =>
                        toggle(selectedPersonas, persona.id, setSelectedPersonas)
                      }
                    />
                  </div>
                  <p className="muted">{persona.demographics}</p>
                  <p className="muted" style={{ marginTop: 10 }}>
                    {persona.purchaseMotivation}
                  </p>
                  <p className="muted" style={{ marginTop: 10 }}>
                    Score: {persona.confidenceScore ?? "—"} · Angles:{" "}
                    {persona.angleIds.length}
                  </p>
                </label>
              ))}
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
              {angles.map((angle) => (
                <label key={angle.id} className="card" style={{ cursor: "pointer" }}>
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
                    <input
                      type="checkbox"
                      checked={selectedAngles.includes(angle.id)}
                      onChange={() =>
                        toggle(selectedAngles, angle.id, setSelectedAngles)
                      }
                    />
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
                  </div>
                  <p className="muted">{angle.coreMessage || angle.vslSummary || angle.targetEmotion}</p>
                </label>
              ))}
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
                    {script.generatedCreative ? (
                      <img
                        src={script.generatedCreative.thumb}
                        alt=""
                        style={{
                          width: "100%",
                          borderRadius: 12,
                          marginTop: 12,
                        }}
                      />
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
