// Stock images, not photos of the specific vehicle — the source data never
// included per-vehicle photos (see design spec, "Vehicle Images"). A few
// vehicles have their own image, matched by plate; everything else falls
// back to a representative image matched by keyword against the free-text
// `model` column (which includes trailing model years, e.g. "Hilux 2024").
const PLATE_IMAGES: Record<string, string> = {
  DD18409: 'dd-18409.jpg',
  DD18410: 'dd-18410.jpg',
};

const MODEL_IMAGE_RULES: Array<{ keywords: string[]; file: string }> = [
  { keywords: ['hilux'], file: 'toyota-hilux.png' },
  { keywords: ['prado'], file: 'toyota-prado.png' },
  { keywords: ['corolla cross'], file: 'toyota-corolla-cross.png' },
  { keywords: ['c-hr', 'chr'], file: 'toyota-chr.png' },
  { keywords: ['highlander'], file: 'toyota-highlander.png' },
  { keywords: ['hiace'], file: 'oryx-van.png' },
  { keywords: ['ranger'], file: 'ford-ranger.png' },
  { keywords: ['escape'], file: 'ford-escape.png' },
  { keywords: ['fortuner'], file: 'toyota-fortuner.png' },
];

function imageFor(plateNo: string | null, model: string | null): string | null {
  const plateKey = plateNo?.replace(/\s+/g, '').toUpperCase();
  if (plateKey && PLATE_IMAGES[plateKey]) return PLATE_IMAGES[plateKey];
  if (!model) return null;
  const normalized = model.toLowerCase();
  return MODEL_IMAGE_RULES.find((rule) => rule.keywords.some((kw) => normalized.includes(kw)))?.file ?? null;
}

/** Returns the vehicle's own image if its plate has one, else a representative image for its model, else null. */
export function getVehicleImagePath(model: string | null, plateNo: string | null = null): string | null {
  const file = imageFor(plateNo, model);
  return file ? `${import.meta.env.BASE_URL}vehicle-images/${file}` : null;
}
