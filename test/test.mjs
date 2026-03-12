import { expect } from 'chai';
import LPModel from '../dist/lp-model.js';
import highs from 'highs';
import glpk from 'glpk.js';
import jsLPSolver from 'javascript-lp-solver';

describe('LP Model Library Tests', function () {
    let model;

    beforeEach(async () => {
        model = new LPModel.Model();
    });

    describe('Variable Creation', function () {
        describe('addVar', function () {
            it('should create a variable with default options', function () {
                const variable = model.addVar();
                expect(variable.lb).to.equal(0);
                expect(variable.ub).to.equal("+infinity");
                expect(variable.vtype).to.equal("CONTINUOUS");
            });

            it('should create a variable with custom lower bound', function () {
                const variable = model.addVar({ lb: 5 });
                expect(variable.lb).to.equal(5);
                expect(variable.ub).to.equal("+infinity");
                expect(variable.vtype).to.equal("CONTINUOUS");
            });

            it('should create a variable with custom upper bound', function () {
                const variable = model.addVar({ ub: 10 });
                expect(variable.lb).to.equal(0);
                expect(variable.ub).to.equal(10);
                expect(variable.vtype).to.equal("CONTINUOUS");
            });

            it('should create a binary variable', function () {
                const variable = model.addVar({ vtype: "BINARY" });
                expect(variable.lb).to.equal(0);
                expect(variable.ub).to.equal(1);
                expect(variable.vtype).to.equal("BINARY");
            });

            it('should create an integer variable', function () {
                const variable = model.addVar({ vtype: "INTEGER" });
                expect(variable.lb).to.equal(0);
                expect(variable.ub).to.equal("+infinity");
                expect(variable.vtype).to.equal("INTEGER");
            });

            it('should create a variable with custom name', function () {
                const variable = model.addVar({ name: "myVar" });
                expect(variable.lb).to.equal(0);
                expect(variable.ub).to.equal("+infinity");
                expect(variable.vtype).to.equal("CONTINUOUS");
                expect(variable.name).to.equal("myVar");
            });

            it('should throw an error for duplicate variable name', function () {
                model.addVar({ name: "myVar" });
                expect(() => model.addVar({ name: "myVar" })).to.throw("Variable name 'myVar' has already been used.");
            });

            it('should throw an error for invalid variable type', function () {
                expect(() => model.addVar({ vtype: "INVALID_TYPE" })).to.throw();
            });

            it('should throw an error for invalid variable bounds', function () {
                expect(() => model.addVar({ lb: 10, ub: 5 })).to.throw("Variable lower bound must be less than or equal to upper bound.");
            });
        });

        describe('addVars', function () {
            it('should create multiple variables with default options', function () {
                const variables = model.addVars(["var1", "var2", "var3"]);
                expect(Object.keys(variables)).to.have.lengthOf(3);
                expect(variables["var1"].lb).to.equal(0);
                expect(variables["var1"].ub).to.equal("+infinity");
                expect(variables["var1"].vtype).to.equal("CONTINUOUS");
                expect(variables["var2"].lb).to.equal(0);
                expect(variables["var2"].ub).to.equal("+infinity");
                expect(variables["var2"].vtype).to.equal("CONTINUOUS");
                expect(variables["var3"].lb).to.equal(0);
                expect(variables["var3"].ub).to.equal("+infinity");
                expect(variables["var3"].vtype).to.equal("CONTINUOUS");
            });

            it('should create multiple variables with custom options', function () {
                const variables = model.addVars(["var1", "var2", "var3"], { lb: 5, ub: 10, vtype: "INTEGER" });
                expect(Object.keys(variables)).to.have.lengthOf(3);
                expect(variables["var1"].lb).to.equal(5);
                expect(variables["var1"].ub).to.equal(10);
                expect(variables["var1"].vtype).to.equal("INTEGER");
                expect(variables["var2"].lb).to.equal(5);
                expect(variables["var2"].ub).to.equal(10);
                expect(variables["var2"].vtype).to.equal("INTEGER");
                expect(variables["var3"].lb).to.equal(5);
                expect(variables["var3"].ub).to.equal(10);
                expect(variables["var3"].vtype).to.equal("INTEGER");
            });

            it('should throw an error for non-string variable name', function () {
                expect(() => model.addVars([1, 2, 3])).to.throw("Variable name must be a string, got 'number' for '1'.");
            });

            it('should throw an error for duplicate variable name', function () {
                model.addVar({ name: "var1" });
                expect(() => model.addVars(["var1", "var2"])).to.throw("Variable name 'var1' has already been used.");
            });
        });
    });

    describe('Adding Constraints', function () {
        it('should add a simple constraint correctly', function () {
            const x = model.addVar({ vtype: "BINARY" });
            const y = model.addVar({ lb: 0, name: "y" });
            model.addConstr([x, [2, y], 3], "<=", 8);

            expect(model.constraints.length).to.equal(1);
        });

        it('should add a constraint with a mix of variable types correctly', function () {
            const x = model.addVar({ vtype: "BINARY" });
            const y = model.addVar({ lb: 0, name: "y" });
            model.addConstr([[3, x], [4, y]], ">=", [12, [-1, x]]);

            expect(model.constraints.length).to.equal(1);
        });
    });

    describe('Setting Objective Function', function () {
        it('should set a maximization objective correctly', function () {
            const x = model.addVar({ vtype: "BINARY" });
            const y = model.addVar({ lb: 0, name: "y" });
            model.setObjective([[4, x], [5, y]], "MAXIMIZE");

            expect(model.objective.sense).to.equal("MAXIMIZE");
        });

        it('should set a minimization objective correctly', function () {
            const x = model.addVar({ vtype: "BINARY" });
            model.setObjective([[3, x]], "MINIMIZE");

            expect(model.objective.sense).to.equal("MINIMIZE");
        });
    });

    describe('Model Solving', function () {
        it('should solve a simple LP model using highs-js', async function () {
            this.timeout(10000); // Extend timeout for async solver operation
            const x = model.addVar({ vtype: "CONTINUOUS" });
            const y = model.addVar({ vtype: "CONTINUOUS" });

            model.setObjective([[1, x], [1, y]], "MAXIMIZE");
            model.addConstr([x, y], "<=", 10);

            const solverInstance = await highs();
            await model.solve(solverInstance);

            expect(model.status).to.equal("Optimal");
            // Note: Specific solution values depend on solver specifics and may vary
        });

        it('should solve a model using glpk.js', async function () {
            this.timeout(10000); // Extend timeout for async solver operation
            const x = model.addVar({ vtype: "CONTINUOUS" });
            const y = model.addVar({ vtype: "CONTINUOUS" });

            model.setObjective([[1, x], [1, y]], "MAXIMIZE");
            model.addConstr([x, y], "<=", 10);

            const solverInstance = await glpk();
            await model.solve(solverInstance);

            expect(model.status).to.equal("Optimal");
            // Note: Specific solution values depend on solver specifics and may vary
        });

        it('should solve a model using jsLPSolver', async function () {
            const x = model.addVar({ vtype: "CONTINUOUS" });
            const y = model.addVar({ vtype: "CONTINUOUS" });

            model.setObjective([[1, x], [1, y]], "MAXIMIZE");
            model.addConstr([x, y], "<=", 10);

            await model.solve(jsLPSolver);

            expect(model.status).to.equal("Optimal");
            // Note: Specific solution values depend on solver specifics and may vary
        });
    });

    describe('Solution Values', function () {
        it('should report correct variable values and objective after solving', async function () {
            this.timeout(10000);
            const x = model.addVar({ vtype: "BINARY" });
            const y = model.addVar({ lb: 0, name: "y" });
            model.setObjective([[4, x], [5, y]], "MAXIMIZE");
            model.addConstr([x, [2, y], 3], "<=", 8);
            model.addConstr([[3, x], [4, y]], ">=", [12, [-1, x]]);

            const solverInstance = await highs();
            await model.solve(solverInstance);

            expect(model.status).to.equal("Optimal");
            expect(x.value).to.be.a('number');
            expect(y.value).to.be.a('number');
            expect(model.ObjVal).to.be.a('number');
        });

        it('should solve and return correct objective with constant term', async function () {
            this.timeout(10000);
            const x = model.addVar({ vtype: "CONTINUOUS" });
            model.setObjective([[1, x], 2], "MAXIMIZE");
            model.addConstr([x], "<=", 3);

            const solverInstance = await highs();
            await model.solve(solverInstance);

            expect(model.status).to.equal("Optimal");
            expect(model.ObjVal).to.equal(5);
        });

        it('should solve objective with constant term using glpk.js', async function () {
            this.timeout(10000);
            const x = model.addVar({ vtype: "CONTINUOUS" });
            model.setObjective([[1, x], 2], "MAXIMIZE");
            model.addConstr([x], "<=", 3);

            const solverInstance = await glpk();
            await model.solve(solverInstance);

            expect(model.status).to.equal("Optimal");
            expect(model.ObjVal).to.equal(5);
        });

        it('should solve objective with constant term using jsLPSolver', async function () {
            const x = model.addVar({ vtype: "CONTINUOUS" });
            model.setObjective([[1, x], 2], "MAXIMIZE");
            model.addConstr([x], "<=", 3);

            await model.solve(jsLPSolver);

            expect(model.status).to.equal("Optimal");
            expect(model.ObjVal).to.equal(5);
        });
    });

    describe('Infeasible Models', function () {
        it('should detect infeasibility using highs-js', async function () {
            this.timeout(10000);
            const x = model.addVar();
            model.addConstr([x], "<=", 3);
            model.addConstr([x], ">=", 4);

            const solverInstance = await highs();
            await model.solve(solverInstance);

            expect(model.status).to.not.equal("Optimal");
        });

        it('should detect infeasibility using glpk.js', async function () {
            this.timeout(10000);
            const x = model.addVar();
            model.addConstr([x], "<=", 3);
            model.addConstr([x], ">=", 4);

            const solverInstance = await glpk();
            await model.solve(solverInstance);

            expect(model.status).to.not.equal("Optimal");
        });

        it('should detect infeasibility using jsLPSolver', async function () {
            const x = model.addVar();
            model.addConstr([x], "<=", 3);
            model.addConstr([x], ">=", 4);

            await model.solve(jsLPSolver);

            expect(model.status).to.not.equal("Optimal");
        });
    });

    describe('Quadratic Objective', function () {
        it('should solve a quadratic objective using highs-js', async function () {
            this.timeout(10000);
            const x = model.addVar({ name: "x" });
            model.setObjective([[1, x, x]], "MINIMIZE");
            model.addConstr([x], ">=", 10);
            model.addConstr([x], "<=", 20);

            const solverInstance = await highs();
            await model.solve(solverInstance);

            expect(model.status).to.equal("Optimal");
            expect(x.value).to.equal(10);
            expect(model.ObjVal).to.equal(100);
        });
    });

    describe('Export/Import LP Format', function () {
        it('should export and import a model in LP format', function () {
            const x = model.addVar({ vtype: "BINARY", name: "x" });
            const y = model.addVar({ lb: 0, name: "y" });

            model.setObjective([[4, x], [5, y]], "MAXIMIZE");
            model.addConstr([x, [2, y], 3], "<=", 8);

            const lpFormat = model.toLPFormat();
            expect(lpFormat).to.be.a('string').that.includes("Maximize");
            expect(lpFormat).to.include("x + 2 y <= 5");

            const newModel = new LPModel.Model();
            newModel.readLPFormat(lpFormat);

            expect(newModel.variables.size).to.equal(2);
            expect(newModel.constraints.length).to.equal(1);
        });

        it('should interpret a simple LP format string and export it identically', function () {
            const lpString = "Maximize\nobj: 1 x + 2 y\nSubject To\n c1: 1 x + 2 y <= 5\nBounds\n x free\n y free\nEnd\n";
            model.readLPFormat(lpString);

            expect(model.variables.size).to.equal(2);
            expect(model.constraints.length).to.equal(1);
            expect(model.objective.sense).to.equal("MAXIMIZE");
            expect(model.objective.expression).to.deep.equal([0, [1, model.variables.get("x")], [2, model.variables.get("y")]]);

            const exportedLPString = model.toLPFormat();
            expect(exportedLPString).to.equal(lpString);
        });

        it('should interpret the LP format string from the README', function () {
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

            expect(model.variables.size).to.equal(4);
            expect(model.variables.get("x1").lb).to.equal(0);
            expect(model.variables.get("x1").ub).to.equal(40);
            expect(model.variables.get("x1").vtype).to.equal("CONTINUOUS");
            expect(model.variables.get("x2").lb).to.equal(0);
            expect(model.variables.get("x2").ub).to.equal("+infinity");
            expect(model.variables.get("x2").vtype).to.equal("CONTINUOUS");
            expect(model.variables.get("x3").lb).to.equal(0);
            expect(model.variables.get("x3").ub).to.equal("+infinity");
            expect(model.variables.get("x3").vtype).to.equal("CONTINUOUS");
            expect(model.variables.get("x4").lb).to.equal(2);
            expect(model.variables.get("x4").ub).to.equal(3);
            expect(model.variables.get("x4").vtype).to.equal("INTEGER");
            expect(model.constraints.length).to.equal(3);
            expect(model.objective.sense).to.equal("MAXIMIZE");
            expect(model.objective.expression).to.deep.equal([0, [1, model.variables.get("x1")], [2, model.variables.get("x2")], [3, model.variables.get("x3")], [1, model.variables.get("x4")]]);
        });
    });
});
