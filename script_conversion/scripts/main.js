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
        deleteIcon.classList.add('button', tag);
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
        addIcon.classList.add('button', tag);
        addIcon.innerHTML = `<path d="M10.8,22.8V13.2H1.2a1.2,1.2,0,0,1,0-2.4h9.6V1.2a1.2,1.2,0,1,1,2.4,0v9.6h9.6a1.2,1.2,0,1,1,0,2.4H13.2v9.6a1.2,1.2,0,0,1-2.4,0Z"></path>`;
        // return the add icon
        return addIcon;
    }

    static getUploadIcon(tag) {
        // create the upload icon
        const uploadIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        uploadIcon.setAttribute('viewBox', '0 -960 960 960');
        uploadIcon.setAttribute('preserveAspectRatio', 'xMidYMid meet')
        uploadIcon.classList.add('button', tag);
        uploadIcon.innerHTML = `<path d="M452-202h60v-201l82 82 42-42-156-152-154 154 42 42 84-84v201ZM220-80q-24 0-42-18t-18-42v-680q0-24 18-42t42-18h361l219 219v521q0 24-18 42t-42 18H220Zm331-554v-186H220v680h520v-494H551ZM220-820v186-186 680-680Z"/></path>`;
        // return the upload icon
        return uploadIcon;
    }

    static getDownloadIcon(tag) {
        // create the download icon
        const downloadIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        downloadIcon.setAttribute('viewBox', '0 -960 960 960');
        downloadIcon.setAttribute('preserveAspectRatio', 'xMidYMid meet')
        downloadIcon.classList.add('button', tag);
        downloadIcon.innerHTML = `<path d="M840-683v503q0 24-18 42t-42 18H180q-24 0-42-18t-18-42v-600q0-24 18-42t42-18h503l157 157Zm-60 27L656-780H180v600h600v-476ZM479.765-245Q523-245 553.5-275.265q30.5-30.264 30.5-73.5Q584-392 553.735-422.5q-30.264-30.5-73.5-30.5Q437-453 406.5-422.735q-30.5 30.264-30.5 73.5Q376-306 406.265-275.5q30.264 30.5 73.5 30.5ZM233-584h358v-143H233v143Zm-53-72v476-600 124Z"/></path>`;
        // return the download icon
        return downloadIcon;
    }

    static getMarketIcon(tag) {
        // create the download icon
        const downloadIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        downloadIcon.setAttribute('viewBox', '0 -960 960 960');
        downloadIcon.setAttribute('preserveAspectRatio', 'xMidYMid meet')
        downloadIcon.classList.add('button', tag);
        downloadIcon.innerHTML = `<path d="M840-683v503q0 24-18 42t-42 18H180q-24 0-42-18t-18-42v-600q0-24 18-42t42-18h503l157 157Zm-60 27L656-780H180v600h600v-476ZM479.765-245Q523-245 553.5-275.265q30.5-30.264 30.5-73.5Q584-392 553.735-422.5q-30.264-30.5-73.5-30.5Q437-453 406.5-422.735q-30.5 30.264-30.5 73.5Q376-306 406.265-275.5q30.264 30.5 73.5 30.5ZM233-584h358v-143H233v143Zm-53-72v476-600 124Z"/></path>`;
        // return the download icon
        return downloadIcon;
    }

}

// VariableGroup: this class will be used to store variables

class VariableGroup {
    // variables
    variableGroupElement = null;
    variableElements = [];
    titleElement = null;
  
    // constructor
    constructor(parent, scriptTitle) {
        this.createVariableGroup(parent, scriptTitle);
    }
  
    // function to create the variable group
    createVariableGroup(parent, title) {
        const variableGroupElement = document.createElement('div');
        variableGroupElement.classList.add('variable-group');
    
        const variableTitleElement = document.createElement('div');
        variableTitleElement.classList.add('variable-title');
    
        const titleHeadingElement = document.createElement('h4');
        titleHeadingElement.innerText = title;
        variableTitleElement.appendChild(titleHeadingElement);
        this.titleElement = titleHeadingElement;
    
        const addButtonElement = IconFactory.getPlusIcon('create-variable');
        addButtonElement.alt = 'plus icon';
        addButtonElement.addEventListener('click', () => {
            this.addVariableElement(variableGroupElement);
        });

        variableTitleElement.appendChild(addButtonElement);
    
        variableGroupElement.appendChild(variableTitleElement);
    
        parent.appendChild(variableGroupElement);
        this.variableGroupElement = variableGroupElement;
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
        return variableElement;
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
            variableElement.querySelector('.variable-language').value = variableJson.language;
            variableElement.querySelector('.variable-name').value = variableJson.name;
            variableElement.querySelector('.variable-value').value = variableJson.value;
        }
    }

  }
  
// VariableWrapper: this class will be used to store variable groups

class VariableWrapper {
    // variables
    variableWrapperElement = null;
    variableGroups = [];

    // constructor
    constructor() {
        this.createVariableWrapper();
    }

    // function to create the variable wrapper
    createVariableWrapper() {
        // the variable wrapper is already created in the html file, tag with id 'variable-wrapper'
        this.variableWrapperElement = document.querySelector('.variable-wrapper');
    }

