/* 
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
var node_id="";
var active=null;
function FfIsaAddon() {
    this.addListeners();
}

FfIsaAddon.prototype.loadVars = function() {
    var loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"].getService(Components.interfaces.mozIJSSubScriptLoader);
    loader.loadSubScript('chrome://isf_isa_addon/content/Math.uuid.js', this);
    var sss = Components.classes["@mozilla.org/content/style-sheet-service;1"]
        .getService(Components.interfaces.nsIStyleSheetService);
    var ios = Components.classes["@mozilla.org/network/io-service;1"]
        .getService(Components.interfaces.nsIIOService);
    var uri = ios.newURI('chrome://isf_isa_addon/skin/ff_addon.css', null, null);
    sss.loadAndRegisterSheet(uri, sss.USER_SHEET);
    
    this.pref = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.isf-isa@mozilla.org.");
    this.lastMajorRelease = 8; // This must be incremented by 1 after every major update (that adds any functionality). This is used to decide whether to show the help page after the add-on is installed/updated. It should only be showed if the user just installed the add-on or if it's a major update
    this.currentDoc = null;
    this.eventClientX = null;
    this.eventClientY = null;
    this.ISADiv = null;
    this.ISAInputField = null;
    this.ISACancelInputField = null;
    this.listOfInput = new Array();
    
    this.prefChangeObserver = new this.PrefObserver("extensions.isf-isa@mozilla.org.",
        function(branch, name) {
            switch (name) {
                case "general.enabled":
                    //var enab = IsaOverlay.FAddon.enabled; // If the user just opened Firefox, this is gonna be undefined
                    this.enabled = IsaOverlay.FAddon.pref.getBoolPref("general.enabled");
                    if (this.enabled != undefined)
                        IsaOverlay.FAddon.toggleISA();
                    else 
                        IsaOverlay.FAddon.updateIcons();
                    break;
                case "general.quickSearchEnabled":
                    IsaOverlay.FAddon.quickSearchEnabled = IsaOverlay.FAddon.pref.getBoolPref("general.quickSearchEnabled");
                    break;
                //					case "general.contextMenuEnabled":
                //						if (IsaOverlay.FAddon.pref.getBoolPref("general.contextMenuEnabled"))
                //							document.getElementById("contentAreaContextMenu").addEventListener("popupshowing", IsaOverlay.FAddon.showOrHideContextMenu, false);
                //						else {
                //							document.getElementById("QuickWikiContextMenu").hidden = true;
                //							document.getElementById("contentAreaContextMenu").removeEventListener("popupshowing", IsaOverlay.FAddon.showOrHideContextMenu, false);
                //						}
                //						break;
                case "general.ISAStatusBarIcon":
                    IsaOverlay.FAddon.pref.getBoolPref("general.ISAStatusBarIcon");
                    break;
                case "appearance.maxWidth":
                    IsaOverlay.FAddon.maxWidth = IsaOverlay.FAddon.pref.getIntPref("appearance.maxWidth");
                    break;
            //                case "shortcuts.quickSearchModifier":
            //                    IsaOverlay.FAddon.quickSearchModifier = IsaOverlay.FAddon.pref.getIntPref("shortcuts.quickSearchModifier");
            //                    break;
            //                case "shortcuts.quickSearchKey":
            //                    IsaOverlay.FAddon.quickSearchKey = IsaOverlay.FAddon.pref.getIntPref("shortcuts.quickSearchKey");
            //                    break;
            }
        }
        );
    this.prefChangeObserver.register();
}

FfIsaAddon.prototype.eventClickIcon = function(event) {
    IsaOverlay.FAddon.eventClickIconImpl(event);
}

FfIsaAddon.prototype.eventClickIconImpl = function(event) {
    //this.currentDoc = event.originalTarget.ownerDocument;
    if (event.button == 0) // If it's a left-click, toggle 
    {
        this.pref.setBoolPref("general.enabled", ! this.enabled);
        this.enabled = !this.enabled;
        this.toggleISA();
    }
    else if (event.button == 2) { // If it's a right-click, open the options menu
        event.preventDefault();
        window.openDialog('chrome://isf_isa_addon/content/options.xul', null, 'chrome,centerscreen,dependent');
    }
}

FfIsaAddon.prototype.eventLoad = function(event) {
    IsaOverlay.FAddon.eventLoadImpl(event);
}

FfIsaAddon.prototype.eventLoadImpl = function(event) {
    this.loadVars();
    this.updateIcons();
    var browser = top.getBrowser();
    var lastReleaseUsed = this.pref.getIntPref("general.lastMajorRelease");
    if (lastReleaseUsed == 0) {
        browser.selectedTab = browser.addTab("chrome://isf_isa_addon/content/newinstall.html");
        this.pref.setIntPref("general.lastMajorRelease", this.lastMajorRelease);
    } else if (this.lastMajorRelease > lastReleaseUsed) {
        browser.selectedTab = browser.addTab("chrome://isf_isa_addon/content/updated.html");
        this.pref.setIntPref("general.lastMajorRelease", this.lastMajorRelease);
    }
}

FfIsaAddon.prototype.addListeners = function() {
    gBrowser.addEventListener("click", this.eventClickArea, false);
    gBrowser.addEventListener("load", this.eventLoad, true);
}

FfIsaAddon.prototype.showDiv = function(node) {
    if(node.id==undefined || node.id=="" || node.id==null){
        var isa_generated_id = Math.uuid(10,16);
        node.setAttribute("id", isa_generated_id);
    }
    node_id = node.id;
    this.currentDoc.getElementById("ISAForm").setAttribute("ref", node_id);
    var divKeyboard = this.currentDoc.getElementById("ff_isa_div");
    divKeyboard.style.bottom = "0px";
    divKeyboard.style.display = "block";
}

FfIsaAddon.prototype.hideDiv = function() {
    node_id = null;
    if (this.currentDoc.getElementById("ISAForm") != null){
        this.currentDoc.getElementById("ISAForm").removeAttribute("ref");
        var divKey = this.currentDoc.getElementById("ff_isa_div");
        divKey.style.display = "none";
    }
}

// TO-DO terminare funzione di parsing per abilitare la funzione di nexttab
FfIsaAddon.prototype.parseInput = function() {
    var servSession = Components.classes["@mozilla.org/browser/sessionstore;1"]
    .getService(Components.interfaces.nsISessionStore);
    var currentTab = gBrowser.selectedTab;
    var retrievedData = servSession.getTabValue(currentTab, "inputList");
    if (retrievedData == ''){
        alert("parse");
        var listOfInput = [];
        var listInput = this.currentDoc.getElementsByTagName("input");
        var listArea = this.currentDoc.getElementsByTagName("textarea");
        var list = listInput.concat(listArea);
        for (var i = 0; i < list.length;i++){
            var el = list[i];
            if(el.getAttribute('type') == 'text' || el.getAttribute('type') == '' || el.getAttribute('type') == undefined || el.getAttribute('type') == 'password' || el.getAttribute('type') == 'email'){
                if(el.id==undefined || el.id=="" || el.id==null){
                    var isa_generated_id = Math.uuid(10,16);
                    el.setAttribute("id", isa_generated_id);
                }
                listOfInput[i] = el.id;
            }
        }
        servSession.setTabValue(currentTab, "inputList", listOfInput);
    }
}

FfIsaAddon.prototype.addDiv = function() {
    doc = this.currentDoc;
    if (doc instanceof HTMLDocument) {
        // is this an inner frame?
        if (doc.defaultView.frameElement) {
            // Frame within a tab was loaded.
            // Find the root document:
            while (doc.defaultView.frameElement) {
                doc = doc.defaultView.frameElement.ownerDocument;
            }
        }
    }
      
    if(this.isHTML(doc)){
        //TO-DO commentata sino a termine evoluzione nexttab
        // this.parseInput();
        //this.attachCss();
        var divISA_keyboard = doc.createElementNS("http://www.w3.org/1999/xhtml", "div");
        divISA_keyboard.style.position = "fixed";
        divISA_keyboard.style.left = this.calculateKeyboardDivPosition(400);
        divISA_keyboard.style.bottom = "10px";
        divISA_keyboard.style.display = "none";
        divISA_keyboard.id = "ff_isa_div";
        divISA_keyboard.className = "ff_isa_div";
        divISA_keyboard.innerHTML = this.ReadFile("chrome://isf_isa_addon/content/isadiv.html");
        
        //TO-DO riabilitare quando terminata funzione di nexttab
        //this.ISATabInputField = divISA_keyboard.getElementsByTagName("input")[2];
        
        //TO-DO riabilitare quando terminata funzione di nexttab
        //this.ISATabInputField.addEventListener("click", this.eventISATabKeyPress, false);
        
        this.ISADiv = this.currentDoc.body.appendChild(divISA_keyboard);
        this.ISADiv.addEventListener("click", this.eventISAClickAll, false);
        
    }
};

FfIsaAddon.prototype.calculateKeyboardDivPosition = function(factor) {
    // document.width has been deprecated in Firefox 6. The else clause can be removed after support for Firefox 5 is dropped.
    var width;
    if (this.currentDoc.width == undefined) {
        var body = this.currentDoc.getElementsByTagName('body')[0];
        width = this.currentDoc.defaultView.getComputedStyle(body, null).width;
        var indexAux = width.lastIndexOf("px");
        if (indexAux != -1)
            width = width.substring(0, indexAux);
        else
            width = 0;
    } else
        width = this.currentDoc.width;
    // Set horizontal position.
    return width / 2 - factor + "px";
}


FfIsaAddon.prototype.removeListeners = function() {
    gBrowser.removeEventListener("click", this.eventClickArea, false);
    gBrowser.removeEventListener("load", this.eventLoad, true);
}

FfIsaAddon.prototype.eventClickArea = function(event) {
    IsaOverlay.FAddon.eventClickAreaImpl(event);
}

FfIsaAddon.prototype.eventClickAreaImpl = function(event) {
     // If it's a left-click, show ISA
            if((this.verifyArea(event.target)) && !(event.target.id == "isa_writtentext")){
                if (event.button == 0){
                    var div = event.originalTarget.ownerDocument.getElementById("ff_isa_div");
                    if (div == null ) {
                    this.addDiv();
                    }
                    this.hideDiv();
                    this.showDiv(event.target);
                }
        }
    
//    if (event.button == 0){ // If it's a left-click, show ISA
//        if(event.target.id != "isa_writtentext"){   
//            if(this.verifyArea(event.target)){
//                var div = event.originalTarget.ownerDocument.getElementById("ff_isa_div");
//                if (div == null ) {
//                    this.addDiv();
//                }
//                this.hideDiv();
//                this.showDiv(event.target);
//            }
//        }
//    }
}


FfIsaAddon.prototype.verifyArea = function(node) {
    doc = node.ownerDocument;
    this.currentDoc = doc;
    var is_html = this.isHTML(doc),
    is_xul  = this.isXUL(doc);
    if (is_html) {
        /* HTML */
        if (node.tagName.toLowerCase()==('textarea')){
            return true;
        }
        else if(node.tagName.toLowerCase()==('input')){
            if(node.getAttribute('type') == 'text' || node.getAttribute('type') == '' || node.getAttribute('type') == undefined || node.getAttribute('type') == 'password' || node.getAttribute('type') == 'email'){
                return true; 
            }
        }

    } else if (is_xul) {

    }
    return false;
}

