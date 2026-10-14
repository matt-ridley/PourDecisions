/* Non-alcoholic beer, wine, spirits and cider. Mocktail recipes live in cocktails.js. Ontario first. */
import { d, maker, APPROX } from "./make.js";

const A = APPROX;
const partake = maker("Partake", "CA-ON", "Toronto", A);

export const NA = [
  partake("Pale", "na-beer", 0.3), partake("IPA", "na-beer", 0.3), partake("Blonde", "na-beer", 0.3), partake("Red", "na-beer", 0.3),
  d("Sober Carpenter", "IPA", "na-beer", 0.4, "CA-QC", A),
  d("Athletic Brewing", "Run Wild IPA", "na-beer", 0.5, "US"), d("Athletic Brewing", "Upside Dawn Golden", "na-beer", 0.5, "US"),
  d("Heineken", "0.0", "na-beer", 0, "NL"), d("Budweiser", "Zero", "na-beer", 0, "US"), d("Corona", "Sunbrew 0.0", "na-beer", 0, "MX", A),
  d("Guinness", "0.0", "na-beer", 0, "IE"), d("Stella Artois", "0.0", "na-beer", 0, "BE", A),
  d("Erdinger", "Alkoholfrei", "na-beer", 0.4, "DE"), d("Clausthaler", "Original", "na-beer", 0.45, "DE"),
  d("Sobrii", "0-Gin", "na-spirit", 0, "CA-ON", A),
  d("Seedlip", "Garden 108", "na-spirit", 0, "GB-ENG"), d("Seedlip", "Spice 94", "na-spirit", 0, "GB-ENG"), d("Seedlip", "Grove 42", "na-spirit", 0, "GB-ENG"),
  d("Lyre's", "Dry London Spirit", "na-spirit", 0, "AU", A), d("Lyre's", "Italian Orange", "na-spirit", 0, "AU", A),
  d("Ritual Zero Proof", "Whiskey Alternative", "na-spirit", 0, "US"),
  d("Giesen", "0% Sauvignon Blanc", "na-wine", 0.5, "NZ", A),
  d("Kopparberg", "Alcohol Free Mixed Fruit", "na-cider", 0.05, "SE", A),
];
