'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { QuestionForm } from '@/components/quiz/QuestionForm';
import { Loader2, Plus, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { FormProvider, Controller } from 'react-hook-form';

const questionSchema = z.object({
  text: z.string().min(10, 'Question must be at least 10 characters'),
  options: z.array(z.string().min(1, 'Option is required')).length(4, 'Must have exactly 4 options'),
  correctOption: z.number().min(0).max(3),
  explanation: z.string().optional(),
  order: z.number(),
});

const quizSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title must not exceed 200 characters'),
  description: z.string().optional(),
  timeLimit: z.number().min(1).max(180),
  published: z.boolean().optional(),
  questions: z.array(questionSchema).min(1, 'At least one question is required'),
});

type QuizFormData = z.infer<typeof quizSchema>;

const STEPS = ['Details', 'Questions', 'Review'] as const;

export default function CreateQuizPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  const methods = useForm<QuizFormData>({
    resolver: zodResolver(quizSchema),
    defaultValues: {
      title: '',
      description: '',
      timeLimit: 30,
      published: false,
      questions: [
        {
          text: '',
          options: ['', '', '', ''],
          correctOption: 0,
          explanation: '',
          order: 0,
        },
      ],
    },
  });

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = methods;

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'questions',
  });

  const watchedData = watch();

  const createMutation = useMutation({
    mutationFn: async (data: QuizFormData) => {
      const questionsWithOrder = data.questions.map((q, index) => ({
        ...q,
        order: index,
      }));

      return apiClient.post('/quizzes', {
        ...data,
        questions: questionsWithOrder,
      });
    },
    onSuccess: () => {
      toast.success('Quiz created successfully!');
      router.push('/dashboard/quizzes');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create quiz');
    },
  });

  const onSubmit = (data: QuizFormData) => {
    createMutation.mutate(data);
  };

  const addQuestion = () => {
    append({
      text: '',
      options: ['', '', '', ''],
      correctOption: 0,
      explanation: '',
      order: fields.length,
    });
  };

  const removeQuestion = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    } else {
      toast.error('At least one question is required');
    }
  };

  const nextStep = async () => {
    let isValid = false;

    if (currentStep === 0) {
      isValid = await methods.trigger(['title', 'timeLimit']);
    } else if (currentStep === 1) {
      isValid = await methods.trigger('questions');
    } else {
      isValid = true;
    }

    if (isValid && currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Create Quiz</h1>
          <p className="text-muted-foreground">Build a new quiz for your students</p>
        </div>
        <Link href="/dashboard/quizzes">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </Link>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => (
          <div key={step} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  index <= currentStep
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-muted-foreground text-muted-foreground'
                }`}
              >
                {index < currentStep ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span className="mt-2 text-sm font-medium">{step}</span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`h-1 flex-1 mx-2 ${
                  index < currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Step 1: Quiz Details */}
          {currentStep === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Quiz Details</CardTitle>
                <CardDescription>Enter basic information about your quiz</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">
                    Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    {...methods.register('title')}
                    placeholder="e.g., JavaScript Basics Quiz"
                    className={errors.title ? 'border-destructive' : ''}
                  />
                  {errors.title && (
                    <p className="text-sm text-destructive">{errors.title.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    {...methods.register('description')}
                    placeholder="Describe what this quiz covers..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeLimit">
                    Time Limit (minutes) <span className="text-destructive">*</span>
                  </Label>
                  <Controller
                    control={control}
                    name="timeLimit"
                    render={({ field }) => (
                      <Select
                        value={field.value?.toString()}
                        onValueChange={(value) => field.onChange(parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select time limit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="45">45 minutes</SelectItem>
                          <SelectItem value="60">60 minutes</SelectItem>
                          <SelectItem value="90">90 minutes</SelectItem>
                          <SelectItem value="120">120 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.timeLimit && (
                    <p className="text-sm text-destructive">{errors.timeLimit.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Questions */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Questions</CardTitle>
                    <CardDescription>Add questions to your quiz</CardDescription>
                  </div>
                  <Button type="button" onClick={addQuestion} variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Question
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {fields.map((field, index) => (
                  <QuestionForm
                    key={field.id}
                    index={index}
                    onRemove={() => removeQuestion(index)}
                  />
                ))}
                {errors.questions && (
                  <p className="text-sm text-destructive">{errors.questions.message as string}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Review */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Review & Publish</CardTitle>
                <CardDescription>Review your quiz before publishing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <h3 className="font-semibold">Quiz Details</h3>
                  <div className="space-y-1 text-sm">
                    <p><strong>Title:</strong> {watchedData.title}</p>
                    {watchedData.description && (
                      <p><strong>Description:</strong> {watchedData.description}</p>
                    )}
                    <p><strong>Time Limit:</strong> {watchedData.timeLimit} minutes</p>
                    <p><strong>Questions:</strong> {watchedData.questions?.length || 0}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Questions Preview</h3>
                  {watchedData.questions?.map((question, index) => (
                    <Card key={index}>
                      <CardContent className="pt-6">
                        <div className="space-y-2">
                          <p className="font-medium">Question {index + 1}: {question.text}</p>
                          <div className="space-y-1 pl-4">
                            {question.options?.map((option, optIndex) => (
                              <p
                                key={optIndex}
                                className={`text-sm ${
                                  optIndex === question.correctOption
                                    ? 'text-green-600 font-semibold'
                                    : ''
                                }`}
                              >
                                {optIndex === question.correctOption && '✓ '}
                                {option}
                              </p>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="flex items-center space-x-2">
                  <Controller
                    control={control}
                    name="published"
                    render={({ field }) => (
                      <Checkbox
                        id="published"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <Label htmlFor="published" className="cursor-pointer">
                    Publish quiz immediately
                  </Label>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>

            {currentStep < STEPS.length - 1 ? (
              <Button type="button" onClick={nextStep}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Quiz'
                )}
              </Button>
            )}
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
