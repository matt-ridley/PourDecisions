/* Beer: Ontario first (the big brewers, then craft breweries by region), then the rest of Canada, then imports.
   Craft ABVs are marked approximate: they change between batches and years. Beers come and go, so members add
   what's missing and admins fix what's wrong. */
import { d, maker, APPROX } from "./make.js";

const A = APPROX;

// ---------- Ontario: the big brewers ----------
const labatt = maker("Labatt", "CA-ON", "London");
const molson = maker("Molson", "CA", "Toronto");
const sleeman = maker("Sleeman", "CA-ON", "Guelph");
const waterloo = maker("Waterloo", "CA-ON", "Kitchener");
const laker = maker("Laker", "CA-ON", "Kitchener");
const creemore = maker("Creemore Springs", "CA-ON", "Creemore");
const millSt = maker("Mill Street", "CA-ON", "Toronto");
const steam = maker("Steam Whistle", "CA-ON", "Toronto");
const cameron = maker("Cameron's", "CA-ON", "Oakville", A);
const hopCity = maker("Hop City", "CA-ON", "Brampton");

const ONTARIO_BIG = [
  labatt("Blue", "am-lager", 5.0), labatt("Blue Light", "am-light", 4.0), labatt("50", "cream-ale", 5.0),
  labatt("Lite", "am-light", 4.0), labatt("Ice", "ice-lager", 5.5), labatt("Maximum Ice", "strong-lager", 7.1),
  labatt("Extra Dry", "am-lager", 5.5, A), labatt("Genuine Honey", "am-lager", 5.0, A),
  molson("Canadian", "am-lager", 5.0), molson("Canadian 67", "am-light", 3.0), molson("Export", "cream-ale", 5.0),
  molson("Dry", "am-lager", 5.5), molson("Stock Ale", "cream-ale", 5.0, A), molson("Golden", "am-lager", 5.0, A),
  molson("XXX", "strong-lager", 7.3, A),
  d("Carling", "Lager", "am-lager", 5.0, "CA-ON", A), d("Carling", "Black Label", "am-lager", 5.0, "CA-ON", A),
  d("Rickard's", "Red", "amber-ale", 5.2, "CA"), d("Rickard's", "White", "witbier", 5.4, "CA"),
  d("Old Style", "Pilsner", "am-lager", 5.0, "CA", A), d("Pilsner", "Lager", "am-lager", 5.0, "CA", A),
  sleeman("Original Draught", "cream-ale", 5.0), sleeman("Cream Ale", "cream-ale", 5.0), sleeman("Honey Brown", "am-lager", 5.2),
  sleeman("Silver Creek Lager", "am-lager", 5.0), sleeman("Clear 2.0", "am-light", 4.0), sleeman("Fine Porter", "eng-porter", 5.5, A),
  waterloo("Dark", "dunkel", 5.0), waterloo("Amber", "amber-ale", 5.0, A), waterloo("IPA", "west-coast-ipa", 6.0, A),
  waterloo("Grapefruit Radler", "radler", 3.2, A),
  laker("Lager", "am-lager", 5.0), laker("Ice", "ice-lager", 5.5, A), laker("Light", "am-light", 4.0, A),
  creemore("Premium Lager", "vienna", 5.0), creemore("Kellerbier", "helles", 5.0, A), creemore("Urbock", "bock", 5.0, A),
  millSt("Organic Lager", "am-lager", 4.2), millSt("Tankhouse Ale", "am-pale", 5.2), millSt("Cobblestone Stout", "dry-stout", 4.2),
  millSt("100th Meridian Amber Lager", "vienna", 5.0), millSt("Lemon Tea Beer", "fruit-beer", 5.0, A),
  millSt("Vanilla Porter", "am-porter", 5.0, A), millSt("Belgian Wit", "witbier", 5.0, A), millSt("West Coast IPA", "west-coast-ipa", 6.5, A),
  steam("Pilsner", "czech-pils", 5.0),
  cameron("Cream Ale", "cream-ale", 5.0), cameron("Auburn Ale", "amber-ale", 5.0), cameron("RPA Rye Pale Ale", "am-pale", 6.6),
  cameron("Lager", "am-lager", 4.8), cameron("Obsidian Imperial Porter", "baltic-porter", 9.0),
  hopCity("Barking Squirrel Lager", "vienna", 5.0), hopCity("8th Sin Black Lager", "schwarzbier", 5.0, A),
];

