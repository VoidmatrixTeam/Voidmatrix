class SearchInput extends InputElement {
    constructor() {
        if (SearchInput.instance) {
            return SearchInput.instance;
        }

        super();
        this.input.placeholder = 'Search scripts';
        SearchInput.instance = this;
    }
}

class LanguageInput extends DropDownElement {
    constructor(languages = ['ENG', 'SP', 'GER', 'FR', 'IT', 'KOR', 'JP5', 'JP6'], defaultLanguage = 'ENG') {
        if (LanguageInput.instance) {
            return LanguageInput.instance;
        }

        super(languages, defaultLanguage, 'language');
        LanguageInput.instance = this;
    }
}

class GameIcon extends Icon {
    constructor(game) {
        super(`assets/${game}.png`, `Pokémon ${game} icon`);
        this.name = game;
    }

    getName() {
        return this.name;
    }
}

class GameSelectorDropDown extends HTMLElement {
    constructor(games) {
        super();
        this.games = []
        for (const game of games) {
            this.games.push(new GameIcon(game));
        }
        this.classList.add('hidden');
        this.append(...this.games);

        this.onSelect(this.toggleVisibility.bind(this));
    }

    onSelect(callback) {
        for (const game of this.games) {
            game.addEventListener('click', () => {
                callback(game);
            });
        }
    }

    toggleVisibility() {
        this.classList.toggle('hidden');
    }

    getGame(game) {
        for (const gameIcon of this.games) {
            if (gameIcon.getName() == game) {
                return gameIcon;
            }
        }
    }
}

class GameSelector extends HTMLElement {
    constructor(game='diamond', games=['diamond', 'pearl', 'platinum']) {
        if (GameSelector.instance) {
            return GameSelector.instance;
        }

        super();
        this.gameIcon = new GameIcon(game);
        this.dropdown= new GameSelectorDropDown(games);
        this.dropdown.onSelect(this.setSelectedGame.bind(this))
        this.onSelect(this.dropdown.toggleVisibility.bind(this.dropdown));
        this.append(this.gameIcon, this.dropdown);
        GameSelector.instance = this;
    }

    onSelect(callback) {
        this.gameIcon.addEventListener('click', () => {
            callback();
        });
    }

    setSelectedGame(game) {
        this.gameIcon.src = game.src;
    }
}

class SearchBar extends HTMLElement {
    constructor(){
        super();
        const icon = new Icon('assets/search.svg', 'search icon');
        icon.classList.add('search-icon')
        this.searchInput = new SearchInput();
        this.gameSelector = new GameSelector();
        this.languageInput = new LanguageInput();
        this.append(
            icon,
            this.searchInput,
            // this.gameSelector,
            this.languageInput
        );
    }
}

class SearchHeading extends HTMLHeadingElement {
    constructor(text) {
        super();
        this.textContent = text;
    }
}

class SearchResultMetaData extends HTMLElement {
    constructor(json) {
        super();
        this.author = new SearchHeading(json.author);
        this.date = new SearchHeading(json.date);
        this.append(this.author, this.date);
    }
}

class SearchResultInfo extends HTMLElement {
    constructor(json) {
        super();
        this.titleElement = new SearchHeading(json.title);
        this.metadata = new SearchResultMetaData(json);
        this.append(this.titleElement, this.metadata);
    }
}

class SupportedGames extends HTMLElement {
    constructor(json, games=['diamond', 'pearl', 'platinum']) {
        super();
        this.games = [];
        for (const game of games) {
            const icon = new GameIcon(game);
            if (!json.supported.includes(game)) {
                icon.classList.add('hidden');
            }
            this.games.push(icon);
        }
        this.append(...this.games);
    }
}

class SearchResult extends HTMLElement {
    constructor(json) {
        super();
        this.json = json;
        this.info = new SearchResultInfo(json);
        this.games = new SupportedGames(json);
        this.append(this.info, this.games);
    }

    matchesSearchQuery() {
        // if (!this.json.languages.includes(LanguageInput.instance.getValue())) {
        //     return false;
        // }

        const searchQuery = SearchInput.instance.getValue().toLowerCase();
        const fields = [this.json.title, this.json.author, ...this.json.supported].map(field => field.toLowerCase());
        const result = fields.some(field => field.includes(searchQuery));
        return result;
    }

    setVisibility(enabled) {
        this.classList.toggle('hidden', enabled);
    }

    onSelect(callback) {
        this.addEventListener('click', () => {
            callback(this.json);
        })
    }
}

class SearchResults extends HTMLElement {
    constructor(json) {
        super();
        this.scripts = [];
        for (const scriptObject of json) {
            const searchResult = new SearchResult(scriptObject);
            searchResult.onSelect(ScriptGroupList.instance.addScriptGroup.bind(ScriptGroupList.instance));
            this.scripts.push(searchResult);
        }
        this.append(...this.scripts);

        SearchInput.instance.onInput(this.filterScripts.bind(this));
    }

    filterScripts(query) {
        for (const script of this.scripts) {
            script.setVisibility(!script.matchesSearchQuery());
        }
    }
}

class SearchArea extends HTMLElement {
    constructor(json) {
        super();
        this.searchBar = new SearchBar();
        this.results = new SearchResults(json);
        this.append(this.searchBar, this.results);
    }
}

customElements.define('search-input', SearchInput);
customElements.define('language-input', LanguageInput);
customElements.define('game-icon', GameIcon, { extends: 'img'});
customElements.define('game-selector-dropdown', GameSelectorDropDown);
customElements.define('game-selector', GameSelector);
customElements.define('search-bar', SearchBar);
customElements.define('search-heading', SearchHeading, { extends: 'h5' });
customElements.define('search-result-meta-data', SearchResultMetaData);
customElements.define('search-result-info', SearchResultInfo);
customElements.define('supported-games', SupportedGames);
customElements.define('search-result', SearchResult);
customElements.define('search-results', SearchResults);
customElements.define('search-area', SearchArea);


document.addEventListener("DOMContentLoaded", async function () {
    const wrapper = document.querySelector('.search-wrapper');
    const searchArea = new SearchArea(await ScriptRequestHandler.getScripts());
    wrapper.appendChild(searchArea);
});