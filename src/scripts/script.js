const math_config = {
    number: 'number'
};

const mathjs = math.create(math.all, math_config);

class DraggableHTMLElement extends HTMLElement {
    constructor() {
        super();
        this.setAttribute('draggable', true);
        this.classList.add('draggable');
        this.addEventListener('dragstart', this.handleDragStart.bind(this));
        this.addEventListener('dragover', this.handleDragOver.bind(this));
        this.addEventListener('dragleave', this.handleDragLeave.bind(this));
        this.addEventListener('drop', this.handleDrop.bind(this));
    }

    handleDragStart(event) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/html', this.outerHTML);
        DraggableHTMLElement.currentDrag = this;
        DraggableHTMLElement.originalParent = this.parentNode;
    }

    handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';

        const targetRect = this.getBoundingClientRect();
        const halfwayPoint = targetRect.top + targetRect.height / 2;

        if (event.clientY < halfwayPoint) {
            this.classList.add('drag-top');
            this.classList.remove('drag-bottom');
        } else {
            this.classList.add('drag-bottom');
            this.classList.remove('drag-top');
        }
    }

    handleDragLeave(event) {
        this.classList.remove('drag-top', 'drag-bottom');
    }

    handleDrop(event) {
        event.preventDefault();
        this.classList.remove('drag-top', 'drag-bottom');
        if (DraggableHTMLElement.currentDrag && DraggableHTMLElement.currentDrag !== this) {
            const currentParent = this.parentNode;
            if (DraggableHTMLElement.originalParent.tagName === currentParent.tagName) {
                const targetRect = this.getBoundingClientRect();
                const halfwayPoint = targetRect.top + targetRect.height / 2;

                if (event.clientY < halfwayPoint) {
                    currentParent.insertBefore(DraggableHTMLElement.currentDrag, this);
                } else {
                    const nextSibling = this.nextElementSibling;
                    if (nextSibling) {
                        currentParent.insertBefore(DraggableHTMLElement.currentDrag, nextSibling);
                    } else {
                        currentParent.appendChild(DraggableHTMLElement.currentDrag);
                    }
                }
            }
        }
    }
}

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

    fromJson() { console.log('fromJson not implemented', this); }

    toJson() { console.log('toJson not implemented'); }
}

class DocumentationOption extends Option {
    constructor() {
        super('documentation');
        this.textarea = new AutoGrowTextArea('Write your documentation here');
        this.previewDiv = document.createElement('div');
        this.previewDiv.classList.add('hidden', 'preview');

        const toggleButton = document.createElement('button');
        toggleButton.innerText = 'Toggle Preview';
        toggleButton.addEventListener('click', () => {
            this.togglePreview();
        });

        this.content.append(this.textarea, this.previewDiv, toggleButton);
        this.isPreview = true;
        this.togglePreview();
    }

    togglePreview() {
        this.isPreview = !this.isPreview;
        if (this.isPreview) {
            this.previewDiv.innerHTML = DOMPurify.sanitize(marked.parse(this.textarea.getValue()));
        }
        this.textarea.classList.toggle('hidden', this.isPreview);
        this.previewDiv.classList.toggle('hidden', !this.isPreview);
    }

    fromJson(json) {
        this.textarea.setValue(json);
        this.togglePreview();
    }

    toJson() {
        return this.textarea.getValue();
    }
}

class simpleHeading extends HTMLHeadingElement {
    constructor(text) {
        super();
        this.textContent = text;
    }

    setText(text) {
        this.textContent = text;
    }
}

class VariableHeader extends InputElement {
    constructor(varEvaluator) {
        super();
        this.input.placeholder = 'variable name';
        this.currentValue = new simpleHeading('( not set )');
        this.dropdownIcon = new Icon('assets/dropdown.svg', 'dropdown icon');
        this.duplicateIcon = new Icon('assets/copy.svg', 'duplicate icon');
        this.deleteIcon = new Icon('assets/delete.svg', 'delete icon');
        this.append(this.currentValue, this.dropdownIcon, this.duplicateIcon, this.deleteIcon);

        this.varEvaluator = varEvaluator;
        this.onDropdown(() => {
            this.dropdownIcon.classList.toggle('dropdown');
        });
    }


