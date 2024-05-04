
let debug = false;

const math_config = {
    number: 'number'
};

const mathjs = math.create(math.all, math_config);

class Converter {    
    safeEval(input, variables) {
        if (!input) {
            return null;
        }
        return this.evaluateExpression(input, variables);
    }

    evaluateMathExpression(expression) {
        try {
            return mathjs.evaluate(expression);
        } catch (error) {
            return null;
        }
    }

    evaluateVariables(variables) {
        for (let variable of variables) {
            variable.value = this.evaluateExpression(variable.value, variables);
        }
        return variables;
    }


    evaluateExpression(expression, variables, depth=0) {
        try {
            const maxDepth = variables.length;
            if (depth > maxDepth) {
                return 0;
            }
            depth++;

            if (typeof expression === 'number') {
                return expression;
            }

            let splitValue = this.splitString(expression);
            const regex = /\[(.*?)\]/g;

            for (let i = 0; i < splitValue.length; i++) {
                if (splitValue[i].match(regex)) {
                    let variableName = splitValue[i].replace(/[\[\]']+/g, '');
                    let value = this.evaluateExpression(variables.find(variable => variable.name === variableName).value, variables, depth);
                    splitValue[i] = value;
                }
            }
            return this.evaluateMathExpression(splitValue.join(' '));
        } catch (error) {
            return null;
        }
    }

    splitString(input) {
        const regex = /(0x[\da-fA-F]+|\d+|[()+\-*/&|^]|<<|>>|\[[^\]]+\])/g;
        return input.match(regex);
    }

    getVariables(variableGroup) {
        const variables = [];
        for (let variableElement of variableGroup.variableElements) {
            const language = variableElement.querySelector('.variable-language').value || 'All';
            const variableName = variableElement.querySelector('.variable-name').value;
            const variableValue = variableElement.querySelector('.variable-value').value;
            variables.push({
                language: language,
                name: variableName.replace(/\s/g, ''),
                value: variableValue.replace(/\s/g, '')
            });
        }
        return variables;
    }

    getVariablesByLanguage(variableGroup, language) {
        const variables = [];
        this.getVariablesByLanguageFromElements(document.querySelectorAll('.global-variables .variable'), language, variables);
        this.getVariablesByLanguageFromElements(variableGroup.variableElements, language, variables);
        return variables;
    }

    getVariablesByLanguageFromElements(variableElements, language, variables=[]) {
        for (let variable of variableElements) {
            const variableLanguage = variable.querySelector('.variable-language').value || 'All';
            if ((variableLanguage === language) || (variableLanguage === 'All')) {
                const variableName = variable.querySelector('.variable-name').value;
                const variableValue = variable.querySelector('.variable-value').value;
                const existingVariable = variables.find(v => v.name === variableName);
                if (existingVariable) {
                    if (existingVariable.language === 'All' || existingVariable.language === variableLanguage) {
                        existingVariable.value = variableValue;
                        continue;
                    }
                }

                variables.push({
                    language: variableLanguage,
                    name: variableName.replace(/\s/g, ''),
                    value: variableValue.replace(/\s/g, '')
                });
            }
        }
        return variables;
    }

    convertValueToByteArray(value, bitCount) {
        const byteArray = [];
      
        for (let i = 0; i < bitCount; i += 8) {
          const byte = (value >> i) & 0xFF;
          byteArray.push(byte);
        }
      
        return byteArray;
    }

    convertValueToByteArrayNoBitCount(value) {
        if (value === 0) { return [0];}

        const byteArray = [];
        while (value > 0) {
            byteArray.unshift(value & 0xff);
            value >>= 8;
        }

        return byteArray;
    }

    sanitizeOptionsValue(inputElement, variables) {
        const datalistName = inputElement.getAttribute('list');
        const datalist = datalists[datalistName]
        let inputOptionId = datalist.getOptionIdByName(inputElement.value) || this.safeEval(inputElement.value, variables) || 0x0; // first try to get the option id by name, then try to evaluate the value, then default to 0x0
        return inputOptionId;
    }

    sanitizeOtherValue(inputElement, variables) {
        return this.safeEval(inputElement.value, variables) || 0x0;
    }

    convertCommandToByteCode(commandElement, variables) {
        const byteCode = [];

        let commandInput = commandElement.querySelector(".command-input");
        let inputElements = commandInput.querySelectorAll("input");
        for (let inputElement of inputElements) {
            const conversionType = inputElement.conversionType;
            const bitCount = parseInt(inputElement.bitSize.substring(1));
            let sanitizedValue = null;

            if (conversionType === 'options'){
                sanitizedValue = this.sanitizeOptionsValue(inputElement, variables);
            } else {
                sanitizedValue = this.sanitizeOtherValue(inputElement, variables);
            }
            const sanitizedValueArray = this.convertValueToByteArray(sanitizedValue, bitCount);
            byteCode.push(...sanitizedValueArray);
        }
        return byteCode;
    }

    convertRawBytesToByteArray(rawBytesElement, variables) {
        const rawBytesInput = rawBytesElement.querySelector(".raw-bytes-input")
        const sanitizedRawBytes = this.safeEval(rawBytesInput.value, variables) || 0x0;
        const rawBytesArray = this.convertValueToByteArrayNoBitCount(sanitizedRawBytes);

        const rawBytesRepeatInput = rawBytesElement.querySelector(".raw-bytes-repeat-input");
        const sanitizedRawBytesRepeat = this.safeEval(rawBytesRepeatInput.value, variables) || 0x0;
        
        const byteArray = [];

        for (let i = 0; i < sanitizedRawBytesRepeat; i++) {
            byteArray.push(...rawBytesArray);
        }
        return byteArray;
    }

    convertMemoryEditorToByteArray(memoryEditorElement, variables) {
        const byteInputs = Array.from(memoryEditorElement.querySelectorAll('.memory-byte')).filter(byteInput => !byteInput.classList.contains('no-show'));
        return Array.from(byteInputs).map(byteInput => this.safeEval(byteInput.value, variables) || 0x0 & 0xFF);
    }

    evaluateInputField(inputFieldElement, variableGroup) {
        const language = document.querySelector('.language-config').value || 'All';
        const variables = this.getVariablesByLanguage(variableGroup, language);
        this.evaluateVariables(variables);
        return this.safeEval(inputFieldElement.value, variables);
    }

    convertScriptToByteCode(script) {
        const scriptElement = script.scriptElement;
        const variableGroup = script.variableGroup;
        const language = document.querySelector('.language-config').value || 'All';
        const variables = this.getVariablesByLanguage(variableGroup, language);
        this.evaluateVariables(variables);

        let byteCodeOffset = 0;
        for (let variable of variables) {
            if (variable.name === 'byte_code_offset') {
                byteCodeOffset = variable.value;
            }
        }
        let byteCode = new Array(byteCodeOffset).fill(0);

        let scriptElements = scriptElement.querySelectorAll(".command, .raw-bytes, .memory-editor");
        for (let scriptElement of scriptElements) {
            switch (scriptElement.className) {
                case 'command':
                    byteCode.push(...this.convertCommandToByteCode(scriptElement, variables));
                    break;
                case 'raw-bytes':
                    byteCode.push(...this.convertRawBytesToByteArray(scriptElement, variables));
                    break;
                case 'memory-editor':
                    byteCode.push(...this.convertMemoryEditorToByteArray(scriptElement, variables));
                    break;          
            }

        }
        return byteCode;
    }

}

class DotArtistConverter extends Converter {
    dotArtistElement = null;
    dotArtistGridElement = null;
    forceShowNumbers = true;