// ---------- Ontario craft ----------
const glb = maker("Great Lakes Brewery", "CA-ON", "Toronto", A);
const amsterdam = maker("Amsterdam Brewing", "CA-ON", "Toronto", A);
const bellwoods = maker("Bellwoods Brewery", "CA-ON", "Toronto", A);
const muddyYork = maker("Muddy York", "CA-ON", "Toronto", A);
const godspeed = maker("Godspeed", "CA-ON", "Toronto", A);
const junction = maker("Junction Craft", "CA-ON", "Toronto", A);
const henderson = maker("Henderson", "CA-ON", "Toronto", A);
const lostCraft = maker("Lost Craft", "CA-ON", "Toronto", A);
const woodhouse = maker("Woodhouse", "CA-ON", "Toronto", A);
const mascot = maker("Mascot", "CA-ON", "Toronto", A);
const leftField = maker("Left Field", "CA-ON", "Toronto", A);
const spearhead = maker("Spearhead", "CA-ON", "Toronto", A);
const blackCreek = maker("Black Creek", "CA-ON", "Toronto", A);
const indie = maker("Indie Alehouse", "CA-ON", "Toronto", A);
const blood = maker("Blood Brothers", "CA-ON", "Toronto", A);
const collective = maker("Collective Arts", "CA-ON", "Hamilton", A);
const nickel = maker("Nickel Brook", "CA-ON", "Burlington", A);
const clifford = maker("Clifford", "CA-ON", "Hamilton", A);
const oast = maker("Niagara Oast House", "CA-ON", "Niagara-on-the-Lake", A);
const silversmith = maker("Silversmith", "CA-ON", "Virgil", A);
const wellington = maker("Wellington", "CA-ON", "Guelph", A);
const descendants = maker("Descendants", "CA-ON", "Kitchener", A);
const elora = maker("Elora Brewing", "CA-ON", "Elora", A);
const cowbell = maker("Cowbell", "CA-ON", "Blyth", A);
const anderson = maker("Anderson Craft Ales", "CA-ON", "London", A);
const railway = maker("Railway City", "CA-ON", "St. Thomas", A);
const forked = maker("Forked River", "CA-ON", "London", A);
const muskoka = maker("Muskoka Brewery", "CA-ON", "Bracebridge", A);
const sawdust = maker("Sawdust City", "CA-ON", "Gravenhurst", A);
const lakeOfBays = maker("Lake of Bays", "CA-ON", "Baysville", A);
const monkeys = maker("Flying Monkeys", "CA-ON", "Barrie", A);
const sideLaunch = maker("Side Launch", "CA-ON", "Collingwood", A);
const hockley = maker("Hockley Valley", "CA-ON", "Orangeville", A);
const kilannan = maker("Kilannan", "CA-ON", "Owen Sound", A);
const beaus = maker("Beau's", "CA-ON", "Vankleek Hill", A);
const btp = maker("Beyond the Pale", "CA-ON", "Ottawa", A);
const kichesippi = maker("Kichesippi", "CA-ON", "Ottawa", A);
const dominion = maker("Dominion City", "CA-ON", "Ottawa", A);
const tooth = maker("Tooth and Nail", "CA-ON", "Ottawa", A);
const whitewater = maker("Whitewater Brewing", "CA-ON", "Foresters Falls", A);
const mackinnon = maker("MacKinnon Brothers", "CA-ON", "Bath", A);
const kingston = maker("Kingston Brewing", "CA-ON", "Kingston", A);
const churchKey = maker("Church-Key", "CA-ON", "Campbellford", A);

