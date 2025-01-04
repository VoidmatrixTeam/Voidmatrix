class OptionTitle extends HTMLHeadingElement {
    constructor(text) {
        super();
        this.textContent = text;
    }
}

class Option extends HTMLElement {
    constructor(group, text) {
        super();
        const container = document.createElement('div');
        const icon = new Icon(`assets/${group}.svg`, `${group} icon`);
        const title = new OptionTitle(text || group);
        this.content = document.createElement('div');
        this.content.classList.add('hidden', 'content');
        container.append(icon, title);
        this.append(container, this.content);

        container.addEventListener('click', () => {
            this.content.classList.toggle('hidden');
        });
    }

    fromJson() {

    }
}

class DocumentationOption extends Option {
    constructor() {
        super('documentation');
    }
}

class VariablesOption extends Option {
    constructor() {
        super('variables');
    }
}

class MemoryEditorBlock extends HTMLElement {
    constructor() {
        super();
        this.size = 0;
        this.createMemoryInputs();
    }

    createMemoryInputs() {
        const container = document.createElement('div');
        container.classList.add('memory-editor-bytes');

        const sizeContainer = document.createElement('div');
        sizeContainer.classList.add('memory-size-container');

        const sizeText = document.createElement('span');
        sizeText.classList.add('memory-size-text');
        sizeText.textContent = 'Size:';

        this.sizeInput = document.createElement('input');
        this.sizeInput.classList.add('memory-size-input');
        this.sizeInput.placeholder = '0x0';
        this.sizeInput.addEventListener('input', (event) => this.updateSize(event.target.value));

        sizeContainer.appendChild(sizeText);
        sizeContainer.appendChild(this.sizeInput);

        for (let i = 0; i < 120; i++) {
            const input = document.createElement('input');
            input.type = 'text';
            input.classList.add('memory-byte');
            input.placeholder = '0x0';
            if (i >= 120) input.classList.add('no-show');
            container.appendChild(input);
        }

        this.appendChild(sizeContainer);
        this.appendChild(container);
        
    }

    updateSize(value, clear=false) {
        const newSize = parseInt(value, 16);
        if (isNaN(newSize) || newSize < 0 || newSize > 120) return;

        this.setSize(newSize, clear);
        console.log(this.sizeInput);
        this.sizeInput.value = value;
    }

    setSize(newSize, clear) {
        this.size = newSize;
        const memoryInputs = this.querySelectorAll('.memory-byte');
        for (let i = 0; i < 120; i++) {
            if (i < this.size) {
                memoryInputs[i].classList.remove('no-show');
            } else {
                memoryInputs[i].classList.add('no-show');
                if (clear) {
                    memoryInputs[i].value = '0x0';
                }
            }
        }
    }

    fromJson(json) {
        const memoryInputs = this.querySelectorAll('.memory-byte');
        const size = json.memory.length;
        this.updateSize(`0x${size.toString(16)}`, true);

        for (let i = 0; i < size; i++) {
            memoryInputs[i].value = json.memory[i];
        }
    }

    toJson() {
        const memoryInputs = this.querySelectorAll('.memory-byte');
        const values = [];

        for (let i = 0; i < this.size; i++) {
            if (memoryInputs[i].value) {
                values.push(memoryInputs[i].value);
            }
        }

        return {
            type: "memory_editor",
            size: this.size,
            memory: values
        };
    }
}

class CommandDataList extends DataList {
    constructor() {
        if (CommandDataList.instance) {
            return CommandDataList.instance;
        }
        super('command');
        this.addOptions();

        CommandDataList.instance = this;
    }

    async addOptions() {
        try {
            const response = await fetch('data/command_data.json');
            const json = await response.json();
            for (const id in json) {
                const commandData = json[id];
                commandData['id'] = id;
                this.addOption(commandData.command_name, commandData)
            }
            this.json = json;
        } catch (error) {
            console.error('Error loading command data:', error);
        }
    }

    getCommandInfo(command) {
        for (const id in this.json) {
            const commandData = this.json[id];
            if (commandData.command_name === command) {
                commandData['id'] = id;
                return commandData;
            }
        }
    }
}

class CommandInput extends InputElement {
    constructor() {
        super();
        this.input.setAttribute('list', CommandDataList.instance.getId());
        this.input.autocomplete = 'on';
        this.input.placeholder = 'command';
    }

    onInput(callback) {
        this.input.addEventListener('input', () => {
            callback(this.input.value);
        })
    }
}

