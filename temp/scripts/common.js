// DOM Shadow replaces the dom element with 'div' or 'input' if you inherit from them.
// Create helpers to not have to adhere to abhorent design decisions.

class InputElement extends HTMLElement {
    constructor() {
        super();
        const input = document.createElement('input');
        this.appendChild(input);
        this.input = input;
    }

    setValue(value) {
        this.input.value = value;
    }

    getValue() {
        return this.input.value;
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

class Icon extends HTMLImageElement {
    constructor(src, alt) {
        super();
        this.src = src;
        this.alt = alt;
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
customElements.define('custom-icon', Icon, { extends: 'img'});
customElements.define('custom-dropdown', DropDownElement);
customElements.define('custom-datalist', DataList);