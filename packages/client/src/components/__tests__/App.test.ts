import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import App from '../../App.vue'

describe('App.vue', () => {
  it('renders the app title', () => {
    const wrapper = mount(App)
    expect(wrapper.text()).toContain('Shithead Online')
  })

  it('displays the version from shared package', () => {
    const wrapper = mount(App)
    expect(wrapper.text()).toContain('0.0.1')
  })
})
