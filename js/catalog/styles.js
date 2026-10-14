/* The style tree: category > family > style. Every drink in the catalog points at one style id.
   Style ids are unique across the whole tree (tests check this). Beer and whisky come first: the group drinks them most.
   Only admins will be able to add styles; this built-in list ships with the app so it works offline. */

const fam = (id, name, styles) => ({ id, name, styles: styles.map(([sid, sname]) => ({ id: sid, name: sname })) });

export const CATEGORIES = [
  { id: "beer", name: "Beer", icon: "🍺", families: [
    fam("lager", "Lager", [
      ["german-pils", "German Pilsner"], ["czech-pils", "Czech Pilsner"], ["italian-pils", "Italian Pilsner"],
      ["helles", "Helles"], ["dunkel", "Dunkel"], ["marzen", "Märzen / Oktoberfest"], ["vienna", "Vienna Lager"],
      ["bock", "Bock"], ["maibock", "Maibock"], ["doppelbock", "Doppelbock"], ["eisbock", "Eisbock"],
      ["schwarzbier", "Schwarzbier"], ["am-lager", "American Lager"], ["am-light", "Light Lager"],
      ["intl-lager", "International Pale Lager"], ["mex-lager", "Mexican Lager"], ["rice-lager", "Rice Lager"], ["strong-lager", "Strong / Malt Liquor"],
      ["ice-lager", "Ice Lager"], ["ipl", "India Pale Lager"],
    ]),
    fam("pale-ipa", "Pale Ale & IPA", [
      ["am-pale", "American Pale Ale"], ["eng-bitter", "English Bitter"], ["esb", "ESB"],
      ["blonde-ale", "Blonde / Golden Ale"], ["cream-ale", "Cream Ale"],
      ["west-coast-ipa", "West Coast IPA"], ["hazy-ipa", "Hazy / NEIPA"], ["eng-ipa", "English IPA"],
      ["double-ipa", "Double IPA"], ["triple-ipa", "Triple IPA"], ["session-ipa", "Session IPA"],
      ["black-ipa", "Black IPA"], ["cold-ipa", "Cold IPA"], ["brut-ipa", "Brut IPA"], ["milkshake-ipa", "Milkshake IPA"],
      ["fruit-ipa", "Fruited IPA"],
    ]),
    fam("stout-porter", "Stout & Porter", [
      ["dry-stout", "Dry Irish Stout"], ["milk-stout", "Milk Stout"], ["oatmeal-stout", "Oatmeal Stout"],
      ["imperial-stout", "Imperial Stout"], ["pastry-stout", "Pastry Stout"], ["coffee-stout", "Coffee Stout"],
      ["eng-porter", "English Porter"], ["am-porter", "American Porter"], ["baltic-porter", "Baltic Porter"],
    ]),
    fam("belgian", "Belgian", [
      ["witbier", "Witbier"], ["saison", "Saison"], ["belgian-blonde", "Belgian Blonde"], ["dubbel", "Dubbel"],
      ["tripel", "Tripel"], ["quad", "Quadrupel"], ["belgian-golden", "Belgian Strong Golden"],
      ["belgian-dark", "Belgian Strong Dark"],
    ]),
    fam("wheat", "Wheat", [
      ["hefeweizen", "Hefeweizen"], ["dunkelweizen", "Dunkelweizen"], ["weizenbock", "Weizenbock"],
      ["am-wheat", "American Wheat"],
    ]),
    fam("sour", "Sour & Wild", [
      ["berliner", "Berliner Weisse"], ["gose", "Gose"], ["lambic", "Lambic"], ["gueuze", "Gueuze"], ["kriek", "Kriek"],
      ["flanders-red", "Flanders Red"], ["oud-bruin", "Oud Bruin"], ["fruit-sour", "Fruited Sour"], ["am-wild", "American Wild Ale"],
    ]),
    fam("amber-brown", "Amber, Brown & Red", [
      ["amber-ale", "Amber Ale"], ["irish-red", "Irish Red"], ["brown-ale", "Brown Ale"], ["scottish", "Scottish Ale"],
      ["wee-heavy", "Wee Heavy"], ["altbier", "Altbier"], ["kolsch", "Kölsch"],
    ]),
    fam("strong-ale", "Strong Ale", [
      ["eng-barleywine", "English Barleywine"], ["am-barleywine", "American Barleywine"], ["old-ale", "Old Ale"],
    ]),
    fam("specialty-beer", "Specialty", [
      ["fruit-beer", "Fruit Beer"], ["rauchbier", "Smoked / Rauchbier"], ["pumpkin", "Pumpkin / Spiced"],
      ["radler", "Radler / Shandy"], ["gluten-free-beer", "Gluten-free"], ["barrel-aged-beer", "Barrel-aged"],
    ]),
  ] },

  { id: "whisky", name: "Whisky", icon: "🥃", families: [
    fam("canadian", "Canadian", [
      ["cdn-blended", "Canadian Blended"], ["cdn-rye", "Canadian Rye"], ["cdn-single-malt", "Canadian Single Malt"],
      ["cdn-wheat", "Canadian Wheat"], ["cdn-corn", "Canadian Corn"], ["cdn-flavoured", "Flavoured Canadian Whisky"],
    ]),
    fam("scotch", "Scotch", [
      ["islay", "Islay Single Malt"], ["speyside", "Speyside Single Malt"], ["highland", "Highland Single Malt"],
      ["lowland", "Lowland Single Malt"], ["campbeltown", "Campbeltown Single Malt"], ["islands", "Islands Single Malt"],
      ["blended-malt", "Blended Malt"], ["blended-scotch", "Blended Scotch"], ["single-grain", "Single Grain"],
    ]),
    fam("american", "American", [
      ["bourbon", "Bourbon"], ["wheated-bourbon", "Wheated Bourbon"], ["tennessee", "Tennessee Whiskey"],
      ["am-rye", "American Rye"], ["am-single-malt", "American Single Malt"], ["corn-whiskey", "Corn Whiskey"],
      ["am-flavoured", "Flavoured Whiskey"],
    ]),
    fam("irish", "Irish", [
      ["pot-still", "Single Pot Still"], ["irish-single-malt", "Irish Single Malt"], ["irish-blended", "Irish Blended"],
      ["irish-grain", "Irish Single Grain"],
    ]),
    fam("japanese", "Japanese", [
      ["jp-single-malt", "Japanese Single Malt"], ["jp-blended", "Japanese Blended"], ["jp-grain", "Japanese Grain"],
    ]),
    fam("world-whisky", "World", [
      ["indian", "Indian"], ["taiwanese", "Taiwanese"], ["australian", "Australian"], ["welsh-english", "English & Welsh"],
      ["other-whisky", "Other World Whisky"],
    ]),
  ] },

  { id: "spirits", name: "Spirits", icon: "🍸", families: [
    fam("gin", "Gin", [
      ["london-dry", "London Dry"], ["plymouth", "Plymouth"], ["old-tom", "Old Tom"], ["navy-gin", "Navy Strength"],
      ["new-western", "New Western / Contemporary"], ["genever", "Genever"], ["sloe-gin", "Sloe Gin"], ["flavoured-gin", "Flavoured / Pink Gin"],
    ]),
    fam("vodka", "Vodka", [
      ["vodka", "Vodka"], ["flavoured-vodka", "Flavoured Vodka"],
    ]),
    fam("rum", "Rum", [
      ["white-rum", "White Rum"], ["gold-rum", "Gold Rum"], ["dark-rum", "Dark Rum"], ["spiced-rum", "Spiced Rum"],
      ["overproof-rum", "Overproof Rum"], ["aged-rum", "Aged / Sipping Rum"], ["agricole", "Rhum Agricole"],
      ["cachaca", "Cachaça"], ["flavoured-rum", "Flavoured Rum"],
    ]),
    fam("agave", "Tequila & Agave", [
      ["blanco", "Tequila Blanco"], ["joven", "Tequila Gold / Joven"], ["reposado", "Tequila Reposado"],
      ["anejo", "Tequila Añejo"], ["extra-anejo", "Tequila Extra Añejo"], ["cristalino", "Tequila Cristalino"],
      ["mezcal", "Mezcal"], ["raicilla", "Raicilla"], ["sotol", "Sotol"],
    ]),
    fam("brandy", "Brandy", [
      ["cognac-vs", "Cognac VS"], ["cognac-vsop", "Cognac VSOP"], ["cognac-xo", "Cognac XO"], ["armagnac", "Armagnac"],
      ["calvados", "Calvados"], ["pisco", "Pisco"], ["grappa", "Grappa"], ["brandy", "Brandy"], ["fruit-brandy", "Fruit Brandy / Eau-de-vie"],
    ]),
    fam("liqueur", "Liqueurs & Amari", [
      ["amaro", "Amaro / Herbal"], ["aperitivo", "Aperitivo (Campari, Aperol)"], ["coffee-liqueur", "Coffee Liqueur"],
      ["cream-liqueur", "Cream Liqueur"], ["fruit-liqueur", "Fruit Liqueur"], ["orange-liqueur", "Orange Liqueur"],
      ["nut-liqueur", "Nut Liqueur"], ["anise", "Anise (Sambuca, Ouzo)"], ["whisky-liqueur", "Whisky Liqueur"],
      ["cinnamon", "Cinnamon / Schnapps"], ["vermouth", "Vermouth"],
    ]),
    fam("other-spirit", "Other Spirits", [
      ["absinthe", "Absinthe"], ["aquavit", "Aquavit"], ["baijiu", "Baijiu"], ["soju", "Soju"], ["shochu", "Shochu"],
      ["moonshine", "Moonshine"],
    ]),
  ] },

  { id: "wine", name: "Wine", icon: "🍷", families: [
    fam("red", "Red", [
      ["cab-sauv", "Cabernet Sauvignon"], ["cab-franc", "Cabernet Franc"], ["merlot", "Merlot"], ["pinot-noir", "Pinot Noir"],
      ["malbec", "Malbec"], ["shiraz", "Shiraz / Syrah"], ["zinfandel", "Zinfandel"], ["tempranillo", "Tempranillo"],
      ["sangiovese", "Sangiovese / Chianti"], ["gamay", "Gamay"], ["baco-noir", "Baco Noir"], ["grenache", "Grenache"],
      ["nebbiolo", "Nebbiolo"], ["valpolicella", "Valpolicella / Amarone"], ["appassimento", "Appassimento"], ["red-blend", "Red Blend"],
    ]),
    fam("white", "White", [
      ["chardonnay", "Chardonnay"], ["sauv-blanc", "Sauvignon Blanc"], ["pinot-grigio", "Pinot Grigio / Gris"], ["pinot-blanc", "Pinot Blanc"],
      ["riesling", "Riesling"], ["gewurz", "Gewürztraminer"], ["vidal", "Vidal"], ["chenin", "Chenin Blanc"],
      ["moscato", "Moscato"], ["viognier", "Viognier"], ["gruner", "Grüner Veltliner"], ["white-blend", "White Blend"],
    ]),
    fam("rose", "Rosé", [["rose", "Rosé"]]),
    fam("orange-wine", "Orange", [["orange-wine", "Orange / Skin-contact"]]),
    fam("sparkling", "Sparkling", [
      ["champagne", "Champagne"], ["prosecco", "Prosecco"], ["cava", "Cava"], ["cremant", "Crémant"],
      ["pet-nat", "Pét-Nat"], ["sparkling-wine", "Sparkling Wine"],
    ]),
    fam("fortified", "Fortified", [
      ["ruby-port", "Ruby Port"], ["tawny-port", "Tawny Port"], ["vintage-port", "Vintage Port"], ["fino", "Fino / Manzanilla Sherry"],
      ["amontillado", "Amontillado Sherry"], ["oloroso", "Oloroso Sherry"], ["px", "Pedro Ximénez Sherry"],
      ["madeira", "Madeira"], ["marsala", "Marsala"],
    ]),
    fam("dessert", "Dessert", [
      ["icewine", "Icewine"], ["sauternes", "Sauternes"], ["late-harvest", "Late Harvest"], ["tokaji", "Tokaji"],
    ]),
  ] },

  { id: "cider-more", name: "Cider, Seltzer & More", icon: "🍏", families: [
    fam("cider", "Cider", [
      ["dry-cider", "Dry Cider"], ["semi-cider", "Semi-sweet Cider"], ["sweet-cider", "Sweet Cider"],
      ["fruit-cider", "Fruit / Flavoured Cider"], ["perry", "Perry (Pear)"], ["ice-cider", "Ice Cider"],
    ]),
    fam("mead", "Mead", [["mead", "Traditional Mead"], ["melomel", "Melomel (Fruit)"], ["metheglin", "Metheglin (Spiced)"]]),
    fam("sake", "Sake", [
      ["junmai", "Junmai"], ["ginjo", "Ginjo"], ["daiginjo", "Daiginjo"], ["honjozo", "Honjozo"], ["nigori", "Nigori"],
      ["sparkling-sake", "Sparkling Sake"],
    ]),
    fam("rtd", "Seltzers & Coolers", [
      ["seltzer", "Hard Seltzer"], ["cooler", "Cooler"], ["canned-cocktail", "Canned Cocktail"], ["hard-iced-tea", "Hard Iced Tea"],
      ["hard-lemonade", "Hard Lemonade"], ["hard-kombucha", "Hard Kombucha"],
    ]),
  ] },

  { id: "cocktail", name: "Cocktails", icon: "🍹", families: [
    fam("spirit-forward", "Old Fashioned & Stirred", [
      ["old-fashioned-family", "Old Fashioned"], ["manhattan-family", "Manhattan"], ["martini-family", "Martini"],
      ["negroni-family", "Negroni"], ["stirred-other", "Other Stirred"],
    ]),
    fam("sours", "Sours", [
      ["whisky-sour-family", "Whisky Sour"], ["margarita-family", "Margarita"], ["daiquiri-family", "Daiquiri"],
      ["sidecar-family", "Sidecar"], ["sour-other", "Other Sours"],
    ]),
    fam("highballs", "Highballs & Mules", [
      ["highball", "Highball"], ["mule", "Mule"], ["caesar-family", "Caesar / Bloody Mary"], ["collins", "Collins & Fizz"],
      ["mojito-family", "Mojito & Smash"],
    ]),
    fam("spritz", "Spritzes & Sparkling", [["spritz", "Spritz"], ["sparkling-cocktail", "Sparkling Cocktail"]]),
    fam("tiki", "Tiki & Tropical", [["tiki", "Tiki"], ["tropical", "Tropical / Frozen"]]),
    fam("dessert-cocktail", "Creamy & Dessert", [["creamy", "Creamy"], ["coffee-cocktail", "Coffee Cocktail"]]),
    fam("hot", "Hot Drinks", [["hot-toddy-family", "Toddy & Hot Drinks"], ["spiked-coffee", "Spiked Coffee"]]),
    fam("shots", "Shots & Shooters", [["shot", "Shot"], ["shooter", "Layered / Shooter"]]),
  ] },

  { id: "na", name: "Non-alcoholic", icon: "🧃", families: [
    fam("na-drinks", "Non-alcoholic", [
      ["na-beer", "NA Beer"], ["na-wine", "NA Wine"], ["na-spirit", "NA Spirit"], ["mocktail", "Mocktail"],
      ["na-cider", "NA Cider"], ["na-seltzer", "NA Seltzer / Sparkling"],
    ]),
  ] },
];

/* style id -> { style, family, category } */
export const STYLE_INDEX = new Map(CATEGORIES.flatMap(category => category.families.flatMap(family =>
  family.styles.map(style => [style.id, { style, family, category }]))));
