# lp-model

[![npm version](https://badgen.net/npm/v/lp-model)](https://www.npmjs.com/package/lp-model)
[![license](https://badgen.net/npm/license/lp-model)](https://www.npmjs.com/package/lp-model)
[![bundle size](https://badgen.net/bundlephobia/min/lp-model)](https://bundlephobia.com/result?p=lp-model)

JavaScript package for modelling (Integer) Linear Programs

This is a lightweight JS package for specifying LPs and ILPs using a convenient syntax. The constructed model can be exported to the `.lp` [CPLEX LP format](https://web.mit.edu/lpsolve/doc/CPLEX-format.htm), and solved using the [highs-js](https://github.com/lovasoa/highs-js) and [glpk.js](https://github.com/jvail/glpk.js) solvers available as WebAssembly. This can be done both in the browser and in Node.js.

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
<script src="https://cdn.jsdelivr.net/npm/lp-model"></script>
<!-- optionally include one of the solvers -->
<script src="https://cdn.jsdelivr.net/npm/highs"></script>
<script src="https://cdn.jsdelivr.net/npm/glpk.js"></script>
```

## Usage

```javascript
const LPModel = require('lp-model');
const m = new LPModel.Model();
const x = m.addVar({ lb: 0, vtype: "BINARY" });
const y = m.addVar({ lb: 0, name: "y" });
m.setObjective([[4, x], [5, y]], "MAXIMIZE");
m.addConstr([x, [2, y], 3], "<=", 8);
m.addConstr([[3, x], [4, y]], ">=", [12, [-1, x]]);
console.log(m.toLPFormat());

const highs = await require("highs")();
m.solve(highs);
console.log(x.value, y.value);

const glpk = await require("glpk.js")();
m.solve(glpk);
console.log(x.value, y.value);
```