// Global variables
let datalists = {};

let variableWrapper = null;
let scriptHandler = null;
let currentDrag = null;

class IconFactory {
    // function that returns a delete icon
    static getDeleteIcon(tag, parent=null, message=null,  eventListener=true) {
        // create the delete icon
        const deleteIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        deleteIcon.setAttribute('viewBox', '0 0 24 24');
        deleteIcon.setAttribute('preserveAspectRatio', 'xMidYMid meet')
        deleteIcon.classList.add('icon-1', tag);
        deleteIcon.innerHTML = '<path d="M0 0h24v24H0z" fill="none"/><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path>';
        if (eventListener) {
            deleteIcon.addEventListener('click', () => {
                const confirmDelete = confirm(message);
                if (confirmDelete) {
                parent.remove();
                }
            });
        }
        // return the delete icon
        return deleteIcon;
    }

    // function that returns a add icon
    static getPlusIcon(tag) {
        // create the add icon
        const addIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        addIcon.setAttribute('viewBox', '0 0 24 24');
        addIcon.setAttribute('preserveAspectRatio', 'xMidYMid meet')
        addIcon.classList.add('icon-0', tag, 'add-icon');
        addIcon.innerHTML = `<path d="M10.8,22.8V13.2H1.2a1.2,1.2,0,0,1,0-2.4h9.6V1.2a1.2,1.2,0,1,1,2.4,0v9.6h9.6a1.2,1.2,0,1,1,0,2.4H13.2v9.6a1.2,1.2,0,0,1-2.4,0Z"></path>`;
        // return the add icon
        return addIcon;
    }
}

// VariableGroup: this class will be used to store variables

class VariableGroup {
    // variables
    variableGroupElement = null;
    variableElements = [];
    titleElement = null;
    callback = null
  
    // constructor
    constructor(parent, script, callback, isGlobal = false) {
        this.callback = callback
        this.createVariableGroup(parent, script, isGlobal);
        if (isGlobal) { this.variableGroupElement.classList.add('global-variables'); }
    }
  
    // function to create the variable group
    createVariableGroup(parent, script, isGlobal = false) {
        let title = script ? script.title.titleElement.firstElementChild.value || "Script Title" : "Script Title";
        if (isGlobal) {
            title = "Global Variables";
        }

        const variableGroupElement = document.createElement('div');
        variableGroupElement.classList.add('variable-group');

        const variableTitleElement = document.createElement('div');
        variableTitleElement.classList.add('variable-title');

        const addButtonElement = IconFactory.getPlusIcon('create-variable');
        addButtonElement.alt = 'plus icon';
        addButtonElement.addEventListener('click', () => {
            this.addVariableElement(variableGroupElement);
        });

        variableTitleElement.appendChild(addButtonElement);
    
        const titleHeadingElement = document.createElement('h4');
        titleHeadingElement.innerText = title;
        variableTitleElement.appendChild(titleHeadingElement);
        this.titleElement = titleHeadingElement;
    
        variableGroupElement.appendChild(variableTitleElement);
        
        this.variableGroupElement = variableGroupElement;

        parent.appendChild(variableGroupElement);
    }
  
    // function to add a variable element
    addVariableElement(parent) {
        const variableElement = document.createElement('div');
        variableElement.classList.add('variable');
    
        const languageElement = document.createElement('div');
        const languageInputElement = document.createElement('input');
        languageInputElement.classList.add('variable-language');
        languageInputElement.setAttribute('autocomplete', 'on');
        languageInputElement.setAttribute('list', 'datalist-languages');
        languageInputElement.placeholder = 'language';
        languageElement.appendChild(languageInputElement);

        const variableNameElement = document.createElement('div');
        const variableNameInputElement = document.createElement('input');
        variableNameInputElement.classList.add('variable-name');
        variableNameInputElement.setAttribute('type', 'text');
        variableNameInputElement.placeholder = 'Variable Name';
        variableNameElement.appendChild(variableNameInputElement);

        const variableValueElement = document.createElement('div');
        const variableValueInputElement = document.createElement('input');
        variableValueInputElement.classList.add('variable-value');
        variableValueInputElement.setAttribute('type', 'text');
        variableValueInputElement.placeholder = 'Variable Value';
        variableValueElement.appendChild(variableValueInputElement);

        variableElement.appendChild(languageElement);
        variableElement.appendChild(variableNameElement);
        variableElement.appendChild(variableValueElement);
    
        parent.appendChild(variableElement);
        this.variableElements.push(variableElement);   
        
        this.addLanguageVisibilityListener(variableElement, languageElement);
        return variableElement;
    }

