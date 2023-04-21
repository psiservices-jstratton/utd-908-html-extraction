const path = require("path");
const fs = require("fs");
const https = require('https');

const fse = require("fs-extra");
const { app, BrowserView, BrowserWindow, ipcMain, session } = require('electron');
// const { ElectronChromeExtensions } = require('electron-chrome-extensions')

let win;
let view;

const createWindow = () => {
    // const extensions = new ElectronChromeExtensions();
    win = new BrowserWindow({
        name: "UTD-908 extractor",
        width: 1400,
        height: 920,
        skipTaskbar: true,
        toolbar: false,
        webPreferences: {
            nodeIntegration: true,
            preload: path.join(__dirname, "./preload.js"),
        },
    });
    // extensions.addTab(win.webContents, win);
    win.loadFile("index.html");
    win.show();
};

const provisionLink = ({ systemid, pid }) => `https://nirvana-aat.apec.psiexams.com/api/utd-908?mode=provision&systemid=${systemid}&pid=${pid}`;

const request = (url) => new Promise((resolve, reject) => {
    console.log(`Requesting ${url}`);
    https.get(url, (resp) => {
        console.log(`Getting response from ${url}`);
        let data = '';
        resp.on('data', (chunk) => data += chunk);
        // The whole response has been received. Print out the result.
        resp.on('end', () => {
            console.log(`Parsing response from ${url}`);
            try {
                resolve(JSON.parse(data).token);
            } catch (e) {
                reject(e);
            }
        });
    }).on("error", reject);
});

// `https://nirvana-aat.apec.psiexams.com/api/utd-908?mode=provision&systemid=${systemid}&pid=${pid}`
// load CSV of known issues
// load directory of currently stored results
// prepare list of sessions

// load original result from prod via getprovision endpoint to get latest launchid
// For each S3 URL call out to prod and get a signedS3Url via upload endpoint
// Update JSON with the signed urls
// provision new resultreview session
// launch session
// wait for test to load
// use the launch data that we've got from the database dump
// - old - load launch data
// - old - determine which pages need to be stored
// extract loop

const LOAD_LAUNCH_DATA = `(() => {
    function getCookie(name) {
        const value = \`; \${document.cookie}\`;
        const parts = value.split(\`; \${name}=\`);
        if (parts.length === 2) {
            return parts
                .pop()
                .split(";")
                .shift();
        }
    }    
    const systemid = getCookie("systemid");
    const pid = getCookie("pid");
    const launchid = getCookie("launchid");
    return fetch("/api/launch", {
        method: "POST",
        body: JSON.stringify({ systemid, pid, launchid }),
    }).then((r) => r.json());
})()`;

const EXTRACT_HTML = `((selector = ".utd-page-content") => {
    function stringifyCSSStylesheet(stylesheet) {
        return stylesheet.cssRules
            ? Array.from(stylesheet.cssRules)
                  .map((rule) => rule.cssText || "")
                  .join("\\n")
            : "";
    }
    try {
        const qContent = document.querySelector(selector);
        const selects = [...qContent.getElementsByTagName("select")];
        selects.forEach((s, i) => s.id = \`\${s.id}-\${i}\`);
        const qClone = qContent.cloneNode(true);
        const inputs = qContent.getElementsByTagName("input");

        for (const i of inputs) {
            if (!i.id) {
                console.error("Error: input lacks id");
                continue;
            }
            if (i.type === "checkbox" || i.type === "radio") {
                if (i.checked) qClone.querySelector(\`#\${i.id}\`).setAttribute("checked", "");
            }
        }
        for (const s of selects) {
            if (!s.id) {
                console.error("Error: select lacks id");
                continue;
            }
            if (s.selectedIndex >= 0) {
                // qClone.querySelector(\`#\${s.id}\`).setAttribute("selected", "selected");
                const clone = qClone.querySelector(\`#\${s.id}\`);
                clone.querySelectorAll('option')[s.selectedIndex].setAttribute("selected", "selected");
            }
        }

        while (qClone.getElementsByClassName("page-points").length !== 0) {
            qClone.getElementsByClassName("page-points")[0].remove();
        }
        while (qClone.getElementsByClassName("page-question-points").length !== 0) {
            qClone.getElementsByClassName("page-question-points").remove();
        }

        let htmlExtract = '<html><head><meta charset="utf-8">';
        for (const stylesheet of document.styleSheets) {
            htmlExtract += \`<style>\${stringifyCSSStylesheet(stylesheet)}</style>\`;
        }
        htmlExtract += \`</head><body>\${qClone.innerHTML}</body></html>\`;

        return htmlExtract;
    } catch (error) {
        console.error("HTML Extract Error: ", error);
        return "";
    }    
})()`;

const EXTRACT_PAGE = `(() => {
    return [
        document.querySelector(".utd-progress-of-section .utd-progress-value")?.innerText,
        document.querySelector(".utd-page-counter")?.innerText
    ].filter(Boolean).join(": ");
})()`;

const CLICK_NEXT = `(() => {
    const $button = document.querySelector(".utd-button-next, .utd-button-skip");
    if (!$button) {
        console.error("Failed to find next or skip button");
        return;
    }
    $button.click();
})()`;

