// Representative stock images per vehicle model, not photos of the specific
// vehicle — the source data never included per-vehicle photos (see design
// spec, "Vehicle Images"). Matching is keyword-based against the free-text
// `model` column (which includes trailing model years, e.g. "Hilux 2024").
const MODEL_IMAGE_RULES: Array<{ keywords: string[]; file: string }> = [
  { keywords: ['hilux'], file: 'toyota-hilux.png' },
  { keywords: ['prado'], file: 'toyota-prado.png' },
  { keywords: ['corolla cross'], file: 'toyota-corolla-cross.png' },
  { keywords: ['c-hr', 'chr'], file: 'toyota-chr.png' },
  { keywords: ['highlander'], file: 'toyota-highlander.png' },
  { keywords: ['hiace'], file: 'oryx-van.png' },
  { keywords: ['ranger'], file: 'ford-ranger.png' },
  { keywords: ['escape'], file: 'ford-escape.png' },
];

/** Returns a representative stock image path for the vehicle's model, or null if none is mapped. */
export function getVehicleImagePath(model: string | null): string | null {
  if (!model) return null;
  const normalized = model.toLowerCase();
  const match = MODEL_IMAGE_RULES.find((rule) => rule.keywords.some((kw) => normalized.includes(kw)));
  if (!match) return null;
  return `${import.meta.env.BASE_URL}vehicle-images/${match.file}`;
}
