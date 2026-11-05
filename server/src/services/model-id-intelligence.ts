
export interface ModelIntelligenceJudgment {
  modelId: string;
  sizeLabel: 'Frontier' | 'Large' | 'Medium' | 'Small';
  intelligenceRank: number; // 1 (highest) to 50
  speedRank: number;        // 1 (fastest) to 10
  reliabilityPrior: number; // 0.0 to 1.0
  isFast: boolean;
  isHighIntelligence: boolean;
  isReasoning: boolean;
  estimatedContextWindow: number;
  supportsTools: boolean;
  supportsVision: boolean;
  parameterCountBillions?: number;
}

/**
 * Extracts estimated parameter count in billions from model name, e.g. "llama-3-70b" -> 70,
 * "qwen-2.5-32b-instruct" -> 32, "deepseek-v3-671b" -> 671, "mistral-8x7b" -> 56.
 */
export function extractParameterCount(id: string): number | undefined {
  const lower = id.toLowerCase();
  
  // MoE format: e.g. 8x7b, 8x22b, 16x12b
  const moeMatch = lower.match(/(?:^|[_\-/:])(\d+)x(\d+(?:\.\d+)?)[bB](?:[_\-/:.]|$)/);
  if (moeMatch) {
    const experts = Number.parseFloat(moeMatch[1]);
    const size = Number.parseFloat(moeMatch[2]);
    if (!Number.isNaN(experts) && !Number.isNaN(size)) {
      return experts * size;
    }
  }

  // Standard format: e.g. 70b, 405b, 8b, 1.5b
  const paramMatch = lower.match(/(?:^|[_\-/:])(\d+(?:\.\d+)?)[bB](?:[_\-/:.]|$)/);
  if (paramMatch) {
    const val = Number.parseFloat(paramMatch[1]);
    if (!Number.isNaN(val)) return val;
  }

  // Millions format: e.g. 135m -> 0.135
  const mMatch = lower.match(/(?:^|[_\-/:])(\d+(?:\.\d+)?)[mM](?:[_\-/:.]|$)/);
  if (mMatch) {
    const val = Number.parseFloat(mMatch[1]);
    if (!Number.isNaN(val)) return val / 1000;
  }

  return undefined;
}

export const estimateParameterCount = extractParameterCount;

export function classifyReasoning(id: string): { isReasoning: boolean; defaultBudget?: number } {
  const lower = id.toLowerCase();
  const isReasoning = /(?:^|[_\-/:])(?:r1|o1|o3|o4|qwq|reasoning|reasoner|thinking|thought)(?:[_\-/:.]|$)/i.test(lower)
    || lower.includes('deepseek-r1') || lower.includes('o1-') || lower.includes('o3-') || lower.includes('thinking');
  return { isReasoning, defaultBudget: isReasoning ? 8192 : undefined };
}

export function detectVision(id: string): boolean {
  const lower = id.toLowerCase();
  return /(?:^|[_\-/:])(?:vision|vl|visual|omni|multimodal|pixtral|llava|internvl|cogvlm|moondream|4o)(?:[_\-/:.]|$)/i.test(lower)
    || lower.includes('-vl') || lower.includes('vision') || lower.includes('gpt-4o') || lower.includes('gemini')
    || lower.includes('claude-3') || lower.includes('sonnet') || lower.includes('opus');
}

export function detectToolCalls(id: string): boolean {
  const lower = id.toLowerCase();
  if (/(?:base|pretrained|pretrain|embed|embedding|rerank|tts|audio|image|flux|whisper|no-tools)/i.test(lower)) {
    return false;
  }
  const { isReasoning } = classifyReasoning(id);
  return /(?:instruct|chat|it|tuned|turbo|gpt|claude|gemini|llama|qwen|mistral|deepseek)/i.test(lower) || isReasoning;
}

export function estimateContextWindow(id: string): number {
  const lower = id.toLowerCase();
  const explicitMatch = lower.match(/(\d+)[kK](?:[_\-/:.]|$)/);
  if (explicitMatch) {
    return Number.parseInt(explicitMatch[1], 10) * 1024;
  }
  const explicitM = lower.match(/(\d+)[mM](?:[_\-/:.]|$)/);
  if (explicitM) {
    return Number.parseInt(explicitM[1], 10) * 1024 * 1024;
  }
  if (/gemini/i.test(lower)) {
    return 1048576; // 1M
  } else if (/claude/i.test(lower)) {
    return 200000; // 200k
  } else if (/qwen-2[.-]5|deepseek-v3|deepseek-r1|mistral-large|codestral|llama-3/i.test(lower)) {
    return 131072; // 128k
  } else if (/llama-2|gemma-1/i.test(lower)) {
    return 8192;
  }
  return 131072;
}

/**
 * Automatically analyzes any model id string and determines its intelligence tier,
 * intelligence rank, speed rank, reliability prior, and hardware capabilities.
 */