const ONTARIO_CRAFT = [
  // Toronto and the GTA
  glb("Canuck Pale Ale", "am-pale", 5.2), glb("Octopus Wants to Fight IPA", "west-coast-ipa", 6.2), glb("Karma Citra IPA", "west-coast-ipa", 6.9),
  glb("Thrust! An IPA", "west-coast-ipa", 6.5), glb("Pompous Ass English Ale", "eng-bitter", 4.5), glb("My Bitter Wife IPA", "west-coast-ipa", 6.5),
  glb("Robohop Imperial IPA", "double-ipa", 8.0), glb("Audrey Hopburn Session IPA", "session-ipa", 4.3), glb("Lager", "am-lager", 5.0),
  amsterdam("Boneshaker IPA", "west-coast-ipa", 7.1), amsterdam("Big Wheel Deluxe Amber", "amber-ale", 5.0), amsterdam("3 Speed Lager", "am-lager", 5.0),
  amsterdam("Cruiser All Day Pale Ale", "am-pale", 4.9), amsterdam("Downtown Brown", "brown-ale", 5.0), amsterdam("Space Invader IPA", "hazy-ipa", 6.4),
  amsterdam("Natural Blonde", "blonde-ale", 5.0), amsterdam("Fracture Imperial IPA", "double-ipa", 9.0),
  bellwoods("Jelly King", "fruit-sour", 5.6), bellwoods("Witchshark", "double-ipa", 9.0), bellwoods("Roman Candle", "west-coast-ipa", 6.5),
  bellwoods("Jutsu", "am-pale", 5.6), bellwoods("Cat Lady", "west-coast-ipa", 6.5), bellwoods("Boogie Monster", "west-coast-ipa", 6.8),
  muddyYork("Gaslight Helles", "helles", 4.8), muddyYork("Diving Horse Pale Ale", "am-pale", 5.4), muddyYork("Major Small Best Bitter", "eng-bitter", 4.0),
  muddyYork("Muddy York Porter", "eng-porter", 5.0),
  godspeed("Svetlé 11°", "czech-pils", 4.6), godspeed("Ochame", "fruit-ipa", 6.0),
  junction("Brakeman's Session Ale", "blonde-ale", 4.3), junction("Conductor's Craft Ale", "amber-ale", 5.5),
  henderson("Henderson's Best", "amber-ale", 4.5), lostCraft("Revivale", "blonde-ale", 4.8), woodhouse("Woodhouse Lager", "helles", 4.8),
  mascot("Mascot Pilsner", "german-pils", 5.0),
  leftField("Eephus Oatmeal Brown Ale", "brown-ale", 5.0), leftField("Greenwood IPA", "west-coast-ipa", 6.5), leftField("Sunlight Park Saison", "saison", 6.0),
  spearhead("Hawaiian Style Pale Ale", "fruit-ipa", 6.0), blackCreek("Historic Porter", "eng-porter", 5.5),
  indie("Instigator IPA", "west-coast-ipa", 6.5), blood("Paradise Lost", "fruit-sour", 5.5), blood("Shumai", "hazy-ipa", 6.8),
  // Hamilton, Halton and Niagara
  collective("Ransack the Universe", "hazy-ipa", 6.8), collective("Life in the Clouds", "hazy-ipa", 6.1), collective("Jam Up the Mash", "fruit-sour", 5.2),
  collective("Mash Up the Jam", "fruit-sour", 5.0), collective("Audio/Visual Lager", "helles", 4.5), collective("Saint of Circumstance", "blonde-ale", 4.6),
  collective("Guava Gose", "gose", 4.5), collective("Stranger Than Fiction", "am-porter", 5.5), collective("Prophets & Nomads", "gose", 4.5),
  collective("Rhyme & Reason", "am-pale", 5.7),
  nickel("Headstock IPA", "west-coast-ipa", 6.9), nickel("Naughty Neighbour", "am-pale", 4.9), nickel("Bolshevik Bastard", "imperial-stout", 11.0),
  nickel("Green Apple Pilsner", "fruit-beer", 5.0),
  clifford("Clifford Porter", "eng-porter", 5.0),
  oast("Barn Raiser Country Ale", "am-pale", 5.0), oast("Saison", "saison", 6.5),
  silversmith("Black Lager", "schwarzbier", 5.0),
  // Waterloo Region, Wellington and the southwest
  wellington("Special Pale Ale", "eng-bitter", 4.5), wellington("County Dark Ale", "brown-ale", 5.0), wellington("Arkell Best Bitter", "eng-bitter", 4.0),
  wellington("Imperial Russian Stout", "imperial-stout", 8.0), wellington("Iron Duke", "old-ale", 6.5),
  descendants("Harvey Rabbit", "hazy-ipa", 6.5), elora("Lady Friend IPA", "west-coast-ipa", 6.8),
  cowbell("Absent Landlord Kölsch", "kolsch", 5.0), cowbell("Doc Perdue's Bobcat Kellerbier", "helles", 5.0),
  anderson("IPA", "west-coast-ipa", 6.5),
  railway("Dead Elephant IPA", "west-coast-ipa", 6.5), railway("Black Coal Stout", "dry-stout", 5.0),
  forked("Riptide Rye Pale Ale", "am-pale", 5.5),
  // Georgian Bay, Muskoka and cottage country
  muskoka("Detour", "session-ipa", 4.3), muskoka("Mad Tom IPA", "west-coast-ipa", 6.4), muskoka("Craft Lager", "am-lager", 5.0),
  muskoka("Cream Ale", "cream-ale", 5.0), muskoka("Twice as Mad Tom", "double-ipa", 8.4), muskoka("Winter Beard Double Chocolate Cranberry Stout", "pastry-stout", 8.0),
  muskoka("Kirby's Kölsch", "kolsch", 5.0), muskoka("Shinnicked Stout", "dry-stout", 5.0), muskoka("Summerweiss", "hefeweizen", 5.0),
  muskoka("Moonlight Kettle Spiced Cranberry Ale", "fruit-beer", 5.0), muskoka("Harvest Ale", "am-pale", 7.0),
  sawdust("Golden Beach", "blonde-ale", 4.5), sawdust("Lone Pine IPA", "west-coast-ipa", 6.5), sawdust("Little Norway", "german-pils", 4.3),
  sawdust("Skinny Dipping Stout", "dry-stout", 4.5),
  lakeOfBays("Crosswind Pale Ale", "am-pale", 5.0), lakeOfBays("Mocha Porter", "am-porter", 5.0),
  monkeys("Juicy Ass IPA", "west-coast-ipa", 6.5), monkeys("Hoptical Illusion", "am-pale", 5.0), monkeys("Smashbomb Atomic IPA", "west-coast-ipa", 6.0),
  monkeys("Netherworld Cascadian Dark Ale", "black-ipa", 6.0), monkeys("Super Collider Double IPA", "double-ipa", 8.5),
  monkeys("Chocolate Manifesto Triple Chocolate Stout", "pastry-stout", 10.0),
  sideLaunch("Wheat", "hefeweizen", 5.3), sideLaunch("Mountain Lager", "am-lager", 4.8), sideLaunch("Dark Lager", "dunkel", 5.3),
  sideLaunch("Pale Ale", "am-pale", 5.0),
  hockley("Dark", "brown-ale", 5.0), kilannan("Kilannan Altbier", "altbier", 5.0),
  // Ottawa and the east
  beaus("Lug Tread", "kolsch", 5.2), beaus("Tom Green Milk Stout", "milk-stout", 5.0), beaus("Night Märzen", "marzen", 5.6),
  beaus("Full Time IPA", "west-coast-ipa", 6.0),
  btp("Pink Fuzz", "am-wheat", 5.0),
  kichesippi("Natural Blonde", "blonde-ale", 4.8), kichesippi("1855", "amber-ale", 5.0), kichesippi("Heller Highwater", "helles", 5.0),
  dominion("Earl Grey Marmalade Saison", "saison", 6.0), tooth("Vim & Vigor", "german-pils", 5.0),
  whitewater("Farmers Daughter Blonde", "blonde-ale", 5.0),
  mackinnon("Crosscut Canadian Ale", "cream-ale", 5.0), mackinnon("8 Man English Pale Ale", "eng-bitter", 5.0),
  kingston("Dragon's Breath Real Ale", "eng-bitter", 4.5),
  churchKey("Holy Smoke Scotch Ale", "wee-heavy", 7.0), churchKey("Northumberland Ale", "brown-ale", 5.0),
];

