/* Whisky: Canadian first (Ontario's distilleries leading), then Scotch by region, American, Irish, Japanese and the rest. */
import { d, maker, flavours, APPROX } from "./make.js";

const A = APPROX;

// ---------- Canadian ----------
const crown = maker("Crown Royal", "CA-MB", "Gimli");
const cc = maker("Canadian Club", "CA-ON", "Windsor");
const wisers = maker("J.P. Wiser's", "CA-ON", "Windsor");
const forty = maker("Forty Creek", "CA-ON", "Grimsby");
const gibsons = maker("Gibson's Finest", "CA-ON", "Windsor");
const alberta = maker("Alberta Premium", "CA-AB", "Calgary");
const gretzky = maker("Wayne Gretzky", "CA-ON", "Niagara-on-the-Lake", A);
const stillWaters = maker("Still Waters", "CA-ON", "Concord", A);

const CANADIAN = [
  crown("Deluxe", "cdn-blended", 40), crown("Black", "cdn-blended", 45), crown("Reserve", "cdn-blended", 40), crown("XO", "cdn-blended", 40),
  crown("Northern Harvest Rye", "cdn-rye", 45), crown("Noble Collection", "cdn-blended", 45, A),
  ...flavours(crown, "", "cdn-flavoured", 35, ["Peach", "Regal Apple", "Vanilla", "Salted Caramel", "Blackberry"], A),
  cc("1858 Original", "cdn-blended", 40), cc("Classic 12 Year", "cdn-blended", 40), cc("100% Rye", "cdn-rye", 40), cc("Reserve 9 Year", "cdn-blended", 40, A),
  wisers("Deluxe", "cdn-blended", 40), wisers("Special Blend", "cdn-blended", 40), wisers("18 Year", "cdn-blended", 40),
  wisers("Triple Barrel Rye", "cdn-rye", 40, A), wisers("Legacy", "cdn-rye", 45, A), wisers("Red Letter", "cdn-blended", 45, A),
  d("Lot No. 40", "Canadian Rye", "cdn-rye", 43, "CA-ON", { town: "Windsor" }),
  d("Lot No. 40", "Cask Strength", "cdn-rye", 55, "CA-ON", { town: "Windsor", ...A }),
  d("Pike Creek", "10 Year", "cdn-blended", 42, "CA-ON", { town: "Windsor", ...A }),
  d("Gooderham & Worts", "Four Grain", "cdn-blended", 44.4, "CA-ON", { town: "Windsor" }),
  gibsons("Sterling", "cdn-blended", 40), gibsons("Rare 12 Year", "cdn-blended", 40), gibsons("18 Year", "cdn-blended", 40, A),
  forty("Barrel Select", "cdn-blended", 40), forty("Copper Bowl", "cdn-blended", 40), forty("Double Barrel Reserve", "cdn-blended", 40),
  forty("Confederation Oak", "cdn-blended", 40),
  d("Collingwood", "", "cdn-blended", 40, "CA-ON", { town: "Collingwood" }),
  d("Canadian Mist", "", "cdn-blended", 40, "CA-ON", { town: "Collingwood" }),
  gretzky("No. 99 Red Cask", "cdn-blended", 40), gretzky("No. 99 Ice Cask", "cdn-blended", 40),
  d("Dillon's", "Rye Whisky", "cdn-rye", 40, "CA-ON", { town: "Beamsville", ...A }),
  stillWaters("Stalk & Barrel Single Malt", "cdn-single-malt", 46), stillWaters("Stalk & Barrel 100% Rye", "cdn-rye", 46),
  alberta("", "cdn-rye", 40), alberta("Dark Horse", "cdn-rye", 45), alberta("Cask Strength Rye", "cdn-rye", 65, A),
  d("Black Velvet", "", "cdn-blended", 40, "CA-AB", { town: "Lethbridge" }),
  d("Black Velvet", "", "cdn-flavoured", 35, "CA-AB", { town: "Lethbridge", variant: "Toasted Caramel", ...A }),
  d("Seagram's", "VO", "cdn-blended", 40, "CA"), d("Seagram's", "83", "cdn-blended", 40, "CA"),
  d("Royal Reserve", "", "cdn-blended", 40, "CA", A),
  d("Shelter Point", "Single Malt", "cdn-single-malt", 46, "CA-BC", { town: "Campbell River", ...A }),
  d("Glen Breton", "Rare 10 Year", "cdn-single-malt", 43, "CA-NS", { town: "Glenville" }),
  d("Bearface", "Triple Oak", "cdn-blended", 42.5, "CA-BC", A),
];

// ---------- Scotch ----------
const sc = (brand, region, list) => list.map(([name, abv, extra = {}]) => d(brand, name, region, abv, "GB-SCT", extra));