    addLanguageVisibilityListener(parent, languageElement) {
        if (this.callback !== null) {
            languageElement.addEventListener('change', () => {
                this.callback(parent);
            });
            
            this.callback(parent);
        }
    }

    // function to update the title
    updateTitle(title) {
        if (title == "" || title == null) { title = "Script Title" }
        this.titleElement.innerText = title;
    }

    // function to update the variable group from json
    updateVariableGroupFromJson(variableGroupJson) {
        for (const variableJson of variableGroupJson) {
            const variableElement = this.addVariableElement(this.variableGroupElement);
            const languageElement = variableElement.querySelector('.variable-language')
            languageElement.value = variableJson.language;
            this.addLanguageVisibilityListener(variableElement, languageElement);
            variableElement.querySelector('.variable-name').value = variableJson.name;
            variableElement.querySelector('.variable-value').value = variableJson.value;
        }
    }

    addEventListeners(script) {
        // if any update is made to the variable group, update the dot artist
        this.variableGroupElement.addEventListener('change', () => {
            scriptHandler.updateSelectedScript();
        });
        if (!script) { return; }

        script.title.titleElement.firstElementChild.addEventListener('input', () => {
            this.updateTitle(script.title.titleElement.firstElementChild.value);
        });
    }
  }
  
// VariableWrapper: this class will be used to store variable groups

class VariableWrapper {
    // variables
    variableWrapperElement = null;
    variableGroups = [];
    globalVariableGroup = null;
    languageConfig = null;

    // constructor
    constructor() {
        this.createVariableWrapper();
        this.addLanguageListeners()
    }

    addLanguageListeners() {
        this.languageConfig = document.querySelector('.language-config');
        datalists["datalist-languages"].addDynamicEventListeners(this.languageConfig);

        this.languageConfig.addEventListener('change', (event) => {
            this.setLanguageVisibilityAll();
            scriptHandler.updateSelectedScript();
        })

        this.setLanguageVisibilityAll(); // initialize once
    }


    setLanguageVisibilityAll() {
        const language = document.querySelector('.language-config').value;
        const languageVariableElements = document.querySelectorAll('.variable')
        let element = null;
        let valueOptions = [language, 'All', null, undefined, '']

        for (let variableElement of languageVariableElements) {
            element = variableElement.querySelector('.variable-language');
            variableElement.classList.remove("hidden")

            if (!valueOptions.includes(element.value) && !(language == 'All')) {
                variableElement.classList.add("hidden")
            }
        }
    }

    setLanguageVisibility(parent) {
        const language = document.querySelector('.language-config').value;
        const element = parent.querySelector('.variable-language');

        let valueOptions = [language, 'All', null, undefined, '']

        parent.classList.remove("hidden")
        if (!valueOptions.includes(element.value) && !(language == 'All')) {
            console.log(element.value, language)
            parent.classList.add("hidden")
        }
    }

    // function to create the variable wrapper
    createVariableWrapper() {
        // the variable wrapper is already created in the html file, tag with id 'variable-wrapper'
        this.variableWrapperElement = document.querySelector('.variable-container');
        this.globalVariableGroup = this.addVariableGroup(null, true)
        // load global variables from json
        const globalVariableJson = [
            {
            "language": "All",
            "name": "byte_code_offset",
            "value": "0"
            }
        ];
        this.globalVariableGroup.updateVariableGroupFromJson(globalVariableJson);
    }

    // function to add a variable group
    addVariableGroup(script, isGlobal = false) {
        const variableGroup = new VariableGroup(this.variableWrapperElement, script, this.setLanguageVisibility, isGlobal);
        variableGroup.addEventListeners(script);

        this.variableGroups.push(variableGroup);
        return variableGroup;
    }

}

// CommandInput: this class handles multiple commands

class CommandInput {
    // variables
    commandInputElement = null;
    command = null;
    paramElements = {};

    // constructor
    constructor(parent) {
        this.createCommandInputElement(parent);
    }

    // function to create the command input element
    createCommandInputElement(parent) {
        const commandInputElement = document.createElement('div');
        commandInputElement.classList.add('command-input');

        this.addCommandItems(commandInputElement);

        parent.appendChild(commandInputElement);
        this.commandInputElement = commandInputElement;
    }

    // function to add an empty command to the command input
    addCommandItems(parent) {
        const commandInputItem = document.createElement('div');
        commandInputItem.classList.add('command-input-cmd');

        this.setCommandOptions(commandInputItem);
        parent.appendChild(commandInputItem);
    }

