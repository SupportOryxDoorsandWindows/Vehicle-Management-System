// Representative stock images per vehicle model, not photos of the specific
// vehicle — the source data never included per-vehicle photos (see design
// spec, "Vehicle Images"). Matching is keyword-based against the free-text
// `model` column (which includes trailing model years, e.g. "Hilux 2024").
const MODEL_IMAGE_RULES: Array<{ keywords: string[]; path: string }> = [
  { keywords: ['hilux'], path: '/vehicle-images/toyota-hilux.png' },
  { keywords: ['prado'], path: '/vehicle-images/toyota-prado.png' },
  { keywords: ['corolla cross'], path: '/vehicle-images/toyota-corolla-cross.png' },
  { keywords: ['c-hr', 'chr'], path: '/vehicle-images/toyota-chr.png' },
  { keywords: ['highlander'], path: '/vehicle-images/toyota-highlander.png' },
  { keywords: ['hiace'], path: '/vehicle-images/oryx-van.png' },
  { keywords: ['ranger'], path: '/vehicle-images/ford-ranger.png' },
  { keywords: ['escape'], path: '/vehicle-images/ford-escape.png' },
];

/** Returns a representative stock image path for the vehicle's model, or null if none is mapped. */
export function getVehicleImagePath(model: string | null): string | null {
  if (!model) return null;
  const normalized = model.toLowerCase();
  const match = MODEL_IMAGE_RULES.find((rule) => rule.keywords.some((kw) => normalized.includes(kw)));
  return match?.path ?? null;
}
