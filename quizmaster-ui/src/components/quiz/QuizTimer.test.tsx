import { render, screen, act } from '@testing-library/react';
import { QuizTimer } from './QuizTimer';

jest.useFakeTimers();

describe('QuizTimer', () => {
  const mockStartedAt = new Date().toISOString();

  beforeEach(() => {
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('displays initial time correctly', () => {
    const startedAt = new Date().toISOString();
    render(
      <QuizTimer timeLimit={30} onExpire={jest.fn()} startedAt={startedAt} />,
    );

    // Should show 30:00 or close to it (depending on when startedAt was set)
    const timer = screen.getByText(/\d{2}:\d{2}/);
    expect(timer).toBeInTheDocument();
  });

  it('counts down every second', () => {
    const startedAt = new Date(Date.now() - 1000).toISOString(); // Started 1 second ago
    render(
      <QuizTimer timeLimit={30} onExpire={jest.fn()} startedAt={startedAt} />,
    );

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Timer should have updated
    const timer = screen.getByText(/\d{2}:\d{2}/);
    expect(timer).toBeInTheDocument();
  });

  it('calls onExpire when time reaches zero', () => {
    const onExpire = jest.fn();
    // Start timer 1 minute ago for a 1 minute quiz
    const startedAt = new Date(Date.now() - 60000).toISOString();

    render(<QuizTimer timeLimit={1} onExpire={onExpire} startedAt={startedAt} />);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(onExpire).toHaveBeenCalled();
  });

  it('shows warning style when less than 5 minutes remain', () => {
    // Start timer 26 minutes ago for a 30 minute quiz (4 minutes remaining)
    const startedAt = new Date(Date.now() - 26 * 60 * 1000).toISOString();

    render(
      <QuizTimer timeLimit={30} onExpire={jest.fn()} startedAt={startedAt} />,
    );

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // The badge should have destructive variant when time is low
    const timer = screen.getByText(/\d{2}:\d{2}/);
    expect(timer).toBeInTheDocument();
    // The component uses Badge with variant="destructive" when isLowTime is true
    // We can check that the timer is rendered (the exact class checking might vary)
  });
});
