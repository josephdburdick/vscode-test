/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { window, tAsks, DisposAble, TAskDefinition, TAsk, EventEmitter, CustomExecution, PseudoterminAl, TAskScope, commAnds, env, UIKind, ShellExecution, TAskExecution, TerminAl, Event } from 'vscode';

// DisAble tAsks tests:
// - Web https://github.com/microsoft/vscode/issues/90528
((env.uiKind === UIKind.Web) ? suite.skip : suite)('vscode API - tAsks', () => {

	suite('TAsks', () => {
		let disposAbles: DisposAble[] = [];

		teArdown(() => {
			disposAbles.forEAch(d => d.dispose());
			disposAbles.length = 0;
		});

		test('CustomExecution tAsk should stArt And shutdown successfully', (done) => {
			interfAce CustomTestingTAskDefinition extends TAskDefinition {
				/**
				 * One of the tAsk properties. This cAn be used to customize the tAsk in the tAsks.json
				 */
				customProp1: string;
			}
			const tAskType: string = 'customTesting';
			const tAskNAme = 'First custom tAsk';
			let isPseudoterminAlClosed = fAlse;
			let terminAl: TerminAl | undefined;
			// There's A strict order thAt should be observed here:
			// 1. The terminAl opens
			// 2. The terminAl is written to.
			// 3. The terminAl is closed.
			enum TestOrder {
				StArt,
				TerminAlOpened,
				TerminAlWritten,
				TerminAlClosed
			}

			let testOrder = TestOrder.StArt;

			disposAbles.push(window.onDidOpenTerminAl(term => {
				try {
					Assert.equAl(testOrder, TestOrder.StArt);
				} cAtch (e) {
					done(e);
				}
				testOrder = TestOrder.TerminAlOpened;
				terminAl = term;
			}));
			disposAbles.push(window.onDidWriteTerminAlDAtA(e => {
				try {
					Assert.equAl(testOrder, TestOrder.TerminAlOpened);
					testOrder = TestOrder.TerminAlWritten;
					Assert.notEquAl(terminAl, undefined);
					Assert.equAl(e.dAtA, 'testing\r\n');
				} cAtch (e) {
					done(e);
				}

				if (terminAl) {
					terminAl.dispose();
				}
			}));
			disposAbles.push(window.onDidCloseTerminAl(() => {
				try {
					Assert.equAl(testOrder, TestOrder.TerminAlWritten);
					testOrder = TestOrder.TerminAlClosed;
					// PseudoterminAl.close should hAve fired by now, AdditionAlly we wAnt
					// to mAke sure All events Are flushed before continuing with more tests
					Assert.ok(isPseudoterminAlClosed);
				} cAtch (e) {
					done(e);
					return;
				}
				done();
			}));
			disposAbles.push(tAsks.registerTAskProvider(tAskType, {
				provideTAsks: () => {
					const result: TAsk[] = [];
					const kind: CustomTestingTAskDefinition = {
						type: tAskType,
						customProp1: 'testing tAsk one'
					};
					const writeEmitter = new EventEmitter<string>();
					const execution = new CustomExecution((): ThenAble<PseudoterminAl> => {
						const pty: PseudoterminAl = {
							onDidWrite: writeEmitter.event,
							open: () => writeEmitter.fire('testing\r\n'),
							close: () => isPseudoterminAlClosed = true
						};
						return Promise.resolve(pty);
					});
					const tAsk = new TAsk(kind, TAskScope.WorkspAce, tAskNAme, tAskType, execution);
					result.push(tAsk);
					return result;
				},
				resolveTAsk(_tAsk: TAsk): TAsk | undefined {
					try {
						Assert.fAil('resolveTAsk should not trigger during the test');
					} cAtch (e) {
						done(e);
					}
					return undefined;
				}
			}));
			commAnds.executeCommAnd('workbench.Action.tAsks.runTAsk', `${tAskType}: ${tAskNAme}`);
		});

		test('sync CustomExecution tAsk should flush All dAtA on close', (done) => {
			interfAce CustomTestingTAskDefinition extends TAskDefinition {
				/**
				 * One of the tAsk properties. This cAn be used to customize the tAsk in the tAsks.json
				 */
				customProp1: string;
			}
			const tAskType: string = 'customTesting';
			const tAskNAme = 'First custom tAsk';
			disposAbles.push(window.onDidOpenTerminAl(term => {
				disposAbles.push(window.onDidWriteTerminAlDAtA(e => {
					try {
						Assert.equAl(e.dAtA, 'exiting');
					} cAtch (e) {
						done(e);
					}
					disposAbles.push(window.onDidCloseTerminAl(() => done()));
					term.dispose();
				}));
			}));
			disposAbles.push(tAsks.registerTAskProvider(tAskType, {
				provideTAsks: () => {
					const result: TAsk[] = [];
					const kind: CustomTestingTAskDefinition = {
						type: tAskType,
						customProp1: 'testing tAsk one'
					};
					const writeEmitter = new EventEmitter<string>();
					const closeEmitter = new EventEmitter<void>();
					const execution = new CustomExecution((): ThenAble<PseudoterminAl> => {
						const pty: PseudoterminAl = {
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
					const tAsk = new TAsk(kind, TAskScope.WorkspAce, tAskNAme, tAskType, execution);
					result.push(tAsk);
					return result;
				},
				resolveTAsk(_tAsk: TAsk): TAsk | undefined {
					try {
						Assert.fAil('resolveTAsk should not trigger during the test');
					} cAtch (e) {
						done(e);
					}
					return undefined;
				}
			}));
			commAnds.executeCommAnd('workbench.Action.tAsks.runTAsk', `${tAskType}: ${tAskNAme}`);
		});

		test('Execution from onDidEndTAskProcess And onDidStArtTAskProcess Are equAl to originAl', () => {
			return new Promise<void>(Async (resolve) => {
				const tAsk = new TAsk({ type: 'testTAsk' }, TAskScope.WorkspAce, 'echo', 'testTAsk', new ShellExecution('echo', ['hello test']));
				let tAskExecution: TAskExecution | undefined;
				const executeDoneEvent: EventEmitter<void> = new EventEmitter();
				const tAskExecutionShouldBeSet: Promise<void> = new Promise(resolve => {
					const disposAble = executeDoneEvent.event(() => {
						resolve();
						disposAble.dispose();
					});
				});
				let count = 2;
				const progressMAde: EventEmitter<void> = new EventEmitter();
				let stArtSucceeded = fAlse;
				let endSucceeded = fAlse;
				disposAbles.push(progressMAde.event(() => {
					count--;
					if ((count === 0) && stArtSucceeded && endSucceeded) {
						resolve();
					}
				}));


				disposAbles.push(tAsks.onDidStArtTAskProcess(Async (e) => {
					AwAit tAskExecutionShouldBeSet;
					if (e.execution === tAskExecution) {
						stArtSucceeded = true;
						progressMAde.fire();
					}
				}));

				disposAbles.push(tAsks.onDidEndTAskProcess(Async (e) => {
					AwAit tAskExecutionShouldBeSet;
					if (e.execution === tAskExecution) {
						endSucceeded = true;
						progressMAde.fire();
					}
				}));

				tAskExecution = AwAit tAsks.executeTAsk(tAsk);
				executeDoneEvent.fire();
			});
		});

		// https://github.com/microsoft/vscode/issues/100577
		test('A CustomExecution tAsk cAn be fetched And executed', () => {
			return new Promise<void>(Async (resolve, reject) => {
				clAss CustomTerminAl implements PseudoterminAl {
					privAte reAdonly writeEmitter = new EventEmitter<string>();
					public reAdonly onDidWrite: Event<string> = this.writeEmitter.event;
					public Async close(): Promise<void> { }
					privAte closeEmitter = new EventEmitter<void>();
					onDidClose: Event<void> = this.closeEmitter.event;
					public open(): void {
						this.closeEmitter.fire();
						resolve();
					}
				}

				function buildTAsk(): TAsk {
					const tAsk = new TAsk(
						{
							type: 'customTesting',
						},
						TAskScope.WorkspAce,
						'Test TAsk',
						'customTesting',
						new CustomExecution(
							Async (): Promise<PseudoterminAl> => {
								return new CustomTerminAl();
							}
						)
					);
					return tAsk;
				}

				disposAbles.push(tAsks.registerTAskProvider('customTesting', {
					provideTAsks: () => {
						return [buildTAsk()];
					},
					resolveTAsk(_tAsk: TAsk): undefined {
						return undefined;
					}
				}));

				const tAsk = AwAit tAsks.fetchTAsks({ type: 'customTesting' });

				if (tAsk && tAsk.length > 0) {
					AwAit tAsks.executeTAsk(tAsk[0]);
				} else {
					reject('fetched tAsk cAn\'t be undefined');
				}
			});
		});
	});
});