class ParamInput extends InputElement {
    constructor(param) {
        super();
        switch(param.type) {
            case undefined:
            case 'text':
                break;
            case 'options':
                this.input.setAttribute('list', param.datalist_name);
                this.input.autocomplete = 'on';
                break;
        }
        this.input.placeholder = param.name
        this.size = param.size;
        this.input.value = param.value || '';
    }
}

class ParamList extends HTMLElement {
    constructor() {
        super();
    }

    fromJson(parameters) {
        while (this.firstChild) {
            this.removeChild(this.firstChild);
        }

        parameters.forEach(param => {
            this.appendChild(new ParamInput(param));
        });
    }

    fromCommand(command) {
        const commandInfo = CommandDataList.instance.getCommandInfo(command);
        if (!commandInfo) {
            return;
        }
        this.fromJson(commandInfo.parameters);
    }
}

class CommandBlock extends HTMLElement {
    constructor() {
        super();
        this.command = new CommandInput();
        this.parameters = new ParamList();
        this.command.onInput(this.parameters.fromCommand.bind(this.parameters));
        this.append(this.command, this.parameters);
    }

    toJson() {

    }

    fromJson(json) {
        this.command.input.value = json.name;
        this.parameters.fromJson(json.parameters);
    }
}


class CodeCreateOption extends HTMLElement {
    constructor(option) {
        super();
        this.icon = new Icon('assets/add.svg', 'add icon');
        this.option = document.createElement('span');
        this.option.textContent = option;
        this.append(this.icon, this.option);
    }

    onClick(callback) {
        this.addEventListener('click', () => {
            callback(this);
        })
    }

    setSelected(enable) {
        this.selected = enable;
        this.classList.toggle('hidden', !enable);
    }
}
class CodeCreateBlock extends HTMLElement {
    constructor(options={'Add Command' : 'command', 'Add Memory Editor': 'memory_editor'}) {
        super();
        this.optionWrapper = document.createElement('div');
        this.options = [];
        for (const option in options) {
            const createOption = new CodeCreateOption(option);
            createOption.setSelected(false);
            createOption.onClick(this.handleOptionClick.bind(this))
            createOption.type = options[option];
            this.options.push(createOption);
        }
        if (this.options.length > 0) {
            this.options[0].setSelected(true);
        }
        this.dropdown = document.createElement('span');
        this.dropdown.textContent = '▼';
        this.dropdown.enabled = false;
        this.dropdown.addEventListener('click', () => {
            this.toggleDropdown();
        });
        this.optionWrapper.append(...this.options);
        this.append(this.optionWrapper, this.dropdown);
    }

    toggleDropdown() {
        this.setDropdown(!this.dropdown.enabled);
    }

    setDropdown(enabled) {
        this.dropdown.enabled = enabled;
        this.classList.toggle('dropdown');
    }

    onCreate(callback) {
        this.create_callback = callback;
    }

    handleOptionClick(optionElement) {
        if (this.dropdown.enabled) {
            for (const option of this.options) {
                option.setSelected(option === optionElement);
            }
            this.setDropdown(false);
        } else {
            this.create_callback(optionElement.type);
        }

    }
}

class CodeGroup extends HTMLElement {
    constructor() {
        super();
    }

    addBlock(type, json) {
        console.log(type)
        let block;
        switch(type) {
            case 'command':
                block = new CommandBlock();
                break;
            case 'memory_editor':
                block = new MemoryEditorBlock();
                break;
            default:
                return;
        }

        if (block) {
            if (json) {
                block.fromJson(json);
            }
            this.appendChild(block);
        }
    }

    fromJson(json) {
        for (const obj of json.code) {
            this.addBlock(obj.type, obj);
        }
    }
}

class CodeOption extends Option {
    constructor() {
        super('code', 'script / code');
        this.codeGroup = new CodeGroup();
        this.create = new CodeCreateBlock();
        this.create.onCreate(this.codeGroup.addBlock.bind(this.codeGroup));
        this.content.append(this.codeGroup, this.create);
    }

    setColor(color) {
        this.style.setProperty('--main-color', color);
    }

    fromJson(json) {
        this.codeGroup.fromJson(json);
    }
}

class ScriptColorSwatch extends InputElement {
    constructor() {
        super();
        this.input.type = 'color';
    }

    setColor(color) {
        this.input.value = `#${color.map(c => c.toString(16).padStart(2, '0')).join('')}`;
        this.input.dispatchEvent(new Event('input'));
    }

    hexToList(colorCode) {
        const colorArray = colorCode.match(/[A-Za-z0-9]{2}/g).map(val => parseInt(val, 16));
        return colorArray.join(', ');
    }

    onColorChange(callback) {
        this.input.addEventListener('input', () => {
            callback(this.hexToList(this.input.value));
        });
    }

    fromJson(json) {
        this.setColor(json.color);
    }