    // function to get the command options
    setCommandOptions(parent) {
        const commandSelection = new DynamicValidationInput(datalists['datalist-commands'])

        commandSelection.placeholder = 'Command';
        commandSelection.conversionType = 'options';
        commandSelection.bitSize = "u16";

        // Add event listener for input selection
        commandSelection.addEventListener('input', this.handleCommandSelection.bind(this));
        parent.appendChild(commandSelection);
    }

    // function to handle command selection
    handleCommandSelection(event) {
        const selectedCommand = event.target.value;
        const commandId = datalists["datalist-commands"].getOptionIdByName(selectedCommand, false);
        if (commandId === null) {return; }
        // Clear previous command parameters
        this.clearCommandParams();

        // Add command parameters based on selection
        this.command = datalists["datalist-commands"].json[commandId];
        const parameters = this.command.parameters || [];

        for (let i = 0; i < parameters.length; i++) {
            const parameter = parameters[i];
            this.addCommandParameter(parameter, i);
        }
    }

    // function to clear command parameters
    clearCommandParams() {
        for (const paramName in this.paramElements) {
            const paramElement = this.paramElements[paramName];
            paramElement.remove();
        }
        this.paramElements = {};
    }

    // function to add a command parameter
    addCommandParameter(parameter, index) {
        const paramName = parameter.name;
        const paramSize = parameter.size;
        const paramType = parameter.type || "number";
        const paramDescription = parameter.description || "No description available";
        

        const paramContainer = document.createElement('div');
        paramContainer.classList.add('command-input-param');
        paramContainer.setAttribute('param_name', paramName);
        paramContainer.setAttribute('description', paramDescription);

        const paramInput = document.createElement('input');
        if (parameter.default_value) {
            paramInput.value = parameter.default_value;
        }
        if (paramType === 'options') {
            new DynamicValidationInput(datalists[parameter.datalist_name], paramInput)
            paramInput.placeholder = paramName;

        } else if (paramType === 'number') {
            paramInput.type = 'text'; // Change the input type to 'text' to allow hexadecimal input
            paramInput.placeholder = paramName;
         
        } else {
            console.log(`Unsupported parameter type: ${paramType}`); return;
        }

        paramInput.bitSize = paramSize;
        paramInput.conversionType = paramType;
        paramContainer.appendChild(paramInput);
        this.paramElements[paramName] = paramContainer;
        this.commandInputElement.appendChild(paramContainer);
    }

    // function to set the commandName
    setCommandName(commandName) {
        this.commandInputElement.firstElementChild.firstElementChild.value = commandName;
        // Trigger the input event to update the command parameters
        this.commandInputElement.firstElementChild.firstElementChild.dispatchEvent(new Event('input'));
    }

    // function to set the command parameters
    setCommandParameters(commandParams) {
        for (let commandParam of commandParams) {
            const paramName = commandParam.name;
            const paramValue = commandParam.value;
            const paramElement = this.paramElements[paramName];
            if (!paramElement) {continue; }
            const paramInputElement = paramElement.firstElementChild;
            paramInputElement.value = paramValue;
        }
    }
}

// Command: this class will be used to store the command data

class Command {
    // variables
    commandElement = null;
    commandInput = null;

    // constructor
    constructor(parent) {
        this.createCommandElement(parent);
    }

    // function to create the command element
    createCommandElement(parent) {
        const commandElement = document.createElement('div');
        commandElement.classList.add('command');

        const commandInputDeleteButton = IconFactory.getDeleteIcon("command-delete", commandElement, 'Are you sure you want to to delete this command?');
        commandElement.appendChild(commandInputDeleteButton);        

        const commandInput = new CommandInput(commandElement);
        this.commandInput = commandInput;

        const commandOutputElement = document.createElement('div');
        commandOutputElement.classList.add('command-output');
        commandElement.appendChild(commandOutputElement);
        parent.appendChild(commandElement);
        this.commandElement = commandElement;

        this.addDragandDrop(parent, commandElement);
    }

