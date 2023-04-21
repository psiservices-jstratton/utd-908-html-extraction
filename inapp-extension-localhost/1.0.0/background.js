console.log("top of the morning");
let log = [];

const logit = (msg) => {
	console.log(`${new Date().toISOString()} ${msg}`);
	log.push(`${new Date().toISOString()} ${msg}`);
}

// START_BROKER
const fakeStartBroker = () => {
    logit(`Faked START_BROKER`);
    return {
        command: "START_BROKER",
        arguments: ["OK", "FAKE_CODE"],
    };
};

// TERMINATE_BROKER
const fakeTerminateBroker = () => {
    logit(`Faked TERMINATE_BROKER`);
    return {
        command: "TERMINATE_BROKER",
        arguments: ["OK", "FAKE_CODE"],
    };
};

// MAP_DRIVE
const fakeMapDrive = () => {
    logit(`Faked MAP_DRIVE zz`);
    return {
        command: "MAP_DRIVE",
        arguments: ["OK", "zz"],
    };
};

// UNMAP_DRIVE
const fakeUnmapDrive = (drive) => {
    logit(`Faked UNMAP_DRIVE ${drive}`);
    return {
        command: "UNMAP_DRIVE",
        arguments: ["OK", drive],
    };
};

// GET_LOG
const fakeGetLog = () => {
    logit(`Faked GET_LOG`);
    return {
        command: "GET_LOG",
        arguments: ["OK", log.join("\n")],
    };
};

// LAUNCH_APP
const fakeLaunchApp = (app = "unknown") => {
    logit(`Faked LAUNCH_APP ${app}`);
    return {
        command: "LAUNCH_APP",
        arguments: ["OK"],
    };
};

// SCORE
const fakeScore = () => {
    logit(`Faked SCORE ${app}`);
    return {
        command: "SCORE",
        arguments: ["OK", 0, null],
    };
};

// SCORE3
const fakeScore3 = () => {
    logit(`Faked SCORE3 ${app}`);
    return {
        command: "SCORE3",
        arguments: ["OK", 0, null],
    };
};

// QUIT2
const fakeQuit2 = () => {
    logit(`Faked QUIT2 ${app}`);
    return {
        command: "QUIT2",
        arguments: ["OK"],
    };
};

// QUIT3
const fakeQuit3 = () => {
    logit(`Faked QUIT3 ${app}`);
    return {
        command: "QUIT3",
        arguments: ["OK"],
    };
};

// BACKUP
const fakeBackup = () => {
    logit(`Faked BACKUP ${app}`);
    return {
        command: "BACKUP",
        arguments: ["OK", null, null],
    };
};

// PING
const fakePing = () => {
    logit(`Faked PING`);
    return {
        command: "PONG",
        arguments: ["OK"],
    };
};

// AUTOSAVE
const fakeAutosave = () => {
    logit(`Faked AUTOSAVE`);
    return {
        command: "AUTOSAVE",
        arguments: ["OK"],
    };
};

// ECHO
const fakeEcho = (...args) => {
    logit(`Faked ECHO ${JSON.stringify(args)}`);
    return {
        command: "ECHO",
        arguments: ["OK", ...args],
    };
};

// END
const fakeEnd = () => {
    logit(`Faked END`);
    return {
        command: "END",
        arguments: ["OK"],
    };
};

// START2
const fakeStart2 = (...args) => {
    logit(`Faked START2 ${JSON.stringify(args)}`);
    return {
        command: "START2",
        arguments: ["OK", "FAKE_CODE"],
    };
};

// START3
const fakeStart3 = (...args) => {
    logit(`Faked START3 ${JSON.stringify(args)}`);
    return {
        command: "START3",
        arguments: ["OK", "FAKE_CODE"],
    };
};

const generic = (...args) => {
    logit(`Generic handler ${JSON.stringify(args)}`);
};

const handlers = {
    START_BROKER: fakeStartBroker,
    TERMINATE_BROKER: fakeTerminateBroker,
    MAP_DRIVE: fakeMapDrive,
    UNMAP_DRIVE: fakeUnmapDrive,
    GET_LOG: fakeGetLog,
    LAUNCH_APP: fakeLaunchApp,
    SCORE: fakeScore,
    SCORE3: fakeScore3,
    QUIT2: fakeQuit2,
    QUIT3: fakeQuit3,
    BACKUP: fakeBackup,
    PING: fakePing,
    AUTOSAVE: fakeAutosave,
    ECHO: fakeEcho,
    END: fakeEnd,
    START2: fakeStart2,
    START3: fakeStart3,
};

var _port;
var _nativeport;
var build;
var buildname;
var inapp;
var inappname;
var end;
var pendingport;
var pendingmessages = [];

