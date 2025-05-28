import { Scanner } from './scanner';
import { Parser } from './parser';
import { Interpreter, EvaluationContext } from './interpreter';

// Example feature flag file content
const featureFlagContent = `
// Simple feature flags
FF-basic-on -> true
FF-basic-off -> false
FF-json-feature -> json({"enabled": true, "variant": "A"})

// Complex feature flag with rules
FF_country_feature {
    countryCode == "NL" -> json({"enabled": true, "message": "Welcome Dutch user!"})
    countryCode == "US" -> json({"enabled": true, "message": "Welcome American user!"})
    false
}

// Feature with multiple conditions
FF-complex-feature {
    // Multi-condition rule
    model in ("m3", "ms", "mx") and created >= "2024-01-01" and demo == false -> true
    
    // Date-based rule
    NOW() > "2024-12-31" -> "future"
    
    // Default
    false
}

// User role based feature
FF-admin-feature {
    role == "admin" and permissions in ("read", "write", "delete") -> "full_access"
    role == "user" -> "limited_access"
    "no_access"
}
`;

function demonstrateInterpreter() {
  console.log('🚀 Feature Flag Interpreter Demo\n');
  
  // Step 1: Scan tokens
  console.log('1. Scanning tokens...');
  const scanner = new Scanner(featureFlagContent);
  const tokens = scanner.scanTokens();
  console.log(`   Found ${tokens.length} tokens\n`);
  
  // Step 2: Parse AST
  console.log('2. Parsing AST...');
  const parser = new Parser(tokens);
  const ast = parser.parse();
  console.log(`   Parsed ${ast.features.length} feature flags\n`);
  
  // Step 3: Interpret with different contexts
  console.log('3. Interpreting with different contexts...\n');
  
  const interpreter = new Interpreter();
  
  // Context 1: Dutch user with Tesla Model 3
  console.log('📍 Context 1: Dutch Tesla Model 3 owner');
  const context1: EvaluationContext = {
    countryCode: "NL",
    model: "m3",
    created: "2024-06-01",
    demo: false,
    role: "user",
    permissions: "read"
  };
  
  interpreter.setContext(context1);
  const results1 = interpreter.interpretProgram(ast);
  
  results1.forEach(result => {
    console.log(`   ${result.name}: ${JSON.stringify(result.value)} ${result.matched ? '(matched rule)' : '(default)'}`);
  });
  
  console.log();
  
  // Context 2: American admin user
  console.log('📍 Context 2: American admin user');
  const context2: EvaluationContext = {
    countryCode: "US",
    model: "model-y",
    created: "2023-05-01",
    demo: true,
    role: "admin",
    permissions: "delete"
  };
  
  interpreter.setContext(context2);
  const results2 = interpreter.interpretProgram(ast);
  
  results2.forEach(result => {
    console.log(`   ${result.name}: ${JSON.stringify(result.value)} ${result.matched ? '(matched rule)' : '(default)'}`);
  });
  
  console.log();
  
  // Context 3: Unknown country user
  console.log('📍 Context 3: Unknown country user');
  const context3: EvaluationContext = {
    countryCode: "FR",
    model: "cybertruck",
    created: "2025-01-01",
    demo: false,
    role: "guest"
  };
  
  interpreter.setContext(context3);
  const results3 = interpreter.interpretProgram(ast);
  
  results3.forEach(result => {
    console.log(`   ${result.name}: ${JSON.stringify(result.value)} ${result.matched ? '(matched rule)' : '(default)'}`);
  });
  
  console.log();
  
  // Demonstrate single feature evaluation
  console.log('4. Evaluating single feature flag...\n');
  
  const singleFeature = ast.features.find(f => f.name === 'FF-complex-feature');
  if (singleFeature) {
    interpreter.setContext(context1); // Dutch Tesla Model 3 owner
    const singleResult = interpreter.interpretFeatureFlag(singleFeature);
    console.log(`   Single evaluation of ${singleResult.name}:`);
    console.log(`   Value: ${JSON.stringify(singleResult.value)}`);
    console.log(`   Matched rule: ${singleResult.matched}`);
  }
  
  console.log();
  
  // Demonstrate error handling
  console.log('5. Error handling demo...\n');
  
  try {
    // Context with missing required variable
    const badContext: EvaluationContext = {
      // Missing countryCode that's required by FF-country-feature
    };
    
    interpreter.setContext(badContext);
    const badResult = interpreter.interpretFeatureFlag(
      ast.features.find(f => f.name === 'FF-country-feature')!
    );
    console.log(`   Unexpected success: ${JSON.stringify(badResult)}`);
  } catch (error) {
    console.log(`   ✅ Caught expected error: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  console.log('\n✨ Demo completed successfully!');
}

// Type checking demo
function demonstrateTypeChecking() {
  console.log('\n🔍 Type Safety Demo\n');
  
  const interpreter = new Interpreter();
  
  // This demonstrates the type safety of our evaluation context
  const typedContext: EvaluationContext = {
    stringValue: "hello",
    numberValue: 42,
    booleanValue: true,
    dateValue: new Date(),
    arrayValue: ["item1", "item2"],
    objectValue: { key: "value" }
  };
  
  interpreter.setContext(typedContext);
  
  console.log('✅ Type-safe context created:');
  Object.entries(typedContext).forEach(([key, value]) => {
    console.log(`   ${key}: ${typeof value} = ${JSON.stringify(value)}`);
  });
}

// Run the demo
if (require.main === module) {
  try {
    demonstrateInterpreter();
    demonstrateTypeChecking();
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}
