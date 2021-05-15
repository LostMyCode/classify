const fs = require("fs");
const beautify = require('js-beautify').js;

let input = fs.readFileSync("./input.txt").toString();

function _classCallCheck() { }
function _createClass() {
    console.log("createClass")
    let construct = arguments[0]
        .toString()
        .replace(/function \w+/, "constructor")
        .replace(/_classCallCheck.*\r\n/, "")

    let instanceMethods = arguments[1] || [];
    let staticMethods = arguments[2] || [];
    let methods = [].concat(staticMethods, instanceMethods);
    
    /* for (let i = 1; i < arguments.length; i++) {
        if (arguments[i] instanceof Array) methods = arguments[i];
    } */

    let fixedMethods = "";
    for (let i = 0; i < methods.length; i++) {
        let type = null;
        if (methods[i].value) type = "value";
        else if (methods[i].set && methods[i].get) type = "setget";
        else if (methods[i].set) type = "set";
        else if (methods[i].get) type = "get";

        let isStatic = staticMethods.length !== 0 && i < staticMethods.length;
        if (type == "setget") {
            fixedMethods += fixMethod("set", methods[i], isStatic);
            fixedMethods += fixMethod("get", methods[i], isStatic);
        } else {
            fixedMethods += fixMethod(type, methods[i], isStatic);
        }
    }

    const complete = `${input.match(/^new\s*/) ? "new" : ""} class {${construct}${fixedMethods}}`

    fs.writeFileSync("./output.js", beautify(complete), "utf-8")
}

/**
 * This function returns a unbabeled function as string
 * @param {string} type Method type (value, set, or get)
 * @param {object} method Object that includes key(s) and a function
 * @param {boolean} isStatic is a static method or not
 */
function fixMethod(type, method, isStatic) {
    let fixedOneMethod = "";
    if (type) {
        const name = method.key;
        let func = method[type].toString();
        // const args = func.match(/value\((.*)\)/)[1];
        let prefix = ["set", "get"].includes(type) ? type + " " : "";
        prefix = isStatic ? "static " + prefix : prefix;
        const regex = new RegExp(type);

        /* 
            For example
            'value': function blabla() { blabla }
        */
        func = func.replace(new RegExp("function\\s*" + method[type].name), type)
        if (func.match(regex)) {
            /* 
                For example
                value() { blabla }
                value(e) { blabla }
            */
            fixedOneMethod += prefix + func.replace(regex, name)
        }
        else {
            console.log(func)
            /* 
                For example
                Pattern 1 (has an arg)
                value: e=>e.blabla
                Pattern 2 (has no args)
                value: ()=>blabla
                value: ()=>{ blabla }
                Pattern 3 (has multiple args)
                value: (e, t) => blabla
            */

            /* 
                Func.toString() doesnt include func name nor args
                So you need to check args
            */
            let arg = 
                func.match(/(\w+)\s*=>\s*/) || // single arg
                func.match(/\(([\w+,\s*]+)\)\s*=>\s*/) // multiple args
            arg = arg ? arg[1] : ""
            fixedOneMethod +=
                prefix +
                `${name}(${arg}){${
                arg ?
                    func
                    // Pattern 1
                    .replace(/\w+\s*=>/, "return")
                    // Pattern 3
                    .replace(/\([\w+,\s*]+\)\s*=>\s*/, "return")
                    :
                    // Pattern 2
                    func.replace(/\(\)\s*=>/, type == "get" ?
                        "return " : "return "/* putting return is better */)}}`
        }
        // fixedMethods += prefix + (func.match(regex) ? func.replace(regex, name) : `${name}=${func}\n`)
        return fixedOneMethod;
    }
}

try {
    input = eval(input)
} catch (e) {
    console.error("Error, but continue");
}