/* Cider, mead, sake, hard seltzers, coolers and canned cocktails. Ontario first. Each flavour is its own entry. */
import { d, maker, flavours, APPROX } from "./make.js";

const A = APPROX;

// ---------- Cider and mead ----------
const CIDER = [
  d("Brickworks Ciderhouse", "Batch: 1904", "semi-cider", 5.0, "CA-ON", { town: "Toronto", ...A }),
  d("Thornbury", "Premium Apple Cider", "semi-cider", 5.3, "CA-ON", { town: "Thornbury", ...A }),
  d("Pommies", "Dry Cider", "dry-cider", 5.3, "CA-ON", { town: "Caledon", ...A }),
  d("County Cider Company", "Waupoos Premium Cider", "semi-cider", 6.5, "CA-ON", { town: "Prince Edward County", ...A }),
  d("Molson", "Canadian Cider", "semi-cider", 5.0, "CA", A),
  d("Growers", "Extra Dry", "dry-cider", 7.0, "CA-BC", A), d("Growers", "Peach", "fruit-cider", 7.0, "CA-BC", A),
  d("Domaine Pinnacle", "Ice Cider", "ice-cider", 12, "CA-QC", A),
  d("Somersby", "Apple", "semi-cider", 4.5, "DK", A), d("Somersby", "Blackberry", "fruit-cider", 4.5, "DK", A),
  d("Strongbow", "Original Dry", "dry-cider", 5.3, "GB-ENG", A), d("Magners", "Original", "semi-cider", 4.5, "IE"),
  d("Angry Orchard", "Crisp Apple", "sweet-cider", 5.0, "US"),
  d("Kopparberg", "Mixed Fruit", "fruit-cider", 4.0, "SE"), d("Kopparberg", "Strawberry & Lime", "fruit-cider", 4.0, "SE"),
  d("Kopparberg", "Pear", "perry", 4.5, "SE"),
  d("Rosewood", "Mead Royale", "mead", 12, "CA-ON", { town: "Beamsville", ...A }),
];

// ---------- Sake ----------
const SAKE = [
  d("Gekkeikan", "Traditional", "junmai", 15, "JP", A), d("Ozeki", "Nigori", "nigori", 14.5, "JP", A),
  d("Hakutsuru", "Sayuri Nigori", "nigori", 12.5, "JP"), d("Dassai", "45 Junmai Daiginjo", "daiginjo", 16, "JP"),
];

// ---------- Seltzers, coolers and canned cocktails ----------
const whiteClaw = maker("White Claw", "US");
const truly = maker("Truly", "US", "", A);
const nutrl = maker("NÜTRL", "CA", "", A);
const cottage = maker("Cottage Springs", "CA-ON", "", A);
const mikes = maker("Mike's Hard", "CA", "", A);
const palmBay = maker("Palm Bay", "CA", "", A);
const twisted = maker("Twisted Tea", "US");

const RTD = [
  ...flavours(cottage, "Vodka Soda", "seltzer", 5.0, ["Lime", "Lemon", "Black Cherry", "Peach", "Pineapple"]),
  ...flavours(nutrl, "Vodka Soda", "seltzer", 5.0, ["Watermelon", "Lime", "Raspberry", "Cherry", "Pineapple", "Lemon", "Orange"]),
  ...flavours(whiteClaw, "Hard Seltzer", "seltzer", 5.0, ["Black Cherry", "Mango", "Natural Lime", "Raspberry", "Grapefruit", "Watermelon", "Lemon"]),
  ...flavours(truly, "Hard Seltzer", "seltzer", 5.0, ["Wild Berry", "Pineapple", "Lime"]),
  ...flavours(palmBay, "Spritz", "cooler", 4.0, ["Pineapple Mango", "Key Lime Cactus"]),
  d("Smirnoff Ice", "Original", "cooler", 5.0, "", A),
  ...flavours(mikes, "", "hard-lemonade", 5.0, ["Lemonade", "Cranberry Lemonade"]),
  twisted("Hard Iced Tea", "hard-iced-tea", 5.0, { variant: "Original" }), twisted("Hard Iced Tea", "hard-iced-tea", 5.0, { variant: "Half & Half" }),
  d("Simply Spiked", "Lemonade", "hard-lemonade", 5.0, "US", A),
  d("Jack Daniel's", "& Coca-Cola", "canned-cocktail", 7.0, "US", A),
  d("Georgian Bay", "Gin Smash", "canned-cocktail", 5.0, "CA-ON", { town: "Collingwood", ...A }),
  d("Mott's Clamato", "Caesar", "canned-cocktail", 5.0, "CA", { variant: "Classic", ...A }),
];

export const MORE = [...CIDER, ...SAKE, ...RTD];
