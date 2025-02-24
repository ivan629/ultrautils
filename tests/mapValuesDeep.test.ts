import { mapValuesDeep } from '../src/mapValuesDeep/mapValuesDeep';

// You can adapt this to your preferred test framework
describe('mapValuesDeep', () => {
    // Test primitive values
    test('handles primitive values', () => {
        expect(mapValuesDeep(5, v => v * 2)).toBe(10);
        expect(mapValuesDeep('hello', v => v + ' world')).toBe('hello world');
        expect(mapValuesDeep(null, v => v)).toBe(null);
        expect(mapValuesDeep(undefined, v => v)).toBe(undefined);
        expect(mapValuesDeep(false, v => !v)).toBe(true);
    });

    // Test flat arrays and objects
    test('handles flat arrays', () => {
        const input = [1, 2, 3, 4];
        const result = mapValuesDeep(input, v => typeof v === 'number' ? v * 2 : v);
        expect(result).toEqual([2, 4, 6, 8]);
        // Ensure original is not modified
        expect(input).toEqual([1, 2, 3, 4]);
    });

    test('handles flat objects', () => {
        const input = { a: 1, b: 2, c: 'test', d: false };
        const result = mapValuesDeep(input, v => {
            if (typeof v === 'number') return v * 2;
            if (typeof v === 'string') return v.toUpperCase();
            return v;
        });
        expect(result).toEqual({ a: 2, b: 4, c: 'TEST', d: false });
        // Ensure original is not modified
        expect(input).toEqual({ a: 1, b: 2, c: 'test', d: false });
    });

    // Test nested structures
    test('handles nested arrays', () => {
        const input = [1, [2, 3], [4, [5, 6]]];
        const result = mapValuesDeep(input, v => typeof v === 'number' ? v * 2 : v);
        expect(result).toEqual([2, [4, 6], [8, [10, 12]]]);
    });

    test('handles nested objects', () => {
        const input = {
            a: 1,
            b: { c: 2, d: 3 },
            e: { f: { g: 4 } }
        };
        const result = mapValuesDeep(input, v => typeof v === 'number' ? v * 2 : v);
        expect(result).toEqual({
            a: 2,
            b: { c: 4, d: 6 },
            e: { f: { g: 8 } }
        });
    });

    test('handles mixed nested structures', () => {
        const input = {
            a: 1,
            b: [2, 3],
            c: { d: [4, 5], e: 6 },
            f: [{ g: 7 }, 8]
        };
        const result = mapValuesDeep(input, v => typeof v === 'number' ? v * 2 : v);
        expect(result).toEqual({
            a: 2,
            b: [4, 6],
            c: { d: [8, 10], e: 12 },
            f: [{ g: 14 }, 16]
        });
    });

    // Test handling of special cases
    test('handles empty arrays and objects', () => {
        expect(mapValuesDeep([], v => v)).toEqual([]);
        expect(mapValuesDeep({}, v => v)).toEqual({});
        expect(mapValuesDeep([[], {}], v => v)).toEqual([[], {}]);
    });

    test('handles arrays with sparse elements', () => {
        // Create sparse array
        const sparse = Array(5);
        sparse[0] = 1;
        sparse[3] = 4;

        const result = mapValuesDeep(sparse, v => typeof v === 'number' ? v * 2 : v);

        const expected = Array(5);
        expected[0] = 2;
        expected[3] = 8;

        expect(result).toEqual(expected);
        expect(result.hasOwnProperty(1)).toBe(false);
    });

    test('handles arrays with non-numeric properties', () => {
        const arr = [1, 2, 3] as any;
        arr.test = 'value';

        const result = mapValuesDeep(arr, v => {
            if (typeof v === 'number') return v * 2;
            if (typeof v === 'string') return v.toUpperCase();
            return v;
        });

        expect(result).toEqual([2, 4, 6]);
        expect(result.test).toBeUndefined(); // Non-numeric properties aren't copied
    });

    // Handling of circular references
    test('handles circular references in objects', () => {
        const obj: any = { a: 1 };
        obj.self = obj;
        obj.b = { c: 2, ref: obj };

        const result = mapValuesDeep(obj, v => typeof v === 'number' ? v * 2 : v);

        expect(result.a).toBe(2);
        expect(result.self).toBe(result); // Circular reference preserved
        expect(result.b.c).toBe(4);
        expect(result.b.ref).toBe(result); // Circular reference preserved
    });

    test('handles circular references in arrays', () => {
        const arr: any[] = [1, 2];
        arr.push(arr);
        arr.push([3, arr]);

        const result = mapValuesDeep(arr, v => typeof v === 'number' ? v * 2 : v);

        expect(result[0]).toBe(2);
        expect(result[1]).toBe(4);
        expect(result[2]).toBe(result); // Circular reference preserved
        expect(result[3][0]).toBe(6);
        expect(result[3][1]).toBe(result); // Circular reference preserved
    });

// Ensure all iteratee parameters are correct
    test('passes correct parameters to iteratee', () => {
        type CallRecord = {
            value: any;
            key: string | number | symbol;
            parent: any;
        };

        // Use objects instead of arrays for more flexibility
        const calls: CallRecord[] = [];

        const input = {
            a: 1,
            b: [2, 3]
        };

        mapValuesDeep(input, (value, key, parent) => {
            calls.push({ value, key, parent });
            return value;
        });

        // Check calls using the object format
        expect(calls).toContainEqual({ value: 1, key: 'a', parent: input });
        expect(calls).toContainEqual({ value: 2, key: 0, parent: input.b });
        expect(calls).toContainEqual({ value: 3, key: 1, parent: input.b });
    });

    // Performance tests for large structures
    test('handles large flat arrays efficiently', () => {
        const largeArray = Array(100000).fill(0).map((_, i) => i);

        const start = performance.now();
        const result = mapValuesDeep(largeArray, v => v * 2);
        const end = performance.now();

        // Verify first few and last few elements
        expect(result.slice(0, 3)).toEqual([0, 2, 4]);
        expect(result.slice(-3)).toEqual([199994, 199996, 199998]);

        // Performance assertion - adjust threshold as needed
        expect(end - start).toBeLessThan(500); // Should process in under 500ms
    });

    test('handles extremely wide objects efficiently', () => {
        // Create an object with 10,000 keys at the same level
        const wideObject: Record<string, number> = {};

        for (let i = 0; i < 10000; i++) {
            wideObject[`key${i}`] = i;
        }

        const start = performance.now();
        const result = mapValuesDeep(wideObject, v =>
            typeof v === 'number' ? v * 2 : v
        );
        const end = performance.now();

        // Verify some sample keys
        expect(result.key0).toBe(0 * 2);
        expect(result.key100).toBe(100 * 2);
        expect(result.key9999).toBe(9999 * 2);

        // Verify the total number of keys
        expect(Object.keys(result).length).toBe(10000);

        // Performance assertion
        console.log(`Wide object processing time: ${end - start}ms`);
        expect(end - start).toBeLessThan(500); // Should process in under 500ms
    });

    test('handles large nested structures efficiently', () => {
        // Create a deeply nested structure (depth 1000)
        let nested: any = { value: 1 };
        let current = nested;

        for (let i = 0; i < 1000; i++) {
            current.next = { value: i + 2 };
            current = current.next;
        }

        const start = performance.now();
        const result = mapValuesDeep(nested, v => typeof v === 'number' ? v * 2 : v);
        const end = performance.now();

        // Verify some values
        expect(result.value).toBe(2);
        expect(result.next.value).toBe(4);

        // Verify final node
        let finalNode = result;
        for (let i = 0; i < 1000; i++) {
            finalNode = finalNode.next;
        }
        expect(finalNode.value).toBe(2002);

        // Performance assertion
        expect(end - start).toBeLessThan(1000); // Should process in under 1000ms
    });

    // Edge case with complex nested structures containing various types
    test('handles complex mixed data types', () => {
        const input = {
            string: 'hello',
            number: 42,
            boolean: true,
            null: null,
            undefined: undefined,
            date: new Date('2023-01-01'),
            regex: /test/,
            fn: function() { return 1; },
            nested: {
                array: [1, 'string', { key: 'value' }, [null]],
                map: new Map([['key', 'value']]),
                set: new Set([1, 2, 3])
            }
        };

        // Only transform primitive values
        const result = mapValuesDeep(input, v => {
            if (typeof v === 'string') return v.toUpperCase();
            if (typeof v === 'number') return v * 2;
            return v;
        });

        expect(result.string).toBe('HELLO');
        expect(result.number).toBe(84);
        expect(result.boolean).toBe(true);
        expect(result.null).toBe(null);
        expect(result.undefined).toBe(undefined);
        expect(result.date).toEqual(input.date);
        expect(result.regex).toEqual(input.regex);
        expect(typeof result.fn).toBe('function');

        expect(result.nested.array[0]).toBe(2); // Transformed number
        expect(result.nested.array[1]).toBe('STRING'); // Transformed string
        expect(result.nested.array[2].key).toBe('VALUE'); // Transformed nested string
        expect(result.nested.array[3][0]).toBe(null); // Preserved null

        // Complex objects like Map and Set should be preserved as is
        expect(result.nested.map).toEqual(input.nested.map);
        expect(result.nested.set).toEqual(input.nested.set);
    });

    // Test handling of prototype properties
    test('does not process prototype chain properties', () => {
        function TestClass() {}
        TestClass.prototype.protoValue = 5;

        const instance = new TestClass();
        (instance as any).ownValue = 10;

        const result = mapValuesDeep(instance, v => typeof v === 'number' ? v * 2 : v);

        // Should only transform own properties
        expect(result.ownValue).toBe(20);
        expect(result.protoValue).toBeUndefined();
    });

    // Test array-like objects
    test('handles arguments object', () => {
        function getArguments(...args: number[]) {
            return arguments;
        }

        const args = getArguments(1, 2, 3);

        // Use type assertion to tell TypeScript this is okay
        const result = mapValuesDeep(args as any, v => typeof v === 'number' ? v * 2 : v);

        expect(result[0]).toBe(2);
        expect(result[1]).toBe(4);
        expect(result[2]).toBe(6);
    });

// Test typed arrays
    test('handles typed arrays', () => {
        const int32Array = new Int32Array([1, 2, 3, 4]);
        const uint8Array = new Uint8Array([5, 6, 7, 8]);

        const input = { int32: int32Array, uint8: uint8Array };

        const result = mapValuesDeep(input, v => v);

        // Typed arrays should be preserved as is (not recursed into)
        expect(result.int32).toBe(input.int32);
        expect(result.uint8).toBe(input.uint8);
    });

// Test property descriptors
    test('handles property descriptors correctly', () => {
        const input = {};
        let getterCalled = 0;

        Object.defineProperty(input, 'computed', {
            get: () => { getterCalled++; return 42; },
            enumerable: true
        });

        Object.defineProperty(input, 'hidden', {
            value: 100,
            enumerable: false
        });

        const result = mapValuesDeep(input, v => typeof v === 'number' ? v * 2 : v);

        // Getter should be called once during enumeration
        expect(getterCalled).toBe(1);
        expect(result.computed).toBe(84);

        // Non-enumerable properties should not be copied
        expect(result.hidden).toBeUndefined();
    });

    // Test with extremely deep nesting
    test('handles extremely deep nesting that would cause stack overflow in recursive approach', () => {
        // Create a deeply nested array (depth 1000)
        let arr: any[] = [];
        let current = arr;

        for (let i = 0; i < 10000; i++) {
            const next: any[] = [];
            current.push(next);
            current.push(i); // Add the number value
            current = next;  // Move to the next level
        }

        // This should not throw a stack overflow
        const result = mapValuesDeep(arr, v => typeof v === 'number' ? v + 1 : v);

        // Verify some values were transformed
        expect(result[1]).toBe(0 + 1); // First level number

        let level = result[0];
        expect(level[1]).toBe(1 + 1); // Second level number

        level = level[0];
        expect(level[1]).toBe(2 + 1); // Third level number
    });

// Test error handling
    test('handles errors in iteratee gracefully', () => {
        const input = { a: 1, b: 2, c: 3 };

        expect(() => {
            mapValuesDeep(input, (v, k) => {
                if (k === 'b') throw new Error('Test error');
                return v;
            });
        }).toThrow('Test error');
    });


// Test with symbol keys
    test('handles symbol keys in objects', () => {
        const mySymbol = Symbol('test');
        const input = {
            a: 1,
            [mySymbol]: 42
        };

        const result = mapValuesDeep(input, v => typeof v === 'number' ? v * 2 : v);

        expect(result.a).toBe(2);
        // Symbol properties should be preserved
        expect(result[mySymbol]).toBe(84);
    });

// Test performance comparison with other libraries
    test('compares performance with lodash', () => {
        const _ = require('lodash');

        const input = { a: 1, b: 2, c: 3, d: 4, e: 5 };

        // Nested objects require recursive use of lodash's mapValues
        function lodashDeep(obj) {
            return _.mapValues(obj, v => {
                if (_.isObject(v)) return lodashDeep(v);
                if (typeof v === 'number') return v * 2;
                return v;
            });
        }

        const startLodash = performance.now();
        for (let i = 0; i < 1000; i++) {
            lodashDeep(input);
        }
        const endLodash = performance.now();

        const startMapValuesDeep = performance.now();
        for (let i = 0; i < 1000; i++) {
            mapValuesDeep(input, v => typeof v === 'number' ? v * 2 : v);
        }
        const endMapValuesDeep = performance.now();

        console.log(`Lodash: ${endLodash - startLodash}ms`);
        console.log(`mapValuesDeep: ${endMapValuesDeep - startMapValuesDeep}ms`);

        // Just a sanity check that implementations produce the same result
        expect(mapValuesDeep(input, v => typeof v === 'number' ? v * 2 : v))
            .toEqual(lodashDeep(input));
    });

    test('handles non-standard property keys', () => {
        const input = {
            '123': 'numeric key',
            'key-with-dash': 'dash',
            'key.with.dots': 'dots',
            0: 'zero key'
        };

        const result = mapValuesDeep(input, v =>
            typeof v === 'string' ? v.toUpperCase() : v
        );

        expect(result['123']).toBe('NUMERIC KEY');
        expect(result['key-with-dash']).toBe('DASH');
        expect(result['key.with.dots']).toBe('DOTS');
        expect(result[0]).toBe('ZERO KEY');
    });

    test('handles frozen and sealed objects', () => {
        const frozen = Object.freeze({ a: 1, b: { c: 2 } });
        const sealed = Object.seal({ x: 3, y: { z: 4 } });

        const frozenResult = mapValuesDeep(frozen, v =>
            typeof v === 'number' ? v * 2 : v
        );
        const sealedResult = mapValuesDeep(sealed, v =>
            typeof v === 'number' ? v * 2 : v
        );

        // Original objects should remain unchanged
        expect(frozen.a).toBe(1);
        expect(frozen.b.c).toBe(2);

        // New objects should have transformed values
        expect(frozenResult.a).toBe(2);
        expect(frozenResult.b.c).toBe(4);
        expect(sealedResult.x).toBe(6);
        expect(sealedResult.y.z).toBe(8);
    });

    test('handles instances of custom classes', () => {
        class Person {
            constructor(public name: string, public age: number) {}

            greet() { return `Hello, ${this.name}`; }
        }

        const person = new Person('Alice', 30);
        const result = mapValuesDeep(person, v =>
            typeof v === 'number' ? v * 2 :
                typeof v === 'string' ? v.toUpperCase() : v
        );

        expect(result.name).toBe('ALICE');
        expect(result.age).toBe(60);
        // Methods should not be copied
        expect(result.greet).toBeUndefined();
    });

    test('handles classes with private fields', () => {
        class Counter {
            #privateValue = 42;
            publicValue = 10;

            getPrivate() { return this.#privateValue; }
        }

        const counter = new Counter();
        const result = mapValuesDeep(counter, v =>
            typeof v === 'number' ? v * 2 : v
        );

        // Public fields should be transformed
        expect(result.publicValue).toBe(20);
        // Private fields should not be accessible
        expect('getPrivate' in result).toBe(false);
    });

    test('handles objects with read-only properties', () => {
        const input = {
            get readOnly() { return 42; },
            regular: 10
        };

        const result = mapValuesDeep(input, v =>
            typeof v === 'number' ? v * 2 : v
        );

        expect(result.readOnly).toBe(84);
        expect(result.regular).toBe(20);
    });

    test('handles objects with very long property names', () => {
        // Create property name longer than 1KB
        const longKey = 'a'.repeat(2000);

        const input = {
            [longKey]: 42
        };

        const result = mapValuesDeep(input, v =>
            typeof v === 'number' ? v * 2 : v
        );

        expect(result[longKey]).toBe(84);
    });

    test('handles objects with properties that conflict with internal methods', () => {
        const input = {
            hasOwnProperty: 1,
            toString: 2,
            valueOf: 3,
            constructor: 4
        };

        const result = mapValuesDeep(input, v =>
            typeof v === 'number' ? v * 2 : v
        );

        expect(result.hasOwnProperty).toBe(2);
        expect(result.toString).toBe(4);
        expect(result.valueOf).toBe(6);
        expect(result.constructor).toBe(8);
    });
});
