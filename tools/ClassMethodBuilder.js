const fs = require("fs");
const methodTmpl = fs.readFileSync("./templates/Method.json", "utf-8");

class ClassMethodBuilder {

    constructor() {
        this._method = JSON.parse(methodTmpl);
    }

    /**
     * set method.key.name
     * @param {string} name Name of method
     */
    set name(name) {
        this._method.key.name = name;
    }

    /**
     * set method.value
     * @param {Node} func FunctionExpression Node
     */
    set value(func) {
        this._method.value = func;
    }

    /**
     * set method.kind | default: "method"
     * @param {string} kind "set" or "get"
     */
    set kind(kind) {
        if (["set", "get"].includes(kind)) {
            this._method.kind = kind;
        }
    }

    /**
     * default is false
     * @param {boolean} isStatic
     */
    set static(isStatic) {
        this._method.static = isStatic;
    }

    getTree() {
        return this._method;
    }

}

module.exports = ClassMethodBuilder;