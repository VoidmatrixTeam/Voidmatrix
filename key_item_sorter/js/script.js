const items = {
    "Explorer Kit": { goodness: "bad" },
    "Loot Sack": { goodness: "good", requires_cheats: true },
    "Rule Book": { goodness: "bad", requires_cheats: true },
    "Poké Radar": { goodness: "bad" },
    "Point Card": { goodness: "good" },
    "Journal": { goodness: "bad" },
    "Seal Case": { goodness: "bad" },
    "Fashion Case": { goodness: "good", side_effects: "opens mailbox" },
    "Seal Bag": { goodness: "bad", requires_cheats: true },
    "Pal Pad": { goodness: "good", side_effects: "opens score points window" },
    "Works Key": { goodness: "bad" },
    "Old Charm": { goodness: "bad", requires_cheats: true },
    "Galactic Key": { goodness: "bad" },
    "Red Chain": { goodness: "bad", requires_cheats: true },
    "Town Map": { goodness: "good", param_count: 1 },
    "Vs. Seeker": { goodness: "good", param_count: 1 },
    "Coin Case": { goodness: "good", param_count: 2 },
    "Old Rod": { goodness: "bad" },
    "Good Rod": { goodness: "bad" },
    "Super Rod": { goodness: "bad" },
    "Sprayduck": { goodness: "bad" },
    "Poffin Case": { goodness: "bad" },
    "Bicycle": { goodness: "good" },
    "Suite Key": { goodness: "good", param_count: 1 },
    "Oak's Letter": { goodness: "good", param_count: 2, requires_cheats: true },
    "Lunar Wing": { goodness: "good" },
    "Member Card": { goodness: "bad", requires_cheats: true },
    "Azure Flute": { goodness: "bad", requires_cheats: true },
    "S.S. Ticket": { goodness: "bad", requires_cheats: true },
    "Contest Pass": { goodness: "good", param_count: 1, requires_cheats: true },
    "Magma Stone": { goodness: "good", requires_cheats: true },
    "Parcel": { goodness: "bad", requires_cheats: true },
    "Coupon 1": { goodness: "good", requires_cheats: true },
    "Coupon 2": { goodness: "good", param_count: 3, requires_cheats: true },
    "Coupon 3": { goodness: "good", requires_cheats: true },
    "Storage Key": { goodness: "bad" },
    "Secret Potion": { goodness: "bad" }
};

const itemList = document.getElementById("itemList");
const resultSection = document.getElementById("resultSection");
const cheatsButton = document.querySelector("button[onclick='toggleCheats()']");

let cheatsAllowed = false;
populateItemList();
updateCheatsButtonText();

function toggleCheats() {
    cheatsAllowed = !cheatsAllowed;
    updateCheatsButtonText();
    populateItemList();
}

function updateCheatsButtonText() {
    cheatsButton.textContent = cheatsAllowed ? "Disallow Cheated Items" : "Allow Cheated Items";
}

function assignItemClass(element, itemKey, isAutoSelected = false) {
    const item = items[itemKey];

    if (item.side_effects) {
        element.classList.add("side-effect-item");
        element.title = item.side_effects;
    }

    if (item.goodness === "bad") {
        element.classList.add("bad-item");
    } else if (item.param_count) {
        element.classList.add("good-item");
    } else {
        element.classList.add("safe-item");
    }

    if (isAutoSelected) {
        element.classList.add("auto-selected");
    }
}

function populateItemList() {
    const currentStates = {};
    document.querySelectorAll(".item-row").forEach(row => {
        const item = row.querySelector("span").textContent;
        const obtained = row.querySelector(".obtained-checkbox").checked;
        const suggest = row.querySelector(".suggest-checkbox").checked;
        currentStates[item] = { obtained, suggest };
    });

    itemList.innerHTML = "";
    for (const item in items) {
        if (!cheatsAllowed && items[item].requires_cheats) continue;

        const row = document.createElement("div");
        row.classList.add("item-row");

        const itemName = document.createElement("span");
        itemName.textContent = item;
        assignItemClass(itemName, item);
        row.appendChild(itemName);

        const obtainedInput = document.createElement("input");
        obtainedInput.type = "checkbox";
        obtainedInput.classList.add("obtained-checkbox");
        obtainedInput.dataset.item = item;
        obtainedInput.checked = currentStates[item]?.obtained || false;
        row.appendChild(obtainedInput);

        const suggestInput = document.createElement("input");
        suggestInput.type = "checkbox";
        suggestInput.classList.add("suggest-checkbox");
        suggestInput.dataset.item = item;
        suggestInput.checked = currentStates[item]?.suggest || true;
        row.appendChild(suggestInput);

        obtainedInput.addEventListener("change", () => validateInputs(item, obtainedInput, suggestInput));
        suggestInput.addEventListener("change", () => validateInputs(item, obtainedInput, suggestInput));

        itemList.appendChild(row);
    }
}

