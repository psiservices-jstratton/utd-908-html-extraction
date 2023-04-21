const appendToEl = ($el, children) => {
    for (let $c of children.filter(Boolean)) {
        Array.isArray($c) ? appendToEl($el, $c) : ($el.appendChild(typeof $c === 'string' ? document.createTextNode($c) : $c));
    }
}
const El = (tag, props = {}, ...children) => {
    const $el = document.createElement(tag);
    Object
        .keys(props)
        .forEach(
            (k) => $el.setAttribute(k, props[k])
        );
    appendToEl($el, children);
    return $el;
};

const init = async () => {
    const $code = document.querySelector("code");
    // const versions = await window.electronAPI.loadVersions();
    // ['chrome', 'node', 'electron'].forEach((x) => {
    //     $code.innerText += `\n${x} : ${versions[x]}`;
    // });
    window.electronAPI.onMessage((event, ...data) => {
        $code.prepend(El('div', {}, `${new Date().toISOString()} ${data.join(" ")}\n`));
    });
    const started = await window.electronAPI.startGenerating();
    // const tested = await window.electronAPI.testView();
    $code.prepend(El('div', {}, `${JSON.stringify(started)}\n`));
};
init();
