import { Token, TokenType, Position } from './types';

/**
 * Scanner/Tokenizer for the feature flag language
 */
export class Scanner {
  private input: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;
  private tokens: Token[] = [];

  constructor(input: string) {
    this.input = input;
  }

  /**
   * Scans the input and returns all tokens
   */
  public scanTokens(): Token[] {
    this.tokens = [];
    this.position = 0;
    this.line = 1;
    this.column = 1;

    while (!this.isAtEnd()) {
      this.scanToken();
    }

    this.addToken(TokenType.EOF, '');
    return this.tokens;
  }

  /**
   * Scans a single token
   */
  private scanToken(): void {
    const start = this.position;
    const startLine = this.line;
    const startColumn = this.column;
    const char = this.advance();

    switch (char) {
      case ' ':
      case '\r':
      case '\t':
        // Skip whitespace
        break;
      case '\n':
        this.addToken(TokenType.NEWLINE, char, startLine, startColumn, start);
        this.line++;
        this.column = 1;
        break;
      case '{':
        this.addToken(TokenType.LEFT_BRACE, char, startLine, startColumn, start);
        break;
      case '}':
        this.addToken(TokenType.RIGHT_BRACE, char, startLine, startColumn, start);
        break;
      case '(':
        this.addToken(TokenType.LEFT_PAREN, char, startLine, startColumn, start);
        break;
      case ')':
        this.addToken(TokenType.RIGHT_PAREN, char, startLine, startColumn, start);
        break;
      case '[':
        this.addToken(TokenType.LEFT_BRACKET, char, startLine, startColumn, start);
        break;
      case ']':
        this.addToken(TokenType.RIGHT_BRACKET, char, startLine, startColumn, start);
        break;
      case ',':
        this.addToken(TokenType.COMMA, char, startLine, startColumn, start);
        break;
      case ':':
        this.addToken(TokenType.COLON, char, startLine, startColumn, start);
        break;
      case '-':
        if (this.match('>')) {
          this.addToken(TokenType.ARROW, '->', startLine, startColumn, start);
        } else {
          // Part of identifier or feature flag name
          this.position--;
          this.column--;
          this.scanIdentifierOrFeatureFlag(startLine, startColumn, start);
        }
        break;
      case '=':
        if (this.match('=')) {
          this.addToken(TokenType.EQUALS, '==', startLine, startColumn, start);
        } else {
          this.addToken(TokenType.ASSIGN, '=', startLine, startColumn, start);
        }
        break;
      case '!':
        if (this.match('=')) {
          this.addToken(TokenType.NOT_EQUALS, '!=', startLine, startColumn, start);
        } else {
          throw new Error(`Unexpected character '!' at line ${this.line}, column ${this.column}`);
        }
        break;
      case '>':
        if (this.match('=')) {
          this.addToken(TokenType.GREATER_EQUAL, '>=', startLine, startColumn, start);
        } else {
          this.addToken(TokenType.GREATER_THAN, '>', startLine, startColumn, start);
        }
        break;
      case '<':
        if (this.match('=')) {
          this.addToken(TokenType.LESS_EQUAL, '<=', startLine, startColumn, start);
        } else {
          this.addToken(TokenType.LESS_THAN, '<', startLine, startColumn, start);
        }
        break;
      case '/':
        if (this.match('/')) {
          this.scanLineComment(startLine, startColumn, start);
        } else if (this.match('*')) {
          this.scanBlockComment(startLine, startColumn, start);
        } else {
          throw new Error(`Unexpected character '/' at line ${this.line}, column ${this.column}`);
        }
        break;
      case '"':
        this.scanString(startLine, startColumn, start);
        break;
      default:
        if (this.isDigit(char)) {
          this.position--;
          this.column--;
          this.scanNumber(startLine, startColumn, start);
        } else if (this.isAlpha(char)) {
          this.position--;
          this.column--;
          this.scanIdentifierOrFeatureFlag(startLine, startColumn, start);
        } else {
          throw new Error(`Unexpected character '${char}' at line ${this.line}, column ${this.column}`);
        }
        break;
    }
  }

  /**
   * Scans a string literal
   */
  private scanString(startLine: number, startColumn: number, start: number): void {
    let value = '';
    
    while (!this.isAtEnd() && this.peek() !== '"') {
      if (this.peek() === '\n') {
        this.line++;
        this.column = 1;
      }
      if (this.peek() === '\\') {
        this.advance(); // consume backslash
        const escaped = this.advance();
        switch (escaped) {
          case 'n': value += '\n'; break;
          case 't': value += '\t'; break;
          case 'r': value += '\r'; break;
          case '\\': value += '\\'; break;
          case '"': value += '"'; break;
          default: value += escaped; break;
        }
      } else {
        value += this.advance();
      }
    }

    if (this.isAtEnd()) {
      throw new Error(`Unterminated string at line ${startLine}, column ${startColumn}`);
    }

    // Consume closing "
    this.advance();
    
    this.addToken(TokenType.STRING, value, startLine, startColumn, start);
  }

  /**
   * Scans a number literal
   */
  private scanNumber(startLine: number, startColumn: number, start: number): void {
    let value = '';
    
    while (this.isDigit(this.peek())) {
      value += this.advance();
    }

    // Look for decimal part
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      value += this.advance(); // consume '.'
      while (this.isDigit(this.peek())) {
        value += this.advance();
      }
    }

