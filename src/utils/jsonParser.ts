interface ValueNode {
    value: any;
    occurances: number;
}
class MaxHeap {
    heap: ValueNode[];
    constructor() {
        this.heap = [];
    }

    parent(i: number) {
        return Math.floor((i - 1) / 2);
    }
    left(i: number) {
        return 2 * i + 1;
    }
    right(i: number) {
        return 2 * i + 2;
    }

    swap(i: number, j: number) {
        [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
    }

    insert(item: any) {
        let result = this.searchAndUpdateOccurance(item);

        if (!result)
            this.heap.push({
                value: item,
                occurances: 1,
            });

        this.heapifyUp(this.heap.length - 1);
    }
    searchAndUpdateOccurance(item: any) {
        for (let i = 0; i < this.heap.length; i++) {
            if (this.heap[i].value == item) {
                this.heap[i].occurances++;
                return true;
            }
        }
        return false;
    }

    heapifyUp(i: number) {
        while (i > 0 && this.heap[i].occurances > this.heap[this.parent(i)].occurances) {
            this.swap(i, this.parent(i));
            i = this.parent(i);
        }
    }

    extractMax() {
        if (this.heap.length === 0) return null;
        if (this.heap.length === 1) return this.heap.pop();

        const max = this.heap[0];

        const lastNode = this.heap.pop();
        if (lastNode) {
            this.heap[0] = lastNode;
        }
        this.heapifyDown(0);
        return max;
    }

    heapifyDown(i: number) {
        let largest = i;
        const left = this.left(i);
        const right = this.right(i);

        if (left < this.heap.length && this.heap[left].occurances > this.heap[largest].occurances) {
            largest = left;
        }

        if (right < this.heap.length && this.heap[right].occurances > this.heap[largest].occurances) {
            largest = right;
        }

        if (largest !== i) {
            this.swap(i, largest);
            this.heapifyDown(largest);
        }
    }

    peek() {
        return this.heap.length > 0 ? this.heap[0] : null;
    }

    isEmpty() {
        return this.heap.length === 0;
    }
}

interface Jsons {
    [key: string]: Jsons | MaxHeap;
}
interface Json {
    [key: string]: any;
}

/**
 * This function takes an array of JSON objects and normalizes them by collapsing
 * the values of the same keys into a single value based on the maximum occurrence.
 */
function normalizeJsons<T extends Json>(jsons: T[]): T {
    const holder: Jsons = {};

    // iterate through jsons and create a MaxHeap for each key
    // and insert the values into the MaxHeap
    for (const json of jsons) {
        const keys = Object.keys(json);
        for (const key of keys) {
            if (!holder.hasOwnProperty(key)) {
                holder[key] = new MaxHeap();
                (holder[key] as MaxHeap).insert(json[key]);
            } else {
                (holder[key] as MaxHeap).insert(json[key]);
            }
        }
    }
    const result = {} as T;

    // collapse jsons
    for (const key in holder) {
        if (holder[key] instanceof MaxHeap) {
            const currentKeyMaxHeap = holder[key] as MaxHeap;
            const maxHeap = currentKeyMaxHeap.peek();
            if (maxHeap) {
                const maxValue = maxHeap.value;
                // @ts-ignore
                result[key] = maxValue as any;
            }
        }
    }

    return result;
}
// Test for normalizeJsons
function test() {
    const jsons = [
        {
            name: "John",
            age: 30,
            city: "New York",
        },
        {
            name: "Jane",
            age: 25,
            city: "Los Angeles",
        },
        {
            name: "John",
            age: 30,
            city: "Chicago",
        },
        {
            name: "Jane",
            age: 25,
            city: "New York",
        },
        {
            name: "John",
            age: 30,
            city: "New York",
        },
        {
            name: "Jane",
            age: 25,
            city: "Los Angeles",
        },
        {
            name: "John",
            age: 30,
            city: "Chicago",
        },
        {
            name: "Jane",
            age: 25,
            city: "New York",
        },
    ];
    const result = normalizeJsons(jsons);
    console.log(result);
}

export { normalizeJsons };
