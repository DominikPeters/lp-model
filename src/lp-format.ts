import { parse } from './parse-lp-format.js';
import { Model } from './model.js';

export function fromLPFormat(model: Model, lpString: string, fileName: string = ".lp file"): Model | undefined {
    let p: any;
    try {
        p = parse(lpString, { grammarSource: fileName });
    } catch (e: any) {
        if (typeof e.format === "function") {
            console.log(e.format([
                { source: fileName, text: lpString },
            ]));
            return;
        } else {
            throw e;
        }
    }

    model.clear();

    p.bounds.forEach((bound: any) => {
        const options: any = { name: bound.variable };
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

    p.binary.forEach((variable: string) => {
        if (model.variables.has(variable)) {
            model.variables.get(variable)!.vtype = 'BINARY';
        } else {
            model.addVar({ name: variable, vtype: 'BINARY' });
        }
    });

    p.general.forEach((variable: string) => {
        if (model.variables.has(variable)) {
            model.variables.get(variable)!.vtype = 'INTEGER';
        } else {
            model.addVar({ name: variable, vtype: 'INTEGER' });
        }
    });

    const allVariables = new Set<string>();
    p.objective.expression.forEach((term: any) => allVariables.add(term.variable));
    p.constraints.forEach((constraint: any) => constraint.expression.forEach((term: any) => allVariables.add(term.variable)));
    allVariables.forEach(variable => { if (!model.variables.has(variable)) model.addVar({ name: variable }); });

    const objectiveExpression = p.objective.expression.map((term: any) => [term.coefficient, model.variables.get(term.variable)]);
    model.setObjective(objectiveExpression, p.objective.type === 'max' ? 'MAXIMIZE' : 'MINIMIZE');

    p.constraints.forEach((constraint: any) => {
        const lhsExpression = constraint.expression.map((term: any) => [term.coefficient, model.variables.get(term.variable)]);
        model.addConstr(lhsExpression, constraint.sense, constraint.value);
    });

    return model;
}

export function toLPFormat(model: Model): string {
    let lpString = "";

    function expressionToString(expression: any[]): string {
        return expression.map(term => {
            if (Array.isArray(term)) {
                if (term.length === 2) {
                    return `${term[0]} ${term[1].name}`;
                } else if (term.length === 3) {
                    return `[ ${term[0] * 2} ${term[1].name} * ${term[2].name} ]/2`;
                }
            } else {
                return `${term}`;
            }
        }).join(" + ").replace(/\+ -/g, "- ");
    }

    lpString += `${model.objective.sense.toUpperCase() === "MAXIMIZE" ? "Maximize" : "Minimize"}\n`;
    const objExpression = (model.objective.expression[0] as number) === 0 ? model.objective.expression.slice(1) : model.objective.expression;
    lpString += `obj: ${expressionToString(objExpression)}\n`;

    if (model.constraints.length > 0) {
        lpString += "Subject To\n";
        model.constraints.forEach((constr, index) => {
            lpString += ` c${index + 1}: ${expressionToString(constr.lhs.slice(1))} ${constr.comparison} ${constr.rhs}\n`;
        });
    }

    let boundsEntries = "";
    model.variables.forEach((varObj, varName) => {
        if (varObj.vtype === "BINARY") {
            return;
        }
        if (varObj.lb === "-infinity" && varObj.ub === "+infinity") {
            boundsEntries += ` ${varName} free\n`;
        } else if (varObj.lb !== 0 || varObj.ub !== "+infinity") {
            boundsEntries += ` ${varObj.lb === "-infinity" ? "-inf" : varObj.lb} <= ${varName} <= ${varObj.ub === "+infinity" ? "+inf" : varObj.ub}\n`;
        }
    });
    if (boundsEntries) {
        lpString += "Bounds\n" + boundsEntries;
    }

    const generalVars: string[] = [];
    const binaryVars: string[] = [];

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

    lpString += "End\n";

    return lpString;
}