    onDropdown(callback) {
        this.dropdownIcon.addEventListener('click', () => {
            callback();
        });
    }

    onDuplicate(callback) {
        this.duplicateIcon.addEventListener('click', () => {
            callback();
        });
    }

    onDelete(callback) {
        this.deleteIcon.addEventListener('click', () => {
            callback();
        });
    }

    setName(name) {
        this.input.value = name;
    }

    getName() {
        return this.input.value;
    }

    setValue(value) {
        value = this.varEvaluator.evaluateString(value) || 'not set';
        this.currentValue.setText(`( ${value} )`);
    }

    fromJson(json) {
        this.input.value = json.name;
    }

    toJson() {
        return {
            name: this.input.value
        }
    }
}

class VariableOption extends HTMLElement {
    constructor(title, defaultValue='using default value') {
        super();
        this.headingTitle = new simpleHeading(title);
        this.input = new InputElement(defaultValue);
        this.append(this.headingTitle, this.input);
    }

    onInput(callback) {
        this.input.onInput(callback);
    }

    setValue(value) {
        this.input.setValue(value);
    }

    getValue() {
        return this.input.getValue();
    }

    fromJson(json) {
        this.title.setText(json.title);
        this.input.setValue(json);
    }

    toJson() {
        return {
            title: this.title.textContent,
            value: getValue()
        }
    }
}

class VariableEditor extends HTMLElement {
    constructor(languages=['ENG', 'SP', 'GER', 'FR', 'IT', 'KOR', 'JP5', 'JP6']) {
        super();
        this.default = new VariableOption('default', 'default value');
        this.overrulingValues = new Map();
        for (const language of languages) {
            this.overrulingValues.set(language, new VariableOption(language));
        }
        this.append(this.default, ...this.overrulingValues.values());
    }

    onUpdate(callback) {
        this.default.onInput(callback);
        for (const overrule of this.overrulingValues.values()) {
            overrule.onInput(callback);
        }
    }

    getValue() {
        const language = LanguageInput.instance.getValue();
        return this.overrulingValues.get(language).getValue() || this.default.getValue();
    }

    fromJson(json) {
        this.default.setValue(json.default);
        for (const language in json.overrulingValues) {
            this.overrulingValues.get(language).setValue(json.overrulingValues[language]);
        }
    }

    toJson() {
        const overrulingValues = {};
        for (const [language, input] of this.overrulingValues.entries()) {
            overrulingValues[language] = input.getValue();
        }
        return {
            default: this.default.getValue(),
            overrulingValues: overrulingValues
        }
    }
}

class Variable extends DraggableHTMLElement {
    constructor(varEvaluator) {
        super();
        this.header = new VariableHeader(varEvaluator);
        this.editor = new VariableEditor();
        this.editor.classList.add('hidden');
        this.append(this.header, this.editor);

        this.header.onDropdown(() => {
            this.editor.classList.toggle('hidden');
        });

        this.header.onDelete(() => {
            this.remove();
        });

        this.editor.onUpdate(this.updateHeaderValue.bind(this));
        document.addEventListener('languageUpdate', this.updateHeaderValue.bind(this));
    }

    onDuplicate(callback) {
        this.header.onDuplicate(callback);
    }

    updateHeaderValue() {
        this.header.setValue(this.editor.getValue());
    }

    fromJson(json) {
        this.header.fromJson(json);
        this.editor.fromJson(json);
        this.updateHeaderValue();
    }

    toJson() {
        const json = this.header.toJson();
        Object.assign(json, this.editor.toJson());
        return json;
    }
}

