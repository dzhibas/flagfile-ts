import { 
  Evaluator, 
  evaluateFeatureFlag, 
  isFeatureEnabled,
  EvaluationContext 
} from './evaluator';

// Complete feature flag configuration example
const featureFlagsConfig = `
// ===== SIMPLE FEATURE FLAGS =====

// Basic on/off switches
FF-new-ui -> true
FF-beta-features -> false
FF-maintenance-mode -> false

// Configuration values
FF-api-timeout -> 5000
FF-max-retries -> 3
FF-log-level -> "debug"

// Feature variants
FF-button-color -> "blue"
FF-theme-config -> json({
  "primaryColor": "#007bff",
  "secondaryColor": "#6c757d",
  "darkMode": true,
  "animations": true
})

// ===== COMPLEX FEATURE FLAGS WITH RULES =====

// Geographic-based features
FF-regional-features {
  countryCode == "US" -> json({
    "paymentMethods": ["card", "paypal", "apple_pay"],
    "currency": "USD",
    "taxCalculation": "state_based"
  })
  
  countryCode == "EU" -> json({
    "paymentMethods": ["card", "paypal", "sepa"],
    "currency": "EUR", 
    "taxCalculation": "vat_based"
  })
  
  countryCode in ("NL", "BE", "DE") -> json({
    "paymentMethods": ["card", "ideal", "sepa"],
    "currency": "EUR",
    "taxCalculation": "vat_based",
    "languageOptions": ["en", "nl", "de"]
  })
  
  // Default for other countries
  json({
    "paymentMethods": ["card"],
    "currency": "USD",
    "taxCalculation": "basic"
  })
}

// User tier based features
FF-premium-features {
  tier == "enterprise" and seats >= 100 -> json({
    "features": ["advanced_analytics", "custom_integrations", "priority_support", "sso"],
    "apiRateLimit": 10000,
    "storageLimit": "unlimited"
  })
  
  tier == "premium" -> json({
    "features": ["analytics", "integrations", "priority_support"],
    "apiRateLimit": 5000,
    "storageLimit": "100GB"
  })
  
  tier == "basic" -> json({
    "features": ["basic_analytics"],
    "apiRateLimit": 1000,
    "storageLimit": "10GB"
  })
  
  // Free tier
  json({
    "features": [],
    "apiRateLimit": 100,
    "storageLimit": "1GB"
  })
}

// Time-based feature rollout
FF-new-dashboard {
  // Enable for internal users immediately
  userType == "internal" -> true
  
  // Gradual rollout for external users
  userType == "external" and rolloutPercentage <= 25 and NOW() > "2024-01-15" -> true
  userType == "external" and rolloutPercentage <= 50 and NOW() > "2024-02-01" -> true
  userType == "external" and rolloutPercentage <= 75 and NOW() > "2024-02-15" -> true
  userType == "external" and NOW() > "2024-03-01" -> true
  
  false
}

// A/B testing configuration
FF-checkout-flow {
  // Variant A: Traditional checkout
  experimentGroup == "A" -> json({
    "variant": "traditional",
    "steps": ["cart", "shipping", "payment", "confirmation"],
    "guestCheckout": false
  })
  
  // Variant B: One-page checkout
  experimentGroup == "B" -> json({
    "variant": "onepage", 
    "steps": ["onepage_checkout", "confirmation"],
    "guestCheckout": true
  })
  
  // Control group gets traditional
  json({
    "variant": "traditional",
    "steps": ["cart", "shipping", "payment", "confirmation"],
    "guestCheckout": false
  })
}

// Device and platform specific features
FF-mobile-features {
  platform == "ios" and appVersion >= "2.1.0" -> json({
    "features": ["push_notifications", "biometric_auth", "offline_mode"],
    "ui": "ios_native"
  })
  
  platform == "android" and appVersion >= "2.1.0" -> json({
    "features": ["push_notifications", "fingerprint_auth", "offline_mode"],
    "ui": "material_design"
  })
  
  platform == "web" and browserName in ("chrome", "firefox", "safari") -> json({
    "features": ["push_notifications", "pwa_install"],
    "ui": "responsive"
  })
  
  // Fallback for older versions or unsupported platforms
  json({
    "features": ["basic_auth"],
    "ui": "basic"
  })
}

// Performance and load based features  
FF-performance-mode {
  // Reduce features under high load
  serverLoad > 80 -> json({
    "enableAnimations": false,
    "enableAnalytics": false,
    "cacheStrategy": "aggressive",
    "imageQuality": "low"
  })
  
  serverLoad > 60 -> json({
    "enableAnimations": true,
    "enableAnalytics": false, 
    "cacheStrategy": "moderate",
    "imageQuality": "medium"
  })
  
  // Normal performance mode
  json({
    "enableAnimations": true,
    "enableAnalytics": true,
    "cacheStrategy": "normal", 
    "imageQuality": "high"
  })
}

// Multi-condition complex feature
FF-advanced-search {
  // Enterprise customers with specific requirements
  tier == "enterprise" and 
  searchVolume > 10000 and 
  dataSize in ("large", "xlarge") and
  region in ("us-east", "eu-west") -> json({
    "searchEngine": "elasticsearch",
    "features": ["fuzzy_search", "autocomplete", "faceted_search", "ml_ranking"],
    "indexStrategy": "distributed",
    "cacheSize": "256MB"
  })
  
  // Premium customers 
  tier == "premium" and searchVolume > 1000 -> json({
    "searchEngine": "solr",
    "features": ["fuzzy_search", "autocomplete", "faceted_search"],
    "indexStrategy": "single_node",
    "cacheSize": "64MB"
  })
  
  // Basic search for everyone else
  json({
    "searchEngine": "basic",
    "features": ["exact_match"],
    "indexStrategy": "in_memory",
    "cacheSize": "16MB"
  })
}
`;

