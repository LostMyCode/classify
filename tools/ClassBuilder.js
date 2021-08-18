const fs = require("fs");
const classTmpl = fs.readFileSync("./templates/Class.json", "utf-8");

class ClassBuilder {

    constructor() {
        this._class = JSON.parse(classTmpl);
    }

    setConstructor(_constructor) {
        this._class.body.body[0].value.params = _constructor.params;
        this._class.body.body[0].value.body = _constructor.body;
    }

    removeConstructor() {
        this._class.body.body.splice(0, 1);
    }

    /**
     * Add a method to class
     * @param {Node} method Method AST
     */
    addMethod(method) {
        this._class.body.body.push(method);
    }

    /**
     * @return {Node} Class AST
     */
    getTree() {
        return this._class;
    }

}

module.exports = ClassBuilder;