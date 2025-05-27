import { Scanner } from './scanner';
import { Parser } from './parser';
import { Interpreter, EvaluationContext, EvaluationResult } from './interpreter';
import { Program, LiteralValue } from './types';

// Re-export types for convenience
export { EvaluationContext, EvaluationResult } from './interpreter';

/**
 * Configuration options for the evaluator
 */
export interface EvaluatorOptions {
  /** Whether to cache parsed AST for reuse */
  cache?: boolean;
  /** Whether to throw errors or return default values */
  throwOnError?: boolean;
  /** Default value to return when evaluation fails and throwOnError is false */
  defaultValue?: LiteralValue;
}

/**
 * High-level evaluator for feature flags that combines scanning, parsing, and interpretation
 */
export class Evaluator {
  private interpreter: Interpreter;
  private options: Required<EvaluatorOptions>;
  private astCache: Map<string, Program> = new Map();

  constructor(options: EvaluatorOptions = {}) {
    this.interpreter = new Interpreter();
    this.options = {
      cache: options.cache ?? true,
      throwOnError: options.throwOnError ?? false,
      defaultValue: options.defaultValue ?? false
    };
  }

  /**
   * Evaluates feature flags from source code
   */
  public evaluate(source: string, context: EvaluationContext = {}): EvaluationResult[] {
    try {
      this.interpreter.setContext(context);
      const ast = this.parseSource(source);
      return this.interpreter.interpretProgram(ast);
    } catch (error) {
      if (this.options.throwOnError) {
        throw error;
      }
      return [];
    }
  }

  /**
   * Evaluates a single feature flag by name
   */
  public evaluateFeature(
    source: string, 
    featureName: string, 
    context: EvaluationContext = {}
  ): LiteralValue {
    try {
      this.interpreter.setContext(context);
      const ast = this.parseSource(source);
      
      const feature = ast.features.find(f => f.name === featureName);
      if (!feature) {
        if (this.options.throwOnError) {
          throw new Error(`Feature flag '${featureName}' not found`);
        }
        return this.options.defaultValue;
      }

      const result = this.interpreter.interpretFeatureFlag(feature);
      return result.value;
    } catch (error) {
      if (this.options.throwOnError) {
        throw error;
      }
      return this.options.defaultValue;
    }
  }

  /**
   * Checks if a feature flag is enabled (truthy)
   */
  public isEnabled(
    source: string, 
    featureName: string, 
    context: EvaluationContext = {}
  ): boolean {
    const value = this.evaluateFeature(source, featureName, context);
    return this.isTruthy(value);
  }

  /**
   * Gets a feature flag value with type assertion
   */
  public getFeatureValue<T = LiteralValue>(
    source: string, 
    featureName: string, 
    context: EvaluationContext = {}
  ): T {
    return this.evaluateFeature(source, featureName, context) as T;
  }

  /**
   * Evaluates multiple features and returns a map of results
   */
  public evaluateFeatures(
    source: string, 
    featureNames: string[], 
    context: EvaluationContext = {}
  ): Map<string, LiteralValue> {
    const results = new Map<string, LiteralValue>();
    
    try {
      this.interpreter.setContext(context);
      const ast = this.parseSource(source);
      
      for (const featureName of featureNames) {
        const feature = ast.features.find(f => f.name === featureName);
        if (feature) {
          try {
            const result = this.interpreter.interpretFeatureFlag(feature);
            results.set(featureName, result.value);
          } catch (error) {
            if (this.options.throwOnError) {
              throw error;
            }
            results.set(featureName, this.options.defaultValue);
          }
        } else {
          if (this.options.throwOnError) {
            throw new Error(`Feature flag '${featureName}' not found`);
          }
          results.set(featureName, this.options.defaultValue);
        }
      }
    } catch (error) {
      if (this.options.throwOnError) {
        throw error;
      }
      // Return default values for all requested features
      featureNames.forEach(name => {
        results.set(name, this.options.defaultValue);
      });
    }
    
    return results;
  }

  /**
   * Updates the evaluation context
   */
  public setContext(context: EvaluationContext): void {
    this.interpreter.setContext(context);
  }

  /**
   * Gets the current evaluation context
   */
  public getContext(): EvaluationContext {
    return this.interpreter.getContext();
  }

  /**
   * Clears the AST cache
   */
  public clearCache(): void {
    this.astCache.clear();
  }

  /**
   * Gets information about available feature flags in source
   */
  public getFeatureInfo(source: string): Array<{ name: string; type: 'simple' | 'complex' }> {
    try {
      const ast = this.parseSource(source);
      return ast.features.map(feature => ({
        name: feature.name,
        type: feature.body.type === 'SimpleFeatureFlag' ? 'simple' : 'complex'
      }));
    } catch (error) {
      if (this.options.throwOnError) {
        throw error;
      }
      return [];
    }
  }

  /**
   * Validates feature flag source code
   */
  public validate(source: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    try {
      const scanner = new Scanner(source);
      const tokens = scanner.scanTokens();
      
      const parser = new Parser(tokens);
      parser.parse();
      
      return { valid: true, errors: [] };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      return { valid: false, errors };
    }
  }

  /**
   * Parses source code into AST, with optional caching
   */
  private parseSource(source: string): Program {
    if (this.options.cache) {
      const cached = this.astCache.get(source);
      if (cached) {
        return cached;
      }
    }

    const scanner = new Scanner(source);
    const tokens = scanner.scanTokens();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    if (this.options.cache) {
      this.astCache.set(source, ast);
    }

    return ast;
  }

  /**
   * Checks if a value is truthy according to feature flag semantics
   */
  private isTruthy(value: LiteralValue): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    
    if (typeof value === 'number') {
      return value !== 0;
    }
    
    if (typeof value === 'string') {
      return value.length > 0;
    }
    
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    
    if (value instanceof Date) {
      return !isNaN(value.getTime());
    }
    
    if (typeof value === 'object' && value !== null) {
      return Object.keys(value).length > 0;
    }
    
    return value != null;
  }
}

/**
 * Convenience function to create and use an evaluator
 */
export function evaluateFeatureFlag(
  source: string, 
  featureName: string, 
  context: EvaluationContext = {},
  options: EvaluatorOptions = {}
): LiteralValue {
  const evaluator = new Evaluator(options);
  return evaluator.evaluateFeature(source, featureName, context);
}

/**
 * Convenience function to check if a feature is enabled
 */
export function isFeatureEnabled(
  source: string, 
  featureName: string, 
  context: EvaluationContext = {},
  options: EvaluatorOptions = {}
): boolean {
  const evaluator = new Evaluator(options);
  return evaluator.isEnabled(source, featureName, context);
}
