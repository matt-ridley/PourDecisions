/* Spirits: gin, vodka, rum, tequila and agave, brandy, liqueurs and amari, and the rest. Ontario distilleries first
   in each family. */
import { d, maker, flavours, APPROX } from "./make.js";

const A = APPROX;

// ---------- Gin ----------
const dillons = maker("Dillon's", "CA-ON", "Beamsville", A);
const GIN = [
  dillons("Unfiltered Gin 22", "new-western", 40), dillons("Rose Gin", "flavoured-gin", 37), dillons("Cherry Gin", "flavoured-gin", 37),
  d("Spirit of York", "Gin", "new-western", 42, "CA-ON", { town: "Toronto", ...A }),
  d("Georgian Bay", "Gin", "new-western", 40, "CA-ON", { town: "Collingwood", ...A }),
  d("Willibald", "Gin", "new-western", 40, "CA-ON", { town: "Ayr", ...A }),
  d("Empress 1908", "Indigo Gin", "new-western", 42.5, "CA-BC", { town: "Victoria" }),
  d("Ungava", "Gin", "new-western", 43.1, "CA-QC"),
  ...[
    ["Beefeater", "London Dry Gin", 40], ["Tanqueray", "London Dry Gin", 47.3], ["Tanqueray", "No. Ten", 47.3],
    ["Bombay Sapphire", "", 40], ["Gordon's", "London Dry Gin", 40], ["Sipsmith", "London Dry Gin", 41.6],
  ].map(([b, n, abv]) => d(b, n, "london-dry", abv, b === "Tanqueray" ? "GB-SCT" : "GB-ENG")),
  d("Hendrick's", "Gin", "new-western", 41.4, "GB-SCT", A), d("The Botanist", "Islay Dry Gin", "new-western", 46, "GB-SCT"),
  d("Roku", "Gin", "new-western", 43, "JP"), d("Monkey 47", "Schwarzwald Dry Gin", "new-western", 47, "DE"),
  d("Aviation", "American Gin", "new-western", 42, "US"), d("Gin Mare", "", "new-western", 42.7, "ES"),
  d("Malfy", "Gin Con Limone", "flavoured-gin", 41, "IT"), d("Bulldog", "London Dry Gin", "london-dry", 40, "GB-ENG"),
  d("Brockmans", "Gin", "new-western", 40, "GB-ENG"), d("Seagram's", "Extra Dry Gin", "london-dry", 40, "US", A),
  d("Plymouth", "Gin", "plymouth", 41.2, "GB-ENG"), d("Plymouth", "Navy Strength", "navy-gin", 57, "GB-ENG"),
  d("Hayman's", "Old Tom Gin", "old-tom", 41.4, "GB-ENG"), d("Hayman's", "Sloe Gin", "sloe-gin", 26, "GB-ENG"),
  d("Bols", "Genever", "genever", 42, "NL"),
  d("Beefeater", "Pink Strawberry", "flavoured-gin", 37.5, "GB-ENG", A), d("Gordon's", "Pink", "flavoured-gin", 37.5, "GB-ENG", A),
  d("Bombay", "Bramble", "flavoured-gin", 37.5, "GB-ENG"), d("Tanqueray", "Rangpur", "flavoured-gin", 41.3, "GB-SCT", A),
];

