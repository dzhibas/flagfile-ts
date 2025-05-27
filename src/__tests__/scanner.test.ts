import { Scanner } from '../scanner';
import { TokenType } from '../types';

describe('Scanner', () => {
  let scanner: Scanner;

  beforeEach(() => {
    scanner = new Scanner('');
  });

  describe('Basic tokens', () => {
    it('should scan feature flag names', () => {
      const input = 'FF-feature-flat-on-off FF_feature_can_be_snake_case FF_featureOneOrTwo FF_Feature23432';
      scanner = new Scanner(input);
      const tokens = scanner.scanTokens();

      expect(tokens[0]).toMatchObject({
        type: TokenType.FEATURE_FLAG_NAME,
        value: 'FF-feature-flat-on-off'
      });
      expect(tokens[1]).toMatchObject({
        type: TokenType.FEATURE_FLAG_NAME,
        value: 'FF_feature_can_be_snake_case'
      });
      expect(tokens[2]).toMatchObject({
        type: TokenType.FEATURE_FLAG_NAME,
        value: 'FF_featureOneOrTwo'
      });
      expect(tokens[3]).toMatchObject({
        type: TokenType.FEATURE_FLAG_NAME,
        value: 'FF_Feature23432'
      });
    });

    it('should scan boolean literals', () => {
      const input = 'true false TRUE FALSE';
      scanner = new Scanner(input);
      const tokens = scanner.scanTokens();

      expect(tokens[0]).toMatchObject({
        type: TokenType.BOOLEAN_TRUE,
        value: 'true'
      });
      expect(tokens[1]).toMatchObject({
        type: TokenType.BOOLEAN_FALSE,
        value: 'false'
      });
      expect(tokens[2]).toMatchObject({
        type: TokenType.BOOLEAN_TRUE,
        value: 'TRUE'
      });
      expect(tokens[3]).toMatchObject({
        type: TokenType.BOOLEAN_FALSE,
        value: 'FALSE'
      });
    });

    it('should scan operators', () => {
      const input = '-> == != = > < >= <=';
      scanner = new Scanner(input);
      const tokens = scanner.scanTokens();

      expect(tokens[0]).toMatchObject({ type: TokenType.ARROW, value: '->' });
      expect(tokens[1]).toMatchObject({ type: TokenType.EQUALS, value: '==' });
      expect(tokens[2]).toMatchObject({ type: TokenType.NOT_EQUALS, value: '!=' });
      expect(tokens[3]).toMatchObject({ type: TokenType.ASSIGN, value: '=' });
      expect(tokens[4]).toMatchObject({ type: TokenType.GREATER_THAN, value: '>' });
      expect(tokens[5]).toMatchObject({ type: TokenType.LESS_THAN, value: '<' });
      expect(tokens[6]).toMatchObject({ type: TokenType.GREATER_EQUAL, value: '>=' });
      expect(tokens[7]).toMatchObject({ type: TokenType.LESS_EQUAL, value: '<=' });
    });

    it('should scan logical operators', () => {
      const input = 'and or not in';
      scanner = new Scanner(input);
      const tokens = scanner.scanTokens();

      expect(tokens[0]).toMatchObject({ type: TokenType.AND, value: 'and' });
      expect(tokens[1]).toMatchObject({ type: TokenType.OR, value: 'or' });
      expect(tokens[2]).toMatchObject({ type: TokenType.NOT, value: 'not' });
      expect(tokens[3]).toMatchObject({ type: TokenType.IN, value: 'in' });
    });

    it('should scan delimiters', () => {
      const input = '{ } ( ) ,';
      scanner = new Scanner(input);
      const tokens = scanner.scanTokens();

      expect(tokens[0]).toMatchObject({ type: TokenType.LEFT_BRACE, value: '{' });
      expect(tokens[1]).toMatchObject({ type: TokenType.RIGHT_BRACE, value: '}' });
      expect(tokens[2]).toMatchObject({ type: TokenType.LEFT_PAREN, value: '(' });
      expect(tokens[3]).toMatchObject({ type: TokenType.RIGHT_PAREN, value: ')' });
      expect(tokens[4]).toMatchObject({ type: TokenType.COMMA, value: ',' });
    });

    it('should scan special functions', () => {
      const input = 'json( NOW(';
      scanner = new Scanner(input);
      const tokens = scanner.scanTokens();

      expect(tokens[0]).toMatchObject({ type: TokenType.JSON_FUNC, value: 'json' });
      expect(tokens[1]).toMatchObject({ type: TokenType.LEFT_PAREN, value: '(' });
      expect(tokens[2]).toMatchObject({ type: TokenType.NOW_FUNC, value: 'NOW' });
      expect(tokens[3]).toMatchObject({ type: TokenType.LEFT_PAREN, value: '(' });
    });
  });

  describe('String literals', () => {
    it('should scan simple strings', () => {
      const input = '"hello world"';
      scanner = new Scanner(input);
      const tokens = scanner.scanTokens();

      expect(tokens[0]).toMatchObject({
        type: TokenType.STRING,
        value: 'hello world'
      });
    });

    it('should scan strings with escape sequences', () => {
      const input = '"demo car" "line1\\nline2" "quote: \\"hello\\""';
      scanner = new Scanner(input);
      const tokens = scanner.scanTokens();

      expect(tokens[0]).toMatchObject({
        type: TokenType.STRING,
        value: 'demo car'
      });
      expect(tokens[1]).toMatchObject({
        type: TokenType.STRING,
        value: 'line1\nline2'
      });
      expect(tokens[2]).toMatchObject({
        type: TokenType.STRING,
        value: 'quote: "hello"'
      });
    });

    it('should throw error for unterminated string', () => {
      const input = '"unterminated string';
      scanner = new Scanner(input);
      
      expect(() => scanner.scanTokens()).toThrow('Unterminated string');
    });
  });

  describe('Numbers and dates', () => {
    it('should scan integers', () => {
      const input = '123 456';
      scanner = new Scanner(input);
      const tokens = scanner.scanTokens();

      expect(tokens[0]).toMatchObject({ type: TokenType.NUMBER, value: '123' });
      expect(tokens[1]).toMatchObject({ type: TokenType.NUMBER, value: '456' });
    });

    it('should scan floating point numbers', () => {
      const input = '123.45 0.5';
      scanner = new Scanner(input);
      const tokens = scanner.scanTokens();

      expect(tokens[0]).toMatchObject({ type: TokenType.NUMBER, value: '123.45' });
      expect(tokens[1]).toMatchObject({ type: TokenType.NUMBER, value: '0.5' });
    });

    it('should scan dates', () => {
      const input = '2024-01-01 2024-02-22';
      scanner = new Scanner(input);
      const tokens = scanner.scanTokens();

      expect(tokens[0]).toMatchObject({ type: TokenType.DATE, value: '2024-01-01' });
      expect(tokens[1]).toMatchObject({ type: TokenType.DATE, value: '2024-02-22' });
    });
  });

  describe('Comments', () => {
    it('should scan line comments', () => {
      const input = '// this is a comment\n// another comment';
      scanner = new Scanner(input);
      const tokens = scanner.scanTokens();

      expect(tokens[0]).toMatchObject({
        type: TokenType.COMMENT,
        value: '// this is a comment'
      });
      expect(tokens[1]).toMatchObject({ type: TokenType.NEWLINE });
      expect(tokens[2]).toMatchObject({
        type: TokenType.COMMENT,
        value: '// another comment'
      });
    });

    it('should scan block comments', () => {
      const input = '/* single line block */ /* multi\nline\nblock */';
      scanner = new Scanner(input);
      const tokens = scanner.scanTokens();

      expect(tokens[0]).toMatchObject({
        type: TokenType.COMMENT,
        value: '/* single line block */'
      });
      expect(tokens[1]).toMatchObject({
        type: TokenType.COMMENT,
        value: '/* multi\nline\nblock */'
      });
    });

    it('should throw error for unterminated block comment', () => {
      const input = '/* unterminated comment';
      scanner = new Scanner(input);
      
      expect(() => scanner.scanTokens()).toThrow('Unterminated block comment');
    });
  });

  describe('Identifiers', () => {
    it('should scan variable names', () => {
      const input = 'countryCode model created demo a b c d';
      scanner = new Scanner(input);
      const tokens = scanner.scanTokens();

      expect(tokens[0]).toMatchObject({ type: TokenType.IDENTIFIER, value: 'countryCode' });
      expect(tokens[1]).toMatchObject({ type: TokenType.IDENTIFIER, value: 'model' });
      expect(tokens[2]).toMatchObject({ type: TokenType.IDENTIFIER, value: 'created' });
      expect(tokens[3]).toMatchObject({ type: TokenType.IDENTIFIER, value: 'demo' });
      expect(tokens[4]).toMatchObject({ type: TokenType.IDENTIFIER, value: 'a' });
      expect(tokens[5]).toMatchObject({ type: TokenType.IDENTIFIER, value: 'b' });
      expect(tokens[6]).toMatchObject({ type: TokenType.IDENTIFIER, value: 'c' });
      expect(tokens[7]).toMatchObject({ type: TokenType.IDENTIFIER, value: 'd' });
    });

    it('should scan identifiers with underscores and numbers', () => {
      const input = 'my_var var123 _private';
      scanner = new Scanner(input);
      const tokens = scanner.scanTokens();

      expect(tokens[0]).toMatchObject({ type: TokenType.IDENTIFIER, value: 'my_var' });
      expect(tokens[1]).toMatchObject({ type: TokenType.IDENTIFIER, value: 'var123' });
      expect(tokens[2]).toMatchObject({ type: TokenType.IDENTIFIER, value: '_private' });
    });
  });

  describe('Complex examples', () => {
    it('should scan simple feature flag definition', () => {
      const input = 'FF-feature-flat-on-off -> true';
      scanner = new Scanner(input);
      const tokens = scanner.scanTokens();

      expect(tokens[0]).toMatchObject({
        type: TokenType.FEATURE_FLAG_NAME,
        value: 'FF-feature-flat-on-off'
      });
      expect(tokens[1]).toMatchObject({ type: TokenType.ARROW, value: '->' });
      expect(tokens[2]).toMatchObject({ type: TokenType.BOOLEAN_TRUE, value: 'true' });
      expect(tokens[3]).toMatchObject({ type: TokenType.EOF });
    });

    it('should scan feature flag with json variant', () => {
      const input = 'FF-feature-json-variant -> json({"success": true})';
      scanner = new Scanner(input);
      const tokens = scanner.scanTokens();

      expect(tokens[0]).toMatchObject({
        type: TokenType.FEATURE_FLAG_NAME,
        value: 'FF-feature-json-variant'
      });
      expect(tokens[1]).toMatchObject({ type: TokenType.ARROW, value: '->' });
      expect(tokens[2]).toMatchObject({ type: TokenType.JSON_FUNC, value: 'json' });
      expect(tokens[3]).toMatchObject({ type: TokenType.LEFT_PAREN, value: '(' });
      expect(tokens[4]).toMatchObject({ type: TokenType.LEFT_BRACE, value: '{' });
      expect(tokens[5]).toMatchObject({ type: TokenType.STRING, value: 'success' });
      expect(tokens[6]).toMatchObject({ type: TokenType.COLON, value: ':' });
      expect(tokens[7]).toMatchObject({ type: TokenType.BOOLEAN_TRUE, value: 'true' });
      expect(tokens[8]).toMatchObject({ type: TokenType.RIGHT_BRACE, value: '}' });
      expect(tokens[9]).toMatchObject({ type: TokenType.RIGHT_PAREN, value: ')' });
    });

    it('should scan complex boolean expression', () => {
      const input = 'a = b and c=d and (dd not in (1,2,3) or z == "demo car")';
      scanner = new Scanner(input);
      const tokens = scanner.scanTokens();

      const expectedTokens = [
        { type: TokenType.IDENTIFIER, value: 'a' },
        { type: TokenType.ASSIGN, value: '=' },
        { type: TokenType.IDENTIFIER, value: 'b' },
        { type: TokenType.AND, value: 'and' },
        { type: TokenType.IDENTIFIER, value: 'c' },
        { type: TokenType.ASSIGN, value: '=' },
        { type: TokenType.IDENTIFIER, value: 'd' },
        { type: TokenType.AND, value: 'and' },
        { type: TokenType.LEFT_PAREN, value: '(' },
        { type: TokenType.IDENTIFIER, value: 'dd' },
        { type: TokenType.NOT, value: 'not' },
        { type: TokenType.IN, value: 'in' },
        { type: TokenType.LEFT_PAREN, value: '(' },
        { type: TokenType.NUMBER, value: '1' },
        { type: TokenType.COMMA, value: ',' },
        { type: TokenType.NUMBER, value: '2' },
        { type: TokenType.COMMA, value: ',' },
        { type: TokenType.NUMBER, value: '3' },
        { type: TokenType.RIGHT_PAREN, value: ')' },
        { type: TokenType.OR, value: 'or' },
        { type: TokenType.IDENTIFIER, value: 'z' },
        { type: TokenType.EQUALS, value: '==' },
        { type: TokenType.STRING, value: 'demo car' },
        { type: TokenType.RIGHT_PAREN, value: ')' },
        { type: TokenType.EOF }
      ];

      expectedTokens.forEach((expected, index) => {
        expect(tokens[index]).toMatchObject(expected);
      });
    });

    it('should scan multiline feature flag with comments', () => {
      const input = `FF-feature-y {
    // if country is NL return True
    countryCode == NL -> true
    // else default to false
    false
}`;
      scanner = new Scanner(input);
      const tokens = scanner.scanTokens();

      expect(tokens[0]).toMatchObject({
        type: TokenType.FEATURE_FLAG_NAME,
        value: 'FF-feature-y'
      });
      expect(tokens[1]).toMatchObject({ type: TokenType.LEFT_BRACE });
      expect(tokens[2]).toMatchObject({ type: TokenType.NEWLINE });
      expect(tokens[3]).toMatchObject({
        type: TokenType.COMMENT,
        value: '// if country is NL return True'
      });
      expect(tokens[4]).toMatchObject({ type: TokenType.NEWLINE });
      expect(tokens[5]).toMatchObject({ type: TokenType.IDENTIFIER, value: 'countryCode' });
      expect(tokens[6]).toMatchObject({ type: TokenType.EQUALS, value: '==' });
      expect(tokens[7]).toMatchObject({ type: TokenType.IDENTIFIER, value: 'NL' });
      expect(tokens[8]).toMatchObject({ type: TokenType.ARROW, value: '->' });
      expect(tokens[9]).toMatchObject({ type: TokenType.BOOLEAN_TRUE, value: 'true' });
    });
  });

  describe('Position tracking', () => {
    it('should track line and column numbers correctly', () => {
      const input = `line1
line2
line3`;
      scanner = new Scanner(input);
      const tokens = scanner.scanTokens();

      expect(tokens[0]).toMatchObject({
        type: TokenType.IDENTIFIER,
        value: 'line1',
        line: 1,
        column: 1
      });
      expect(tokens[1]).toMatchObject({
        type: TokenType.NEWLINE,
        line: 1,
        column: 6
      });
      expect(tokens[2]).toMatchObject({
        type: TokenType.IDENTIFIER,
        value: 'line2',
        line: 2,
        column: 1
      });
      expect(tokens[3]).toMatchObject({
        type: TokenType.NEWLINE,
        line: 2,
        column: 6
      });
      expect(tokens[4]).toMatchObject({
        type: TokenType.IDENTIFIER,
        value: 'line3',
        line: 3,
        column: 1
      });
    });

    it('should track start and end positions', () => {
      const input = 'hello world';
      scanner = new Scanner(input);
      const tokens = scanner.scanTokens();

      expect(tokens[0]).toMatchObject({
        start: 0,
        end: 5
      });
      expect(tokens[1]).toMatchObject({
        start: 6,
        end: 11
      });
    });
  });

  describe('Error handling', () => {
    it('should throw error for unexpected characters', () => {
      const input = '@#$';
      scanner = new Scanner(input);
      
      expect(() => scanner.scanTokens()).toThrow('Unexpected character');
    });

    it('should throw error for incomplete operators', () => {
      const input = '!x';  // ! without =
      scanner = new Scanner(input);
      
      expect(() => scanner.scanTokens()).toThrow('Unexpected character');
    });
  });
});
