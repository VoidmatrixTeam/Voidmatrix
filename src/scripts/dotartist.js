class DotArtistPixel extends HTMLElement {
    constructor() {
        super();
    }

    clear() {
        this.classList.remove(...this.classList);
        this.innerText = '';
    }

    setValue(value) {
        this.clear();
        this.classList.add(`bit-${value}`);
        this.classList.add('active');
        if (value > 0)
            this.innerText = value;
    }
}

class DotArtistRow extends HTMLElement {
    constructor(pixels) {
        super();
        for (let i = 0; i < pixels; i++) {
            const pixel = new DotArtistPixel();
            this.append(pixel);
        }
    }

    clearPixel(index) {
        this.children[index].clear();
    }

    setPixel(index, value) {
        this.children[index].setValue(value);
    }

    setPixelInfo(index, info) {
        this.children[index].classList.add(info);
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

        for (let row = 0; row < this.rowCount; row++) {
            this.append(new DotArtistRow(this.colCount));
        }

        DotArtistCanvas.instance = this;
    }

    toPixelArray(byteArray) {
        const extract2BPPValues = (byte) => [
            (byte >> 0) & 3,
            (byte >> 2) & 3,
            (byte >> 4) & 3,
            (byte >> 6) & 3
        ];

        return byteArray.flatMap(extract2BPPValues);
    }

    fromByteArray(byteArray) {
        const pixelArray = this.toPixelArray(byteArray);
        const lastIndex = pixelArray.length - 1;
        const lastRow = Math.floor(lastIndex / this.colCount);
        const lastCol = lastIndex % this.colCount;

        for (let row = 0; row < this.rowCount; row++) {
            for (let col = 0; col < this.colCount; col++) {
                const index = row * this.colCount + col;
                this.children[row].clearPixel(col);

                if (index < pixelArray.length) {
                    this.children[row].setPixel(col, pixelArray[index]);

                    if (row === lastRow ||
                        (row === lastRow - 1 && col > lastCol)) {
                        this.children[row].setPixelInfo(col, 'last-row');
                    }

                    if (row === lastRow && col === lastCol) {
                        this.children[row].setPixelInfo(col, 'last-pixel');
                    }
                } else {
                    this.children[row].setPixelInfo(col, 'unset-pixel');
                }
            }
        }
    }

    clear() {
        for (const row of this.children) {
            row.clear();
        }
    }
}

class DotArtistOption extends Icon {
    constructor(src, alt) {
        super(src, alt);
    }
}

class ToggleableDotArtistOption extends DotArtistOption {
    constructor(src, alt) {
        super(src, alt);
        this.enabled = false;
        this.onClick(this.toggle.bind(this));
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        this.classList.toggle('enabled', enabled);
    }

    toggle() {
        this.setEnabled(!this.enabled);
    }
}

class DotArtistDropDownOption extends ToggleableDotArtistOption {
    constructor() {
        super('assets/list_menu.svg', 'dropdown menu icon');
        this.setEnabled(true);
    }
}

class DotArtistHighlightOption extends ToggleableDotArtistOption {
    constructor() {
        super('assets/highlight_selection.svg', 'highlight icon');
        this.setEnabled(true);
        this.toggleHighlight();
        this.onClick(this.toggleHighlight.bind(this));
    }

    toggleHighlight() {
        const canvas = DotArtistCanvas.instance;
        if (canvas) {
            canvas.classList.toggle('highlight', this.enabled);
        }
    }
}

class DotArtistNumberViewerOption extends ToggleableDotArtistOption {
    constructor() {
        super('assets/123.svg', 'numbers icon');
        this.setEnabled(true);
        this.toggleNumbers();
        this.onClick(this.toggleNumbers.bind(this));
    }

    toggleNumbers() {
        const canvas = DotArtistCanvas.instance;
        if (canvas) {
            canvas.classList.toggle('show-numbers', this.enabled);
        }
    }
}

class DotArtistCopyOption extends DotArtistOption {
    constructor() {
        super('assets/copy.svg', 'copy icon');
        this.onClick(this.copy.bind(this));
    }

    copy() {
        const scriptGroup = ScriptGroupManager.instance.getSelectedScriptGroup();
        if (scriptGroup) {
            const script = scriptGroup.getSelectedScript();
            if (script) {
                const byteArray = script.toByteArray();
                const byteString = byteArray.map(byte => byte.toString(16).padStart(2, '0')).join(' ');
                navigator.clipboard.writeText(byteString).then(() => {
                    console.log('Copied to clipboard:', byteString);
                }).catch(err => {
                    console.error('Failed to copy:', err);
                });
            }
        }
    }
}

class DotArtistConfigOptions extends HTMLElement {
    constructor() {
        super();
        this.dropdown = new DotArtistDropDownOption();

        this.dropdownOptions = new Map();
        this.highlight = new DotArtistHighlightOption();
        this.numbers = new DotArtistNumberViewerOption();
        this.copy = new DotArtistCopyOption();
        this.dropdownOptions.set('highlight', this.highlight);
        this.dropdownOptions.set('numbers', this.numbers);
        this.dropdownOptions.set('copy', this.copy);
        this.append(
            this.dropdown,
            ...this.dropdownOptions.values()
        );

        this.dropdown.onClick(() => {
            this.toggleVisibility(!this.dropdown.enabled);
        });
    }

    toggleVisibility(value) {
        for (const option of this.dropdownOptions.values()) {
            option.classList.toggle('hidden', value);
        }
    }
}

class DotArtistWrapper extends HTMLElement {
    constructor() {
        super();
        this.canvas = new DotArtistCanvas();
        this.configOptions = new DotArtistConfigOptions();
        this.append(this.canvas, this.configOptions);
        this.connectSignals();
    }

    connectSignals() {
        document.addEventListener('scriptSelected', (event) => {
            const script = event.detail;
            this.setColor(script.getColor());
            this.canvas.fromByteArray(script.toByteArray());
        });
    }

    setColor(color) {
        this.canvas.style.setProperty('--main-color', color);
    }
}

customElements.define('dot-artist-pixel', DotArtistPixel);
customElements.define('dot-artist-row', DotArtistRow);
customElements.define('dot-artist-canvas', DotArtistCanvas);
customElements.define('dot-artist-option', DotArtistOption, { extends: 'img' });
customElements.define('dot-artist-toggle-option', ToggleableDotArtistOption, { extends: 'img' });
customElements.define('dot-artist-dropdown', DotArtistDropDownOption, { extends: 'img' });
customElements.define('dot-artist-highlight', DotArtistHighlightOption, { extends: 'img' });
customElements.define('dot-artist-number-view', DotArtistNumberViewerOption, { extends: 'img' });
customElements.define('dot-artist-copy', DotArtistCopyOption, { extends: 'img' });
customElements.define('dot-artist-config-options', DotArtistConfigOptions);
customElements.define('dot-artist-wrapper', DotArtistWrapper);