class VariableGroup extends HTMLElement {
    constructor(varEvaluator) {
        super();
        this.varEvaluator = varEvaluator;
    }

    addVariable(json) {
        const variable = new Variable(this.varEvaluator);
        if (json) {
            variable.fromJson(json);
        }
        variable.onDuplicate(() => {
            this.addVariable(variable.toJson());
        });
        this.appendChild(variable);
    }

    fromJson(json) {
        for (const obj of json) {
            this.addVariable(obj);
        }
    }

    toJson(includeParsed=false) {
        const jsonArray = [];
        for (const variable of this.children) {
            const json = variable.toJson();
            if (includeParsed) {
                json.value = variable.editor.getValue();
            }
            jsonArray.push(json);
        }
        return jsonArray;
    }
}


class VariablesOption extends Option {
    constructor() {
        super('variables');
        this.variables = new VariableGroup(this);
        const addVariableButton = document.createElement('button');
        addVariableButton.innerText = 'Add Variable';
        addVariableButton.addEventListener('click', () => {
            this.variables.addVariable();
        });

        this.content.append(this.variables, addVariableButton);
    }

    fromJson(json) {
        this.variables.fromJson(json);
    }

    toJson(parsed = false) {
        if (parsed) {
            return this.getEvaluatedVariables();
        }
        return this.variables.toJson(false);
    }

    getParsableVariables() {
        const json = this.variables.toJson(true);
        let variables = [];
        for (const variable of json) {
            const variableJson = {
                name: variable.name,
                value: variable.value,
                default: variable.default
            };
            for (const language in variable.overrulingValues) {
                variableJson[language.toLowerCase()] = variable.overrulingValues[language];
            }
            variables.push(variableJson);
        }
        return variables;
    }

    mathEvaluation(expression, returnExpression) {
        try {
            return mathjs.evaluate(expression) || 0;
        } catch (evaluationError) {
            if (returnExpression) {
                return expression;
            }
            console.error('Error evaluating as mathExpression:', expression, ':', evaluationError);
            return 0;
        }
    }

    evaluateExpression(expression, variables, returnExpression, maxDepth=15) {
        try {
            const regex = /\[(.*?)\]/g;
            let previousExpression;
            let currentDepth = 0;
            do {
                previousExpression = expression;
                let match;
                while ((match = regex.exec(expression)) !== null) {
                    const parts = match[1].split('.');
                    const variableName = parts[0];
                    const property = parts[1] || 'value';
                    const variable = variables.find(v => v.name === variableName);
                    const variableValue = variable ? variable[property] : 0;
                    expression = expression.replace(match[0], variableValue);
                }
                regex.lastIndex = 0;
                currentDepth++;
            } while (expression !== previousExpression && currentDepth <= maxDepth);
            return this.mathEvaluation(expression, returnExpression)
        } catch (error) {
            console.error('Error processing expression:', expression, ':', error);
            if (returnExpression) {
                return expression;
            }
            return 0;
        }
    }

    getEvaluatedVariables() {
        let variables = this.getParsableVariables();

        const parsedJson = {};
        for (const variable of variables) {
            const name = variable.name;
            const value = variable.value;
            parsedJson[name] = this.evaluateExpression(value, variables) || 0;
        }
        return parsedJson;
    }

    getEvaluatedVariable(name) {
        return this.getEvaluatedVariables()[name];
    }

    evaluateString(expression, returnExpression=false) {
        const variables = this.getParsableVariables();
        return this.evaluateExpression(expression || '', variables, returnExpression);
    }
}

class MemorySizeInput extends InputElement {
    constructor() {
        super();
        this.input.placeholder = "0x0";
    }
}

class MemorySizeOption extends HTMLElement {
    constructor() {
        super();
        const textField = document.createElement('span');
        textField.textContent = 'Size:'
        this.sizeInput = new MemorySizeInput();
        this.append(textField, this.sizeInput);
    }

