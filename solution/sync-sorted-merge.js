"use strict";

const {
  MinPriorityQueue,
} = require('@datastructures-js/priority-queue');
const { recent } = require("Faker/lib/date");

// Print all entries, across all of the sources, in chronological order.

/**
 * Importing a priority queue library - I'm not sure if this is allowed,
 * but the alternative was to look at a JS implementation of a priority queue and
 * re - create it in code, which felt silly when I'd import a library in the real world.
 * There is a commented out solution at the bottom without using a prioritiy queue
 *
 * Time complexity estimate:
 *  - initializing values into heap will be O(n * log(n)) where n is num of logSources - we loop n times,
 *    and in each loop we insert into the heap which is log(K) where K is the size of the current heap.
 *    It ill be slighlty less than log(n) since the heap size increases each iteration until the last when its size n
 * Space complexity estimate:
 *  - O(n) where n is num of logSources - we always have at most 1 logEntry per logSource in the heap
 */
module.exports = (logSources, printer) => {

  // initialize priority queue with date as the comparator
  const recentLogsQueue = new MinPriorityQueue(logAndIndex => logAndIndex.log.date);

  // Populate priority queue with first log from each logSource
  logSources.forEach((logSource, idx) => {
    // add most recent log from each logSource to minheap
    const log = logSource.pop();
    // include logSourceIndex so we can replace the log with next log from that logSource once we process it in the queue
    recentLogsQueue.enqueue({ logSourceIndex: idx, log });
  });

  // Process next log in queue, and replace with next log from that logSource
  while (!recentLogsQueue.isEmpty()) {
    const logAndIndex = recentLogsQueue.dequeue();
    printer.print(logAndIndex.log)

    // get next log from logSource, and add to queue if not drained
    const logSource = logSources[logAndIndex.logSourceIndex];
    const nextLog = logSource.pop()

    // check if logSource is drained
    if (nextLog) {
      recentLogsQueue.enqueue({logSourceIndex: logAndIndex.logSourceIndex, log: nextLog})
    }
  }

  printer.done();
  return console.log("Sync sort complete.");
};

// First attempt - using stack as a psuedo-priority queue. This one is less efficient, but kept it here in case I needed a solution without importing a library
/**
 * Solution time/space complexities
 * N = # of logSources
 * K = # of logEntries per logSource
 *
 * Time:
 *  - initial stack creation will be O(N^2) - worst case we loop through each source, then have to splice each source - splice is O(N)
 *  - printing all of the logs after sorting - worst case is we only get one log at a time from each logSource, then splice, and pop a new logSource from the stack
 *    - this would be O(N*K), we loop through every log - O(K), then for each log we would splice - O(N)
 *
 * Space:
 *  - Stack is the only data structure we use, which takes O(N*K) space since worst case we splice after every single log, which creates a new stack
//  */

// const insertInChronologicalPosition = (recentLogsStack, log, logSourceIndex) => {
//   // If logSource is not empty, push next one to the right spot in stack
//   let nextLogIdx = recentLogsStack.length - 1;
//   while (nextLogIdx >= 0 && recentLogsStack.at(nextLogIdx).log.date < log.date) {
//     nextLogIdx -= 1;
//   }
//   recentLogsStack.splice(nextLogIdx + 1, 0, { logSourceIndex, log });
// }

// // pop next log from stack, print it, and keep poppping from that logSource
// // while the next log is newer. Once it's older, then insert it into the stack
// const printNext = (recentLogsStack, logSources, printer) => {
//   // pop the newest entry from the stack
//   let current = recentLogsStack.pop();
//   const logSource = logSources[current.logSourceIndex];
//   let log = current.log;

//   if (recentLogsStack.length == 0) {
//     while (log) {
//       printer.print(log);
//       log = logSource.pop();
//     }
//   } else {
//     //  keep popping as long as the next one is newer than the top of stack and logSource is not drained
//     while (log && log.date <= recentLogsStack.at(-1).log.date) {
//       printer.print(log);
//       log = logSource.pop();
//     }
//   }

//   // Two scenarios now - logSource is drained, or the next log in logSource is older than the top of the stack
//   // logSource.pop() will return false if it's drained
//   if (log) {
//     insertInChronologicalPosition(recentLogsStack, log, current.logSourceIndex);
//   }
// };

// module.exports = (logSources, printer) => {
//   // Create a stack that stores the next entry from each log source
//   // Next log in the stack dictates what logsurce to remove from next
//   // Remove from logsource, and compare next log to next entry in stack
//   // While next log from logsource is more recent than next entry, continue draining that logsource

//   // stack to hold the most recent log from each logSource
//   const recentLogsStack = [];
//   logSources.forEach((logSource, idx) => {
//     const log = logSource.pop();

//     if (!recentLogsStack.at(-1) || recentLogsStack.at(-1).log.date > log.date) {
//       // nothing in the stack yet, add the entry
//       recentLogsStack.push({ logSourceIndex: idx, log })
//       return;
//     }

//     // Log is older than top of stack - find the right spot to insert it
//     if (recentLogsStack.at(-1).log.date < log.date) {
//       insertInChronologicalPosition(recentLogsStack, log, idx);
//     }
//   });

//   // Print newest log, and update stack until all sources are drained
//   while (recentLogsStack.length > 0) {
//     // Pop next log from stack, and get all the newest from that logSource
//     printNext(recentLogsStack, logSources, printer);
//   }

//   printer.done();
//   return console.log("Sync sort complete.");
// };
