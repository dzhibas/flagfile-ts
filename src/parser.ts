import { 
  Token, 
  TokenType, 
  Position,
  ASTNode,
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
  ParseError
} from './types';

/**
 * Recursive descent parser for the feature flag language
 */
export class Parser {
  private tokens: Token[];
  private current: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens.filter(token => 
      token.type !== TokenType.COMMENT && 
      token.type !== TokenType.NEWLINE &&
      token.type !== TokenType.WHITESPACE
    );
  }

  /**
   * Parses the tokens into an AST
   */
  public parse(): Program {
    const features: FeatureFlag[] = [];
    
    while (!this.isAtEnd()) {
      if (this.check(TokenType.EOF)) {
        break;
      }
      
      const feature = this.parseFeatureFlag();
      if (feature) {
        features.push(feature);
      }
    }

    return {
      type: 'Program',
      features,
      position: this.getPosition()
    };
  }

  /**
   * Parses a feature flag definition
   */
  private parseFeatureFlag(): FeatureFlag {
    const nameToken = this.consume(TokenType.FEATURE_FLAG_NAME, 'Expected feature flag name');
    const position = this.tokenToPosition(nameToken);
    
    let body: FeatureFlagBody;
    
    if (this.match(TokenType.ARROW)) {
      // Simple feature flag: FF-name -> value
      const value = this.parseExpression();
      body = {
        type: 'SimpleFeatureFlag',
        value,
        position: this.getPosition()
      };
    } else if (this.match(TokenType.LEFT_BRACE)) {
      // Complex feature flag: FF-name { rules... defaultValue }
      const rules: Rule[] = [];
      let defaultValue: Expression | undefined;
      
      while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
        if (this.checkExpression()) {
          // This could be a rule or a default value
          const expr = this.parseExpression();
          
          if (this.match(TokenType.ARROW)) {
            // It's a rule: condition -> value
            const value = this.parseExpression();
            rules.push({
              type: 'Rule',
              condition: expr,
              value,
              position: this.getPosition()
            });
          } else {
            // It's a default value
            defaultValue = expr;
          }
        } else {
          this.error('Expected expression or rule');
        }
      }
      
      this.consume(TokenType.RIGHT_BRACE, 'Expected "}" after feature flag body');
      
      body = {
        type: 'ComplexFeatureFlag',
        rules,
        defaultValue,
        position: this.getPosition()
      };
    } else {
      this.error('Expected "->" or "{" after feature flag name');
    }

    return {
      type: 'FeatureFlag',
      name: nameToken.value,
      body,
      position
    };
  }

  /**
   * Parses expressions using operator precedence
   */
  private parseExpression(): Expression {
    return this.parseOr();
  }

  /**
   * Parses logical OR expressions
   */
  private parseOr(): Expression {
    let expr = this.parseAnd();

    while (this.match(TokenType.OR)) {
      const operator = this.previous().value as BinaryOperator;
      const right = this.parseAnd();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator,
        right,
        position: this.getPosition()
      };
    }

    return expr;
  }

  /**
   * Parses logical AND expressions
   */
  private parseAnd(): Expression {
    let expr = this.parseEquality();

    while (this.match(TokenType.AND)) {
      const operator = this.previous().value as BinaryOperator;
      const right = this.parseEquality();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator,
        right,
        position: this.getPosition()
      };
    }

    return expr;
  }

  /**
   * Parses equality expressions (==, !=)
   */
  private parseEquality(): Expression {
    let expr = this.parseComparison();

    while (this.match(TokenType.EQUALS, TokenType.NOT_EQUALS, TokenType.ASSIGN)) {
      const operator = this.previous().value as BinaryOperator;
      const right = this.parseComparison();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator,
        right,
        position: this.getPosition()
      };
    }

    return expr;
  }

  /**
   * Parses comparison expressions (>, <, >=, <=, in)
   */
  private parseComparison(): Expression {
    let expr = this.parseUnary();

    while (this.match(TokenType.GREATER_THAN, TokenType.GREATER_EQUAL, 
                     TokenType.LESS_THAN, TokenType.LESS_EQUAL, TokenType.IN)) {
      const operator = this.previous().value as BinaryOperator;
      const right = this.parseUnary();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator,
        right,
        position: this.getPosition()
      };
    }

    return expr;
  }

  /**
   * Parses unary expressions (not)
   */
  private parseUnary(): Expression {
    if (this.match(TokenType.NOT)) {
      const operator = this.previous().value as UnaryOperator;
      const operand = this.parseUnary();
      return {
        type: 'UnaryExpression',
        operator,
        operand,
        position: this.getPosition()
      };
    }

    return this.parsePrimary();
  }

  /**
   * Parses primary expressions (literals, identifiers, function calls, grouped expressions)
   */
  private parsePrimary(): Expression {
    if (this.match(TokenType.BOOLEAN_TRUE)) {
      return {
        type: 'BooleanLiteral',
        value: true,
        position: this.getPosition()
      };
    }

    if (this.match(TokenType.BOOLEAN_FALSE)) {
      return {
        type: 'BooleanLiteral',
        value: false,
        position: this.getPosition()
      };
    }

    if (this.match(TokenType.NUMBER)) {
      const value = parseFloat(this.previous().value);
      return {
        type: 'NumberLiteral',
        value,
        position: this.getPosition()
      };
    }

    if (this.match(TokenType.STRING)) {
      return {
        type: 'StringLiteral',
        value: this.previous().value,
        position: this.getPosition()
      };
    }

    if (this.match(TokenType.DATE)) {
      return {
        type: 'DateLiteral',
        value: this.previous().value,
        position: this.getPosition()
      };
    }

    if (this.match(TokenType.JSON_FUNC)) {
      return this.parseJsonExpression();
    }

    if (this.match(TokenType.NOW_FUNC)) {
      this.consume(TokenType.LEFT_PAREN, 'Expected "(" after NOW');
      this.consume(TokenType.RIGHT_PAREN, 'Expected ")" after NOW()');
      return {
        type: 'NowExpression',
        position: this.getPosition()
      };
    }

    if (this.match(TokenType.LEFT_PAREN)) {
      // Check if this is an array or grouped expression
      if (this.checkArrayLiteral()) {
        return this.parseArrayExpression();
      } else {
        const expr = this.parseExpression();
        this.consume(TokenType.RIGHT_PAREN, 'Expected ")" after expression');
        return {
          type: 'GroupedExpression',
          expression: expr,
          position: this.getPosition()
        };
      }
    }

    if (this.match(TokenType.IDENTIFIER)) {
      return {
        type: 'Identifier',
        name: this.previous().value,
        position: this.getPosition()
      };
    }

    this.error('Unexpected token');
    throw new Error('Unreachable'); // This will never be reached due to error() throwing
  }

  /**
   * Parses JSON function expressions: json({...})
   */
  private parseJsonExpression(): JsonExpression {
    this.consume(TokenType.LEFT_PAREN, 'Expected "(" after json');
    
    // Parse the JSON object manually since it's a specific structure
    const jsonString = this.parseJsonObject();
    
    this.consume(TokenType.RIGHT_PAREN, 'Expected ")" after json object');
    
    try {
      const value = JSON.parse(jsonString);
      return {
        type: 'JsonExpression',
        value,
        position: this.getPosition()
      };
    } catch (e) {
      this.error('Invalid JSON object');
      throw new Error('Unreachable'); // This will never be reached due to error() throwing
    }
  }

  /**
   * Parses a JSON object structure and returns it as a string
   */
  private parseJsonObject(): string {
    if (!this.match(TokenType.LEFT_BRACE)) {
      this.error('Expected "{" to start JSON object');
    }

    let jsonString = '{';
    let isFirst = true;

    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      if (!isFirst) {
        this.consume(TokenType.COMMA, 'Expected "," between JSON object properties');
        jsonString += ',';
      }
      isFirst = false;

      // Parse key
      const key = this.consume(TokenType.STRING, 'Expected string key in JSON object');
      jsonString += `"${key.value}"`;

      this.consume(TokenType.COLON, 'Expected ":" after JSON object key');
      jsonString += ':';

      // Parse value (string, number, boolean, or array)
      if (this.match(TokenType.STRING)) {
        jsonString += `"${this.previous().value}"`;
      } else if (this.match(TokenType.NUMBER)) {
        jsonString += this.previous().value;
      } else if (this.match(TokenType.BOOLEAN_TRUE)) {
        jsonString += 'true';
      } else if (this.match(TokenType.BOOLEAN_FALSE)) {
        jsonString += 'false';
      } else if (this.check(TokenType.LEFT_BRACKET)) {
        // This is an array - parse it as JSON array
        jsonString += this.parseJsonArray();
      } else if (this.match(TokenType.LEFT_BRACE)) {
        // Nested object - simplified for now
        this.error('Nested JSON objects not yet supported');
      } else {
        this.error('Invalid JSON value');
      }
    }

    this.consume(TokenType.RIGHT_BRACE, 'Expected "}" to close JSON object');
    jsonString += '}';

    return jsonString;
  }

  /**
   * Parses a JSON array structure and returns it as a string
   */
  private parseJsonArray(): string {
    let arrayString = '[';
    let depth = 0;
    
    // Skip the opening bracket
    this.advance();
    
    while (!this.isAtEnd()) {
      const token = this.peek();
      
      if (token.type === TokenType.LEFT_BRACKET) {
        depth++;
        arrayString += '[';
        this.advance();
      } else if (token.type === TokenType.RIGHT_BRACKET) {
        if (depth === 0) {
          this.advance(); // consume the closing bracket
          break;
        }
        depth--;
        arrayString += ']';
        this.advance();
      } else if (token.type === TokenType.COMMA) {
        arrayString += ',';
        this.advance();
      } else if (token.type === TokenType.STRING) {
        arrayString += `"${token.value}"`;
        this.advance();
      } else if (token.type === TokenType.NUMBER) {
        arrayString += token.value;
        this.advance();
      } else if (token.type === TokenType.BOOLEAN_TRUE) {
        arrayString += 'true';
        this.advance();
      } else if (token.type === TokenType.BOOLEAN_FALSE) {
        arrayString += 'false';
        this.advance();
      } else if (token.type === TokenType.IDENTIFIER) {
        // Treat identifiers as strings in JSON context
        arrayString += `"${token.value}"`;
        this.advance();
      } else {
        this.error(`Unexpected token in JSON array: ${token.type}`);
      }
    }
    
    arrayString += ']';
    return arrayString;
  }

  /**
   * Parses array expressions: (item1, item2, item3)
   */
  private parseArrayExpression(): ArrayExpression {
    const elements: Expression[] = [];

    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        elements.push(this.parseExpression());
      } while (this.match(TokenType.COMMA));
    }

    this.consume(TokenType.RIGHT_PAREN, 'Expected ")" after array elements');

    return {
      type: 'ArrayExpression',
      elements,
      position: this.getPosition()
    };
  }

  /**
   * Checks if the current position represents an array literal
   */
  private checkArrayLiteral(): boolean {
    // Look ahead to see if this looks like an array (value, value, ...)
    // Arrays should be simple comma-separated values, not complex expressions
    let lookahead = 0;
    let parenCount = 1;
    let hasComma = false;
    let hasOperators = false;
    
    while (this.current + lookahead < this.tokens.length && parenCount > 0) {
      const token = this.tokens[this.current + lookahead];
      
      if (token.type === TokenType.LEFT_PAREN) {
        parenCount++;
      } else if (token.type === TokenType.RIGHT_PAREN) {
        parenCount--;
        if (parenCount === 0) {
          break;
        }
      } else if (parenCount === 1) {
        // Only check tokens at the top level
        if (token.type === TokenType.COMMA) {
          hasComma = true;
        } else if (this.isOperatorToken(token.type)) {
          hasOperators = true;
        }
      }
      
      lookahead++;
    }
    
    // It's an array if it has commas but no operators at the top level
    return hasComma && !hasOperators;
  }

  /**
   * Checks if a token type is an operator
   */
  private isOperatorToken(type: TokenType): boolean {
    return type === TokenType.AND || 
           type === TokenType.OR || 
           type === TokenType.NOT ||
           type === TokenType.EQUALS ||
           type === TokenType.NOT_EQUALS ||
           type === TokenType.ASSIGN ||
           type === TokenType.GREATER_THAN ||
           type === TokenType.LESS_THAN ||
           type === TokenType.GREATER_EQUAL ||
           type === TokenType.LESS_EQUAL ||
           type === TokenType.IN;
  }

  /**
   * Checks if the current token can start an expression
   */
  private checkExpression(): boolean {
    return this.check(TokenType.BOOLEAN_TRUE, TokenType.BOOLEAN_FALSE, 
                     TokenType.NUMBER, TokenType.STRING, TokenType.DATE,
                     TokenType.JSON_FUNC, TokenType.NOW_FUNC,
                     TokenType.LEFT_PAREN, TokenType.IDENTIFIER, TokenType.NOT);
  }

  /**
   * Utility methods for token consumption and checking
   */
  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(...types: TokenType[]): boolean {
    if (this.isAtEnd()) return false;
    return types.includes(this.peek().type);
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.current >= this.tokens.length || this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    
    this.error(message);
    throw new Error('Unreachable'); // This will never be reached due to error() throwing
  }

  private error(message: string): never {
    const token = this.peek();
    if (!token) {
      throw new ParseError(message, { line: 1, column: 1, index: 0 });
    }
    const position = this.tokenToPosition(token);
    throw new ParseError(message, position);
  }

  private tokenToPosition(token: Token): Position {
    return {
      line: token.line,
      column: token.column,
      index: token.start
    };
  }

  private getPosition(): Position {
    const token = this.current > 0 ? this.previous() : this.peek();
    if (!token) {
      return { line: 1, column: 1, index: 0 };
    }
    return this.tokenToPosition(token);
  }
}
