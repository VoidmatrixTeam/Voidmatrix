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
    }

    // function to update the title
    updateTitle(title) {
        this.titleElement.innerText = title;
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
    addVariableGroup(scriptTitle) {
        const variableGroup = new VariableGroup(this.variableWrapperElement, "Script Title");
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

}

// Command: this class will be used to store the command data

class Command {
    // variables
    commandElement = null;

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

        new CommandInput(commandElement);

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

}

// CommandWrapper: this class will be used to store the commands

class CommandWrapper {
    // variables
    commandWrapperElement = null;
    commands = [];

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
    addCommand() {
        // create a new command
        const command = new Command(this.commandWrapperElement);
        // add the command to the commands
        this.commands.push(command);
    }

    // function to add raw bytes
    addRawBytes() {
        // create a new command
        const rawBytes = new RawBytes(this.commandWrapperElement);
        // add the command to the commands
        this.commands.push(rawBytes);
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
    titleElement = "test";
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
        this.commandWrapper.addCommand();

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
            selectionCallback();
        });
    }

    // function to change the script color
    changeScriptColor(color) {
        // set the script color
        this.color = color;
        // set the script color
        this.scriptElement.style.setProperty('--main-color', this.color);
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
}

// ScriptHandler: this class will handle the script elements

class ScriptHandler {
    // variables
    ingameVariables = {};
    dotArtistConverter = new DotArtistConverter();

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
    resetSelection = () => {
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
       

        // dispatch a click event, because callbacks are a pain due to the structure of the code
        const clickEvent = new Event('click');
        firstScript.dispatchEvent(clickEvent);
    }

    // function to add an empty script element
    addScriptElement() {
        // create a new script element
        const script = new Script(this.dotArtistConverter, this.resetSelection);
        // select the script
        this.selectScript(script);
        
        // add event handler so if the script is clicked, it will be selected, and the other scripts will be deselected
        script.scriptElement.addEventListener('click', () => {
            // select the script
            this.selectScript(script);
        });
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

}

const getJsonFromUrl = async function(url) {
    return fetch(url).then((response) => 
        response.json()).then((responseJson) => {
            return responseJson;
        }).catch((error) => {
        console.error(error);
    });   
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

    // global VariableWrapper
    variableWrapper = new VariableWrapper();


    // initialize the script handler
    scriptHandler = new ScriptHandler();
    scriptHandler.addEventListeners();
    scriptHandler.addScriptElement(); // add a default first script element
});



