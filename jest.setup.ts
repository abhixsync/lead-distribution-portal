import '@testing-library/jest-dom'

// Radix UI primitives (e.g. Select) rely on pointer-capture and scroll APIs
// that jsdom doesn't implement. Polyfill them so component tests can drive them.
// Guarded by `typeof window` because some suites run in the node environment.
if (typeof window !== 'undefined') {
  window.HTMLElement.prototype.scrollIntoView = jest.fn()
  window.HTMLElement.prototype.hasPointerCapture = jest.fn()
  window.HTMLElement.prototype.releasePointerCapture = jest.fn()
  window.HTMLElement.prototype.setPointerCapture = jest.fn()
}

// Silence application logging during tests. Suites that exercise retry/error
// paths legitimately log a lot; muting console keeps the test output to just
// PASS/FAIL. Tests that assert on console can still spy/override locally.
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
  jest.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  jest.clearAllMocks()
})
