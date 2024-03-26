"use strict";

const {
  MinPriorityQueue,
} = require('@datastructures-js/priority-queue');

// Print all entries, across all of the *async* sources, in chronological order.

/**
 * Bottleneck - waiting for each individual log to resolve from popAsync every time.
 * Processing multiple logs from each logSource using promise.all() didn't work - we would get the same results for each resolved promise.
 *
 * This solution, instead, pops a new log from every non-drained logSource, every time we need a new one. This means we don't always
 * We only pop logs, when the most recently consumed log from the queue has no more logs in the queue
 * - pop first log from each source at same time - this could be increased potentially as well to grab more than the first log.
 * - each time we run out of logs from a logSource in the queue, we pop N logs
 * - the next N times we check that logSource, we can just pull directly from the priority queue instead
 * - use a separate array to store counts to tell if we should grab more logs from the logSource
 *    - array index corresponds to index in logSources, and value is # of logs from this logsource in the priority queue
 *    - if counts[currentLogSource] <= 0, pop off N more logs, otherwise grab from the priorityqueue
 */

module.exports = async (logSources, printer) => {

  // initialize priority queue with date as the comparator
  const recentLogsQueue = new MinPriorityQueue(logAndIndex => logAndIndex.log.date);
  // used to check if a given logSource still has logs in the queue
  const logsInQueueForLogSource = Array(logSources.length).fill(0);
  // used to check if a given logSource is drained
  const logsDrained = Array(logSources.length).fill(false);

  // get first log from each logSource
  const promises = logSources.map((logSource) => {
    return logSource.popAsync();
  });

  // resolve all of the first logs at same time
  await Promise.all(promises).then((data) => {
    data.forEach((log, idx) => {
      logsInQueueForLogSource[idx] += 1;
      recentLogsQueue.enqueue({ logSourceIndex: idx, log });
    });
  });

  // Process next log in queue, and replace with next logs from that logSource if needed
  while (!recentLogsQueue.isEmpty()) {
    const {logSourceIndex, log} = recentLogsQueue.dequeue();
    logsInQueueForLogSource[logSourceIndex] -= 1;
    printer.print(log)

    // only need to pop more logs if this logSource has 0 logs in the queue
    if (logsInQueueForLogSource[logSourceIndex] <= 0) {

      // get next log from each logSource
      const promises = logSources.map((logSource, idx) => {
        if (!logsDrained[idx]) {
          return logSource.popAsync();
        }
      });

      // resolve all of the popped logs at same time
      await Promise.all(promises).then((data) => {
        data.forEach((resolvedLog, idx) => {
          if (resolvedLog) {
            logsInQueueForLogSource[idx] += 1;
            recentLogsQueue.enqueue({ logSourceIndex: idx, log: resolvedLog });
          } else {
            logsDrained[idx] = true;
          }
        });
      });
    }
  }

  printer.done();
  return new Promise((resolve) => {
    resolve(console.log("Async sort complete."));
  });
};