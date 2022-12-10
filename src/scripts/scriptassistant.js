let scriptData;
let globalAddresses = { 
    "EN":{"base_address":0x02106FC0,"collision_address":0x2056C06,"menupatch_address":0x203506D,"min_base":0x226D260,"RNG":0x021C4D48},
    "JP":{"base_address":0x02108818,"collision_address":0x20593E0,"min_base":0x2271940},
    "DE":{"base_address":0x02107100,"collision_address":0x2056C76,"min_base":0x226D4A0},
    "FR":{"base_address":0x02107140,"collision_address":0x2056C76,"min_base":0x226D5E0},
    "IT":{"base_address":0x021070A0,"collision_address":0x2056C76,"min_base":0x226D440},
    "SP":{"base_address":0x02107160,"collision_address":0x2056C76,"menupatch_address":0x020350B5,"min_base":0x226D600},
    "KO":{"base_address":0x021045C0,"collision_address":0x20570DE,"min_base":0x2274B00},
};

let language = "EN";
let base;
let byteAllignment = 0; // allignment may be 0 or 1 for even or add bytes
let selectedScript = 0;
let bytesToRemove = 6; // default to 6, the amount of bytes that are 0s after the dotartist data


// DEBUG
const debugHexLog = function (value) {
    // if type of value is array or list
    console.log("DEBUG: ",value)
    if (Array.isArray(value)) {
        // iterate through array
        for (let i = 0; i < value.length; i++) {
            // print hex value of each element
            console.log(value[i].toString(16));
        }
        return;
    }
    // if type of value is number
    if (typeof value === "number") {
        // print hex value
        console.log(value.toString(16));
        return;
    }
    // if type of value is string
    if (typeof value === "string") {
        // print hex value
        console.log(value.charCodeAt(0).toString(16));
        return;
    }
}

const updateDotArtist = function(payload) {
    const formattedPayload = formatPayload(payload);
    let dotArtistWrapper = document.querySelector(".dotartist_output");
    dotArtistWrapper.innerHTML = "";
    let dotArtist = document.createElement("div");
    dotArtist.classList.add("dotartist");

    for (let i=0;i<20;i++) {
        let row = document.createElement("div");
        row.classList.add("row");
        for (let j=0;j<24;j++) {  
            let b = formattedPayload[i*24+j];          
            row.appendChild(createDot(b));
        }
        dotArtist.appendChild(row);
    }

    dotArtistWrapper.appendChild(dotArtist);
}

const createDot = function(b) {
    let dot = document.createElement("div");
    dot.classList.add("dot");

    // set background color of dot based on value in payload
    let rgb = 115-b*(115/4) <<16 | 181-b*(180/4) <<8 |115-b*(115/4)
    dot.style.backgroundColor = `#${hexToStr(rgb,6)}`
    addMouseEventsForDot(dot,rgb,b);
    // enableDotEditing(dot,b);
    return dot;
}

const formatPayload = function(payload) {
    let formattedPayload = new Array((24*20)).fill(0);
    const startPayload = formattedPayload.length-payload.length*4;
    for (let i=0;i<payload.length;i++) {
        for (let j=0;j<4;j++) {
            formattedPayload[startPayload+i*4+j] = ((payload[i] >> (j*2)) & 0x3)
        }
    }
    return formattedPayload;
}

const enableDotEditing = function(dot,b) {
    dot.addEventListener("mouseover",function() {
        // check if user is holding down left mouse button
        const mouseDown = event.buttons === 1;
        if (mouseDown) {
            b = (b+1)%4;
            let rgb = 115-b*(115/4) <<16 | 181-b*(180/4) <<8 |115-b*(115/4)
            dot.style.backgroundColor = `#${hexToStr(rgb,6)}`
        }
    })
}

// disabled by default
const addMouseEventsForDot = function(dot,rgb,b) {
    dot.addEventListener("mouseover",function() {

        //dot.style.backgroundColor = `#${hexToStr(rgb-0x303030,6)}`
        // set innerText of dot to 'b'
        dot.innerText = b;
    })
    // if you unhover over a dot, remove the value of the dot
    dot.addEventListener("mouseout",function() {
        // set background color of dot based on value in payload
        //dot.style.backgroundColor = `#${hexToStr(rgb,6)}`
        // remove innerText of dot
        dot.innerText = "";
    })

}

