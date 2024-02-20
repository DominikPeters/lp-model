# lp-model

[![npm version](https://badgen.net/npm/v/lp-model)](https://www.npmjs.com/package/lp-model)
[![license](https://badgen.net/npm/license/lp-model)](https://www.npmjs.com/package/lp-model)
[![bundle size](https://badgen.net/bundlephobia/min/lp-model)](https://bundlephobia.com/result?p=lp-model)

JavaScript package for modelling (Integer) Linear Programs

This is a lightweight JS package for specifying LPs and ILPs using a convenient syntax. The constructed model can be exported to the `.lp` [CPLEX LP format](https://web.mit.edu/lpsolve/doc/CPLEX-format.htm), and solved using the [highs-js](https://github.com/lovasoa/highs-js) and [glpk.js](https://github.com/jvail/glpk.js) solvers available as WebAssembly. This can be done both in the browser ([demo page](https://dominikpeters.github.io/lp-model/)) and in Node.js.

## Installation

In Node.js:

```bash
npm install lp-model
# optionally install the solvers
npm install highs
npm install glpk.js
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
}
main();
```

Setup in the browser for high-js:
```html
<script src="https://cdn.jsdelivr.net/npm/lp-model@latest/dist/lp-model.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/highs/build/highs.js"></script>
<script>
    async function main() {
        const model = new LPModel.Model();
        // ...
        const highs = await Module();
        model.solve(highs);
    }
    main();
</script>
```

Setup in the browser for glpk.js, in a module:
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
const x = model.addVar({ lb: 0, vtype: "BINARY" });
const y = model.addVar({ lb: 0, name: "y" });

model.setObjective([[4, x], [5, y]], "MAXIMIZE"); // 4x + 5y
model.addConstr([x, [2, y], 3], "<=", 8); // x + 2y + 3 <= 8
model.addConstr([[3, x], [4, y]], ">=", [12, [-1, x]]); // 3x + 4y >= 12 - x
console.log(model.toLPFormat();)

await model.solve(highs);
console.log(`x = ${x.value}\n y = ${y.value}`);
```

Check out the [demo page](https://dominikpeters.github.io/lp-model/) to see your browser solve this program.

### Example: knapsack problem

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

const included = model.addVars(itemNames, { vtype: "BINARY" });
// included[A], included[B], included[C], included[D] are binary variables

model.addConstr(problem.items.map((item, i) => [item.weight, included[item.name]]), "<=", problem.capacity);
// sum of weights of included items <= capacity
// equivalent to: 3*included[A] + 4*included[B] + 5*included[C] + 8*included[D] <= 15

model.setObjective(problem.items.map((item, i) => [item.value, included[item.name]]), "MAXIMIZE");
// maximize sum of values of included items

await model.solve(highs);
console.log(`Objective value: ${model.objVal}`);
console.log(`Included items: ${itemNames.filter(name => included[name].value > 0.5)}`);
```