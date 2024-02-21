/**
 * A module for specifying LPs and ILPs using a convenient syntax, and solving them with various solvers.
 * @module lp-model
 */

import { toGLPKFormat, readGLPKSolution } from './glpk-js-bridge.js';
import { toJSLPSolverFormat, readJSLPSolverSolution } from './jsLPSolver-bridge.js';
import { readHighsSolution } from './highs-js-bridge.js';
import { toLPFormat } from './write-lp-format.js';

/**
 * Represents a variable in a linear programming model.
 * @class
 */
export class Var {
    /**
     * Creates an instance of a variable.
     * @param {Object} options - Configuration options for the variable.
     * @param {number | "-infinity"} [options.lb=0] - The lower bound of the variable. Default is 0. Use "-infinity" for no lower bound.
     * @param {number | "+infinity"} [options.ub="+infinity"] - The upper bound of the variable. Default is "+infinity". Use "+infinity" for no upper bound.
     * @param {"CONTINUOUS" | "BINARY" | "INTEGER"} [options.vtype="CONTINUOUS"] - The type of the variable. Default is "CONTINUOUS".
     * @param {string | null} [options.name=null] - The name of the variable. If null, a default name is assigned.
     * @throws Will throw an error if an invalid variable type or bound is provided.
     */
    constructor({ lb = 0, ub = "+infinity", vtype = "CONTINUOUS", name = null }) {
        if (!["CONTINUOUS", "BINARY", "INTEGER"].includes(vtype.toUpperCase())) {
            throw new Error(`Invalid variable type: ${vtype}. Must be one of "CONTINUOUS", "BINARY", or "INTEGER".`);
        }
        if (typeof lb !== "number" && lb !== "-infinity") {
            throw new Error(`Invalid lower bound: ${lb}. Must be a number or "-infinity".`);
        }
        if (typeof ub !== "number" && ub !== "+infinity") {
            throw new Error(`Invalid upper bound: ${ub}. Must be a number or "+infinity".`);
        }
        this.lb = lb;
        this.ub = ub;
        this.vtype = vtype.toUpperCase();
        this.name = name;
    }
}

/**
 * Represents a constraint in a linear programming model.
 * @class
 */
export class Constr {
    /**
     * Creates an instance of a constraint.
     * @param {Array} lhs - The left-hand side expression of the constraint.
     * @param {string} comparison - The comparison operator of the constraint. Can be "<=", "=", or ">=".
     * @param {number} rhs - The right-hand side number of the constraint.
     */
    constructor(lhs, comparison, rhs) {
        this.lhs = lhs; // Left-hand side expression
        this.comparison = comparison;
        this.rhs = rhs; // Right-hand side number
    }
}

/**
 * Represents a model in linear programming.
 * @class
 */
export class Model {
    /**
     * Creates an instance of a model.
     */
    /**
     * Represents a mathematical optimization model.
     * @constructor
     */
    constructor() {
        this.variables = new Map();
        this.constraints = [];
        this.objective = { expression: [0], sense: "MAXIMIZE" };
        this.varCount = 0;

        /**
         * The solution of the optimization problem, provided directly by the solver.
         * @type {Object | null}
         */
        this.solution = null;

        /**
         * The status of the optimization problem, e.g., "Optimal", "Infeasible", "Unbounded", etc.
         * @type {String}
         */
        this.status = null;

        /**
         * The value of the objective function in the optimal solution.
         * @type {number | null}
         */
        this.ObjVal = null;
    }

    /**
     * Adds a variable to the model.
     * @param {Object} options - Options for creating the variable.
     * @param {number | "-infinity"} [options.lb=0] - The lower bound of the variable.
     * @param {number | "+infinity"} [options.ub="+infinity"] - The upper bound of the variable.
     * @param {"CONTINUOUS" | "BINARY" | "INTEGER"} [options.vtype="CONTINUOUS"] - The type of the variable.
     * @param {string} [options.name] - The name of the variable. If not provided, a unique name is generated.
     * @returns {Var} The created variable instance.
     * @throws Will throw an error if the variable name is already used.
     */
    addVar({ lb, ub, vtype, name } = {}) {
        if (name === null || name === undefined) {
            name = `Var${this.varCount++}`; // Assign an internal name if none provided
            while (this.variables.has(name)) {
                name = `Var${this.varCount++}`; // Ensure unique name
            }
        } else if (this.variables.has(name)) {
            throw new Error(`Variable name '${name}' has already been used.`);
        }
        const variable = new Var({ lb, ub, vtype, name });
        this.variables.set(name, variable);
        return variable;
    }