    // Check if this might be a date (YYYY-MM-DD)
    if (this.peek() === '-' && value.length === 4) {
      const savedPos = this.position;
      const savedLine = this.line;
      const savedColumn = this.column;
      
      // Try to parse as date
      let dateValue = value;
      dateValue += this.advance(); // consume '-'
      
      if (this.isDigit(this.peek()) && this.isDigit(this.peekNext())) {
        dateValue += this.advance() + this.advance();
        
        if (this.peek() === '-' && this.isDigit(this.peekAt(1)) && this.isDigit(this.peekAt(2))) {
          dateValue += this.advance() + this.advance() + this.advance();
          this.addToken(TokenType.DATE, dateValue, startLine, startColumn, start);
          return;
        }
      }
      
      // Not a date, restore position
      this.position = savedPos;
      this.line = savedLine;
      this.column = savedColumn;
    }

    this.addToken(TokenType.NUMBER, value, startLine, startColumn, start);
  }

  /**
   * Scans identifiers, keywords, feature flag names, and boolean literals
   */
  private scanIdentifierOrFeatureFlag(startLine: number, startColumn: number, start: number): void {
    let value = '';
    
    // Handle feature flag names (start with FF-)
    if (this.peek() === 'F' && this.peekNext() === 'F' && (this.peekAt(2) === '-' || this.peekAt(2) === '_')) {
      value += this.advance() + this.advance() + this.advance(); // consume "FF-" or "FF_"
      
      // Continue until whitespace, arrow, or brace
      while (!this.isAtEnd() && this.isFeatureFlagChar(this.peek())) {
        value += this.advance();
      }
      
      this.addToken(TokenType.FEATURE_FLAG_NAME, value, startLine, startColumn, start);
      return;
    }

    // Regular identifier or keyword
    while (!this.isAtEnd() && this.isAlphaNumeric(this.peek())) {
      value += this.advance();
    }

    // Check for special function calls
    if (value === 'json' && this.peek() === '(') {
      this.addToken(TokenType.JSON_FUNC, value, startLine, startColumn, start);
      return;
    }

    if (value === 'NOW' && this.peek() === '(') {
      this.addToken(TokenType.NOW_FUNC, value, startLine, startColumn, start);
      return;
    }

    // Check for keywords and boolean literals
    const tokenType = this.getKeywordType(value);
    this.addToken(tokenType, value, startLine, startColumn, start);
  }

  /**
   * Scans a line comment (// ...)
   */
  private scanLineComment(startLine: number, startColumn: number, start: number): void {
    let value = '//';
    
    while (!this.isAtEnd() && this.peek() !== '\n') {
      value += this.advance();
    }
    
    this.addToken(TokenType.COMMENT, value, startLine, startColumn, start);
  }

  /**
   * Scans a block comment (slash-star ... star-slash)
   */
  private scanBlockComment(startLine: number, startColumn: number, start: number): void {
    let value = '/*';
    
    while (!this.isAtEnd()) {
      if (this.peek() === '*' && this.peekNext() === '/') {
        value += this.advance() + this.advance(); // consume "*/"
        break;
      }
      
      if (this.peek() === '\n') {
        this.line++;
        this.column = 1;
      }
      
      value += this.advance();
    }
    
    if (!value.endsWith('*/')) {
      throw new Error(`Unterminated block comment at line ${startLine}, column ${startColumn}`);
    }
    
    this.addToken(TokenType.COMMENT, value, startLine, startColumn, start);
  }

  /**
   * Returns the token type for keywords and boolean literals
   */
  private getKeywordType(value: string): TokenType {
    switch (value.toLowerCase()) {
      case 'true': return TokenType.BOOLEAN_TRUE;
      case 'false': return TokenType.BOOLEAN_FALSE;
      case 'and': return TokenType.AND;
      case 'or': return TokenType.OR;
      case 'not': return TokenType.NOT;
      case 'in': return TokenType.IN;
      default: return TokenType.IDENTIFIER;
    }
  }

  /**
   * Helper methods for character checking
   */
  private isAtEnd(): boolean {
    return this.position >= this.input.length;
  }

  private advance(): string {
    const char = this.input.charAt(this.position++);
    if (char !== '\n') {
      this.column++;
    }
    return char;
  }

  private match(expected: string): boolean {
    if (this.isAtEnd() || this.input.charAt(this.position) !== expected) {
      return false;
    }
    this.position++;
    this.column++;
    return true;
  }

  private peek(): string {
    return this.isAtEnd() ? '\0' : this.input.charAt(this.position);
  }

  private peekNext(): string {
    return this.position + 1 >= this.input.length ? '\0' : this.input.charAt(this.position + 1);
  }

  private peekAt(offset: number): string {
    const pos = this.position + offset;
    return pos >= this.input.length ? '\0' : this.input.charAt(pos);
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isAlpha(char: string): boolean {
    return (char >= 'a' && char <= 'z') ||
           (char >= 'A' && char <= 'Z') ||
           char === '_';
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char);
  }

  private isFeatureFlagChar(char: string): boolean {
    return this.isAlphaNumeric(char) || char === '-' || char === '_';
  }

  /**
   * Adds a token to the tokens array
   */
  private addToken(type: TokenType, value: string, line?: number, column?: number, start?: number): void {
    const token: Token = {
      type,
      value,
      line: line ?? this.line,
      column: column ?? this.column,
      start: start ?? this.position - value.length,
      end: this.position
    };
    this.tokens.push(token);
  }
}
