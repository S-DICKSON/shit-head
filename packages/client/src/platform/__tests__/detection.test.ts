import { describe, it, expect, afterEach } from 'vitest'
import { detectPlatform } from '../detection'

describe('detectPlatform', () => {
  // Store originals so we can restore after each test
  let originalTop: typeof window.top
  let originalSearch: string

  afterEach(() => {
    // Restore window.top to its original value
    if (originalTop !== undefined) {
      Object.defineProperty(window, 'top', {
        value: originalTop,
        configurable: true,
        writable: true,
      })
      originalTop = undefined as typeof window.top
    }
    // Restore window.location.search
    if (originalSearch !== undefined) {
      Object.defineProperty(window, 'location', {
        value: { ...window.location, search: originalSearch },
        configurable: true,
        writable: true,
      })
      originalSearch = undefined as typeof originalSearch
    }
  })

  it('returns web when not in iframe (default jsdom state)', () => {
    // jsdom: window.self === window.top by default (not in iframe)
    expect(detectPlatform()).toBe('web')
  })

  it('returns web when in iframe but no Discord params present', () => {
    // Save and simulate iframe by making window.top different from window.self
    originalTop = window.top
    Object.defineProperty(window, 'top', {
      value: {},
      configurable: true,
      writable: true,
    })
    // No query params — location.search is empty by default in jsdom
    expect(detectPlatform()).toBe('web')
  })

  it('returns discord when in iframe with both frame_id and instance_id params', () => {
    // Simulate iframe
    originalTop = window.top
    Object.defineProperty(window, 'top', {
      value: {},
      configurable: true,
      writable: true,
    })
    // Set Discord query params
    originalSearch = window.location.search
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?frame_id=abc123&instance_id=xyz789' },
      configurable: true,
      writable: true,
    })
    expect(detectPlatform()).toBe('discord')
  })

  it('returns web when in iframe with only frame_id (missing instance_id)', () => {
    // Simulate iframe
    originalTop = window.top
    Object.defineProperty(window, 'top', {
      value: {},
      configurable: true,
      writable: true,
    })
    // Only frame_id — instance_id is missing
    originalSearch = window.location.search
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?frame_id=abc123' },
      configurable: true,
      writable: true,
    })
    expect(detectPlatform()).toBe('web')
  })

  it('returns web when in iframe with only instance_id (missing frame_id)', () => {
    // Simulate iframe
    originalTop = window.top
    Object.defineProperty(window, 'top', {
      value: {},
      configurable: true,
      writable: true,
    })
    // Only instance_id — frame_id is missing
    originalSearch = window.location.search
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?instance_id=xyz789' },
      configurable: true,
      writable: true,
    })
    expect(detectPlatform()).toBe('web')
  })
})