const SCOTCH = [
  // Islay
  ...sc("Lagavulin", "islay", [["16 Year", 43], ["8 Year", 48]]),
  ...sc("Laphroaig", "islay", [["10 Year", 40], ["Quarter Cask", 48]]),
  ...sc("Ardbeg", "islay", [["10 Year", 46], ["Uigeadail", 54.2], ["Corryvreckan", 57.1], ["An Oa", 46.6]]),
  ...sc("Bowmore", "islay", [["12 Year", 40], ["15 Year", 43]]),
  ...sc("Bruichladdich", "islay", [["The Classic Laddie", 50]]),
  ...sc("Port Charlotte", "islay", [["10 Year", 50]]),
  ...sc("Bunnahabhain", "islay", [["12 Year", 46.3]]),
  ...sc("Caol Ila", "islay", [["12 Year", 43]]),
  ...sc("Kilchoman", "islay", [["Machir Bay", 46]]),
  // Speyside
  ...sc("Glenfiddich", "speyside", [["12 Year", 40], ["14 Year Bourbon Barrel Reserve", 43], ["15 Year", 40], ["18 Year", 40], ["21 Year", 40]]),
  ...sc("The Glenlivet", "speyside", [["12 Year", 40], ["Founder's Reserve", 40], ["14 Year Cognac Cask", 40], ["15 Year French Oak", 40], ["18 Year", 40]]),
  ...sc("The Macallan", "speyside", [["12 Year Double Cask", 40], ["12 Year Sherry Oak", 40], ["15 Year Double Cask", 43], ["18 Year Sherry Oak", 43]]),
  ...sc("The Balvenie", "speyside", [["DoubleWood 12 Year", 40], ["Caribbean Cask 14 Year", 43], ["PortWood 21 Year", 40]]),
  ...sc("Aberlour", "speyside", [["12 Year Double Cask", 40], ["A'bunadh", 60, A]]),
  ...sc("Glenfarclas", "speyside", [["12 Year", 43], ["15 Year", 46], ["105", 60]]),
  ...sc("The Glenrothes", "speyside", [["12 Year", 40]]),
  ...sc("Cragganmore", "speyside", [["12 Year", 40]]),
  ...sc("Craigellachie", "speyside", [["13 Year", 46]]),
  ...sc("Glen Grant", "speyside", [["10 Year", 40]]),
  ...sc("Tamdhu", "speyside", [["12 Year", 43]]),
  ...sc("BenRiach", "speyside", [["The Original Ten", 43]]),
  ...sc("Mortlach", "speyside", [["12 Year", 43.4]]),
  ...sc("Speyburn", "speyside", [["10 Year", 40]]),
  ...sc("Cardhu", "speyside", [["12 Year", 40]]),
  // Highland
  ...sc("Glenmorangie", "highland", [["The Original 10 Year", 40], ["The Lasanta", 43], ["The Quinta Ruban", 46], ["The Nectar d'Or", 46], ["Signet", 46]]),
  ...sc("The Dalmore", "highland", [["12 Year", 40], ["15 Year", 40], ["Cigar Malt", 44]]),
  ...sc("Oban", "highland", [["14 Year", 43]]),
  ...sc("Glengoyne", "highland", [["12 Year", 43]]),
  ...sc("Dalwhinnie", "highland", [["15 Year", 43]]),
  ...sc("Clynelish", "highland", [["14 Year", 46]]),
  ...sc("Old Pulteney", "highland", [["12 Year", 40]]),
  ...sc("Aberfeldy", "highland", [["12 Year", 40]]),
  ...sc("Deanston", "highland", [["12 Year", 46.3]]),
  ...sc("GlenDronach", "highland", [["12 Year", 43], ["15 Year Revival", 46], ["18 Year Allardice", 46]]),
  ...sc("Ardmore", "highland", [["Legacy", 40]]),
  ...sc("Tomatin", "highland", [["12 Year", 43]]),
  ...sc("Loch Lomond", "highland", [["12 Year", 46]]),
  ...sc("Edradour", "highland", [["10 Year", 40]]),
  ...sc("AnCnoc", "highland", [["12 Year", 40]]),
  ...sc("Royal Lochnagar", "highland", [["12 Year", 40]]),
  // Islands
  ...sc("Highland Park", "islands", [["12 Year Viking Honour", 40], ["18 Year Viking Pride", 43]]),
  ...sc("Talisker", "islands", [["10 Year", 45.8], ["Storm", 45.8], ["Skye", 45.8]]),
  ...sc("Jura", "islands", [["10 Year", 40]]),
  ...sc("Scapa", "islands", [["Skiren", 40]]),
  ...sc("Arran", "islands", [["10 Year", 46]]),
  ...sc("Tobermory", "islands", [["12 Year", 46.3]]),
  ...sc("Ledaig", "islands", [["10 Year", 46.3]]),
  // Lowland and Campbeltown
  ...sc("Auchentoshan", "lowland", [["12 Year", 40], ["Three Wood", 43]]),
  ...sc("Glenkinchie", "lowland", [["12 Year", 43]]),
  ...sc("Springbank", "campbeltown", [["10 Year", 46]]),
  ...sc("Glen Scotia", "campbeltown", [["Double Cask", 46]]),
  ...sc("Kilkerran", "campbeltown", [["12 Year", 46]]),
  // Blends
  ...sc("Johnnie Walker", "blended-scotch", [["Red Label", 40], ["Black Label", 40], ["Double Black", 40], ["Gold Label Reserve", 40], ["18 Year", 40], ["Blue Label", 40]]),
  ...sc("Johnnie Walker", "blended-malt", [["Green Label", 43]]),
  ...sc("Chivas Regal", "blended-scotch", [["12 Year", 40], ["18 Year", 40]]),
  ...sc("Dewar's", "blended-scotch", [["White Label", 40], ["12 Year", 40]]),
  ...sc("The Famous Grouse", "blended-scotch", [["", 40]]),
  ...sc("Ballantine's", "blended-scotch", [["Finest", 40]]),
  ...sc("J&B", "blended-scotch", [["Rare", 40]]),
  ...sc("Cutty Sark", "blended-scotch", [["", 40]]),
  ...sc("Grant's", "blended-scotch", [["Triple Wood", 40]]),
  ...sc("Teacher's", "blended-scotch", [["Highland Cream", 40]]),
  ...sc("Buchanan's", "blended-scotch", [["12 Year", 40]]),
  ...sc("Bell's", "blended-scotch", [["Original", 40]]),
  ...sc("Whyte & Mackay", "blended-scotch", [["", 40]]),
  ...sc("White Horse", "blended-scotch", [["", 40]]),
  ...sc("Monkey Shoulder", "blended-malt", [["", 40]]),
  ...sc("Compass Box", "blended-malt", [["The Peat Monster", 46]]),
  ...sc("Haig Club", "single-grain", [["", 40]]),
];