    addDragandDrop(parent, commandElement) { 
        // Drag start event listener
        function handleDragStart(event) {
            // check if user is currently on any input field (not the event's target)
            let activeElement = document.activeElement;
            if (activeElement.tagName === 'INPUT') {
                event.preventDefault();
                return;
            }
            currentDrag = this;
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/html', this.innerHTML);
        }
    
        // Drag over event listener
        function handleDragOver(event) {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            return false;
        }
    
        // Drop event listener
        function handleDrop(event) {
            if (currentDrag && currentDrag !== this) {
                const targetRect = this.getBoundingClientRect();
                const halfwayPoint = targetRect.top + targetRect.height / 2;
    
                if (event.clientY < halfwayPoint) {
                    parent.insertBefore(currentDrag, this);
                } else {
                    const nextSibling = this.nextElementSibling;
                    if (nextSibling) {
                        parent.insertBefore(currentDrag, nextSibling);
                    } else {
                        parent.appendChild(currentDrag);
                    }
                }
            }

            event.stopPropagation();
            const changeEvent = new Event('change', { bubbles: true });
            this.dispatchEvent(changeEvent);

            return false;
        }

        commandElement.setAttribute('draggable', true);
        commandElement.addEventListener('dragstart', handleDragStart, false);
        commandElement.addEventListener('dragover', handleDragOver, false);
        commandElement.addEventListener('drop', handleDrop, false);
    }

    // function to set the command name
    setCommandName(commandName) {
        this.commandInput.setCommandName(commandName);
    }

    // function to set the command parameters
    setCommandParameters(commandParameters) {
        this.commandInput.setCommandParameters(commandParameters);
    }

}

// RawBytes: this class will be used to store the raw bytes data

class RawBytes {
    // variables
    rawBytesElement = null;

    // constructor
    constructor(parent) {
        this.createRawBytesElement(parent);
    }

    // function to create the raw bytes element
    createRawBytesElement(parent) {
        const rawBytesElement = document.createElement('div');
        rawBytesElement.classList.add('raw-bytes');

        const rawBytesContainer = document.createElement('div');
        rawBytesContainer.classList.add('raw-bytes-container');

        const rawBytesDeleteButton = IconFactory.getDeleteIcon("raw-bytes-delete", rawBytesElement, 'Are you sure you want to to delete this element?');
        rawBytesElement.appendChild(rawBytesDeleteButton);

        const rawBytesInput = document.createElement('input');
        rawBytesInput.type = 'text';
        rawBytesInput.placeholder = 'Raw bytes';
        rawBytesInput.classList.add('raw-bytes-input');
        rawBytesContainer.appendChild(rawBytesInput);

        const rawBytesRepeatInput = document.createElement('input');
        rawBytesRepeatInput.type = 'text';
        rawBytesRepeatInput.placeholder = 'Repetitions';
        rawBytesRepeatInput.classList.add('raw-bytes-repeat-input');
        rawBytesContainer.appendChild(rawBytesRepeatInput);

        rawBytesElement.appendChild(rawBytesContainer);
        this.rawBytesElement = rawBytesElement;
        parent.appendChild(rawBytesElement);
        this.addDragandDrop(parent, rawBytesElement);
    }

    // function to add drag and drop functionality
    addDragandDrop(parent, rawBytes) { 
        // Drag start event listener
        function handleDragStart(event) {
            // check if user is currently on any input field (not the event's target)
            let activeElement = document.activeElement;
            if (activeElement.tagName === 'INPUT') {
                event.preventDefault();
                return;
            }
            currentDrag = this;
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/html', this.innerHTML);
        }
    
        // Drag over event listener
        function handleDragOver(event) {
            // check if user is currently on any input field (not the event's target)
            let activeElement = document.activeElement;
            if (activeElement.tagName === 'INPUT') {
                return;
            }
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            return false;
        }
    
        // Drop event listener
        function handleDrop(event) {
            if (currentDrag && currentDrag !== this) {
                const targetRect = this.getBoundingClientRect();
                const halfwayPoint = targetRect.top + targetRect.height / 2;
    
                if (event.clientY < halfwayPoint) {
                    parent.insertBefore(currentDrag, this);
                } else {
                    const nextSibling = this.nextElementSibling;
                    if (nextSibling) {
                        parent.insertBefore(currentDrag, nextSibling);
                    } else {
                        parent.appendChild(currentDrag);
                    }
                }
            }

            event.stopPropagation();
            const changeEvent = new Event('change', { bubbles: true });
            this.dispatchEvent(changeEvent);
            return false;
        }

        rawBytes.setAttribute('draggable', true);
        rawBytes.addEventListener('dragstart', handleDragStart, false);
        rawBytes.addEventListener('dragover', handleDragOver, false);
        rawBytes.addEventListener('drop', handleDrop, false);
    }

    // function to set the raw bytes
    setRawBytes(rawBytes) {
        this.rawBytesElement.querySelector('.raw-bytes-input').value = rawBytes;
    }

    // function to set the repetitions
    setRepetitions(repetitions) {
        this.rawBytesElement.querySelector('.raw-bytes-repeat-input').value = repetitions;
    }

