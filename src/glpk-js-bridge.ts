/* CONSTANTS */
// taken from https://github.com/jvail/glpk.js/blob/master/src/glpk.js
const glpk_consts = {
    /* direction: */
    GLP_MIN: 1,  /* minimization */
    GLP_MAX: 2,  /* maximization */

    /* type of auxiliary/structural variable: */
    GLP_FR: 1,  /* free (unbounded) variable */
    GLP_LO: 2,  /* variable with lower bound */
    GLP_UP: 3,  /* variable with upper bound */
    GLP_DB: 4,  /* double-bounded variable */
    GLP_FX: 5,  /* fixed variable */

    /* message level: */
    GLP_MSG_OFF: 0,   /* no output */
    GLP_MSG_ERR: 1,   /* warning and error messages only */
    GLP_MSG_ON: 2,    /* normal output */
    GLP_MSG_ALL: 3,   /* full output */
    GLP_MSG_DBG: 4,   /* debug output */

    /* solution status: */
    GLP_UNDEF: 1,     /* solution is undefined */
    GLP_FEAS: 2,      /* solution is feasible */
    GLP_INFEAS: 3,    /* solution is infeasible */
    GLP_NOFEAS: 4,    /* no feasible solution exists */
    GLP_OPT: 5,       /* solution is optimal */
    GLP_UNBND: 6,     /* solution is unbounded */
};

const solutionNames: Record<number, string> = {
    1: "Undefined",
    2: "Feasible",
    3: "Infeasible",
    4: "No feasible solution",
    5: "Optimal",
    6: "Unbounded"
};

import { Model } from './model.js';

export function toGLPKFormat(model: Model): any {
    const glpkModel = {
        name: 'LP',
        objective: {
            direction: model.objective.sense.toUpperCase() === "MAXIMIZE" ? glpk_consts.GLP_MAX : glpk_consts.GLP_MIN,
            name: 'obj',
            vars: model.objective.expression.slice(1).map((term: any) => ({
                name: term[1].name,
                coef: term[0]
            }))
        },
        subjectTo: model.constraints.map((constr, index) => ({
            name: `cons${index + 1}`,
            vars: constr.lhs.slice(1).map((term: any) => ({
                name: term[1].name,
                coef: term[0]
            })),
            bnds: {
                type: constr.comparison === "<=" ? glpk_consts.GLP_UP : constr.comparison === ">=" ? glpk_consts.GLP_LO : glpk_consts.GLP_DB,
                ub: constr.comparison === "<=" ? constr.rhs : 0,
                lb: constr.comparison === ">=" ? constr.rhs : 0
            }
        })),
        bounds: Array.from(model.variables.values()).map(varObj => ({
            name: varObj.name,
            type: varObj.lb === "-infinity" ? (varObj.ub === "+infinity" ? glpk_consts.GLP_FR : glpk_consts.GLP_UP) :
                  varObj.ub === "+infinity" ? glpk_consts.GLP_LO : glpk_consts.GLP_DB,
            ub: varObj.ub === "+infinity" ? 0 : varObj.ub,
            lb: varObj.lb === "-infinity" ? 0 : varObj.lb
        })),
        binaries: Array.from(model.variables.values()).filter(varObj => varObj.vtype === "BINARY").map(varObj => varObj.name),
        generals: Array.from(model.variables.values()).filter(varObj => varObj.vtype === "INTEGER").map(varObj => varObj.name)
    };

    return glpkModel;
}

export function readGLPKSolution(model: Model, solution: any): void {
    model.status = solutionNames[solution.result.status];
    model.ObjVal = solution.result.z + (model.objective.expression[0] as number);

    Object.entries(solution.result.vars).forEach(([varName, varValue]: [string, any]) => {
        if (model.variables.has(varName)) {
            const variable = model.variables.get(varName)!;
            variable.value = varValue;
        } else {
            console.warn(`Variable ${varName} from the solution was not found in the model.`);
        }
    });

    if (solution.result.dual) {
        model.constraints.forEach((constraint, index) => {
            const dualValue = solution.result.dual[`cons${index + 1}`];
            if (dualValue !== undefined) {
                constraint.dual = dualValue;
            }
        });
    }
}