    constructor() {
        super();
        this.dotArtistElement = document.querySelector('.dot-artist-container');
        this.dotArtistGridElement = document.createElement("div");
        this.dotArtistGridElement.classList.add("canvas");
        this.dotArtistElement.appendChild(this.dotArtistGridElement);
        this.initializeDotArtist();
        this.addEventListeners();
    }

    initializeDotArtist() {
        for (let i=0;i<20;i++) {
            let row = document.createElement("div");
            row.classList.add("row");
            for (let j=0;j<24;j++) {
                row.appendChild(this.createPixelElement(0));
            }
            this.dotArtistGridElement.appendChild(row);
        };
    }

    clearDotArtist() {
        for (let i=0;i<20;i++) {
            let row = this.dotArtistGridElement.children[i];
            for (let j=0;j<24;j++) {
                let pixel = row.children[j];
                pixel.className = "pixel uninitialized";
            }
        }
    }

    convertByteCodeToDotArtist(byteCode) {
        this.clearDotArtist();
        const binaryCode = this.convertByteCodeToBinary(byteCode);
    
        outer_loop:
        for (let i=0;i<20;i++) {
            let row = this.dotArtistGridElement.children[i];
            for (let j=0;j<24;j++) {  
                let idx = i*24+j;
                let bit = binaryCode[idx]; 
                let pixel = row.children[j]; // set class to bit-1, bit-2, or bit-3
                pixel.classList.add(`bit-${bit}`);

                pixel.classList.remove("uninitialized")
                pixel.classList.add("highlight-bit");
                if (i == 0) {
                    pixel.classList.add("first-row");
                }
                if (j == 23) { // if we're at the end of the row, highlight the last bit
                    pixel.classList.add("last-bit");
                }
                if (idx == binaryCode.length - 1) {
                    pixel.classList.add("last-bit");
                    // loop over all pixels in this row until this one, and give the tag last-row
                    for (let k=0;k<=j;k++) {
                        row.children[k].classList.add("last-row");
                    }
                    // loop over the remaining pixels, in the row above, given that current row is not the first row
                    if (i > 0) {
                        let prev_row = this.dotArtistGridElement.children[i-1];
                        for (let k=j+1;k<24;k++) {
                            prev_row.children[k].classList.add("last-row");
                        }
                    }
                }

                if (idx  == binaryCode.length -1) {
                    break outer_loop;
                }
            }
        };
    }

