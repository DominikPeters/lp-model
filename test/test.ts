import { describe, it, beforeEach, expect } from 'vitest';
import { Model } from '../src/model.js';
import highs from 'highs';
import glpk from 'glpk.js';
import jsLPSolver from 'javascript-lp-solver';

describe('LP Model Library Tests', () => {
    let model: Model;

    beforeEach(() => {
        model = new Model();
    });

    describe('Variable Creation', () => {
        describe('addVar', () => {
            it('should create a variable with default options', () => {
                const variable = model.addVar();
                expect(variable.lb).toBe(0);
                expect(variable.ub).toBe("+infinity");
                expect(variable.vtype).toBe("CONTINUOUS");
            });

            it('should create a variable with custom lower bound', () => {
                const variable = model.addVar({ lb: 5 });
                expect(variable.lb).toBe(5);
                expect(variable.ub).toBe("+infinity");
                expect(variable.vtype).toBe("CONTINUOUS");
            });

            it('should create a variable with custom upper bound', () => {
                const variable = model.addVar({ ub: 10 });
                expect(variable.lb).toBe(0);
                expect(variable.ub).toBe(10);
                expect(variable.vtype).toBe("CONTINUOUS");
            });

            it('should create a binary variable', () => {
                const variable = model.addVar({ vtype: "BINARY" });
                expect(variable.lb).toBe(0);
                expect(variable.ub).toBe(1);
                expect(variable.vtype).toBe("BINARY");
            });

            it('should create an integer variable', () => {
                const variable = model.addVar({ vtype: "INTEGER" });
                expect(variable.lb).toBe(0);
                expect(variable.ub).toBe("+infinity");
                expect(variable.vtype).toBe("INTEGER");
            });

            it('should create a variable with custom name', () => {
                const variable = model.addVar({ name: "myVar" });
                expect(variable.lb).toBe(0);
                expect(variable.ub).toBe("+infinity");
                expect(variable.vtype).toBe("CONTINUOUS");
                expect(variable.name).toBe("myVar");
            });

            it('should throw an error for duplicate variable name', () => {
                model.addVar({ name: "myVar" });
                expect(() => model.addVar({ name: "myVar" })).toThrow("Variable name 'myVar' has already been used.");
            });

            it('should throw an error for invalid variable type', () => {
                expect(() => model.addVar({ vtype: "INVALID_TYPE" })).toThrow();
            });

            it('should throw an error for invalid variable bounds', () => {
                expect(() => model.addVar({ lb: 10, ub: 5 })).toThrow("Variable lower bound must be less than or equal to upper bound.");
            });
        });

        describe('addVars', () => {
            it('should create multiple variables with default options', () => {
                const variables = model.addVars(["var1", "var2", "var3"]);
                expect(Object.keys(variables)).toHaveLength(3);
                expect(variables["var1"].lb).toBe(0);
                expect(variables["var1"].ub).toBe("+infinity");
                expect(variables["var1"].vtype).toBe("CONTINUOUS");
                expect(variables["var2"].lb).toBe(0);
                expect(variables["var2"].ub).toBe("+infinity");
                expect(variables["var2"].vtype).toBe("CONTINUOUS");
                expect(variables["var3"].lb).toBe(0);
                expect(variables["var3"].ub).toBe("+infinity");
                expect(variables["var3"].vtype).toBe("CONTINUOUS");
            });

            it('should create multiple variables with custom options', () => {
                const variables = model.addVars(["var1", "var2", "var3"], { lb: 5, ub: 10, vtype: "INTEGER" });
                expect(Object.keys(variables)).toHaveLength(3);
                expect(variables["var1"].lb).toBe(5);
                expect(variables["var1"].ub).toBe(10);
                expect(variables["var1"].vtype).toBe("INTEGER");
                expect(variables["var2"].lb).toBe(5);
                expect(variables["var2"].ub).toBe(10);
                expect(variables["var2"].vtype).toBe("INTEGER");
                expect(variables["var3"].lb).toBe(5);
                expect(variables["var3"].ub).toBe(10);
                expect(variables["var3"].vtype).toBe("INTEGER");
            });

            it('should throw an error for non-string variable name', () => {
                expect(() => model.addVars([1, 2, 3] as unknown as string[])).toThrow("Variable name must be a string, got 'number' for '1'.");
            });

            it('should throw an error for duplicate variable name', () => {
                model.addVar({ name: "var1" });
                expect(() => model.addVars(["var1", "var2"])).toThrow("Variable name 'var1' has already been used.");
            });
        });
    });

    describe('Adding Constraints', () => {
        it('should add a simple constraint correctly', () => {
            const x = model.addVar({ vtype: "BINARY" });
            const y = model.addVar({ lb: 0, name: "y" });
            model.addConstr([x, [2, y], 3], "<=", 8);

            expect(model.constraints.length).toBe(1);
        });

        it('should add a constraint with a mix of variable types correctly', () => {
            const x = model.addVar({ vtype: "BINARY" });
            const y = model.addVar({ lb: 0, name: "y" });
            model.addConstr([[3, x], [4, y]], ">=", [12, [-1, x]]);

            expect(model.constraints.length).toBe(1);
        });
    });

    describe('Setting Objective Function', () => {
        it('should set a maximization objective correctly', () => {
            const x = model.addVar({ vtype: "BINARY" });
            const y = model.addVar({ lb: 0, name: "y" });
            model.setObjective([[4, x], [5, y]], "MAXIMIZE");

            expect(model.objective.sense).toBe("MAXIMIZE");
        });

        it('should set a minimization objective correctly', () => {
            const x = model.addVar({ vtype: "BINARY" });
            model.setObjective([[3, x]], "MINIMIZE");

            expect(model.objective.sense).toBe("MINIMIZE");
        });
    });

    describe('Model Solving', () => {
        it('should solve a simple LP model using highs-js', async () => {
            const x = model.addVar({ vtype: "CONTINUOUS" });
            const y = model.addVar({ vtype: "CONTINUOUS" });

            model.setObjective([[1, x], [1, y]], "MAXIMIZE");
            model.addConstr([x, y], "<=", 10);

            const solverInstance = await highs();
            await model.solve(solverInstance);

            expect(model.status).toBe("Optimal");
        }, 10000);

        it('should solve a model using glpk.js', async () => {
            const x = model.addVar({ vtype: "CONTINUOUS" });
            const y = model.addVar({ vtype: "CONTINUOUS" });

            model.setObjective([[1, x], [1, y]], "MAXIMIZE");
            model.addConstr([x, y], "<=", 10);

            const solverInstance = await glpk();
            await model.solve(solverInstance);

            expect(model.status).toBe("Optimal");
        }, 10000);

        it('should solve a model using jsLPSolver', async () => {
            const x = model.addVar({ vtype: "CONTINUOUS" });
            const y = model.addVar({ vtype: "CONTINUOUS" });

            model.setObjective([[1, x], [1, y]], "MAXIMIZE");
            model.addConstr([x, y], "<=", 10);

            await model.solve(jsLPSolver);

            expect(model.status).toBe("Optimal");
        });
    });

    describe('Solution Values', () => {
        it('should report correct variable values and objective after solving', async () => {
            const x = model.addVar({ vtype: "BINARY" });
            const y = model.addVar({ lb: 0, name: "y" });
            model.setObjective([[4, x], [5, y]], "MAXIMIZE");
            model.addConstr([x, [2, y], 3], "<=", 8);
            model.addConstr([[3, x], [4, y]], ">=", [12, [-1, x]]);

            const solverInstance = await highs();
            await model.solve(solverInstance);

            expect(model.status).toBe("Optimal");
            expect(typeof x.value).toBe('number');
            expect(typeof y.value).toBe('number');
            expect(typeof model.ObjVal).toBe('number');
        }, 10000);

        it('should solve and return correct objective with constant term', async () => {
            const x = model.addVar({ vtype: "CONTINUOUS" });
            model.setObjective([[1, x], 2], "MAXIMIZE");
            model.addConstr([x], "<=", 3);

            const solverInstance = await highs();
            await model.solve(solverInstance);

            expect(model.status).toBe("Optimal");
            expect(model.ObjVal).toBe(5);
        }, 10000);

        it('should solve objective with constant term using glpk.js', async () => {
            const x = model.addVar({ vtype: "CONTINUOUS" });
            model.setObjective([[1, x], 2], "MAXIMIZE");
            model.addConstr([x], "<=", 3);

            const solverInstance = await glpk();
            await model.solve(solverInstance);

            expect(model.status).toBe("Optimal");
            expect(model.ObjVal).toBe(5);
        }, 10000);

        it('should solve objective with constant term using jsLPSolver', async () => {
            const x = model.addVar({ vtype: "CONTINUOUS" });
            model.setObjective([[1, x], 2], "MAXIMIZE");
            model.addConstr([x], "<=", 3);

            await model.solve(jsLPSolver);

            expect(model.status).toBe("Optimal");
            expect(model.ObjVal).toBe(5);
        });
    });

    describe('Infeasible Models', () => {
        it('should detect infeasibility using highs-js', async () => {
            const x = model.addVar();
            model.addConstr([x], "<=", 3);
            model.addConstr([x], ">=", 4);

            const solverInstance = await highs();
            await model.solve(solverInstance);

            expect(model.status).not.toBe("Optimal");
        }, 10000);

        it('should detect infeasibility using glpk.js', async () => {
            const x = model.addVar();
            model.addConstr([x], "<=", 3);
            model.addConstr([x], ">=", 4);

            const solverInstance = await glpk();
            await model.solve(solverInstance);

            expect(model.status).not.toBe("Optimal");
        }, 10000);

        it('should detect infeasibility using jsLPSolver', async () => {
            const x = model.addVar();
            model.addConstr([x], "<=", 3);
            model.addConstr([x], ">=", 4);

            await model.solve(jsLPSolver);

            expect(model.status).not.toBe("Optimal");
        });
    });

    describe('Quadratic Objective', () => {
        it('should solve a quadratic objective using highs-js', async () => {
            const x = model.addVar({ name: "x" });
            model.setObjective([[1, x, x]], "MINIMIZE");
            model.addConstr([x], ">=", 10);
            model.addConstr([x], "<=", 20);

            const solverInstance = await highs();
            await model.solve(solverInstance);

            expect(model.status).toBe("Optimal");
            expect(x.value).toBe(10);
            expect(model.ObjVal).toBe(100);
        }, 10000);
    });

    describe('Export/Import LP Format', () => {
        it('should export and import a model in LP format', () => {
            const x = model.addVar({ vtype: "BINARY", name: "x" });
            const y = model.addVar({ lb: 0, name: "y" });

            model.setObjective([[4, x], [5, y]], "MAXIMIZE");
            model.addConstr([x, [2, y], 3], "<=", 8);

            const lpFormat = model.toLPFormat();
            expect(typeof lpFormat).toBe('string');
            expect(lpFormat).toContain("Maximize");
            expect(lpFormat).toContain("x + 2 y <= 5");

            const newModel = new Model();
            newModel.readLPFormat(lpFormat);

            expect(newModel.variables.size).toBe(2);
            expect(newModel.constraints.length).toBe(1);
        });

        it('should interpret a simple LP format string and export it identically', () => {
            const lpString = "Maximize\nobj: 1 x + 2 y\nSubject To\n c1: 1 x + 2 y <= 5\nBounds\n x free\n y free\nEnd\n";
            model.readLPFormat(lpString);

            expect(model.variables.size).toBe(2);
            expect(model.constraints.length).toBe(1);
            expect(model.objective.sense).toBe("MAXIMIZE");
            expect(model.objective.expression).toEqual([0, [1, model.variables.get("x")], [2, model.variables.get("y")]]);

            const exportedLPString = model.toLPFormat();
            expect(exportedLPString).toBe(lpString);
        });

        it('should interpret the LP format string from the README', () => {
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

            expect(model.variables.size).toBe(4);
            expect(model.variables.get("x1")!.lb).toBe(0);
            expect(model.variables.get("x1")!.ub).toBe(40);
            expect(model.variables.get("x1")!.vtype).toBe("CONTINUOUS");
            expect(model.variables.get("x2")!.lb).toBe(0);
            expect(model.variables.get("x2")!.ub).toBe("+infinity");
            expect(model.variables.get("x2")!.vtype).toBe("CONTINUOUS");
            expect(model.variables.get("x3")!.lb).toBe(0);
            expect(model.variables.get("x3")!.ub).toBe("+infinity");
            expect(model.variables.get("x3")!.vtype).toBe("CONTINUOUS");
            expect(model.variables.get("x4")!.lb).toBe(2);
            expect(model.variables.get("x4")!.ub).toBe(3);
            expect(model.variables.get("x4")!.vtype).toBe("INTEGER");
            expect(model.constraints.length).toBe(3);
            expect(model.objective.sense).toBe("MAXIMIZE");
            expect(model.objective.expression).toEqual([0, [1, model.variables.get("x1")], [2, model.variables.get("x2")], [3, model.variables.get("x3")], [1, model.variables.get("x4")]]);
        });
    });
});
