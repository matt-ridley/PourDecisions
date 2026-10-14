/* What cocktail recipes are made of. Recipes point at these ids instead of plain text, so the app can tell which
   bottles count as an ingredient (any rye counts as "Rye") and, later, what you can make from your bar.
   - kind:    spirit, liqueur, wine, beer, mixer, juice, syrup, bitters, fresh, dairy or pantry
   - for bottles, what counts as it (any of these): cats (whole categories), families, styles, drinks (drink ids);
     `not` leaves styles out again. Members' own drinks will be able to say which ingredient they count as.
   - mixers, juices, fruit and the rest aren't drinks in the list: they're ingredients only (kept in the bar later).
   - proper: a name that keeps its capital in the middle of a line ("Rye or Canadian whisky")
   - pantry: assumed to be on hand (water, salt, sugar), so "what can I make" never asks for it.
   Every ingredient here is used by at least one recipe (tests check). */

const i = (id, name, kind, extra = {}) => ({ id, name, kind, ...extra });

export const INGREDIENTS = [
  // Whisky. Canadians call Canadian whisky "rye", so Canadian blended counts as rye.
  i("whisky", "Whisky", "spirit", { cats: ["whisky"], not: ["cdn-flavoured", "am-flavoured"] }),
  i("rye", "Rye", "spirit", { styles: ["cdn-rye", "am-rye", "cdn-blended"] }),
  i("canadian-whisky", "Canadian whisky", "spirit", { families: ["canadian"], not: ["cdn-flavoured"] }),
  i("bourbon", "Bourbon", "spirit", { styles: ["bourbon", "wheated-bourbon"] }),
  i("tennessee-whiskey", "Tennessee whiskey", "spirit", { styles: ["tennessee"] }),
  i("scotch", "Blended Scotch", "spirit", { styles: ["blended-scotch", "blended-malt"] }),
  i("islay-scotch", "Islay Scotch", "spirit", { styles: ["islay"] }),
  i("irish-whiskey", "Irish whiskey", "spirit", { families: ["irish"] }),
  i("japanese-whisky", "Japanese whisky", "spirit", { families: ["japanese"] }),
  i("crown-royal", "Crown Royal", "spirit", { drinks: ["crown-royal-deluxe"] }),
  i("seagrams-7", "Seagram's 7 Crown", "spirit"),
  i("cinnamon-whisky", "Cinnamon whisky", "liqueur", { drinks: ["fireball-cinnamon-whisky"] }),

  // Gin, vodka
  i("gin", "Gin", "spirit", { styles: ["london-dry", "plymouth", "old-tom", "navy-gin", "new-western"] }),
  i("old-tom-gin", "Old Tom gin", "spirit", { styles: ["old-tom"] }),
  i("sloe-gin", "Sloe gin", "liqueur", { styles: ["sloe-gin"] }),
  i("vodka", "Vodka", "spirit", { styles: ["vodka"] }),
  i("citrus-vodka", "Citrus vodka", "spirit", { drinks: ["absolut-citron", "smirnoff-citrus"] }),
  i("vanilla-vodka", "Vanilla vodka", "spirit", { drinks: ["smirnoff-vanilla", "absolut-vanilia"] }),

  // Rum
  i("rum", "Rum", "spirit", { families: ["rum"], not: ["cachaca", "flavoured-rum"] }),
  i("white-rum", "White rum", "spirit", { styles: ["white-rum"] }),
  i("gold-rum", "Gold rum", "spirit", { styles: ["gold-rum"] }),
  i("dark-rum", "Dark rum", "spirit", { styles: ["dark-rum"] }),
  i("aged-rum", "Aged rum", "spirit", { styles: ["aged-rum"] }),
  i("spiced-rum", "Spiced rum", "spirit", { styles: ["spiced-rum"] }),
  i("overproof-rum", "Overproof rum", "spirit", { styles: ["overproof-rum"] }),
  i("black-rum", "Black rum (Gosling's)", "spirit", { drinks: ["goslings-black-seal"] }),
  i("screech", "Screech", "spirit", { drinks: ["newfoundland-screech"] }),
  i("coconut-rum", "Coconut rum", "liqueur", { drinks: ["malibu-coconut", "bacardi-coconut"] }),
  i("cachaca", "Cachaça", "spirit", { styles: ["cachaca"] }),

  // Agave
  i("tequila", "Tequila", "spirit", { styles: ["blanco", "joven", "reposado", "anejo", "extra-anejo", "cristalino"] }),
  i("tequila-blanco", "Tequila blanco", "spirit", { styles: ["blanco"] }),
  i("tequila-reposado", "Tequila reposado", "spirit", { styles: ["reposado"] }),
  i("mezcal", "Mezcal", "spirit", { styles: ["mezcal"] }),

  // Brandy and other spirits
  i("cognac", "Cognac", "spirit", { styles: ["cognac-vs", "cognac-vsop", "cognac-xo"] }),
  i("brandy", "Brandy", "spirit", { styles: ["brandy", "cognac-vs", "cognac-vsop", "cognac-xo", "armagnac"] }),
  i("calvados", "Calvados (apple brandy)", "spirit", { styles: ["calvados"] }),
  i("pisco", "Pisco", "spirit", { styles: ["pisco"] }),
  i("absinthe", "Absinthe", "spirit", { styles: ["absinthe"] }),
  i("pastis", "Pastis (Pernod)", "liqueur", { drinks: ["pernod", "ricard-pastis"] }),

  // Liqueurs, amari and aperitifs
  i("orange-liqueur", "Orange liqueur", "liqueur", { styles: ["orange-liqueur"] }),
  i("cointreau", "Cointreau", "liqueur", { drinks: ["cointreau"] }),
  i("grand-marnier", "Grand Marnier", "liqueur", { drinks: ["grand-marnier-cordon-rouge"] }),
  i("blue-curacao", "Blue curaçao", "liqueur"),
  i("campari", "Campari", "liqueur", { drinks: ["campari"] }),
  i("aperol", "Aperol", "liqueur", { drinks: ["aperol"] }),
  i("averna", "Averna", "liqueur", { drinks: ["averna-amaro-siciliano"] }),
  i("amaro-nonino", "Amaro Nonino", "liqueur", { drinks: ["amaro-nonino-quintessentia"] }),
  i("fernet", "Fernet-Branca", "liqueur", { drinks: ["fernet-branca"] }),
  i("green-chartreuse", "Green Chartreuse", "liqueur", { drinks: ["chartreuse-green"] }),
  i("yellow-chartreuse", "Yellow Chartreuse", "liqueur", { drinks: ["chartreuse-yellow"] }),
  i("benedictine", "Bénédictine", "liqueur", { drinks: ["benedictine-d-o-m"] }),
  i("drambuie", "Drambuie", "liqueur", { drinks: ["drambuie"] }),
  i("galliano", "Galliano", "liqueur", { drinks: ["galliano-lautentico"] }),
  i("jagermeister", "Jägermeister", "liqueur", { drinks: ["jagermeister"] }),
  i("maraschino", "Maraschino liqueur", "liqueur", { drinks: ["luxardo-maraschino"] }),
  i("elderflower-liqueur", "Elderflower liqueur", "liqueur", { drinks: ["st-germain-elderflower-liqueur"] }),
  i("raspberry-liqueur", "Raspberry liqueur (Chambord)", "liqueur", { drinks: ["chambord-black-raspberry"] }),
  i("melon-liqueur", "Melon liqueur (Midori)", "liqueur", { drinks: ["midori-melon-liqueur"] }),
  i("limoncello", "Limoncello", "liqueur", { drinks: ["villa-massa-limoncello"] }),
  i("peach-schnapps", "Peach schnapps", "liqueur", { drinks: ["de-kuyper-peachtree-schnapps"] }),
  i("sour-apple-liqueur", "Sour apple liqueur", "liqueur", { drinks: ["smirnoff-green-apple"] }),
  i("pimms", "Pimm's No. 1", "liqueur", { drinks: ["pimms-no-1"] }),
  i("amaretto", "Amaretto", "liqueur", { drinks: ["disaronno-originale"] }),
  i("licor-43", "Licor 43", "liqueur", { drinks: ["licor-43"] }),
  i("coffee-liqueur", "Coffee liqueur", "liqueur", { styles: ["coffee-liqueur"] }),
  i("irish-cream", "Irish cream", "liqueur", { drinks: ["baileys-original-irish-cream", "carolans-irish-cream", "forty-creek-cream"] }),
  i("rumchata", "RumChata", "liqueur", { drinks: ["rumchata"] }),
  i("maple-liqueur", "Maple whisky liqueur", "liqueur", { drinks: ["sortilege-maple-whisky-liqueur", "forty-creek-nanticoke-gold-maple"] }),
  i("sambuca", "Sambuca", "liqueur", { drinks: ["sambuca-romana"] }),
  i("creme-de-menthe", "Crème de menthe", "liqueur"),
  i("creme-de-cacao", "Crème de cacao", "liqueur"),
  i("creme-de-cassis", "Crème de cassis", "liqueur"),
  i("creme-de-mure", "Crème de mûre (blackberry)", "liqueur"),
  i("creme-de-violette", "Crème de violette", "liqueur"),
  i("banana-liqueur", "Banana liqueur", "liqueur"),
  i("butterscotch-schnapps", "Butterscotch schnapps", "liqueur"),
  i("peppermint-schnapps", "Peppermint schnapps", "liqueur"),
  i("passion-fruit-liqueur", "Passion fruit liqueur", "liqueur"),
  i("sweet-vermouth", "Sweet vermouth", "wine", { drinks: ["martini-rossi-rosso-vermouth", "cinzano-rosso", "carpano-antica-formula"] }),
  i("dry-vermouth", "Dry vermouth", "wine", { drinks: ["martini-rossi-extra-dry-vermouth", "dolin-dry-vermouth"] }),
  i("lillet-blanc", "Lillet Blanc", "wine", { drinks: ["lillet-blanc"] }),

  // Wine, beer and cider
  i("prosecco", "Prosecco", "wine", { styles: ["prosecco"] }),
  i("sparkling-wine", "Sparkling wine", "wine", { families: ["sparkling"] }),
  i("red-wine", "Red wine", "wine", { families: ["red"] }),
  i("white-wine", "White wine", "wine", { families: ["white"] }),
  i("rose-wine", "Rosé", "wine", { families: ["rose"] }),
  i("lager", "Lager", "beer", { families: ["lager"] }),
  i("stout", "Stout", "beer", { styles: ["dry-stout", "milk-stout", "oatmeal-stout", "imperial-stout", "coffee-stout"] }),
  i("cider", "Cider", "beer", { styles: ["dry-cider", "semi-cider", "sweet-cider"] }),

  // Mixers
  i("clamato", "Clamato", "mixer"),
  i("tomato-juice", "Tomato juice", "mixer"),
  i("tonic", "Tonic water", "mixer"),
  i("soda", "Soda water", "mixer"),
  i("cola", "Cola", "mixer"),
  i("ginger-ale", "Ginger ale", "mixer"),
  i("ginger-beer", "Ginger beer", "mixer"),
  i("lemon-lime-soda", "Lemon-lime soda (7UP, Sprite)", "mixer"),
  i("grapefruit-soda", "Grapefruit soda", "mixer"),
  i("sparkling-water", "Sparkling mineral water", "mixer"),
  i("energy-drink", "Energy drink", "mixer"),
  i("lemonade", "Lemonade", "mixer"),
  i("iced-tea", "Iced tea", "mixer"),
  i("coffee", "Hot coffee", "mixer"),
  i("espresso", "Espresso", "mixer"),
  i("hot-chocolate", "Hot chocolate", "mixer"),

  // Juices
  i("lemon-juice", "Fresh lemon juice", "juice"),
  i("lime-juice", "Fresh lime juice", "juice"),
  i("orange-juice", "Orange juice", "juice"),
  i("grapefruit-juice", "Grapefruit juice", "juice"),
  i("cranberry-juice", "Cranberry juice", "juice"),
  i("pineapple-juice", "Pineapple juice", "juice"),
  i("apple-cider", "Apple cider (sweet)", "juice"),
  i("sour-mix", "Sour mix", "juice"),
  i("pickle-brine", "Pickle brine", "juice"),
  i("peach-puree", "Peach purée", "juice"),
  i("olive-brine", "Olive brine", "juice"),
  i("passion-fruit-puree", "Passion fruit purée", "juice"),

  // Syrups
  i("simple-syrup", "Simple syrup", "syrup"),
  i("demerara-syrup", "Demerara syrup", "syrup"),
  i("honey-syrup", "Honey syrup", "syrup"),
  i("honey-ginger-syrup", "Honey-ginger syrup", "syrup"),
  i("maple-syrup", "Maple syrup", "syrup"),
  i("agave-syrup", "Agave syrup", "syrup"),
  i("grenadine", "Grenadine", "syrup"),
  i("raspberry-syrup", "Raspberry syrup", "syrup"),
  i("orgeat", "Orgeat (almond syrup)", "syrup"),
  i("passion-fruit-syrup", "Passion fruit syrup", "syrup"),
  i("honey", "Honey", "syrup"),
  i("falernum", "Falernum", "syrup"),

  // Bitters
  i("angostura", "Angostura bitters", "bitters"),
  i("orange-bitters", "Orange bitters", "bitters"),
  i("peychauds", "Peychaud's bitters", "bitters"),

  // Fresh
  i("mint", "Fresh mint", "fresh"),
  i("basil", "Fresh basil", "fresh"),
  i("lime", "Lime", "fresh"),
  i("lemon", "Lemon", "fresh"),
  i("orange", "Orange", "fresh"),
  i("cucumber", "Cucumber", "fresh"),
  i("strawberries", "Strawberries", "fresh"),
  i("jalapeno", "Jalapeño", "fresh"),
  i("horseradish", "Horseradish", "fresh"),

  // Dairy and eggs
  i("cream", "Cream (35%)", "dairy"),
  i("milk", "Milk", "dairy"),
  i("egg-white", "Egg white", "dairy"),
  i("coconut-cream", "Cream of coconut", "dairy"),
  i("vanilla-ice-cream", "Vanilla ice cream", "dairy"),
  i("whipped-cream", "Whipped cream", "dairy"),
  i("butter", "Butter", "dairy"),
  i("eggnog", "Eggnog", "dairy"),

  // Pantry: assumed to be on hand
  i("worcestershire", "Worcestershire sauce", "pantry"),
  i("hot-sauce", "Hot sauce", "pantry"),
  i("celery-salt", "Celery salt", "pantry"),
  i("salt-pepper", "Salt and pepper", "pantry", { pantry: true }),
  i("salt", "Salt", "pantry", { pantry: true }),
  i("sugar", "Sugar", "pantry", { pantry: true }),
  i("brown-sugar", "Brown sugar", "pantry", { pantry: true }),
  i("hot-water", "Hot water", "pantry", { pantry: true }),
  i("mulling-spices", "Mulling spices", "pantry"),
  i("orange-flower-water", "Orange flower water", "pantry"),
];

// Names that keep their capital letter in "Rye or Canadian whisky".
const PROPER = ["canadian-whisky", "irish-whiskey", "japanese-whisky", "tennessee-whiskey", "islay-scotch", "scotch", "crown-royal",
  "seagrams-7", "old-tom-gin", "screech", "cointreau", "grand-marnier", "campari", "aperol", "averna", "amaro-nonino", "fernet",
  "green-chartreuse", "yellow-chartreuse", "benedictine", "drambuie", "galliano", "jagermeister", "pimms", "licor-43",
  "rumchata", "lillet-blanc", "clamato", "angostura", "peychauds", "black-rum"];
for (const x of INGREDIENTS) if (PROPER.includes(x.id)) x.proper = true;

export const INGREDIENT_INDEX = new Map(INGREDIENTS.map(x => [x.id, x]));

export const INGREDIENT_KINDS = {
  spirit: "Spirits", liqueur: "Liqueurs", wine: "Wine & vermouth", beer: "Beer & cider", mixer: "Mixers", juice: "Juices",
  syrup: "Syrups", bitters: "Bitters", fresh: "Fruit & herbs", dairy: "Dairy & eggs", pantry: "Pantry",
};
