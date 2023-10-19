
let debug = false;
// Converter: this class will convert the input scripts to byte code

class Converter {
    // primary operator function
    evalPrimaryOperators(input) {
        // primary operators: >>, <<, &, |, ^
        let output = [];
        let operator = null;
        for (let i = 0; i < input.length; i++) {
            const component = input[i];
            if (typeof component === 'string') {
                // If the component is a string, check if it's an operator, otherwise ignore it
                if (component.match(/^[&|^]|<<|>>$/)) {
                    operator = component;
                }
                else { // push the component to the output, might be a secondary operator
                    operator = null;
                    output.push(component);
                }
            }
            else if (typeof component === 'number') {
                // If the component is a number, perform the operation
                switch (operator) {
                    case null:
                        output.push(component);
                        break;
                    case '>>':
                        output[output.length-1] >>= component;
                        break;
                    case '<<':
                        output[output.length-1] <<= component;
                        break;
                    case '&':
                        output[output.length-1] &= component;
                        break;
                    case '|':
                        output[output.length-1] |= component;
                        break;
                    case '^':
                        output[output.length-1] ^= component;
                        break;
                    default:
                        output.push(component);
                }
            }
        }
        return output;
    }

    // secondary operator function
    evalSecondaryOperators(input) {
        // secondary operators: +, -, *, /, %
        let output = 0;
        let operator = '+';
        for (let i = 0; i < input.length; i++) {
            const component = input[i];
            if (typeof component === 'string') {
                // If the component is a string, check if it's an operator, otherwise ignore it
                if (component.match(/^[+\-*/%]$/)) {
                    operator = component;
                }
            }
            else if (typeof component === 'number') {
                // If the component is a number, perform the operation
                switch (operator) {
                    case '+':
                        output += component;
                        break;
                    case '-':
                        output -= component;
                        break;
                    case '*':
                        output *= component;
                        break;
                    case '/':
                        output /= component;
                        break;
                    case '%':
                        output %= component;
                        break;
                }
            }
        }
        return output;
    }

