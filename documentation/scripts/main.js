"use strict";

// let icon_open = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF" class="ico_show"><path d="M0 0h24v24H0z" fill="none"/><path d="M7 10l5 5 5-5z"/></svg>`
// let icon_closed = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M10 17l5-5-5-5v10z"/><path d="M0 24V0h24v24H0z" fill="none"/></svg>`
let icon_closed = `<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0z" fill="none"/><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>`
let icon_open = `<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0z" fill="none"/><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/></svg>`
let poke_icon = `<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><rect fill="none" height="24" width="24"/><path d="M14.5,12c0,1.38-1.12,2.5-2.5,2.5c-1.38,0-2.5-1.12-2.5-2.5s1.12-2.5,2.5-2.5C13.38,9.5,14.5,10.62,14.5,12z M22,12 c0,5.52-4.48,10-10,10C6.48,22,2,17.52,2,12S6.48,2,12,2C17.52,2,22,6.48,22,12z M20,12h-4c0-2.21-1.79-4-4-4c-2.21,0-4,1.79-4,4H4 c0,4.41,3.59,8,8,8C16.41,20,20,16.41,20,12z"/></svg>`
let file_icon = `<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0z" fill="none"/><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>`

let documentation = {
    "hoo_1":{
        "title":"Hall of Origin / Jubilife City",
        "subTitle":"Arceus void route",
        "dir":"void_route/pokemon_encounters/arceus",
        "tags":"arceus,shiny_hunt,sinjoh_ruins,repeatable",
        "links":["transfer_pokemon","hoo_2"],
        "description":"This route will allow you to fight Arceus in the Hall of Origin, or Jubilife City. Both of them are infinitely obtainable, and you can do run-away encounters between them for shinyhunting purposes. The Arceus obtained with location 'Hall of Origin' can be used to unlock the Sinjoh Ruins event in Heartgold and Soulsilver. For transferring up to newer games, please refer to |$0transferring pokemon|.<br><br>Note:<br>If you have already progressed to Spear Pillar do not perform this route, as it will softlocks you and recovering the game is very tedious. In this case, please refer to |$1this void route| that will work regardless of story progression.",
        "requirements":{"Items:":["Explorer Kit","Bicycle (as Key item)","Pokéballs"],"Story Progression:":["Entered the contest hall building at least once","Entered the Undeground at least once","Have not been to Spear Pillar yet"]},
        "void_route":"hoo_1.txt"
    },
    "transfer_pokemon":{
        "title":"Battletower",
        "subTitle":"Darkrai void route",
        "dir":"void_route/pokemon_encounters/darkrai/old",
        "tags":"archived,battle_tower",
        "description":
        "currently outdated, see updated instead",
        "requirements":{"Items:":[],"Story Progression:":[]},
        "void_route":"test"
    }
}

function addOverview(){
    for (let routeName in documentation){
        let routeFile = documentation[routeName]
        let routeDir = createDirs(routeFile)
        addDocumentToDir(routeDir,routeFile)
    }
}

function createDirs(file){
    let dirs = file["dir"].split("/")
    let prevDir = document.querySelector(".ow_documents")

    for (let dir of dirs){
        let curDir = document.querySelector(`.${dir}`)
        if (curDir) {
            prevDir = curDir
            continue
        }
        prevDir = createNewDir(dir,prevDir)
    }
    return prevDir
}

function createNewDir(dir,prevDir){
    let curDir = document.createElement("div")
    curDir.classList.add(dir,"ow","hide")
    
    let container = document.createElement("div")
    container.classList.add("f_ow_container")

    let dirName = document.createElement("h3")
    dirName.innerText = dir.replaceAll("_"," ")

    container.innerHTML += icon_closed
    container.appendChild(dirName)
    curDir.appendChild(container)

    container.addEventListener("click",function() {
        if (curDir.classList.contains("hide")) {
            curDir.classList.remove("hide")
            container.innerHTML = icon_open
            container.appendChild(dirName)
            return
        }
        curDir.classList.add("hide")
        container.innerHTML = icon_closed
        container.appendChild(dirName)
    })

    prevDir.appendChild(curDir)
    return curDir
}