const updateRawBytes = function(payload) {
    let rawBytesOutput = document.querySelector(".raw_bytes_output");
    rawBytesOutput.innerHTML = "";
    for (let i=0;i<payload.length;i++) {
        let rawByteStringParagraph = document.createElement("p");
        rawByteStringParagraph.classList.add("raw_byte_string");
        rawByteStringParagraph.innerHTML = rawByteString(payload[i]) + "\n";

        if (i === selectedScript) {
            rawByteStringParagraph.classList.add("selected_script");
        }

        rawBytesOutput.appendChild(rawByteStringParagraph);     
    }
}

const rawByteString = function(bytes) {
    let byteString = "";
    for (let i=0;i<bytes.length;i++) {
        byteString += `0x${hexToStr(bytes[i],2)},`;
    }
    // remove last comma
    byteString = byteString.slice(0,-1);
    return byteString;
}

const updateCalculator = function(payload) {
    let calculatorOutput = document.querySelector(".calculator_output");
    calculatorOutput.innerHTML = "";

    for (let i=0;i<payload.length;i++) {
        let calculatorLine = document.createElement("p");
        calculatorLine.classList.add("calculator_line");
        calculatorLine.innerHTML = rawCalculatorString(payload[i]).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")+"\n";
        // if i is selectedScript, add red text
        if (i === selectedScript) {
            calculatorLine.classList.add("selected_script");
        }
        calculatorOutput.appendChild(calculatorLine);     
    }

}

// it may look odd to not use bit shifting here, but javascript doesn't support large numbers
// instead we can use the BigInt library to handle large numbers created through string concatenation
const rawCalculatorString = function(bytes) {
    let convertedLine = "";
    // for loop is backwards because of endianness
    for (let i=bytes.length-1;i>=0;i--) {
        convertedLine += hexToStr(bytes[i],2);
    }
    if (convertedLine === "") {
        return "--";
    }
    let bigNum = BigInt("0x"+convertedLine,16);
    return bigNum
}

const convertPayload = function(input) {
    let payload = formatInputAsPayload(input);
    updateCalculator(payload);
    updateDotArtist(payload[selectedScript]);
    updateRawBytes(payload);
}

const formatInputAsPayload = function(input) {
    //let bytes = (input.split("\n").map(line => getPayload(line.split("|")))); // this didn't allow consecutive lines to be combined, even though it's cleaner
    let bytes = []
    let i = 0;
    // split into lines and remove everything after // (comments)
    let splitInput = input.split("\n").map(line => line.split("//")[0]);
    bytesToRemove = 6;
    while (i < splitInput.length) {
        let line = splitInput[i]; 
        let tempBytes = []

        if (line.split(":")[0].toLowerCase() === "bytestoremove") {
            bytesToRemove = parseInt(line.split(":")[1]);
            console.log("bytesToRemove: "+ bytesToRemove);
            i++;
            continue;
        }

        if (line.startsWith("concat:")) {
            let n = parseInt(line.split(":")[1]);
            tempBytes = getConcatedPayload(n,splitInput,i);
            i += n;
        } else {
            const payload = getPayload(line.split("|"));
            tempBytes = payload;
        }

        tempBytes = removeEndPadding(tempBytes,bytesToRemove);
        bytes.push(tempBytes);
        i++;
    }
    return bytes;
}

const getConcatedPayload = function(n,splitInput,i) {
    let tempBytes = [];
    for (let j=0;j<n;j++) {
        if (i+j >= splitInput.length) { break; }
        if (splitInput[i+j+1].split(":")[0] === "bytesToRemove") {
            bytesToRemove = parseInt(splitInput[i+j+1].split(":")[1]);
            continue;
        }
        const payload = getPayload(splitInput[i+j+1].split("|"));
        tempBytes = tempBytes.concat(payload);
    }
    return tempBytes;
}

const removeEndPadding = function(payload,bytesToRemove) {
    for (let i=0;i<bytesToRemove;i++) {
        if (payload[payload.length-1] === 0) {
            payload.pop();
            continue;
        }
        break;
    }
    return payload;
}

// test data
// cmd: 0x7 -adr:[base] + 0x2EAF0 -val: 0xB0
// cmd: 0x96 -sp: 0x1EA -lv: 0x50 -itm: 0x20 -wk: 0x10 

// concat:2
// pad: 1 -val: 0x0
// cmd: 0x7 -adr: + 0x2EAF0 -val: 0xB0
// cmd: 0x96 -sp: 0x1EA -lv: 0x50 -itm: 0x20 -wk: 0x10 

// concat:3
// cmd: 0x7 -adr: + 0x2EAF0 -val: 0xB0
// pad: 1 -val: 0x0
// bytesToRemove: 1
// cmd: 0x96 -sp: 0x1EA -lv: 0x50 -itm: 0x20 -wk: 0x10 

