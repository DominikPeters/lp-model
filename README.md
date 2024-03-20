# lp-model

[![npm version](https://badgen.net/npm/v/lp-model)](https://www.npmjs.com/package/lp-model)
[![license](https://badgen.net/npm/license/lp-model)](https://www.npmjs.com/package/lp-model)
[![bundle size](https://badgen.net/bundlephobia/min/lp-model)](https://bundlephobia.com/result?p=lp-model)

JavaScript package for modelling (Integer) Linear Programs

This is a lightweight JS package for specifying LPs and ILPs using a convenient syntax. Models can be read from and exported to the `.lp` [CPLEX LP format](https://web.mit.edu/lpsolve/doc/CPLEX-format.htm), and solved using 
* [highs-js](https://github.com/lovasoa/highs-js) (WebAssembly wrapper for the [HiGHS solver](https://github.com/ERGO-Code/HiGHS), a high-performance LP/ILP solver),
* [glpk.js](https://github.com/jvail/glpk.js) (WebAssembly wrapper for the [GLPK solver](https://www.gnu.org/software/glpk/)), and
* [jsLPSolver](https://github.com/JWally/jsLPSolver) (a pure JS solver, not as fast as the others, but small bundle size).

All solvers work both in the browser ([demo page](https://dominikpeters.github.io/lp-model/)) and in Node.js.

## Installation

In Node.js:

```bash
npm install lp-model
# optionally install the solvers
npm install highs
npm install glpk.js
npm install javascript-lp-solver
```

In the browser:

```html
<script src="https://cdn.jsdelivr.net/npm/lp-model@latest/dist/lp-model.min.js"></script>
```

## Usage

### Setup

Setup in Node.js:

```javascript
const LPModel = require('lp-model');
// optionally load the solvers
async function main() {
    const model = new LPModel.Model();
    // ...
    const highs = await require("highs")();
    model.solve(highs);
    // or
    const glpk = await require("glpk.js")();
    model.solve(glpk);
    // or
    const jsLPSolver = require("javascript-lp-solver");
    model.solve(jsLPSolver);
}
main();
```

Setup in the browser for high-js and jsLPSolver:

```html
<script src="https://cdn.jsdelivr.net/npm/lp-model@latest/dist/lp-model.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/highs/build/highs.js"></script>
<script src="https://unpkg.com/javascript-lp-solver/prod/solver.js"></script>
<script>
    async function main() {
        const model = new LPModel.Model();
        // ...
        const highs = await Module();
        model.solve(highs);
        // or
        const jsLPSolver = window.solver;
        model.solve(jsLPSolver);
    }
    main();
</script>
```

Setup in the browser for glpk.js (needs to be loaded from a module):
```html
<script type="module">
    import { Model } from "https://cdn.jsdelivr.net/npm/lp-model@latest/dist/lp-model.es.min.js";
    import GLPK from "https://cdn.jsdelivr.net/npm/glpk.js";

    async function main() {
        const model = new Model();
        // ...
        const glpk = await GLPK();
        model.solve(glpk);
    }
    main();
</script>
```

### Example model

```javascript
const x = model.addVar({ vtype: "BINARY" }); // equivalent to model.addVar({ lb: 0, ub: 1, vtype: "INTEGER" })
const y = model.addVar({ lb: 0, name: "y" }); // default vtype is "CONTINUOUS"

model.setObjective([[4, x], [5, y]], "MAXIMIZE"); // 4x + 5y
model.addConstr([x, [2, y], 3], "<=", 8); // x + 2y + 3 <= 8
model.addConstr([[3, x], [4, y]], ">=", [12, [-1, x]]); // 3x + 4y >= 12 - x
console.log(model.toLPFormat());

await model.solve(highs);
console.log(`Solver finished with status: ${model.status}`);
console.log(`Objective value: ${model.ObjVal}`);
console.log(`x = ${x.value}\n y = ${y.value}`);
```

Check out the [demo page](https://dominikpeters.github.io/lp-model/) to see your browser solve this program.

### Syntax for linear expressions and constraints

The general syntax for `model.addConstr` can be broken down as follows:

```javascript
model.addConstr(expression, operator, rhs);
```

where:
* `expression`: This is the left-hand side (LHS) of the constraint, which is typically a linear combination of decision variables and their coefficients. The expression is specified as an array of terms, where each term is either 
    - a two-element array `[coefficient, variable]`. For example, `[2, y]` represents $2y$.
    - a variable `var`. This is equivalent to `[1, var]`.
    - a single number (for example `3`), which is a constant term.

    Examples: `[0]` is a constant expression; `[[1, x], [2, y]]` represents $x + 2y$ and can also be written as `[x, [2, y]]`; `[x, [2, x], x]` represents $x + 2x + x$ which equals $4x$ and is thus equivalent to `[4, x]`.
* `operator`: This is a string that specifies the relational operator for the constraint which can be `"<="` for less than or equal to, `">="` for greater than or equal to, and `"="` for equality (`"=="` is also accepted). This defines the relationship between the LHS expression and the RHS value.
* `rhs` : This stands for the right-hand side of the constraint, which is a constant value (for example `8`) or an expression in the same format as the LHS expression.

For setting the objective function, use `model.setObjective(expression, sense)`, where the same syntax for an expression is used, and the sense of optimization is specified as a string `"MAXIMIZE"` or `"MINIMIZE"`.

### Example 2: knapsack problem

Here is how to model the knapsack problem (select a bundle of items of highest total value subject to a capacity constraint) using binary variables.

```javascript
const problem = {
    capacity: 15,
    items: [
        { name: "A", weight: 3, value: 4 },
        { name: "B", weight: 4, value: 5 },
        { name: "C", weight: 5, value: 8 },
        { name: "D", weight: 8, value: 10 }
    ]
};

const itemNames = problem.items.map(item => item.name);

// make binary variables for each item
const included = model.addVars(itemNames, { vtype: "BINARY" });
// included[A], included[B], included[C], included[D] are binary variables

// sum of weights of included items <= capacity
model.addConstr(
    problem.items.map(
        (item, i) => [item.weight, included[item.name]]
    ), "<=", problem.capacity);
// equivalent to: 3*included[A] + 4*included[B] + 5*included[C] + 8*included[D] <= 15

// maximize sum of values of included items
model.setObjective(
    problem.items.map((item, i) => [item.value, included[item.name]]), 
    "MAXIMIZE"
    );

await model.solve(highs);
console.log(`Objective value: ${model.ObjVal}`); // 17
console.log(`Included items: ${itemNames.filter(name => included[name].value > 0.5)}`); // A,B,D
```

### Example 3: quadratic objective function

The HiGHS solver supports (convex) quadratic objective functions (as does the [LP format](https://www.ibm.com/docs/en/icos/22.1.1?topic=representation-quadratic-terms-in-lp-file-format) output function). Quadratic terms are specified as length-3 arrays, with coefficient followed by the two variables that are being multiplied (which may be the same variable in case of a squared term). Here is an example of how to model a quadratic objective function.

```javascript
const x = model.addVar({ name: "x" });
model.addConstr([x], ">=", 10);
model.setObjective([[3, x, x]], "MINIMIZE"); // minimize 3 x^2
await model.solve(highs);
console.log(`Objective value: ${model.ObjVal}, with x = ${x.value}`); // 300, with x = 10
```

### Example 4: Read model from .lp file
```javascript
const lpFile = `Maximize
obj: 1 x1 + 2 x2 + 3 x3 + 1 x4
Subject To
 c1: -1 x1 + 1 x2 + 1 x3 + 10 x4 <= 20
 c2: 1 x1 - 3 x2 + 1 x3 <= 30
 c3: 1 x2 - 3.5 x4 = 0
Bounds
 0 <= x1 <= 40
 2 <= x4 <= 3
General
 x4
End`;
model.readLPFormat(lpFile);
await model.solve(highs);
```

## API

<a name="new_module_lp-model.Model_new"></a>

### new Model()
Represents an LP or ILP model.

<a name="module_lp-model.Model+solution"></a>

### [property] model.solution : <code>Object</code> \| <code>null</code>
The solution of the optimization problem, provided directly by the solver, see the solver's documentation for details.

<a name="module_lp-model.Model+status"></a>

### [property] model.status : <code>String</code>
The status of the optimization problem, e.g., "Optimal", "Infeasible", "Unbounded", etc.

<a name="module_lp-model.Model+ObjVal"></a>

### [property]  model.ObjVal : <code>number</code> \| <code>null</code>
The value of the objective function in the optimal solution.

<a name="module_lp-model.Model+addVar"></a>

### model.addVar(options) ⇒ <code>Var</code>
Adds a variable to the model.

**Returns**: <code>Var</code> - The created variable instance.  


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| options | <code>Object</code> |  | Options for creating the variable. |
| [options.lb] | <code>number</code> \| <code>&quot;-infinity&quot;</code> | <code>0</code> | The lower bound of the variable. |
| [options.ub] | <code>number</code> \| <code>&quot;+infinity&quot;</code> | <code>&quot;+infinity&quot;</code> | The upper bound of the variable. |
| [options.vtype] | <code>&quot;CONTINUOUS&quot;</code> \| <code>&quot;BINARY&quot;</code> \| <code>&quot;INTEGER&quot;</code> | <code>&quot;CONTINUOUS&quot;</code> | The type of the variable. |
| [options.name] | <code>string</code> |  | The name of the variable. If not provided, a unique name is generated. |

<a name="module_lp-model.Model+addVars"></a>

### model.addVars(varNames, options) ⇒ <code>Object</code>
Adds multiple variables to the model based on an array of names.
Each variable is created with the same provided options.

**Returns**: <code>Object</code> - An object where keys are variable names and values are the created variable instances.  


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| varNames | <code>Array.&lt;string&gt;</code> |  | Array of names for the variables to be added. |
| options | <code>Object</code> |  | Common options for creating the variables. |
| [options.lb] | <code>number</code> \| <code>&quot;-infinity&quot;</code> | <code>0</code> | The lower bound for all variables. |
| [options.ub] | <code>number</code> \| <code>&quot;+infinity&quot;</code> | <code>&quot;+infinity&quot;</code> | The upper bound for all variables. |
| [options.vtype] | <code>&quot;CONTINUOUS&quot;</code> \| <code>&quot;BINARY&quot;</code> \| <code>&quot;INTEGER&quot;</code> | <code>&quot;CONTINUOUS&quot;</code> | The type for all variables. |

<a name="module_lp-model.Model+setObjective"></a>

### model.setObjective(expression, sense)
Sets the objective function of the model.

| Param | Type | Description |
| --- | --- | --- |
| expression | <code>Array</code> | The linear expression representing the objective function. |
| sense | <code>&quot;MAXIMIZE&quot;</code> \| <code>&quot;MINIMIZE&quot;</code> | The sense of optimization, either "MAXIMIZE" or "MINIMIZE". |

<a name="module_lp-model.Model+addConstr"></a>

### model.addConstr(lhs, comparison, rhs) ⇒ <code>Constr</code>
Adds a constraint to the model.

**Returns**: <code>Constr</code> - The created constraint instance.  

| Param | Type | Description |
| --- | --- | --- |
| lhs | <code>Array</code> | The left-hand side expression of the constraint. |
| comparison | <code>string</code> | The comparison operator, either "<=", "=", or ">=". |
| rhs | <code>number</code> \| <code>Array</code> | The right-hand side, which can be a number or a linear expression. |

<a name="module_lp-model.Model+toLPFormat"></a>

### model.toLPFormat() ⇒ <code>string</code>
Converts the model to CPLEX LP format string.

**Returns**: <code>string</code> - The model represented in LP format.  
**See**: [https://web.mit.edu/lpsolve/doc/CPLEX-format.htm](https://web.mit.edu/lpsolve/doc/CPLEX-format.htm)  

### model.readLPFormat(lpString)
Clears the model, then adds variables and constraints taken from a string formatted in the CPLEX LP file format.

**See**: [https://web.mit.edu/lpsolve/doc/CPLEX-format.htm](https://web.mit.edu/lpsolve/doc/CPLEX-format.htm)  

| Param | Type | Description |
| --- | --- | --- |
| lpString | <code>string</code> | The LP file as a string. |

<a name="module_lp-model.Model+solve"></a>

### model.solve(solver, [options])
Solves the model using the provided solver. highs-js, glpk.js, or jsLPSolver can be used. 
The solution can be accessed from the variables' `value` properties and the constraints' `primal` and `dual` properties.

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| solver | <code>Object</code> |  | The solver instance to use for solving the model, either from highs-js, glpk.js, or jsLPSolver. |
| [options] | <code>Object</code> | <code>{}</code> | Options to pass to the solver's solve method (refer to their respective documentation: https://ergo-code.github.io/HiGHS/dev/options/definitions/, https://www.npmjs.com/package/glpk.js, https://github.com/JWally/jsLPSolver?tab=readme-ov-file#options). |

