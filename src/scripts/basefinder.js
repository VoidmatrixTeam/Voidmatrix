let pokemonNames =  ["-----", "Bulbasaur", "Ivysaur", "Venusaur", "Charmander", "Charmeleon", "Charizard",
    "Squirtle", "Wartortle", "Blastoise", "Caterpie", "Metapod", "Butterfree",
    "Weedle", "Kakuna", "Beedrill", "Pidgey", "Pidgeotto", "Pidgeot", "Rattata", "Raticate",
    "Spearow", "Fearow", "Ekans", "Arbok", "Pikachu", "Raichu", "Sandshrew", "Sandslash",
    "Nidoran F", "Nidorina", "Nidoqueen", "Nidoran M", "Nidorino", "Nidoking",
    "Clefairy", "Clefable", "Vulpix", "Ninetales", "Jigglypuff", "Wigglytuff",
    "Zubat", "Golbat", "Oddish", "Gloom", "Vileplume", "Paras", "Parasect", "Venonat", "Venomoth",
    "Diglett", "Dugtrio", "Meowth", "Persian", "Psyduck", "Golduck", "Mankey", "Primeape",
    "Growlithe", "Arcanine", "Poliwag", "Poliwhirl", "Poliwrath", "Abra", "Kadabra", "Alakazam",
    "Machop", "Machoke", "Machamp", "Bellsprout", "Weepinbell", "Victreebel", "Tentacool", "Tentacruel",
    "Geodude", "Graveler", "Golem", "Ponyta", "Rapidash", "Slowpoke", "Slowbro",
    "Magnemite", "Magneton", "Farfetch'd", "Doduo", "Dodrio", "Seel", "Dewgong", "Grimer", "Muk",
    "Shellder", "Cloyster", "Gastly", "Haunter", "Gengar", "Onix", "Drowzee", "Hypno",
    "Krabby", "Kingler", "Voltorb", "Electrode", "Exeggcute", "Exeggutor", "Cubone", "Marowak",
    "Hitmonlee", "Hitmonchan", "Lickitung", "Koffing", "Weezing", "Rhyhorn", "Rhydon", "Chansey",
    "Tangela", "Kangaskhan", "Horsea", "Seadra", "Goldeen", "Seaking", "Staryu", "Starmie",
    "Mr. Mime", "Scyther", "Jynx", "Electabuzz", "Magmar", "Pinsir", "Tauros", "Magikarp", "Gyarados",
    "Lapras", "Ditto", "Eevee", "Vaporeon", "Jolteon", "Flareon", "Porygon", "Omanyte", "Omastar",
    "Kabuto", "Kabutops", "Aerodactyl", "Snorlax", "Articuno", "Zapdos", "Moltres",
    "Dratini", "Dragonair", "Dragonite", "Mewtwo", "Mew",
    "Chikorita", "Bayleef", "Meganium", "Cyndaquil", "Quilava", "Typhlosion",
    "Totodile", "Croconaw", "Feraligatr", "Sentret", "Furret", "Hoothoot", "Noctowl",
    "Ledyba", "Ledian", "Spinarak", "Ariados", "Crobat", "Chinchou", "Lanturn", "Pichu", "Cleffa",
    "Igglybuff", "Togepi", "Togetic", "Natu", "Xatu", "Mareep", "Flaaffy", "Ampharos", "Bellossom",
    "Marill", "Azumarill", "Sudowoodo", "Politoed", "Hoppip", "Skiploom", "Jumpluff", "Aipom",
    "Sunkern", "Sunflora", "Yanma", "Wooper", "Quagsire", "Espeon", "Umbreon", "Murkrow", "Slowking",
    "Misdreavus", "Unown", "Wobbuffet", "Girafarig", "Pineco", "Forretress", "Dunsparce", "Gligar",
    "Steelix", "Snubbull", "Granbull", "Qwilfish", "Scizor", "Shuckle", "Heracross", "Sneasel",
    "Teddiursa", "Ursaring", "Slugma", "Magcargo", "Swinub", "Piloswine", "Corsola", "Remoraid", "Octillery",
    "Delibird", "Mantine", "Skarmory", "Houndour", "Houndoom", "Kingdra", "Phanpy", "Donphan",
    "Porygon2", "Stantler", "Smeargle", "Tyrogue", "Hitmontop", "Smoochum", "Elekid", "Magby", "Miltank",
    "Blissey", "Raikou", "Entei", "Suicune", "Larvitar", "Pupitar", "Tyranitar", "Lugia", "Ho-Oh", "Celebi",
    "Treecko", "Grovyle", "Sceptile", "Torchic", "Combusken", "Blaziken", "Mudkip", "Marshtomp",
    "Swampert", "Poochyena", "Mightyena", "Zigzagoon", "Linoone", "Wurmple", "Silcoon", "Beautifly",
    "Cascoon", "Dustox", "Lotad", "Lombre", "Ludicolo", "Seedot", "Nuzleaf", "Shiftry",
    "Taillow", "Swellow", "Wingull", "Pelipper", "Ralts", "Kirlia", "Gardevoir", "Surskit",
    "Masquerain", "Shroomish", "Breloom", "Slakoth", "Vigoroth", "Slaking", "Nincada", "Ninjask",
    "Shedinja", "Whismur", "Loudred", "Exploud", "Makuhita", "Hariyama", "Azurill", "Nosepass",
    "Skitty", "Delcatty", "Sableye", "Mawile", "Aron", "Lairon", "Aggron", "Meditite", "Medicham",
    "Electrike", "Manectric", "Plusle", "Minun", "Volbeat", "Illumise", "Roselia", "Gulpin",
    "Swalot", "Carvanha", "Sharpedo", "Wailmer", "Wailord", "Numel", "Camerupt", "Torkoal",
    "Spoink", "Grumpig", "Spinda", "Trapinch", "Vibrava", "Flygon", "Cacnea", "Cacturne", "Swablu",
    "Altaria", "Zangoose", "Seviper", "Lunatone", "Solrock", "Barboach", "Whiscash", "Corphish",
    "Crawdaunt", "Baltoy", "Claydol", "Lileep", "Cradily", "Anorith", "Armaldo", "Feebas",
    "Milotic", "Castform", "Kecleon", "Shuppet", "Banette", "Duskull", "Dusclops", "Tropius",
    "Chimecho", "Absol", "Wynaut", "Snorunt", "Glalie", "Spheal", "Sealeo", "Walrein", "Clamperl",
    "Huntail", "Gorebyss", "Relicanth", "Luvdisc", "Bagon", "Shelgon", "Salamence", "Beldum",
    "Metang", "Metagross", "Regirock", "Regice", "Registeel", "Latias", "Latios", "Kyogre",
    "Groudon", "Rayquaza", "Jirachi", "Deoxys",
    "Turtwig", "Grotle", "Torterra", "Chimchar", "Monferno", "Infernape", "Piplup", "Prinplup",
    "Empoleon", "Starly", "Staravia", "Staraptor", "Bidoof", "Bibarel", "Kricketot", "Kricketune",
    "Shinx", "Luxio", "Luxray", "Budew", "Roserade", "Cranidos", "Rampardos", "Shieldon", "Bastiodon",
    "Burmy", "Wormadam", "Mothim", "Combee", "Vespiquen", "Pachirisu", "Buizel", "Floatzel", "Cherubi",
    "Cherrim", "Shellos", "Gastrodon", "Ambipom", "Drifloon", "Drifblim", "Buneary", "Lopunny",
    "Mismagius", "Honchkrow", "Glameow", "Purugly", "Chingling", "Stunky", "Skuntank", "Bronzor",
    "Bronzong", "Bonsly", "Mime Jr.", "Happiny", "Chatot", "Spiritomb", "Gible", "Gabite", "Garchomp",
    "Munchlax", "Riolu", "Lucario", "Hippopotas", "Hippowdon", "Skorupi", "Drapion", "Croagunk",
    "Toxicroak", "Carnivine", "Finneon", "Lumineon", "Mantyke", "Snover", "Abomasnow", "Weavile",
    "Magnezone", "Lickilicky", "Rhyperior", "Tangrowth", "Electivire", "Magmortar", "Togekiss",
    "Yanmega", "Leafeon", "Glaceon", "Gliscor", "Mamoswine", "Porygon-Z", "Gallade", "Probopass",
    "Dusknoir", "Froslass", "Rotom", "Uxie", "Mesprit", "Azelf", "Dialga", "Palkia", "Heatran",
    "Regigigas", "Giratina", "Cresselia", "Phione", "Manaphy", "Darkrai", "Shaymin", "Arceus",]

