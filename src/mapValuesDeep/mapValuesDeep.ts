/**
 * Efficiently maps values in a nested object/array structure using an iterative approach.
 * - Avoids call stack limitations (no recursion)
 * - Handles circular references
 * - Processes deeply nested structures efficiently
 * - Preserves structure and types including sparse arrays and special object types
 * - Supports Symbol keys and custom recursion control
 *
 * @param obj - The object or array to map values on
 * @param iteratee - Function to apply to each primitive value
 * @returns A new object/array with transformed values
 */
export function mapValuesDeep<T, R = any>(
    obj: T,
    iteratee: (value: any, key: string | number | symbol, parent: any) => R
): any {
    // Fast path for primitives
    if (obj === null || obj === undefined || typeof obj !== 'object') {
        return iteratee(obj, '', {});
    }

    // Check for special object types that should be treated as primitives
    if (isSpecialObject(obj)) {
        return iteratee(obj, '', {});
    }

    // Create initial clone
    const result = Array.isArray(obj) ? new Array(obj.length) : {};

    // Track processed objects to handle circular references
    const processed = new WeakMap<object, any>();
    processed.set(obj as object, result);

    // Define work item interface
    interface WorkItem {
        source: any;
        target: any;
        parent: any;
        key: string | number | symbol;
    }

    // Stack of work items to process
    const stack: WorkItem[] = [{
        source: obj,
        target: result,
        parent: null,
        key: ''
    }];

    // Process stack iteratively
    while (stack.length > 0) {
        // Get current work item
        const { source, target, parent, key } = stack.pop()!;

        // Process arrays
        if (Array.isArray(source)) {
            // For sparse arrays, we need to specifically check for own properties
            for (let i = 0; i < source.length; i++) {
                // Only process indices that actually exist in the array
                if (Object.prototype.hasOwnProperty.call(source, i)) {
                    const value = source[i];

                    if (value !== null && typeof value === 'object') {
                        // Check if we've already processed this object (circular reference)
                        if (processed.has(value)) {
                            target[i] = processed.get(value);
                            continue;
                        }

                        // Check for special object types (Date, RegExp, Map, Set, etc.)
                        if (isSpecialObject(value)) {
                            target[i] = iteratee(value, i, source);
                            continue;
                        }

                        // Apply iteratee to the object/array first
                        const transformedValue = iteratee(value, i, source);

                        // If the iteratee returned something different than the original value,
                        // use that instead of recursing
                        if (transformedValue !== value) {
                            target[i] = transformedValue;
                            continue;
                        }

                        // Create new container and add to stack
                        const newContainer = Array.isArray(value) ? new Array(value.length) : {};
                        target[i] = newContainer;
                        processed.set(value, newContainer);

                        stack.push({
                            source: value,
                            target: newContainer,
                            parent: source,
                            key: i
                        });
                    } else {
                        // Process primitive values directly
                        target[i] = iteratee(value, i, source);
                    }
                }
            }
        }
        // Process objects
        else {
            // Get all string keys
            const keys = Object.keys(source);

            // Process string keys
            for (let i = 0; i < keys.length; i++) {
                const k = keys[i];
                const value = source[k];

                if (value !== null && typeof value === 'object') {
                    // Check if we've already processed this object (circular reference)
                    if (processed.has(value)) {
                        target[k] = processed.get(value);
                        continue;
                    }

                    // Check for special object types (Date, RegExp, Map, Set, etc.)
                    if (isSpecialObject(value)) {
                        target[k] = iteratee(value, k, source);
                        continue;
                    }

                    // Apply iteratee to the object/array first
                    const transformedValue = iteratee(value, k, source);

                    // If the iteratee returned something different than the original value,
                    // use that instead of recursing
                    if (transformedValue !== value) {
                        target[k] = transformedValue;
                        continue;
                    }

                    // Create new container and add to stack
                    const newContainer = Array.isArray(value) ? new Array(value.length) : {};
                    target[k] = newContainer;
                    processed.set(value, newContainer);

                    stack.push({
                        source: value,
                        target: newContainer,
                        parent: source,
                        key: k
                    });
                } else {
                    // Process primitive values directly
                    target[k] = iteratee(value, k, source);
                }
            }

            // Get all symbol keys
            const symbolKeys = Object.getOwnPropertySymbols(source);

            // Process symbol keys
            for (let i = 0; i < symbolKeys.length; i++) {
                const k = symbolKeys[i];
                const value = source[k as any];

                if (value !== null && typeof value === 'object') {
                    // Check if we've already processed this object (circular reference)
                    if (processed.has(value)) {
                        target[k as any] = processed.get(value);
                        continue;
                    }

                    // Check for special object types
                    if (isSpecialObject(value)) {
                        target[k as any] = iteratee(value, k, source);
                        continue;
                    }

                    // Apply iteratee to the object/array first
                    const transformedValue = iteratee(value, k, source);

                    // If the iteratee returned something different than the original value,
                    // use that instead of recursing
                    if (transformedValue !== value) {
                        target[k as any] = transformedValue;
                        continue;
                    }

                    // Create new container and add to stack
                    const newContainer = Array.isArray(value) ? new Array(value.length) : {};
                    target[k as any] = newContainer;
                    processed.set(value, newContainer);

                    stack.push({
                        source: value,
                        target: newContainer,
                        parent: source,
                        key: k
                    });
                } else {
                    // Process primitive values directly
                    target[k as any] = iteratee(value, k, source);
                }
            }
        }
    }

    return result;
}

/**
 * Helper to detect special object types that should be treated as primitives
 * (not recursed into)
 */
function isSpecialObject(obj: unknown): boolean {
    if (obj === null || typeof obj !== 'object') {
        return false;
    }

    // Get the object's internal [[Class]] property
    const tag = Object.prototype.toString.call(obj);

    // List of special object types to treat as primitives
    return (
        // Built-in objects
        obj instanceof Date ||
        obj instanceof RegExp ||
        obj instanceof Map ||
        obj instanceof Set ||
        obj instanceof WeakMap ||
        obj instanceof WeakSet ||
        obj instanceof Promise ||
        obj instanceof Error ||
        // Functions (technically objects in JS)
        typeof obj === 'function' ||
        // Alternative check using the [[Class]] tag
        tag === '[object Date]' ||
        tag === '[object RegExp]' ||
        tag === '[object Map]' ||
        tag === '[object Set]' ||
        tag === '[object WeakMap]' ||
        tag === '[object WeakSet]' ||
        tag === '[object Promise]' ||
        tag === '[object Error]' ||
        tag === '[object Function]' ||
        // Other non-plain objects you might want to add
        tag === '[object Symbol]' ||
        tag === '[object ArrayBuffer]' ||
        tag === '[object DataView]' ||
        tag === '[object Int8Array]' ||
        tag === '[object Uint8Array]' ||
        tag === '[object Uint8ClampedArray]' ||
        tag === '[object Int16Array]' ||
        tag === '[object Uint16Array]' ||
        tag === '[object Int32Array]' ||
        tag === '[object Uint32Array]' ||
        tag === '[object Float32Array]' ||
        tag === '[object Float64Array]' ||
        tag === '[object BigInt64Array]' ||
        tag === '[object BigUint64Array]'
    );
}