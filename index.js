const fs = require("fs");
const acorn = require("acorn");
const escodegen = require("escodegen");
const estraverse = require("estraverse");

const Classify = require("./tools/Classify");

let input = fs.readFileSync("./input.js", "utf-8").toString();

let parsed = acorn.parse(input, { ecmaVersion: 8 });

fs.writeFileSync("./parse.json", JSON.stringify(parsed), "utf-8");

let aaa = Classify(parsed);

let output = escodegen.generate(aaa);
fs.writeFileSync("./output.js", output);