let bannedMaps = [
    117, 192, 393, 474, 475, 476, 477, 478, 479, 480, 481, 482, 483,484, 485, 486, 487, 488, 489, 490, 496, //movement
    35, 88, 93, 95, 122, 133, 154, 155, 156, 176, 178, 180, 182, 184, 185, 291, 293, 504, 505, 506, 507, 508, 509,  //BSOD
    150, 188, 295 // soft lock
]
let tileMapping;
let textureData;
let checkableTiles =  [0x4C,0xE0,0xE4,0xE8];
let potentialAslr = (() => {let bases = []; for (let i = 0; i < 64; i++) {bases.push(0x226D260+i*4);} return bases;})();
let currentSuggestedPokemonIds = [];

const suggestAslr = function() {
    let topSuggestion = ["",0]
    let suggestionCount;
    let currentChunkData;

    for (const textureSet of textureData) {
        currentChunkData = textureSet["chunks"][`Chunk 2`] // only doing current chunk
        suggestionCount = 0;
        for (const ptr in currentChunkData) {
            for (const ptrValues of currentChunkData[ptr]) {
                for (const tile of checkableTiles) {
                    if (tile === parseInt(ptrValues.tile)) {
                        if (potentialAslr.indexOf(parseInt(ptrValues.base)) !== -1) {
                            suggestionCount +=1;
                        }
                    }
                }
            }
        }
        if (suggestionCount > topSuggestion[1]) {topSuggestion[0] = textureSet.map_ids; topSuggestion[1] = suggestionCount;}
    }

    currentSuggestedPokemonIds = topSuggestion[0];
    let pokesuggestions = "";
    if (currentSuggestedPokemonIds.length) {
        for (const pokemonId of currentSuggestedPokemonIds.sort((a, b) => a - b)) {
            if (bannedMaps.indexOf(pokemonId) !== -1) {continue;}
            if (pokemonId < 493) {
                pokesuggestions += `<div class="pokesuggestion"><img class="pokeimg" src="./images/pokemon/${pokemonId}.png"><p class="pokeid">${String(pokemonId).padStart(3, '0')}</p><p class="pokename">${pokemonNames[pokemonId]}</p></div>`;
            }
        }
    }

    document.querySelector(".pokesuggestions").innerHTML = pokesuggestions;
}

