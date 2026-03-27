import { Model } from './model.js';

export function toJSLPSolverFormat(model: Model, options?: any): any {
    const jsLPModel: any = {
        optimize: "objective",
        opType: model.objective.sense.toLowerCase().slice(0, 3),
        constraints: {},
        variables: {},
        ints: {},
        binaries: {},
        unrestricted: {},
        options: options
    };

    model.variables.forEach((varObj, varName) => {
        jsLPModel.variables[varName] = {};

        if (varObj.lb === "-infinity" || (typeof varObj.lb === 'number' && varObj.lb < 0)) {
            jsLPModel.unrestricted[varName] = 1;
        }

        if (varObj.lb !== 0 && varObj.lb !== "-infinity") {
            jsLPModel.constraints[`${varName}_lb`] = { min: varObj.lb };
        }
        if (varObj.ub !== "+infinity") {
            jsLPModel.constraints[`${varName}_ub`] = { max: varObj.ub };
        }

        if (varObj.vtype === "BINARY") {
            jsLPModel.binaries[varName] = 1;
        } else if (varObj.vtype === "INTEGER") {
            jsLPModel.ints[varName] = 1;
        }
    });

    model.objective.expression.forEach((term: any) => {
        if (Array.isArray(term)) {
            jsLPModel.variables[term[1].name]["objective"] = term[0];
        }
    });

    model.constraints.forEach((constr, index) => {
        const constrName = `c${index}`;
        jsLPModel.constraints[constrName] = {};
        if (constr.comparison === "<=") {
            jsLPModel.constraints[constrName].max = constr.rhs;
        } else if (constr.comparison === ">=") {
            jsLPModel.constraints[constrName].min = constr.rhs;
        } else if (constr.comparison === "=") {
            jsLPModel.constraints[constrName].equal = constr.rhs;
        }
        constr.lhs.forEach((term: any) => {
            if (Array.isArray(term)) {
                if (!(constrName in jsLPModel.variables[term[1].name])) {
                    jsLPModel.variables[term[1].name][constrName] = 0;
                }
                jsLPModel.variables[term[1].name][constrName] += term[0];
            }
        });
    });

    return jsLPModel;
}

export function readJSLPSolverSolution(model: Model, solution: any): void {
    model.status = solution.feasible ? (solution.bounded ? "Optimal" : "Unbounded") : "Infeasible";

    model.variables.forEach((varObj, varName) => {
        if (varName in solution) {
            varObj.value = solution[varName];
        } else {
            varObj.value = 0;
        }
    });

    if (solution.result) {
        model.ObjVal = solution.result + (model.objective.expression[0] as number);
    }
}
