"use strict";

const {
  MinPriorityQueue,
} = require('@datastructures-js/priority-queue');

// Print all entries, across all of the *async* sources, in chronological order.

/**
 * Similar concept to the sync-sorted-merge
 * During initial stack creation we can do each promise at the same time, we don't need to wait for the previous one to resolve
 * When processing each part of the logSources, we always have to wait for the next log entry to resolve
 * otherwise we have no way of telling what the next value is, and if it will be > or < than
 * Brainstorming ways to make this more efficient
 *
 * Bottleneck - waiting for each individual log to resolve from popAsync every time.
 *
 * IDEA: can we be more efficient by processing two values at once all the time?
 * for example, if we process two entries at once for a logSource - when we go
 * to print the log, we can immediately check if the next one is still in order, or if we should return to the stack
 *
 * There is still a bottleneck here if we do process two entries in a row. How do we avoid this bottleneck?
 * IDEA V2: Can we start processing all of the entries in every logSource during our inital stack creation?
 * - during initial stack creation, try to start resolving every promise of every logEntry in every logSource
 * - Once our stack has 1 value from each logSource we start processing the stack?
 */

module.exports = async (logSources, printer) => {

  // initialize priority queue with date as the comparator
  const recentLogsQueue = new MinPriorityQueue(logAndIndex => logAndIndex.log.date);

  // get first log from each logSource
  const promises = logSources.map((logSource) => {
    return logSource.popAsync();
  });

  // resolve all of the first logs at same time
  await Promise.all(promises).then((data) => {
    data.forEach((log, idx) => {
      recentLogsQueue.enqueue({ logSourceIndex: idx, log });
    });
  });

  // Process next log in queue, and replace with next log from that logSource
  while (!recentLogsQueue.isEmpty()) {
    const logAndIndex = recentLogsQueue.dequeue();
    printer.print(logAndIndex.log)

    // get next log from logSource, and add to queue if not drained
    const logSource = logSources[logAndIndex.logSourceIndex];
    const nextLog = await logSource.popAsync();

    // check if logSource is drained
    if (!nextLog) {
      continue
    } else {
      recentLogsQueue.enqueue({ logSourceIndex: logAndIndex.logSourceIndex, log: nextLog })
    }
  }

  printer.done();
  return new Promise((resolve) => {
    resolve(console.log("Async sort complete."));
  });
};