    // function to set both the raw bytes and the repetitions
    setRawBytesAndRepetitions(rawBytes, repetitions) {
        this.setRawBytes(rawBytes);
        this.setRepetitions(repetitions);
    }

}

// CommandWrapper: this class will be used to store the commands

class CommandWrapper {
    // variables
    commandWrapperElement = null;
    inputElements = [];

    // constructor
    constructor(parent) {
        this.createCommandWrapperElement(parent);
    }

    // function to create the command wrapper element
    createCommandWrapperElement(parent) {
        const commandWrapperElement = document.createElement('div');
        commandWrapperElement.classList.add('script-commands');

        parent.appendChild(commandWrapperElement);
        this.commandWrapperElement = commandWrapperElement;
    }

    // function to add command
    addCommand(commandName=undefined, params=undefined) {
        // create a new command
        const command = new Command(this.commandWrapperElement);
        if (commandName) {
            // add the command to the commands
            command.setCommandName(commandName);
        }
        if (params) {
            // set the params
            command.setCommandParameters(params);
        }
        // add the command to the commands
        this.inputElements.push(command);
        return command;
    }

    // function to add raw bytes
    addRawBytes(bytes=undefined, repetitions=undefined) {
        // create a new command
        const rawBytes = new RawBytes(this.commandWrapperElement);
        if (bytes) {
            rawBytes.setRawBytes(bytes);
        }
        if (repetitions) {
            rawBytes.setRepetitions(repetitions);
        }
        // add the command to the commands
        this.inputElements.push(rawBytes);
        return rawBytes;
    }

    // function to add input field from json
    addInputFieldFromJson(inputFieldJson) {
        switch(inputFieldJson.type) {
            case 'command':
                const command = this.addCommand(inputFieldJson.name, inputFieldJson.parameters);
                break;
            case 'raw_bytes':
                const rawBytes = this.addRawBytes(inputFieldJson.raw_bytes, inputFieldJson.repetitions);
                break;
        }
    }
   
}

// CommandCreate: this class will be used to store the command create data

class CommandCreate {
    // variables
    addInputWrapperElement = null;
    optionWrapperElement = null;
    addCommandButtonElement = null;
    addRawBytesButtonElement = null;

    // constructor
    constructor(parent) {
        this.createInputAdders(parent);
    }

    // function to create the command create element
    createInputAdders(parent) {
        const addInputWrapperElement = document.createElement('div');
        addInputWrapperElement.classList.add('command-create-wrapper');
        addInputWrapperElement.addEventListener('mouseleave', () => {
            addInputWrapperElement.classList.remove('dropdown');
        });

        const optionWrapperElement = document.createElement('div');
        optionWrapperElement.classList.add('option-wrapper');
    
        const options = [
            { type: 'command', icon: 'command-add', text: 'Add Command' },
            { type: 'raw-bytes', icon: 'raw-bytes-add', text: 'Add Raw Bytes' }
        ];

        options.forEach(option => {
            const addWrapperElement = document.createElement('div');
            addWrapperElement.classList.add(`${option.type}-create`, 'dropdown-content');
    
            const addButtonElement = IconFactory.getPlusIcon(option.icon);
            addButtonElement.alt = 'add icon';
            addWrapperElement.appendChild(addButtonElement);
    
            const addTextElement = document.createElement('span');
            addTextElement.classList.add(`${option.type}-add-text`);
            addTextElement.innerText = option.text;

            addWrapperElement.appendChild(addTextElement);
            optionWrapperElement.appendChild(addWrapperElement);
        });

        addInputWrapperElement.appendChild(optionWrapperElement);
    
        // Dropdown icon
        const dropdownIconElement = document.createElement('span');
        dropdownIconElement.classList.add('dropdown-icon');
        dropdownIconElement.innerText = '▼';
        dropdownIconElement.addEventListener('click', () => {
            addInputWrapperElement.classList.toggle('dropdown');
        });
        addInputWrapperElement.appendChild(dropdownIconElement);

        parent.appendChild(addInputWrapperElement);

        this.optionWrapperElement = optionWrapperElement;
        this.addCommandButtonElement = addInputWrapperElement.querySelector('.command-create');
        this.addCommandButtonElement.classList.add('current-option');
        this.addRawBytesButtonElement = addInputWrapperElement.querySelector('.raw-bytes-create');
        this.addInputWrapperElement = addInputWrapperElement;
    }    
}

// ScriptTitle: this class will be used to store the script title data

class ScriptTitle {
    // variables
    titleElement = null;
    deleteButton = null;

    // constructor
    constructor(parent, scriptElement) {
        this.createScriptTitleElement(parent, scriptElement);
    }

