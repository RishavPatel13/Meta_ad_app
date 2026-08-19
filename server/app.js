import express from "express";
import cors from "cors";
import {
  TABLES,
  FIELDS,
  listAll,
  getRecord,
  createRecord,
  updateRecord,
  mapProduct,
  mapPersona,
  mapAngle,
  mapScript,
} from "./airtable.js";
import { triggerN8n } from "./n8n.js";

const CREATIVE_TYPES = [
  "Carousel",
  "UGC",
  "Story",
  "Reel",
  "Testimonial",
  "Meme",
  "Founder Story",
  "Before-After",
];

function requireCreativeType(value) {
  const requested = String(value || "").trim();
  const match = CREATIVE_TYPES.find(
    (type) => type.toLowerCase() === requested.toLowerCase()
  );
  if (!match) {
    throw Object.assign(
      new Error(
        "Select a creative type (Carousel, UGC, Story, Reel, Testimonial, Meme, Founder Story, or Before-After) before generating"
      ),
      { status: 400 }
    );
  }
  return match;
}

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

async function triggerCheckboxes(table, recordIds, checkboxField, action, extraFields = {}) {
  const ids = [...new Set(recordIds.filter(Boolean))];
  if (!ids.length) {
    throw Object.assign(new Error("Select at least one record"), { status: 400 });
  }

  const updated = [];
  for (const id of ids) {
    const record = await updateRecord(table, id, {
      ...extraFields,
      [checkboxField]: true,
    });
    updated.push(record);
  }

  let n8n = null;
  try {
    n8n = await triggerN8n(action, ids);
  } catch (error) {
    n8n = {
      ok: false,
      error: error.message,
      details: error.details || null,
    };
  }

  return { updated, n8n };
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    airtableBase: process.env.AIRTABLE_BASE_ID || null,
    n8nConfigured: Boolean(process.env.N8N_WEBHOOK_URL),
  });
});

app.get(
  "/api/products",
  asyncRoute(async (_req, res) => {
    const records = await listAll(TABLES.products);
    const products = records
      .map(mapProduct)
      .filter((product) => product.name && product.name !== "Untitled product")
      .sort((a, b) => a.name.localeCompare(b.name));
    res.json({ products });
  })
);

app.get(
  "/api/products/:id",
  asyncRoute(async (req, res) => {
    const productRecord = await getRecord(TABLES.products, req.params.id);
    const product = mapProduct(productRecord);

    const [personaRecords, angleRecords, scriptRecords] = await Promise.all([
      listAll(TABLES.personas),
      listAll(TABLES.angles),
      listAll(TABLES.scripts),
    ]);

    const personas = personaRecords
      .map(mapPersona)
      .filter((persona) => persona.productIds.includes(product.id));

    const personaIds = new Set(personas.map((p) => p.id));
    const personaNames = personas.map((p) => p.name.toLowerCase()).filter(Boolean);
    const angles = angleRecords
      .map(mapAngle)
      .filter((angle) => {
        if (
          angle.productIds.includes(product.id) ||
          angle.personaIds.some((id) => personaIds.has(id))
        ) {
          return true;
        }
        const angleName = angle.name.toLowerCase();
        return personaNames.some((name) => name && angleName.includes(name));
      });

    const angleIds = new Set(angles.map((a) => a.id));
    const angleNames = angles.map((a) => a.name.toLowerCase()).filter(Boolean);
    const scripts = scriptRecords
      .map(mapScript)
      .filter((script) => {
        if (script.angleIds.some((id) => angleIds.has(id))) return true;
        const scriptName = script.name.toLowerCase();
        return angleNames.some((name) => name && scriptName.startsWith(name));
      });

    res.json({ product, personas, angles, scripts });
  })
);

