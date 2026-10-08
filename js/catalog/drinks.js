/* The built-in drink catalog: brands and products, with flavours as their own entries.
   - brand + name + variant make the title ("Crown Royal" + "" + "Peach" = "Crown Royal Peach")
   This is a small sample of each category for now; the full catalog (about 2,000 entries, Ontario first) comes next.
   - style:  a style id from styles.js
   - origin: a key in ORIGINS (left out for global brands made in many places)
   - abv:    % alcohol as sold in Canada; `approx: true` when it varies by market or batch
   Drinks the group adds go into Firestore, not here. */

export const ORIGINS = {
  "CA": "Canada", "CA-ON": "Ontario", "CA-MB": "Manitoba", "CA-NS": "Nova Scotia",
  "US": "USA", "MX": "Mexico", "PR": "Puerto Rico", "TT": "Trinidad & Tobago",
  "GB-SCT": "Scotland", "GB-ENG": "England", "IE": "Ireland", "FR": "France", "IT": "Italy", "DE": "Germany",
  "NL": "Netherlands", "NZ": "New Zealand", "JP": "Japan",
};

const d = (id, brand, name, style, abv, origin, extra = {}) => ({ id, brand, name, style, abv, ...(origin ? { origin } : {}), ...extra });
const flavour = variant => ({ variant });
const approx = { approx: true };

