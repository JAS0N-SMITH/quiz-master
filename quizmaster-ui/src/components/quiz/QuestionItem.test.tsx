import { render, screen, fireEvent } from '@testing-library/react';
import { QuestionItem } from './QuestionItem';
import type { Question } from '@/types';

describe('QuestionItem', () => {
  const mockQuestion: Question = {
    id: 'q1',
    text: 'What is the capital of France?',
    options: ['London', 'Berlin', 'Paris', 'Madrid'],
    order: 1,
  };

  it('renders question text and all options', () => {
    render(
      <QuestionItem
        question={mockQuestion}
        questionNumber={1}
        selectedOption={undefined}
        onSelect={jest.fn()}
      />,
    );

    expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
    expect(screen.getByText('London')).toBeInTheDocument();
    expect(screen.getByText('Berlin')).toBeInTheDocument();
    expect(screen.getByText('Paris')).toBeInTheDocument();
    expect(screen.getByText('Madrid')).toBeInTheDocument();
  });

  it('calls onSelect when option is clicked', () => {
    const onSelect = jest.fn();

    render(
      <QuestionItem
        question={mockQuestion}
        questionNumber={1}
        selectedOption={undefined}
        onSelect={onSelect}
      />,
    );

    const parisLabel = screen.getByText('Paris');
    fireEvent.click(parisLabel);

    expect(onSelect).toHaveBeenCalledWith('q1', 2);
  });

  it('displays selected option', () => {
    render(
      <QuestionItem
        question={mockQuestion}
        questionNumber={1}
        selectedOption={2}
        onSelect={jest.fn()}
      />,
    );

    const parisRadio = screen.getByLabelText('Paris');
    expect(parisRadio).toBeChecked();
  });

  it('disables interaction when disabled prop is true', () => {
    const onSelect = jest.fn();

    render(
      <QuestionItem
        question={mockQuestion}
        questionNumber={1}
        selectedOption={undefined}
        onSelect={onSelect}
        disabled={true}
      />,
    );

    const parisLabel = screen.getByText('Paris');
    fireEvent.click(parisLabel);

    expect(onSelect).not.toHaveBeenCalled();
  });
});