// ---------- Vodka ----------
const smirnoff = maker("Smirnoff", "");
const absolut = maker("Absolut", "SE");
const VODKA = [
  d("Polar Ice", "Vodka", "vodka", 40, "CA-ON", { town: "Windsor" }),
  d("Spirit of York", "Vodka", "vodka", 40, "CA-ON", { town: "Toronto", ...A }),
  d("Georgian Bay", "Vodka", "vodka", 40, "CA-ON", { town: "Collingwood", ...A }),
  d("Iceberg", "Vodka", "vodka", 40, "CA-NL"), d("Crystal Head", "Vodka", "vodka", 40, "CA-NL"),
  smirnoff("No. 21 Vodka", "vodka", 40),
  absolut("Vodka", "vodka", 40), d("Grey Goose", "Vodka", "vodka", 40, "FR"), d("Belvedere", "Vodka", "vodka", 40, "PL"),
  d("Ketel One", "Vodka", "vodka", 40, "NL"), d("Tito's", "Handmade Vodka", "vodka", 40, "US"), d("Stolichnaya", "Vodka", "vodka", 40, "LV"),
  d("Finlandia", "Vodka", "vodka", 40, "FI"), d("Skyy", "Vodka", "vodka", 40, "US"), d("Cîroc", "Vodka", "vodka", 40, "FR"),
  d("Chopin", "Potato Vodka", "vodka", 40, "PL"), d("Żubrówka", "Bison Grass Vodka", "flavoured-vodka", 40, "PL", A),
  ...flavours(smirnoff, "", "flavoured-vodka", 35, ["Vanilla", "Raspberry", "Green Apple", "Citrus"], A),
  ...flavours(absolut, "", "flavoured-vodka", 40, ["Citron", "Mandrin", "Vanilia", "Raspberri"]),
  d("Grey Goose", "", "flavoured-vodka", 40, "FR", { variant: "L'Orange" }), d("Grey Goose", "", "flavoured-vodka", 40, "FR", { variant: "La Poire" }),
];

// ---------- Rum ----------
const bacardi = maker("Bacardi", "PR");
const captain = maker("Captain Morgan", "");
const lambs = maker("Lamb's", "");
const RUM = [
  bacardi("Superior", "white-rum", 40), bacardi("Gold", "gold-rum", 40), bacardi("Black", "dark-rum", 40), bacardi("Spiced", "spiced-rum", 35),
  bacardi("Reserva Ocho", "aged-rum", 40), bacardi("Coconut", "flavoured-rum", 35),
  captain("Original Spiced Rum", "spiced-rum", 35), captain("White Rum", "white-rum", 35, A), captain("Dark Rum", "dark-rum", 40, A),
  lambs("Navy Rum", "dark-rum", 40), lambs("White Rum", "white-rum", 40), lambs("Palm Breeze", "gold-rum", 40),
  d("The Kraken", "Black Spiced Rum", "spiced-rum", 47, "TT", A),
  d("Newfoundland", "Screech", "dark-rum", 40, "CA-NL"),
  d("Appleton Estate", "Signature", "gold-rum", 40, "JM"), d("Appleton Estate", "12 Year Rare Casks", "aged-rum", 43, "JM"),
  d("Mount Gay", "Eclipse", "gold-rum", 40, "BB"), d("Mount Gay", "XO", "aged-rum", 43, "BB"),
  d("El Dorado", "12 Year", "aged-rum", 40, "GY"), d("El Dorado", "15 Year", "aged-rum", 43, "GY"),
  d("Havana Club", "Añejo 3 Años", "white-rum", 40, "CU"), d("Havana Club", "Añejo 7 Años", "aged-rum", 40, "CU"),
  d("Diplomático", "Reserva Exclusiva", "aged-rum", 40, "VE"), d("Ron Zacapa", "23", "aged-rum", 40, "GT"),
  d("Flor de Caña", "7 Year", "aged-rum", 40, "NI", A), d("Brugal", "Añejo", "gold-rum", 38, "DO"),
  d("Planteray", "3 Stars", "white-rum", 41.2, "BB"), d("Planteray", "O.F.T.D.", "overproof-rum", 69, "BB"),
  d("Gosling's", "Black Seal", "dark-rum", 40, "BM"), d("Wray & Nephew", "White Overproof", "overproof-rum", 63, "JM"),
  d("Sailor Jerry", "Spiced Rum", "spiced-rum", 40, "VI", A), d("Bumbu", "The Original", "spiced-rum", 35, "BB", A),
  d("Malibu", "Coconut", "flavoured-rum", 21, "BB"),
  d("Clément", "VSOP", "agricole", 40, "MQ"), d("Rhum J.M", "Blanc", "agricole", 50, "MQ"),
  d("Leblon", "Cachaça", "cachaca", 40, "BR"),
];