    // function to add a variable group
    addVariableGroup(scriptTitle, placeholderTitle = "Script Title") {
        const variableGroup = new VariableGroup(this.variableWrapperElement, scriptTitle.titleElement.firstElementChild.value || placeholderTitle);
        scriptTitle.titleElement.firstElementChild.addEventListener('input', () => {
            variableGroup.updateTitle(scriptTitle.titleElement.firstElementChild.value);
        });
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
        const commandSelection = document.createElement('input');

        commandSelection.setAttribute('list', 'datalist-commands');
        commandSelection.autocomplete = 'on';
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
        if (paramType === 'options') {
            const datalistName = parameter.datalist_name;
            paramInput.setAttribute('autoComplete', 'on');
            paramInput.setAttribute('list', datalistName);
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

        // Command adder
        const addCommandWrapperElement = document.createElement('div');
        addCommandWrapperElement.classList.add('command-create');

        const addCommandButtonElement = IconFactory.getPlusIcon("command-add");
        addCommandButtonElement.alt = 'add icon';
        addCommandWrapperElement.appendChild(addCommandButtonElement);

        const addCommandTextElement = document.createElement('span');
        addCommandTextElement.classList.add('command-add-text');
        addCommandTextElement.innerText = 'Add Command';
        addCommandWrapperElement.appendChild(addCommandTextElement);
        addInputWrapperElement.appendChild(addCommandWrapperElement);

        // Raw bytes adder
        const addRawBytesWrapperElement = document.createElement('div');
        addRawBytesWrapperElement.classList.add('raw-bytes-create');

        const addRawBytesButtonElement = IconFactory.getPlusIcon("raw-bytes-add");
        addRawBytesButtonElement.alt = 'add icon';
        addRawBytesWrapperElement.appendChild(addRawBytesButtonElement);

        const addRawBytesTextElement = document.createElement('span');
        addRawBytesTextElement.classList.add('raw-bytes-add-text');
        addRawBytesTextElement.innerText = 'Add Raw Bytes';
        addRawBytesWrapperElement.appendChild(addRawBytesTextElement);
        addInputWrapperElement.appendChild(addRawBytesWrapperElement);

        parent.appendChild(addInputWrapperElement);
        this.addCommandButtonElement = addCommandButtonElement;
        this.addRawBytesButtonElement = addRawBytesButtonElement;
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
        scriptTitleElement.classList.add('script-title');
    
        const titleText = document.createElement('input');
        titleText.classList.add('title-text');
        titleText.placeholder = 'Script Title';
        scriptTitleElement.appendChild(titleText);

        const scriptLanguage = document.createElement('input');
        scriptLanguage.classList.add('script-language');
        scriptLanguage.placeholder = 'Language';
        scriptLanguage.setAttribute('list', 'datalist-languages');
        scriptTitleElement.appendChild(scriptLanguage);

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
        this.variableGroup = variableWrapper.addVariableGroup(this.title);
        this.addDeleteButtonEventListener(this.title.deleteButton, this.scriptElement, this.variableGroup, selectionCallback);
    }

    // function to add command create
    addCommandCreate(parent) {
        // create a command create element
        const commandCreate = new CommandCreate(parent);
        // add event listener to the add button
        commandCreate.addCommandButtonElement.addEventListener('click', () => {
            // create a new command
            this.commandWrapper.addCommand();
        });

        commandCreate.addRawBytesButtonElement.addEventListener('click', () => {
            // create a new command
            this.commandWrapper.addRawBytes();
        });
        // set the add command create element
        this.commandCreate = commandCreate;
    }

    // function to create the script element
    createScriptElement(color, dotArtist) {
        const scriptContainer = document.querySelector('.script-area');

        // Create the script element
        const scriptElement = document.createElement('div');
        scriptElement.classList.add('script');
        scriptElement.style.setProperty('--main-color', this.color);

        // Create the script group element
        const colorSwatchElement = document.createElement('input');
        colorSwatchElement.type = 'color';
        colorSwatchElement.value = `#${color[0].toString(16)}${color[1].toString(16)}${color[2].toString(16)}`
        colorSwatchElement.classList.add('script-group');

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
        const scriptElements = document.querySelectorAll('.script-area .script');
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
        const scriptElements = document.querySelectorAll('.script-area .script');
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
    addImportExportButtons() {
        // select the top bar of the script area
        const topBar = document.querySelector('.option-bar');
        // create search
        const searchWrapper = document.createElement('div')
        searchWrapper.classList.add('search-wrapper')

        const searchIcon = IconFactory.getMarketIcon("search-script");
        searchWrapper.appendChild(searchIcon)

        const searchInput = document.createElement('input')
        searchInput.classList.add('search-input')
        searchInput.setAttribute('autocomplete', 'on');
        searchInput.setAttribute('list', "datalist-scripts")
        searchInput.placeholder = "Search Scripts"

        searchInput.addEventListener('change', () => {
                const scriptInfo = datalists['datalist-scripts'].getOptionByName(searchInput.value);
                if (!scriptInfo) {return;}
                importScriptsFromSearch(scriptInfo)
            }
        )

        searchWrapper.appendChild(searchInput)
        topBar.appendChild(searchWrapper);

        // create the import and export buttons
        const importButton = IconFactory.getUploadIcon("import"); // returns div containing an svg

        importButton.addEventListener('click', () => {
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
        topBar.appendChild(importButton);        
        const exportButton = IconFactory.getDownloadIcon("export");

        exportButton.addEventListener('click', () => {
            // Get the JSON data to export
            const json = this.exportScripts();
        
            // Create a Blob object from the JSON data
            const blob = new Blob([JSON.stringify(json)], { type: 'application/json' });
        
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
        
        topBar.appendChild(exportButton);
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
    console.log(file.download_url)
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
    scriptHandler.addImportExportButtons();
});