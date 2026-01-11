'use client';

import { useState } from 'react';
import { useFormContext, useFieldArray, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface QuestionFormProps {
  index: number;
  onRemove: () => void;
}

export function QuestionForm({ index, onRemove }: QuestionFormProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext();

  const { fields: options } = useFieldArray({
    control,
    name: `questions.${index}.options`,
  });

  const questionErrors = errors.questions?.[index];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Question {index + 1}</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button type="button" variant="ghost" size="sm">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Remove Question?</DialogTitle>
                <DialogDescription>
                  Are you sure you want to remove this question? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    onRemove();
                    setIsDialogOpen(false);
                  }}
                  className="bg-destructive text-destructive-foreground"
                >
                  Remove
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`question-${index}-text`}>
            Question Text <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id={`question-${index}-text`}
            placeholder="Enter your question here..."
            {...register(`questions.${index}.text`, {
              required: 'Question text is required',
              minLength: {
                value: 10,
                message: 'Question must be at least 10 characters',
              },
            })}
            className={questionErrors?.text ? 'border-destructive' : ''}
          />
          {questionErrors?.text && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {questionErrors.text.message as string}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>
            Options <span className="text-destructive">*</span>
          </Label>
          <div className="space-y-2">
            {options.map((_, optionIndex) => (
              <div key={optionIndex} className="flex items-center gap-2">
                <Input
                  placeholder={`Option ${optionIndex + 1}`}
                  {...register(`questions.${index}.options.${optionIndex}`, {
                    required: 'Option is required',
                  })}
                  className={questionErrors?.options?.[optionIndex] ? 'border-destructive' : ''}
                />
              </div>
            ))}
            {questionErrors?.options && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                All options are required
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>
            Correct Answer <span className="text-destructive">*</span>
          </Label>
          <Controller
            control={control}
            name={`questions.${index}.correctOption`}
            rules={{ required: 'Please select the correct answer' }}
            render={({ field }) => (
              <RadioGroup
                value={field.value?.toString()}
                onValueChange={(value) => field.onChange(parseInt(value))}
              >
                <div className="grid grid-cols-2 gap-2">
                  {options.map((_, optionIndex) => (
                    <div key={optionIndex} className="flex items-center space-x-2">
                      <RadioGroupItem
                        value={optionIndex.toString()}
                        id={`question-${index}-correct-${optionIndex}`}
                      />
                      <Label
                        htmlFor={`question-${index}-correct-${optionIndex}`}
                        className="font-normal cursor-pointer flex-1"
                      >
                        Option {optionIndex + 1}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            )}
          />
          {questionErrors?.correctOption && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {questionErrors.correctOption.message as string}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`question-${index}-explanation`}>
            Explanation (Optional)
          </Label>
          <Textarea
            id={`question-${index}-explanation`}
            placeholder="Explain why this is the correct answer..."
            {...register(`questions.${index}.explanation`)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
