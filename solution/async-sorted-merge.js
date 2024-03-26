"use strict";

const {
  MinPriorityQueue,
} = require('@datastructures-js/priority-queue');

// Print all entries, across all of the *async* sources, in chronological order.

/**
 * Bottleneck - waiting for each individual log to resolve from popAsync every time.
 *
 * for example, if we process N (we can adjust value of N to control whether we care more about time or space) entries at once for a logSource - when we go
 * to print the nextLog, we don't always have to wait for another popAsync, if there is still anothe entry from that logSource in our queue
 * - pop first log from each source at same time - this could be increased potentially as well to grab more than the first log.
 * - each time we run out of logs from a logSource in the queue, we pop N logs
 * - the next N times we check that logSource, we can just pull directly from the priority queue instead
 * - use a separate array to store counts to tell if we should grab more logs from the logSource
 *    - array index corresponds to index in logSources, and value is # of logs from this logsource in the priority queue
 *    - if counts[currentLogSource] <= 0, pop off N more logs, otherwise grab from the priorityqueue
 */

// this constant can be adjusted to any number we want, depending on if we are prioritizing space or time
// higher limit => faster processing, but potentially more space used since more entries may be stored in the priority queue
// We could use logSources.length instead, to ensure we process results faster, as the input size gets bigger? This would also increase space used as input size got bigger though.
const NUMBER_OF_LOGS_TO_PROCESS_AT_ONCE = 2;

module.exports = async (logSources, printer) => {

  // initialize priority queue with date as the comparator
  const recentLogsQueue = new MinPriorityQueue(logAndIndex => logAndIndex.log.date);
  const logsInQueueForLogSource = Array(logSources.length).fill(0);

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

  // Process next log in queue, and replace with next log from that logSource
  while (!recentLogsQueue.isEmpty()) {
    const logAndIndex = recentLogsQueue.dequeue();
    logsInQueueForLogSource[logAndIndex.logSourceIndex] -= 1;
    printer.print(logAndIndex.log)

    // only need to pop more logs if this logSource has 0 logs in the queue
    if (logsInQueueForLogSource[logAndIndex.logSourceIndex] <= 0) {
      // get next log from logSource, and add to queue if not drained
      const logSource = logSources[logAndIndex.logSourceIndex];
      const promises = []

      for (let i = 0; i < NUMBER_OF_LOGS_TO_PROCESS_AT_ONCE; i++) {
        promises.push(logSource.popAsync());
      }

      // resolve all of the first logs at same time
      await Promise.all(promises).then((data) => {
        data.forEach((log) => {
          if (log) {
            logsInQueueForLogSource[logAndIndex.logSourceIndex] += 1;
            recentLogsQueue.enqueue({ logSourceIndex: logAndIndex.logSourceIndex, log });
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