app.post(
  "/api/products",
  asyncRoute(async (req, res) => {
    const { name, description, targetAudience, url, notes, category, runResearch } =
      req.body || {};

    if (!name || !String(name).trim()) {
      throw Object.assign(new Error("Product name is required"), { status: 400 });
    }

    const fields = {
      [FIELDS.product.name]: String(name).trim(),
      [FIELDS.product.description]: description ? String(description) : "",
      [FIELDS.product.targetAudience]: targetAudience ? String(targetAudience) : "",
      [FIELDS.product.url]: url ? String(url) : "",
      [FIELDS.product.notes]: notes ? String(notes) : "",
    };

    if (category) fields[FIELDS.product.category] = String(category);
    if (runResearch) fields[FIELDS.product.runResearch] = true;

    const record = await createRecord(TABLES.products, fields);
    const product = mapProduct(record);

    let n8n = null;
    if (runResearch) {
      try {
        n8n = await triggerN8n("run_research", [product.id]);
      } catch (error) {
        n8n = { ok: false, error: error.message, details: error.details || null };
      }
    }

    res.status(201).json({ product, n8n });
  })
);

app.post(
  "/api/products/:id/research",
  asyncRoute(async (req, res) => {
    const result = await triggerCheckboxes(
      TABLES.products,
      [req.params.id],
      FIELDS.product.runResearch,
      "run_research"
    );
    res.json({
      product: mapProduct(result.updated[0]),
      n8n: result.n8n,
    });
  })
);

app.post(
  "/api/products/:id/personas",
  asyncRoute(async (req, res) => {
    const result = await triggerCheckboxes(
      TABLES.products,
      [req.params.id],
      FIELDS.product.generatePersonas,
      "generate_personas"
    );
    res.json({
      product: mapProduct(result.updated[0]),
      n8n: result.n8n,
    });
  })
);

app.post(
  "/api/personas/generate-angles",
  asyncRoute(async (req, res) => {
    const recordIds = req.body?.recordIds || [];
    const result = await triggerCheckboxes(
      TABLES.personas,
      recordIds,
      FIELDS.persona.generateAngles,
      "generate_angles"
    );
    res.json({
      personas: result.updated.map(mapPersona),
      n8n: result.n8n,
    });
  })
);

app.post(
  "/api/angles/generate-script",
  asyncRoute(async (req, res) => {
    const recordIds = req.body?.recordIds || [];
    const creativeType = requireCreativeType(req.body?.creativeType);
    const result = await triggerCheckboxes(
      TABLES.angles,
      recordIds,
      FIELDS.angle.generateScript,
      "generate_script",
      {
        [FIELDS.angle.status]: "Selected for Script",
        [FIELDS.angle.creativeType]: creativeType,
      }
    );
    res.json({
      angles: result.updated.map(mapAngle),
      n8n: result.n8n,
    });
  })
);

app.post(
  "/api/angles/generate-image-copy",
  asyncRoute(async (req, res) => {
    const recordIds = req.body?.recordIds || [];
    const creativeType = requireCreativeType(req.body?.creativeType);
    const result = await triggerCheckboxes(
      TABLES.angles,
      recordIds,
      FIELDS.angle.generateImageCopy,
      "generate_image_copy",
      {
        [FIELDS.angle.status]: "Selected for Script",
        [FIELDS.angle.creativeType]: creativeType,
      }
    );
    res.json({
      angles: result.updated.map(mapAngle),
      n8n: result.n8n,
    });
  })
);

app.post(
  "/api/scripts/:id/generate-creative",
  asyncRoute(async (req, res) => {
    const result = await triggerCheckboxes(
      TABLES.scripts,
      [req.params.id],
      FIELDS.script.generateCreative,
      "generate_creative"
    );
    res.json({
      script: mapScript(result.updated[0]),
      n8n: result.n8n,
    });
  })
);

app.post(
  "/api/scripts/:id/push-to-meta",
  asyncRoute(async (req, res) => {
    const result = await triggerCheckboxes(
      TABLES.scripts,
      [req.params.id],
      FIELDS.script.pushToMeta,
      "push_to_meta"
    );
    res.json({
      script: mapScript(result.updated[0]),
      n8n: result.n8n,
    });
  })
);

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || "Server error",
    details: err.details || null,
  });
});

export default app;