const getPayload = function(incomingData) {
    if (incomingData[0].startsWith("pad:") || incomingData[0].startsWith("padding:")) { 
        let padAmount = parseInt(incomingData[0].split(":")[1]);
        // you can define an optional byte value with -val:0xXX, otherwise it defaults to 0x00
        let padding = new Array();
        let paddingValue = 0x00;
        if (incomingData.length > 1) {
            if (incomingData[1].startsWith("val:")) {
                paddingValue = formatParameter(incomingData[1]);

            }
        }

        for (let i=0;i<padAmount;i++) {
            let tempVal = paddingValue;
            if (tempVal === 0) {
                padding.push(0);
            }
            while (tempVal > 0) {
                padding.push(tempVal & 0xFF);
                tempVal >>= 8;
            }
        }

        return padding
    }
    if (!incomingData[0].startsWith("cmd:")) { return []}
    let scriptCommand = incomingData[0].replaceAll(' ','').slice(4).toLowerCase();
    let scriptCommandData = scriptData[scriptCommand]
    if (!scriptCommandData) {return []}

    let bytes = new Array(2+scriptCommandData.parameters.length).fill(0);
    for (let i=0;i<2;i++) {
        bytes[i] = (scriptCommand >> (i*8)) & 0xFF;
    }
    let params = scriptCommandData.parameters;
    let index = 0;
    for (let i=1;i<incomingData.length;i++) {
        const param = incomingData[i].split(":")[0];
        const paramValue = formatParameter(incomingData[i]);
        const paramCount = params.filter(p => p==param).length;
        if (paramCount == 0) {return [];}
        for (let j=0;j<paramCount;j++) {
            bytes[2+index] = (paramValue >> (j*8)) & 0xFF;
            index++;
        }    
    }
    return bytes;
}

const formatParameter = function(data) {
    let formattedData = data.split(":")[1];
    // if data contains [base] replace with base
    for (let b of ["[base]","[base_address]"]) {
        if (formattedData.includes(b)) {
            if (!base) {alert("Please enter a base address first"); return [];}
            // replace [base] with base value
            formattedData = formattedData.replaceAll(b,`0x${hexToStr(base)}`);
        }
    }

    for (const addr of Object.keys(globalAddresses[language])){
        formattedData = formattedData.replaceAll(addr,`0x${hexToStr(globalAddresses[language][addr])}`);
    }

    return unsafeCalc(formattedData);
}

const unsafeCalc = function(data) {
    // perform +,-,*,/ operations in a proffesional manner using the eval function
    // to prevent any malicious code from being executed, only allow the following characters
    // first replace all spaces with nothing
    data = data.replaceAll(" ","");
    // then, convert all hex values to decimal
    data = data.replaceAll(/0x[0-9a-fA-F]+/g, (match) => {
        return parseInt(match,16);
    });

    const allowedChars = "0123456789+-*/()><&";
    for (let i=0;i<data.length;i++) {
        if (!allowedChars.includes(data[i])) {
            if (isHexadecimal(data[i])) {
                console.log("non allowed char found: " + data[i]);
                return parseInt(data[i],16);
            }
            return 0;
        }
    }
    // perform the calculation
    return eval(data); // what could possibly go wrong?
}

const strToHexStr = function (value) {
    return value.replace("0x",'').replace(/^0+(?=\d)/, '')
}

const strToHex = function (value) {
    return parseInt(strToHexStr(value),16)
}

const hexToStr = function (value,padAmount=0) {
    let str =value.toString(16)
    return str.padStart(padAmount,"0")
}

const isHexadecimal = str => str.replace("0x",'').split('').every(c => '0123456789ABCDEFabcdef'.indexOf(c) !== -1);

const addEventListeners = function() {
    let baseInput = document.querySelector(".base");
    let payloadInput = document.querySelector('.payload_input');
    // select language dropdown menu through id
    let languageSelect = document.getElementById("language_select");
     
    baseInput.addEventListener('input',function() {if (isHexadecimal(baseInput.value)) {base = strToHex(baseInput.value); convertPayload(payloadInput.value)}})
    payloadInput.addEventListener('input',function () {convertPayload(payloadInput.value);})
    languageSelect.addEventListener('change',function() {language = languageSelect.value; convertPayload(payloadInput.value);})


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
    scriptData = await getJsonFromUrl(`data/scriptdata.json`);
    addEventListeners();
    updateDotArtist([0]);
});

