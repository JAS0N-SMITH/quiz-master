import { cn } from './utils';

describe('cn (classnames utility)', () => {
  it('should merge class names', () => {
    const result = cn('class1', 'class2');
    expect(result).toContain('class1');
    expect(result).toContain('class2');
  });

  it('should handle conditional classes', () => {
    const result = cn('base', true && 'included', false && 'excluded');
    expect(result).toContain('base');
    expect(result).toContain('included');
    expect(result).not.toContain('excluded');
  });

  it('should handle undefined and null', () => {
    const result = cn('base', undefined, null, 'valid');
    expect(result).toContain('base');
    expect(result).toContain('valid');
  });

  it('should handle empty strings', () => {
    const result = cn('base', '', 'valid');
    expect(result).toContain('base');
    expect(result).toContain('valid');
  });

  it('should merge tailwind classes correctly', () => {
    const result = cn('px-2 py-1', 'px-4');
    // Later class should override earlier conflicting class (via twMerge)
    expect(result).toContain('px-4');
    expect(result).toContain('py-1');
  });

  it('should handle array of classes', () => {
    const result = cn(['class1', 'class2'], 'class3');
    expect(result).toContain('class1');
    expect(result).toContain('class2');
    expect(result).toContain('class3');
  });

  it('should handle object with boolean values', () => {
    const result = cn({
      'class1': true,
      'class2': false,
      'class3': true,
    });
    expect(result).toContain('class1');
    expect(result).not.toContain('class2');
    expect(result).toContain('class3');
  });

  it('should handle mixed inputs', () => {
    const result = cn('base', ['array1', 'array2'], { 'obj1': true, 'obj2': false }, 'string');
    expect(result).toContain('base');
    expect(result).toContain('array1');
    expect(result).toContain('array2');
    expect(result).toContain('obj1');
    expect(result).not.toContain('obj2');
    expect(result).toContain('string');
  });
});