const getAndDisplayAslr = function (ptrData,tile) {
    for (const ptrValues of ptrData) {
        if (tile === parseInt(ptrValues.tile)) {
            displayAslr(ptrValues.base)
            break;
        }
    }
}

const displayAslr =  function (base) {
    console.log(parseInt(base)%0x100)
    if (parseInt(base)%0x100 === 0x60) {
        document.querySelector(".aslrcount").textContent = 2;
        document.querySelector(".aslr").textContent = "0x226D260 or 0x226D360";
        return;
    }
    document.querySelector(".aslrcount").textContent = 1;
    document.querySelector(".aslr").textContent = base;
}

const updateAslrSuggestion = function () {
    if (potentialAslr.length === 1) return;
    document.querySelector(".aslr").textContent = "working on it...";

    let tiles = [document.getElementById("tile1").value,document.getElementById("tile2").value];
    let currentChunkData;

    for (let textureSet of textureData) {
        if (textureSet.map_ids.indexOf(currentSuggestedPokemonIds[0]) !== -1) {
            currentChunkData = textureSet["chunks"][`Chunk 2`];
        }
    }

    for (let i=0; i<tiles.length;i++) {
        if (tiles[i] !== "blank") {
            getAndDisplayAslr(currentChunkData[`ptr ${i+1}`],parseInt(tiles[i]));
            return;
        }
        for (const tile of checkableTiles) {
            for (const ptrValues of currentChunkData[`ptr ${i+1}`]) {
                if (tile === parseInt(ptrValues.tile)) {
                    // console.log(`filtering: ${ptrValues.base}`)
                    potentialAslr = potentialAslr.filter(function(f) {return f !== parseInt(ptrValues.base);}) 
                }
            }
        }
    }

    suggestAslr()
    document.querySelector(".aslrcount").textContent = potentialAslr.length;
    if (potentialAslr.length === 1) {displayAslr( "0x" + potentialAslr[0].toString(16).padStart(2, "0"))}
}

const addEventListeners = function() {
    document.querySelector('.j-submit').addEventListener('click',updateAslrSuggestion)

}

const getJsonFromUrl = async function(url) {
    return fetch(url)
    .then((response) => response.json())
    .then((responseJson) => {
    return responseJson;
    })
    .catch((error) => {
    console.error(error);
    });   
}

document.addEventListener("DOMContentLoaded", async function () {
    tileMapping = await getJsonFromUrl(`data/tiledata.json`);
    textureData = await getJsonFromUrl(`data/aslrdata.json`);
    suggestAslr();
    addEventListeners();
});