    setDotInnerValue(dotElement, showUninitialized=true) {
        dotElement.classList.add("show-bit");
        let classList = dotElement.classList;
        if (classList.contains("uninitialized")) {
            if (showUninitialized) {
                dotElement.innerHTML = "-";
                return;
            }
            dotElement.innerHTML = "";
            return;
        } else {
            for (let i=0;i<dotElement.classList.length;i++) {
                let className = classList[i];
                if (className.startsWith("bit-")) {
                    let bit = className.slice(4);
                    if ((bit === 'undefined') || (bit === '0')) {
                        if (showUninitialized) {
                            dotElement.innerHTML = "-";
                            return;
                        }
                        dotElement.innerHTML = "";
                        return;
                    }
                    dotElement.innerHTML = bit;
                    break;
                }
            }
        }
    }

    removeDotInnerValue(dotElement) {
        dotElement.classList.remove("show-bit");
        dotElement.innerHTML = "";
    }

    setAllDotInnerValues(showUninitialized=true) {
        for (let i=0;i<20;i++) {
            let row = this.dotArtistGridElement.children[i];
            for (let j=0;j<24;j++) {
                let pixel = row.children[j];
                this.setDotInnerValue(pixel, showUninitialized);
            }
        }
    }

    removeAllDotInnerValues() {
        for (let i=0;i<20;i++) {
            let row = this.dotArtistGridElement.children[i];
            for (let j=0;j<24;j++) {
                let pixel = row.children[j];
                this.removeDotInnerValue(pixel);
            }
        }
    }

    createPixelElement(bit) {
        let dotElement = document.createElement("div");
        dotElement.classList.add("pixel");
        dotElement.classList.add(`bit-${bit}`);

        dotElement.addEventListener("mouseover", () => {
            if (this.forceShowNumbers) {
                return;
            }

            this.setDotInnerValue(dotElement);
        });

        dotElement.addEventListener("mouseout", () => {
            if (this.forceShowNumbers) {
                return;
            }

            this.removeDotInnerValue(dotElement);
        });
        return dotElement;
    }

    changeDotArtistBackgroundColor(color) {
        this.dotArtistElement.style.setProperty('--dot-artist-background', color);
    }

    convertByteCodeToBinary(byteCode) {
        let binaryCode = new Array(byteCode.length*4).fill(0);
        for (let i=0;i<byteCode.length;i++) {
            for (let j=0;j<4;j++) {
                binaryCode[i*4+j] = ((byteCode[i] >> (j*2)) & 0x3)
            }
        }
        return binaryCode;
    }

    convertScriptToDotArtist(script) {
        this.changeDotArtistBackgroundColor(`rgb(${script.color})`);
        let byteCode = this.convertScriptToByteCode(script);

        if (debug) {
            console.log(byteCode.map(x => "0x" + x.toString(16)));
            console.log(byteCode.map(x => x.toString(16).padStart(2, "0")).join(""));
        }

        this.convertByteCodeToDotArtist(byteCode);

        if (this.forceShowNumbers) {
            this.setAllDotInnerValues(false);
        }
    }

