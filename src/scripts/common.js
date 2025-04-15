// DOM Shadow replaces the dom element with 'div' or 'input' if you inherit from them.
// Create helpers to not have to adhere to abhorent design decisions.

class InputElement extends HTMLElement {
    constructor(placeholder = '') {
        super();
        const input = document.createElement('input');
        input.placeholder = placeholder;
        this.appendChild(input);
        this.input = input;
    }

    setValue(value) {
        this.input.value = value;
    }

    getValue() {
        return this.input.value;
    }

    getParsedValue() {
        return parseInt(getValue(), 16);
    }

    onInput(callback) {
        this.input.addEventListener('input', () => {
            callback(this.getValue());
        })
    }

    onInputChange(callback) {
        this.input.addEventListener('change', () => {
            callback(this.getValue());
        });
    }
}

class TextAreaElement extends HTMLElement {
    constructor(placeholder = '') {
        super();
        const textarea = document.createElement('textarea');
        textarea.placeholder = placeholder;
        this.appendChild(textarea);
        this.textarea = textarea;
    }

    setValue(value) {
        this.textarea.value = value;
    }

    getValue() {
        return this.textarea.value;
    }

    onInput(callback) {
        this.textarea.addEventListener('input', () => {
            callback(this.getValue());
        })
    }

    onInputChange(callback) {
        this.textarea.addEventListener('change', () => {
            callback(this.getValue());
        });
    }
}

class AutoGrowTextArea extends TextAreaElement {
    constructor(placeholder = '', lineHeight = 24, maxHeight = 400) {
        super(placeholder);
        this.lineHeight = lineHeight;
        this.maxHeight = maxHeight;
        this.autoAdjust();
    }

    autoAdjust() {
        this.textarea.addEventListener('input', () => {
            this.textarea.style.height = this.calcHeight() + 'px';
        });
    }

    calcHeight(element) {
        return Math.min(this.textarea.value.split('\n').length * this.lineHeight, this.maxHeight);
    }

    setValue(value) {
        this.textarea.value = value;
        this.textarea.style.height = this.calcHeight() + 'px';
    }
}

class Icon extends HTMLImageElement {
    constructor(src, alt) {
        super();
        this.src = src;
        this.alt = alt;
    }

    onClick(callback) {
        this.addEventListener('click', callback);
    }

    setSrc(src) {
        this.src = src;
    }
}

class DropDownElement extends HTMLElement {
    constructor(items = [], defaultValue = '', title = '') {
        super();
        const dropdown = document.createElement('select');
        dropdown.title = title;

        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item;
            option.innerText = item;
            if (item === defaultValue) {
                option.selected = true;
            }
            dropdown.appendChild(option);
        });

        this.appendChild(dropdown);
        this.dropdown = dropdown;
    }

    getValue() {
        return this.dropdown.value;
    }

    onSelect(callback) {
        this.dropdown.addEventListener('change', () => {
            callback(this.getValue());
        });
    }
}

class DataList extends HTMLElement {
    constructor(type) {
        super();
        this.type = type;
        this.datalist = document.createElement('datalist');
        this.datalist.id = `${type}-datalist`;
        this.appendChild(this.datalist);
    }

    addOption(value, data) {
        const option = document.createElement('option');
        option.value = value;
        option.data = data;
        this.datalist.appendChild(option);
    }

    getId() {
        return this.datalist.id;
    }
}


customElements.define('input-element', InputElement);
customElements.define('textarea-element', TextAreaElement);
customElements.define('auto-grow-textarea', AutoGrowTextArea);
customElements.define('custom-icon', Icon, { extends: 'img'});
customElements.define('custom-dropdown', DropDownElement);
customElements.define('custom-datalist', DataList);