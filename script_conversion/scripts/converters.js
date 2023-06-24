
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


    // function to convert command element to byte code
    convertCommandToByteCode(commandElement, variables) {
        const byteCode = [];

        let commandInput = commandElement.querySelector(".command-input");
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
        const language = scriptElement.querySelector('.script-language').value || 'English';

        // get all variables, then sanitize them
        const variables = this.getVariablesByLanguage(variableGroup, language);
        this.sanitizeVariableValues(variables);

        let byteCode = [];
        // TODO: convert the script to byte code
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

    // reset the dot artist
    resetDotArtist() {
        const byteCode = [];
        this.convertByteCodeToDotArtist(byteCode);
        this.changeDotArtistBackgroundColor(`rgb(180, 180, 180)`);
    }
}