// ---------- American ----------
const us = (brand, style, list) => list.map(([name, abv, extra = {}]) => d(brand, name, style, abv, "US", extra));
const jd = maker("Jack Daniel's", "US", "Lynchburg, Tennessee");

const AMERICAN = [
  ...us("Buffalo Trace", "bourbon", [["Kentucky Straight Bourbon", 45]]),
  ...us("Eagle Rare", "bourbon", [["10 Year", 45]]),
  ...us("Blanton's", "bourbon", [["Original Single Barrel", 46.5]]),
  ...us("Woodford Reserve", "bourbon", [["Distiller's Select", 45.2], ["Double Oaked", 45.2]]),
  ...us("Woodford Reserve", "am-rye", [["Rye", 45.2]]),
  ...us("Maker's Mark", "wheated-bourbon", [["", 45], ["46", 47]]),
  ...us("Bulleit", "bourbon", [["Bourbon", 45], ["10 Year", 45.6]]),
  ...us("Bulleit", "am-rye", [["Rye", 45]]),
  ...us("Wild Turkey", "bourbon", [["101", 50.5], ["81", 40.5]]),
  ...us("Wild Turkey", "am-rye", [["Rye", 40.5]]),
  ...us("Four Roses", "bourbon", [["Bourbon", 40], ["Small Batch", 45], ["Single Barrel", 50]]),
  ...us("Knob Creek", "bourbon", [["9 Year", 50]]),
  ...us("Knob Creek", "am-rye", [["Rye", 50]]),
  ...us("Basil Hayden", "bourbon", [["", 40]]),
  ...us("Jim Beam", "bourbon", [["White Label", 40], ["Black", 43], ["Devil's Cut", 45]]),
  ...us("Jim Beam", "am-rye", [["Rye", 40]]),
  ...us("Jim Beam", "am-flavoured", [["Honey", 35, A], ["Apple", 35, A], ["Vanilla", 35, A], ["Red Stag Black Cherry", 35, A]]),
  ...us("Evan Williams", "bourbon", [["Black Label", 43]]),
  ...us("Elijah Craig", "bourbon", [["Small Batch", 47]]),
  ...us("Old Forester", "bourbon", [["86 Proof", 43], ["1920 Prohibition Style", 57.5]]),
  ...us("Larceny", "wheated-bourbon", [["Small Batch", 46]]),
  ...us("Weller", "wheated-bourbon", [["Special Reserve", 45]]),
  ...us("Angel's Envy", "bourbon", [["Port Finish", 43.3]]),
  ...us("Booker's", "bourbon", [["", 63, A]]),
  ...us("Baker's", "bourbon", [["7 Year", 53.5]]),
  ...us("Russell's Reserve", "bourbon", [["10 Year", 45]]),
  ...us("Michter's", "bourbon", [["US*1 Small Batch Bourbon", 45.7]]),
  ...us("Michter's", "am-rye", [["US*1 Single Barrel Rye", 42.4]]),
  ...us("1792", "bourbon", [["Small Batch", 46.85]]),
  ...us("Old Grand-Dad", "bourbon", [["", 43]]),
  ...us("Jefferson's", "bourbon", [["Very Small Batch", 41.15]]),
  jd("Old No. 7", "tennessee", 40), jd("Gentleman Jack", "tennessee", 40), jd("Single Barrel Select", "tennessee", 45),
  jd("Tennessee Honey", "am-flavoured", 35), jd("Tennessee Fire", "am-flavoured", 35), jd("Tennessee Apple", "am-flavoured", 35),
  ...us("George Dickel", "tennessee", [["No. 8", 40]]),
  ...us("Uncle Nearest", "tennessee", [["1856 Premium Whiskey", 50]]),
  ...us("Rittenhouse", "am-rye", [["Bottled-in-Bond Rye", 50]]),
  ...us("Sazerac", "am-rye", [["Rye", 45]]),
  ...us("WhistlePig", "am-rye", [["10 Year", 50]]),
  ...us("Pikesville", "am-rye", [["Rye", 55]]),
  ...us("Old Overholt", "am-rye", [["Rye", 43]]),
  ...us("High West", "am-rye", [["Double Rye!", 46]]),
  ...us("Skrewball", "am-flavoured", [["Peanut Butter Whiskey", 35]]),
];

