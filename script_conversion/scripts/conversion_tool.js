// Global variables
let datalists = {};

let variableWrapper = null;
let scriptHandler = null;

class IconFactory {
    // function that returns a delete icon
    static getDeleteIcon(tag, parent=null, message=null,  eventListener=true) {
        // create the delete icon
        const deleteIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
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
}




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

    // function to safely evaluate the input
    safeEval(input, variables) {
        // Sanitize the input
        const sanitizedInput = this.sanitizeInput(input, variables);
        if (sanitizedInput === null) {
            return null;
        }
        let value = 0;
        let operator = '+';
      
        for (let i = 0; i < sanitizedInput.length; i++) {
            const component = sanitizedInput[i];
      
            if (typeof component === 'string') {
                // If the component is a string, check if it's an operator, otherwise ignore it
                if (component.match(/^[+\-*/]$/)) {
                    operator = component;
                }
            } else if (typeof component === 'number') {
                // If the component is a number, perform the operation
                switch (operator) {
                    case '+':
                        value += component;
                        break;
                    case '-':
                        value -= component;
                        break;
                    case '*':
                        value *= component;
                        break;
                    case '/':
                        value /= component;
                        break;
                }
            }
        }
      
        return value;
    }    

    // function to sanitize input
    sanitizeInput(inputValue, variables) {
        const splitInput = this.splitString(inputValue);
        if (splitInput === null) {
          return null;
        }
        const processedInput = this.processInput(splitInput, variables);
        return processedInput;
      }

    // function to split a string into an array of tokens
    splitString(input) {
        const regex = /(0x[\da-fA-F]+|\d+|[+\-*/]|\[[^\]]+\])/g;
        return input.match(regex);
    }

    // function to get all variables from a variable group
    getVariables(variableGroup) {
        const variables = [];
        for (let variableElement of variableGroup.variableElements) {
            const language = variableElement.querySelector('.variable-language').value || 'All';
            const variableName = variableElement.querySelector('.variable-name').value;
            const variableValue = variableElement.querySelector('.variable-value').value;
            variables.push({
                language: language,
                name: variableName,
                value: variableValue
            });
        }
        return variables;
    }

    // function to get all variables from a variable group where the language matches
    getVariablesByLanguage(variableGroup, language) {
        console.log(language)
        const variables = [];
        for (let variableElement of variableGroup.variableElements) {
            const variableLanguage = variableElement.querySelector('.variable-language').value || 'All';
            if ((variableLanguage === language) || (variableLanguage === 'All')) {
                const variableName = variableElement.querySelector('.variable-name').value;
                const variableValue = variableElement.querySelector('.variable-value').value;
                variables.push({
                    language: variableLanguage,
                    name: variableName,
                    value: variableValue
                });
            }
        }
        return variables;
    }

    processInput(splitInput, variables) {
        const processedInput = [];
      
        for (const component of splitInput) {
          if (typeof component === 'string' && component.startsWith('[') && component.endsWith(']')) {
            // Extract variable name from component
            const variableName = component.slice(1, -1);
      
            // Find variable by name in the variables array
            const variable = variables.find(function(varItem) {
                return varItem.name === variableName;
            });
      
            if (variable && !(typeof variable.value === 'string')) {
              // Extend the processed input with the variable value, which is an array
              processedInput.push(...variable.value);
            } else {
              // Variable not found, keep the original component
              processedInput.push(component);
            }
          } else if (!isNaN(component)) {
            // Convert numeric strings to integers
            processedInput.push(parseInt(component));
          } else {
            // Keep other components as they are
            processedInput.push(component);
          }
        }
      
        return processedInput;
      }

    // function to sanitize variable values
    sanitizeVariableValues(variables) {
        for (const variable of variables) {
            const sanitizedValue = this.sanitizeInput(variable.value, variables, variable.language);
            variable.value = sanitizedValue;
        }
    }

    // function to convert a value to a byte array
    convertValueToByteArray(value, bitCount) {
        const byteArray = [];
      
        for (let i = 0; i < bitCount; i += 8) {
          const byte = (value >> i) & 0xFF;
          byteArray.push(byte);
        }
      
        return byteArray;
    }


    // function to convert a script to byte code
    convertScriptToByteCode(script) {
        const scriptElement = script.scriptElement;
        const variableGroup = script.variableGroup;
        const language = scriptElement.querySelector('.script-language').value || 'English';

        // get all variables, then sanitize them
        const variables = this.getVariablesByLanguage(variableGroup, language);
        this.sanitizeVariableValues(variables);

        let byteCode = [];
        // TODO: convert the script to byte code
        let commandElements = scriptElement.querySelectorAll(".command");
        for (let commandElement of commandElements) {
            let commandInput = commandElement.querySelector(".command-input");
            // get all input elements
            let inputElements = commandInput.querySelectorAll("input");
            for (let inputElement of inputElements) {
                // get the input type, datalist, and value
                const conversionType = inputElement.conversionType;
                const bitCount = parseInt(inputElement.bitSize.substring(1));
                let inputValue = inputElement.value || "";
                let sanitizedValue = null;

                if (conversionType === 'options'){
                    const datalistName = inputElement.getAttribute('list');
                    const datalist = datalists[datalistName]
                    let inputOptionId = datalist.getOptionIdByName(inputValue) || 0x0;
                    sanitizedValue = inputOptionId;
                } else {
                    sanitizedValue = this.safeEval(inputValue, variables) || 0x0;
                }
                const sanitizedValueArray = this.convertValueToByteArray(sanitizedValue, bitCount);

                // add the sanitized values to the byte code
                byteCode.push(...sanitizedValueArray);
            }

        }
        return byteCode;
    }

}

