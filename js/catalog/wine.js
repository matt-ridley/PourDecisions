/* Wine: Ontario first (Niagara, Prince Edward County, Lake Erie North Shore), then the imports found on most LCBO
   shelves, then sparkling, fortified and dessert wines. ABVs vary by vintage, so most are approximate. */
import { d, maker, APPROX } from "./make.js";

const A = APPROX;
const ont = (brand, town) => maker(brand, "CA-ON", town, A);

// ---------- Ontario ----------
const inniskillin = ont("Inniskillin", "Niagara-on-the-Lake");
const jt = ont("Jackson-Triggs", "Niagara-on-the-Lake");
const pelham = ont("Henry of Pelham", "St. Catharines");
const caveSpring = ont("Cave Spring", "Jordan");
const peller = ont("Peller Estates", "Niagara-on-the-Lake");
const trius = ont("Trius", "Niagara-on-the-Lake");
const pelee = ont("Pelee Island", "Kingsville");
const malivoire = ont("Malivoire", "Beamsville");
const megalomaniac = ont("Megalomaniac", "Vineland");
const stratus = ont("Stratus", "Niagara-on-the-Lake");
const hardie = ont("Norman Hardie", "Prince Edward County");

const ONTARIO = [
  inniskillin("Vidal Icewine", "icewine", 9.5), inniskillin("Riesling Icewine", "icewine", 9.5), inniskillin("Cabernet Franc Icewine", "icewine", 9.5),
  jt("Reserve Cabernet Sauvignon", "cab-sauv", 13), jt("Reserve Merlot", "merlot", 13), jt("Reserve Chardonnay", "chardonnay", 13),
  jt("Reserve Pinot Grigio", "pinot-grigio", 12), jt("Reserve Sauvignon Blanc", "sauv-blanc", 12), jt("Vidal Icewine", "icewine", 9.5),
  pelham("Baco Noir", "baco-noir", 13), pelham("Riesling", "riesling", 11), pelham("Cuvée Catharine Brut", "sparkling-wine", 12),
  caveSpring("Riesling", "riesling", 11), caveSpring("Estate Riesling", "riesling", 11), caveSpring("Dolomite Riesling", "riesling", 11),
  caveSpring("Cabernet Franc", "cab-franc", 13),
  peller("Family Series Cabernet Sauvignon", "cab-sauv", 13), peller("Family Series Merlot", "merlot", 13),
  peller("Family Series Baco Noir", "baco-noir", 13), peller("Family Series Chardonnay", "chardonnay", 12.5),
  peller("Family Series Pinot Grigio", "pinot-grigio", 12), peller("Ice Cuvée", "sparkling-wine", 12), peller("Vidal Icewine", "icewine", 10),
  trius("Red", "red-blend", 13.5), trius("Brut", "sparkling-wine", 12.5),
  pelee("Pinot Grigio", "pinot-grigio", 12), pelee("Cabernet Franc", "cab-franc", 13),
  malivoire("Ladybug Rosé", "rose", 12), malivoire("Gamay", "gamay", 12.5),
  megalomaniac("Narcissist Riesling", "riesling", 11), megalomaniac("Bigmouth Merlot", "merlot", 13),
  stratus("Red", "red-blend", 13.5), stratus("White", "white-blend", 13),
  d("Château des Charmes", "Gamay Noir Droit", "gamay", 13, "CA-ON", { town: "Niagara-on-the-Lake", ...A }),
  d("Tawse", "Sketches of Niagara Riesling", "riesling", 11, "CA-ON", { town: "Vineland", ...A }),
  d("Flat Rock Cellars", "Twisted", "white-blend", 12, "CA-ON", { town: "Jordan", ...A }),
  d("Fielding Estate", "Rosé", "rose", 12.5, "CA-ON", { town: "Beamsville", ...A }),
  d("20 Bees", "Cabernet Merlot", "red-blend", 12.5, "CA-ON", { town: "Niagara-on-the-Lake", ...A }),
  d("Pillitteri", "Vidal Icewine", "icewine", 10, "CA-ON", { town: "Niagara-on-the-Lake", ...A }),
  d("The Foreign Affair", "The Conspiracy", "appassimento", 14, "CA-ON", { town: "Vineland", ...A }),
  d("Colaneri", "Appassimento", "appassimento", 14, "CA-ON", { town: "Niagara-on-the-Lake", ...A }),
  d("Colio", "Girls' Night Out White", "white-blend", 11.5, "CA-ON", { town: "Harrow", ...A }),
  hardie("County Pinot Noir", "pinot-noir", 11.5), hardie("County Chardonnay", "chardonnay", 12),
  d("Closson Chase", "Chardonnay", "chardonnay", 13, "CA-ON", { town: "Prince Edward County", ...A }),
  d("Sandbanks", "Baco Noir", "baco-noir", 13, "CA-ON", { town: "Prince Edward County", ...A }),
  d("Hinterland", "Ancestral", "pet-nat", 9, "CA-ON", { town: "Prince Edward County", ...A }),
];

