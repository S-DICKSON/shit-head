import { describe, it, expect } from 'vitest'
import { APP_VERSION } from '@shit-head/shared'

describe('Health endpoint', () => {
  it('version constant is defined', () => {
    expect(APP_VERSION).toBeDefined()
    expect(APP_VERSION).toBe('0.0.1')
  })
})