    getSizeInput() {
        return this.sizeInput;
    }
}

class MemoryByteInput extends InputElement {
    constructor() {
        super();
        this.input.placeholder = '0x0';
    }

    setActive(active) {
        this.input.classList.toggle('no-show', !active);
    }

    isActive() {
        return !this.input.classList.contains('no-show');
    }
}

class MemoryEditorBlock extends DraggableHTMLElement {
    constructor(varEvaluator) {
        super();
        this.varEvaluator = varEvaluator;
        this.maxByteCount = 120;
        this.createMemoryInputs();
    }

    createMemoryInputs() {
        this.sizeOption = new MemorySizeOption();
        this.sizeOption.getSizeInput().onInput(this.updateMemorySize.bind(this));

        this.memory = document.createElement('div');
        this.memory.classList.add('memory')

        for (let i = 0; i < this.maxByteCount; i++) {
            this.memory.appendChild(new MemoryByteInput());
        }

        this.appendChild(this.sizeOption);
        this.appendChild(this.memory);
    }

    getMemoryInputs() {
        return this.memory.children;
    }

    updateMemorySize(size) {
        size = this.varEvaluator.evaluateString(size);
        const memoryInputs = this.getMemoryInputs();
        for (let i = 0; i < memoryInputs.length; i++) {
            memoryInputs[i].setActive(i < size);
        }
    }

    fromJson(json) {
        this.sizeOption.getSizeInput().setValue(size);
        const size = this.varEvaluator.evaluateString(json.size);
        const memoryInputs = this.getMemoryInputs();
        for (let i = 0; i < size; i++) {
            memoryInputs[i].setValue(json.memory[i]);
        }
        this.updateMemorySize(size);
    }

    toJson(parsed=false) {
        const sizeString = this.sizeOption.getSizeInput().getValue();
        const size = this.varEvaluator.evaluateString(sizeString);

        const values = [];
        const memoryInputs = this.getMemoryInputs();
        for (let i = 0; i < size; i++) {
            if (memoryInputs[i].isActive()) {
                if (parsed) {
                    values.push(this.varEvaluator.evaluateString(memoryInputs[i].getValue()));
                } else {
                    values.push(memoryInputs[i].getValue());
                }
            }
        }

        return {
            type: "memory_editor",
            size: parsed ? size : sizeString,
            memory: values,
        };
    }

    toDataArray() {
        const json = this.toJson(true);
        const bytes = [];
        for (let byte of json.memory) {
            bytes.push({
                size: 'u8',
                value: byte
            })
        }
        return bytes;
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
                commandData['id'] = parseInt(id, 16);
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
            switch (typeof command) {
                case 'number':
                    if (commandData.id === command) {
                        return commandData;
                    }
                    break;
                case 'string':
                    if (commandData.command_name === command) {
                        return commandData;
                    }
                    break;
            }
        }
    }
}

class CommandInput extends InputElement {
    constructor(varEvaluator) {
        super();
        this.varEvaluator = varEvaluator;
        this.input.setAttribute('list', CommandDataList.instance.getId());
        this.input.autocomplete = 'on';
        this.input.placeholder = 'command';
    }

    evaluateString(expression, dispatch) {
        const result = this.varEvaluator.evaluateString(expression, true);
        if (dispatch) {
            const evaluationEvent = new CustomEvent("evaluateString", {
                detail: this
            });
            this.dispatchEvent(evaluationEvent);
        }
        return result;
    }

    onEvaluation(callback) {
        this.onInput(callback);
        this.addEventListener('evaluateString', () => {
            callback(this.evaluateString(this.getValue(), false));
        });
    }

    onInput(callback) {
        this.input.addEventListener('input', () => {
            callback(this.evaluateString(this.getValue(), false));
        });
    }

    toJson(parsed=false) {
        if (parsed) {
            const commandData = CommandDataList.instance.getCommandInfo(this.evaluateString(this.getValue(), true));
            return commandData ? commandData.id : 0;
        }
        return this.getValue();
    }

