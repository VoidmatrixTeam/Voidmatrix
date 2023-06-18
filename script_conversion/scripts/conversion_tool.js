// Global variables
let commandData = null;
let speciesData = null;
let itemData = null;
let mapData = null;

let scriptHandler = null;


// Converter: this class will convert the input scripts to byte code

class Converter {
    // function to get all script elements
    getScripts() {
        // get all script elements
        let scripts = document.getElementsByTagName("script");
        // return the scripts
        return scripts;
    }

    // function to get specific script element
    getScript(scriptName) {
        // get script element
        let script = document.getElementById(scriptName);
        // return the script
        return script;
    }

    // function to convert a script to byte code
    convertScriptToByteCode(script) {
        let byteCode = [];
        // TODO: convert the script to byte code
        return byteCode;
    }

}

// DotArtistConverter: this class will convert the input scripts to byte code, then convert the byte code to a dot artist image

class DotArtistConverter extends Converter {
    // function to convert a script to byte code
    convertByteCodeToDotArtist(byteCode) {
        // TODO: convert the byte code to a dot artist image
    }

    // function to convert a script to DotArtist
    convertScriptToDotArtist(script) {
        let byteCode = this.convertScriptToByteCode(script);
        this.convertByteCodeToDotArtist(byteCode);
    }
}

// DataList: this class adds a datalist to a parent element

class DataList {
    // variables
    dataListElement = null;

    // constructor
    constructor(parent, dataListId, dataListOptions=[]) {
        this.createDataListElement(parent, dataListId, dataListOptions);
    }

    // function to create the datalist element
    createDataListElement(parent, dataListId, dataListOptions) {
        const dataListElement = document.createElement('datalist');
        dataListElement.id = dataListId;    
        this.setDataListOptions(dataListElement, dataListOptions);
        parent.appendChild(dataListElement);
        this.dataListElement = dataListElement;
    }

    // function to set the datalist options
    setDataListOptions(parent, dataListOptions) {
        for (let option of dataListOptions) {
            const optionElement = document.createElement('option');
            optionElement.innerText = option;
            optionElement.value = option;
            parent.appendChild(optionElement);
        }
    }
}

// CommandSelection: this class will be used to store the command selection data

class CommandDataList extends DataList {
    // constructor
    constructor(parent, commandData) {
        super(parent, 'datalist-commands');
        this.setDataListOptions(this.dataListElement, this.getCommandOptions(commandData));
    }

    // function to get the command options
    getCommandOptions(commandData) {
        /* command data is of format: 
        {
            commandId: {
                "command_name": "",                             -> name of the command
                "parameters": ["param1","param1","param2"],     -> each entry is a u8, multiple consecutive entries should be bitshifted into a single parameter
                "description": "",                               -> description of the command
                "aliases": ["alias1","alias2","alias3"]          -> aliases for the command (AddTamago => AddEgg, ...)
            }, 
            
            (...)
        }
        */

        const options = [];
        for (const commandId in commandData) {
            const command = commandData[commandId];
            const commandName = command.command_name;
            const aliases = command.aliases || [];

            options.push({value: commandName, text: commandName});

            for (const alias of aliases) {
                options.push({ value: commandName, text: alias});
            }
        }
        return options;
    }

    // function to set the datalist options
    setDataListOptions(parent, dataListOptions) {
        for (const option of dataListOptions) {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.innerText = option.text;
            parent.appendChild(optionElement);
        }
    }
}

// SpeciesDataList: this class will be used to store the species selection data

class SpeciesDataList extends DataList {
    // constructor
    constructor(parent, speciesData) {
        super(parent, 'datalist-species', speciesData);
    }
}

// ItemDataList: this class will be used to store the item selection data

class ItemDataList extends DataList {
    // constructor
    constructor(parent, itemData) {
        super(parent, 'datalist-items', itemData);
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

        // Add event listener for input selection
        commandSelection.addEventListener('input', this.handleCommandSelection.bind(this));
        parent.appendChild(commandSelection);
    }

