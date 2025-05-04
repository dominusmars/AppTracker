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
  // Swap two values in the heap
  swap(i: number, j: number) {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }
  // Insert a value into the heap, searching through the heap for the value, if found, update the occurance
  // if not found, insert the value into the heap.
  // The heap is a max heap, so the value with the most occurances will be at the top of the heap
  insert(item: any) {
    // Because its max occurances, we need to check if the value already exists in the heap, lookup time is linear
    let result = this.searchAndUpdateOccurance(item);

    if (!result)
      this.heap.push({
        value: item,
        occurances: 1,
      });

    this.heapifyUp(this.heap.length - 1);
  }
  // Search through the heap for the value, if found, update the occurance
  // returns true if found, false if not found
  searchAndUpdateOccurance(item: any) {
    for (let i = 0; i < this.heap.length; i++) {
      if (this.heap[i].value == item) {
        this.heap[i].occurances++;
        return true;
      }
    }
    return false;
  }
  // Heapify up the heap, starting from the last index and moving up to the root
  heapifyUp(i: number) {
    // if current occurance is greater than parent, swap them, making the current node higher on the heap
    while (
      i > 0 &&
      this.heap[i].occurances > this.heap[this.parent(i)].occurances
    ) {
      this.swap(i, this.parent(i));
      i = this.parent(i);
    }
  }

  // Extract the max value from the heap, which is the root of the heap
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

  // Heapify down the heap, starting from the index i and moving down to the leaves
  heapifyDown(i: number) {
    let largest = i;
    const left = this.left(i);
    const right = this.right(i);

    // if the left child is greater than the largest, set largest to left
    if (
      left < this.heap.length &&
      this.heap[left].occurances > this.heap[largest].occurances
    ) {
      largest = left;
    }
    // if the right child is greater than the largest, set largest to right
    if (
      right < this.heap.length &&
      this.heap[right].occurances > this.heap[largest].occurances
    ) {
      largest = right;
    }

    // if the largest is not the current index, swap them and heapify down again
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
 * the values of the same keys into a single value based on the which value occurs the most.
 * Uses a MaxHeap to keep track of the occurrences of each value for each key.
 * because the max heap keeps the most common value at the top, making it easy to collapse
 *
 * returns a single JSON object with the normalized values.
 */
function normalizeJsons<T extends Json>(jsons: T[]): T {
  const holder: Jsons = {};

  // iterate through jsons and create a MaxHeap for each key
  // and insert the values into the MaxHeap
  for (const json of jsons) {
    // Get all the keys for the current json
    const keys = Object.keys(json);
    for (const key of keys) {
      if (!holder.hasOwnProperty(key)) {
        // Create a new MaxHeap for the key
        holder[key] = new MaxHeap();
        (holder[key] as MaxHeap).insert(json[key]);
      } else {
        // Insert the value into the existing MaxHeap
        (holder[key] as MaxHeap).insert(json[key]);
      }
    }
  }
  const result = {} as T;

  // collapse jsons, by getting the max value from each MaxHeap
  for (const key in holder) {
    if (holder[key] instanceof MaxHeap) {
      const currentKeyMaxHeap = holder[key] as MaxHeap;
      // extract the max value from the MaxHeap
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
