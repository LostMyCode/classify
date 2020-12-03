const estraverse = require("estraverse");
const fs = require("fs");
const MethodBuilder = require("./ClassMethodBuilder");

const classTmpl = fs.readFileSync("./templates/Class.json", "utf-8");
const functionReturnTmpl = fs.readFileSync("./templates/FunctionReturn.json", "utf-8");

/**
 * Classify babelized class
 */
class Classify {

    constructor() {
        this.blocks = null;
        this.root = null;
        this.methods = null;
        this.classReplacePoint = null;
        this.hasSuperClass = false;
        this.superClassName = null;
    }

    detect(node, parent) {
        this.root = node;

        if (["CallExpression", "NewExpression"].includes(node.type)) {

            node = node.callee;
            if (node.arguments && node.arguments[0]) this.superClassName = node.arguments[0].name;

            if (node.type == "CallExpression") {
                node = node.callee;
            }

            if (node.type.includes("FunctionExpression")) { // function or () =>

                node = node.body;
                if (node.type == "BlockStatement") {

                    this.blocks = node.body;

                    let res = false;
                    let constructorCandidate;

                    for (let n of node.body) {
                        switch (n.type) {
                            case "ReturnStatement":
                                // ? return _createClass(e, [{...
                                n = n.argument;
                                if (n.type == "SequenceExpression") {
                                    res = this.searchCreateClass(n.expressions[0]);
                                }
                                break;

                            case "ExpressionStatement":
                                res = this.searchCreateClass(n.expression);
                                break;

                            case "FunctionDeclaration":
                                constructorCandidate = n;
                                break;
                        }
                    }

                    if (res) {
                        this._constructor = constructorCandidate;
                        if (node.body[0].type == "ExpressionStatement") {
                            this.hasSuperClass = true;
                        }
                        this.classifyNode(this.root);
                    }

                }

            }

        }

    }

    searchCreateClass(node) {
        if (node && node.type == "CallExpression" && [2, 3].includes(node.arguments.length)) { // _createClass(e, [] | null, [])

            this.methods = node.arguments;

            node = node.arguments[2] || node.arguments[1];
            if (node.type == "ArrayExpression") { // [static methods], [instance methods]

                node = node.elements[0];
                if (node.type == "ObjectExpression") {

                    node = node.properties;
                    if (node.length == 2 || node.length == 3) { // key(name) and value (func) pair | key, get and set

                        const keyName0 = node[0].key.name || node[0].key.value;
                        const keyName1 = node[1].key.name || node[1].key.value;
                        if (keyName0 == "key" && ["value", "set", "get"].includes(keyName1)) { // check key name

                            return true;

                        }

                    }

                }

            }

        }

        return false;
    }

    classifyNode(node) {
        let _class = JSON.parse(classTmpl);

        let Blocks = this.blocks;

        this.deleteClassCallCheck();
        let _constructor = this._constructor;
        _class.body.body[0].value.params = _constructor.params;
        _class.body.body[0].value.body = _constructor.body;

        let instanceMethods = this.methods[1];
        let staticMethods = this.methods[2];

        // ? insert static methods
        if (staticMethods && staticMethods.elements !== undefined) {
            for (let m of staticMethods.elements) {
                this.insertMethod(_class, m, true);
            }
        }

        // ? insert instance methods
        if (instanceMethods && instanceMethods.elements !== undefined) {
            for (let m of instanceMethods.elements) {
                this.insertMethod(_class, m);
            }
        }

        if (node.type == "NewExpression") {
            node.callee = _class;
            node.callee.type = "ClassExpression";
            this.insertSuperClass(node.callee);
        } else {
            // ! need to remove }'()';
            node.body = _class.body;
            node.type = "ClassExpression";
            this.insertSuperClass(node);
        }

        return node;
    }

    /**
     * Add a method into class tree
     * @param {Node} _class class object
     * @param {Node} m method object
     * @param {boolean} isStatic true if it is a static method
     * @param {number} propIndex option: property index
     */
    insertMethod(_class, m, isStatic, propIndex) {
        const method = new MethodBuilder();

        // method inner data
        const inner = m.properties[propIndex || 1];

        method.name = m.properties[0].value.value; // method name
        method.value = inner.value; // method value
        method.kind = inner.key.name; // normal? getter? setter?

        // ? avoid error when method format is like: get: () => blabla
        if (inner.value.type == "ArrowFunctionExpression") {
            let _return = JSON.parse(functionReturnTmpl);
            _return.body.body[0].argument = inner.value.body;
            method.value = _return;
        }

        if (isStatic) method.static = isStatic;

        _class.body.body.push(method.getTree());

        // check one more
        if (propIndex != 2 && m.properties[2]) {
            this.insertMethod(_class, m, isStatic, 2);
        }
    }

    insertSuperClass(node) {
        if (this.hasSuperClass) {
            node.superClass = {
                "type": "Identifier",
                "name": this.superClassName
            };
        }
    }

    /**
     * Delete _classCallCheck call from class constructor
     */
    deleteClassCallCheck() {
        const blocks = this._constructor.body.body;
        const constractorName = this._constructor.id.name;
        for (let i = 0; i < blocks.length; i++) {
            let block = blocks[i];
            if (block.type == "ExpressionStatement") {
                let expressions;
                let hasMultipleExps = false;

                if (block.expression.expressions) {
                    expressions = block.expression.expressions;
                    hasMultipleExps = true;
                } else {
                    expressions = [block.expression];
                }

                for (let j = 0; j < expressions.length; j++) {
                    if (
                        expressions[j].type == "CallExpression" &&
                        expressions[j].arguments &&
                        expressions[j].arguments[0].type == "ThisExpression" &&
                        expressions[j].arguments[1].name == constractorName
                    ) {
                        if (hasMultipleExps) expressions.splice(j, 1);
                        else blocks.splice(i, 1);
                        return;
                    }
                }
            }
        }
    }
}

/**
 * Run classify
 * @param {acorn.Node} ast Result of acorn
 */
function wrap(ast) {
    return estraverse.replace(ast, {
        enter: function (node, parent) {
            let classify = new Classify();
            classify.detect(node, parent);
        }
    });
}

module.exports = wrap;