class DotArtistPixel extends HTMLDivElement {

}

class DotArtistRow extends HTMLElement {
    constructor(pixels) {
        super();
        for (let i = 0; i < pixels; i++) {
            const pixel = new DotArtistPixel();
            this.append(pixel);
        }
    }
}

class DotArtistCanvas extends HTMLElement {
    constructor() {
        if (DotArtistCanvas.instance) {
            return DotArtistCanvas.instance;
        }
        super();
        this.rowCount = 20;
        this.colCount = 24;

        for (let row=0; row < this.rowCount; row++) {
            this.append(new DotArtistRow(this.colCount));
        }

        DotArtistCanvas.instance = this;
    }
}

class DotArtistOption extends Icon {
    constructor(src, alt) {
        super(src, alt);
    }
}

class DotArtistDropDownOption extends DotArtistOption {
    constructor() {
        super('assets/list_menu.svg', 'dropdown menu icon');
    }
}

class DotArtistHighlightOption extends DotArtistOption {
    constructor() {
        super('assets/highlight_selection.svg', 'highlight icon');
    }
}

class DotArtistNumberViewerOption extends DotArtistOption {
    constructor() {
        super('assets/123.svg', 'numbers icon');
    }
}

class DotArtistCopyOption extends DotArtistOption {
    constructor() {
        super('assets/copy.svg', 'copy icon');
    }
}

class DotArtistConfigOptions extends HTMLElement {
    constructor() {
        super();
        this.dropdown = new DotArtistDropDownOption();
        this.highlight = new DotArtistHighlightOption();
        this.numbers = new DotArtistNumberViewerOption();
        this.copy = new DotArtistCopyOption();
        this.append(
            this.dropdown,
            this.highlight,
            this.numbers,
            this.copy
        )
    }
}

class DotArtistWrapper extends HTMLElement {
    constructor() {
        super();
        this.canvas = new DotArtistCanvas();
        this.configOptions = new DotArtistConfigOptions();
        this.append(this.canvas, this.configOptions);
    }

    setColor(color) {
        this.canvas.style.setProperty('--main-color', color);
    }
}

customElements.define('dot-artist-pixel', DotArtistPixel, { extends: 'div'});
customElements.define('dot-artist-row', DotArtistRow);
customElements.define('dot-artist-canvas', DotArtistCanvas);
customElements.define('dot-artist-option', DotArtistOption, { extends: 'img'});
customElements.define('dot-artist-dropdown', DotArtistDropDownOption, { extends: 'img'});
customElements.define('dot-artist-highlight', DotArtistHighlightOption, { extends: 'img'});
customElements.define('dot-artist-number-view', DotArtistNumberViewerOption, { extends: 'img'});
customElements.define('dot-artist-copy', DotArtistCopyOption, { extends: 'img'});
customElements.define('dot-artist-config-options', DotArtistConfigOptions);
customElements.define('dot-artist-wrapper', DotArtistWrapper);

document.addEventListener("DOMContentLoaded", async function () {
    const wrapper = document.querySelector('.right-panel-content');
    const dotArtistWrapper = new DotArtistWrapper();
    wrapper.appendChild(dotArtistWrapper);
});
