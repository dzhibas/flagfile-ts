/**
 * Token types for the feature flag language
 */
export enum TokenType {
  // Literals
  FEATURE_FLAG_NAME = 'FEATURE_FLAG_NAME',
  IDENTIFIER = 'IDENTIFIER',
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  BOOLEAN_TRUE = 'BOOLEAN_TRUE',
  BOOLEAN_FALSE = 'BOOLEAN_FALSE',
  
  // Operators
  ARROW = 'ARROW',           // ->
  EQUALS = 'EQUALS',         // ==
  NOT_EQUALS = 'NOT_EQUALS', // !=
  ASSIGN = 'ASSIGN',         // =
  GREATER_THAN = 'GREATER_THAN',     // >
  LESS_THAN = 'LESS_THAN',           // <
  GREATER_EQUAL = 'GREATER_EQUAL',   // >=
  LESS_EQUAL = 'LESS_EQUAL',         // <=
  
  // Logical operators
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',
  IN = 'IN',
  
  // Delimiters
  LEFT_BRACE = 'LEFT_BRACE',     // {
  RIGHT_BRACE = 'RIGHT_BRACE',   // }
  LEFT_PAREN = 'LEFT_PAREN',     // (
  RIGHT_PAREN = 'RIGHT_PAREN',   // )
  LEFT_BRACKET = 'LEFT_BRACKET', // [
  RIGHT_BRACKET = 'RIGHT_BRACKET', // ]
  COMMA = 'COMMA',               // ,
  COLON = 'COLON',               // :
  
  // Special functions
  JSON_FUNC = 'JSON_FUNC',       // json
  NOW_FUNC = 'NOW_FUNC',         // NOW
  
  // Comments
  COMMENT = 'COMMENT',
  
  // Control
  NEWLINE = 'NEWLINE',
  EOF = 'EOF',
  WHITESPACE = 'WHITESPACE',
}

/**
 * Represents a token with its type, value, and position
 */
export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
  start: number;
  end: number;
}

/**
 * Position information for error reporting
 */
export interface Position {
  line: number;
  column: number;
  index: number;
}

/**
 * Base AST Node interface
 */
export interface ASTNode {
  type: string;
  position: Position;
}

/**
 * Literal value types
 */
export type LiteralValue = boolean | number | string | object | Date;

/**
 * AST Node types for the feature flag language
 */

export interface Program extends ASTNode {
  type: 'Program';
  features: FeatureFlag[];
}

export interface FeatureFlag extends ASTNode {
  type: 'FeatureFlag';
  name: string;
  body: FeatureFlagBody;
}

export type FeatureFlagBody = SimpleFeatureFlag | ComplexFeatureFlag;

export interface SimpleFeatureFlag extends ASTNode {
  type: 'SimpleFeatureFlag';
  value: Expression;
}

export interface ComplexFeatureFlag extends ASTNode {
  type: 'ComplexFeatureFlag';
  rules: Rule[];
  defaultValue?: Expression;
}

export interface Rule extends ASTNode {
  type: 'Rule';
  condition: Expression;
  value: Expression;
}

export type Expression = 
  | BooleanLiteral
  | NumberLiteral
  | StringLiteral
  | DateLiteral
  | Identifier
  | JsonExpression
  | NowExpression
  | BinaryExpression
  | UnaryExpression
  | ArrayExpression
  | GroupedExpression;

export interface BooleanLiteral extends ASTNode {
  type: 'BooleanLiteral';
  value: boolean;
}

export interface NumberLiteral extends ASTNode {
  type: 'NumberLiteral';
  value: number;
}

export interface StringLiteral extends ASTNode {
  type: 'StringLiteral';
  value: string;
}

export interface DateLiteral extends ASTNode {
  type: 'DateLiteral';
  value: string; // ISO date string
}

export interface Identifier extends ASTNode {
  type: 'Identifier';
  name: string;
}

export interface JsonExpression extends ASTNode {
  type: 'JsonExpression';
  value: object;
}

export interface NowExpression extends ASTNode {
  type: 'NowExpression';
}

export interface BinaryExpression extends ASTNode {
  type: 'BinaryExpression';
  left: Expression;
  operator: BinaryOperator;
  right: Expression;
}

export interface UnaryExpression extends ASTNode {
  type: 'UnaryExpression';
  operator: UnaryOperator;
  operand: Expression;
}

export interface ArrayExpression extends ASTNode {
  type: 'ArrayExpression';
  elements: Expression[];
}

export interface GroupedExpression extends ASTNode {
  type: 'GroupedExpression';
  expression: Expression;
}

export type BinaryOperator = 
  | '==' | '!=' | '=' 
  | '>' | '<' | '>=' | '<=' 
  | 'and' | 'or' | 'in';

export type UnaryOperator = 'not';

/**
 * Parser error class
 */
export class ParseError extends Error {
  constructor(message: string, public position: Position) {
    super(message);
    this.name = 'ParseError';
  }
}