// DotArtistConverter: this class will convert the input scripts to byte code, then convert the byte code to a dot artist image

class DotArtistConverter extends Converter {
    // variables
    dotArtistElement = null;
    dotArtistGridElement = null;

    // constructor
    constructor() {
        super();
        this.dotArtistElement = document.querySelector('.dot-artist-application');
        this.dotArtistGridElement = document.createElement("div");
        this.dotArtistGridElement.classList.add("canvas");
        this.dotArtistElement.appendChild(this.dotArtistGridElement);
        this.convertByteCodeToDotArtist([0x00]);
    }

    // function to clear the dot artist
    clearDotArtist() {
        this.dotArtistGridElement.innerHTML = "";
    }

    // function to convert a script to byte code
    convertByteCodeToDotArtist(byteCode) {
        this.clearDotArtist();
        const binaryCode = this.convertByteCodeToBinary(byteCode);
    
        for (let i=0;i<20;i++) {
            let row = document.createElement("div");
            row.classList.add("row");
            for (let j=0;j<24;j++) {  
                let bit = binaryCode[i*24+j];          
                row.appendChild(this.createPixelElement(bit));
            }
            this.dotArtistGridElement.appendChild(row);
        };
    }

    // function to create a dot element
    createPixelElement(bit) {
        let dotElement = document.createElement("div");
        dotElement.classList.add("pixel");
        dotElement.classList.add(`bit-${bit}`);
        // TODO: add a hover event to show the bit value with text
        dotElement.addEventListener("mouseover", function() {
            dotElement.classList.add("show-bit");
            dotElement.innerHTML = bit;
        });
        dotElement.addEventListener("mouseout", function() {
            dotElement.classList.remove("show-bit");
            dotElement.innerHTML = "";
        });
        return dotElement;
    }

    // function to change the dot artist background color
    changeDotArtistBackgroundColor(color) {
        // change the root variable of the dot artist background color
        this.dotArtistElement.style.setProperty('--dot-artist-background', color);
    }

    // function to convert bytecode to binary
    convertByteCodeToBinary(byteCode) {
        let binaryCode = new Array((24*20)).fill(0);
        const byteCodeIndex = 0x0 // binaryCode.length - byteCode.length*4;
        for (let i=0;i<byteCode.length;i++) {
            for (let j=0;j<4;j++) {
                binaryCode[byteCodeIndex+i*4+j] = ((byteCode[i] >> (j*2)) & 0x3)
            }
        }
        return binaryCode;
    }

    // function to convert a script to DotArtist
    convertScriptToDotArtist(script) {
        this.changeDotArtistBackgroundColor(`rgb(${script.color})`);
        let byteCode = this.convertScriptToByteCode(script);
        this.convertByteCodeToDotArtist(byteCode);
        
    }
}

// DataList: this class adds a datalist to a parent element

class DataList {
    // variables
    json = null;
    dataListElement = null;

    // constructor
    constructor(parent, dataListId, dataListOptions=[]) {
        this.json = dataListOptions;
        this.createDataListElement(parent, dataListId, dataListOptions);
    }

    // function to create the datalist element
    createDataListElement(parent, dataListId, dataListOptions) {
        const dataListElement = document.createElement('datalist');
        dataListElement.id = dataListId;
        dataListOptions = this.prepareDataListOptions(dataListOptions);
        this.setDataListOptions(dataListElement, dataListOptions);
        parent.appendChild(dataListElement);
        this.dataListElement = dataListElement;
    }