async function loadPageSequence() {
    const launch = await view.webContents.executeJavaScript(LOAD_LAUNCH_DATA, true);
    const initevent = launch.events.find((e) => e.id === "init");
    if (!initevent) {
        console.error("Failed to load init event from launch data");
        return;
    }
    return {
        pid: launch.pid,
        systemid: launch.systemid,
        sequence: initevent.sections.map((s) => s.pages.map((p) => p.id)).flat(),
    };
}
const waitTimeout = (ms = 20) => new Promise((resolve) => setTimeout(resolve, ms));

const letPageLoad = async (prev = "", maxattempts = 20) => {
    let attempts = 0;
    let page = "";
    while (!page && attempts < maxattempts) {
        attempts++;
        page = await view.webContents.executeJavaScript(EXTRACT_PAGE, true);
        if (page === prev) {
            page = "";
        }
        if (!page) {
            await waitTimeout(200);
        }
    }
    // if (page) {
    //     await waitTimeout(200);
    // }
    return page;
};

ipcMain.handle("load-versions", () => ({
    ...process.versions,
}));
ipcMain.handle("test-view", async () => {
    if (view) {
        win.removeBrowserView(view);
        view = null;
    }
    view = new BrowserView();
    win.setBrowserView(view);
    try {
        view.setBounds({ x: 0, y: 200, width: 1400, height: 720 });
        view.webContents.loadURL('http://localhost:3031/api/direct/launch/dev-test-73?pid=2023-04-03T18-39-10-905Z&preview=true&resultReview=true&validation=none');
        const start = Date.now();
        let page = await letPageLoad("", 50);
        let json;
        let map = {};
        if (page) {
            json = await loadPageSequence();
            page = "";
            await json.sequence.reduce(async (r, pageid, i) => {
                await r;
                try {
                    const curr = await letPageLoad(page);
                    if (!curr || curr === page) {
                        // Dang it, we failed
                        await waitTimeout(5000);
                        return;
                    }
                    page = curr;
                    const html = await view.webContents.executeJavaScript(EXTRACT_HTML, true);
                    map[pageid] = html.length;
                    if (i + 1 < json.sequence.length) {
                        await view.webContents.executeJavaScript(CLICK_NEXT, true);
                    }
                } catch (e) {
                    console.log("something failed", e);
                }
            }, Promise.resolve());
        }
    } catch (e) {
        console.error("Something went wrong", e);
    }

    win.removeBrowserView(view);
    view = null;
    const stop = Date.now();
    return { page, map, duration: (stop - start), start, stop };
});

const writeOutput = async ({ systemid, pid }, pageid, html) => {
    const f = `./data/output/html/${systemid}/${pid}/${pageid}/html/page-html-extract.html`;
    await fse.outputFile(f, html, "utf-8");
    console.log(`wrote ${f}`);
};