    // function to create the script title element
    createScriptTitleElement(parent, scriptElement) {
        const scriptTitleElement = document.createElement('div');
        scriptTitleElement.classList.add('script-toolbar');
    
        const titleText = document.createElement('input');
        titleText.classList.add('title-text');
        titleText.placeholder = 'Script Title';
        scriptTitleElement.appendChild(titleText);

        const scriptDeleteButton = IconFactory.getDeleteIcon("script-delete", scriptElement, 'Would you like to delete this script?' , false);
        scriptTitleElement.appendChild(scriptDeleteButton);  
        this.deleteButton = scriptDeleteButton;
  
        parent.appendChild(scriptTitleElement);
        this.titleElement = scriptTitleElement;
    }
}

// Script: this class will be used to store the script data

class Script {
    // variables
    color = null;
    scriptElement = null;
    colorSwatchElement = null;
    commandWrapper = null;
    title = null;
    commandCreate = null;
    variableGroup = null;

    // constructor
    constructor(dotArtist, selectionCallback, color = [180, 180, 180]) {
        this.color = `${color[0]}, ${color[1]}, ${color[2]}`;
        this.createScriptElement(color, dotArtist);
        this.variableGroup = variableWrapper.addVariableGroup(this);
        this.addDeleteButtonEventListener(this.title.deleteButton, this.scriptElement, this.variableGroup, selectionCallback);
    }

    // function to add command create
    addCommandCreate(parent) {
        // create a command create element
        const commandCreate = new CommandCreate(parent);

        const setCurrent = (addWrapperElement) => {
            commandCreate.optionWrapperElement.childNodes.forEach(opt => {
                opt.classList.remove('current-option');
            });

            addWrapperElement.classList.add('current-option');
            commandCreate.addInputWrapperElement.classList.remove('dropdown');
        };

        // add event listener to the add button
        commandCreate.addCommandButtonElement.addEventListener('click', () => {
            if (commandCreate.addInputWrapperElement.classList.contains('dropdown')) {
                setCurrent(commandCreate.addCommandButtonElement);
                return;
            }
            // create a new command
            this.commandWrapper.addCommand();
        });

        commandCreate.addRawBytesButtonElement.addEventListener('click', () => {
            if (commandCreate.addInputWrapperElement.classList.contains('dropdown')) {
                setCurrent(commandCreate.addRawBytesButtonElement);
                return;
            }
            // create a new command
            this.commandWrapper.addRawBytes();
        });
        // set the add command create element
        this.commandCreate = commandCreate;
    }

    // function to create the script element
    createScriptElement(color, dotArtist) {
        const scriptContainer = document.querySelector('.script-editor');

        // Create the script element
        const scriptElement = document.createElement('div');
        scriptElement.classList.add('script');
        scriptElement.style.setProperty('--main-color', this.color);

        // Create the script group element
        const colorSwatchElement = document.createElement('input');
        colorSwatchElement.type = 'color';
        colorSwatchElement.value = `#${color[0].toString(16)}${color[1].toString(16)}${color[2].toString(16)}`
        colorSwatchElement.classList.add('script-color-swatch');

        colorSwatchElement.addEventListener('input', () => {
            const colorCode = colorSwatchElement.value;
            const colorArray = colorCode.match(/[A-Za-z0-9]{2}/g).map(val => parseInt(val, 16));
            const color = `${colorArray[0]}, ${colorArray[1]}, ${colorArray[2]}`;
            this.changeScriptColor(color);
            dotArtist.changeDotArtistBackgroundColor(`rgb(${color})`);
        });


        scriptElement.appendChild(colorSwatchElement);
        this.colorSwatchElement = colorSwatchElement;

        // Create the script info element
        const scriptInfoElement = document.createElement('div');
        scriptInfoElement.classList.add('script-info');
        scriptElement.appendChild(scriptInfoElement);

        // Create the script title element
        this.title = new ScriptTitle(scriptInfoElement, scriptElement);

        // Create the script commands element
        this.commandWrapper = new CommandWrapper(scriptInfoElement);

        // Create the command create element
        this.addCommandCreate(scriptInfoElement);

        // Append the script element to the script container
        scriptContainer.appendChild(scriptElement);
        this.scriptElement = scriptElement;

        // add event listener for any change to the script element or its children
        scriptElement.addEventListener('change', () => {
            if (this.scriptElement) {
                dotArtist.convertScriptToDotArtist(this);
            }
        });
    }

