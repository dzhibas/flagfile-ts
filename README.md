# Feature Flag Scanner

A TypeScript library for scanning and tokenizing feature flag files with a custom syntax.

## Features

This scanner can tokenize a feature flag language that supports:

- **Feature Flag Names**: Must start with `FF-` or `FF_` (case-sensitive)
- **Boolean Literals**: `true`, `false`, `TRUE`, `FALSE`
- **Operators**: `->`, `==`, `!=`, `=`, `>`, `<`, `>=`, `<=`
- **Logical Operators**: `and`, `or`, `not`, `in`
- **Delimiters**: `{`, `}`, `(`, `)`, `,`, `:`
- **String Literals**: Double-quoted strings with escape sequences
- **Numbers**: Integers and floating-point numbers
- **Dates**: ISO format dates (`YYYY-MM-DD`)
- **Comments**: Line comments (`//`) and block comments (`/* */`)
- **Special Functions**: `json()`, `NOW()`

## Installation

```bash
npm install
npm run build
```

## Usage

```typescript
import { Scanner, TokenType } from './src/index';

const code = `
FF-my-feature -> true

FF-complex-feature {
    countryCode == "US" -> true
    false
}
`;

const scanner = new Scanner(code);
const tokens = scanner.scanTokens();

// Process tokens
tokens.forEach(token => {
    if (token.type === TokenType.FEATURE_FLAG_NAME) {
        console.log(`Found feature flag: ${token.value}`);
    }
});
```

## Example Syntax

```typescript
// Simple feature flags
FF-feature-flat-on-off -> true
FF_feature_snake_case -> FALSE

// Feature flags with rules
FF-feature-complex {
    // Simple condition
    countryCode == "NL" -> true
    
    // Complex boolean expression
    model in ("ms", "mx", "m3") and created >= 2024-01-01 
        and demo == false -> TRUE
    
    // Default value
    false
}

// JSON variants
FF-feature-json -> json({"success": true, "version": 2})

// Date-based features
FF-timer-feature {
    NOW() > 2024-02-22 -> true
    false
}
```

## Token Types

The scanner recognizes the following token types:

- `FEATURE_FLAG_NAME`: Feature flag identifiers starting with FF-/FF_
- `IDENTIFIER`: Variable names and identifiers
- `STRING`: Double-quoted string literals
- `NUMBER`: Integer and floating-point numbers
- `DATE`: Date literals in YYYY-MM-DD format
- `BOOLEAN_TRUE`/`BOOLEAN_FALSE`: Boolean literals
- `ARROW`: The `->` operator
- `EQUALS`, `NOT_EQUALS`, `ASSIGN`: Comparison operators
- `GREATER_THAN`, `LESS_THAN`, `GREATER_EQUAL`, `LESS_EQUAL`: Comparison operators
- `AND`, `OR`, `NOT`, `IN`: Logical operators
- `LEFT_BRACE`, `RIGHT_BRACE`, `LEFT_PAREN`, `RIGHT_PAREN`, `COMMA`, `COLON`: Delimiters
- `JSON_FUNC`, `NOW_FUNC`: Special function names
- `COMMENT`: Comments (both line and block)
- `NEWLINE`: Line breaks
- `EOF`: End of file

## Testing

Run the comprehensive test suite:

```bash
npm test
```

The test suite covers:
- Basic token recognition
- String literals with escape sequences
- Number and date parsing
- Comment handling
- Complex expressions
- Position tracking
- Error handling

## Error Handling

The scanner provides detailed error messages with line and column information for:
- Unterminated strings
- Unterminated block comments
- Unexpected characters

## Next Steps

This scanner is the foundation for:
1. **Parser**: Building an Abstract Syntax Tree (AST) from tokens
2. **Interpreter**: Evaluating feature flag rules
3. **Evaluator**: Runtime evaluation with context variables

## Development

- `npm run build`: Compile TypeScript
- `npm test`: Run tests
- `npm run dev`: Watch mode for development