function demonstrateCompleteSystem() {
  console.log('🎯 Complete Feature Flag System Demo\n');
  
  // Create evaluator with caching enabled
  const evaluator = new Evaluator({ 
    cache: true, 
    throwOnError: false,
    defaultValue: false 
  });

  // Demo different user contexts
  const demoContexts = [
    {
      name: "🇺🇸 US Enterprise Customer",
      context: {
        countryCode: "US",
        tier: "enterprise",
        seats: 150,
        userType: "external",
        rolloutPercentage: 30,
        experimentGroup: "B",
        platform: "web",
        browserName: "chrome",
        appVersion: "2.1.0",
        serverLoad: 45,
        searchVolume: 15000,
        dataSize: "large",
        region: "us-east"
      }
    },
    {
      name: "🇳🇱 Dutch Premium Customer",
      context: {
        countryCode: "NL", 
        tier: "premium",
        seats: 25,
        userType: "external",
        rolloutPercentage: 80,
        experimentGroup: "A",
        platform: "ios",
        browserName: "safari",
        appVersion: "2.2.0",
        serverLoad: 70,
        searchVolume: 5000,
        dataSize: "medium",
        region: "eu-west"
      }
    },
    {
      name: "🆓 Free Tier User",
      context: {
        countryCode: "CA",
        tier: "free",
        seats: 1,
        userType: "external", 
        rolloutPercentage: 95,
        experimentGroup: "A",
        platform: "android",
        browserName: "chrome",
        appVersion: "2.0.5",
        serverLoad: 90,
        searchVolume: 50,
        dataSize: "small",
        region: "us-west"
      }
    }
  ];

  demoContexts.forEach((demo, index) => {
    console.log(`${demo.name}`);
    console.log('='.repeat(demo.name.length));
    
    evaluator.setContext(demo.context);
    
    // Simple feature checks
    console.log('\n📋 Basic Features:');
    console.log(`  New UI: ${isFeatureEnabled(featureFlagsConfig, 'FF-new-ui', demo.context)}`);
    console.log(`  Beta Features: ${isFeatureEnabled(featureFlagsConfig, 'FF-beta-features', demo.context)}`);
    console.log(`  API Timeout: ${evaluateFeatureFlag(featureFlagsConfig, 'FF-api-timeout', demo.context)}ms`);
    console.log(`  Theme: ${evaluateFeatureFlag(featureFlagsConfig, 'FF-button-color', demo.context)}`);
    
    // Regional features
    console.log('\n🌍 Regional Configuration:');
    const regionalConfig = evaluator.getFeatureValue<any>(
      featureFlagsConfig, 
      'FF-regional-features', 
      demo.context
    );
    console.log(`  Payment Methods: ${regionalConfig.paymentMethods?.join(', ')}`);
    console.log(`  Currency: ${regionalConfig.currency}`);
    console.log(`  Languages: ${regionalConfig.languageOptions?.join(', ') || 'English only'}`);
    
    // Premium features
    console.log('\n💎 Tier-based Features:');
    const premiumConfig = evaluator.getFeatureValue<any>(
      featureFlagsConfig, 
      'FF-premium-features', 
      demo.context
    );
    console.log(`  Features: ${premiumConfig.features?.join(', ') || 'None'}`);
    console.log(`  API Rate Limit: ${premiumConfig.apiRateLimit}/hour`);
    console.log(`  Storage: ${premiumConfig.storageLimit}`);
    
    // Dashboard rollout
    console.log('\n🚀 Feature Rollout:');
    const newDashboard = evaluator.isEnabled(featureFlagsConfig, 'FF-new-dashboard', demo.context);
    console.log(`  New Dashboard: ${newDashboard ? '✅ Enabled' : '❌ Disabled'}`);
    
    // A/B test
    console.log('\n🧪 A/B Testing:');
    const checkoutConfig = evaluator.getFeatureValue<any>(
      featureFlagsConfig, 
      'FF-checkout-flow', 
      demo.context
    );
    console.log(`  Checkout Variant: ${checkoutConfig.variant}`);
    console.log(`  Guest Checkout: ${checkoutConfig.guestCheckout ? 'Enabled' : 'Disabled'}`);
    
    // Platform features
    console.log('\n📱 Platform Features:');
    const mobileConfig = evaluator.getFeatureValue<any>(
      featureFlagsConfig, 
      'FF-mobile-features', 
      demo.context
    );
    console.log(`  Platform: ${demo.context.platform}`);
    console.log(`  Features: ${mobileConfig.features?.join(', ')}`);
    console.log(`  UI Style: ${mobileConfig.ui}`);
    
    // Performance mode
    console.log('\n⚡ Performance Settings:');
    const performanceConfig = evaluator.getFeatureValue<any>(
      featureFlagsConfig, 
      'FF-performance-mode', 
      demo.context
    );
    console.log(`  Server Load: ${demo.context.serverLoad}%`);
    console.log(`  Animations: ${performanceConfig.enableAnimations ? 'On' : 'Off'}`);
    console.log(`  Analytics: ${performanceConfig.enableAnalytics ? 'On' : 'Off'}`);
    console.log(`  Image Quality: ${performanceConfig.imageQuality}`);
    
    // Search configuration
    console.log('\n🔍 Search Engine:');
    const searchConfig = evaluator.getFeatureValue<any>(
      featureFlagsConfig, 
      'FF-advanced-search', 
      demo.context
    );
    console.log(`  Engine: ${searchConfig.searchEngine}`);
    console.log(`  Features: ${searchConfig.features?.join(', ')}`);
    console.log(`  Cache Size: ${searchConfig.cacheSize}`);
    
    if (index < demoContexts.length - 1) {
      console.log('\n' + '─'.repeat(60) + '\n');
    }
  });
}

