export function toJSLPSolverFormat(model, options) {
    const jsLPModel = {
        optimize: "objective", // We'll use a generic name for the objective
        opType: model.objective.sense.toLowerCase().slice(0, 3), // Convert to "max" or "min"
        constraints: {},
        variables: {},
        ints: {},
        binaries: {},
        unrestricted: {},
        options: options
    };

    // Translate variables and handle bounds
    model.variables.forEach((varObj, varName) => {
        jsLPModel.variables[varName] = {}; // Initialize variable entry

        // Handle unrestricted variables (allowed to be negative)
        if (varObj.lb === "-infinity" || varObj.lb < 0) {
            jsLPModel.unrestricted[varName] = 1;
        }

        // If the variable has specific bounds, add virtual constraints
        if (varObj.lb !== 0 && varObj.lb !== "-infinity") {
            jsLPModel.constraints[`${varName}_lb`] = { min: varObj.lb };
        }
        if (varObj.ub !== "+infinity") {
            jsLPModel.constraints[`${varName}_ub`] = { max: varObj.ub };
        }

        // Mark binary and integer variables
        if (varObj.vtype === "BINARY") {
            jsLPModel.binaries[varName] = 1;
        } else if (varObj.vtype === "INTEGER") {
            jsLPModel.ints[varName] = 1;
        }
    });

    // Translate the objective function
    model.objective.expression.forEach(term => {
        if (Array.isArray(term)) { // Exclude constant term
            jsLPModel.variables[term[1].name]["objective"] = term[0];
        }
    });

    // Translate constraints
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
        constr.lhs.forEach(term => {
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

export function readJSLPSolverSolution(model, solution) {
    // example { feasible: true, result: 1080000, bounded: true, isIntegral: true, var1: 24, var2: 20 } and unmentioned variables are 0
    // console.log("readJSLPSolverSolution", solution);
    model.status = solution.feasible ? (solution.bounded ? "Optimal" : "Unbounded") : "Infeasible";

    // Update variable values
    model.variables.forEach((varObj, varName) => {
        if (varName in solution) {
            varObj.value = solution[varName];
        } else {
            varObj.value = 0;
        }
    });

    // Update objective value
    if (solution.result) {
        model.ObjVal = solution.result + model.objective.expression[0]; // Add constant term to objective value
    }
}