// ---------- The rest of Canada ----------
const unibroue = maker("Unibroue", "CA-QC", "Chambly");
const dieuDuCiel = maker("Dieu du Ciel!", "CA-QC", "Montreal", A);
const stAmbroise = maker("St-Ambroise", "CA-QC", "Montreal");
const boreale = maker("Boréale", "CA-QC", "Blainville", A);
const bigRock = maker("Big Rock", "CA-AB", "Calgary");
const phillips = maker("Phillips", "CA-BC", "Victoria", A);
const driftwood = maker("Driftwood", "CA-BC", "Victoria", A);
const granville = maker("Granville Island", "CA-BC", "Vancouver");
const p49 = maker("Parallel 49", "CA-BC", "Vancouver", A);
const okSpring = maker("Okanagan Spring", "CA-BC", "Vernon");
const moosehead = maker("Moosehead", "CA-NB", "Saint John");
const keiths = maker("Alexander Keith's", "CA-NS", "Halifax");
const garrison = maker("Garrison", "CA-NS", "Halifax", A);
const propeller = maker("Propeller", "CA-NS", "Halifax", A);
const quidi = maker("Quidi Vidi", "CA-NL", "St. John's");
const yukon = maker("Yukon Brewing", "CA-YT", "Whitehorse", A);

