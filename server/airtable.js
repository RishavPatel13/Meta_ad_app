const TABLES = {
  products: "Products",
  personas: "Personas",
  angles: "Ad Angles",
  scripts: "Scripts",
};

const FIELDS = {
  product: {
    name: "Product Name",
    researchStatus: "Research Status",
    url: "Product URL",
    description: "Product Description",
    targetAudience: "Target Audience",
    customerProfile: "Customer Profile",
    technicalities: "Product Technicalities",
    pricing: "Pricing Analysis",
    brandIdentity: "Brand Identity",
    marketPositioning: "Market Positioning",
    sources: "Research Sources",
    notes: "Product Notes",
    image: "Product Image",
    category: "Product Category",
    summary: "Concise Product Summary",
    adAngles: "Ad Angles",
    runResearch: "▶ Run Research",
    adAccount: "Ad Account",
    personas: "Personas",
    generatePersonas: "▶ Generate Personas",
    lastActionResult: "Last Action Result",
  },
  persona: {
    name: "Persona Name",
    product: "Product",
    demographics: "Demographics",
    goals: "Goals & Frustrations",
    purchaseMotivation: "Purchase Motivation",
    awarenessLevel: "Awareness Level",
    expectedTone: "Expected Tone",
    communicationStyle: "Communication Style",
    confidenceScore: "Confidence Score",
    corePsychology: "Core Psychology",
    top10s: "Top 10s",
    triggers: "Triggers",
    adAngles: "Ad Angles",
    generateAngles: "▶ Generate Angles",
  },
  angle: {
    name: "Angle Name",
    product: "Product",
    persona: "Persona",
    targetEmotion: "Target Emotion",
    vslSummary: "VSL Structure Summary",
    vslFull: "VSL Hook/Problem/Agitation/Solution/Proof/CTA",
    videoSuggestions: "Video Suggestions",
    emotionalTriggers: "Emotional Triggers",
    cognitiveBiases: "Cognitive Biases",
    drTechniques: "Direct Response Techniques",
    status: "Status",
    effectiveness: "Angle Effectiveness Score",
    scripts: "Scripts",
    generateScript: "▶ Generate Script",
    generateImageCopy: "▶ Generate Image Copy",
    angleType: "Angle Type",
    coreMessage: "Core Message",
    reasonItWorks: "Reason It Works",
    funnelStage: "Best Funnel Stage",
    suggestedOffer: "Suggested Offer",
    creativeType: "Creative Type",
    creativeDirection: "Creative Direction",
    messagingFramework: "Messaging Framework",
    overallScore: "Overall Score",
    buyingIntent: "Buying Intent Score",
    metaRisk: "Meta Compliance Risk",
    otherScores: "Other Scores",
    generatedCreative: "Generated Creative",
    creativeStatus: "Creative Status",
    lastActionResult: "Last Action Result",
  },
  script: {
    name: "Script Name",
    angle: "Angle",
    status: "Script Status",
    fullScript: "Full Script",
    shotBreakdown: "Shot Breakdown",
    revisionNotes: "Revision Notes",
    revisionCount: "Revision Count",
    metaAdId: "Meta Ad ID",
    spend: "Spend",
    ctr: "CTR",
    cpa: "CPA",
    conversions: "Conversions",
    lastSyncedAt: "Last Synced At",
    filename: "Suggested Filename",
    isWinning: "Is Winning",
    contentType: "Content Type",
    headline: "Headline",
    primaryText: "Primary Text",
    description: "Description",
    revise: "▶ Revise",
    generatedCreative: "Generated Creative",
    creativeStatus: "Creative Status",
    videoPrompt: "Video Prompt",
    generateCreative: "▶ Generate Creative",
    pushToMeta: "▶ Push to Meta",
    adAccount: "Ad Account",
  },
};

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} in .env`);
  }
  return value;
}

function baseId() {
  return requireEnv("AIRTABLE_BASE_ID");
}

function token() {
  return requireEnv("AIRTABLE_PAT");
}

function encodeTable(name) {
  return encodeURIComponent(name);
}

async function airtableFetch(path, options = {}) {
  const url = `https://api.airtable.com/v0/${baseId()}/${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text };
  }

  if (!response.ok) {
    const message =
      data?.error?.message || data?.error || `Airtable ${response.status}`;
    const err = new Error(message);
    err.status = response.status;
    err.details = data;
    throw err;
  }

  return data;
}

