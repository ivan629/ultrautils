import { mapValuesDeep } from '../src/mapValuesDeep/mapValuesDeep';
import _ from 'lodash'; // For comparison

/**
 * Simple benchmark utility
 */
function benchmark(name: string, iterations: number, fn: () => void) {
    console.log(`Running benchmark: ${name}`);

    // Warm up
    for (let i = 0; i < Math.min(iterations / 10, 100); i++) {
        fn();
    }

    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
        fn();
    }

    const end = performance.now();
    const totalTime = end - start;
    const timePerOp = totalTime / iterations;

    console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`  Operations: ${iterations}`);
    console.log(`  Time per operation: ${timePerOp.toFixed(4)}ms`);

    return { name, totalTime, timePerOp, iterations };
}

/**
 * Reference recursive implementation for comparison
 */
function recursiveMapValuesDeep(obj: any, iteratee: Function): any {
    if (obj === null || obj === undefined || typeof obj !== 'object') {
        return iteratee(obj, '', {});
    }

    const cache = new WeakMap<object, any>();

    function recurse(val: any, key: string | number, parent: any): any {
        if (val === null || typeof val !== 'object') {
            return iteratee(val, key, parent);
        }

        if (cache.has(val)) {
            return cache.get(val);
        }

        const result: Record<string | number, any> = Array.isArray(val) ? [] : {};
        cache.set(val, result);

        if (Array.isArray(val)) {
            for (let i = 0; i < val.length; i++) {
                result[i] = recurse(val[i], i, val);
            }
        } else {
            for (const k of Object.keys(val)) {
                result[k] = recurse(val[k], k, val);
            }
        }

        return result;
    }

    return recurse(obj, '', {});
}

/**
 * Create test fixtures for benchmarking
 */
function createFixtures() {
    // Flat data
    const flatObject: Record<string, number> = {};
    for (let i = 0; i < 1000; i++) {
        flatObject[`key${i}`] = i;
    }

    const flatArray = Array(1000).fill(0).map((_, i) => i);

    // Nested data (width-oriented)
    const wideObject: Record<string, Record<string, number>> = {};
    for (let i = 0; i < 100; i++) {
        const inner: Record<string, number> = {};
        for (let j = 0; j < 10; j++) {
            inner[`key${j}`] = j;
        }
        wideObject[`key${i}`] = inner;
    }

    // Nested data (depth-oriented)
    let deepObject: any = {};
    let current = deepObject;

    for (let i = 0; i < 1000; i++) {
        current.value = i;
        current.next = {};
        current = current.next;
    }

    // Mixed complex structure
    interface MixedStructure {
        arr: Array<{
            id: number;
            values: number[];
            metadata: {
                created: Date;
                tags: string[];
            };
        }>;
        lookup: Record<string, any>;
        stats: {
            counts: number[];
            averages: number[];
            metadata: {
                lastUpdated: Date;
                source: string;
            };
        };
        self?: any; // Adding self property to the interface
    }

    const mixedStructure: MixedStructure = {
        arr: Array(100).fill(0).map((_, i) => ({
            id: i,
            values: Array(10).fill(0).map((_, j) => i * j),
            metadata: {
                created: new Date(),
                tags: [`tag${i % 10}`, `category${i % 5}`]
            }
        })),
        lookup: {},
        stats: {
            counts: Array(20).fill(0).map((_, i) => i * 10),
            averages: Array(20).fill(0).map((_, i) => i * 1.5),
            metadata: {
                lastUpdated: new Date(),
                source: "generated"
            }
        }
    };

    // Add circular reference
    mixedStructure.self = mixedStructure;

    // Add lookup values
    for (let i = 0; i < 100; i++) {
        mixedStructure.lookup[`item${i}`] = mixedStructure.arr[i];
    }

    return {
        flatObject,
        flatArray,
        wideObject,
        deepObject,
        mixedStructure
    };
}

