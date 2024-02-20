async function test1() {
    const LPModel = require('../dist/lp-model.js');
    const m = new LPModel.Model();
    const x = m.addVar({ lb: 0, vtype: "BINARY" });
    const y = m.addVar({ lb: 0, name: "y" });
    m.setObjective([[4, x], [5, y]], "MAXIMIZE");
    m.addConstr([x, [2, y], 3], "<=", 8);
    m.addConstr([[3, x], [4, y]], ">=", [12, [-1, x]]);

    const highs = await require("highs")();
    // m.solve(highs);
    // console.log(x.value, y.value);
    // should print 1, 2
    // assert it as a test


    const glpk = require("glpk.js")();
    await m.solve(glpk);
    console.log(x.value, y.value);
}
test1();

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
}
testInfeasible();