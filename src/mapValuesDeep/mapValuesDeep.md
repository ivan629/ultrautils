# mapValuesDeep

A highly optimized utility for deep transformation of nested JavaScript/TypeScript objects and arrays.

## Features

- **Stack-safe**: Uses an iterative approach instead of recursion to handle deeply nested structures
- **Circular reference handling**: Automatically detects and properly handles circular references
- **Preserves structure**: Maintains array sparseness, object types, and other structural elements
- **Symbol support**: Properly processes Symbol keys in objects
- **Selective recursion**: Control exactly which objects to recurse into
- **Type-safe**: Written in TypeScript with proper type definitions

## Installation

```bash
npm install map-values-deep
```

## Basic Usage

```typescript
import { mapValuesDeep } from 'map-values-deep';

// Double all numbers in a nested structure
const data = {
  a: 1,
  b: { c: 2, d: [3, 4] },
  e: [[5, 6], 7]
};

const doubled = mapValuesDeep(data, (value) => {
  return typeof value === 'number' ? value * 2 : value;
});

console.log(doubled);
// {
//   a: 2,
//   b: { c: 4, d: [6, 8] },
//   e: [[10, 12], 14]
// }
```

## Advanced Usage

### Accessing Key and Parent in Transformation

The iteratee function receives the current value, its key, and its parent object:

```typescript
const result = mapValuesDeep(data, (value, key, parent) => {
  console.log(`Processing ${key} in`, parent);
  return value;
});
```

### Selective Deep Transformation

Control which objects get recursed into by returning a modified value:

```typescript
const data = {
  users: [
    { id: 1, name: "Alice", metadata: { sensitive: true, info: "private" } },
    { id: 2, name: "Bob", metadata: { sensitive: false, info: "public" } }
  ]
};

const sanitized = mapValuesDeep(data, (value, key, parent) => {
  // Skip recursion into sensitive metadata by returning a replacement
  if (key === 'metadata' && value.sensitive === true) {
    return { sensitive: true, info: "[REDACTED]" };
  }
  
  // For all other cases, return the original value to continue normal recursion
  return value;
});
```

### Working with Circular References

The function automatically handles circular references:

```typescript
const circular = { name: 'root' };
circular.self = circular;
circular.nested = { parent: circular };

const result = mapValuesDeep(circular, (value) => {
  if (typeof value === 'string') {
    return value.toUpperCase();
  }
  return value;
});

// Will properly transform strings without infinite recursion
```

## Performance Considerations

- `mapValuesDeep` is optimized for handling large, deeply nested structures
- Special objects (Date, RegExp, Map, Set, etc.) are treated as primitives and not recursed into
- The iterative approach avoids call stack limits that would occur with recursive implementations

## Type Definitions

```typescript
function mapValuesDeep<T, R = any>(
  obj: T,
  iteratee: (value: any, key: string | number | symbol, parent: any) => R
): any;
```

## License

MIT