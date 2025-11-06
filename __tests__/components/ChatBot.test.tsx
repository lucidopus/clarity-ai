/**
 * ChatBot Component Tests
 * Tests for chat interface, message sending, and conversation display
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { mockChatConversation, mockVideo } from '../utils/test-helpers'
import ChatBot from '@/components/ChatBot'

describe('ChatBot', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should render chat interface', () => {
    render(<ChatBot videoId={mockVideo._id} />)

    expect(screen.getByPlaceholderText(/ask clara/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })

  it('should display existing conversation messages', () => {
    render(<ChatBot videoId={mockVideo._id} initialMessages={mockChatConversation.messages} />)

    mockChatConversation.messages.forEach((message) => {
      expect(screen.getByText(message.content)).toBeInTheDocument()
    })
  })

  it('should send user message', async () => {
    const mockResponse = {
      success: true,
      data: {
        answer: 'Supervised learning is...',
        conversationId: 'conv-123',
      },
    }

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => mockResponse,
      } as Response)
    )

    render(<ChatBot videoId={mockVideo._id} />)

    const input = screen.getByPlaceholderText(/ask clara/i)
    const sendButton = screen.getByRole('button', { name: /send/i })

    fireEvent.change(input, { target: { value: 'What is supervised learning?' } })
    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(screen.getByText('What is supervised learning?')).toBeInTheDocument()
      expect(screen.getByText(mockResponse.data.answer)).toBeInTheDocument()
    })

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/chatbot/ask',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('What is supervised learning?'),
      })
    )
  })

  it('should clear input after sending message', async () => {
    const mockResponse = {
      success: true,
      data: { answer: 'Response', conversationId: 'conv-123' },
    }

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => mockResponse,
      } as Response)
    )

    render(<ChatBot videoId={mockVideo._id} />)

    const input = screen.getByPlaceholderText(/ask clara/i) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Test question' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))

    await waitFor(() => {
      expect(input.value).toBe('')
    })
  })

  it('should disable send button while loading', async () => {
    global.fetch = jest.fn(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({ success: true, data: { answer: 'Response' } }),
              } as Response),
            100
          )
        )
    )

    render(<ChatBot videoId={mockVideo._id} />)

    const input = screen.getByPlaceholderText(/ask clara/i)
    const sendButton = screen.getByRole('button', { name: /send/i })

    fireEvent.change(input, { target: { value: 'Test' } })
    fireEvent.click(sendButton)

    expect(sendButton).toBeDisabled()

    await waitFor(() => {
      expect(sendButton).not.toBeDisabled()
    })
  })

  it('should show loading indicator while waiting for response', async () => {
    global.fetch = jest.fn(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({ success: true, data: { answer: 'Response' } }),
              } as Response),
            100
          )
        )
    )

    render(<ChatBot videoId={mockVideo._id} />)

    const input = screen.getByPlaceholderText(/ask clara/i)
    fireEvent.change(input, { target: { value: 'Test' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))

    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument()
    })
  })

  it('should handle API errors gracefully', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        json: async () => ({ success: false, error: 'Server error' }),
      } as Response)
    )

    render(<ChatBot videoId={mockVideo._id} />)

    const input = screen.getByPlaceholderText(/ask clara/i)
    fireEvent.change(input, { target: { value: 'Test question' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))

    await waitFor(() => {
      expect(screen.getByText(/error|failed/i)).toBeInTheDocument()
    })
  })

  it('should scroll to bottom when new messages arrive', async () => {
    const scrollIntoViewMock = jest.fn()
    Element.prototype.scrollIntoView = scrollIntoViewMock

    const mockResponse = {
      success: true,
      data: { answer: 'Response', conversationId: 'conv-123' },
    }

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => mockResponse,
      } as Response)
    )

    render(<ChatBot videoId={mockVideo._id} />)

    const input = screen.getByPlaceholderText(/ask clara/i)
    fireEvent.change(input, { target: { value: 'Test' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))

    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalled()
    })
  })

  it('should prevent sending empty messages', () => {
    render(<ChatBot videoId={mockVideo._id} />)

    const sendButton = screen.getByRole('button', { name: /send/i })
    expect(sendButton).toBeDisabled()

    const input = screen.getByPlaceholderText(/ask clara/i)
    fireEvent.change(input, { target: { value: '   ' } })
    expect(sendButton).toBeDisabled()
  })

  it('should support Enter key to send message', async () => {
    const mockResponse = {
      success: true,
      data: { answer: 'Response', conversationId: 'conv-123' },
    }

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => mockResponse,
      } as Response)
    )

    render(<ChatBot videoId={mockVideo._id} />)

    const input = screen.getByPlaceholderText(/ask clara/i)
    fireEvent.change(input, { target: { value: 'Test question' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

    await waitFor(() => {
      expect(screen.getByText('Test question')).toBeInTheDocument()
    })

    expect(global.fetch).toHaveBeenCalled()
  })

  it('should distinguish user and assistant messages visually', () => {
    const messages = [
      { role: 'user', content: 'User message', timestamp: new Date() },
      { role: 'assistant', content: 'Assistant message', timestamp: new Date() },
    ]

    render(<ChatBot videoId={mockVideo._id} initialMessages={messages} />)

    const userMessage = screen.getByText('User message').closest('div')
    const assistantMessage = screen.getByText('Assistant message').closest('div')

    expect(userMessage).toHaveClass('user-message')
    expect(assistantMessage).toHaveClass('assistant-message')
  })

  it('should display timestamps for messages', () => {
    render(<ChatBot videoId={mockVideo._id} initialMessages={mockChatConversation.messages} />)

    // Should have timestamp elements
    const timestamps = screen.getAllByTestId('message-timestamp')
    expect(timestamps.length).toBe(mockChatConversation.messages.length)
  })
})