FfIsaAddon.prototype.isXUL = function (doc) {
    var contentType = doc && doc.contentType,
    is_xul = (contentType == 'application/vnd.mozilla.xul+xml'),
    is_my_readme;
    try {
        is_my_readme = location && location.href == itsalltext.README;
    } catch (e) {
        is_my_readme = false;
    }
    return is_xul && !is_my_readme;
};

FfIsaAddon.prototype.isHTML = function (doc) {
    var contentType,
    location,
    is_html,
    is_usable
        
    /* Check that this is a document we want to play with. */
    contentType = doc.contentType;
    location = doc.location;
    is_html = (contentType == 'text/html' ||
        contentType == 'text/xhtml' ||
        contentType == 'application/xhtml+xml');
    is_usable = is_html &&
    location &&
    location.protocol !== 'about:' &&
    location.protocol !== 'chrome:';

    return is_usable ;
};


FfIsaAddon.prototype.toggleISA = function() {
    // This is called when this.enabled has already been toggled by the preference observer.
    if (!this.enabled) {
        active = false;
        this.removeDiv();
        this.removeListeners();
    } else {
        if(active == false){
            active = true;   
            this.addListeners();
        }
    }
    this.updateIcons();
}


FfIsaAddon.prototype.updateIcons = function() { 
  
    var statusImg = document.getElementById("ISAIconImage");
    if (this.enabled) {
        if (statusImg) {
            statusImg.setAttribute("on", "1");
            statusImg.tooltipText = "SCRIVILO CON ISA è attivato.\nClicca su un campo di testo per usare la tastiera virtuale";
        }
    } else {
        if (statusImg) {
            statusImg.setAttribute("on", "0");
            statusImg.tooltipText = "SCRIVILO CON ISA è disattivato.\nClicca con il tasto sinistro per attivarlo";//"QuickWiki is off.\nLeft-click to toggle.\nRight-click to open Options.";
        }
    }
}

