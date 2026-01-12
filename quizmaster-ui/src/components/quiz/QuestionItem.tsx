'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { Question } from '@/types';

interface QuestionItemProps {
  question: Question;
  questionNumber: number;
  selectedOption?: number;
  onSelect: (questionId: string, optionIndex: number) => void;
  disabled?: boolean;
}

export function QuestionItem({
  question,
  questionNumber,
  selectedOption,
  onSelect,
  disabled = false,
}: QuestionItemProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">
              Question {questionNumber}
            </h3>
            <p className="text-base">{question.text}</p>
          </div>

          <RadioGroup
            value={selectedOption !== undefined ? selectedOption.toString() : ''}
            onValueChange={(value) => {
              if (!disabled) {
                onSelect(question.id, parseInt(value));
              }
            }}
            disabled={disabled}
          >
            {question.options.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem
                  value={index.toString()}
                  id={`${question.id}-option-${index}`}
                />
                <Label
                  htmlFor={`${question.id}-option-${index}`}
                  className="flex-1 cursor-pointer font-normal"
                >
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      </CardContent>
    </Card>
  );
}
