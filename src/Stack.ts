export class Stack<T> {
    private array: T[] = [];

    pop(): T | undefined {
        return this.isEmpty() ? undefined : this.array.pop();
    }

    push(data: T): void {
        this.array.push(data);
    }

    isEmpty(): boolean {
        return this.array.length === 0;
    }
}