    // function to handle command selection
    handleCommandSelection(event) {
        const selectedCommand = event.target.value;
        const commandId = this.commandNameToId(selectedCommand);
        if (commandId === null) { return; }

        // Clear previous command parameters
        this.clearCommandParams();

        // Add command parameters based on selection
        this.command = commandData[commandId];
        const parameters = this.command.parameters || [];

        for (let i = 0; i < parameters.length; i++) {
            const parameter = parameters[i];
            this.addCommandParameter(parameter, i);
        }
    }

    // function to convert a command name to a command id
    commandNameToId(commandName) {
        for (const commandId in commandData) {
            const command = commandData[commandId];
            if (command.command_name === commandName) {
                return commandId;
            }
        }
        return null;
    }

    // function to clear command parameters
    clearCommandParams() {
        for (const paramName in this.paramElements) {
            const paramElement = this.paramElements[paramName];
            console.log(paramElement)
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
        paramContainer.classList.add(`param-${index}`)
        paramContainer.setAttribute('param_name', paramName);
        paramContainer.setAttribute('description', paramDescription);

        if (paramType === 'options') {
            const datalistName = parameter.datalist_name;
            const paramInput = document.createElement('input');
            paramInput.setAttribute('autoComplete', 'on');
            paramInput.setAttribute('list', datalistName);
            paramInput.placeholder = paramName;
            paramContainer.appendChild(paramInput);

        } else if (paramType === 'number') {
            const paramInput = document.createElement('input');
            paramInput.type = 'text'; // Change the input type to 'text' to allow hexadecimal input
            paramInput.placeholder = paramName;
            paramContainer.appendChild(paramInput);
            
            paramInput.addEventListener('input', function() {
              const value = paramInput.value;
              let parsedValue;
              
              // Check if the input is a valid decimal or hexadecimal number
              if (/^[\d]+$/.test(value)) {
                parsedValue = parseInt(value, 10); // Parse decimal value
              } else if (/^0x[\da-fA-F]+$/.test(value)) {
                parsedValue = parseInt(value, 16); // Parse hexadecimal value
              } else {
                return; // Invalid input, do nothing
              }
              
              // Check if the parsed value exceeds the maximum allowed value
              const maxValue = Math.pow(2, parseInt(paramSize.slice(1))) - 1;
              console.log(maxValue);
              const maxValueDecimals = maxValue.toString(10).length;
              const parsedValueDecimals = parsedValue.toString(10).length;
              
              if (parsedValueDecimals > maxValueDecimals) {
                paramInput.value = paramInput.value.slice(0, -1); // Remove the last character
              }
            });            
        }

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

        new CommandInput(commandElement);

        const commandOutputElement = document.createElement('div');
        commandOutputElement.classList.add('command-output');
        commandElement.appendChild(commandOutputElement);
        parent.appendChild(commandElement);
        this.commandElement = commandElement;
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
}

// CommandCreate: this class will be used to store the command create data

class CommandCreate {
    // variables
    commandCreateElement = null;
    addButtonElement = null;

    // constructor
    constructor(parent) {
        this.createCommandCreateElement(parent);
    }

    // function to create the command create element
    createCommandCreateElement(parent) {
        const commandCreateElement = document.createElement('div');
        commandCreateElement.classList.add('command-create');

        const addButtonElement = document.createElement('img');
        addButtonElement.classList.add('button');
        addButtonElement.src = 'assets/add.svg';
        addButtonElement.alt = 'add icon';
        commandCreateElement.appendChild(addButtonElement);
        parent.appendChild(commandCreateElement);
        this.addButtonElement = addButtonElement;
        this.commandCreateElement = commandCreateElement;
    }
}

// ScriptTitle: this class will be used to store the script title data

class ScriptTitle {
    // variables
    titleElement = null;

    // constructor
    constructor(parent) {
        this.createScriptTitleElement(parent);
    }

    // function to create the script title element
    createScriptTitleElement(parent) {
        const scriptTitleElement = document.createElement('div');
        scriptTitleElement.classList.add('script-title');
    
        const titleText = document.createElement('input');
        titleText.classList.add('title-text');
        titleText.placeholder = 'Script Title';
        scriptTitleElement.appendChild(titleText);
        parent.appendChild(scriptTitleElement);
        this.titleElement = scriptTitleElement;
    }
}

// Script: this class will be used to store the script data

class Script {
    // variables
    color = null;
    scriptElement = null;
    commandWrapper = null;
    title = null;
    commandCreate = null;

    // constructor
    constructor(color = '180, 180, 180') {
      this.color = color;
      this.createScriptElement();
    }

    // function to add command create
    addCommandCreate(parent) {
        // create a command create element
        const commandCreate = new CommandCreate(parent);
        // add event listener to the add button
        commandCreate.addButtonElement.addEventListener('click', () => {
            // create a new command
            this.commandWrapper.addCommand();
        });
        // set the add command create element
        this.commandCreate = commandCreate;
    }

    // function to create the script element
    createScriptElement() {
        const scriptContainer = document.querySelector('.script-area');

        // Create the script element
        const scriptElement = document.createElement('div');
        scriptElement.classList.add('script');
        scriptElement.style.setProperty('--main-color', this.color);

        // Set the script id as the element id
        scriptElement.id = this.id;

        // Create the script group element
        const scriptGroupElement = document.createElement('div');
        scriptGroupElement.classList.add('script-group');
        scriptElement.appendChild(scriptGroupElement);

        // Create the script info element
        const scriptInfoElement = document.createElement('div');
        scriptInfoElement.classList.add('script-info');
        scriptElement.appendChild(scriptInfoElement);

        // Create the script title element
        this.title = new ScriptTitle(scriptInfoElement);

        // Create the script commands element
        this.commandWrapper = new CommandWrapper(scriptInfoElement);
        this.commandWrapper.addCommand();

        // Create the command create element
        this.addCommandCreate(scriptInfoElement);

        // Append the script element to the script container
        scriptContainer.appendChild(scriptElement);
        this.scriptElement = scriptElement;
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
    scripts = [];
    dotArtistConverter = new DotArtistConverter();

    // function to select a script and deselect the other scripts
    selectScript(script) {
        // unselect the other scripts
        this.scripts.forEach((script) => {
            script.setSelection(false);
        });

        // set script as selected
        script.setSelection(true);

        // update the dot artist converter
        // TODO: update the dot artist converter
    }

    // function to add an empty script element
    addScriptElement() {
        // create a new script element
        const script = new Script();
        // select the script
        this.selectScript(script);
        
        // add event handler so if the script is clicked, it will be selected, and the other scripts will be deselected
        script.scriptElement.addEventListener('click', () => {
            // select the script
            this.selectScript(script);
        });

        // add the script element to the script elements
        this.scripts.push(script);
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
    return fetch(url)
    .then((response) => response.json())
    .then((responseJson) => {
    return responseJson;
    })
    .catch((error) => {
    console.error(error);
    });   
}

document.addEventListener("DOMContentLoaded", async function () {
    commandData = await getJsonFromUrl(`data/command_data.json`);
    speciesData = await getJsonFromUrl(`data/species_data.json`);
    itemData = await getJsonFromUrl(`data/item_data.json`);

    // add data lists to the document
    commandDataList = new CommandDataList(document.documentElement, commandData);
    speciesDataList = new SpeciesDataList(document.documentElement, speciesData);
    itemDataList = new ItemDataList(document.documentElement, itemData);


    // initialize the script handler
    scriptHandler = new ScriptHandler();
    scriptHandler.addEventListeners();
    scriptHandler.addScriptElement(); // add a default first script element
});



