import { Scanner } from '../scanner';
import { Parser } from '../parser';
import { 
  Interpreter, 
  EvaluationContext, 
  EvaluationResult, 
  InterpreterError 
} from '../interpreter';

describe('Interpreter', () => {
  let interpreter: Interpreter;

  beforeEach(() => {
    interpreter = new Interpreter();
  });

  test('should evaluate simple boolean flag', () => {
    const input = 'FF-test -> true';
    const tokens = new Scanner(input).scanTokens();
    const ast = new Parser(tokens).parse();
    
    const results = interpreter.interpretProgram(ast);
    
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      name: 'FF-test',
      value: true,
      matched: true
    });
  });

  test('should evaluate JSON flag', () => {
    const input = 'FF-test -> json({"enabled": true})';
    const tokens = new Scanner(input).scanTokens();
    const ast = new Parser(tokens).parse();
    
    const results = interpreter.interpretProgram(ast);
    
    expect(results[0]).toEqual({
      name: 'FF-test',
      value: { enabled: true },
      matched: true
    });
  });

  test('should evaluate complex flag with context', () => {
    const input = `
      FF-test {
        countryCode == "NL" -> true
        false
      }
    `;
    
    const context: EvaluationContext = {
      countryCode: "NL"
    };
    
    interpreter.setContext(context);
    
    const tokens = new Scanner(input).scanTokens();
    const ast = new Parser(tokens).parse();
    const results = interpreter.interpretProgram(ast);
    
    expect(results[0]).toEqual({
      name: 'FF-test',
      value: true,
      matched: true
    });
  });
});