FfIsaAddon.prototype.setDivPosition = function(div) {
        
    var width;
    if (this.currentDoc.width == undefined) {
        var body = this.currentDoc.getElementsByTagName('body')[0];
        width = this.currentDoc.defaultView.getComputedStyle(body, null).width;
        var indexAux = width.lastIndexOf("px");
        if (indexAux != -1)
            width = width.substring(0, indexAux);
        else
            width = 0;
    } else
        width = this.currentDoc.width;
	
    // Set horizontal position.
    if (this.eventClientX + this.maxWidth + 64 > width)
        if (width > this.maxWidth)
            div.style.left = width - this.maxWidth - 64 + "px";
        else
            div.style.left = "0px";
    else
        div.style.left = this.eventClientX + "px";

    // Set vertical position.
    div.style.top = this.eventClientY + this.currentDoc.documentElement.scrollTop + this.currentDoc.body.scrollTop + 10 + "px";
}


FfIsaAddon.prototype.setISAFillDivPosition = function(div) {
    var width;
    if (this.currentDoc.width == undefined) {
        var body = this.currentDoc.getElementsByTagName('body')[0];
        width = this.currentDoc.defaultView.getComputedStyle(body, null).width;
        var indexAux = width.lastIndexOf("px");
        if (indexAux != -1)
            width = width.substring(0, indexAux);
        else
            width = 0;
    } else
        width = this.currentDoc.width;
	
    // Set horizontal position.
    div.style.left = width / 2 - 350 + "px";
	
    // Set vertical position.
    div.style.top = this.currentDoc.documentElement.scrollTop + this.currentDoc.body.scrollTop + window.outerHeight * 0.4 + "px";
}