    resetDotArtist() {
        const byteCode = [];
        this.convertByteCodeToDotArtist(byteCode);
        this.changeDotArtistBackgroundColor(`rgb(180, 180, 180)`);
        if (this.forceShowNumbers) {
            this.setAllDotInnerValues(false);
        }
    }

    addEventListeners() {
        this.addOptionMenu()
    }

    addOptionMenu() {
        const outerDiv = document.querySelector('.dot-artist-config-options');
        const optionsIcon = outerDiv.querySelector('.dot-artist-options-icon');

        const allElements = outerDiv.querySelectorAll('img, svg');
        allElements.forEach((element) => {
            element.addEventListener('click', () => {
                element.classList.toggle('inactive');
            });
        });

        optionsIcon.addEventListener('click', () => {
            allElements.forEach((element) => {
                if (element !== optionsIcon) {
                    element.classList.toggle('show');
                }
            });
        });

        const highlightCode = outerDiv.querySelector('.dot-artist-highlight-icon');
        highlightCode.addEventListener('click', () => {
            this.dotArtistElement.classList.toggle("highlight_selection")
        });

        const showNumbers = outerDiv.querySelector('.dot-artist-number-overlay-icon');
        showNumbers.addEventListener('click', () => {
            this.forceShowNumbers = !this.forceShowNumbers;

            if (this.forceShowNumbers) {
                this.setAllDotInnerValues(false);
            } else {
                this.removeAllDotInnerValues();
            }
        });
    }
}

class JsonExporter extends Converter {
    convertScriptToJson(script) {
      const scriptElement = script.scriptElement;
      const variableGroup = script.variableGroup;
      const language = document.querySelector('.language-config').value || 'All';
       
      let json = {
        'title': script.title.titleElement.firstElementChild.value,
        'color': script.color,
        'language': language,
        'input_fields': [],
        'variables': this.getVariables(variableGroup)
      };
  
      let scriptElements = scriptElement.querySelectorAll(".command, .raw-bytes, .memory-editor");
      for (let scriptElement of scriptElements) {
        switch (scriptElement.className) {
            case 'command':
                json.input_fields.push(this.convertCommandToJson(scriptElement));
                break;
            case 'raw-bytes':
                json.input_fields.push(this.convertRawBytesToJson(scriptElement));
                break;
            case 'memory-editor':
                json.input_fields.push(this.convertMemoryEditorToJson(scriptElement));
                break;
        }
      }

      json.documentation = script.title.documentation.getDocumentation();
      return json;
    }
  
    convertCommandToJson(commandElement) {
      let commandInput = commandElement.querySelector(".command-input");
      let selectedCommand = commandInput.querySelector(".command-input-cmd").firstElementChild;
      let paramElements = commandInput.querySelectorAll("input");

      const command = {
        'type': 'command',
        'name': selectedCommand.value,
        'parameters': []
      };

      for (let i = 1; i < paramElements.length; i++) {
        const paramElement = paramElements[i];
        const paramInfo = {
            'name': paramElement.placeholder,
            'type': paramElement.type,
            'value': paramElement.value
        }
        command.parameters.push(paramInfo);
      }
      return command;
    }
  
    convertRawBytesToJson(rawBytesElement) {
      const rawBytes = {
        'type': 'raw_bytes',
        'raw_bytes': rawBytesElement.querySelector('.raw-bytes-input').value,
        'repetitions': rawBytesElement.querySelector('.raw-bytes-repeat-input').value
      };
  
      return rawBytes;
    }

    convertMemoryEditorToJson(memoryEditorElement) {
      const memoryEditor = {
        'type': 'memory_editor',
        'memory': []
      };
  
      const byteInputs = Array.from(memoryEditorElement.querySelectorAll('.memory-byte')).filter(byteInput => !byteInput.classList.contains('no-show'));
      for (let byteInput of byteInputs) {
        memoryEditor.memory.push(byteInput.value);
      }
  
      return memoryEditor;
    }
  
    exportScripts(scripts) {
        const convertedScripts = [];
        for (let script of scripts) {
            const convertedScript = this.convertScriptToJson(script);
            convertedScripts.push(convertedScript);
        }
        return convertedScripts;
    }
}