    toDataArray() {
        return [
            {
                size: "u16",
                value: this.toJson(true)
            }
        ];
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
    constructor(varEvaluator) {
        super();
        this.varEvaluator = varEvaluator;
        this.previousCommandInfo = null;
    }

    fromCommand(command) {
        const commandInfo = CommandDataList.instance.getCommandInfo(command);
        if (!commandInfo || commandInfo == this.previousCommandInfo) {
            return;
        }
        this.previousCommandInfo = commandInfo;
        this.fromJson(commandInfo.parameters);
    }

    fromJson(json) {
        while (this.firstChild) {
            this.removeChild(this.firstChild);
        }

        json.forEach(param => {
            this.appendChild(new ParamInput(param));
        });
    }

    toJson(parsed=false) {
        const json = [];
        for (const param of this.children) {
            const paramJson = {
                name: param.input.placeholder,
                size: param.size
            }
            if (parsed) {
                paramJson['value'] = this.varEvaluator.evaluateString(param.input.value)
            } else {
                paramJson['value'] = param.input.value;
            }
            json.push(paramJson)
        }
        return json;
    }

    toDataArray() {
        return this.toJson(true);
    }
}

class CommandBlock extends DraggableHTMLElement {
    constructor(varEvaluator) {
        super();
        this.varEvaluator = varEvaluator;
        this.command = new CommandInput(this.varEvaluator);
        this.parameters = new ParamList(this.varEvaluator);
        this.command.onEvaluation(this.parameters.fromCommand.bind(this.parameters));
        this.append(this.command, this.parameters);

        const deleteButton = new Icon('assets/delete.svg', 'delete icon');
        deleteButton.addEventListener('click', () => {
            this.remove();
        });

        this.append(deleteButton);
    }

    fromJson(json) {
        this.command.input.value = json.name;
        this.parameters.fromJson(json.parameters);
    }

    toJson(parsed=false) {
        return {
            type: 'command',
            name: this.command.toJson(parsed),
            parameters: this.parameters.toJson(parsed)
        };
    }

    toDataArray() {
        const commandByteArray = this.command.toDataArray();
        const parametersByteArray = this.parameters.toDataArray();
        return commandByteArray.concat(parametersByteArray);
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
        this.dropdown = new Icon('assets/dropdown.svg', 'dropdown icon');
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
    constructor(varEvaluator) {
        super();
        this.varEvaluator = varEvaluator;
    }

    addBlock(type, json) {
        let block;
        switch(type) {
            case 'command':
                block = new CommandBlock(this.varEvaluator);
                break;
            case 'memory_editor':
                block = new MemoryEditorBlock(this.varEvaluator);
                break;
            default:
                console.error('Invalid block type:', type);
                return;
        }

        if (json) {
            block.fromJson(json);
        }
        this.appendChild(block);
    }

    fromJson(json) {
        if (!json) {
            return;
        }
        for (const obj of json) {
            this.addBlock(obj.type, obj);
        }
    }

    toJson(parsed=false) {
        const json = [];
        for (const block of this.children) {
            json.push(block.toJson(parsed));
        }
        return json;
    }

    toDataArray() {
        let bytes = [];
        for (const block of this.children) {
            bytes = bytes.concat(block.toDataArray());
        }
        return bytes;
    }
}

class CodeOption extends Option {
    constructor(varEvaluator) {
        super('code', 'script / code');
        this.codeGroup = new CodeGroup(varEvaluator);
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

    toJson(parsed=false) {
        return this.codeGroup.toJson(parsed);
    }

    toDataArray() {
        return this.codeGroup.toDataArray();
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
        return colorCode.match(/[A-Za-z0-9]{2}/g).map(val => parseInt(val, 16));
    }

    onColorChange(callback) {
        this.input.addEventListener('input', () => {
            callback(this.hexToList(this.input.value));
        });
    }

    getColor() {
        return this.hexToList(this.input.value)
    }

    fromJson(json) {
        this.setColor(json);
    }

    toJson() {
        return this.getColor();
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
        this.input.value = json;
    }
}

class ScriptOptionList extends HTMLElement {
    constructor() {
        super();
        this.toolbar = new Toolbar();
        const optionContainer = document.createElement('div');
        this.documentation = new DocumentationOption();
        this.variables = new VariablesOption();
        this.code = new CodeOption(this.variables);
        optionContainer.append(
            this.documentation,
            this.variables,
            this.code
        )

        this.append(this.toolbar, optionContainer);
    }