// ---------- Tequila and agave ----------
const t = (brand, list) => list.map(([name, style, abv, extra = {}]) => d(brand, name, style, abv, "MX", extra));
const AGAVE = [
  ...t("Jose Cuervo", [["Especial Gold", "joven", 40], ["Especial Silver", "blanco", 40], ["Tradicional Reposado", "reposado", 38, A]]),
  ...t("1800", [["Silver", "blanco", 40], ["Reposado", "reposado", 40]]),
  ...t("Patrón", [["Silver", "blanco", 40], ["Reposado", "reposado", 40], ["Añejo", "anejo", 40]]),
  ...t("Don Julio", [["Blanco", "blanco", 40], ["Reposado", "reposado", 40], ["Añejo", "anejo", 40], ["1942", "extra-anejo", 38], ["70 Cristalino", "cristalino", 35]]),
  ...t("Casamigos", [["Blanco", "blanco", 40], ["Reposado", "reposado", 40]]),
  ...t("Olmeca Altos", [["Plata", "blanco", 40], ["Reposado", "reposado", 40]]),
  ...t("Espolòn", [["Blanco", "blanco", 40], ["Reposado", "reposado", 40]]),
  ...t("Herradura", [["Reposado", "reposado", 40]]),
  ...t("El Jimador", [["Blanco", "blanco", 40]]),
  ...t("Sauza", [["Silver", "blanco", 40]]),
  ...t("Hornitos", [["Reposado", "reposado", 40]]),
  ...t("Cazadores", [["Reposado", "reposado", 40]]),
  ...t("Teremana", [["Blanco", "blanco", 40]]),
  ...t("Maestro Dobel", [["Diamante", "cristalino", 40]]),
  ...t("Clase Azul", [["Reposado", "reposado", 40]]),
  ...t("Milagro", [["Silver", "blanco", 40]]),
  ...t("Fortaleza", [["Blanco", "blanco", 40]]),
  ...t("Del Maguey", [["Vida", "mezcal", 42]]),
  ...t("Montelobos", [["Espadín", "mezcal", 43.2]]),
  ...t("400 Conejos", [["Espadín", "mezcal", 38, A]]),
  ...t("Ilegal", [["Joven", "mezcal", 40]]),
];

// ---------- Brandy ----------
const BRANDY = [
  ...[["VS", "cognac-vs"], ["VSOP", "cognac-vsop"], ["XO", "cognac-xo"]].map(([n, s]) => d("Hennessy", n, s, 40, "FR")),
  d("Rémy Martin", "VSOP", "cognac-vsop", 40, "FR"), d("Rémy Martin", "XO", "cognac-xo", 40, "FR"), d("Rémy Martin", "1738 Accord Royal", "cognac-vsop", 40, "FR"),
  d("Courvoisier", "VS", "cognac-vs", 40, "FR"), d("Courvoisier", "VSOP", "cognac-vsop", 40, "FR"),
  d("Martell", "VS", "cognac-vs", 40, "FR"), d("Martell", "Cordon Bleu", "cognac-xo", 40, "FR"),
  d("St-Rémy", "XO", "brandy", 40, "FR"), d("E&J", "VS", "brandy", 40, "US"), d("Torres", "10 Gran Reserva", "brandy", 38, "ES"),
  d("Metaxa", "5 Stars", "brandy", 38, "GR"), d("Boulard", "VSOP Pays d'Auge", "calvados", 40, "FR"),
];

