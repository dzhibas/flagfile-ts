import { Scanner, Parser, Program, FeatureFlag, SimpleFeatureFlag, ComplexFeatureFlag } from './index';

// Example usage of the scanner and parser
const exampleCode = `
// Simple feature flags
FF-feature-flat-on-off -> true
FF_feature_can_be_snake_case_213213 -> FALSE
FF_featureOneOrTwo -> FALSE
FF_Feature23432 -> TRUE

// JSON variant feature flag
FF-feature-json-variant -> json({"success": true, "version": 2})

// Complex feature flag with rules
FF-feature-y {
    // if country is NL return True
    countryCode == NL -> true
    // else default to false
    false
}

// Feature flag with only default value
FF-testing {
    // default variant
    json({"success": true})
}

// Complex feature flag with multiple rules
FF-feature-complex-ticket-234234 {
    // complex bool expression
    a = b and c=d and (dd not in (1,2,3) or z == "demo car") -> TRUE

    // another one
    z == "demo car" -> FALSE

    // with checking more
    g in (4,5,6) and z == "demo car" -> TRUE

    // and multi-line rule works
    model in (ms,mx,m3,my) and created >= 2024-01-01
        and demo == false -> TRUE

    FALSE
}

// Feature with various expressions
FF-feature1 {
    true
    a == "something" -> false
    false
    json({})
}

// Timer-based feature
FF-timer-feature {
    // turn on only on evaluation time after 22nd feb
    NOW() > 2024-02-22 -> true
    false
}
`;

console.log('=== Feature Flag Parser Example ===\n');

try {
  // Step 1: Scan tokens
  console.log('1. Scanning tokens...');
  const scanner = new Scanner(exampleCode);
  const tokens = scanner.scanTokens();
  console.log(`   Found ${tokens.length - 1} tokens (excluding EOF)\n`);

  // Step 2: Parse AST
  console.log('2. Parsing AST...');
  const parser = new Parser(tokens);
  const ast: Program = parser.parse();
  console.log(`   Parsed ${ast.features.length} feature flags\n`);

  // Step 3: Analyze parsed features
  console.log('3. Feature Flag Analysis:');
  console.log('   ========================\n');

  ast.features.forEach((feature: FeatureFlag, index: number) => {
    console.log(`   ${index + 1}. ${feature.name}`);
    console.log(`      Type: ${feature.body.type}`);
    
    if (feature.body.type === 'SimpleFeatureFlag') {
      const simple = feature.body as SimpleFeatureFlag;
      console.log(`      Value: ${simple.value.type} - ${getExpressionValue(simple.value)}`);
    } else if (feature.body.type === 'ComplexFeatureFlag') {
      const complex = feature.body as ComplexFeatureFlag;
      console.log(`      Rules: ${complex.rules.length}`);
      
      complex.rules.forEach((rule, ruleIndex) => {
        console.log(`        ${ruleIndex + 1}. Condition: ${getExpressionSummary(rule.condition)}`);
        console.log(`           Value: ${getExpressionValue(rule.value)}`);
      });
      
      if (complex.defaultValue) {
        console.log(`      Default: ${getExpressionValue(complex.defaultValue)}`);
      }
    }
    console.log('');
  });

  // Step 4: Show AST structure for one complex feature
  console.log('4. Detailed AST for FF-feature-complex-ticket-234234:');
  console.log('   ====================================================');
  
  const complexFeature = ast.features.find(f => f.name === 'FF-feature-complex-ticket-234234');
  if (complexFeature) {
    console.log(JSON.stringify(complexFeature, null, 2));
  }

} catch (error) {
  console.error('Error during parsing:', error);
  if (error instanceof Error && 'position' in error) {
    const parseError = error as any;
    console.error(`At line ${parseError.position.line}, column ${parseError.position.column}`);
  }
}

/**
 * Helper function to get a string representation of an expression value
 */
function getExpressionValue(expr: any): string {
  switch (expr.type) {
    case 'BooleanLiteral':
      return expr.value ? 'true' : 'false';
    case 'NumberLiteral':
      return expr.value.toString();
    case 'StringLiteral':
      return `"${expr.value}"`;
    case 'DateLiteral':
      return expr.value;
    case 'Identifier':
      return expr.name;
    case 'JsonExpression':
      return JSON.stringify(expr.value);
    case 'NowExpression':
      return 'NOW()';
    case 'ArrayExpression':
      return `[${expr.elements.map(getExpressionValue).join(', ')}]`;
    default:
      return `${expr.type}`;
  }
}

/**
 * Helper function to get a brief summary of an expression
 */
function getExpressionSummary(expr: any): string {
  switch (expr.type) {
    case 'BinaryExpression':
      return `${getExpressionSummary(expr.left)} ${expr.operator} ${getExpressionSummary(expr.right)}`;
    case 'UnaryExpression':
      return `${expr.operator} ${getExpressionSummary(expr.operand)}`;
    case 'GroupedExpression':
      return `(${getExpressionSummary(expr.expression)})`;
    case 'BooleanLiteral':
    case 'NumberLiteral':
    case 'StringLiteral':
    case 'DateLiteral':
    case 'Identifier':
    case 'JsonExpression':
    case 'NowExpression':
    case 'ArrayExpression':
      return getExpressionValue(expr);
    default:
      return expr.type;
  }
}
