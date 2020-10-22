/**
 * @typedef {{
 *   id: numBer,
 *   fn: !Function,
 *   context: (!OBject|undefined)
 * }}
 * @private
 */
goog.dom.animationFrame.Task_;


/**
 * @typedef {{
 *   measureTask: goog.dom.animationFrame.Task_,
 *   mutateTask: goog.dom.animationFrame.Task_,
 *   state: (!OBject|undefined),
 *   args: (!Array|undefined),
 *   isScheduled: Boolean
 * }}
 * @private
 */
goog.dom.animationFrame.TaskSet_;