// ---------- Imports ----------
const IMPORTS = [
  // New Zealand and Australia
  d("Kim Crawford", "Sauvignon Blanc", "sauv-blanc", 12.5, "NZ", A), d("Oyster Bay", "Sauvignon Blanc", "sauv-blanc", 12.5, "NZ", A),
  d("Villa Maria", "Private Bin Sauvignon Blanc", "sauv-blanc", 12.5, "NZ", A), d("Cloudy Bay", "Sauvignon Blanc", "sauv-blanc", 13.5, "NZ", A),
  d("Yellow Tail", "Shiraz", "shiraz", 13.5, "AU", A), d("Yellow Tail", "Chardonnay", "chardonnay", 13, "AU", A),
  d("19 Crimes", "Red Blend", "red-blend", 13.5, "AU", A), d("Wolf Blass", "Yellow Label Cabernet Sauvignon", "cab-sauv", 13.5, "AU", A),
  d("Jacob's Creek", "Shiraz Cabernet", "red-blend", 13.5, "AU", A), d("Penfolds", "Koonunga Hill Shiraz Cabernet", "red-blend", 13.5, "AU", A),
  d("Lindeman's", "Bin 65 Chardonnay", "chardonnay", 13, "AU", A),
  // USA
  d("Apothic", "Red", "red-blend", 13.5, "US", A), d("Robert Mondavi", "Private Selection Cabernet Sauvignon", "cab-sauv", 13.5, "US", A),
  d("Josh Cellars", "Cabernet Sauvignon", "cab-sauv", 13.5, "US", A), d("Meiomi", "Pinot Noir", "pinot-noir", 13.7, "US", A),
  d("Kendall-Jackson", "Vintner's Reserve Chardonnay", "chardonnay", 13.5, "US", A), d("Bread & Butter", "Chardonnay", "chardonnay", 13.5, "US", A),
  d("Ménage à Trois", "Red", "red-blend", 13.5, "US", A), d("Caymus", "Cabernet Sauvignon", "cab-sauv", 14.5, "US", A),
  d("The Prisoner", "Red Blend", "red-blend", 15, "US", A), d("Sutter Home", "White Zinfandel", "rose", 9.5, "US", A),
  // South America
  d("Catena", "Malbec", "malbec", 13.5, "AR", A), d("Alamos", "Malbec", "malbec", 13.5, "AR", A),
  d("Casillero del Diablo", "Cabernet Sauvignon", "cab-sauv", 13.5, "CL", A),
  // Europe
  d("Ruffino", "Chianti", "sangiovese", 12.5, "IT", A), d("Santa Margherita", "Pinot Grigio", "pinot-grigio", 12.5, "IT", A),
  d("Mezzacorona", "Pinot Grigio", "pinot-grigio", 12.5, "IT", A), d("Masi", "Campofiorin", "valpolicella", 13, "IT", A),
  d("Masi", "Costasera Amarone", "valpolicella", 15, "IT", A),
  d("Campo Viejo", "Rioja Tempranillo", "tempranillo", 13, "ES", A), d("Marqués de Cáceres", "Rioja Crianza", "tempranillo", 13.5, "ES", A),
  d("Louis Jadot", "Beaujolais-Villages", "gamay", 12.5, "FR", A), d("Mouton Cadet", "Bordeaux Rouge", "red-blend", 13.5, "FR", A),
  d("E. Guigal", "Côtes du Rhône", "grenache", 14, "FR", A), d("Whispering Angel", "Côtes de Provence Rosé", "rose", 13, "FR", A),
  d("Dr. Loosen", "Dr. L Riesling", "riesling", 8.5, "DE", A), d("Mateus", "Rosé", "rose", 11, "PT", A),
];

// ---------- Sparkling, fortified and dessert ----------
const SPECIAL = [
  d("Moët & Chandon", "Impérial Brut", "champagne", 12, "FR"), d("Veuve Clicquot", "Yellow Label Brut", "champagne", 12, "FR"),
  d("Dom Pérignon", "Brut", "champagne", 12.5, "FR"), d("Bollinger", "Special Cuvée", "champagne", 12, "FR"),
  d("Taittinger", "Brut Réserve", "champagne", 12.5, "FR"),
  d("La Marca", "Prosecco", "prosecco", 11, "IT"), d("Mionetto", "Prosecco Brut", "prosecco", 11, "IT"), d("Ruffino", "Prosecco", "prosecco", 11, "IT", A),
  d("Martini", "Asti", "moscato", 7.5, "IT"),
  d("Freixenet", "Cordon Negro Brut", "cava", 11.5, "ES"), d("Segura Viudas", "Brut Reserva", "cava", 12, "ES", A),
  d("Graham's", "Six Grapes", "ruby-port", 20, "PT"), d("Taylor Fladgate", "10 Year Tawny", "tawny-port", 20, "PT"),
  d("Sandeman", "Ruby", "ruby-port", 19.5, "PT", A), d("Cockburn's", "Special Reserve", "ruby-port", 20, "PT"), d("Fonseca", "Bin 27", "ruby-port", 20, "PT"),
  d("Tio Pepe", "Fino", "fino", 15, "ES"), d("Harveys", "Bristol Cream", "oloroso", 17.5, "ES", A),
  d("Florio", "Marsala Superiore", "marsala", 18, "IT", A),
  d("Royal Tokaji", "5 Puttonyos Aszú", "tokaji", 11, "HU", A),
];

export const WINE = [...ONTARIO, ...IMPORTS, ...SPECIAL];
