/* CONSTANTS */
// taken from https://github.com/jvail/glpk.js/blob/master/src/glpk.js
const glpk_consts = {};

/* direction: */
glpk_consts.GLP_MIN = 1;  /* minimization */
glpk_consts.GLP_MAX = 2;  /* maximization */

/* type of auxiliary/structural variable: */
glpk_consts.GLP_FR = 1;  /* free (unbounded) variable */
glpk_consts.GLP_LO = 2;  /* variable with lower bound */
glpk_consts.GLP_UP = 3;  /* variable with upper bound */
glpk_consts.GLP_DB = 4;  /* double-bounded variable */
glpk_consts.GLP_FX = 5;  /* fixed variable */

/* message level: */
glpk_consts.GLP_MSG_OFF = 0;   /* no output */
glpk_consts.GLP_MSG_ERR = 1;   /* warning and error messages only */
glpk_consts.GLP_MSG_ON = 2;    /* normal output */
glpk_consts.GLP_MSG_ALL = 3;   /* full output */
glpk_consts.GLP_MSG_DBG = 4;   /* debug output */

/* solution status: */
glpk_consts.GLP_UNDEF = 1;     /* solution is undefined */
glpk_consts.GLP_FEAS = 2;      /* solution is feasible */
glpk_consts.GLP_INFEAS = 3;    /* solution is infeasible */
glpk_consts.GLP_NOFEAS = 4;    /* no feasible solution exists */
glpk_consts.GLP_OPT = 5;	    /* solution is optimal */
glpk_consts.GLP_UNBND = 6;     /* solution is unbounded */


export function toGLPKFormat(model) {
    const glpkModel = {
        name: 'LP',
        objective: {
            direction: model.objective.sense.toUpperCase() === "MAXIMIZE" ? glpk_consts.GLP_MAX : glpk_consts.GLP_MIN,
            name: 'obj',
            vars: model.objective.expression.slice(1).map(term => ({ // Exclude constant term
                name: term[1].name,
                coef: term[0]
            }))
        },
        subjectTo: model.constraints.map((constr, index) => ({
            name: `cons${index + 1}`,
            vars: constr.lhs.slice(1).map(term => ({ // Exclude constant term
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

export function readGLPKSolution(model, solution) {
    model.status = solution.result.status; // Map GLPK status to your model's status

    // Update variable values
    Object.entries(solution.result.vars).forEach(([varName, varValue]) => {
        if (model.variables.has(varName)) {
            const variable = model.variables.get(varName);
            variable.value = varValue;
        } else {
            console.warn(`Variable ${varName} from the solution was not found in the model.`);
        }
    });

    // Optionally, update constraint dual values if available (for simplex solutions)
    if (solution.result.dual) {
        model.constraints.forEach((constraint, index) => {
            const dualValue = solution.result.dual[`cons${index + 1}`];
            if (dualValue !== undefined) {
                constraint.dual = dualValue;
            }
        });
    }
}
