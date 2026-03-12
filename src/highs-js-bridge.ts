import { Model } from './model.js';

export function readHighsSolution(model: Model, solution: any): void {
    model.status = solution.Status;

    if (solution.Status !== 'Optimal' && solution.Status !== 'Feasible') {
        return;
    }

    Object.entries(solution.Columns).forEach(([name, column]: [string, any]) => {
        if (model.variables.has(name)) {
            const variable = model.variables.get(name)!;
            variable.value = column.Primal;
        } else {
            console.warn(`Variable ${name} from the solution was not found in the model.`);
        }
    });

    solution.Rows.forEach((row: any, index: number) => {
        if (index < model.constraints.length) {
            const constraint = model.constraints[index];
            constraint.primal = row.Primal;
            constraint.dual = row.Dual;
        } else {
            console.warn(`Row ${row.Name} from the solution does not correspond to any model constraint.`);
        }
    });

    if (solution.ObjectiveValue) {
        model.ObjVal = solution.ObjectiveValue;
    }
}