    // function to safely evaluate the input
    safeEval(input, variables) {
        // Sanitize the input
        const sanitizedInput = this.sanitizeInput(input, variables);
        if (sanitizedInput === null) {
            return null;
        }
        let primaryOutput = this.evalPrimaryOperators(sanitizedInput);
        let value = this.evalSecondaryOperators(primaryOutput);
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
        const regex = /(0x[\da-fA-F]+|\d+|[+\-*/&|^]|<<|>>|\[[^\]]+\])/g;
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
            const sanitizedValue = this.sanitizeInput(variable.value, variables);
            variable.value = sanitizedValue;
        }
    }

    // function to convert a value to a byte array, given the bit count
    convertValueToByteArray(value, bitCount) {
        const byteArray = [];
      
        for (let i = 0; i < bitCount; i += 8) {
          const byte = (value >> i) & 0xFF;
          byteArray.push(byte);
        }
      
        return byteArray;
    }

    // function to convert a value to a byte array, no bit count
    convertValueToByteArrayNoBitCount(value) {
        if (value === 0) { return [0];}
        const byteArray = [];
        
        // Iterate over each byte
        while (value > 0) {
            byteArray.unshift(value & 0xff); // Extract the least significant byte
            value >>= 8; // Shift the value right by 8 bits
        }

        return byteArray;
    }

    // function to return sanitized value for 'options' type
    sanitizeOptionsValue(inputElement, variables) {
        const datalistName = inputElement.getAttribute('list');
        const datalist = datalists[datalistName]
        let inputOptionId = datalist.getOptionIdByName(inputElement.value) || this.safeEval(inputElement.value, variables) || 0x0; // first try to get the option id by name, then try to evaluate the value, then default to 0x0
        return inputOptionId;
    }

    // function to return sanitized value for other types
    sanitizeOtherValue(inputElement, variables) {
        return this.safeEval(inputElement.value, variables) || 0x0;
    }

    // function to convert command element to byte code
    convertCommandToByteCode(commandElement, variables) {
        const byteCode = [];

        let commandInput = commandElement.querySelector(".command-input");
        let inputElements = commandInput.querySelectorAll("input");
        for (let inputElement of inputElements) {
            // get the input type, datalist, and value
            const conversionType = inputElement.conversionType;
            const bitCount = parseInt(inputElement.bitSize.substring(1));
            let sanitizedValue = null;

            if (conversionType === 'options'){
                // sanitize the value
                sanitizedValue = this.sanitizeOptionsValue(inputElement, variables);
            } else {
                // sanitize the value
                sanitizedValue = this.sanitizeOtherValue(inputElement, variables);
            }
            const sanitizedValueArray = this.convertValueToByteArray(sanitizedValue, bitCount);

            // add the sanitized values to the byte code
            byteCode.push(...sanitizedValueArray);
        }
        return byteCode;
    }

    // function to convert raw bytes element to byte code
    convertRawBytesToByteArray(rawBytesElement, variables) {
        // get the raw bytes
        const rawBytesInput = rawBytesElement.querySelector(".raw-bytes-input")
        const sanitizedRawBytes = this.safeEval(rawBytesInput.value, variables) || 0x0;
        const rawBytesArray = this.convertValueToByteArrayNoBitCount(sanitizedRawBytes);

        // get the repitition count
        const rawBytesRepeatInput = rawBytesElement.querySelector(".raw-bytes-repeat-input");
        const sanitizedRawBytesRepeat = this.safeEval(rawBytesRepeatInput.value, variables) || 0x0;
        
        // repeat the raw bytes
        const byteArray = [];

        for (let i = 0; i < sanitizedRawBytesRepeat; i++) {
            byteArray.push(...rawBytesArray);
        }
        return byteArray;
    }

    // function to convert a script to byte code
    convertScriptToByteCode(script) {
        const scriptElement = script.scriptElement;
        const variableGroup = script.variableGroup;
        const language = scriptElement.querySelector('.script-language').value || 'All';

        // get all variables, then sanitize them
        const variables = this.getVariablesByLanguage(variableGroup, language);
        this.sanitizeVariableValues(variables);

        let byteCode = [];
        let scriptElements = scriptElement.querySelectorAll(".command, .raw-bytes");
        for (let scriptElement of scriptElements) {
            switch (scriptElement.className) {
                case 'command':
                    // process the command
                    byteCode.push(...this.convertCommandToByteCode(scriptElement, variables));
                    break;
                case 'raw-bytes':
                    // process the raw bytes
                    byteCode.push(...this.convertRawBytesToByteArray(scriptElement, variables));
                    break;            
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
        //this.convertByteCodeToDotArtist([0x00]);
        this.initializeDotArtist();
        this.addEventListeners();
    }

    // initialize the dot artist
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

    // function to clear the dot artist
    clearDotArtist() {
        //this.dotArtistGridElement.innerHTML = "";
        // loop through all the rows, setting all the pixels to 0
        for (let i=0;i<20;i++) {
            let row = this.dotArtistGridElement.children[i];
            for (let j=0;j<24;j++) {
                let pixel = row.children[j];
                // just set the class list to only pixel and bit-0
                pixel.className = "pixel uninitialized";
            }
        }
    }

    // function to convert a script to byte code
    convertByteCodeToDotArtist(byteCode) {
        this.clearDotArtist();
        const binaryCode = this.convertByteCodeToBinary(byteCode);
    
        outer_loop: // label for the outer loop
        for (let i=0;i<20;i++) {
            let row = this.dotArtistGridElement.children[i];
            for (let j=0;j<24;j++) {  
                let idx = i*24+j;
                let bit = binaryCode[idx];          
                // set class to bit-1, bit-2, or bit-3
                let pixel = row.children[j];
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

    // function to create a dot element
    createPixelElement(bit) {
        let dotElement = document.createElement("div");
        dotElement.classList.add("pixel");
        dotElement.classList.add(`bit-${bit}`);

        dotElement.addEventListener("mouseover", function() {
            dotElement.classList.add("show-bit");
            let classList = dotElement.classList;

            if (classList.contains("uninitialized")) {
                dotElement.innerHTML = "#";
                return;
            } else {
                for (let i=0;i<classList.length;i++) {
                    let className = classList[i];
                    if (className.startsWith("bit-")) {
                        dotElement.innerHTML = className.slice(4);
                        break;
                    }
                }
            }
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
        let binaryCode = new Array(byteCode.length*4).fill(0);
        for (let i=0;i<byteCode.length;i++) {
            for (let j=0;j<4;j++) {
                binaryCode[i*4+j] = ((byteCode[i] >> (j*2)) & 0x3)
            }
        }
        return binaryCode;
    }

    // function to convert a script to DotArtist
    convertScriptToDotArtist(script) {
        this.changeDotArtistBackgroundColor(`rgb(${script.color})`);
        let byteCode = this.convertScriptToByteCode(script);
        if (debug) {
            // print the byte code as hex with 0x prefix
            console.log(byteCode.map(x => "0x" + x.toString(16)));
            // also print it as one long hex string
            // fix above line so that each byte is 2 characters long, 0 padded
            console.log(byteCode.map(x => x.toString(16).padStart(2, "0")).join(""));
        }
        this.convertByteCodeToDotArtist(byteCode);
        
    }

    // reset the dot artist
    resetDotArtist() {
        const byteCode = [];
        this.convertByteCodeToDotArtist(byteCode);
        this.changeDotArtistBackgroundColor(`rgb(180, 180, 180)`);
    }

    // add event listeners to the options
    addEventListeners() {
        this.addOptionMenu()
    }

    addOptionMenu() {
        const outerDiv = document.querySelector('.dot-artist-options');
        console.log(outerDiv)
        const listMenu = outerDiv.querySelector('.list_menu');

        // Add a click event to all elements inside the outer div
        const allElements = outerDiv.querySelectorAll('svg');
        allElements.forEach((element) => {
            element.addEventListener('click', () => {
                element.classList.toggle('inactive');
            });
        });

        // Add a click event specifically for the "list_meny" element
        listMenu.addEventListener('click', () => {
            allElements.forEach((element) => {
                if (element !== listMenu) {
                    element.classList.toggle('show');
                }
            });
        });

        // Add a click event specifically on the "highlight_code" element
        const highlightCode = outerDiv.querySelector('.highlight_code');
        highlightCode.addEventListener('click', () => {
            this.dotArtistElement.classList.toggle("highlight_selection")
        });
    }
}

class JsonExporter extends Converter {
    // function to convert a script to byte code
    convertScriptToJson(script) {
      const scriptElement = script.scriptElement;
      const variableGroup = script.variableGroup;
      const language = scriptElement.querySelector('.script-language').value || 'All';
       
      let json = {
        'title': script.title.titleElement.firstElementChild.value,
        'color': script.color,
        'language': language,
        'input_fields': [],
        'variables': this.getVariables(variableGroup)
      };
  
      let scriptElements = scriptElement.querySelectorAll(".command, .raw-bytes");
      for (let scriptElement of scriptElements) {
        switch (scriptElement.className) {
          case 'command':
            // process the command
            json.input_fields.push(this.convertCommandToJson(scriptElement));
            break;
          case 'raw-bytes':
            // process the raw bytes
            json.input_fields.push(this.convertRawBytesToJson(scriptElement));
            break;
        }
      }
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
        // skip the first element, which is the command name
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
      };
  
      // process raw bytes details
      const rawBytesInput = rawBytesElement.querySelector('.raw-bytes-input');
      rawBytes.raw_bytes = rawBytesInput.value;
  
      // process repetitions
      const rawBytesRepeatInput = rawBytesElement.querySelector('.raw-bytes-repeat-input');
      rawBytes.repetitions = rawBytesRepeatInput.value;
  
      return rawBytes;
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
