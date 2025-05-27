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