function onNativeMessage(msg) {
	console.log("onNativeMessage " + msg.command + " " + msg.arguments);
	if (msg.command == "FILE")
		_port.postMessage({command : "START_BROKER", arguments : msg.arguments});
	else if (msg.command == "END") {
		_nativeport.disconnect();
		_nativeport = undefined;
		_port.postMessage({command : "TERMINATE_BROKER", arguments : msg.arguments});
	}
	else if (msg.command == "ECHO") {
		if (inappname == undefined)
			_nativeport.postMessage({command : "FILE", arguments : [ buildname, build]});
		else
			_nativeport.postMessage({command : "FILE", arguments : [ buildname, build, inappname, inapp]});
	} else {
		try{
			_port.postMessage(msg);
		} catch (err) {}
	}
}

_nativeport = {
	postMessage(
		{ command = "UNKNOWN", arguments = [] } = {}
	) {
		const handler = handlers[command] ?? ((...args) => generic(command, ...args));
		onNativeMessage(handler(...arguments));
	},
};

function onPageMessage(msg){
	console.log("got command: " + msg.command);
	if (msg.command == "START_BROKER") {
		//start it up!
		// if (msg.bits == 32) {
		// 	_nativeport = chrome.runtime.connectNative('com.psionline.lwc.broker32');
		// }
		// else {
		// 	_nativeport = chrome.runtime.connectNative('com.psionline.lwc.broker64');
		// }
				
		// _nativeport.onMessage.addListener(onNativeMessage);
		// _nativeport.onDisconnect.addListener(onNativeDisconnect);
		build = msg.build;
		buildname = msg.buildname;
		inapp = msg.inapp;
		inappname = msg.inappname;
		end = false;
			
		_nativeport.postMessage({command : "ECHO", arguments : []});
			
	} else if (msg.command == "TERMINATE_BROKER") {
		//disconnect
		end = true;
		_nativeport.postMessage({command : "END", arguments : []});
	} else if (msg.command == "VERSION") {
		_port.postMessage({command: "VERSION", arguments: ["blah blah versions blah"]});
	} else {
		//forward it to broker.
		try {
			_nativeport.postMessage(msg);
		} catch (err) {}
	}
}

function onPendingMessage(msg) {
	console.log("storing command: " + msg.command);
	pendingmessages.push(msg);
}

function onNativeDisconnect() {
	console.log("onNativeDisconnect");
	if (!end) {
		try {
			_port.postMessage({command : "START_BROKER", arguments : ["ERROR"]});	
		} catch (err) {} //in case page disconnected already, ignore
	}
	// _nativeport = undefined;
	
	if (pendingport != undefined) {
		_port = pendingport;
		_port.onMessage.removeListener(onPendingMessage);
		
		//take care of pending messages first (should only be one)
		for (i = 0; i < pendingmessages.length; i++)
			onPageMessage(pendingmessages[i]);
		
		_port.onMessage.addListener(onPageMessage);
		_port.onDisconnect.addListener(onPageDisconnect);
		
		pendingport = undefined;
		pendingmessages = [];
	}
}

function onPageDisconnect() {	
	console.log("onPageDisconnect");
	_port = undefined;
	if (_nativeport != undefined)
		try {
			_nativeport.postMessage({command : "PONG", arguments : ["ERROR"]});
		} catch (err) {} //port might have disconnected already, ignore
}

function onConnect(port){
	console.log("onConnectExternal");
	if (_port != undefined || _nativeport != undefined) { //need to clean up
		try {
			_port.disconnect();
		} catch (err) { //in case it has already disconnected
			_port = undefined;
		}

		try {
			_nativeport.postMessage({command : "END", arguments : []});
		} catch (err) {
			// _nativeport = undefined;
		}
		pendingport = port;
		pendingport.onMessage.addListener(onPendingMessage);
		return;
	} 
	_port = port;
	_port.onMessage.addListener(onPageMessage);
	_port.onDisconnect.addListener(onPageDisconnect);
}
try {
	chrome.runtime.onConnect.addListener(onConnect);
} catch (e) {
	logit("Failed to setup onConnect listener");
	console.log(e);
}
// chrome.runtime.onConnectExternal.addListener(onConnect);

function onMessage(msg, sender, sendResponse) {
	console.log("onMessageExternal");
	if (msg.command == "ECHO") {
		sendResponse({command: "ECHO", arguments : ["OK"]});
	}
	return true;
}
// chrome.runtime.onMessageExternal.addListener(onMessage);
try {
	chrome.runtime.onMessage.addListener(onMessage);
} catch (e) {
	logit("Failed to setup onConnect listener");
	console.log(e);
}
