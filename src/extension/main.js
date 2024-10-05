const storageName = "urlConcatStrings";

document.addEventListener("DOMContentLoaded", onExtensionLoad);

function onExtensionLoad() {
    document.getElementById("addStringBtn").addEventListener('click', addString);
    document.getElementById("showStringBtn").addEventListener('click', listSavedStrings);
}

function addString() {
    var strName = prompt("Enter string name");
    var strVal = prompt("Enter string");
    if (strName && strVal) {
        chrome.storage.local.get(storageName, function(result) {
            let savedUrlStrings = result[storageName] || {};
            savedUrlStrings[strName] = strVal;

            chrome.storage.local.set({ [storageName]: savedUrlStrings }, function() {
                console.log(`Saved: ${storageName} = ${JSON.stringify(savedUrlStrings)}`);
            });
        });
    } else {
        alert("Both name and value are required!");
    }
}

function listSavedStrings() {
    loadStorage(storageName)
    .then(data => {
        var stringContainer = document.getElementById("stringContainer");
        stringContainer.innerHTML = ""; // Clear previous content

        if (validateStorageData(data)) {
            var savedUrlStrings = data[storageName] || {};
            if(isDataObjectEmpty(savedUrlStrings)){
                stringContainer.innerHTML = "No strings found";
                return;
            }
            showSavedStrings(stringContainer, savedUrlStrings);
        } else {
            stringContainer.innerHTML = "No strings found";
        }
    })
    .catch(error => {
        console.error("Error retrieving data:", error);
    });
}

function loadStorage(storageName) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(storageName, function(result) {
            if (chrome.runtime.lastError) {
                return reject(chrome.runtime.lastError);
            }
            resolve(result);
        });
    });
}

function validateStorageData(data) {
    return data !== null && data !== undefined;
}

function showSavedStrings(stringListContainer, savedStrings) {
    for (var key in savedStrings) {
        if (savedStrings.hasOwnProperty(key)) {
            var li = document.createElement("li");
            li.textContent = key;
            li.appendChild(createAddButton(savedStrings, key));
            li.appendChild(createDeleteBtn(key));
            stringListContainer.appendChild(li);
        }
    }
}

function createAddButton(savedUrlStrings, stringKey) {
    let addButton = document.createElement("button");
    addButton.textContent = "+";
    addButton.addEventListener("click", (function(stringKey) {
        return function() {
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                let currentTab = tabs[0];
                let newUrl = new URL(currentTab.url);
                
                newUrl.pathname += savedUrlStrings[stringKey];
                console.log(`New URL: ${newUrl.toString()}`);

                chrome.scripting.executeScript({
                    target: { tabId: currentTab.id },
                    func: (newUrl) => {
                        history.pushState(null, null, newUrl);
                    },
                    args: [newUrl.toString()]
                });
            });
        };
    })(stringKey));

    return addButton;
}

function createDeleteBtn(stringKey) {
    let deleteButton = document.createElement("button");
    deleteButton.textContent = "-";
    deleteButton.addEventListener("click", (function(stringKey) {
        return function() {
            deleteString(stringKey).then(() => {
                listSavedStrings(); // Refresh the displayed list after deletion
            });
        };
    })(stringKey));

    return deleteButton;
}

function deleteString(strName) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(storageName, function(result) {
            let savedUrlStrings = result[storageName] || {};
            delete savedUrlStrings[strName];

            chrome.storage.local.set({ [storageName]: savedUrlStrings }, function() {
                console.log(`Deleted: ${strName}`);
                resolve();
            });
        });
    });
}

function isDataObjectEmpty(dataObject) {
    return dataObject === null || Object.keys(dataObject).length === 0;
}