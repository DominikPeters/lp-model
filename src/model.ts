/**
 * A module for specifying LPs and ILPs using a convenient syntax, and solving them with various solvers.
 * @module lp-model
 */

import { toGLPKFormat, readGLPKSolution } from './glpk-js-bridge.js';
import { toJSLPSolverFormat, readJSLPSolverSolution } from './jsLPSolver-bridge.js';
import { readHighsSolution } from './highs-js-bridge.js';
import { fromLPFormat, toLPFormat } from './lp-format.js';

export type VarType = "CONTINUOUS" | "BINARY" | "INTEGER";
export type LowerBound = number | "-infinity";
export type UpperBound = number | "+infinity";
export type Sense = "MAXIMIZE" | "MINIMIZE";
export type Comparison = "<=" | "=" | ">=";

export type LinearTerm = [number, Var];
export type QuadraticTerm = [number, Var, Var];
export type ExpressionItem = number | Var | LinearTerm | QuadraticTerm;
export type ExpressionInput = ExpressionItem[];

// Canonical parsed expression: first element is the constant, rest are linear/quadratic terms
export type ParsedExpression = Array<number | LinearTerm | QuadraticTerm>;

export interface VarOptions {
    lb?: LowerBound;
    ub?: UpperBound;
    vtype?: string;
    name?: string | null;
}

export interface AddVarsOptions {
    lb?: LowerBound;
    ub?: UpperBound;
    vtype?: string;
}

/**
 * Represents a variable in a linear programming model.
 * @class
 */
export class Var {
    lb: LowerBound;
    ub: UpperBound;
    vtype: string;
    name: string | null;
    value?: number | null;

    /**
     * Creates an instance of a variable.
     * @param options - Configuration options for the variable.
     * @param options.lb - The lower bound of the variable. Default is 0. Use "-infinity" for no lower bound.
     * @param options.ub - The upper bound of the variable. Default is "+infinity". Use "+infinity" for no upper bound.
     * @param options.vtype - The type of the variable. Default is "CONTINUOUS".
     * @param options.name - The name of the variable. If null, a default name is assigned.
     * @throws Will throw an error if an invalid variable type or bound is provided.
     */
    constructor({ lb = 0, ub = "+infinity", vtype = "CONTINUOUS", name = null }: VarOptions = {}) {
        if (!["CONTINUOUS", "BINARY", "INTEGER"].includes(vtype.toUpperCase())) {
            throw new Error(`Invalid variable type: ${vtype}. Must be one of "CONTINUOUS", "BINARY", or "INTEGER".`);
        }
        if (typeof lb !== "number" && lb !== "-infinity") {
            throw new Error(`Invalid lower bound: ${lb}. Must be a number or "-infinity".`);
        }
        if (typeof ub !== "number" && ub !== "+infinity") {
            throw new Error(`Invalid upper bound: ${ub}. Must be a number or "+infinity".`);
        }
        if (typeof lb === "number" && typeof ub === "number" && lb > ub) {
            throw new Error("Variable lower bound must be less than or equal to upper bound.");
        }
        this.lb = lb;
        this.ub = vtype === "BINARY" ? 1 : ub;
        this.vtype = vtype.toUpperCase();
        this.name = name;
    }
}

/**
 * Represents a constraint in a linear programming model.
 * @class
 */
export class Constr {
    lhs: ParsedExpression;
    comparison: Comparison;
    rhs: number;
    primal?: number | null;
    dual?: number | null;

    /**
     * Creates an instance of a constraint.
     * @param lhs - The left-hand side expression of the constraint.
     * @param comparison - The comparison operator of the constraint. Can be "<=", "=", or ">=".
     * @param rhs - The right-hand side number of the constraint.
     */
    constructor(lhs: ParsedExpression, comparison: Comparison, rhs: number) {
        this.lhs = lhs;
        this.comparison = comparison;
        this.rhs = rhs;
    }
}

export interface Objective {
    expression: ParsedExpression;
    sense: string;
}

/**
 * Represents a model in linear programming.
 * @class
 */
export class Model {
    variables: Map<string, Var>;
    constraints: Constr[];
    objective: Objective;
    varCount: number;

    /**
     * The solution of the optimization problem, provided directly by the solver.
     */
    solution: any;

