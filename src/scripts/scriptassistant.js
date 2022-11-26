let scriptData;
let base;

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
    //let payload = [0x07,0x0,0x24,0x29,0x26,0x2,0x46]
    const formattedPayload = formatPayload(payload);
    // get 'dotartist-output' with querySelector
    let dotArtistWrapper = document.querySelector(".dotartist_output");
    // clear dotArtistWrapper
    dotArtistWrapper.innerHTML = "";
    // add empty div with class 'dotartist' containing 20 divs with class "row" containing 24 divs with class "dot"
    let dotArtist = document.createElement("div");
    dotArtist.classList.add("dotartist");

    for (let i=0;i<20;i++) {
        let row = document.createElement("div");
        row.classList.add("row");
        for (let j=0;j<24;j++) {
            let dot = document.createElement("div");
            dot.classList.add("dot");

            // set background color of dot based on value in payload
            let b = formattedPayload[i*24+j];
            let rgb = 115-b*(115/4) <<16 | 181-b*(180/4) <<8 |115-b*(115/4)
            dot.style.backgroundColor = `#${hexToStr(rgb,6)}`
            //addMouseEventsForDot(dot,rgb);
            enableDotEditing(dot,b);
            
            row.appendChild(dot);
        }
        dotArtist.appendChild(row);
    }

    dotArtistWrapper.appendChild(dotArtist);
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
const addMouseEventsForDot = function(dot,rgb) {
    dot.addEventListener("mouseover",function() {

        dot.style.backgroundColor = `#${hexToStr(rgb-0x303030,6)}`
    })
    // if you unhover over a dot, remove the value of the dot
    dot.addEventListener("mouseout",function() {
        // set background color of dot based on value in payload
        dot.style.backgroundColor = `#${hexToStr(rgb,6)}`
    })
}

const convertPayload = function(text) {
    let calculatorOutput = document.querySelector(".calculator_output");
    let convertedCalculatorPayload = "";
    let bytes = []
    for (let line of text.split("\n")) {
        let payload = getPayload(line.split("-"));
        if (payload === -1) {
            if (text.split("\n").length === 1) {
                bytes.push(0x0);
                break;
            }
            convertedCalculatorPayload += "invalid\n"; continue;
        }
        bytes = bytes.concat(payload);
        debugHexLog(payload);
        const convertedPayload = convertToCalculatorPayload(payload);
        // convert to string, with every 3 digits separated by a comma using regex
        convertedCalculatorPayload += convertedPayload.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")+"\n";
    }
    calculatorOutput.innerText = convertedCalculatorPayload;
    updateDotArtist(bytes)
}

// it may look odd to not use bit shifting here, but javascript doesn't support large numbers
// instead we can use the BigInt library to handle large numbers created through string concatenation
const convertToCalculatorPayload = function(payload) {
    let convertedLine = "";
    // for loop is backwards because of endianness
    for (let i=payload.length-1;i>=0;i--) {
        convertedLine += hexToStr(payload[i],2);
    }
    let bigNum = BigInt("0x"+convertedLine,16);
    return bigNum
}

// test data
// cmd: 0x7 -adr:[base] + 0x2EAF0 -val: 0xB0
// cmd: 0x96 -sp: 0x1EA -lv: 0x50 -itm: 0x20 -wk: 0x10 

const getPayload = function(incomingData) {
    if (!incomingData[0].startsWith("cmd:")) { return -1}
    let scriptCommand = incomingData[0].replaceAll(' ','').slice(4);
    let scriptCommandData = scriptData[scriptCommand]
    if (!scriptCommandData) {return -1}
    // console.log(scriptCommandData)

    let bytes = new Array(2+scriptCommandData.parameters.length).fill(0);
    for (let i=0;i<2;i++) {
        bytes[i] = scriptCommand >> (i*8);
    }
    let params = scriptCommandData.parameters;
    let index = 0;
    for (let i=1;i<incomingData.length;i++) {
        const param = incomingData[i].split(":")[0];
        const paramValue = formatParameter(incomingData[i]);
        const paramCount = params.filter(p => p==param).length;
        
        if (paramCount == 0) {return -1;}
        // console.log(paramValue)
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
    if (!base & formattedData.includes("[base]")) {
        alert("Please enter a base address first")
    }
    // replace [base] with base value
    formattedData = formattedData.replaceAll("[base]",`0x${hexToStr(base)}`);
    let splitData = formattedData.replaceAll(" ","").split("+");
    // add all values together
    let sum = 0;
    for (let i=0;i<splitData.length;i++) {
        if (isHexadecimal(splitData[i])) {
            sum += parseInt(splitData[i],16);
        }
    }
    return sum;
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
    baseInput.addEventListener('input',function() {if (isHexadecimal(baseInput.value)) {base = strToHex(baseInput.value); convertPayload(payloadInput.value)}})
    payloadInput.addEventListener('input',function () {convertPayload(payloadInput.value);})

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

