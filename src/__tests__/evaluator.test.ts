import { 
  Evaluator, 
  EvaluatorOptions, 
  evaluateFeatureFlag, 
  isFeatureEnabled 
} from '../evaluator';
import { EvaluationContext } from '../interpreter';

describe('Evaluator', () => {
  const sampleFeatureFlags = `
    // Simple flags
    FF-always-on -> true
    FF-always-off -> false
    FF-json-config -> json({"theme": "dark", "version": 2})
    FF-string-value -> "production"

    // Complex flags
    FF-country-based {
      countryCode == "NL" -> true
      countryCode == "US" -> false
      null
    }

    FF-user-tier {
      tier == "premium" and active == true -> "full_access"
      tier == "basic" -> "limited_access"
      "no_access"
    }

    FF-date-based {
      NOW() > "2020-01-01" -> true
      false
    }
  `;

  describe('Basic Evaluation', () => {
    test('should evaluate simple boolean flag', () => {
      const evaluator = new Evaluator();
      const result = evaluator.evaluateFeature(sampleFeatureFlags, 'FF-always-on');
      expect(result).toBe(true);
    });

    test('should evaluate JSON flag', () => {
      const evaluator = new Evaluator();
      const result = evaluator.evaluateFeature(sampleFeatureFlags, 'FF-json-config');
      expect(result).toEqual({ theme: "dark", version: 2 });
    });

    test('should evaluate complex flag with context', () => {
      const evaluator = new Evaluator();
      const context: EvaluationContext = { countryCode: "NL" };
      const result = evaluator.evaluateFeature(sampleFeatureFlags, 'FF-country-based', context);
      expect(result).toBe(true);
    });

    test('should return default value for complex flag', () => {
      const evaluator = new Evaluator();
      const context: EvaluationContext = { countryCode: "FR" };
      const result = evaluator.evaluateFeature(sampleFeatureFlags, 'FF-country-based', context);
      expect(result).toBe(false);
    });
  });

  describe('isEnabled functionality', () => {
    test('should check if boolean flag is enabled', () => {
      const evaluator = new Evaluator();
      expect(evaluator.isEnabled(sampleFeatureFlags, 'FF-always-on')).toBe(true);
      expect(evaluator.isEnabled(sampleFeatureFlags, 'FF-always-off')).toBe(false);
    });

    test('should check if string flag is enabled', () => {
      const evaluator = new Evaluator();
      expect(evaluator.isEnabled(sampleFeatureFlags, 'FF-string-value')).toBe(true);
    });

    test('should check if JSON flag is enabled', () => {
      const evaluator = new Evaluator();
      expect(evaluator.isEnabled(sampleFeatureFlags, 'FF-json-config')).toBe(true);
    });

    test('should check complex flag with context', () => {
      const evaluator = new Evaluator();
      const context: EvaluationContext = { 
        tier: "premium", 
        active: true 
      };
      expect(evaluator.isEnabled(sampleFeatureFlags, 'FF-user-tier', context)).toBe(true);
    });
  });

  describe('getFeatureValue with type assertion', () => {
    test('should get typed feature value', () => {
      const evaluator = new Evaluator();
      
      // String type
      const stringValue = evaluator.getFeatureValue<string>(
        sampleFeatureFlags, 
        'FF-string-value'
      );
      expect(stringValue).toBe("production");
      
      // Object type
      const jsonValue = evaluator.getFeatureValue<{ theme: string; version: number }>(
        sampleFeatureFlags, 
        'FF-json-config'
      );
      expect(jsonValue.theme).toBe("dark");
      expect(jsonValue.version).toBe(2);
    });
  });

  describe('evaluateFeatures bulk evaluation', () => {
    test('should evaluate multiple features at once', () => {
      const evaluator = new Evaluator();
      const context: EvaluationContext = { 
        countryCode: "NL",
        tier: "basic" 
      };
      
      const results = evaluator.evaluateFeatures(
        sampleFeatureFlags,
        ['FF-always-on', 'FF-country-based', 'FF-user-tier'],
        context
      );
      
      expect(results.get('FF-always-on')).toBe(true);
      expect(results.get('FF-country-based')).toBe(true);
      expect(results.get('FF-user-tier')).toBe("limited_access");
    });

    test('should handle missing features in bulk evaluation', () => {
      const evaluator = new Evaluator({ defaultValue: "missing" });
      
      const results = evaluator.evaluateFeatures(
        sampleFeatureFlags,
        ['FF-always-on', 'FF-non-existent'],
        {}
      );
      
      expect(results.get('FF-always-on')).toBe(true);
      expect(results.get('FF-non-existent')).toBe("missing");
    });
  });

  describe('Error Handling Options', () => {
    test('should throw errors when throwOnError is true', () => {
      const evaluator = new Evaluator({ throwOnError: true });
      
      expect(() => {
        evaluator.evaluateFeature(sampleFeatureFlags, 'FF-non-existent');
      }).toThrow('Feature flag \'FF-non-existent\' not found');
    });

    test('should return default value when throwOnError is false', () => {
      const evaluator = new Evaluator({ 
        throwOnError: false, 
        defaultValue: "default" 
      });
      
      const result = evaluator.evaluateFeature(sampleFeatureFlags, 'FF-non-existent');
      expect(result).toBe("default");
    });

    test('should handle evaluation errors gracefully', () => {
      const flagsWithError = `
        FF-error-flag -> undefinedVariable
      `;
      
      const evaluator = new Evaluator({ 
        throwOnError: false, 
        defaultValue: "error_fallback" 
      });
      
      const result = evaluator.evaluateFeature(flagsWithError, 'FF-error-flag');
      expect(result).toBe("error_fallback");
    });
  });

  describe('Context Management', () => {
    test('should maintain context across evaluations', () => {
      const evaluator = new Evaluator();
      const context: EvaluationContext = { countryCode: "US" };
      
      evaluator.setContext(context);
      
      const result1 = evaluator.evaluateFeature(sampleFeatureFlags, 'FF-country-based');
      const result2 = evaluator.evaluateFeature(sampleFeatureFlags, 'FF-country-based');
      
      expect(result1).toBe(false);
      expect(result2).toBe(false);
    });

    test('should get current context', () => {
      const evaluator = new Evaluator();
      const context: EvaluationContext = { tier: "premium" };
      
      evaluator.setContext(context);
      const retrievedContext = evaluator.getContext();
      
      expect(retrievedContext).toEqual(context);
    });
  });

  describe('Caching', () => {
    test('should cache AST when cache is enabled', () => {
      const evaluator = new Evaluator({ cache: true });
      
      // Parse once
      const result1 = evaluator.evaluateFeature(sampleFeatureFlags, 'FF-always-on');
      
      // Parse again (should use cache)
      const result2 = evaluator.evaluateFeature(sampleFeatureFlags, 'FF-always-on');
      
      expect(result1).toBe(result2);
    });

    test('should clear cache', () => {
      const evaluator = new Evaluator({ cache: true });
      
      // Populate cache
      evaluator.evaluateFeature(sampleFeatureFlags, 'FF-always-on');
      
      // Clear cache
      evaluator.clearCache();
      
      // This should work fine even after cache clear
      const result = evaluator.evaluateFeature(sampleFeatureFlags, 'FF-always-on');
      expect(result).toBe(true);
    });
  });

  describe('Feature Information', () => {
    test('should get feature information', () => {
      const evaluator = new Evaluator();
      const info = evaluator.getFeatureInfo(sampleFeatureFlags);
      
      expect(info).toContainEqual({ name: 'FF-always-on', type: 'simple' });
      expect(info).toContainEqual({ name: 'FF-country-based', type: 'complex' });
      expect(info).toContainEqual({ name: 'FF-user-tier', type: 'complex' });
      expect(info.length).toBeGreaterThan(0);
    });
  });

  describe('Validation', () => {
    test('should validate correct syntax', () => {
      const evaluator = new Evaluator();
      const validation = evaluator.validate(sampleFeatureFlags);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should detect syntax errors', () => {
      const evaluator = new Evaluator();
      const invalidFlags = `
        FF-invalid -> 
        FF-another {
          missing condition ->
        }
      `;
      
      const validation = evaluator.validate(invalidFlags);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Complete Program Evaluation', () => {
    test('should evaluate entire program', () => {
      const evaluator = new Evaluator();
      const context: EvaluationContext = { 
        countryCode: "NL",
        tier: "premium",
        active: true
      };
      
      const results = evaluator.evaluate(sampleFeatureFlags, context);
      
      expect(results.length).toBeGreaterThan(0);
      
      const countryResult = results.find(r => r.name === 'FF-country-based');
      expect(countryResult?.value).toBe(true);
      
      const tierResult = results.find(r => r.name === 'FF-user-tier');
      expect(tierResult?.value).toBe("full_access");
    });
  });
});

describe('Convenience Functions', () => {
  const simpleFlags = `
    FF-enabled -> true
    FF-disabled -> false
    FF-conditional {
      env == "production" -> "prod_value"
      "dev_value"
    }
  `;

  describe('evaluateFeatureFlag', () => {
    test('should evaluate feature flag', () => {
      const result = evaluateFeatureFlag(simpleFlags, 'FF-enabled');
      expect(result).toBe(true);
    });

    test('should evaluate with context', () => {
      const result = evaluateFeatureFlag(
        simpleFlags, 
        'FF-conditional', 
        { env: "production" }
      );
      expect(result).toBe("prod_value");
    });

    test('should handle options', () => {
      const result = evaluateFeatureFlag(
        simpleFlags, 
        'FF-non-existent', 
        {}, 
        { defaultValue: "fallback" }
      );
      expect(result).toBe("fallback");
    });
  });

  describe('isFeatureEnabled', () => {
    test('should check if feature is enabled', () => {
      expect(isFeatureEnabled(simpleFlags, 'FF-enabled')).toBe(true);
      expect(isFeatureEnabled(simpleFlags, 'FF-disabled')).toBe(false);
    });

    test('should check with context', () => {
      const result = isFeatureEnabled(
        simpleFlags, 
        'FF-conditional', 
        { env: "production" }
      );
      expect(result).toBe(true); // "prod_value" is truthy
    });

    test('should handle missing features', () => {
      const result = isFeatureEnabled(
        simpleFlags, 
        'FF-non-existent', 
        {}, 
        { defaultValue: false }
      );
      expect(result).toBe(false);
    });
  });
});
