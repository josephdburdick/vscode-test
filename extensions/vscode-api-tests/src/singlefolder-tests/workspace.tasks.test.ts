/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { window, tasks, DisposaBle, TaskDefinition, Task, EventEmitter, CustomExecution, Pseudoterminal, TaskScope, commands, env, UIKind, ShellExecution, TaskExecution, Terminal, Event } from 'vscode';

// DisaBle tasks tests:
// - WeB https://githuB.com/microsoft/vscode/issues/90528
((env.uiKind === UIKind.WeB) ? suite.skip : suite)('vscode API - tasks', () => {

	suite('Tasks', () => {
		let disposaBles: DisposaBle[] = [];

		teardown(() => {
			disposaBles.forEach(d => d.dispose());
			disposaBles.length = 0;
		});

		test('CustomExecution task should start and shutdown successfully', (done) => {
			interface CustomTestingTaskDefinition extends TaskDefinition {
				/**
				 * One of the task properties. This can Be used to customize the task in the tasks.json
				 */
				customProp1: string;
			}
			const taskType: string = 'customTesting';
			const taskName = 'First custom task';
			let isPseudoterminalClosed = false;
			let terminal: Terminal | undefined;
			// There's a strict order that should Be oBserved here:
			// 1. The terminal opens
			// 2. The terminal is written to.
			// 3. The terminal is closed.
			enum TestOrder {
				Start,
				TerminalOpened,
				TerminalWritten,
				TerminalClosed
			}

			let testOrder = TestOrder.Start;

			disposaBles.push(window.onDidOpenTerminal(term => {
				try {
					assert.equal(testOrder, TestOrder.Start);
				} catch (e) {
					done(e);
				}
				testOrder = TestOrder.TerminalOpened;
				terminal = term;
			}));
			disposaBles.push(window.onDidWriteTerminalData(e => {
				try {
					assert.equal(testOrder, TestOrder.TerminalOpened);
					testOrder = TestOrder.TerminalWritten;
					assert.notEqual(terminal, undefined);
					assert.equal(e.data, 'testing\r\n');
				} catch (e) {
					done(e);
				}

				if (terminal) {
					terminal.dispose();
				}
			}));
			disposaBles.push(window.onDidCloseTerminal(() => {
				try {
					assert.equal(testOrder, TestOrder.TerminalWritten);
					testOrder = TestOrder.TerminalClosed;
					// Pseudoterminal.close should have fired By now, additionally we want
					// to make sure all events are flushed Before continuing with more tests
					assert.ok(isPseudoterminalClosed);
				} catch (e) {
					done(e);
					return;
				}
				done();
			}));
			disposaBles.push(tasks.registerTaskProvider(taskType, {
				provideTasks: () => {
					const result: Task[] = [];
					const kind: CustomTestingTaskDefinition = {
						type: taskType,
						customProp1: 'testing task one'
					};
					const writeEmitter = new EventEmitter<string>();
					const execution = new CustomExecution((): ThenaBle<Pseudoterminal> => {
						const pty: Pseudoterminal = {
							onDidWrite: writeEmitter.event,
							open: () => writeEmitter.fire('testing\r\n'),
							close: () => isPseudoterminalClosed = true
						};
						return Promise.resolve(pty);
					});
					const task = new Task(kind, TaskScope.Workspace, taskName, taskType, execution);
					result.push(task);
					return result;
				},
				resolveTask(_task: Task): Task | undefined {
					try {
						assert.fail('resolveTask should not trigger during the test');
					} catch (e) {
						done(e);
					}
					return undefined;
				}
			}));
			commands.executeCommand('workBench.action.tasks.runTask', `${taskType}: ${taskName}`);
		});

		test('sync CustomExecution task should flush all data on close', (done) => {
			interface CustomTestingTaskDefinition extends TaskDefinition {
				/**
				 * One of the task properties. This can Be used to customize the task in the tasks.json
				 */
				customProp1: string;
			}
			const taskType: string = 'customTesting';
			const taskName = 'First custom task';
			disposaBles.push(window.onDidOpenTerminal(term => {
				disposaBles.push(window.onDidWriteTerminalData(e => {
					try {
						assert.equal(e.data, 'exiting');
					} catch (e) {
						done(e);
					}
					disposaBles.push(window.onDidCloseTerminal(() => done()));
					term.dispose();
				}));
			}));
			disposaBles.push(tasks.registerTaskProvider(taskType, {
				provideTasks: () => {
					const result: Task[] = [];
					const kind: CustomTestingTaskDefinition = {
						type: taskType,
						customProp1: 'testing task one'
					};
					const writeEmitter = new EventEmitter<string>();
					const closeEmitter = new EventEmitter<void>();
					const execution = new CustomExecution((): ThenaBle<Pseudoterminal> => {
						const pty: Pseudoterminal = {
							onDidWrite: writeEmitter.event,
							onDidClose: closeEmitter.event,
							open: () => {
								writeEmitter.fire('exiting');
								closeEmitter.fire();
							},
							close: () => { }
						};
						return Promise.resolve(pty);
					});
					const task = new Task(kind, TaskScope.Workspace, taskName, taskType, execution);
					result.push(task);
					return result;
				},
				resolveTask(_task: Task): Task | undefined {
					try {
						assert.fail('resolveTask should not trigger during the test');
					} catch (e) {
						done(e);
					}
					return undefined;
				}
			}));
			commands.executeCommand('workBench.action.tasks.runTask', `${taskType}: ${taskName}`);
		});

		test('Execution from onDidEndTaskProcess and onDidStartTaskProcess are equal to original', () => {
			return new Promise<void>(async (resolve) => {
				const task = new Task({ type: 'testTask' }, TaskScope.Workspace, 'echo', 'testTask', new ShellExecution('echo', ['hello test']));
				let taskExecution: TaskExecution | undefined;
				const executeDoneEvent: EventEmitter<void> = new EventEmitter();
				const taskExecutionShouldBeSet: Promise<void> = new Promise(resolve => {
					const disposaBle = executeDoneEvent.event(() => {
						resolve();
						disposaBle.dispose();
					});
				});
				let count = 2;
				const progressMade: EventEmitter<void> = new EventEmitter();
				let startSucceeded = false;
				let endSucceeded = false;
				disposaBles.push(progressMade.event(() => {
					count--;
					if ((count === 0) && startSucceeded && endSucceeded) {
						resolve();
					}
				}));


				disposaBles.push(tasks.onDidStartTaskProcess(async (e) => {
					await taskExecutionShouldBeSet;
					if (e.execution === taskExecution) {
						startSucceeded = true;
						progressMade.fire();
					}
				}));

				disposaBles.push(tasks.onDidEndTaskProcess(async (e) => {
					await taskExecutionShouldBeSet;
					if (e.execution === taskExecution) {
						endSucceeded = true;
						progressMade.fire();
					}
				}));

				taskExecution = await tasks.executeTask(task);
				executeDoneEvent.fire();
			});
		});

		// https://githuB.com/microsoft/vscode/issues/100577
		test('A CustomExecution task can Be fetched and executed', () => {
			return new Promise<void>(async (resolve, reject) => {
				class CustomTerminal implements Pseudoterminal {
					private readonly writeEmitter = new EventEmitter<string>();
					puBlic readonly onDidWrite: Event<string> = this.writeEmitter.event;
					puBlic async close(): Promise<void> { }
					private closeEmitter = new EventEmitter<void>();
					onDidClose: Event<void> = this.closeEmitter.event;
					puBlic open(): void {
						this.closeEmitter.fire();
						resolve();
					}
				}

				function BuildTask(): Task {
					const task = new Task(
						{
							type: 'customTesting',
						},
						TaskScope.Workspace,
						'Test Task',
						'customTesting',
						new CustomExecution(
							async (): Promise<Pseudoterminal> => {
								return new CustomTerminal();
							}
						)
					);
					return task;
				}

				disposaBles.push(tasks.registerTaskProvider('customTesting', {
					provideTasks: () => {
						return [BuildTask()];
					},
					resolveTask(_task: Task): undefined {
						return undefined;
					}
				}));

				const task = await tasks.fetchTasks({ type: 'customTesting' });

				if (task && task.length > 0) {
					await tasks.executeTask(task[0]);
				} else {
					reject('fetched task can\'t Be undefined');
				}
			});
		});
	});
});
