import {
  Program,
  FeatureFlag,
  FeatureFlagBody,
  SimpleFeatureFlag,
  ComplexFeatureFlag,
  Rule,
  Expression,
  BooleanLiteral,
  NumberLiteral,
  StringLiteral,
  DateLiteral,
  Identifier,
  JsonExpression,
  NowExpression,
  BinaryExpression,
  UnaryExpression,
  ArrayExpression,
  GroupedExpression,
  BinaryOperator,
  UnaryOperator,
  LiteralValue
} from './types';

/**
 * Evaluation context for feature flag interpretation
 */
export interface EvaluationContext {
  [key: string]: LiteralValue;
}

/**
 * Result of feature flag evaluation
 */
export interface EvaluationResult {
  name: string;
  value: LiteralValue;
  matched?: boolean; // true if a rule was matched, false if default was used
}

/**
 * Error thrown during interpretation
 */
export class InterpreterError extends Error {
  constructor(message: string, public expression?: Expression) {
    super(message);
    this.name = 'InterpreterError';
  }
}

/**
 * Interpreter for the feature flag AST
 */
export class Interpreter {
  private context: EvaluationContext;

  constructor(context: EvaluationContext = {}) {
    this.context = context;
  }

  /**
   * Updates the evaluation context
   */
  public setContext(context: EvaluationContext): void {
    this.context = context;
  }

  /**
   * Gets the current evaluation context
   */
  public getContext(): EvaluationContext {
    return { ...this.context };
  }

  /**
   * Interprets a program and returns evaluation results for all features
   */
  public interpretProgram(program: Program): EvaluationResult[] {
    return program.features.map(feature => this.interpretFeatureFlag(feature));
  }

  /**
   * Interprets a single feature flag
   */
  public interpretFeatureFlag(feature: FeatureFlag): EvaluationResult {
    const result: EvaluationResult = {
      name: feature.name,
      value: false,
      matched: false
    };

    try {
      if (feature.body.type === 'SimpleFeatureFlag') {
        result.value = this.evaluateExpression(feature.body.value);
        result.matched = true;
      } else {
        const complexResult = this.interpretComplexFeatureFlag(feature.body);
        result.value = complexResult.value;
        result.matched = complexResult.matched;
      }
    } catch (error) {
      if (error instanceof InterpreterError) {
        throw error;
      }
      throw new InterpreterError(`Error interpreting feature flag '${feature.name}': ${error instanceof Error ? error.message : String(error)}`, undefined);
    }

    return result;
  }

  /**
   * Interprets a complex feature flag with rules
   */
  private interpretComplexFeatureFlag(complex: ComplexFeatureFlag): { value: LiteralValue; matched: boolean } {
    // Evaluate rules in order
    for (const rule of complex.rules) {
      try {
        const conditionResult = this.evaluateExpression(rule.condition);
        if (this.isTruthy(conditionResult)) {
          return {
            value: this.evaluateExpression(rule.value),
            matched: true
          };
        }
      } catch (error) {
        // Continue to next rule if condition evaluation fails
        continue;
      }
    }

    // If no rule matched, use default value
    if (complex.defaultValue) {
      return {
        value: this.evaluateExpression(complex.defaultValue),
        matched: false
      };
    }

    return { value: false, matched: false };
  }

  /**
   * Evaluates an expression and returns its value
   */
  public evaluateExpression(expression: Expression): LiteralValue {
    switch (expression.type) {
      case 'BooleanLiteral':
        return expression.value;
      
      case 'NumberLiteral':
        return expression.value;
      
      case 'StringLiteral':
        return expression.value;
      
      case 'DateLiteral':
        return new Date(expression.value);
      
      case 'Identifier':
        return this.resolveIdentifier(expression);
      
      case 'JsonExpression':
        return expression.value;
      
      case 'NowExpression':
        return new Date();
      
      case 'BinaryExpression':
        return this.evaluateBinaryExpression(expression);
      
      case 'UnaryExpression':
        return this.evaluateUnaryExpression(expression);
      
      case 'ArrayExpression':
        return expression.elements.map(element => this.evaluateExpression(element));
      
      case 'GroupedExpression':
        return this.evaluateExpression(expression.expression);
      
      default:
        throw new InterpreterError(`Unknown expression type: ${(expression as any).type}`, expression);
    }
  }

  /**
   * Resolves an identifier from the context
   */
  private resolveIdentifier(identifier: Identifier): LiteralValue {
    if (!(identifier.name in this.context)) {
      throw new InterpreterError(`Undefined identifier: ${identifier.name}`, identifier);
    }
    return this.context[identifier.name];
  }

