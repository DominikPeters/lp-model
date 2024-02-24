import { parse } from './parse-lp-format.js';
export function fromLPFormat(model, lpString) {
    const p = parse(lpString);

    // Clear model
    model.clear();

    // Set up variables with bounds
    p.bounds.forEach(bound => {
        const options = { name: bound.variable };
        if (bound.lower !== undefined) {
            options.lb = bound.lower;
        }
        if (bound.upper !== undefined) {
            options.ub = bound.upper;
        }
        if (bound.range === 'free') {
            options.lb = '-infinity';
            options.ub = '+infinity';
        }
        model.addVar(options);
    });

    // Mark variables as binary or integer (general)
    p.binary.forEach(variable => {
        if (model.variables.has(variable)) {
            model.variables.get(variable).vtype = 'BINARY';
        } else {
            model.addVar({ name: variable, vtype: 'BINARY' });
        }
    });
    p.general.forEach(variable => {
        if (model.variables.has(variable)) {
            model.variables.get(variable).vtype = 'INTEGER';
        } else {
            model.addVar({ name: variable, vtype: 'INTEGER' });
        }
    });

    // Find undeclared variables in the objective and constraints
    const allVariables = new Set();
    p.objective.expression.forEach(term => allVariables.add(term.variable));
    p.constraints.forEach(constraint => constraint.expression.forEach(term => allVariables.add(term.variable)));
    allVariables.forEach(variable => { if (!model.variables.has(variable)) model.addVar({ name: variable }); });

    // Add objective
    const objectiveExpression = p.objective.expression.map(term => [term.coefficient, model.variables.get(term.variable)]);
    model.setObjective(objectiveExpression, p.objective.type === 'max' ? 'MAXIMIZE' : 'MINIMIZE');

    // Add constraints
    p.constraints.forEach(constraint => {
        const lhsExpression = constraint.expression.map(term => [term.coefficient, model.variables.get(term.variable)]);
        model.addConstr(lhsExpression, constraint.sense, constraint.value);
    });

    return model;
}

export function toLPFormat(model) {
    let lpString = "";

    function expressionToString(expression) {
        return expression.map(term => {
            if (Array.isArray(term)) {
                if (term.length === 2) {
                    return `${term[0]} ${term[1].name}`;
                } else if (term.length === 3) {
                    return `[ ${term[0]*2} ${term[1].name} * ${term[2].name} ]/2`;
                }
            } else {
                return `${term}`;
            }
        }).join(" + ").replace(/\+ -/g, "- ");
    }

    // Objective Function
    lpString += `${model.objective.sense.toUpperCase() === "MAXIMIZE" ? "Maximize" : "Minimize"}\n`;
    const objExpression = model.objective.expression[0] === 0 ? model.objective.expression.slice(1) : model.objective.expression; // Remove constant term if zero
    lpString += `obj: ${expressionToString(objExpression)}\n`;

    // Constraints
    if (model.constraints.length > 0) {
        lpString += "Subject To\n";
        model.constraints.forEach((constr, index) => {
            lpString += ` c${index + 1}: ${expressionToString(constr.lhs.slice(1))} ${constr.comparison} ${constr.rhs}\n`;
        });
    }

    // Bounds
    let boundsString = "Bounds\n";
    model.variables.forEach((varObj, varName) => {
        if (varObj.lb !== 0 || varObj.ub !== "+infinity") {
            boundsString += ` ${varObj.lb === "-infinity" ? "-inf" : varObj.lb} <= ${varName} <= ${varObj.ub === "+infinity" ? "+inf" : varObj.ub}\n`;
        }
    });
    lpString += boundsString;

    // Variable Types (General and Binary)
    let generalVars = [];
    let binaryVars = [];

    for (const [varName, varObj] of model.variables) {
        if (varObj.vtype === "INTEGER") {
            generalVars.push(varName);
        } else if (varObj.vtype === "BINARY") {
            binaryVars.push(varName);
        }
    }

    let typesString = "";
    if (generalVars.length > 0) {
        typesString += "General\n " + generalVars.join(" ") + "\n";
    }
    if (binaryVars.length > 0) {
        typesString += "Binary\n " + binaryVars.join(" ") + "\n";
    }
    lpString += typesString;

    // End
    lpString += "End\n";

    return lpString;
}