// ---------- Irish, Japanese and the world ----------
const ie = (brand, style, list) => list.map(([name, abv, extra = {}]) => d(brand, name, style, abv, "IE", extra));
const jp = (brand, style, list) => list.map(([name, abv, extra = {}]) => d(brand, name, style, abv, "JP", extra));

const WORLD = [
  ...ie("Jameson", "irish-blended", [["Irish Whiskey", 40], ["Black Barrel", 40], ["Caskmates Stout Edition", 40]]),
  ...ie("Bushmills", "irish-blended", [["Original", 40], ["Black Bush", 40]]),
  ...ie("Bushmills", "irish-single-malt", [["10 Year", 40], ["16 Year", 40]]),
  ...ie("Tullamore D.E.W.", "irish-blended", [["", 40]]),
  ...ie("Redbreast", "pot-still", [["12 Year", 40]]),
  ...ie("Green Spot", "pot-still", [["", 40]]),
  ...ie("Yellow Spot", "pot-still", [["12 Year", 46]]),
  ...ie("Powers", "pot-still", [["Gold Label", 43.2]]),
  ...ie("Teeling", "irish-blended", [["Small Batch", 46]]),
  ...ie("Teeling", "irish-grain", [["Single Grain", 46]]),
  ...ie("Writers' Tears", "irish-blended", [["Copper Pot", 40]]),
  ...ie("Kilbeggan", "irish-blended", [["", 40]]),
  ...ie("Connemara", "irish-single-malt", [["Peated", 40]]),
  ...ie("Proper No. Twelve", "irish-blended", [["", 40]]),
  ...ie("Slane", "irish-blended", [["", 40]]),
  ...ie("Roe & Co", "irish-blended", [["", 45]]),
  ...ie("Midleton", "irish-blended", [["Very Rare", 40]]),
  ...jp("Suntory", "jp-blended", [["Toki", 43]]),
  ...jp("Hibiki", "jp-blended", [["Japanese Harmony", 43]]),
  ...jp("Yamazaki", "jp-single-malt", [["12 Year", 43]]),
  ...jp("Hakushu", "jp-single-malt", [["12 Year", 43]]),
  ...jp("Nikka", "jp-blended", [["From the Barrel", 51.4], ["Days", 40]]),
  ...jp("Nikka", "jp-grain", [["Coffey Grain", 45]]),
  ...jp("Nikka", "jp-single-malt", [["Yoichi Single Malt", 45], ["Miyagikyo Single Malt", 45]]),
  ...jp("The Chita", "jp-grain", [["", 43]]),
  d("Amrut", "Fusion", "indian", 50, "IN"), d("Paul John", "Brilliance", "indian", 46, "IN"),
  d("Kavalan", "Classic Single Malt", "taiwanese", 40, "TW"),
  d("Penderyn", "Legend", "welsh-english", 41, "GB-WLS"), d("Cotswolds", "Single Malt", "welsh-english", 46, "GB-ENG"),
  d("Starward", "Two-Fold", "australian", 40, "AU"),
];

export const WHISKY = [...CANADIAN, ...SCOTCH, ...AMERICAN, ...WORLD];
