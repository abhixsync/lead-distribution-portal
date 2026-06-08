import '@testing-library/jest-dom'

// Mock Socket.IO global for API route tests
// In the real app, global.socketIO is set by server.ts before any request is handled
beforeEach(() => {
  ;(global as any).socketIO = {
    emit: jest.fn(),
    on: jest.fn(),
    to: jest.fn().mockReturnThis(),
  }
})

afterEach(() => {
  jest.clearAllMocks()
})
