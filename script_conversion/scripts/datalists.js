

class DataList {
    json = null;
    dataListId = null;
    dataListElement = null;

    constructor(parent, dataListId, dataListOptions=[]) {
        this.json = dataListOptions;
        this.dataListId = dataListId;
        this.createDataListElement(parent, dataListId, dataListOptions);
    }

    createDataListElement(parent, dataListId, dataListOptions) {
        const dataListElement = document.createElement('datalist');
        dataListElement.id = dataListId;
        dataListOptions = this.prepareDataListOptions(dataListOptions);
        this.setDataListOptions(dataListElement, dataListOptions);
        parent.appendChild(dataListElement);
        this.dataListElement = dataListElement;
    }

    prepareDataListOptions(dataListOptions) {
        return dataListOptions;
    }

    setDataListOptions(parent, dataListOptions) {
        for (let option of dataListOptions) {
            const optionElement = document.createElement('option');
            optionElement.innerText = option;
            optionElement.value = option;
            parent.appendChild(optionElement);
        }
    }

    getOptionByName(optionName) {
        return this.json[optionName];
    }

    getOptionIdByName(optionName) {
        const optionIndex = this.json.indexOf(optionName);
        if (optionIndex == -1) {
            return null;
        }
        return optionIndex;
    }

}

class ScriptDataList extends DataList {
    constructor(parent, files) {
        super(parent, 'datalist-scripts', files);
    }

    processName(fileName) {
        return fileName.split(".")[0].replace(/_/g, ' ');
    }

    prepareDataListOptions(files) {
        if (files.message) {return [];}
        let options = [];
        for (let file of files) {
            const filename = this.processName(file.name);
            options.push(filename);
        }
        return options;
    }

    getOptionByName(optionName) {
        for (const file in this.json) {
            const fileInfo = this.json[file];
            if (this.processName(fileInfo.name) == optionName) {
                return fileInfo;
            }
        }
        return null;
    }
}

class DynamicValidationDataList extends DataList {
    prevValue = null

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
            converter.evaluateVariables(variables);

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

class CommandDataList extends DynamicValidationDataList {
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

    setDataListOptions(parent, dataListOptions) {
        for (const option of dataListOptions) {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.innerText = option.text;
            parent.appendChild(optionElement);
        }
    }

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

class SpeciesDataList extends DynamicValidationDataList {
    constructor(parent, speciesData) {
        super(parent, 'datalist-species', speciesData);
    }
}

class ItemDataList extends DynamicValidationDataList {
    constructor(parent, itemData) {
        super(parent, 'datalist-items', itemData);
    }
}

class MapDataList extends DynamicValidationDataList {
    constructor(parent, dataListOptions) {
        super(parent, 'datalist-maps', dataListOptions);
    }

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

    setDataListOptions(parent, dataListOptions) {
        for (const option of dataListOptions) {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.innerText = option.text;
            parent.appendChild(optionElement);
        }
    }

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


class MoveDataList extends DynamicValidationDataList {
    constructor(parent, dataListOptions) {
        super(parent, 'datalist-moves', dataListOptions);
    }
}

class LanguageDataList extends DynamicValidationDataList  {
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