    /**
     * The status of the optimization problem, e.g., "Optimal", "Infeasible", "Unbounded", etc.
     */
    status: string | null;

    /**
     * The value of the objective function in the optimal solution.
     */
    ObjVal: number | null;

    constructor() {
        this.variables = new Map();
        this.constraints = [];
        this.objective = { expression: [0], sense: "MAXIMIZE" };
        this.varCount = 0;
        this.solution = null;
        this.status = null;
        this.ObjVal = null;
    }

    clear(): void {
        this.variables = new Map();
        this.constraints = [];
        this.objective = { expression: [0], sense: "MAXIMIZE" };
        this.varCount = 0;
        this.solution = null;
        this.status = null;
        this.ObjVal = null;
    }

    /**
     * Adds a variable to the model.
     * @param options - Options for creating the variable.
     * @returns The created variable instance.
     * @throws Will throw an error if the variable name is already used.
     */
    addVar({ lb, ub, vtype, name }: VarOptions = {}): Var {
        if (name === null || name === undefined) {
            name = `Var${this.varCount++}`;
            while (this.variables.has(name)) {
                name = `Var${this.varCount++}`;
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
     * @param varNames - Array of names for the variables to be added.
     * @param options - Common options for creating the variables.
     * @returns An object where keys are variable names and values are the created variable instances.
     * @throws Will throw an error if any variable name is already used or if any name in the array is not a string.
     */
    addVars(varNames: string[], { lb, ub, vtype }: AddVarsOptions = {}): Record<string, Var> {
        const createdVars: Record<string, Var> = {};

        varNames.forEach(name => {
            if (typeof name !== 'string') {
                throw new Error(`Variable name must be a string, got '${typeof name}' for '${name}'.`);
            }
            if (this.variables.has(name)) {
                throw new Error(`Variable name '${name}' has already been used.`);
            }

            const variable = new Var({ lb, ub, vtype, name });
            this.variables.set(name, variable);
            createdVars[name] = variable;
        });

        return createdVars;
    }

    /**
     * Sets the objective function of the model.
     * @param expression - The linear expression representing the objective function.
     * @param sense - The sense of optimization, either "MAXIMIZE" or "MINIMIZE".
     * @throws Will throw an error if an invalid sense is provided.
     */
    setObjective(expression: ExpressionInput, sense: string): void {
        if (!["MAXIMIZE", "MINIMIZE"].includes(sense.toUpperCase())) {
            throw new Error(`Invalid sense: ${sense}. Must be one of "MAXIMIZE" or "MINIMIZE".`);
        }
        this.objective = { expression: this.parseExpression(expression), sense };
    }

    /**
     * Adds a constraint to the model.
     * @param lhs - The left-hand side expression of the constraint.
     * @param comparison - The comparison operator, either "<=", "=", or ">=".
     * @param rhs - The right-hand side, which can be a number or a linear expression.
     * @returns The created constraint instance.
     */
    addConstr(lhs: ExpressionInput, comparison: string, rhs: number | ExpressionInput): Constr {
        const parsedLhs = this.parseExpression(lhs);
        const parsedRhs: ParsedExpression = typeof rhs === 'number' ? [rhs] : this.parseExpression(rhs as ExpressionInput);

        if (comparison === "==") comparison = "=";
        if (!["<=", "=", ">="].includes(comparison)) {
            throw new Error(`Invalid comparison operator: ${comparison}. Must be one of "<=", "=", or ">=".`);
        }

        const combinedLhs = parsedLhs.concat(parsedRhs.map(term => {
            if (Array.isArray(term)) {
                if (term.length === 2) {
                    return [-term[0], term[1]] as LinearTerm;
                } else {
                    return [-term[0], term[1], term[2]] as QuadraticTerm;
                }
            }
            return -(term as number);
        }));

        const finalLhs = this.parseExpression(combinedLhs);
        const finalRhs = -(finalLhs[0] as number);
        finalLhs[0] = 0;
        const constraint = new Constr(finalLhs, comparison as Comparison, finalRhs);
        this.constraints.push(constraint);
        return constraint;
    }

    /**
     * Parses a linear expression from a more flexible input format.
     * @param expression - The expression to parse.
     * @returns The parsed linear expression in a canonical format.
     * @throws Will throw an error if an invalid item is included in the expression.
     */
    parseExpression(expression: ExpressionInput | ParsedExpression): ParsedExpression {
        const combined: Record<string, any> = { 'constant': 0 };

        for (const item of expression) {
            if (Array.isArray(item)) {
                if (item.length === 2) {
                    const [coeff, varObj] = item as LinearTerm;
                    if (!(varObj instanceof Var) || typeof coeff !== 'number') {
                        throw new Error(`Invalid term: ${item}. Must be [coefficient, variable].`);
                    }
                    const varName = varObj.name!;
                    if (combined[varName]) {
                        combined[varName][0] += coeff;
                    } else {
                        combined[varName] = [coeff, varObj];
                    }
                } else if (item.length === 3) {
                    const [coeff, varObj1, varObj2] = item as QuadraticTerm;
                    if (!(varObj1 instanceof Var) || !(varObj2 instanceof Var) || typeof coeff !== 'number') {
                        throw new Error(`Invalid quadratic term: ${item}. Must be [coefficient, variable1, variable2].`);
                    }
                    let v1 = varObj1.name!;
                    let v2 = varObj2.name!;
                    if (v1 > v2) { [v1, v2] = [v2, v1]; }
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
                const varName = item.name!;
                if (combined[varName]) {
                    combined[varName][0] += 1;
                } else {
                    combined[varName] = [1, item];
                }
            } else if (typeof item === 'number') {
                combined['constant'] += item;
            } else {
                throw new Error("Invalid expression item.");
            }
        }

        const parsedExpression: ParsedExpression = [combined['constant']];
        delete combined['constant'];

        for (const termName in combined) {
            if (combined[termName][0] !== 0) {
                parsedExpression.push(combined[termName]);
            }
        }

        return parsedExpression;
    }

    /**
     * Converts the model to CPLEX LP file format, provided as a string.
     * @returns The model represented in LP format.
     */
    toLPFormat(): string {
        return toLPFormat(this);
    }

    /**
     * Clears the model, then adds variables and constraints taken from a string formatted in the CPLEX LP file format.
     * @param lpString - The LP file as a string.
     */
    readLPFormat(lpString: string): Model | undefined {
        return fromLPFormat(this, lpString);
    }

    /**
     * Checks if the model is quadratic.
     * @returns True if the model is quadratic, false otherwise.
     */
    isQuadratic(): boolean {
        function isQuadraticExpression(expression: ParsedExpression): boolean {
            return expression.some(term => Array.isArray(term) && term.length === 3);
        }

        return isQuadraticExpression(this.objective.expression)
            || this.constraints.some(constr => isQuadraticExpression(constr.lhs));
    }

    /**
     * Reads and applies the solution from the HiGHS.js solver to the model.
     */
    readHighsSolution(solution: any): void {
        readHighsSolution(this, solution);
    }

    /**
     * Converts the model to the JSON format for use with the glpk.js solver.
     */
    toGLPKFormat(): any {
        if (this.isQuadratic()) {
            throw new Error("GLPK.js does not support quadratic models.");
        }
        return toGLPKFormat(this);
    }

    /**
     * Reads and applies the solution from the glpk.js solver to the model.
     */
    readGLPKSolution(solution: any): void {
        readGLPKSolution(this, solution);
    }

    /**
     * Converts the model to the JSON format for use with the jsLPSolver solver.
     */
    toJSLPSolverFormat(options?: any): any {
        if (this.isQuadratic()) {
            throw new Error("jsLPSolver does not support quadratic models.");
        }
        return toJSLPSolverFormat(this, options);
    }

    /**
     * Reads and applies the solution from the jsLPSolver solver to the model.
     */
    readJSLPSolverSolution(solution: any): void {
        readJSLPSolverSolution(this, solution);
    }

    /**
     * Solves the model using the provided solver.
     * @param solver - The solver instance to use (HiGHS.js, glpk.js, or jsLPSolver).
     * @param options - Options to pass to the solver's solve method.
     */
    async solve(solver: any, options: any = {}): Promise<void> {
        this.solution = null;
        this.variables.forEach(variable => variable.value = null);
        this.constraints.forEach(constraint => {
            constraint.primal = null;
            constraint.dual = null;
        });
        this.ObjVal = null;

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

export default { Model, Var, Constr };
