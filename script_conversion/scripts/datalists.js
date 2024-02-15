

// DataList: this class adds a datalist to a parent element

class DataList {
    // variables
    json = null;
    dataListId = null;
    dataListElement = null;

    // constructor
    constructor(parent, dataListId, dataListOptions=[]) {
        this.json = dataListOptions;
        this.dataListId = dataListId;
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

// ScriptDataList: this class will be used to retrieve and store scripts

class ScriptDataList extends DataList {
    // constructor
    constructor(parent, files) {
        super(parent, 'datalist-scripts', files);
    }

    processName(fileName) {
        return fileName.split(".")[0].replace(/_/g, ' ');
    }

     // prepare the datalist options
    prepareDataListOptions(files) {
        if (files.message) {return [];}
        let options = [];
        for (let file of files) {
            const filename = this.processName(file.name);
            options.push(filename);
        }
        return options;
    }

    // function to get an option by name
    getOptionByName(optionName) {
        for (const file in this.json) {
            const fileInfo = this.json[file];
            if (this.processName(fileInfo.name) == optionName) {
                return fileInfo;
            }
        }
        return null;
    }

    // getSimpleJson() {
    //     return Object.values(this.json).map(item => this.processName(item.name));
    // }
}

// DynamicValidationDataList

class DynamicValidationDataList extends DataList {
    prevValue = null

    // constructor
    constructor(parent, dataListId, dataListOptions=[], converter) {
        super(parent, dataListId, dataListOptions);
    }

    getSimpleJson(){
        return this.json
    }

    validateInput(input, variableGroup = null, converter = null) {
        if (this.getSimpleJson().includes(input.value)) {
            return true;
        }

        if (variableGroup !== null && converter !== null) {
            const language = document.querySelector('.language-config').value || 'All';
            let variables = converter.getVariablesByLanguage(variableGroup, language);
            converter.sanitizeVariableValues(variables);

            if (converter.safeEval(input.value, variables) !== null) {
                return true;
            }
        }

        return false;
    }

    addDynamicEventListeners(input, variableGroup = null, converter = null) {
        input.addEventListener('focus', (event) => {
            this.prevValue = event.target.value;
            event.target.value = '';
        });
    
        input.addEventListener('blur', (event) => {
            if (!this.validateInput(event.target, variableGroup, converter)) {
                event.target.value = this.prevValue;
            }
        });
    
        input.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.target.blur();
            }
        });
    }
}

// CommandSelection: this class will be used to store the command selection data

class CommandDataList extends DynamicValidationDataList {
    // constructor
    constructor(parent, dataListOptions) {
        super(parent, 'datalist-commands', dataListOptions);
    }

    getSimpleJson() {
        let names = []
        for (const commandId in this.json) {
            const command = this.json[commandId];
            const commandName = command.command_name;
            const aliases = command.aliases || [];
            names.push(commandName)
            names.concat(aliases)
        }
        return names
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
                options.push({value: commandName, text: alias});
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

class SpeciesDataList extends DynamicValidationDataList {
    // constructor
    constructor(parent, speciesData) {
        super(parent, 'datalist-species', speciesData);
    }
}

// ItemDataList: this class will be used to store the item selection data

class ItemDataList extends DynamicValidationDataList {
    // constructor
    constructor(parent, itemData) {
        super(parent, 'datalist-items', itemData);
    }
}

// MapDataList: this class will be used to store the map selection data

class MapDataList extends DynamicValidationDataList {
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

    // function to get an option by name
    getOptionByName(optionName) {
        for (const mapId in this.json) {
            const map = this.json[mapId];
            const mapCode = map.map_code;

            if (mapCode == optionName) {
                return map;
            }
        }
        return null;
    }

    // function to get the id of an option by name
    getOptionIdByName(optionName, asNumber=true) {
        for (const mapId in this.json) {
            const map = this.json[mapId];
            const mapCode = map.map_code;

            if (mapCode == optionName) {
                return asNumber ? parseInt(mapId) : mapId;
            }
        }
        return null;
    }
}

// MoveDataList: this class will be used to store the move selection data

class MoveDataList extends DynamicValidationDataList {
    // constructor
    constructor(parent, dataListOptions) {
        super(parent, 'datalist-moves', dataListOptions);
    }
}


// LanguageDataList: this class will be used to store the language selection data

class LanguageDataList extends DynamicValidationDataList  {
    // constructor
    constructor(parent, dataListOptions) {
        super(parent, 'datalist-languages', dataListOptions);
    }
}
  
class DynamicValidationInput {
    input = null

    constructor(dataList, input = null, variableGroup = null, converter = null) {
        this.createInputField(dataList, input, variableGroup, converter);
        return this.input
    }

    createInputField(dataList, input, variableGroup, converter) {
        this.input = input !== null ? input : document.createElement('input');
        dataList.addDynamicEventListeners(this.input, variableGroup, converter);
        this.input.setAttribute('list', dataList.dataListId)
        this.input.setAttribute('autoComplete', 'on');
    }
}