FfIsaAddon.prototype.eventISACloseSubmitKeyPress = function(event) {
    IsaOverlay.FAddon.eventISACloseSubmitKeyPressImpl(event);
}
FfIsaAddon.prototype.eventISACloseSubmitKeyPressImpl = function(event) {
    this.hideDiv();
}

FfIsaAddon.prototype.eventISACancelKeyPress = function(event) {
    IsaOverlay.FAddon.eventISACancelKeyPressImpl(event);
}
FfIsaAddon.prototype.eventISACancelKeyPressImpl = function(event) {
    node_id = null;
    this.hideDiv();
}
FfIsaAddon.prototype.eventISAClickAll = function(event) {
    IsaOverlay.FAddon.eventISAClickAllPressImpl(event);
}
FfIsaAddon.prototype.eventISAClickAllPressImpl = function(event) {
    if (event.target.tagName.toLowerCase()==('a')){
        this.isa_write(event.target.getAttribute('val'),event.target);
    }
}

FfIsaAddon.prototype.isa_write = function(char_to_write, node) {
    var previous_value = "";
    var previous_value_lastpos= 0;
    //some conversion to intercept reserved char from html like " \ and CR
    if (char_to_write=="virg")
        char_to_write = '"';
    else if (char_to_write=="bs")
        char_to_write = '\\';
    // se il click è su enter verifico di essere in una textarea e genero il codice per il CR
    // altrimenti svuoto la variabile
    else if (char_to_write=="enter"){
        if (node.tagName.toLowerCase()==('textarea')){
            char_to_write = '\u000A';
        }
    }
    switch (char_to_write) {
        case 'backspace':
            previous_value = this.currentDoc.getElementById(node_id).value;
            previous_value = previous_value.substring(0,previous_value.length-1);
            this.currentDoc.getElementById(node_id).value = previous_value;
            break;
        case 'backspaceall':
            this.currentDoc.getElementById(node_id).value = " ";
            break;
        case 'backspaceword':
            previous_value = this.currentDoc.getElementById(node_id).value;
            previous_value_lastpos = previous_value.lastIndexOf(' ');
            this.currentDoc.getElementById(node_id).value = previous_value.substring(0,previous_value_lastpos);
            break;
        case 'close':
            this.hideDiv();
            break;
        case 'enter':
            // Create new event
            var e = this.currentDoc.createEvent('KeyboardEvent');
            // Init key event
            e.initKeyEvent('keypress', true, true, null, false, false, false, false, 13, 0);
            // Dispatch event into document
            this.currentDoc.getElementById(node_id).dispatchEvent(e);
            break;
        default:
            previous_value = this.currentDoc.getElementById(node_id).value;
            // caso in cui nella textbox c'erano suggerimenti tipo "scrivere qui...ecc.." ed è stato premuto il tasto SVUOTA
            if (previous_value==" ")
                this.currentDoc.getElementById(node_id).value = char_to_write;
            else
                this.currentDoc.getElementById(node_id).value = previous_value + char_to_write;
            break;
    }
}