    getColor() {
        return this.hexToList(this.input.value)
    }
}

class Toolbar extends InputElement {
    constructor() {
        super();
        this.input.placeholder = 'Script Title';
    }

    onTitleChange(callback) {
        this.input.addEventListener('input', () => {
            callback(this.input.value);
        });
    }

    fromJson(json) {
        this.input.value = json.title;
    }
}

class ScriptOptionList extends HTMLElement {
    constructor() {
        super();
        this.toolbar = new Toolbar();
        const optionContainer = document.createElement('div');
        this.documentation = new DocumentationOption();
        this.variables = new VariablesOption();
        this.code = new CodeOption();
        optionContainer.append(
            this.documentation,
            this.variables,
            this.code
        )

        this.append(this.toolbar, optionContainer);
    }

    fromJson(json) {
        this.toolbar.fromJson(json);
        this.documentation.fromJson(json);
        this.variables.fromJson(json);
        this.code.fromJson(json);
    }
}

class Script extends HTMLElement {
    constructor() {
        super();
        this.colorSwatch = new ScriptColorSwatch();
        this.optionList = new ScriptOptionList();

        this.colorSwatch.onColorChange(this.optionList.code.setColor.bind(this.optionList.code));
        this.colorSwatch.setColor([115, 181, 115]);

        this.append(this.colorSwatch, this.optionList);
    }

    onDelete(callback) {

    }

    onSelect(callback) {

    }

    onUpdate(callback) {
        // add callbacks for dot artist here
    }

    fromJson(json) {
        this.colorSwatch.fromJson(json);
        this.optionList.fromJson(json);
    }
}

class ScriptList extends HTMLElement {
    constructor() {
        super();
    }

    fromJson(json) {
        for (const scriptObject of json.scripts) {
            this.addScript(scriptObject);
        }
    }

    addScript(json) {
        const script = new Script();
        if (json) {
            script.fromJson(json);
        }
        this.append(script);
    }
}

class ScriptFileSelector extends InputElement {
    constructor() {
        super();
        this.input.placeholder = 'script_title';
        this.delete = new Icon('assets/delete.svg', 'delete icon');
        this.append(this.delete);

        this.selected = false;
        this.onSelect(this.setSelected.bind(this));
    }

    onDelete(callback) {
        this.delete.addEventListener('click', (event) => {
            event.stopPropagation();
            callback(this);
        })
    }

    select() {
        this.click();
    }

    onSelect(callback) {
        this.addEventListener('click', () => {
            callback(true, this);
        });
    }

    setSelected(enable) {
        this.selected = enable;
        this.classList.toggle('selected', enable);
    }

    fromJson(json) {
        this.input.value = json.title;
    }
}

class ScriptCreate extends HTMLElement {
    constructor() {
        super();
        this.icon = new Icon('assets/add.svg', 'add icon');
        this.text = document.createElement('h5')
        this.text.textContent = 'Create Script';
        this.append(this.icon, this.text);
    }
}

class ScriptGroupToolbar extends HTMLElement {
    constructor() {
        super();
        this.create = new ScriptCreate();
        this.download = new Icon('assets/download.svg', 'download icon');
        this.upload = new Icon('assets/upload.svg', 'upload icon');
        this.append(this.create, this.download, this.upload);
    }

    onCreateScript(callback) {
        this.create.addEventListener('click', () => {
            callback();
        })
    }

    onDownload(callback) {
        this.download.addEventListener('click', () => {
            callback();
        })
    }

    onUpload(callback) {
        this.upload.addEventListener('click', () => {
            callback();
        })
    }
}

class ScriptGroup extends HTMLElement {
    constructor() {
        super();
        this.fileSelector = new ScriptFileSelector();
        this.toolbar = new ScriptGroupToolbar();
        this.scripts = new ScriptList();
        this.toolbar.onCreateScript(this.scripts.addScript.bind(this.scripts));
        this.content = document.createElement('div');
        this.content.append(this.toolbar, this.scripts);
        this.append(this.fileSelector);

        this.onSelect(this.setSelected.bind(this));
        this.setSelected();
    }

    onSelect(callback) {
        this.fileSelector.onSelect(callback);
    }

    onDelete(callback) {
        this.fileSelector.onDelete(callback);
    }

    setSelected() {
        ScriptGroupArea.instance.setContent(this.content);
    }

    setVisibility(enabled) {
        if (enabled) {
            this.classList.remove('hidden');
        } else {
            this.classList.add('hidden');
        }
    }

    fromJson(json) {
        json = json  || this.getNewScriptJson();
        this.fileSelector.fromJson(json);
        this.scripts.fromJson(json);
    }