    fromJson(json) {
        this.toolbar.fromJson(json.title);
        this.documentation.fromJson(json.documentation);
        this.variables.fromJson(json.variables);
        this.code.fromJson(json.code);
    }

    toJson() {
        return {
            title: this.toolbar.input.value,
            documentation: this.documentation.toJson(),
            variables: this.variables.toJson(),
            code: this.code.toJson()
        }
    }

    toDataArray() {
        return this.code.toDataArray();
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

        this.enabled = false;

        this.attachSignals();
    }

    getColor() {
        return this.colorSwatch.getColor();
    }

    attachSignals() {
        const scriptChangeEvent = new CustomEvent('scriptChange', {
            detail: this
        });

        this.onSelect(() => {
            document.dispatchEvent(scriptChangeEvent);
            if (this.enabled) {
                const scriptChangeEvent = new CustomEvent('scriptSelected', {
                    detail: this
                });
                document.dispatchEvent(scriptChangeEvent);
            }
        });
    }

    onDelete(callback) {

    }

    dispatchSelectEvent() {
        if (this.enabled) {
            const scriptChangeEvent = new CustomEvent('scriptSelected', {
                detail: this
            });
            document.dispatchEvent(scriptChangeEvent);
        }
    }

    setSelected(enable) {
        if (this.enabled === enable) {
            return;
        }

        this.classList.toggle('selected', enable);
        this.enabled = enable;
        this.dispatchSelectEvent();
    }

    onSelect(callback) {
        this.addEventListener('onSelect', () => {
            callback(this);
        });

        this.addEventListener('click', () => {
            callback(this);
        });

        this.addEventListener('change', () => {
            callback(this);
        });

        this.colorSwatch.onColorChange(() => {
            callback(this);
        });
    }

    fromJson(json) {
        this.colorSwatch.fromJson(json.color);
        this.optionList.fromJson(json);
    }

    toJson() {
        let json = {
            color: this.colorSwatch.toJson()
        };
        return Object.assign(json, this.optionList.toJson());
    }

    toDataArray() {
        return this.optionList.toDataArray();
    }