/**
 * Run benchmarks
 */
function runBenchmarks() {
    const fixtures = createFixtures();
    const iteratee = (v: any) => typeof v === 'number' ? v * 2 : v;
    const results: Array<{
        name: string;
        totalTime: number;
        timePerOp: number;
        iterations: number;
    }> = [];

    console.log("=".repeat(50));
    console.log("BENCHMARK: mapValuesDeep");
    console.log("=".repeat(50));

    // Benchmark flat structures
    results.push(benchmark('Flat Object - Iterative', 1000, () => {
        mapValuesDeep(fixtures.flatObject, iteratee);
    }));

    results.push(benchmark('Flat Object - Recursive', 1000, () => {
        recursiveMapValuesDeep(fixtures.flatObject, iteratee);
    }));

    results.push(benchmark('Flat Array - Iterative', 1000, () => {
        mapValuesDeep(fixtures.flatArray, iteratee);
    }));

    results.push(benchmark('Flat Array - Recursive', 1000, () => {
        recursiveMapValuesDeep(fixtures.flatArray, iteratee);
    }));

    // Benchmark nested wide structures
    results.push(benchmark('Wide Object - Iterative', 500, () => {
        mapValuesDeep(fixtures.wideObject, iteratee);
    }));

    results.push(benchmark('Wide Object - Recursive', 500, () => {
        recursiveMapValuesDeep(fixtures.wideObject, iteratee);
    }));

    // Benchmark deeply nested structures
    results.push(benchmark('Deep Object - Iterative', 100, () => {
        mapValuesDeep(fixtures.deepObject, iteratee);
    }));

    results.push(benchmark('Deep Object - Recursive', 100, () => {
        try {
            recursiveMapValuesDeep(fixtures.deepObject, iteratee);
        } catch (e) {
            console.log('  ⚠️ Recursive implementation failed with deep object');
        }
    }));

    // Benchmark mixed complex structure
    results.push(benchmark('Mixed Structure - Iterative', 200, () => {
        mapValuesDeep(fixtures.mixedStructure, iteratee);
    }));

    results.push(benchmark('Mixed Structure - Recursive', 200, () => {
        recursiveMapValuesDeep(fixtures.mixedStructure, iteratee);
    }));

    // Compare with lodash for simple cases (lodash doesn't handle deep nesting)
    if (_?.mapValues) {
        console.log("\nLodash comparison (non-deep):");
        results.push(benchmark('Flat Object - Lodash mapValues', 1000, () => {
            _.mapValues(fixtures.flatObject, iteratee);
        }));
    }

    // Print summary
    console.log("\n=".repeat(50));
    console.log("SUMMARY");
    console.log("=".repeat(50));

    // Group results by test case
    const grouped: Record<string, Array<{
        name: string;
        totalTime: number;
        timePerOp: number;
        iterations: number;
    }>> = {};

    for (const result of results) {
        const testName = result.name.split(' - ')[0];
        if (!grouped[testName]) {
            grouped[testName] = [];
        }
        grouped[testName].push(result);
    }

    // Print comparison table
    for (const [testName, testResults] of Object.entries(grouped)) {
        console.log(`\n${testName}:`);
        console.log('-'.repeat(60));
        console.log('Implementation | Time per op (ms) | Relative Speed');
        console.log('-'.repeat(60));

        // Find the fastest implementation
        const fastestTime = Math.min(...testResults.map(r => r.timePerOp));

        for (const result of testResults) {
            const relativeSpeed = (result.timePerOp / fastestTime).toFixed(2) + 'x';
            console.log(
                `${result.name.split(' - ')[1].padEnd(15)} | ` +
                `${result.timePerOp.toFixed(4).padEnd(15)} | ` +
                `${result.timePerOp === fastestTime ? '1.00x (fastest)' : relativeSpeed}`
            );
        }
    }
}

// Run the benchmarks
runBenchmarks();