function addDocumentToDir(dir,file) {
    let doc = document.createElement("div")
    doc.classList.add("ow")

    let container = document.createElement("div")
    container.classList.add("f_ow_container")

    let title = document.createElement("h4")
    title.innerText = file.title

    container.innerHTML += file_icon
    container.appendChild(title)


    doc.appendChild(container)
    doc.addEventListener('click', function(){
        loadDocument(file)
    })
    dir.appendChild(doc)

}

function loadDocument(file) {
    let docArea = document.querySelector(".document_txt_area")
    docArea.innerHTML = null;
    let title = document.createElement("h1")
    title.innerText = file.title
    let subTitle = document.createElement("h5")
    subTitle.innerText = file.subTitle
    subTitle.classList.add("sub_title")

    docArea.appendChild(title)
    docArea.appendChild(subTitle)

    docArea.appendChild(createTxtField(file,"description","paragraph"))
    docArea.appendChild(createRequirementField(file))

    createTxtFieldFromFile(`../documents/${file.void_route}`,docArea,"void_steps","paragraph")
    addDocumentListener()
}

function createTxtField(file,subheader,cssTag){
    let field = document.createElement("div")
    let subHeader = document.createElement("h2")
    subHeader.innerHTML =  (subheader.charAt(0).toUpperCase() + subheader.slice(1)).replaceAll("_"," ")

    let textArea = convertText(file[subheader],file.links)
    textArea.classList.add(subheader,cssTag,"txt_area")

    field.appendChild(subHeader)
    field.appendChild(textArea)

    return field
}

async function createTxtFieldFromFile(url,docArea,subheader,cssTag){
    let field = document.createElement("div")
    let subHeader = document.createElement("h2")
    subHeader.innerHTML = (subheader.charAt(0).toUpperCase() + subheader.slice(1)).replaceAll("_"," ")
    field.appendChild(subHeader)
    let d = document.createElement("div")
    d.classList.add(cssTag)
    let p
    try {
        const response = await fetch(url);
        const data = await response.text();

        for (let line of data.split("\n")){
            p = document.createElement("p")
            p.innerHTML = line
            d.appendChild(p)
        }
        field.appendChild(d)
        docArea.appendChild(field)
    } catch (err) {
        console.error(err);
        field.innerHTML = "Error"
    }
}
      

function createRequirementField(file){
    let requirements = document.createElement("div")
    let subHeader = document.createElement("h2")
    subHeader.innerHTML = "Requirements"

    let textArea = document.createElement("div")
    let reqArea
    let reqHeader
    let reqItemList
    let reqItem
    for (let reqList in file["requirements"]){
        reqArea = document.createElement("div")
        reqArea.classList.add("req_list")
        reqHeader = document.createElement("h3")
        reqHeader.innerHTML = reqList
        reqHeader.classList.add("req_header")
        reqItemList = document.createElement("ul")

        for (let req of file["requirements"][reqList]){
            reqItem = document.createElement("li")
            reqItem.innerHTML = req
            reqItem.classList.add("req_item")
            reqItemList.appendChild(reqItem)
        }
        reqArea.append(reqHeader)
        reqArea.append(reqItemList)
        textArea.appendChild(reqArea)

    }
    requirements.appendChild(subHeader)
    requirements.appendChild(textArea)

    return requirements
}

function convertText(text,links) {
    let textArea = document.createElement("div")
    let p = `<p>`
    let textArray = text.split("|")

    for (let txtField of textArray){
        if (txtField[0] == "$") {
            p += createLink(txtField,links)
            continue
        }
        p += txtField
    }

    p += `</p>`
    textArea.innerHTML += p
    return textArea
}

function createLink(txtField,links) {
    let a = `<a class="doc_link" data="${links[parseInt(txtField[1])]}">${txtField.substring(2,txtField.length)}</a>`
    return a
}

function addDocumentListener(){
    let docLinks = document.querySelectorAll(".doc_link")
    for (let docLink of docLinks) {
        docLink.addEventListener('click', function(){
            loadDocument(documentation[docLink.getAttribute("data")])
        })
    }
}

document.addEventListener("DOMContentLoaded", function () {
    addOverview();
});