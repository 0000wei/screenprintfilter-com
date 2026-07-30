/**
 * Test Setup
 * Basic testing infrastructure for the project
 */

export class TestSuite {
    constructor(name) {
        this.name = name;
        this.tests = [];
        this.results = { passed: 0, failed: 0, skipped: 0 };
    }

    test(name, testFn) {
        this.tests.push({ name, testFn, status: 'pending' });
    }

    async run() {
        console.log(`\n🧪 ${this.name}`);

        for (const test of this.tests) {
            try {
                await test.testFn();
                test.status = 'passed';
                this.results.passed++;
                console.log(`  ✅ ${test.name}`);
            } catch (error) {
                test.status = 'failed';
                this.results.failed++;
                console.log(`  ❌ ${test.name}: ${error.message}`);
            }
        }

        return this.results;
    }
}

export function assert(condition, message = 'Assertion failed') {
    if (!condition) throw new Error(message);
}

export function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `Expected ${expected} but got ${actual}`);
    }
}
