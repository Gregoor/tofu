export function createQueue<T>(process: (item: T) => Promise<unknown>) {
  let isWorkingThroughQueue = false;
  let queue: T[] = [];

  return async function enqueue(item: T) {
    queue.unshift(item);

    if (isWorkingThroughQueue) {
      return;
    }
    isWorkingThroughQueue = true;

    for (let item = queue.pop(); item; item = queue.pop()) {
      await process(item);
    }

    isWorkingThroughQueue = false;
  };
}
