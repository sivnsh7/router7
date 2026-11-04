import { describe, it, expect } from 'vitest'
import {
  judgeModelById,
  estimateContextWindow,
  detectToolCalls,
  detectVision,
  classifyReasoning,
  estimateParameterCount,
} from '../../services/model-id-intelligence'

describe('model-id-intelligence', () => {
  describe('judgeModelById', () => {
    it('accurately identifies frontier reasoning models', () => {
      const judgment = judgeModelById('deepseek-r1-671b', 'deepseek')
      expect(judgment.sizeLabel).toBe('Frontier')
      expect(judgment.intelligenceRank).toBe(1)
      expect(judgment.isReasoning).toBe(true)
      expect(judgment.parameterCountBillions).toBe(671)
    })

    it('accurately identifies o-series OpenAI models', () => {
      const o1 = judgeModelById('o1', 'openai')
      expect(o1.isReasoning).toBe(true)
      expect(o1.sizeLabel).toBe('Frontier')
      expect(o1.intelligenceRank).toBe(1)

      const o3mini = judgeModelById('o3-mini', 'openai')
      expect(o3mini.isReasoning).toBe(true)
      expect(o3mini.sizeLabel).toBe('Frontier')
    })

    it('identifies parameter count and MoE patterns', () => {
      const llama70b = judgeModelById('meta-llama/llama-3.3-70b-instruct', 'openrouter')
      expect(llama70b.parameterCountBillions).toBe(70)
      expect(llama70b.sizeLabel).toBe('Large')

      const mixtral = judgeModelById('mistralai/mixtral-8x7b-instruct', 'openrouter')
      expect(mixtral.parameterCountBillions).toBe(56)

      const small = judgeModelById('qwen2.5-coder-7b-instruct')
      expect(small.parameterCountBillions).toBe(7)
      expect(small.sizeLabel).toBe('Small')
    })

    it('recognizes speed variants and adjusts speedRank accordingly', () => {
      const flash = judgeModelById('gemini-2.5-flash', 'google')
      const pro = judgeModelById('gemini-2.5-pro', 'google')
      // Lower speedRank number = faster (e.g. 2 is faster than 9)
      expect(flash.speedRank).toBeLessThan(pro.speedRank)
      // Lower intelligenceRank number = smarter (e.g. 4 is smarter than 24)
      expect(pro.intelligenceRank).toBeLessThan(flash.intelligenceRank)
    })

    it('detects vision and tool call capabilities', () => {
      const visionModel = judgeModelById('claude-3-5-sonnet-20241022')
      expect(visionModel.supportsVision).toBe(true)
      expect(visionModel.supportsTools).toBe(true)

      const qwq = judgeModelById('qwq-32b-preview')
      expect(qwq.isReasoning).toBe(true)
      expect(qwq.parameterCountBillions).toBe(32)
    })

    it('handles unknown fallback models gracefully', () => {
      const unknown = judgeModelById('custom-internal-llm')
      expect(unknown.intelligenceRank).toBeGreaterThan(0)
      expect(unknown.estimatedContextWindow).toBeGreaterThanOrEqual(4096)
      expect(unknown.sizeLabel).toBeDefined()
    })
  })

  describe('estimateContextWindow', () => {
    it('detects explicit context window suffixes like 128k, 1m, 200k', () => {
      expect(estimateContextWindow('llama-3.1-8b-instruct-128k')).toBe(131072)
      expect(estimateContextWindow('gemini-1.5-pro-1m')).toBe(1048576)
      expect(estimateContextWindow('model-200k')).toBe(204800)
    })

    it('assigns high context to known platforms and models', () => {
      expect(estimateContextWindow('gemini-2.5-flash')).toBe(1048576)
      expect(estimateContextWindow('claude-3-7-sonnet')).toBe(200000)
    })
  })

  describe('detectToolCalls', () => {
    it('returns false for no-tools or embedding models', () => {
      expect(detectToolCalls('text-embedding-3-small')).toBe(false)
      expect(detectToolCalls('bge-large-en-v1.5')).toBe(false)
      expect(detectToolCalls('llama-3-no-tools')).toBe(false)
    })

    it('returns true for general instruct and chat models', () => {
      expect(detectToolCalls('gpt-4o')).toBe(true)
      expect(detectToolCalls('claude-3-5-sonnet')).toBe(true)
      expect(detectToolCalls('deepseek-chat')).toBe(true)
    })
  })

  describe('detectVision', () => {
    it('identifies vision, vl, multimodal models', () => {
      expect(detectVision('qwen2.5-vl-72b-instruct')).toBe(true)
      expect(detectVision('llama-3.2-11b-vision-instruct')).toBe(true)
      expect(detectVision('gemini-2.5-flash')).toBe(true)
      expect(detectVision('gpt-4o')).toBe(true)
    })

    it('returns false for text-only models', () => {
      expect(detectVision('deepseek-coder-6.7b')).toBe(false)
    })
  })

  describe('classifyReasoning', () => {
    it('detects reasoning models', () => {
      expect(classifyReasoning('deepseek-r1').isReasoning).toBe(true)
      expect(classifyReasoning('o3-mini').isReasoning).toBe(true)
      expect(classifyReasoning('qwq-32b').isReasoning).toBe(true)
      expect(classifyReasoning('gpt-4o').isReasoning).toBe(false)
    })
  })

  describe('estimateParameterCount', () => {
    it('parses billions and millions', () => {
      expect(estimateParameterCount('meta-llama/llama-3.1-405b')).toBe(405)
      expect(estimateParameterCount('deepseek-v3-671b')).toBe(671)
      expect(estimateParameterCount('qwen-2.5-32b')).toBe(32)
      expect(estimateParameterCount('qwen-2.5-1.5b')).toBe(1.5)
      expect(estimateParameterCount('smollm-135m')).toBe(0.135)
    })
  })
})