function demonstrateValidationAndInfo() {
  console.log('\n🔧 System Validation & Information\n');
  
  const evaluator = new Evaluator();
  
  // Validate the configuration
  console.log('📝 Configuration Validation:');
  const validation = evaluator.validate(featureFlagsConfig);
  console.log(`  Valid: ${validation.valid ? '✅' : '❌'}`);
  if (!validation.valid) {
    console.log(`  Errors: ${validation.errors.join(', ')}`);
  }
  
  // Get feature information
  console.log('\n📊 Feature Flag Information:');
  const features = evaluator.getFeatureInfo(featureFlagsConfig);
  console.log(`  Total Features: ${features.length}`);
  
  const simpleFeatures = features.filter(f => f.type === 'simple');
  const complexFeatures = features.filter(f => f.type === 'complex');
  
  console.log(`  Simple Features: ${simpleFeatures.length}`);
  simpleFeatures.forEach(f => console.log(`    - ${f.name}`));
  
  console.log(`  Complex Features: ${complexFeatures.length}`);
  complexFeatures.forEach(f => console.log(`    - ${f.name}`));
}

function demonstrateConvenienceFunctions() {
  console.log('\n🛠️  Convenience Functions Demo\n');
  
  const context: EvaluationContext = {
    countryCode: "NL",
    tier: "premium",
    userType: "external",
    rolloutPercentage: 60
  };
  
  // Quick feature evaluation
  console.log('⚡ Quick Evaluations:');
  
  const newUiEnabled = isFeatureEnabled(featureFlagsConfig, 'FF-new-ui', context);
  console.log(`  New UI Enabled: ${newUiEnabled}`);
  
  const apiTimeout = evaluateFeatureFlag(featureFlagsConfig, 'FF-api-timeout', context);
  console.log(`  API Timeout: ${apiTimeout}ms`);
  
  const regionalConfig = evaluateFeatureFlag(featureFlagsConfig, 'FF-regional-features', context);
  console.log(`  Payment Methods: ${(regionalConfig as any).paymentMethods?.join(', ')}`);
  
  const dashboardEnabled = isFeatureEnabled(featureFlagsConfig, 'FF-new-dashboard', context);
  console.log(`  New Dashboard: ${dashboardEnabled ? 'Enabled' : 'Disabled'}`);
  
  console.log('\n💡 These functions are perfect for simple, one-off evaluations!');
}