export const DRINKS = [
  // ---------- Beer ----------
  d("molson-canadian", "Molson", "Canadian", "am-lager", 5.0, "CA"),
  d("labatt-blue", "Labatt", "Blue", "am-lager", 5.0, "CA-ON"),
  d("bud-light", "Bud Light", "", "am-light", 4.0, "US"),
  d("bud-light-lime", "Bud Light", "", "am-light", 4.0, "US", { ...flavour("Lime"), ...approx }),
  d("coors-light", "Coors Light", "", "am-light", 4.0, "US"),
  d("steam-whistle-pilsner", "Steam Whistle", "Pilsner", "czech-pils", 5.0, "CA-ON"),
  d("great-lakes-canuck", "Great Lakes Brewery", "Canuck Pale Ale", "am-pale", 5.2, "CA-ON", approx),
  d("collective-arts-ransack", "Collective Arts", "Ransack the Universe", "hazy-ipa", 6.8, "CA-ON", approx),
  d("muskoka-detour", "Muskoka Brewery", "Detour", "session-ipa", 4.3, "CA-ON", approx),
  d("mill-street-organic", "Mill Street", "Organic Lager", "am-lager", 4.2, "CA-ON", approx),
  d("beaus-lug-tread", "Beau's", "Lug Tread", "kolsch", 5.2, "CA-ON"),
  d("keiths-ipa", "Alexander Keith's", "India Pale Ale", "eng-ipa", 5.0, "CA-NS"),
  d("guinness-draught", "Guinness", "Draught", "dry-stout", 4.2, "IE"),

  // ---------- Whisky ----------
  d("crown-royal-deluxe", "Crown Royal", "Deluxe", "cdn-blended", 40, "CA-MB"),
  d("crown-royal-peach", "Crown Royal", "", "cdn-flavoured", 35, "CA-MB", { ...flavour("Peach"), ...approx }),
  d("lot-40-rye", "Lot No. 40", "Canadian Rye", "cdn-rye", 43, "CA-ON"),
  d("dillons-rye", "Dillon's", "Rye Whisky", "cdn-rye", 40, "CA-ON", approx),
  d("forty-creek-barrel-select", "Forty Creek", "Barrel Select", "cdn-blended", 40, "CA-ON"),
  d("canadian-club-1858", "Canadian Club", "1858 Original", "cdn-blended", 40, "CA-ON"),
  d("wisers-deluxe", "J.P. Wiser's", "Deluxe", "cdn-blended", 40, "CA-ON"),
  d("gibsons-12", "Gibson's Finest", "Rare 12 Year", "cdn-blended", 40, "CA-ON", approx),
  d("lagavulin-16", "Lagavulin", "16 Year", "islay", 43, "GB-SCT"),
  d("glenfiddich-12", "Glenfiddich", "12 Year", "speyside", 40, "GB-SCT"),
  d("jameson", "Jameson", "Irish Whiskey", "irish-blended", 40, "IE"),
  d("buffalo-trace", "Buffalo Trace", "Kentucky Straight Bourbon", "bourbon", 45, "US"),
  d("jack-daniels-7", "Jack Daniel's", "Old No. 7", "tennessee", 40, "US"),

  // ---------- Spirits ----------
  d("beefeater", "Beefeater", "London Dry Gin", "london-dry", 40, "GB-ENG"),
  d("tanqueray", "Tanqueray", "London Dry Gin", "london-dry", 47.3, "GB-SCT", approx),
  d("dillons-gin-22", "Dillon's", "Unfiltered Gin 22", "new-western", 40, "CA-ON", approx),
  d("polar-ice", "Polar Ice", "Vodka", "vodka", 40, "CA-ON"),
  d("smirnoff-vanilla", "Smirnoff", "", "flavoured-vodka", 35, null, { ...flavour("Vanilla"), ...approx }),
  d("kraken-black-spiced", "The Kraken", "Black Spiced Rum", "spiced-rum", 47, "TT", approx),
  d("captain-morgan-spiced", "Captain Morgan", "Original Spiced Rum", "spiced-rum", 35, null),
  d("bacardi-superior", "Bacardi", "Superior", "white-rum", 40, "PR"),
  d("jose-cuervo-especial-gold", "Jose Cuervo", "Especial Gold", "joven", 40, "MX"),
  d("olmeca-altos-plata", "Olmeca Altos", "Plata", "blanco", 40, "MX"),
  d("hennessy-vs", "Hennessy", "VS", "cognac-vs", 40, "FR"),
  d("baileys-original", "Baileys", "Original Irish Cream", "cream-liqueur", 17, "IE"),
  d("campari", "Campari", "", "aperitivo", 25, "IT", approx),
  d("aperol", "Aperol", "", "aperitivo", 11, "IT"),
  d("kahlua", "Kahlúa", "Coffee Liqueur", "coffee-liqueur", 20, "MX"),
  d("jagermeister", "Jägermeister", "", "amaro", 35, "DE"),
  d("fireball", "Fireball", "Cinnamon Whisky", "cinnamon", 33, "CA", approx),
  d("martini-rosso", "Martini & Rossi", "Rosso Vermouth", "vermouth", 15, "IT", approx),

  // ---------- Wine ----------
  d("inniskillin-vidal-icewine", "Inniskillin", "Vidal Icewine", "icewine", 9.5, "CA-ON", approx),
  d("jackson-triggs-reserve-cab", "Jackson-Triggs", "Reserve Cabernet Sauvignon", "cab-sauv", 13, "CA-ON", approx),
  d("henry-of-pelham-baco", "Henry of Pelham", "Baco Noir", "baco-noir", 13, "CA-ON", approx),
  d("cave-spring-riesling", "Cave Spring", "Riesling", "riesling", 11, "CA-ON", approx),
  d("kim-crawford-sauv-blanc", "Kim Crawford", "Sauvignon Blanc", "sauv-blanc", 12.5, "NZ", approx),
  d("apothic-red", "Apothic", "Red", "red-blend", 13.5, "US", approx),
  d("la-marca-prosecco", "La Marca", "Prosecco", "prosecco", 11, "IT"),
  d("veuve-clicquot-brut", "Veuve Clicquot", "Yellow Label Brut", "champagne", 12, "FR"),

  // ---------- Cider, seltzer and more ----------
  d("brickworks-1904", "Brickworks Ciderhouse", "Batch: 1904", "semi-cider", 5.0, "CA-ON", approx),
  d("thornbury-apple", "Thornbury", "Premium Apple Cider", "semi-cider", 5.3, "CA-ON", approx),
  d("palm-bay-pineapple-mango", "Palm Bay", "Spritz", "cooler", 4.0, "CA", { ...flavour("Pineapple Mango"), ...approx }),
  d("nutrl-watermelon", "NÜTRL", "Vodka Soda", "seltzer", 5.0, "CA", { ...flavour("Watermelon"), ...approx }),
  d("cottage-springs-lime", "Cottage Springs", "Vodka Soda", "seltzer", 5.0, "CA-ON", { ...flavour("Lime"), ...approx }),
  d("white-claw-black-cherry", "White Claw", "Hard Seltzer", "seltzer", 5.0, "US", flavour("Black Cherry")),
  d("twisted-tea-original", "Twisted Tea", "Hard Iced Tea", "hard-iced-tea", 5.0, "US", flavour("Original")),
  d("gekkeikan-junmai", "Gekkeikan", "Traditional", "junmai", 15, "JP", approx),

  // ---------- Non-alcoholic ----------
  d("partake-pale", "Partake", "Pale", "na-beer", 0.3, "CA-ON", approx),
  d("athletic-run-wild", "Athletic Brewing", "Run Wild IPA", "na-beer", 0.5, "US"),
  d("heineken-zero", "Heineken", "0.0", "na-beer", 0, "NL"),
  d("sobrii-0-gin", "Sobrii", "0-Gin", "na-spirit", 0, "CA-ON", approx),
  d("seedlip-garden", "Seedlip", "Garden 108", "na-spirit", 0, "GB-ENG"),
];
