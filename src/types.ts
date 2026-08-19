export type Attachment = {
  url: string;
  filename: string;
  thumb: string;
};

export type Product = {
  id: string;
  name: string;
  researchStatus: string;
  url: string;
  description: string;
  targetAudience: string;
  customerProfile: string;
  technicalities: string;
  pricing: string;
  brandIdentity: string;
  marketPositioning: string;
  sources: string;
  notes: string;
  image: Attachment | null;
  category: string;
  summary: string;
  adAccount: string;
  lastActionResult: string;
  personaIds: string[];
  angleIds: string[];
  runResearch: boolean;
  generatePersonas: boolean;
};

export type Persona = {
  id: string;
  name: string;
  productIds: string[];
  demographics: string;
  goals: string;
  purchaseMotivation: string;
  awarenessLevel: string;
  expectedTone: string;
  communicationStyle: string;
  confidenceScore: number | null;
  corePsychology: string;
  top10s: string;
  triggers: string;
  angleIds: string[];
  generateAngles: boolean;
};

export type Angle = {
  id: string;
  name: string;
  productIds: string[];
  personaIds: string[];
  targetEmotion: string;
  vslSummary: string;
  vslFull: string;
  videoSuggestions: string;
  emotionalTriggers: string;
  cognitiveBiases: string;
  drTechniques: string;
  status: string;
  effectiveness: number | null;
  scriptIds: string[];
  generateScript: boolean;
  generateImageCopy: boolean;
  angleType: string;
  coreMessage: string;
  reasonItWorks: string;
  funnelStage: string;
  suggestedOffer: string;
  creativeType: string;
  creativeDirection: string;
  messagingFramework: string;
  overallScore: number | null;
  buyingIntent: number | null;
  metaRisk: string;
  lastActionResult: string;
  creativeStatus: string;
};

export type Script = {
  id: string;
  name: string;
  angleIds: string[];
  status: string;
  fullScript: string;
  shotBreakdown: string;
  revisionNotes: string;
  revisionCount: number;
  metaAdId: string;
  spend: number | null;
  ctr: number | null;
  cpa: number | null;
  conversions: number | null;
  lastSyncedAt: string;
  filename: string;
  isWinning: boolean;
  contentType: string;
  headline: string;
  primaryText: string;
  description: string;
  generatedCreative: Attachment | null;
  creativeStatus: string;
  videoPrompt: string;
  generateCreative: boolean;
  pushToMeta: boolean;
  adAccount: string;
};

export type ProductBundle = {
  product: Product;
  personas: Persona[];
  angles: Angle[];
  scripts: Script[];
};

export type TabId = "research" | "personas" | "angles" | "scripts";

export const CREATIVE_TYPES = [
  "Carousel",
  "UGC",
  "Story",
  "Reel",
  "Image",
  "Testimonial",
  "Meme",
  "Founder Story",
  "Before-After",
] as const;

export type CreativeType = (typeof CREATIVE_TYPES)[number];
