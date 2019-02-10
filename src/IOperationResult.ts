export interface IOperationResult<T> {
    waitForResult(): Promise<T>;
}
