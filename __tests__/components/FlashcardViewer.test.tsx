/**
 * FlashcardViewer Component Tests
 * Tests for flashcard display, flip animation, and navigation
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { mockFlashcards } from '../utils/test-helpers'
import FlashcardViewer from '@/components/FlashcardViewer'

describe('FlashcardViewer', () => {
  const mockOnMastered = jest.fn()
  const mockOnNext = jest.fn()
  const mockOnPrevious = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render flashcard front initially', () => {
    render(
      <FlashcardViewer
        flashcards={mockFlashcards}
        currentIndex={0}
        onMastered={mockOnMastered}
        onNext={mockOnNext}
        onPrevious={mockOnPrevious}
      />
    )

    expect(screen.getByText(mockFlashcards[0].front)).toBeInTheDocument()
  })

  it('should flip card when clicked', async () => {
    render(
      <FlashcardViewer
        flashcards={mockFlashcards}
        currentIndex={0}
        onMastered={mockOnMastered}
        onNext={mockOnNext}
        onPrevious={mockOnPrevious}
      />
    )

    const card = screen.getByTestId('flashcard')
    fireEvent.click(card)

    await waitFor(() => {
      expect(screen.getByText(mockFlashcards[0].back)).toBeInTheDocument()
    })
  })

  it('should navigate to next flashcard', () => {
    render(
      <FlashcardViewer
        flashcards={mockFlashcards}
        currentIndex={0}
        onMastered={mockOnMastered}
        onNext={mockOnNext}
        onPrevious={mockOnPrevious}
      />
    )

    const nextButton = screen.getByLabelText('Next flashcard')
    fireEvent.click(nextButton)

    expect(mockOnNext).toHaveBeenCalledTimes(1)
  })

  it('should navigate to previous flashcard', () => {
    render(
      <FlashcardViewer
        flashcards={mockFlashcards}
        currentIndex={1}
        onMastered={mockOnMastered}
        onNext={mockOnNext}
        onPrevious={mockOnPrevious}
      />
    )

    const prevButton = screen.getByLabelText('Previous flashcard')
    fireEvent.click(prevButton)

    expect(mockOnPrevious).toHaveBeenCalledTimes(1)
  })

  it('should disable previous button on first card', () => {
    render(
      <FlashcardViewer
        flashcards={mockFlashcards}
        currentIndex={0}
        onMastered={mockOnMastered}
        onNext={mockOnNext}
        onPrevious={mockOnPrevious}
      />
    )

    const prevButton = screen.getByLabelText('Previous flashcard')
    expect(prevButton).toBeDisabled()
  })

  it('should disable next button on last card', () => {
    render(
      <FlashcardViewer
        flashcards={mockFlashcards}
        currentIndex={mockFlashcards.length - 1}
        onMastered={mockOnMastered}
        onNext={mockOnNext}
        onPrevious={mockOnPrevious}
      />
    )

    const nextButton = screen.getByLabelText('Next flashcard')
    expect(nextButton).toBeDisabled()
  })

  it('should mark flashcard as mastered', () => {
    render(
      <FlashcardViewer
        flashcards={mockFlashcards}
        currentIndex={0}
        onMastered={mockOnMastered}
        onNext={mockOnNext}
        onPrevious={mockOnPrevious}
      />
    )

    const masteredButton = screen.getByText('Mark as Mastered')
    fireEvent.click(masteredButton)

    expect(mockOnMastered).toHaveBeenCalledWith(mockFlashcards[0]._id)
  })

  it('should display progress indicator', () => {
    render(
      <FlashcardViewer
        flashcards={mockFlashcards}
        currentIndex={0}
        onMastered={mockOnMastered}
        onNext={mockOnNext}
        onPrevious={mockOnPrevious}
      />
    )

    expect(screen.getByText(`1 / ${mockFlashcards.length}`)).toBeInTheDocument()
  })

  it('should support keyboard navigation', () => {
    render(
      <FlashcardViewer
        flashcards={mockFlashcards}
        currentIndex={0}
        onMastered={mockOnMastered}
        onNext={mockOnNext}
        onPrevious={mockOnPrevious}
      />
    )

    // Arrow right for next
    fireEvent.keyDown(document, { key: 'ArrowRight' })
    expect(mockOnNext).toHaveBeenCalled()

    // Arrow left for previous
    fireEvent.keyDown(document, { key: 'ArrowLeft' })
    expect(mockOnPrevious).toHaveBeenCalled()

    // Space for flip
    const card = screen.getByTestId('flashcard')
    fireEvent.keyDown(card, { key: ' ' })
    // Should flip the card
  })

  it('should show difficulty indicator', () => {
    render(
      <FlashcardViewer
        flashcards={mockFlashcards}
        currentIndex={0}
        onMastered={mockOnMastered}
        onNext={mockOnNext}
        onPrevious={mockOnPrevious}
      />
    )

    expect(screen.getByText(mockFlashcards[0].difficulty)).toBeInTheDocument()
  })

  it('should handle empty flashcards array', () => {
    render(
      <FlashcardViewer
        flashcards={[]}
        currentIndex={0}
        onMastered={mockOnMastered}
        onNext={mockOnNext}
        onPrevious={mockOnPrevious}
      />
    )

    expect(screen.getByText(/no flashcards/i)).toBeInTheDocument()
  })
})
