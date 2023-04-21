let log = [];

const logit = (msg) => log.push(`${new Date().toISOString()} ${msg}`);

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

module.exports.postMessage = (
    { command = "UNKNOWN", arguments = [] } = {},
    onMessage = () => ({}),
) => {
    const result = (handlers[command] ?? ((...args) => generic(command, ...args)))(...arguments);
    onMessage(result);
};