// ---------- Liqueurs and amari ----------
const LIQUEUR = [
  // Canadian first
  d("Forty Creek", "Cream", "cream-liqueur", 17, "CA-ON", { town: "Grimsby" }),
  d("Forty Creek", "Nanticoke Gold Maple", "whisky-liqueur", 30, "CA-ON", { town: "Grimsby", ...A }),
  d("Sortilège", "Maple Whisky Liqueur", "whisky-liqueur", 30, "CA-QC"),
  d("Sour Puss", "Raspberry", "fruit-liqueur", 15, "CA", A),
  d("Fireball", "Cinnamon Whisky", "cinnamon", 33, "CA", A),
  // Cream and coffee
  d("Baileys", "Original Irish Cream", "cream-liqueur", 17, "IE"), d("Baileys", "Salted Caramel", "cream-liqueur", 17, "IE"),
  d("Carolans", "Irish Cream", "cream-liqueur", 17, "IE"), d("Amarula", "Cream", "cream-liqueur", 17, "ZA"),
  d("RumChata", "", "cream-liqueur", 13.75, "US"),
  d("Kahlúa", "Coffee Liqueur", "coffee-liqueur", 20, "MX"), d("Tia Maria", "", "coffee-liqueur", 20, "JM"),
  // Fruit, orange, nut and floral
  d("St-Germain", "Elderflower Liqueur", "fruit-liqueur", 20, "FR"), d("Chambord", "Black Raspberry", "fruit-liqueur", 16.5, "FR"),
  d("Midori", "Melon Liqueur", "fruit-liqueur", 20, "JP"), d("Luxardo", "Maraschino", "fruit-liqueur", 32, "IT"),
  d("Villa Massa", "Limoncello", "fruit-liqueur", 30, "IT"), d("De Kuyper", "Peachtree Schnapps", "fruit-liqueur", 20, "NL", A),
  d("Pimm's", "No. 1", "fruit-liqueur", 25, "GB-ENG"),
  d("Grand Marnier", "Cordon Rouge", "orange-liqueur", 40, "FR"), d("Cointreau", "", "orange-liqueur", 40, "FR"),
  d("De Kuyper", "Triple Sec", "orange-liqueur", 24, "NL", A),
  d("Disaronno", "Originale", "nut-liqueur", 28, "IT"), d("Frangelico", "", "nut-liqueur", 20, "IT"),
  d("Licor 43", "", "amaro", 31, "ES"),
  // Herbal and bitter
  d("Jägermeister", "", "amaro", 35, "DE"), d("Fernet-Branca", "", "amaro", 39, "IT"), d("Averna", "Amaro Siciliano", "amaro", 29, "IT"),
  d("Amaro Montenegro", "", "amaro", 23, "IT"), d("Ramazzotti", "Amaro", "amaro", 30, "IT"), d("Amaro Nonino", "Quintessentia", "amaro", 35, "IT"),
  d("Cynar", "", "amaro", 16.5, "IT"), d("Chartreuse", "Green", "amaro", 55, "FR"), d("Chartreuse", "Yellow", "amaro", 40, "FR"),
  d("Bénédictine", "D.O.M.", "amaro", 40, "FR"), d("Drambuie", "", "whisky-liqueur", 40, "GB-SCT"), d("Galliano", "L'Autentico", "amaro", 42.3, "IT"),
  d("Southern Comfort", "Original", "whisky-liqueur", 35, "US"), d("Goldschläger", "", "cinnamon", 43.5, "CH", A),
  d("Campari", "", "aperitivo", 25, "IT", A), d("Aperol", "", "aperitivo", 11, "IT"),
  // Anise
  d("Sambuca Romana", "", "anise", 38, "IT", A), d("Ouzo 12", "", "anise", 38, "GR"), d("Pernod", "", "anise", 40, "FR"), d("Ricard", "Pastis", "anise", 45, "FR"),
  // Vermouth and aperitif wine
  d("Martini & Rossi", "Rosso Vermouth", "vermouth", 15, "IT", A), d("Martini & Rossi", "Extra Dry Vermouth", "vermouth", 15, "IT", A),
  d("Cinzano", "Rosso", "vermouth", 15, "IT", A), d("Carpano", "Antica Formula", "vermouth", 16.5, "IT"),
  d("Dolin", "Dry Vermouth", "vermouth", 17.5, "FR"), d("Lillet", "Blanc", "vermouth", 17, "FR"),
];

// ---------- Other spirits ----------
const OTHER = [
  d("Absente", "Absinthe", "absinthe", 55, "FR"), d("Linie", "Aquavit", "aquavit", 41.5, "NO"),
  d("Jinro", "Chamisul Fresh", "soju", 16.5, "KR", A), ...flavours(maker("Jinro", "KR"), "", "soju", 13, ["Grapefruit", "Green Grape", "Peach"], A),
  d("Kweichow Moutai", "Prince", "baijiu", 53, "CN"),
  d("Ole Smoky", "Original Moonshine", "moonshine", 50, "US", A),
];

export const SPIRITS = [...GIN, ...VODKA, ...RUM, ...AGAVE, ...BRANDY, ...LIQUEUR, ...OTHER];