    getNewScriptJson() {
        const json = {
            'title': 'script_file',
            'scripts': [
                {
                    'title': 'script title',
                    'color': [115, 181, 115],
                    'documentation': '',
                    'variables': [],
                    'code': [
                        {
                            "type": "command",
                            "name": "",
                            "parameters": []
                        },
                        {
                            "type": "command",
                            "name": "End",
                            "parameters": []
                        }
                    ]
                }
            ]
        }
        return json;
    }
}

class ScriptGroupList extends HTMLElement {
    constructor() {
        if (ScriptGroupList.instance) {
            return ScriptGroupList.instance;
        }
        super();
        ScriptGroupList.instance = this;
    }

    addScriptGroup(json) {
        const scriptGroup = new ScriptGroup();
        scriptGroup.fromJson(json);
        scriptGroup.onSelect(this.clearSelections.bind(this));
        scriptGroup.onDelete(this.deleteGroup.bind(this));
        this.append(scriptGroup);

        scriptGroup.fileSelector.select();
    }

    clearSelections(enable, selector) {
        for (const group of this.children) {
            const fileSelector = group.fileSelector;
            if (fileSelector !== selector) {
                fileSelector.setSelected(false);
            }
        }
    }

    deleteGroup(selector) {
        const isSelected = selector.selected;
        for (const group of this.children) {
            if (group.fileSelector === selector) {
                this.removeChild(group);
                break;
            }
        }
        if (this.children.length == 0) {
            this.addScriptGroup();
        }
        if (isSelected) {
            this.children[0].fileSelector.select();
        }
    }
}

class ScriptGroupListWrapper extends HTMLElement {
    constructor() {
        super();
        this.scriptGroups = new ScriptGroupList();
        this.scriptGroups.addScriptGroup();
        this.create = new Icon('assets/add.svg', 'add icon');
        this.onCreateScript(this.scriptGroups.addScriptGroup.bind(this.scriptGroups));
        this.append(
            this.scriptGroups,
            this.create,
        );
    }

    onCreateScript(callback) {
        this.create.addEventListener('click', () => {
            callback();
        })
    }
}

class ScriptGroupArea extends HTMLElement {
    constructor() {
        if (ScriptGroupArea.instance) {
            return ScriptGroupArea.instance;
        }
        super();
        ScriptGroupArea.instance = this;
    }

    setContent(content) {
        this.innerHTML = '';
        this.append(content);
    }
}

class ScriptGroupManager extends HTMLElement {
    constructor() {
        super();
        if (ScriptGroupManager.instance) {
            return ScriptGroupManager.instance;
        }
        this.scriptGroupArea = new ScriptGroupArea();
        this.scriptGroupListWrapper = new ScriptGroupListWrapper();
        this.append(
            this.scriptGroupListWrapper,
            this.scriptGroupArea
        );
        ScriptGroupManager.instance = this;
    }
}

customElements.define('option-title', OptionTitle, { extends: 'h5' });
customElements.define('custom-option', Option);
customElements.define('documentation-option', DocumentationOption);
customElements.define('variables-option', VariablesOption);
customElements.define('memory-block', MemoryEditorBlock);
customElements.define('command-datalist', CommandDataList);
customElements.define('command-input', CommandInput);
customElements.define('code-block', CommandBlock);
customElements.define('code-create-option', CodeCreateOption);
customElements.define('code-create-block', CodeCreateBlock);
customElements.define('code-parameter', ParamInput);
customElements.define('code-parameter-list', ParamList);
customElements.define('code-group', CodeGroup);
customElements.define('code-option', CodeOption);
customElements.define('script-color-swatch', ScriptColorSwatch);
customElements.define('script-toolbar', Toolbar);
customElements.define('script-option-list', ScriptOptionList);
customElements.define('custom-script', Script);
customElements.define('script-list', ScriptList);
customElements.define('script-file-selector', ScriptFileSelector);
customElements.define('script-create', ScriptCreate);
customElements.define('script-group-toolbar', ScriptGroupToolbar);
customElements.define('script-group', ScriptGroup);
customElements.define('script-group-list', ScriptGroupList);
customElements.define('script-group-area', ScriptGroupArea);
customElements.define('script-group-list-wrapper', ScriptGroupListWrapper);
customElements.define('script-group-manager', ScriptGroupManager);


document.addEventListener("DOMContentLoaded", async function () {
    const body = document.querySelector('body');
    const commandDataList = new CommandDataList();
    body.appendChild(commandDataList);
    const wrapper = document.querySelector('.left-panel-content');
    const script = new ScriptGroupManager();
    wrapper.appendChild(script);
});
