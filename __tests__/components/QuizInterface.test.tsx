/**
 * QuizInterface Component Tests
 * Tests for quiz display, answer selection, and score calculation
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { mockQuiz } from '../utils/test-helpers'
import QuizInterface from '@/components/QuizInterface'

describe('QuizInterface', () => {
  const mockOnComplete = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render first quiz question', () => {
    render(<QuizInterface quiz={mockQuiz} onComplete={mockOnComplete} />)

    expect(screen.getByText(mockQuiz.questions[0].question)).toBeInTheDocument()
  })

  it('should display all answer options for multiple choice', () => {
    render(<QuizInterface quiz={mockQuiz} onComplete={mockOnComplete} />)

    const question = mockQuiz.questions[0]
    if (question.type === 'multiple-choice' && question.options) {
      question.options.forEach((option) => {
        expect(screen.getByText(option)).toBeInTheDocument()
      })
    }
  })

  it('should allow selecting an answer', () => {
    render(<QuizInterface quiz={mockQuiz} onComplete={mockOnComplete} />)

    const option = screen.getByText('Machine Learning')
    fireEvent.click(option)

    expect(option.closest('button')).toHaveClass('selected')
  })

  it('should navigate to next question after answering', async () => {
    render(<QuizInterface quiz={mockQuiz} onComplete={mockOnComplete} />)

    // Answer first question
    const option = screen.getByText('Machine Learning')
    fireEvent.click(option)

    const nextButton = screen.getByText('Next Question')
    fireEvent.click(nextButton)

    await waitFor(() => {
      expect(screen.getByText(mockQuiz.questions[1].question)).toBeInTheDocument()
    })
  })

  it('should show progress indicator', () => {
    render(<QuizInterface quiz={mockQuiz} onComplete={mockOnComplete} />)

    expect(screen.getByText(`Question 1 of ${mockQuiz.questions.length}`)).toBeInTheDocument()
  })

  it('should calculate and display final score', async () => {
    render(<QuizInterface quiz={mockQuiz} onComplete={mockOnComplete} />)

    // Answer all questions correctly
    for (const question of mockQuiz.questions) {
      if (question.type === 'multiple-choice') {
        const correctOption = screen.getByText(question.correctAnswer)
        fireEvent.click(correctOption)
      } else if (question.type === 'true-false') {
        const correctOption = screen.getByText(
          question.correctAnswer === 'true' ? 'True' : 'False'
        )
        fireEvent.click(correctOption)
      }

      const nextButton = screen.getByText(/next question|submit quiz/i)
      fireEvent.click(nextButton)
    }

    await waitFor(() => {
      expect(screen.getByText(/100%|perfect score/i)).toBeInTheDocument()
    })
  })

  it('should show explanations after each question', async () => {
    render(<QuizInterface quiz={mockQuiz} onComplete={mockOnComplete} />)

    const option = screen.getByText('Machine Learning')
    fireEvent.click(option)

    const submitButton = screen.getByText('Submit Answer')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(mockQuiz.questions[0].explanation)).toBeInTheDocument()
    })
  })

  it('should indicate correct and incorrect answers', async () => {
    render(<QuizInterface quiz={mockQuiz} onComplete={mockOnComplete} />)

    const wrongOption = screen.getByText('Manual Labor')
    fireEvent.click(wrongOption)

    const submitButton = screen.getByText('Submit Answer')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByTestId('incorrect-indicator')).toBeInTheDocument()
      expect(screen.getByText(mockQuiz.questions[0].correctAnswer)).toHaveClass('correct')
    })
  })

  it('should call onComplete with quiz results', async () => {
    render(<QuizInterface quiz={mockQuiz} onComplete={mockOnComplete} />)

    // Complete the quiz
    for (let i = 0; i < mockQuiz.questions.length; i++) {
      const question = mockQuiz.questions[i]
      const correctOption = screen.getByText(
        question.type === 'true-false'
          ? question.correctAnswer === 'true'
            ? 'True'
            : 'False'
          : question.correctAnswer
      )
      fireEvent.click(correctOption)

      const nextButton = screen.getByText(
        i === mockQuiz.questions.length - 1 ? 'Submit Quiz' : 'Next Question'
      )
      fireEvent.click(nextButton)
    }

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          score: expect.any(Number),
          totalQuestions: mockQuiz.questions.length,
          correctAnswers: expect.any(Number),
        })
      )
    })
  })

  it('should prevent changing answers after submission', async () => {
    render(<QuizInterface quiz={mockQuiz} onComplete={mockOnComplete} />)

    const option = screen.getByText('Machine Learning')
    fireEvent.click(option)

    const submitButton = screen.getByText('Submit Answer')
    fireEvent.click(submitButton)

    await waitFor(() => {
      const allOptions = screen.getAllByRole('button')
      allOptions.forEach((btn) => {
        if (btn.textContent?.match(/next question/i)) return
        expect(btn).toBeDisabled()
      })
    })
  })

  it('should display quiz completion summary', async () => {
    render(<QuizInterface quiz={mockQuiz} onComplete={mockOnComplete} />)

    // Complete quiz with mixed results
    const answers = ['Machine Learning', 'false'] // First correct, second wrong

    for (let i = 0; i < mockQuiz.questions.length; i++) {
      const option = screen.getByText(
        mockQuiz.questions[i].type === 'true-false'
          ? answers[i] === 'true'
            ? 'True'
            : 'False'
          : answers[i]
      )
      fireEvent.click(option)

      const nextButton = screen.getByText(
        i === mockQuiz.questions.length - 1 ? 'Submit Quiz' : /next question|submit answer/i
      )
      fireEvent.click(nextButton)

      if (i < mockQuiz.questions.length - 1) {
        const continueButton = screen.getByText('Next Question')
        fireEvent.click(continueButton)
      }
    }

    await waitFor(() => {
      expect(screen.getByText(/quiz complete/i)).toBeInTheDocument()
      expect(screen.getByText(/your score:/i)).toBeInTheDocument()
    })
  })
})
