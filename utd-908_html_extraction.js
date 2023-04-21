function waitTimeout(ms = 20) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts
            .pop()
            .split(";")
            .shift();
    }
}
function stringifyCSSStylesheet(stylesheet) {
    return stylesheet.cssRules
        ? Array.from(stylesheet.cssRules)
              .map((rule) => rule.cssText || "")
              .join("\n")
        : "";
}
function getHTMLExtract(selector = ".utd-page-content") {
    try {
        const qContent = document.querySelector(selector);
        const qClone = qContent.cloneNode(true);
        const inputs = qContent.getElementsByTagName("input");
        const selects = qContent.getElementsByTagName("select");

        for (const i of inputs) {
            if (!i.id) {
                console.error("Error: input lacks id");
                continue;
            }
            if (i.type === "checkbox" || i.type === "radio") {
                if (i.checked) qClone.querySelector(`#${i.id}`).setAttribute("checked", "");
            }
        }
        for (const s of selects) {
            if (!s.id) {
                console.error("Error: select lacks id");
                continue;
            }
            if (s.selectedIndex >= 0) qClone.querySelector(`#${s.id}`).setAttribute("selected", "selected");
        }

        while (qClone.getElementsByClassName("page-points").length !== 0) {
            qClone.getElementsByClassName("page-points")[0].remove();
        }
        while (qClone.getElementsByClassName("page-question-points").length !== 0) {
            qClone.getElementsByClassName("page-question-points").remove();
        }

        let htmlExtract = '<html><head><meta charset="utf-8">';
        for (const stylesheet of document.styleSheets) {
            htmlExtract += `<style>${stringifyCSSStylesheet(stylesheet)}</style>`;
        }
        htmlExtract += `</head><body>${qClone.innerHTML}</body></html>`;

        return htmlExtract;
    } catch (error) {
        console.error("HTML Extract Error: ", error);
        return "";
    }
}

async function loadLaunch() {
    const systemid = getCookie("systemid");
    const pid = getCookie("pid");
    const launchid = getCookie("launchid");
    const raw = await fetch("/api/launch", {
        method: "POST",
        // credentials: "include",
        // mode: "cors",
        body: JSON.stringify({ systemid, pid, launchid }),
    }).then((r) => r.json());
    return raw;
}

async function loadPageSequence() {
    const launch = await loadLaunch();
    const initevent = launch.events.find((e) => e.id === "init");
    if (!initevent) {
        return console.error("Failed to load init event from launch data");
    }
    return {
        pid: launch.pid,
        systemid: launch.systemid,
        sequence: initevent.sections.map((s) => s.pages.map((p) => p.id)).flat(),
    };
}

function clickNext() {
    const $button = document.querySelector(".utd-button-next, .utd-button-skip");
    if (!$button) {
        return console.error("Failed to find next or skip button");
    }
    $button.click();
}

function downloadFile(file) {
    // Create a link and set the URL using `createObjectURL`
    const link = document.createElement("a");
    link.style.display = "none";
    link.href = URL.createObjectURL(file);
    link.download = file.name;
  
    // It needs to be added to the DOM so it can be clicked
    document.body.appendChild(link);
    link.click();
  
    // To make this work on Firefox we need to wait
    // a little while before removing it.
    setTimeout(() => {
        URL.revokeObjectURL(link.href);
        link.parentNode.removeChild(link);
    }, 0);
}

async function doIt() {
    const { systemid, pid, sequence } = await loadPageSequence();
    await sequence.reduce(async (p, id) => {
        await p;
        const html = getHTMLExtract();
        downloadFile(new File([html], `${systemid}__${pid}__${id}.html`));
        clickNext();
        await waitTimeout();
    }, Promise.resolve());
    return "All done";
}

doIt().then(console.log).catch(console.error);