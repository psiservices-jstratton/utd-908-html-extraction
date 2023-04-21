const fs = require('fs');
const path = require('path');

const pidToPath = (pid) => pid.match(/\w{1,2}/gi).join("/");

const pairs = [];

const doit = async () => {
    const $input = await fs.promises.readFile("./data/output/isolated-records.json", "utf-8");
    const lines = $input.split("\n").filter(Boolean);
    console.log(`Read ${lines.length} lines from file`);

    const dir = await fs.promises.readdir('./data/output/html/ac-aatprodlon01-prod');
    const pids = dir.filter(p => p.match(/\w{8}/));

    for (const line of lines) {
        const record = JSON.parse(line);
        pairs.push([record.pid, record.testid, pids.includes(record.pid)]);
        // const MAP = new Map();
        // const dir = `./data/input/${pidToPath(record.pid)}`;
        // const files = await fs.promises.readdir(dir);
        // const events = await Promise.all(files.filter(x => x.endsWith(".json")).map(async (f) => {
        //     const data = await fs.promises.readFile(path.join(dir, f), "utf-8");
        //     const event = JSON.parse(data);
        //     MAP.set(event.sort, event);
        //     return event;
        // }));
        // console.log(`Compiling record ${record.pid} with ${events.length} events [${MAP.size}]`);
        // const pairs = events.map((e) => [e, MAP.get(e.event.prev)]);
        // const final = [];
        // let current = pairs.find(([a, b]) => !b);
        // while (current && final.length < pairs.length) {
        //     final.push(current[0]);
        //     current = pairs.find(([a, b]) => b === current[0]);
        // }
        // record.events = final;
        // await fs.promises.writeFile(`./data/output/${record.pid}.launch.json`, JSON.stringify(record), "utf-8");
    }
    await fs.promises.writeFile('./data/output/pid_testid_pairs.csv', `PID,TESTID,EXTRACTED\n${pairs.map(p => p.join(",")).join("\n")}`, 'utf-8');
};

console.time("everything");
doit()
    .then(() => console.timeEnd("everything"))
    .catch(console.error);