    // add event listener to delete the script and variable group associated with it
    addDeleteButtonEventListener(button, scriptElement, variableGroup, selectionCallback) {
        button.addEventListener('click', () => {
            // confirm the delete
            if (!confirm('Are you sure you want to delete this script?')) {
                return;
            }
            // remove the script element
            scriptElement.remove();
            // remove the variable group
            variableGroup.variableGroupElement.remove();
            // call the selection callback
            selectionCallback(this);
        });
    }

    // function to change the script color
    changeScriptColor(color) {
        this.color = color;
        this.scriptElement.style.setProperty('--main-color', this.color);
        const colorArray = color.split(',').map(val => parseInt(val));
        this.colorSwatchElement.value =  `#${colorArray[0].toString(16)}${colorArray[1].toString(16)}${colorArray[2].toString(16)}`
    }

    // function to change the script color from hex
    changeScriptColorFromHex(hex) {
        // convert the hex to rgb
        const rgb = [...hex.matchAll(/[0-9A-F]{2}/gi)].map((hex) => parseInt(hex, 16)).join(', ');
        // change the script color
        this.changeScriptColor(`${rgb.r}, ${rgb.g}, ${rgb.b}`);
    }

    // function to set the script selection
    setSelection(selection) {
        // set the script selection
        this.scriptElement.classList.toggle('selected', selection);
    }

    // function to add input field from json 
    addInputFieldFromJson(inputFieldJson) {
        // add the input field
        this.commandWrapper.addInputFieldFromJson(inputFieldJson);
    }

    // function to add the variable group from json
    updateVariableGroupFromJson(variableGroupJson) {
        // add the variable group
        this.variableGroup.updateVariableGroupFromJson(variableGroupJson);
        this.variableGroup.updateTitle(this.title.titleElement.firstElementChild.value);
    }
}

// ScriptHandler: this class will handle the script elements

class ScriptHandler {
    // variables
    scripts = [];
    dotArtistConverter = new DotArtistConverter();
    jsonExporter = new JsonExporter();

    // function to select a script and deselect the other scripts
    selectScript(script) {
        const scriptElement = script.scriptElement;
        // unselect the other scripts
        const scriptElements = document.querySelectorAll('.script-editor .script');
        scriptElements.forEach((element) => {
          element.classList.remove('selected');
        });
      
        // check if script.scriptElement is inside scriptElements
        const scriptElementArray = [...scriptElements];
        if (!scriptElementArray.includes(scriptElement)) {
            return;
        }
        scriptElement.classList.add('selected');
        this.dotArtistConverter.convertScriptToDotArtist(script);
    }

    // function to reset the selection
    resetSelection = (script) => {
        this.removeScript(script);
        // unselect the other scripts
        const scriptElements = document.querySelectorAll('.script-editor .script');
        if (scriptElements.length === 0) {
            this.dotArtistConverter.resetDotArtist();
            return;
        }

        scriptElements.forEach((element) => {
            element.classList.remove('selected');
        });

        // select the first script
        const firstScript = scriptElements[0];

        // dispatch a click event
        const clickEvent = new Event('click');
        firstScript.dispatchEvent(clickEvent);
    }

    // remove the script from the scripts array
    removeScript(script) {
        // remove the script from the scripts array
        this.scripts = this.scripts.filter((scriptElement) => scriptElement !== script);
    }

    // function to add an empty script element
    addScriptElement(color=undefined, select=true, addDefaultCommand=true) {
        // create a new script element
        const script = new Script(this.dotArtistConverter, this.resetSelection, color);
        if (addDefaultCommand) {
            script.commandWrapper.addCommand();
        }
        // add event handler so if the script is clicked, it will be selected, and the other scripts will be deselected
        script.scriptElement.addEventListener('click', () => {
            // select the script
            this.selectScript(script);
        });

        // select the script
        if (select) {this.selectScript(script);}

        this.scripts.push(script);
        return script;
    }

        // function to add event listeners
    addEventListeners() {
        // add event listeners
        // first, create-script button
        const createScriptButton = document.querySelector('.create-script');
        createScriptButton.addEventListener('click', () => {
            // add a script element
            this.addScriptElement();
        });
    }

    // function to export the scripts
    exportScripts() {
        let json = this.jsonExporter.exportScripts(this.scripts);
        return json;
    }

    addScriptFromJson(json) {
        // create a new script element
        if (!json.color) {
            json.color = '180, 180, 180';
        }
        const color = json.color.split(',').map(val => parseInt(val));
        const script = this.addScriptElement(color, true, false);

        // set the title
        script.title.titleElement.firstElementChild.value = json.title;

        // set the commands & raw bytes
        for (let inputField of json.input_fields) {
            script.addInputFieldFromJson(inputField);
        }        
        script.updateVariableGroupFromJson(json.variables);
        // run change event to update the script
        script.scriptElement.dispatchEvent(new Event('change'));
        return script;
    }