export function judgeModelById(modelId: string, _platform?: string): ModelIntelligenceJudgment {
  const rawId = modelId.trim();
  const lower = rawId.toLowerCase();
  const params = extractParameterCount(lower);
  const { isReasoning } = classifyReasoning(lower);
  const supportsVision = detectVision(lower);
  const supportsTools = detectToolCalls(lower);
  const estimatedContextWindow = estimateContextWindow(lower);

  // 4. Intelligence Tier & Rank determination
  let sizeLabel: 'Frontier' | 'Large' | 'Medium' | 'Small' = 'Medium';
  let intelligenceRank = 20;

  if (
    isReasoning ||
    (params !== undefined && params >= 100) ||
    /(?:opus|ultra|max|pro|frontier|405b|671b|235b|120b|gpt-4|claude-3[.-]5-sonnet|claude-3[.-]7|gemini-2[.-]5-pro|gemini-1[.-]5-pro)/i.test(lower)
  ) {
    sizeLabel = 'Frontier';
    if (isReasoning) {
      intelligenceRank = /(?:r1|o3|o1|qwq)/i.test(lower) ? 1 : 2;
    } else if (params && params >= 400) {
      intelligenceRank = 2;
    } else if (params && params >= 200) {
      intelligenceRank = 3;
    } else if (/opus|claude-3[.-]7/i.test(lower)) {
      intelligenceRank = 1;
    } else {
      intelligenceRank = 4;
    }
  } else if (
    (params !== undefined && params >= 50 && params < 100) ||
    /(?:70b|72b|sonnet|plus|large|command-r-plus|qwen-2[.-]5-72b|mistral-large)/i.test(lower)
  ) {
    sizeLabel = 'Large';
    if (params && params >= 70) {
      intelligenceRank = 8;
    } else {
      intelligenceRank = 12;
    }
  } else if (
    (params !== undefined && params >= 12 && params < 50) ||
    /(?:14b|16b|20b|27b|32b|34b|haiku|flash|medium|command-r|gemma-2-27b|mistral-small)/i.test(lower)
  ) {
    sizeLabel = 'Medium';
    if (params && params >= 30) {
      intelligenceRank = 18;
    } else {
      intelligenceRank = 24;
    }
  } else if (
    (params !== undefined && params < 12) ||
    /(?:nano|mini|micro|tiny|small|lite|flash-lite|1b|2b|3b|4b|7b|8b|9b)/i.test(lower)
  ) {
    sizeLabel = 'Small';
    if (params && params <= 3) {
      intelligenceRank = 35;
    } else {
      intelligenceRank = 28;
    }
  }

  // 5. Speed Rank determination (1 = fastest, 10 = slowest)
  let speedRank = 5;
  const isFast = /(?:flash|instant|fast|turbo|nano|mini|tiny|small|1b|2b|3b|lite)/i.test(lower);

  if (isReasoning) {
    // Deep reasoning takes longer tokens/thinking
    speedRank = /(?:o3-mini|flash)/i.test(lower) ? 5 : 9;
  } else if (/(?:flash-lite|nano|1b|2b|tiny|instant)/i.test(lower)) {
    speedRank = 1;
  } else if (/(?:flash|turbo|fast|(?:^|[_\-/:])mini(?:[_\-/:.]|$)|3b|7b|8b)/i.test(lower)) {
    speedRank = 2;
  } else if (sizeLabel === 'Small' || /(?:haiku|lite|14b)/i.test(lower)) {
    speedRank = 3;
  } else if (sizeLabel === 'Medium' || /(?:sonnet|27b|32b)/i.test(lower)) {
    speedRank = 5;
  } else if (sizeLabel === 'Large' || /(?:70b|72b|large)/i.test(lower)) {
    speedRank = 7;
  } else {
    // Frontier massive models
    speedRank = 9;
  }

  // 6. Reliability Prior (0.0 to 1.0)
  let reliabilityPrior = 0.90;
  // Major battle-tested families get high reliability
  if (/(?:google|openai|anthropic|meta|mistral|deepseek|qwen)/i.test(lower)) {
    reliabilityPrior = 0.95;
  }
  // Free promotional or community endpoints may experience more rate-limits or drops
  if (lower.includes(':free') || lower.includes('community') || lower.includes('volunteer')) {
    reliabilityPrior = 0.82;
  }
  // Experimental / preview tags
  if (/(?:preview|exp|alpha|beta|nightly|test)/i.test(lower)) {
    reliabilityPrior = Math.min(reliabilityPrior, 0.85);
  }

  return {
    modelId: rawId,
    sizeLabel,
    intelligenceRank,
    speedRank,
    reliabilityPrior,
    isFast,
    isHighIntelligence: sizeLabel === 'Frontier' || sizeLabel === 'Large',
    isReasoning,
    estimatedContextWindow,
    supportsTools,
    supportsVision,
    parameterCountBillions: params,
  };
}