const CANADA = [
  unibroue("Blanche de Chambly", "witbier", 5.0), unibroue("La Fin du Monde", "tripel", 9.0), unibroue("Maudite", "belgian-dark", 8.0),
  unibroue("Trois Pistoles", "belgian-dark", 9.0), unibroue("Don de Dieu", "belgian-golden", 9.0), unibroue("17 Grande Réserve", "quad", 10.0, A),
  unibroue("Éphémère Pomme", "fruit-beer", 5.5), unibroue("Raftman", "rauchbier", 5.5),
  dieuDuCiel("Péché Mortel", "imperial-stout", 9.5), dieuDuCiel("Rosée d'Hibiscus", "witbier", 5.9),
  stAmbroise("Oatmeal Stout", "oatmeal-stout", 5.0), stAmbroise("Pale Ale", "eng-bitter", 5.0), stAmbroise("Apricot Wheat Ale", "fruit-beer", 5.0),
  boreale("Rousse", "amber-ale", 5.0), boreale("Blanche", "witbier", 4.2),
  bigRock("Traditional Ale", "brown-ale", 5.0), bigRock("Grasshopper Wheat Ale", "am-wheat", 5.0), bigRock("Alberta Genuine Draft", "am-lager", 5.0, A),
  phillips("Blue Buck", "am-pale", 5.0), phillips("Hop Circle IPA", "west-coast-ipa", 6.5),
  driftwood("Fat Tug IPA", "west-coast-ipa", 7.0), driftwood("White Bark", "witbier", 5.0),
  granville("English Bay Pale Ale", "eng-bitter", 5.0), granville("Island Lager", "am-lager", 5.0), granville("False Creek Raspberry Ale", "fruit-beer", 5.0, A),
  p49("Tricycle Grapefruit Radler", "radler", 3.5), p49("Trash Panda Hazy IPA", "hazy-ipa", 6.5),
  okSpring("1516 Bavarian Lager", "helles", 5.0),
  d("Kokanee", "", "am-lager", 5.0, "CA-BC", { town: "Creston" }), d("Lucky Lager", "", "am-lager", 5.0, "CA-BC"),
  moosehead("Lager", "am-lager", 5.0), moosehead("Light", "am-light", 4.0), moosehead("Cracked Canoe", "am-light", 3.5, A),
  d("Alpine", "Lager", "am-lager", 5.0, "CA-NB"),
  keiths("India Pale Ale", "eng-ipa", 5.0), keiths("Red Amber Ale", "amber-ale", 5.0),
  garrison("Irish Red", "irish-red", 5.0),
  propeller("ESB", "esb", 5.0), propeller("London Porter", "eng-porter", 5.0),
  quidi("Iceberg", "am-lager", 5.0), quidi("1892 Traditional Ale", "amber-ale", 5.0),
  yukon("Yukon Gold", "am-pale", 5.0), yukon("Lead Dog Ale", "old-ale", 7.0),
  d("Fort Garry", "Dark", "dunkel", 5.0, "CA-MB", A), d("Great Western", "Original 16 Canadian Pale Ale", "am-pale", 5.0, "CA-SK", A),
];