function validateInputs(item, obtainedInput, suggestInput) {
    if (obtainedInput.checked && !suggestInput.checked) {
        alert(`Error: "${item}" cannot be "Obtained" while being excluded from suggestions.`);
        obtainedInput.checked = false;
        suggestInput.checked = true;
    }
}

function getUserSelections() {
    const obtainedItems = Array.from(document.querySelectorAll(".obtained-checkbox:checked")).map(input => input.dataset.item);
    const excludedFromSuggestions = Array.from(document.querySelectorAll(".suggest-checkbox:not(:checked)")).map(input => input.dataset.item);
    return { obtainedItems, excludedFromSuggestions };
}

function getSortedItems(selectedOptions) {
    const goodItems = [];
    const safeItems = [];
    const badItems = [];

    selectedOptions.forEach(item => {
        const goodness = items[item].goodness;
        if (goodness === "good") {
            if (items[item].param_count)
                goodItems.push(item);
            else
                safeItems.push(item);
        } else if (goodness === "bad") badItems.push(item);
    });

    const sorted = [];

    goodItems.forEach(goodItem => {
        sorted.push(goodItem);
        const paramCount = items[goodItem].param_count || 0;

        for (let i = 0; i < paramCount; i++) {
            if (badItems.length > 0) {
                sorted.push(badItems.shift());
            } else if (safeItems.some(item => items[item].side_effects)) {
                sorted.push(safeItems.splice(safeItems.findIndex(item => items[item].side_effects), 1)[0]);
            } else if (safeItems.length > 0) {
                sorted.push(safeItems.shift());
            }
        }
    });

    const remainingItems = [...badItems, ...safeItems];
    sorted.unshift(...remainingItems);

    return {
        sortedItems: sorted,
        remainingBadCount: badItems.length
    };
}

function renderList(title, items, autoSelectedItems = [], message = "") {
    const container = document.createElement("div");
    if (title) {
        const header = document.createElement("h3");
        header.textContent = title;
        container.appendChild(header);
    }

    const list = document.createElement("ul");
    items.forEach(item => {
        const li = document.createElement("li");
        li.textContent = item;
        assignItemClass(li, item, autoSelectedItems.includes(item));
        if (autoSelectedItems.includes(item)) {
            li.classList.add("autoselected");
        }
        list.appendChild(li);
    });

    if (message) {
        const messageElement = document.createElement("p");
        messageElement.textContent = message;
        switch (message) {
            case "Solved":
                messageElement.classList.add("success-message");
                break;
            case "No solution":
                messageElement.classList.add("error-message");
                break;
            default:
                messageElement.classList.add("info-message");
        }
        container.appendChild(messageElement);
    }

    container.appendChild(list);

    resultSection.appendChild(container);
}

function sortItems() {
    resultSection.innerHTML = "";

    const { obtainedItems, excludedFromSuggestions } = getUserSelections();

    const userResult = getSortedItems(obtainedItems);

    if (userResult.remainingBadCount === 0) {
        renderList(null, userResult.sortedItems, [], "Solved");
        return;
    }

    const allGoodItems = Object.keys(items)
        .filter(
            item =>
                items[item].goodness === "good" &&
                items[item].param_count &&
                (!items[item].requires_cheats || cheatsAllowed) &&
                !excludedFromSuggestions.includes(item)
        )
        .sort((a, b) => items[b].param_count - items[a].param_count);

    const unusedGoodItems = allGoodItems.filter(item => !obtainedItems.includes(item));
    const autoSelected = [...obtainedItems];
    const autoSelectedItems = [];
    let remainingBadCount = userResult.remainingBadCount;

    for (const goodItem of unusedGoodItems) {
        const paramCount = items[goodItem].param_count;
        autoSelected.push(goodItem);
        autoSelectedItems.push(goodItem);
        remainingBadCount -= paramCount;

        if (remainingBadCount <= 0) break;
    }

    const autoResult = getSortedItems(autoSelected);

    if (autoResult.remainingBadCount === 0) {
        renderList("Original", userResult.sortedItems, [], "No solution");
        renderList("Suggested", autoResult.sortedItems, autoSelectedItems, "Solved");
    } else {
        renderList("Original", userResult.sortedItems, [], "No solution");
    }
}
