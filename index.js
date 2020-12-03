const fs = require("fs");
const acorn = require("acorn");
const escodegen = require("escodegen");
const estraverse = require("estraverse");
const JsonFormat = require("json-format");
const Classify = require("./tools/Classify");

let input = fs.readFileSync("./input.js", "utf-8").toString();
let ast = acorn.parse(input, { ecmaVersion: 8 });

fs.writeFileSync("./parse.json", JsonFormat(ast, {
    type: 'space',
    size: 1
}), "utf-8");

let classifiedAst = Classify(ast);
let output = escodegen.generate(classifiedAst);
fs.writeFileSync("./output.js", output);