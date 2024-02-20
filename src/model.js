
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
    constructor() {
        this.variables = new Map();
        this.constraints = [];
        this.objective = { expression: null, sense: "MAXIMIZE" };
        this.varCount = 0; // Counter for variable naming
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

        // Combine LHS and negated RHS
        const combinedLhs = lhs.concat(rhs.map(term => {
            if (Array.isArray(term)) {
                return [-term[0], term[1]]; // Negate the coefficient
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
                // Item is a term like [coefficient, variable]
                const [coeff, varObj] = item;
                if (combined[varObj.name]) {
                    combined[varObj.name][0] += coeff;
                } else {
                    combined[varObj.name] = [coeff, varObj];
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

        for (let varName in combined) {
            if (combined[varName][0] !== 0) { // Exclude zero-coefficient terms
                parsedExpression.push(combined[varName]);
            }
        }

        return parsedExpression;
    }

    /**
     * Converts the model to CPLEX LP format string.
     * @returns {string} The model represented in LP format.
     */
    toLPFormat() {
        let lpString = "";

        function expressionToString(expression) {
            return expression.map(term => {
                if (Array.isArray(term)) {
                    return `${term[0]} ${term[1].name}`;
                } else {
                    return `${term}`;
                }
            }).join(" + ").replace(/\+ -/g, "- ");
        }

        // Objective Function
        lpString += `${this.objective.sense.toUpperCase() === "MAXIMIZE" ? "Maximize" : "Minimize"}\n`;
        const objExpression = this.objective.expression[0] === 0 ? this.objective.expression.slice(1) : this.objective.expression; // Remove constant term if zero
        lpString += `obj: ${expressionToString(objExpression)}\n`;

        // Constraints
        if (this.constraints.length > 0) {
            lpString += "Subject To\n";
            this.constraints.forEach((constr, index) => {
                lpString += ` c${index + 1}: ${expressionToString(constr.lhs.slice(1))} ${constr.comparison} ${constr.rhs}\n`;
            });
        }

        // Bounds
        let boundsString = "Bounds\n";
        this.variables.forEach((varObj, varName) => {
            if (varObj.lb !== 0 || varObj.ub !== "+infinity") {
                boundsString += `${varObj.lb === "-infinity" ? "-inf" : varObj.lb} <= ${varName} <= ${varObj.ub === "+infinity" ? "+inf" : varObj.ub}\n`;
            }
        });
        lpString += boundsString;

        // Variable Types (General and Binary)
        let generalVars = [];
        let binaryVars = [];

        for (const [varName, varObj] of this.variables) {
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



    /**
     * Reads and applies the solution from the solver to the model's variables and constraints.
     * @param {Object} solution - The solution object returned by the HiGHS solver.
     */
    readSolution(solution) {
        this.status = solution.Status;

        if (solution.Status !== 'Optimal' && solution.Status !== 'Feasible') {
            return; // Do not update variable values if the solution is not optimal or feasible
        }

        // Update variable values
        Object.entries(solution.Columns).forEach(([name, column]) => {
            if (this.variables.has(name)) {
                const variable = this.variables.get(name);
                variable.value = column.Primal; // Set variable's value to its primal value from the solution
            } else {
                console.warn(`Variable ${name} from the solution was not found in the model.`);
            }
        });

        // Update constraint primal and dual values
        solution.Rows.forEach((row, index) => {
            if (index < this.constraints.length) {
                const constraint = this.constraints[index];
                constraint.primal = row.Primal; // Set constraint's primal value
                constraint.dual = row.Dual; // Set constraint's dual value
            } else {
                console.warn(`Row ${row.Name} from the solution does not correspond to any model constraint.`);
            }
        });
    }

    /**
     * Solves the model using the provided solver.
     * @param {Object} highs - The HiGHS solver instance to use for solving the model.
     */
    solve(highs) {
        this.solution = highs.solve(this.toLPFormat());
        this.readSolution(this.solution);
    }
}