// TO-DO terminare funzione di parsing
FfIsaAddon.prototype.eventISATabKeyPress = function(event) {
    IsaOverlay.FAddon.eventISATabKeyPressImpl(event);
}
// TO-DO terminare funzione di parsing
FfIsaAddon.prototype.eventISATabKeyPressImpl = function(event) {
    node_id = null;
    var nodeCurr_id = this.currentDoc.getElementById("ISAForm").getAttribute("ref");
    var currnode = this.currentDoc.getElementById(nodeCurr_id);
    var ss = Components.classes["@mozilla.org/browser/sessionstore;1"]
    .getService(Components.interfaces.nsISessionStore);
    var currentTab = gBrowser.selectedTab;
    var retrievedData = ss.getTabValue(currentTab, "inputList");
    if(retrievedData != ''){
        var list = retrievedData.split(","); 
        for (var j = 0; j< list.length;j++){
            var el = list[j];
            alert(el);
            alert(currnode.id);
            if(currnode.id == el){
                var nextEl = list[j+1];
                break;
            }
        }
        if(nextEl != undefined){
            var nextNode = this.currentDoc.getElementById(nextEl);
            this.hideDiv();
            this.showDiv(nextNode);
        }
    }
}

FfIsaAddon.prototype.attachCss = function() {

    var cssAlreadyInPlace = this.currentDoc.getElementById("ISACSS");
    if (cssAlreadyInPlace == null) { 
        var heads = this.currentDoc.getElementsByTagName("head");
        var link = this.currentDoc.createElement("link");
        //var script = this.currentDoc.createElement("script");
        link.rel = "stylesheet";
        link.id = "ISACSS";
        link.type = "text/css";
        link.href = "chrome://isf_isa_addon/skin/ff_addon.css";
        heads[0].appendChild(link);
    }
}

FfIsaAddon.prototype.removeDiv = function() {
    if (this.currentDoc==null)
        this.currentDoc= document;
    var div = this.currentDoc.getElementById("ff_isa_div");
    if (div != null ) {
        div.parentNode.removeChild(div);
    }
    this.ISADiv = null;
    this.enabled = false;
}

FfIsaAddon.prototype.PrefObserver = function(branchName, func) {
    var branch = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch(branchName);
    branch.QueryInterface(Components.interfaces.nsIPrefBranch2);

    this.register = function() {
        branch.addObserver("", this, false);
        branch.getChildList("", { }).forEach(function (name) {
            func(branch, name);
        });
    };

    this.unregister = function unregister() {
        if (branch)
            branch.removeObserver("", this);
    };

    this.observe = function(subject, topic, data) {
        if (topic == "nsPref:changed")
            func(branch, data);
    };
}

// function to read from local file using Firefox IO service
// file's content is converted in UTF-8
FfIsaAddon.prototype.ReadFile = function(file){
    var ioService=Components.classes["@mozilla.org/network/io-service;1"]
    .getService(Components.interfaces.nsIIOService);
    var scriptableStream=Components.classes["@mozilla.org/scriptableinputstream;1"]
    .getService(Components.interfaces.nsIScriptableInputStream);
    var unicodeConverter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
    .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
    unicodeConverter.charset = "UTF-8";
    var channel=ioService.newChannel(file,null,null);
    var input=channel.open();
    scriptableStream.init(input);
    var str=scriptableStream.read(input.available());
    scriptableStream.close();
    input.close();
    return unicodeConverter.ConvertToUnicode( str );//return str;
}
