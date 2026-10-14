/* The built-in drink catalog: brands and products, with flavours as their own entries. Ontario first, then the
   rest of Canada, then imports. Each category lives in its own file; this one joins them.
   - brand + name + variant make the title ("Crown Royal" + "" + "Peach" = "Crown Royal Peach")
   - style:  a style id from styles.js
   - origin: a key in ORIGINS (left out for global brands made in many places); town: where in it, when useful
   - abv:    % alcohol as sold in Canada; `approx: true` when it varies by market or batch, or isn't confirmed
   Drinks the group adds go into Firestore, not here. */
import { BEER } from "./beer.js";
import { WHISKY } from "./whisky.js";
import { SPIRITS } from "./spirits.js";
import { WINE } from "./wine.js";
import { MORE } from "./more.js";
import { NA } from "./na.js";

export const ORIGINS = {
  "CA": "Canada", "CA-ON": "Ontario", "CA-QC": "Quebec", "CA-BC": "British Columbia", "CA-AB": "Alberta",
  "CA-SK": "Saskatchewan", "CA-MB": "Manitoba", "CA-NS": "Nova Scotia", "CA-NB": "New Brunswick",
  "CA-PE": "Prince Edward Island", "CA-NL": "Newfoundland and Labrador", "CA-YT": "Yukon",
  "US": "USA", "MX": "Mexico", "PR": "Puerto Rico", "TT": "Trinidad & Tobago", "JM": "Jamaica", "BB": "Barbados",
  "GY": "Guyana", "CU": "Cuba", "DO": "Dominican Republic", "VE": "Venezuela", "NI": "Nicaragua", "GT": "Guatemala",
  "PA": "Panama", "MQ": "Martinique", "HT": "Haiti", "BS": "Bahamas", "VI": "US Virgin Islands", "BM": "Bermuda",
  "BR": "Brazil", "PE": "Peru", "CL": "Chile", "AR": "Argentina", "UY": "Uruguay",
  "GB-SCT": "Scotland", "GB-ENG": "England", "GB-WLS": "Wales", "GB-NIR": "Northern Ireland", "IE": "Ireland",
  "FR": "France", "IT": "Italy", "DE": "Germany", "NL": "Netherlands", "BE": "Belgium", "CZ": "Czechia",
  "PL": "Poland", "AT": "Austria", "CH": "Switzerland", "ES": "Spain", "PT": "Portugal", "GR": "Greece",
  "HU": "Hungary", "DK": "Denmark", "SE": "Sweden", "NO": "Norway", "FI": "Finland", "IS": "Iceland",
  "UA": "Ukraine", "LV": "Latvia", "RU": "Russia", "LT": "Lithuania", "TR": "Türkiye", "LB": "Lebanon", "IL": "Israel",
  "NZ": "New Zealand", "AU": "Australia", "ZA": "South Africa",
  "JP": "Japan", "KR": "South Korea", "CN": "China", "TW": "Taiwan", "IN": "India", "TH": "Thailand",
  "PH": "Philippines", "VN": "Vietnam", "SG": "Singapore",
};

export const DRINKS = [...BEER, ...WHISKY, ...SPIRITS, ...WINE, ...MORE, ...NA];