function demonstrateErrorHandling() {
  console.log('\n🚨 Error Handling Demo\n');
  
  // Test with throwing errors
  console.log('🔥 Strict Mode (throws errors):');
  const strictEvaluator = new Evaluator({ throwOnError: true });
  
  try {
    strictEvaluator.evaluateFeature(featureFlagsConfig, 'FF-non-existent');
  } catch (error) {
    console.log(`  ✅ Caught expected error: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  // Test with graceful degradation
  console.log('\n🛡️  Graceful Mode (returns defaults):');
  const gracefulEvaluator = new Evaluator({ 
    throwOnError: false, 
    defaultValue: "fallback_value" 
  });
  
  const result = gracefulEvaluator.evaluateFeature(featureFlagsConfig, 'FF-non-existent');
  console.log(`  Missing feature result: ${result}`);
  
  // Test with context errors
  const contextErrorFlags = `
    FF-error-test {
      missingVariable == "test" -> true
      false
    }
  `;
  
  const errorResult = gracefulEvaluator.evaluateFeature(contextErrorFlags, 'FF-error-test');
  console.log(`  Context error result: ${errorResult}`);
}

// Run the complete demo
if (require.main === module) {
  try {
    demonstrateCompleteSystem();
    demonstrateValidationAndInfo();
    demonstrateConvenienceFunctions();
    demonstrateErrorHandling();
    
    console.log('\n✨ Complete system demo finished successfully!');
    console.log('\n🎉 The feature flag library is ready for production use!');
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}