    // function to import the scripts
    importScripts(json) {
        for (let script of json) {
            this.addScriptFromJson(script);
        }
    }

    // function to add the import and export buttons
    addToolbarEventListeners() {
        // select the top bar of the script area
        let searchInput = document.querySelector('.script-search')

        searchInput.addEventListener('change', () => {
                const scriptInfo = datalists['datalist-scripts'].getOptionByName(searchInput.value);
                if (!scriptInfo) {return;}
                importScriptsFromSearch(scriptInfo)
                searchInput.value = ''
            }
        )

        const uploadButton = document.querySelector('.upload-icon');

        uploadButton.addEventListener('click', () => {
            // Create a file input element dynamically
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.json';
        
            // Listen for changes when a file is selected
            fileInput.addEventListener('change', (event) => {
                const file = event.target.files[0];
        
                // Create a FileReader object to read the contents of the file
                const reader = new FileReader();
        
                reader.onload = (fileEvent) => {
                    try {
                        const json = JSON.parse(fileEvent.target.result);
                        this.importScripts(json);
                    } catch (error) {
                        console.error('Error parsing JSON:', error);
                    }
                };
        
                reader.readAsText(file);
            });
        
            // Trigger the file input click event programmatically
            fileInput.click();
        });

        const downloadIcon = document.querySelector('.download-icon');

        downloadIcon.addEventListener('click', () => {
            // Get the JSON data to export
            const json = this.exportScripts();
        
            // Create a Blob object from the JSON data
            const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
        
            // Create a temporary URL for the Blob object
            const url = URL.createObjectURL(blob);
        
            // Create a temporary anchor element to trigger the download
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            let title = "exported_scripts"; // maybe in the future, the user can choose a title
            downloadLink.download = `${title}.json`;
        
            // Trigger the click event on the anchor element programmatically
            downloadLink.click();
        
            // Clean up by revoking the temporary URL
            URL.revokeObjectURL(url);
        });
    }

    updateSelectedScript() {
        let selectedScript = this.scripts.find(script => script.scriptElement.classList.contains('selected'));
        if (selectedScript) {
            this.dotArtistConverter.convertScriptToDotArtist(selectedScript);
        }
    }
}

const getJsonFromUrl = async function(url) {
    return fetch(url).then((response) => 
        response.json()).then((responseJson) => {
            return responseJson;
        }).catch((error) => {
        console.error('Error:', error);
    });   
}

const getFilesFromGithub = async function(user, repository, directory="") {
    const url = `https://api.github.com/repos/${user}/${repository}/contents/${directory}`
    return fetch(url).then(response => response.json())
        .then(data => {
            return data;
        }).catch(error => {
        console.error('Error:', error);
  });
}

const importScriptsFromSearch = async function(file) {
    const json = await getJsonFromUrl(file.download_url)
    scriptHandler.importScripts(json);
}

document.addEventListener("DOMContentLoaded", async function () {
    // add data lists to the document
    const commands = await getJsonFromUrl(`data/command_data.json`);
    datalists["datalist-commands"] = new CommandDataList(document.documentElement, commands);
    const species = await getJsonFromUrl(`data/species_data.json`);
    datalists["datalist-species"] = new SpeciesDataList(document.documentElement, species);
    const items = await getJsonFromUrl(`data/item_data.json`);
    datalists["datalist-items"] = new ItemDataList(document.documentElement, items);
    const maps = await getJsonFromUrl(`data/map_data.json`);
    datalists["datalist-maps"] = new MapDataList(document.documentElement, maps);
    const moves = await getJsonFromUrl(`data/move_data.json`);
    datalists["datalist-moves"] = new MoveDataList(document.documentElement, moves);
    const languages = ["All", "English", "Japanese", "French", "Italian", "German", "Spanish", "Korean"];
    datalists["datalist-languages"] = new LanguageDataList(document.documentElement, languages);
    const scriptFiles = await getFilesFromGithub(`VoidmatrixTeam`, `Voidmatrix`, `script_conversion/market`)
    datalists["datalist-scripts"] = new ScriptDataList(document.documentElement, scriptFiles)

    // global VariableWrapper
    variableWrapper = new VariableWrapper();

    // initialize the script handler
    scriptHandler = new ScriptHandler();
    scriptHandler.addEventListeners();
    scriptHandler.addScriptElement(); // add a default first script element
    scriptHandler.addToolbarEventListeners();
});