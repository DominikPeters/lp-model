LPFile
  = _ header:Objective _ constraints:Constraints _ bounds:Bounds? _ general:General? _ binary:Binary? _ "End"i _ {
    return {
      objective: header,
      constraints: constraints ? constraints : [],
      bounds: bounds ? bounds : [],
      general: general ? general : [],
      binary: binary ? binary : []
    };
  }

Objective
  = objectiveType:("Maximize"i / "Minimize"i / "MAX"i / "MIN"i) _ name:(VariableName ":")? _ expr:Expression {
    return {
      type: objectiveType.toLowerCase().startsWith('max') ? 'max' : 'min',
      name: name ? name[0] : null,
      expression: expr
    };
  }

Constraints
  = ("Subject To"i / "ST"i / "S.T."i) _ constraints:Constraint+ {
    return constraints;
  }

Constraint
  = name:(VariableName ":")? _ expr:Expression _ sense:ConstraintSense _ value:Number _ {
    return {
      name: name ? name[0] : null,
      expression: expr,
      sense: sense,
      value: value
    };
  }

ConstraintSense
  = "<=" / ">=" / "=" / "=<" / "=>" / "<" { return text() === '<' ? '<=' : text() === '>' ? '>=' : text(); }

Bounds
  = "Bounds"i _ bounds:Bound+ {
    return bounds;
  }

Bound
  = variable:VariableName _ "free"i _ { // Handle 'free' variables
      return { variable: variable, range: "free" };
    }
  / lower:InfinityNumber _ "<=" _ variable:VariableName _ "<=" _ upper:InfinityNumber _ { // Full range bounds with support for infinity
      return { variable: variable, lower: lower, upper: upper };
    }
  / variable:VariableName _ "<=" _ upper:InfinityNumber _ { // Upper bound only with support for infinity
      return { variable: variable, upper: upper };
    }
  / lower:InfinityNumber _ "<=" _ variable:VariableName _ { // Lower bound only with support for infinity
      return { variable: variable, lower: lower };
    }

InfinityNumber "infinity number"
  = infinity:("-infinity"i / "+infinity"i / "-inf"i / "+inf"i) { 
    return infinity.startsWith('-') ? "-infinity" : "+infinity";
    }
  / SignedNumber

General
  = "General"i _ vars:VariableName+ {
    return vars;
  }

Binary
  = "Binary"i _ vars:VariableName+ {
    return vars;
  }

Expression
  = first:(TermWithSign / Term) rest:(_ ("+" / "-") _ (TermWithSign / Term))* {
      let terms = [first];
      for (let r of rest) {
        let sign = r[1];
        let term = r[3];
        if (sign === '-') {
          term.coefficient = -term.coefficient;
        }
        terms.push(term);
      }
      return terms;
    }


TermWithSign
  = sign:[+-] _ term:Term {
      term.coefficient = (sign === '+' ? 1 : -1) * Math.abs(term.coefficient);
      return term;
    }

Term
  = coefficient:Number _ variable:VariableName {
      return { coefficient: coefficient, variable: variable };
    }
  / variable:VariableName {
      return { coefficient: 1, variable: variable };
    }
  / number:Number {
      return { coefficient: number, variable: null };
    }


VariableName "variable name"
  = [a-zA-Z!\"#$%&'()*+,./;?@_`'{|}~][a-zA-Z0-9!\"#$%&'()*+,./;?@_`'{|}~]* {
    return text();
  }
  
SignedNumber "signed number"
  = [+-]? Number {
    return parseFloat(text());
  }

Number "number"
  = integer:[0-9]+ fractional:("." [0-9]+)? {
    return parseFloat(integer.join("") + (fractional ? fractional[0] + fractional[1].join("") : ""));
  }

_ "whitespace or comment"
  = [ \t\n\r]* ("\\" [^\n]* "\n" [ \t\n\r]*)*