const processResult = async (pid) => {
    // console.log("Processing", pid);
    win.webContents.send('message', 'result-started', pid);
    const pidlog = fs.createWriteStream(`./data/output/${pid}.generation.log`);
    pidlog.write(`${new Date().toISOString()} started processing`);
    let log = '';
    // return;
    const writeops = [];
    try {
        console.log("Reading pid", pid);
        const data = await fs.promises.readFile(`./data/output/${pid}.launch.json`, "utf-8");
        log += `${new Date().toISOString()} launch details read from disk`;
        console.log("Parsing pid", pid);
        const launch = JSON.parse(data);
        const initevent = launch.events.find((e) => e.event.id === "init").event;
        const sequence = initevent.sections.map((s) => s.pages.map((p) => p.id)).flat();
        log += `${new Date().toISOString()} loaded ${sequence.length} expected pages from init event`;
        win.webContents.send('message', 'result-details', `pages: ${sequence.length}`);
        console.log("provisioning pid", pid);
        const token = await request(provisionLink(launch));
        log += `${new Date().toISOString()} provisioned resultReview session with token ${token}`;

        view = new BrowserView();
        // capture console output of view
        view.webContents.on('console-message', (e, l, m) => {
            log += `${l} ${m}\n`;
            console.log(new Date().toISOString(), pid, l, m);
        });
        // capture network traffic of view
        try {
            view.webContents.debugger.attach('1.3');
        } catch (err) {
            log += `Debugger attach failed: ${err}\n`;
            console.log(new Date().toISOString(), pid, 'Debugger attach failed: ', err);
        }  
        view.webContents.debugger.on('detach', (e, reason) => {
            log += `Debugger detached due to: ${reason}\n`;
            console.log(new Date().toISOString(), pid, 'Debugger detached due to: ', reason);
        }); 
        view.webContents.debugger.on('message', (e, method, params) => {
            if (method === 'Network.responseReceived') {
                log += `${method} ${JSON.stringify({ params })}\n`;
                const url = params.response.url?.startsWith("data") ? "data-url" : params.response.url;
                const cached = params.response.fromDiskCache || params.response.fromPrefetchCache;
                console.log(new Date().toISOString(), pid, method, params.response.status, `[${params.response.encodedDataLength} bytes ${cached ? 'cached' : 'remote'}]`, url);
                if (!cached && url !== "data-url" && url.match(/\.gz|\.zip/)) {
                    view.webContents.debugger
                        .sendCommand('Network.getResponseBody', { requestId: params.requestId })
                        .then((body) => {
                            console.log(body);
                        }).catch((e) => {
                            console.log(`Failed to load body for ${url}`, e);
                            const { response, ...other } = params;
                            console.log(other);
                        });
                }
                // console.log(params.response.url);
            }
        })
        view.webContents.debugger.sendCommand('Network.enable');

        win.setBrowserView(view);
        view.setBounds({ x: 0, y: 200, width: 1400, height: 720 });
        view.webContents.loadURL(`https://nirvana-aat.apec.psiexams.com/index.html?token=${token}`);
        log += `${new Date().toISOString()} browser view opened`;
        win.webContents.send('message', 'result-loaded', pid);

        await waitTimeout(2000);

        let page = await letPageLoad("", 50);
        if (page) {
            page = "";
            await sequence.reduce(async (r, pageid, i) => {
                await r;
                const curr = await letPageLoad(page);
                if (!curr || curr === page) {
                    // Dang it, we failed
                    log += `${new Date().toISOString()} failed to load page when expected, bailing`;
                    console.log(`Failed to load ${pid}`);
                    win.webContents.send('message', 'page-failed', pid, pageid);
                    await waitTimeout(5000);
                    return;
                }
                log += `${new Date().toISOString()} loaded page ${curr}`;
                page = curr;
                await waitTimeout(100);
                const html = await view.webContents.executeJavaScript(EXTRACT_HTML, true);
                log += `${new Date().toISOString()} html extracted from browser view`;
                writeops.push(writeOutput(launch, pageid, html));
                if (i + 1 < sequence.length) {
                    await view.webContents.executeJavaScript(CLICK_NEXT, true);
                    log += `${new Date().toISOString()} next button clicked`;
                }
            }, Promise.resolve());
        } else {
            log += `${new Date().toISOString()} failed to load in time`;
            win.webContents.send('message', 'result-failed', `Unable to load initial page in time`);
            console.log("Failed to load in time");
        }
        // await waitTimeout(10000);
        win.webContents.send('message', 'result-complete', pid);
    } catch (e) {
        log += `${new Date().toISOString()} error processing: ${e}`;
        console.log(`Error processing ${pid}`, e);
        win.webContents.send('message', 'result-failed', pid);
    }
    await Promise.all(writeops);
    log += `${new Date().toISOString()} all pending operations completed`;
    pidlog.write(log, () => pidlog.end());
    if (view) {
        win.removeBrowserView(view);
        view = null;
    }
};

const processPids = async (pids) => {
    console.log(`Parsing ${pids.length} pids`);
    win.webContents.send('message', 'processing-pids', pids.length);
    let done = 0;
    await pids.reduce(async (p, pid) => {
        await p;
        await processResult(pid);
        done++;
        win.webContents.send('message', 'processing-status', `${done}/${pids.length}`);
    }, Promise.resolve());
    win.webContents.send('message', 'pids-exhausted');
    console.log(`Parsing complete for ${pids.length} pids`);
}

ipcMain.handle("start-generating", async () => {
    const listing = await fs.promises.readdir("./data/output/");
    const pids = listing
        .filter((f) => f.endsWith(".launch.json"))
        .map((f) => f.replace(".launch.json", ""))
        .sort()//;
        .slice(0, 10); // For now we'll just slice the first 1 out for now
    processPids(pids);
    // processPids([]);
    return { pids };
});

app.on("window-all-closed", () => app.quit());

const EXTENSION = path.join(__dirname, './inapp-extension-localhost/1.0.0');

const waitBrowserWindow = async () => {
    while (!win) {
        await waitTimeout(20);
    }
    return;
};

app.whenReady()
    .then(() => {
        session.defaultSession.on("extension-loaded", (event, extension) => {
            console.log("extension-loaded", extension);
        });
        session.defaultSession.on("extension-unloaded", (event, extension) => {
            console.log("extension-unloaded", extension);
        });
        session.defaultSession.on("extension-ready", async (event, extension) => {
            console.log("extension-ready", extension);
            if (extension.id !== "leneiifcmnfminekdbgbofkdddlkhcep") { return; }
            await waitBrowserWindow();
            const myview = new BrowserView();
            win.setBrowserView(myview);
            myview.setBounds({ x: 0, y: 0, width: 1400, height: 720 });
            myview.webContents.loadURL(extension.url);
            // myview.webContents.loadURL(`chrome://extensions/?id=${extension.id}`);
        });                
        return session.defaultSession.loadExtension(EXTENSION, { allowFileAccess: true });
    })
    .then((details, ...other) => {
        const { id } = details;
        console.log("loaded extension", id, details, other);
        console.log("session stored at", session.defaultSession.getStoragePath());
    })
    .then(() => session.defaultSession.clearCache())
    .then(createWindow)
    .catch(e => console.error("error launching", e));