  /**
   * Evaluates a binary expression
   */
  private evaluateBinaryExpression(expression: BinaryExpression): LiteralValue {
    const left = this.evaluateExpression(expression.left);
    const right = this.evaluateExpression(expression.right);

    switch (expression.operator) {
      case '==':
      case '=':
        return this.areEqual(left, right);
      
      case '!=':
        return !this.areEqual(left, right);
      
      case '>':
        return this.compare(left, right) > 0;
      
      case '<':
        return this.compare(left, right) < 0;
      
      case '>=':
        return this.compare(left, right) >= 0;
      
      case '<=':
        return this.compare(left, right) <= 0;
      
      case 'and':
        return this.isTruthy(left) && this.isTruthy(right);
      
      case 'or':
        return this.isTruthy(left) || this.isTruthy(right);
      
      case 'in':
        return this.isIn(left, right);
      
      default:
        throw new InterpreterError(`Unknown binary operator: ${expression.operator}`, expression);
    }
  }

  /**
   * Evaluates a unary expression
   */
  private evaluateUnaryExpression(expression: UnaryExpression): LiteralValue {
    const operand = this.evaluateExpression(expression.operand);

    switch (expression.operator) {
      case 'not':
        return !this.isTruthy(operand);
      
      default:
        throw new InterpreterError(`Unknown unary operator: ${expression.operator}`, expression);
    }
  }

  /**
   * Checks if two values are equal
   */
  private areEqual(left: LiteralValue, right: LiteralValue): boolean {
    // Handle date comparisons
    if (left instanceof Date && right instanceof Date) {
      return left.getTime() === right.getTime();
    }
    
    // Handle date vs string comparisons
    if (left instanceof Date && typeof right === 'string') {
      return left.toISOString().split('T')[0] === right;
    }
    
    if (typeof left === 'string' && right instanceof Date) {
      return left === right.toISOString().split('T')[0];
    }

    // Handle arrays
    if (Array.isArray(left) && Array.isArray(right)) {
      if (left.length !== right.length) return false;
      return left.every((item, index) => this.areEqual(item, right[index]));
    }

    // Handle objects
    if (typeof left === 'object' && typeof right === 'object' && 
        left !== null && right !== null && 
        !(left instanceof Date) && !(right instanceof Date)) {
      const leftKeys = Object.keys(left);
      const rightKeys = Object.keys(right);
      
      if (leftKeys.length !== rightKeys.length) return false;
      
      return leftKeys.every(key => 
        rightKeys.includes(key) && 
        this.areEqual((left as any)[key], (right as any)[key])
      );
    }

    // Standard equality
    return left === right;
  }

  /**
   * Compares two values for ordering
   */
  private compare(left: LiteralValue, right: LiteralValue): number {
    // Handle date comparisons
    if (left instanceof Date && right instanceof Date) {
      return left.getTime() - right.getTime();
    }
    
    // Handle date vs string comparisons
    if (left instanceof Date && typeof right === 'string') {
      const rightDate = new Date(right);
      return left.getTime() - rightDate.getTime();
    }
    
    if (typeof left === 'string' && right instanceof Date) {
      const leftDate = new Date(left);
      return leftDate.getTime() - right.getTime();
    }

    // Handle numbers
    if (typeof left === 'number' && typeof right === 'number') {
      return left - right;
    }

    // Handle strings
    if (typeof left === 'string' && typeof right === 'string') {
      return left.localeCompare(right);
    }

    throw new InterpreterError(`Cannot compare values of types ${typeof left} and ${typeof right}`);
  }

  /**
   * Checks if a value is contained in another value (arrays or strings)
   */
  private isIn(left: LiteralValue, right: LiteralValue): boolean {
    // Check if left is in array right
    if (Array.isArray(right)) {
      return right.some(item => this.areEqual(left, item));
    }

    // Check if left string is in right string
    if (typeof left === 'string' && typeof right === 'string') {
      return right.includes(left);
    }

    throw new InterpreterError(`'in' operator requires array or string on right side, got ${typeof right}`);
  }

  /**
   * Checks if a value is truthy
   */
  private isTruthy(value: LiteralValue): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    
    if (typeof value === 'number') {
      return value !== 0;
    }
    
    if (typeof value === 'string') {
      return value.length > 0;
    }
    
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    
    if (value instanceof Date) {
      return !isNaN(value.getTime());
    }
    
    if (typeof value === 'object' && value !== null) {
      return Object.keys(value).length > 0;
    }
    
    return value != null;
  }
}