    /**
     * Adds multiple variables to the model based on an array of names.
     * Each variable is created with the same provided options.
     * @param {string[]} varNames - Array of names for the variables to be added.
     * @param {Object} options - Common options for creating the variables.
     * @param {number | "-infinity"} [options.lb=0] - The lower bound for all variables.
     * @param {number | "+infinity"} [options.ub="+infinity"] - The upper bound for all variables.
     * @param {"CONTINUOUS" | "BINARY" | "INTEGER"} [options.vtype="CONTINUOUS"] - The type for all variables.
     * @returns {Object} An object where keys are variable names and values are the created variable instances.
     * @throws Will throw an error if any variable name is already used or if any name in the array is not a string.
     */
    addVars(varNames, { lb, ub, vtype } = {}) {
        const createdVars = {};

        varNames.forEach(name => {
            if (typeof name !== 'string') {
                throw new Error(`Variable name must be a string, got '${typeof name}' for '${name}'.`);
            }
            if (this.variables.has(name)) {
                throw new Error(`Variable name '${name}' has already been used.`);
            }

            // Assign the provided options to the new variable
            const variable = new Var({ lb, ub, vtype, name });
            this.variables.set(name, variable);

            // Add the new variable to the returned object
            createdVars[name] = variable;
        });

        return createdVars;
    }

    /**
     * Sets the objective function of the model.
     * @param {Array} expression - The linear expression representing the objective function.
     * @param {"MAXIMIZE" | "MINIMIZE"} sense - The sense of optimization, either "MAXIMIZE" or "MINIMIZE".
     * @throws Will throw an error if an invalid sense is provided.
     */
    setObjective(expression, sense) {
        if (!["MAXIMIZE", "MINIMIZE"].includes(sense.toUpperCase())) {
            throw new Error(`Invalid sense: ${sense}. Must be one of "MAXIMIZE" or "MINIMIZE".`);
        }
        this.objective = { expression: this.parseExpression(expression), sense };
    }

    /**
     * Adds a constraint to the model.
     * @param {Array} lhs - The left-hand side expression of the constraint.
     * @param {string} comparison - The comparison operator, either "<=", "=", or ">=".
     * @param {number | Array} rhs - The right-hand side, which can be a number or a linear expression.
     * @returns {Constr} The created constraint instance.
     */
    addConstr(lhs, comparison, rhs) {
        lhs = this.parseExpression(lhs);
        rhs = typeof rhs === 'number' ? [rhs] : this.parseExpression(rhs);

        if (comparison === "==") comparison = "="; // Convert to standard comparison operator
        if (!["<=", "=", ">="].includes(comparison)) {
            throw new Error(`Invalid comparison operator: ${comparison}. Must be one of "<=", "=", or ">=".`);
        }

        // Combine LHS and negated RHS
        const combinedLhs = lhs.concat(rhs.map(term => {
            if (Array.isArray(term)) {
                if (term.length === 2) {
                    return [-term[0], term[1]]; // Negate the coefficient
                } else if (term.length === 3) {
                    return [-term[0], term[1], term[2]]; // Negate the coefficient
                }
            }
            return -term; // Negate the constant term
        }));

        const finalLhs = this.parseExpression(combinedLhs); // Parse again to combine like terms
        const finalRhs = -finalLhs[0]; // RHS is the negated first term in the combined expression
        finalLhs[0] = 0; // Remove the constant term from LHS
        const constraint = new Constr(finalLhs, comparison, finalRhs);
        this.constraints.push(constraint);
        return constraint;
    }

    /**
     * Parses a linear expression from a more flexible input format.
     * @param {Array} expression - The expression to parse, which can include numbers, variables, or arrays representing terms.
     * @returns {Array} The parsed linear expression in a canonical format.
     * @throws Will throw an error if an invalid item is included in the expression.
     */
    parseExpression(expression) {
        let combined = { 'constant': 0 };

        for (let item of expression) {
            if (Array.isArray(item)) {
                if (item.length === 2) {
                    // Item is a term like [coefficient, variable]
                    const [coeff, varObj] = item;
                    if (!(varObj instanceof Var) || typeof coeff !== 'number') {
                        throw new Error(`Invalid term: ${item}. Must be [coefficient, variable].`);
                    }
                    if (combined[varObj.name]) {
                        combined[varObj.name][0] += coeff;
                    } else {
                        combined[varObj.name] = [coeff, varObj];
                    }
                } else if (item.length === 3) {
                    // Quadratic term like [coefficient, variable1, variable2]
                    const [coeff, varObj1, varObj2] = item;
                    if (!(varObj1 instanceof Var) || !(varObj2 instanceof Var) || typeof coeff !== 'number') {
                        throw new Error(`Invalid quadratic term: ${item}. Must be [coefficient, variable1, variable2].`);
                    }
                    let v1 = varObj1.name;
                    let v2 = varObj2.name;
                    if (v1 > v2) { [v1, v2] = [v2, v1]; } // Ensure consistent order
                    const termName = `${v1}_***_${v2}`;
                    if (combined[termName]) {
                        combined[termName][0] += coeff;
                    } else {
                        combined[termName] = [coeff, this.variables.get(v1), this.variables.get(v2)];
                    }
                } else {
                    throw new Error(`Invalid expression item: ${item}. Must be [coefficient, variable] or [coefficient, variable1, variable2].`);
                }
            } else if (item instanceof Var) {
                // Item is a variable, treat it as [1, variable]
                const varName = item.name;
                if (combined[varName]) {
                    combined[varName][0] += 1;
                } else {
                    combined[varName] = [1, item];
                }
            } else if (typeof item === 'number') {
                // Item is a constant, add it to the constant term
                combined['constant'] += item;
            } else {
                throw new Error("Invalid expression item.");
            }
        }

        // Convert combined terms back to array format, ensuring constant term is first
        let parsedExpression = [combined['constant']];
        delete combined['constant'];

        for (let termName in combined) {
            if (combined[termName][0] !== 0) { // Exclude zero-coefficient terms
                parsedExpression.push(combined[termName]);
            }
        }

        return parsedExpression;
    }