// ---------- Imports ----------
const IMPORTS = [
  // USA and Mexico
  d("Budweiser", "", "am-lager", 5.0, "US"), d("Bud Light", "", "am-light", 4.0, "US"),
  d("Bud Light", "", "am-light", 4.0, "US", { variant: "Lime", approx: true }),
  d("Coors Light", "", "am-light", 4.0, "US"), d("Coors", "Banquet", "am-lager", 5.0, "US"),
  d("Miller Lite", "", "am-light", 4.2, "US"), d("Miller", "Genuine Draft", "am-lager", 5.0, "US", A), d("Michelob Ultra", "", "am-light", 4.0, "US"),
  d("Busch", "Light", "am-light", 4.0, "US", A), d("Pabst Blue Ribbon", "", "am-lager", 5.0, "US"), d("Old Milwaukee", "", "am-lager", 5.0, "US", A),
  d("Blue Moon", "Belgian White", "witbier", 5.4, "US"), d("Shock Top", "Belgian White", "witbier", 5.2, "US"),
  d("Goose Island", "IPA", "eng-ipa", 5.9, "US"), d("Sierra Nevada", "Pale Ale", "am-pale", 5.6, "US"), d("Sierra Nevada", "Torpedo Extra IPA", "west-coast-ipa", 7.2, "US"),
  d("Samuel Adams", "Boston Lager", "vienna", 5.0, "US"), d("Brooklyn", "Lager", "vienna", 5.2, "US"), d("Lagunitas", "IPA", "west-coast-ipa", 6.2, "US"),
  d("Stone", "IPA", "west-coast-ipa", 6.9, "US"), d("Founders", "All Day IPA", "session-ipa", 4.7, "US"), d("Founders", "KBS", "imperial-stout", 12.0, "US", A),
  d("Dogfish Head", "60 Minute IPA", "west-coast-ipa", 6.0, "US"), d("Bell's", "Two Hearted Ale", "west-coast-ipa", 7.0, "US"),
  d("Yuengling", "Traditional Lager", "am-lager", 4.5, "US"), d("Rolling Rock", "", "am-lager", 4.5, "US", A),
  d("Corona", "Extra", "mex-lager", 4.5, "MX"), d("Corona", "Light", "mex-lager", 3.7, "MX", A),
  d("Modelo", "Especial", "mex-lager", 4.5, "MX", A), d("Modelo", "Negra", "vienna", 5.4, "MX"),
  d("Pacifico", "", "mex-lager", 4.5, "MX"), d("Sol", "", "mex-lager", 4.5, "MX"), d("Dos Equis", "Lager Especial", "mex-lager", 4.2, "MX", A),
  d("Tecate", "", "mex-lager", 4.5, "MX", A), d("Victoria", "", "vienna", 4.0, "MX", A),
  // Europe
  d("Heineken", "", "intl-lager", 5.0, "NL"), d("Heineken", "Silver", "intl-lager", 4.0, "NL", A), d("Amstel", "Light", "am-light", 3.5, "NL"),
  d("Grolsch", "Premium Lager", "intl-lager", 5.0, "NL"), d("Stella Artois", "", "intl-lager", 5.0, "BE"),
  d("Hoegaarden", "", "witbier", 4.9, "BE"), d("Leffe", "Blonde", "belgian-blonde", 6.6, "BE"), d("Leffe", "Brune", "dubbel", 6.5, "BE"),
  d("Duvel", "", "belgian-golden", 8.5, "BE"), d("Chimay", "Blue", "belgian-dark", 9.0, "BE"), d("Chimay", "Red", "dubbel", 7.0, "BE"),
  d("Westmalle", "Tripel", "tripel", 9.5, "BE"), d("Delirium", "Tremens", "belgian-golden", 8.5, "BE"), d("Rochefort", "10", "quad", 11.3, "BE"),
  d("St. Bernardus", "Abt 12", "quad", 10.0, "BE"), d("Lindemans", "Framboise", "fruit-sour", 2.5, "BE"), d("Lindemans", "Kriek", "kriek", 3.5, "BE"),
  d("Rodenbach", "Grand Cru", "flanders-red", 6.0, "BE"), d("Kwak", "", "belgian-dark", 8.4, "BE"),
  d("Beck's", "", "german-pils", 5.0, "DE"), d("Warsteiner", "Premium Verum", "german-pils", 4.8, "DE"), d("Bitburger", "Premium Pils", "german-pils", 4.8, "DE"),
  d("Krombacher", "Pils", "german-pils", 4.8, "DE"), d("Erdinger", "Weissbier", "hefeweizen", 5.3, "DE"), d("Paulaner", "Hefe-Weissbier", "hefeweizen", 5.5, "DE"),
  d("Paulaner", "Oktoberfest Bier", "marzen", 6.0, "DE"), d("Weihenstephaner", "Hefeweissbier", "hefeweizen", 5.4, "DE"),
  d("Weihenstephaner", "Vitus", "weizenbock", 7.7, "DE"), d("Hacker-Pschorr", "Oktoberfest Märzen", "marzen", 5.8, "DE"),
  d("Spaten", "Münchner Hell", "helles", 5.2, "DE"), d("Löwenbräu", "Original", "helles", 5.2, "DE"), d("Augustiner", "Lagerbier Hell", "helles", 5.2, "DE"),
  d("Ayinger", "Celebrator", "doppelbock", 6.7, "DE"), d("Köstritzer", "Schwarzbier", "schwarzbier", 4.8, "DE"),
  d("Aecht Schlenkerla", "Rauchbier Märzen", "rauchbier", 5.1, "DE"), d("Früh", "Kölsch", "kolsch", 4.8, "DE"),
  d("Pilsner Urquell", "", "czech-pils", 4.4, "CZ"), d("Budweiser Budvar", "Original", "czech-pils", 5.0, "CZ"), d("Staropramen", "", "czech-pils", 5.0, "CZ"),
  d("Kozel", "Dark", "dunkel", 3.8, "CZ"),
  d("Guinness", "Draught", "dry-stout", 4.2, "IE"), d("Guinness", "Extra Stout", "dry-stout", 5.6, "IE", A), d("Guinness", "Foreign Extra Stout", "dry-stout", 7.5, "IE"),
  d("Smithwick's", "Red Ale", "irish-red", 4.5, "IE"), d("Kilkenny", "Irish Cream Ale", "irish-red", 4.3, "IE"), d("Harp", "Lager", "intl-lager", 4.5, "IE"),
  d("Murphy's", "Irish Stout", "dry-stout", 4.0, "IE"), d("Beamish", "Irish Stout", "dry-stout", 4.1, "IE"),
  d("Newcastle", "Brown Ale", "brown-ale", 4.7, "GB-ENG"), d("Fuller's", "London Pride", "eng-bitter", 4.7, "GB-ENG"), d("Fuller's", "ESB", "esb", 5.9, "GB-ENG"),
  d("Boddingtons", "Pub Ale", "eng-bitter", 4.7, "GB-ENG"), d("Old Speckled Hen", "", "eng-bitter", 5.0, "GB-ENG", A),
  d("Samuel Smith's", "Oatmeal Stout", "oatmeal-stout", 5.0, "GB-ENG"), d("Samuel Smith's", "Taddy Porter", "eng-porter", 5.0, "GB-ENG"),
  d("Belhaven", "Scottish Ale", "scottish", 3.9, "GB-SCT", A), d("BrewDog", "Punk IPA", "west-coast-ipa", 5.4, "GB-SCT"),
  d("Innis & Gunn", "Original", "barrel-aged-beer", 6.6, "GB-SCT"), d("Tennent's", "Lager", "intl-lager", 4.0, "GB-SCT", A),
  d("Peroni", "Nastro Azzurro", "italian-pils", 5.1, "IT"), d("Moretti", "L'Autentica", "intl-lager", 4.6, "IT"), d("Menabrea", "Bionda", "intl-lager", 4.8, "IT"),
  d("Kronenbourg", "1664 Blanc", "witbier", 5.0, "FR"), d("Kronenbourg", "1664", "intl-lager", 5.0, "FR", A),
  d("Estrella Damm", "", "intl-lager", 4.6, "ES"), d("Mahou", "Cinco Estrellas", "intl-lager", 5.5, "ES"), d("Alhambra", "Reserva 1925", "intl-lager", 6.4, "ES"),
  d("Super Bock", "", "intl-lager", 5.2, "PT"), d("Sagres", "", "intl-lager", 5.0, "PT", A), d("Mythos", "", "intl-lager", 4.7, "GR"),
  d("Carlsberg", "", "intl-lager", 5.0, "DK"), d("Tuborg", "Green", "intl-lager", 4.6, "DK", A),
  d("Tyskie", "", "intl-lager", 5.2, "PL", A), d("Żywiec", "", "intl-lager", 5.6, "PL"), d("Okocim", "", "intl-lager", 5.6, "PL", A),
  d("Obolon", "Premium", "intl-lager", 5.0, "UA", A), d("Efes", "Pilsener", "intl-lager", 5.0, "TR"), d("Stiegl", "Goldbräu", "marzen", 4.9, "AT"),
  d("Steinlager", "Classic", "intl-lager", 5.0, "NZ"), d("Foster's", "Lager", "intl-lager", 5.0, "AU", A), d("Victoria Bitter", "", "intl-lager", 4.9, "AU", A),
  // Asia, the Caribbean and Africa
  d("Asahi", "Super Dry", "rice-lager", 5.0, "JP"), d("Sapporo", "Premium", "rice-lager", 5.0, "JP"), d("Kirin", "Ichiban", "rice-lager", 5.0, "JP"),
  d("Tsingtao", "", "intl-lager", 4.7, "CN"), d("Singha", "", "intl-lager", 5.0, "TH"), d("Chang", "Classic", "intl-lager", 5.0, "TH", A),
  d("Tiger", "", "intl-lager", 5.0, "SG"), d("San Miguel", "Pale Pilsen", "intl-lager", 5.0, "PH"), d("Kingfisher", "Premium", "intl-lager", 4.8, "IN"),
  d("Hite", "Extra Cold", "rice-lager", 4.3, "KR", A), d("Cass", "Fresh", "rice-lager", 4.5, "KR", A),
  d("Red Stripe", "", "intl-lager", 4.7, "JM"), d("Carib", "", "intl-lager", 5.2, "TT", A), d("Presidente", "", "intl-lager", 5.0, "DO"),
  d("Banks", "", "intl-lager", 4.7, "BB", A), d("Dragon Stout", "", "milk-stout", 7.5, "JM", A), d("Castle", "Lager", "intl-lager", 5.0, "ZA", A),
];

export const BEER = [...ONTARIO_BIG, ...ONTARIO_CRAFT, ...CANADA, ...IMPORTS];
