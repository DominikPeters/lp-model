export function readHighsSolution(model, solution) {
    model.status = solution.Status;

    if (solution.Status !== 'Optimal' && solution.Status !== 'Feasible') {
        return; // Do not update variable values if the solution is not optimal or feasible
    }

    // Update variable values
    Object.entries(solution.Columns).forEach(([name, column]) => {
        if (model.variables.has(name)) {
            const variable = model.variables.get(name);
            variable.value = column.Primal; // Set variable's value to its primal value from the solution
        } else {
            console.warn(`Variable ${name} from the solution was not found in the model.`);
        }
    });

    // Update constraint primal and dual values
    solution.Rows.forEach((row, index) => {
        if (index < model.constraints.length) {
            const constraint = model.constraints[index];
            constraint.primal = row.Primal; // Set constraint's primal value
            constraint.dual = row.Dual; // Set constraint's dual value
        } else {
            console.warn(`Row ${row.Name} from the solution does not correspond to any model constraint.`);
        }
    });
}