    toByteArray() {
        const dataArray = this.toDataArray();
        let byteArray = [];

        dataArray.forEach(item => {
            let value = item.value;
            let byteCount = parseInt(item.size.slice(1)) / 8;
            let bytes = [];

            for (let i = 0; i < byteCount; i++) {
                bytes.push(value & 0xFF);
                value >>= 8;
            }

            byteArray = byteArray.concat(bytes);
        });

        return byteArray;
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

    toJson() {
        const json = {
            scripts: []
        };
        for (const script of this.children) {
            json.scripts.push(script.toJson());
        }
        return json;
    }

    setSelectedScript(script) {
        for (const child of this.children) {
            child.setSelected(child === script);
        }
    }

    addScript(json) {
        const script = new Script();
        if (json) {
            script.fromJson(json);
        }
        this.append(script);
        this.setSelectedScript(script);
        script.onSelect(this.setSelectedScript.bind(this));
    }

    dispatchSelectedScript() {
        for (const child of this.children) {
            if (child.enabled) {
                child.dispatchSelectEvent();
                break;
            }
        }
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

class GameSelectorMulti extends HTMLElement {
    constructor(games=['diamond', 'pearl', 'platinum']) {
        super();
        this.games = new Map();
        for (const game of games) {
            const icon = new Icon(`assets/${game}.png`, `${game} icon`);
            icon.classList.add('faded');
            icon.addEventListener('click', () => {
                icon.classList.toggle('faded');
            });
            this.games.set(game, icon);
        }
        this.append(...this.games.values());
    }

    toJson() {
        const json = [];
        for (const [game, icon] of this.games.entries()) {
            if (!icon.classList.contains('faded')) {
                json.push(game);
            }
        }
        return json;
    }
}
class DownloadPopup extends HTMLElement {
    constructor(scriptData) {
        super();
        this.scriptData = scriptData;
        this.classList.add('popup');

        const titleInput = new InputElement();
        titleInput.input.value = this.scriptData.title;

        const descriptionInput = new InputElement('Description (max 250 words)');
        descriptionInput.input.maxLength = 250;

        const authorInput = new InputElement('Author(s)');
        const supportedGames = new GameSelectorMulti();

        const downloadButton = document.createElement('button');
        downloadButton.innerText = 'Download';
        downloadButton.addEventListener('click', () => {
            this.downloadScript(
                titleInput.getValue(),
                descriptionInput.getValue(),
                authorInput.getValue(),
                supportedGames
            );
        });

        this.append(
            new SearchHeading('Download Script'),
            titleInput,
            descriptionInput,
            authorInput,
            supportedGames,
            downloadButton
        );
    }

    downloadScript(title, description, author, supportedGames) {
        const json = {
            title: title,
            description: description,
            author: author,
            supported: supportedGames.toJson(),
            scripts: this.scriptData.scripts
        };

        const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.remove();

        const downloadEvent = new CustomEvent('downloadScript', {
            detail: json
        });
        this.dispatchEvent(downloadEvent);
    }

    onDownload(callback) {
        this.downloadButton.addEventListener('downloadScript', () => {
            callback(this);
        });
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
        this.download.onDownload(callback);
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
        this.content = document.createElement('div');
        this.content.append(this.toolbar, this.scripts);
        this.append(this.fileSelector);

        this.toolbar.onDownload(() => {
            const downloadPopup = new DownloadPopup(this.toJson());
            document.body.append(downloadPopup);
        });

        this.toolbar.onUpload(() => {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.json';
            fileInput.addEventListener('change', () => {
                const file = fileInput.files[0];
                const reader = new FileReader();
                reader.onload = () => {
                    this.fromJson(JSON.parse(reader.result));
                }
                reader.readAsText(file);
            });
            fileInput.click();
        });

        this.toolbar.onCreateScript(this.scripts.addScript.bind(this.scripts));

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
        this.scripts.dispatchSelectedScript();
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

    toJson() {
        return {
            title: this.fileSelector.getValue(),
            scripts: this.scripts.toJson()
        }
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
customElements.define('variable-header', VariableHeader);
customElements.define('simple-heading', simpleHeading, { extends: 'h5' });
customElements.define('variable-option', VariableOption);
customElements.define('variable-editor', VariableEditor);
customElements.define('variable-element', Variable);
customElements.define('variable-group', VariableGroup);
customElements.define('variables-option', VariablesOption);
customElements.define('memory-size-input', MemorySizeInput);
customElements.define('memory-size-option', MemorySizeOption);
customElements.define('memory-byte-input', MemoryByteInput);
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
customElements.define('game-selector-multi', GameSelectorMulti);
customElements.define('download-popup', DownloadPopup);
customElements.define('script-group-list', ScriptGroupList);
customElements.define('script-group-area', ScriptGroupArea);
customElements.define('script-group-list-wrapper', ScriptGroupListWrapper);
customElements.define('script-group-manager', ScriptGroupManager);
customElements.define('draggable-html-element', DraggableHTMLElement);