    // prepare the datalist options
    prepareDataListOptions(dataListOptions) {
        // This should be overwritten by the child class
        return dataListOptions;
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

    // function to get an option by name
    getOptionByName(optionName) {
        // This should be overwritten by the child class, if needed
        return this.json[optionName];
    }

    // function to get the id of an option by name
    getOptionIdByName(optionName) {
        // This should be overwritten by the child class, if needed
        // get the index of the option
        const optionIndex = this.json.indexOf(optionName);
        if (optionIndex == -1) {
            return null;
        }
        return optionIndex;
    }

}

// CommandSelection: this class will be used to store the command selection data

class CommandDataList extends DataList {
    // constructor
    constructor(parent, dataListOptions) {
        super(parent, 'datalist-commands', dataListOptions);
    }

    // prepare the datalist options (overwrite)
    prepareDataListOptions(dataListOptions) {
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
        for (const commandId in dataListOptions) {
            const command = dataListOptions[commandId];
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

    // function to get an option by name
    getOptionByName(optionName) {
        for (const commandId in this.json) {
            const command = this.json[commandId];
            const commandName = command.command_name;
            const aliases = command.aliases || [];

            if (commandName == optionName) {
                return command;
            }

            for (const alias of aliases) {
                if (alias == optionName) {
                    return command;
                }
            }
        }
        return null;
    }

    // function to get the id of an option by name
    getOptionIdByName(optionName, asNumber=true) {
        for (const commandId in this.json) {
            const command = this.json[commandId];
            const commandName = command.command_name;
            const aliases = command.aliases || [];

            if (commandName == optionName) {
                return asNumber ? parseInt(commandId) : commandId;
            }

            for (const alias of aliases) {
                if (alias == optionName) {
                    return asNumber ? parseInt(commandId) : commandId;
                }
            }
        }
        return null;
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

// MapDataList: this class will be used to store the map selection data

class MapDataList extends DataList {
    // constructor
    constructor(parent, dataListOptions) {
        super(parent, 'datalist-maps', dataListOptions);
    }

    // prepare the datalist options (overwrite)
    prepareDataListOptions(dataListOptions) {
        /* map data is of format:
            {
                mapId: {
                    "map_code": "",                                 -> code of the map, use as alias
                    "map_name": "",                                 -> name of the map
                }

            } 
        */
        const options = [];
        for (const mapId in dataListOptions) {
            const map = dataListOptions[mapId];
            const mapName = map.map_name;
            const mapCode = map.map_code;

            options.push({value: mapCode, text: `${mapCode} ${mapName}`});
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

// LanguageDataList: this class will be used to store the language selection data

class LanguageDataList extends DataList {
    // constructor
    constructor(parent, dataListOptions) {
        super(parent, 'datalist-languages', dataListOptions);
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
    
        const addButtonElement = document.createElement('img');
        addButtonElement.classList.add('button', 'create-variable');
        addButtonElement.src = 'assets/add.svg';
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
    constructor(dotArtist, color = [180, 180, 180]) {
        this.color = `${color[0]}, ${color[1]}, ${color[2]}`;
        this.createScriptElement(color, dotArtist);
        this.variableGroup = variableWrapper.addVariableGroup(this.title);
        this.addDeleteButtonEventListener(this.title.deleteButton, this.scriptElement, this.variableGroup);
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
            dotArtist.changeDotArtistBackgroundColor(`rgb(${color}`);
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
    addDeleteButtonEventListener(button, scriptElement, variableGroup) {
        button.addEventListener('click', () => {
            // confirm the delete
            if (!confirm('Are you sure you want to delete this script?')) {
                return;
            }
            // remove the script element
            scriptElement.remove();
            // remove the variable group
            variableGroup.variableGroupElement.remove();
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
      
        if (scriptElement) {
          // set script as selected
          scriptElement.classList.add('selected');
          this.dotArtistConverter.convertScriptToDotArtist(script);
        }
    }

    // function to add an empty script element
    addScriptElement() {
        // create a new script element
        const script = new Script(this.dotArtistConverter);
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
    // add data lists to the document
    const commands = await getJsonFromUrl(`data/command_data.json`);
    datalists["datalist-commands"] = new CommandDataList(document.documentElement, commands);
    const species = await getJsonFromUrl(`data/species_data.json`);
    datalists["datalist-species"] = new SpeciesDataList(document.documentElement, species);
    const items = await getJsonFromUrl(`data/item_data.json`);
    datalists["datalist-items"] = new ItemDataList(document.documentElement, items);
    const maps = await getJsonFromUrl(`data/map_data.json`);
    datalists["datalist-maps"] = new MapDataList(document.documentElement, maps);
    const languages = ["All", "English", "Japanese", "French", "Italian", "German", "Spanish", "Korean"];
    datalists["datalist-languages"] = new LanguageDataList(document.documentElement, languages);

    // global VariableWrapper
    variableWrapper = new VariableWrapper();


    // initialize the script handler
    scriptHandler = new ScriptHandler();
    scriptHandler.addEventListeners();
    scriptHandler.addScriptElement(); // add a default first script element
});



