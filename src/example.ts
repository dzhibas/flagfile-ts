import { Scanner, TokenType } from './index';

// Example usage of the scanner
const exampleCode = `
// once you dont have rules you can use short notation to return boolean
FF-feature-flat-on-off -> true

// can be snake_case as well as kebab-case
FF_feature_can_be_snake_case_213213 -> FALSE

// can be camelCase
FF_featureOneOrTwo -> FALSE

// can be PascalCase
FF_Feature23432 -> TRUE

// you can return non-boolean in this example json. or empty json object json({})
FF-feature-json-variant -> json({"success": true})

// features are forced to start with FF- case-sensitive as
// it allows you later to find all flags through the codebase
FF-feature-name-specifics -> false

// you can have feature with multiple rules in it with default flag value returned in the end
// you can have comments or comment blocks with // or /* comment */
FF-feature-y {
    // if country is NL return True
    countryCode == NL -> true
    // else default to false
    false
}

// you can also return different variations (non-boolean) as example json
FF-testing {
    // default variant
    json({"success": true})
}

// and have more complex feature with multiple rules in it and some rules multiline rule, which at the end defaults to false
// aswel capitalize for visibility boolean TRUE/FALSE
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

// different kind of comments inside
FF-feature1 {
    /* comment like this */
    true
    a == "something" -> false
    false
    json({})
}

/* this is multi-line commented feature
FF-timer-feature {
    // turn on only on evaluation time after 22nd feb
    NOW() > 2024-02-22 -> true
    false
}
*/
`;

console.log('=== Feature Flag Scanner Example ===\\n');

const scanner = new Scanner(exampleCode);
const tokens = scanner.scanTokens();

console.log('Tokens found:');
tokens.forEach((token, index) => {
  if (token.type !== TokenType.EOF && token.type !== TokenType.NEWLINE) {
    console.log(`${index.toString().padStart(2)}: ${token.type.padEnd(20)} | ${token.value.padEnd(25)} | Line ${token.line}, Col ${token.column}`);
  }
});

console.log(`\\nTotal tokens: ${tokens.length - 1} (excluding EOF)`);

// Filter for just feature flag names
const featureFlags = tokens.filter(token => token.type === TokenType.FEATURE_FLAG_NAME);
console.log('\\nFeature flags found:');
featureFlags.forEach(flag => {
  console.log(`- ${flag.value}`);
});
