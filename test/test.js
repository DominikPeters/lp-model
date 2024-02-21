async function test1() {
    const LPModel = require('../dist/lp-model.js');
    const m = new LPModel.Model();
    const x = m.addVar({ lb: 0, vtype: "BINARY" });
    // const x = m.addVar({ lb: 0 });
    const y = m.addVar({ lb: 0, name: "y" });
    m.setObjective([[4, x], [5, y]], "MAXIMIZE");
    m.addConstr([x, [2, y], 3], "<=", 8);
    m.addConstr([[3, x], [4, y]], ">=", [12, [-1, x]]);

    const highs = await require("highs")();
    m.solve(highs);
    console.log(x.value, y.value);

    const glpk = require("glpk.js")();
    await m.solve(glpk);
    console.log(x.value, y.value);

    const jsLPSolver = require("javascript-lp-solver");
    m.solve(jsLPSolver);
    console.log(x.value, y.value);
}


async function testInfeasible() {
    const LPModel = require('../dist/lp-model.js');
    const m = new LPModel.Model();
    const x = m.addVar();
    m.addConstr([x], "<=", 3);
    m.addConstr([x], ">=", 4);

    const highs = await require("highs")();
    m.solve(highs);
    console.log(m.status);

    const glpk = require("glpk.js")();
    await m.solve(glpk);
    console.log(m.status);

    const jsLPSolver = require("javascript-lp-solver");
    m.solve(jsLPSolver);
    console.log(m.status);
}

// async function testQuadratic() {
//     const LPModel = require('../dist/lp-model.js');
//     const m = new LPModel.Model();
//     const x = m.addVar({ name: "x" });
//     const y = m.addVar({ name: "y" });
//     m.setObjective([[1, x, x]], "MINIMIZE");
//     m.addConstr([x, y], ">=", 1);

//     console.log(m.toLPFormat());

//     const highs = await require("highs")();
//     m.solve(highs);
//     console.log(x.value, y.value);
// }
// testQuadratic();

async function testObjectiveConstantTerm() {
    const LPModel = require('../dist/lp-model.js');
    const m = new LPModel.Model();
    const x = m.addVar();
    m.setObjective([[1, x], 2], "MAXIMIZE");
    m.addConstr([x], "<=", 3);

    const highs = await require("highs")();
    m.solve(highs);
    console.log(m.ObjVal, m.ObjVal === 5);

    const glpk = require("glpk.js")();
    await m.solve(glpk);
    console.log(m.ObjVal, m.ObjVal === 5);

    const jsLPSolver = require("javascript-lp-solver");
    m.solve(jsLPSolver);
    console.log(m.ObjVal, m.ObjVal === 5);
}

async function allTests() {
    await test1();
    await testInfeasible();
    await testObjectiveConstantTerm();
}
allTests();