    /**
     * Converts the model to CPLEX LP format string.
     * @returns {string} The model represented in LP format.
     * @see {@link https://web.mit.edu/lpsolve/doc/CPLEX-format.htm}
     */
    toLPFormat() {
        return toLPFormat(this);
    }

    /**
     * Checks if the model is quadratic, i.e., if it contains any quadratic terms in the objective function or constraints.
     * @returns {boolean} True if the model is quadratic, false otherwise.
     */
    isQuadratic() {
        function isQuadraticExpression(expression) {
            return expression.some(term => Array.isArray(term) && term.length === 3);
        }

        return isQuadraticExpression(this.objective.expression)
            || this.constraints.some(constr => isQuadraticExpression(constr.lhs));
    }

    /**
     * Reads and applies the solution from the HiGHS.js solver to the model's variables and constraints.
     * @param {Object} solution - The solution object returned by the HiGHS solver.
     */
    readHighsSolution(solution) {
        readHighsSolution(this, solution);
    }

    /**
     * Converts the model to the JSON format for use with the glpk.js solver.
     * @returns {Object} The model represented in the JSON format for glpk.js.
     * @see {@link https://github.com/jvail/glpk.js}
     */
    toGLPKFormat() {
        if (this.isQuadratic()) {
            throw new Error("GLPK.js does not support quadratic models.");
        }
        return toGLPKFormat(this);
    }

    /**
     * Reads and applies the solution from the glpk.js solver to the model's variables and constraints.
     * @param {Object} solution - The solution object returned by the glpk.js solver.
     */
    readGLPKSolution(solution) {
        readGLPKSolution(this, solution);
    }

    /**
     * Converts the model to the JSON format for use with the jsLPSolver solver.
     * @returns {Object} The model represented in the JSON format for jsLPSolver.
     * @see {@link https://www.npmjs.com/package/jsLPSolver}
     */
    toJSLPSolverFormat(options) {
        return toJSLPSolverFormat(this, options);
    }

    /**
     * Reads and applies the solution from the jsLPSolver solver to the model's variables and constraints.
     * @param {Object} solution - The solution object returned by the jsLPSolver solver.
     * @see {@link https://www.npmjs.com/package/jsLPSolver}
     */
    readJSLPSolverSolution(solution) {
        readJSLPSolverSolution(this, solution);
    }

    /**
     * Solves the model using the provided solver. HiGHS.js or glpk.js can be used. 
     * The solution can be accessed from the variables' `value` properties and the constraints' `primal` and `dual` properties.
     * @param {Object} solver - The solver instance to use for solving the model, either HiGHS.js or glpk.js.
     * @param {Object} [options={}] - Options to pass to the solver's solve method (refer to their respective documentation: https://ergo-code.github.io/HiGHS/dev/options/definitions/, https://www.npmjs.com/package/glpk.js).
     */
    async solve(solver, options = {}) {
        // clear previous solution
        this.solution = null;
        this.variables.forEach(variable => variable.value = null);
        this.constraints.forEach(constraint => {
            constraint.primal = null;
            constraint.dual = null;
        });
        this.ObjVal = null;

        // run solver
        if (Object.hasOwn(solver, 'branchAndCut') && Object.hasOwn(solver, 'lastSolvedModel')) { // jsLPSolver
            this.solution = solver.Solve(this.toJSLPSolverFormat(options));
            this.readJSLPSolverSolution(this.solution);
        } else if (Object.hasOwn(solver, 'GLP_OPT')) { // glpk.js
            this.solution = await solver.solve(this.toGLPKFormat(), options);
            this.readGLPKSolution(this.solution);
        } else if (Object.hasOwn(solver, '_Highs_run')) { // highs-js
            this.solution = solver.solve(this.toLPFormat(), options);
            this.readHighsSolution(this.solution);
        }
    }
}