async function listAll(table, params = {}) {
  const records = [];
  let offset;
  const search = new URLSearchParams(params);

  do {
    if (offset) search.set("offset", offset);
    const query = search.toString();
    const data = await airtableFetch(
      `${encodeTable(table)}${query ? `?${query}` : ""}`
    );
    records.push(...(data.records || []));
    offset = data.offset;
  } while (offset);

  return records;
}

function getRecord(table, id) {
  return airtableFetch(`${encodeTable(table)}/${id}`);
}

function createRecord(table, fields) {
  return airtableFetch(encodeTable(table), {
    method: "POST",
    body: JSON.stringify({ fields, typecast: true }),
  });
}

function updateRecord(table, id, fields) {
  return airtableFetch(`${encodeTable(table)}/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ fields, typecast: true }),
  });
}

async function deleteRecords(table, ids) {
  const unique = [...new Set((ids || []).filter(Boolean))];
  for (let i = 0; i < unique.length; i += 10) {
    const chunk = unique.slice(i, i + 10);
    const query = chunk
      .map((id) => `records[]=${encodeURIComponent(id)}`)
      .join("&");
    await airtableFetch(`${encodeTable(table)}?${query}`, {
      method: "DELETE",
    });
  }
}

function asText(value, fallback = "") {
  if (value == null || value === "") return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const parts = value.map((item) => asText(item)).filter(Boolean);
    return parts.join(", ") || fallback;
  }
  if (typeof value === "object") {
    if (Object.prototype.hasOwnProperty.call(value, "value")) {
      return asText(value.value, fallback);
    }
    if (typeof value.name === "string") return value.name;
    if (typeof value.url === "string") return value.url;
    if (typeof value.text === "string") return value.text;
    return fallback;
  }
  return fallback;
}

function asNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object" && "value" in value) {
    return asNumber(value.value);
  }
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function linkedIds(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item : item?.id))
    .filter(Boolean);
}

function firstAttachment(value) {
  if (!Array.isArray(value) || !value.length) return null;
  const file = value[0];
  return {
    url: file.url,
    filename: file.filename,
    thumb:
      file.thumbnails?.large?.url ||
      file.thumbnails?.small?.url ||
      file.url,
  };
}

function mapProduct(record) {
  const f = record.fields || {};
  return {
    id: record.id,
    name: asText(f[FIELDS.product.name], "Untitled product"),
    researchStatus: asText(f[FIELDS.product.researchStatus], "Not started"),
    url: asText(f[FIELDS.product.url]),
    description: asText(f[FIELDS.product.description]),
    targetAudience: asText(f[FIELDS.product.targetAudience]),
    customerProfile: asText(f[FIELDS.product.customerProfile]),
    technicalities: asText(f[FIELDS.product.technicalities]),
    pricing: asText(f[FIELDS.product.pricing]),
    brandIdentity: asText(f[FIELDS.product.brandIdentity]),
    marketPositioning: asText(f[FIELDS.product.marketPositioning]),
    sources: asText(f[FIELDS.product.sources]),
    notes: asText(f[FIELDS.product.notes]),
    image: firstAttachment(f[FIELDS.product.image]),
    category: asText(f[FIELDS.product.category]),
    summary: asText(f[FIELDS.product.summary]),
    adAccount: asText(f[FIELDS.product.adAccount]),
    lastActionResult: asText(f[FIELDS.product.lastActionResult]),
    personaIds: linkedIds(f[FIELDS.product.personas]),
    angleIds: linkedIds(f[FIELDS.product.adAngles]),
    runResearch: Boolean(f[FIELDS.product.runResearch]),
    generatePersonas: Boolean(f[FIELDS.product.generatePersonas]),
  };
}

function mapPersona(record) {
  const f = record.fields || {};
  return {
    id: record.id,
    name: asText(f[FIELDS.persona.name], "Untitled persona"),
    productIds: linkedIds(f[FIELDS.persona.product]),
    demographics: asText(f[FIELDS.persona.demographics]),
    goals: asText(f[FIELDS.persona.goals]),
    purchaseMotivation: asText(f[FIELDS.persona.purchaseMotivation]),
    awarenessLevel: asText(f[FIELDS.persona.awarenessLevel]),
    expectedTone: asText(f[FIELDS.persona.expectedTone]),
    communicationStyle: asText(f[FIELDS.persona.communicationStyle]),
    confidenceScore: asNumber(f[FIELDS.persona.confidenceScore]),
    corePsychology: asText(f[FIELDS.persona.corePsychology]),
    top10s: asText(f[FIELDS.persona.top10s]),
    triggers: asText(f[FIELDS.persona.triggers]),
    angleIds: linkedIds(f[FIELDS.persona.adAngles]),
    generateAngles: Boolean(f[FIELDS.persona.generateAngles]),
  };
}

function mapAngle(record) {
  const f = record.fields || {};
  return {
    id: record.id,
    name: asText(f[FIELDS.angle.name], "Untitled angle"),
    productIds: linkedIds(f[FIELDS.angle.product]),
    personaIds: linkedIds(f[FIELDS.angle.persona]),
    targetEmotion: asText(f[FIELDS.angle.targetEmotion]),
    vslSummary: asText(f[FIELDS.angle.vslSummary]),
    vslFull: asText(f[FIELDS.angle.vslFull]),
    videoSuggestions: asText(f[FIELDS.angle.videoSuggestions]),
    emotionalTriggers: asText(f[FIELDS.angle.emotionalTriggers]),
    cognitiveBiases: asText(f[FIELDS.angle.cognitiveBiases]),
    drTechniques: asText(f[FIELDS.angle.drTechniques]),
    status: asText(f[FIELDS.angle.status]),
    effectiveness: asNumber(f[FIELDS.angle.effectiveness]),
    scriptIds: linkedIds(f[FIELDS.angle.scripts]),
    generateScript: Boolean(f[FIELDS.angle.generateScript]),
    generateImageCopy: Boolean(f[FIELDS.angle.generateImageCopy]),
    angleType: asText(f[FIELDS.angle.angleType]),
    coreMessage: asText(f[FIELDS.angle.coreMessage]),
    reasonItWorks: asText(f[FIELDS.angle.reasonItWorks]),
    funnelStage: asText(f[FIELDS.angle.funnelStage]),
    suggestedOffer: asText(f[FIELDS.angle.suggestedOffer]),
    creativeType: asText(f[FIELDS.angle.creativeType]),
    creativeDirection: asText(f[FIELDS.angle.creativeDirection]),
    messagingFramework: asText(f[FIELDS.angle.messagingFramework]),
    overallScore: asNumber(f[FIELDS.angle.overallScore]),
    buyingIntent: asNumber(f[FIELDS.angle.buyingIntent]),
    metaRisk: asText(f[FIELDS.angle.metaRisk]),
    lastActionResult: asText(f[FIELDS.angle.lastActionResult]),
    creativeStatus: asText(f[FIELDS.angle.creativeStatus]),
  };
}

function mapScript(record) {
  const f = record.fields || {};
  return {
    id: record.id,
    name: asText(f[FIELDS.script.name], "Untitled script"),
    angleIds: linkedIds(f[FIELDS.script.angle]),
    status: asText(f[FIELDS.script.status]),
    fullScript: asText(f[FIELDS.script.fullScript]),
    shotBreakdown: asText(f[FIELDS.script.shotBreakdown]),
    revisionNotes: asText(f[FIELDS.script.revisionNotes]),
    revisionCount: asNumber(f[FIELDS.script.revisionCount]) ?? 0,
    metaAdId: asText(f[FIELDS.script.metaAdId]),
    spend: asNumber(f[FIELDS.script.spend]),
    ctr: asNumber(f[FIELDS.script.ctr]),
    cpa: asNumber(f[FIELDS.script.cpa]),
    conversions: asNumber(f[FIELDS.script.conversions]),
    lastSyncedAt: asText(f[FIELDS.script.lastSyncedAt]),
    filename: asText(f[FIELDS.script.filename]),
    isWinning: Boolean(f[FIELDS.script.isWinning]),
    contentType: asText(f[FIELDS.script.contentType]),
    headline: asText(f[FIELDS.script.headline]),
    primaryText: asText(f[FIELDS.script.primaryText]),
    description: asText(f[FIELDS.script.description]),
    generatedCreative: firstAttachment(f[FIELDS.script.generatedCreative]),
    creativeStatus: asText(f[FIELDS.script.creativeStatus]),
    videoPrompt: asText(f[FIELDS.script.videoPrompt]),
    generateCreative: Boolean(f[FIELDS.script.generateCreative]),
    pushToMeta: Boolean(f[FIELDS.script.pushToMeta]),
    adAccount: asText(f[FIELDS.script.adAccount]),
  };
}

function belongsToProduct(recordIds, productId) {
  return linkedIds(recordIds).includes(productId);
}

export {
  TABLES,
  FIELDS,
  listAll,
  getRecord,
  createRecord,
  updateRecord,
  deleteRecords,
  mapProduct,
  mapPersona,
  mapAngle,
  mapScript,
  belongsToProduct,
};
