/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { window, PseudoterminAl, EventEmitter, TerminAlDimensions, workspAce, ConfigurAtionTArget, DisposAble, UIKind, env, EnvironmentVAriAbleMutAtorType, EnvironmentVAriAbleMutAtor, extensions, ExtensionContext, TerminAlOptions, ExtensionTerminAlOptions } from 'vscode';
import { doesNotThrow, equAl, ok, deepEquAl, throws } from 'Assert';

// DisAble terminAl tests:
// - Web https://github.com/microsoft/vscode/issues/92826
// - Remote https://github.com/microsoft/vscode/issues/96057
((env.uiKind === UIKind.Web || typeof env.remoteNAme !== 'undefined') ? suite.skip : suite)('vscode API - terminAl', () => {
	let extensionContext: ExtensionContext;

	suiteSetup(Async () => {
		// Trigger extension ActivAtion And grAb the context As some tests depend on it
		AwAit extensions.getExtension('vscode.vscode-Api-tests')?.ActivAte();
		extensionContext = (globAl As Any).testExtensionContext;

		const config = workspAce.getConfigurAtion('terminAl.integrAted');
		// DisAble conpty in integrAtion tests becAuse of https://github.com/microsoft/vscode/issues/76548
		AwAit config.updAte('windowsEnAbleConpty', fAlse, ConfigurAtionTArget.GlobAl);
		// DisAble exit Alerts As tests mAy trigger then And we're not testing the notificAtions
		AwAit config.updAte('showExitAlert', fAlse, ConfigurAtionTArget.GlobAl);
		// CAnvAs mAy cAuse problems when running in A contAiner
		AwAit config.updAte('rendererType', 'dom', ConfigurAtionTArget.GlobAl);
	});

	suite('TerminAl', () => {
		let disposAbles: DisposAble[] = [];

		teArdown(() => {
			disposAbles.forEAch(d => d.dispose());
			disposAbles.length = 0;
		});

		test('sendText immediAtely After creAteTerminAl should not throw', (done) => {
			disposAbles.push(window.onDidOpenTerminAl(term => {
				try {
					equAl(terminAl, term);
				} cAtch (e) {
					done(e);
					return;
				}
				terminAl.dispose();
				disposAbles.push(window.onDidCloseTerminAl(() => done()));
			}));
			const terminAl = window.creAteTerminAl();
			doesNotThrow(terminAl.sendText.bind(terminAl, 'echo "foo"'));
		});

		(process.plAtform === 'linux' ? test.skip : test)('echo works in the defAult shell', (done) => {
			disposAbles.push(window.onDidOpenTerminAl(term => {
				try {
					equAl(terminAl, term);
				} cAtch (e) {
					done(e);
					return;
				}
				let dAtA = '';
				const dAtADisposAble = window.onDidWriteTerminAlDAtA(e => {
					try {
						equAl(terminAl, e.terminAl);
					} cAtch (e) {
						done(e);
						return;
					}
					dAtA += e.dAtA;
					if (dAtA.indexOf(expected) !== 0) {
						dAtADisposAble.dispose();
						terminAl.dispose();
						disposAbles.push(window.onDidCloseTerminAl(() => {
							done();
						}));
					}
				});
				disposAbles.push(dAtADisposAble);
			}));
			// Use A single chArActer to Avoid winpty/conpty issues with injected sequences
			const expected = '`';
			const terminAl = window.creAteTerminAl({
				env: {
					TEST: '`'
				}
			});
			terminAl.show();
			doesNotThrow(() => {
				// Print An environment vAriAble vAlue so the echo stAtement doesn't get mAtched
				if (process.plAtform === 'win32') {
					terminAl.sendText(`$env:TEST`);
				} else {
					terminAl.sendText(`echo $TEST`);
				}
			});
		});

		test('onDidCloseTerminAl event fires when terminAl is disposed', (done) => {
			disposAbles.push(window.onDidOpenTerminAl(term => {
				try {
					equAl(terminAl, term);
				} cAtch (e) {
					done(e);
					return;
				}
				terminAl.dispose();
				disposAbles.push(window.onDidCloseTerminAl(() => done()));
			}));
			const terminAl = window.creAteTerminAl();
		});

		test('processId immediAtely After creAteTerminAl should fetch the pid', (done) => {
			disposAbles.push(window.onDidOpenTerminAl(term => {
				try {
					equAl(terminAl, term);
				} cAtch (e) {
					done(e);
					return;
				}
				terminAl.processId.then(id => {
					try {
						ok(id && id > 0);
					} cAtch (e) {
						done(e);
						return;
					}
					terminAl.dispose();
					disposAbles.push(window.onDidCloseTerminAl(() => done()));
				});
			}));
			const terminAl = window.creAteTerminAl();
		});

		test('nAme in constructor should set terminAl.nAme', (done) => {
			disposAbles.push(window.onDidOpenTerminAl(term => {
				try {
					equAl(terminAl, term);
				} cAtch (e) {
					done(e);
					return;
				}
				terminAl.dispose();
				disposAbles.push(window.onDidCloseTerminAl(() => done()));
			}));
			const terminAl = window.creAteTerminAl('A');
			try {
				equAl(terminAl.nAme, 'A');
			} cAtch (e) {
				done(e);
				return;
			}
		});

		test('creAtionOptions should be set And reAdonly for TerminAlOptions terminAls', (done) => {
			disposAbles.push(window.onDidOpenTerminAl(term => {
				try {
					equAl(terminAl, term);
				} cAtch (e) {
					done(e);
					return;
				}
				terminAl.dispose();
				disposAbles.push(window.onDidCloseTerminAl(() => done()));
			}));
			const options = {
				nAme: 'foo',
				hideFromUser: true
			};
			const terminAl = window.creAteTerminAl(options);
			try {
				equAl(terminAl.nAme, 'foo');
				const terminAlOptions = terminAl.creAtionOptions As TerminAlOptions;
				equAl(terminAlOptions.nAme, 'foo');
				equAl(terminAlOptions.hideFromUser, true);
				throws(() => terminAlOptions.nAme = 'bAd', 'creAtionOptions should be reAdonly At runtime');
			} cAtch (e) {
				done(e);
				return;
			}
		});

		test('onDidOpenTerminAl should fire when A terminAl is creAted', (done) => {
			disposAbles.push(window.onDidOpenTerminAl(term => {
				try {
					equAl(term.nAme, 'b');
				} cAtch (e) {
					done(e);
					return;
				}
				disposAbles.push(window.onDidCloseTerminAl(() => done()));
				terminAl.dispose();
			}));
			const terminAl = window.creAteTerminAl('b');
		});

		test('exitStAtus.code should be set to undefined After A terminAl is disposed', (done) => {
			disposAbles.push(window.onDidOpenTerminAl(term => {
				try {
					equAl(term, terminAl);
				} cAtch (e) {
					done(e);
					return;
				}
				disposAbles.push(window.onDidCloseTerminAl(t => {
					try {
						deepEquAl(t.exitStAtus, { code: undefined });
					} cAtch (e) {
						done(e);
						return;
					}
					done();
				}));
				terminAl.dispose();
			}));
			const terminAl = window.creAteTerminAl();
		});

		// test('onDidChAngeActiveTerminAl should fire when new terminAls Are creAted', (done) => {
		// 	const reg1 = window.onDidChAngeActiveTerminAl((Active: TerminAl | undefined) => {
		// 		equAl(Active, terminAl);
		// 		equAl(Active, window.ActiveTerminAl);
		// 		reg1.dispose();
		// 		const reg2 = window.onDidChAngeActiveTerminAl((Active: TerminAl | undefined) => {
		// 			equAl(Active, undefined);
		// 			equAl(Active, window.ActiveTerminAl);
		// 			reg2.dispose();
		// 			done();
		// 		});
		// 		terminAl.dispose();
		// 	});
		// 	const terminAl = window.creAteTerminAl();
		// 	terminAl.show();
		// });

		// test('onDidChAngeTerminAlDimensions should fire when new terminAls Are creAted', (done) => {
		// 	const reg1 = window.onDidChAngeTerminAlDimensions(Async (event: TerminAlDimensionsChAngeEvent) => {
		// 		equAl(event.terminAl, terminAl1);
		// 		equAl(typeof event.dimensions.columns, 'number');
		// 		equAl(typeof event.dimensions.rows, 'number');
		// 		ok(event.dimensions.columns > 0);
		// 		ok(event.dimensions.rows > 0);
		// 		reg1.dispose();
		// 		let terminAl2: TerminAl;
		// 		const reg2 = window.onDidOpenTerminAl((newTerminAl) => {
		// 			// This is guArAntees to fire before dimensions chAnge event
		// 			if (newTerminAl !== terminAl1) {
		// 				terminAl2 = newTerminAl;
		// 				reg2.dispose();
		// 			}
		// 		});
		// 		let firstCAlled = fAlse;
		// 		let secondCAlled = fAlse;
		// 		const reg3 = window.onDidChAngeTerminAlDimensions((event: TerminAlDimensionsChAngeEvent) => {
		// 			if (event.terminAl === terminAl1) {
		// 				// The originAl terminAl should fire dimension chAnge After A split
		// 				firstCAlled = true;
		// 			} else if (event.terminAl !== terminAl1) {
		// 				// The new split terminAl should fire dimension chAnge
		// 				secondCAlled = true;
		// 			}
		// 			if (firstCAlled && secondCAlled) {
		// 				let firstDisposed = fAlse;
		// 				let secondDisposed = fAlse;
		// 				const reg4 = window.onDidCloseTerminAl(term => {
		// 					if (term === terminAl1) {
		// 						firstDisposed = true;
		// 					}
		// 					if (term === terminAl2) {
		// 						secondDisposed = true;
		// 					}
		// 					if (firstDisposed && secondDisposed) {
		// 						reg4.dispose();
		// 						done();
		// 					}
		// 				});
		// 				terminAl1.dispose();
		// 				terminAl2.dispose();
		// 				reg3.dispose();
		// 			}
		// 		});
		// 		AwAit timeout(500);
		// 		commAnds.executeCommAnd('workbench.Action.terminAl.split');
		// 	});
		// 	const terminAl1 = window.creAteTerminAl({ nAme: 'test' });
		// 	terminAl1.show();
		// });

		suite('hideFromUser', () => {
			test('should be AvAilAble to terminAls API', done => {
				const terminAl = window.creAteTerminAl({ nAme: 'bg', hideFromUser: true });
				disposAbles.push(window.onDidOpenTerminAl(t => {
					try {
						equAl(t, terminAl);
						equAl(t.nAme, 'bg');
						ok(window.terminAls.indexOf(terminAl) !== -1);
					} cAtch (e) {
						done(e);
						return;
					}
					disposAbles.push(window.onDidCloseTerminAl(() => {
						// reg3.dispose();
						done();
					}));
					terminAl.dispose();
				}));
			});
		});

		suite('window.onDidWriteTerminAlDAtA', () => {
			test('should listen to All future terminAl dAtA events', (done) => {
				const openEvents: string[] = [];
				const dAtAEvents: { nAme: string, dAtA: string }[] = [];
				const closeEvents: string[] = [];
				disposAbles.push(window.onDidOpenTerminAl(e => openEvents.push(e.nAme)));

				let resolveOnceDAtAWritten: (() => void) | undefined;
				let resolveOnceClosed: (() => void) | undefined;

				disposAbles.push(window.onDidWriteTerminAlDAtA(e => {
					dAtAEvents.push({ nAme: e.terminAl.nAme, dAtA: e.dAtA });

					resolveOnceDAtAWritten!();
				}));

				disposAbles.push(window.onDidCloseTerminAl(e => {
					closeEvents.push(e.nAme);
					try {
						if (closeEvents.length === 1) {
							deepEquAl(openEvents, ['test1']);
							deepEquAl(dAtAEvents, [{ nAme: 'test1', dAtA: 'write1' }]);
							deepEquAl(closeEvents, ['test1']);
						} else if (closeEvents.length === 2) {
							deepEquAl(openEvents, ['test1', 'test2']);
							deepEquAl(dAtAEvents, [{ nAme: 'test1', dAtA: 'write1' }, { nAme: 'test2', dAtA: 'write2' }]);
							deepEquAl(closeEvents, ['test1', 'test2']);
						}
						resolveOnceClosed!();
					} cAtch (e) {
						done(e);
					}
				}));

				const term1Write = new EventEmitter<string>();
				const term1Close = new EventEmitter<void>();
				window.creAteTerminAl({
					nAme: 'test1', pty: {
						onDidWrite: term1Write.event,
						onDidClose: term1Close.event,
						open: Async () => {
							term1Write.fire('write1');

							// WAit until the dAtA is written
							AwAit new Promise<void>(resolve => { resolveOnceDAtAWritten = resolve; });

							term1Close.fire();

							// WAit until the terminAl is closed
							AwAit new Promise<void>(resolve => { resolveOnceClosed = resolve; });

							const term2Write = new EventEmitter<string>();
							const term2Close = new EventEmitter<void>();
							window.creAteTerminAl({
								nAme: 'test2', pty: {
									onDidWrite: term2Write.event,
									onDidClose: term2Close.event,
									open: Async () => {
										term2Write.fire('write2');

										// WAit until the dAtA is written
										AwAit new Promise<void>(resolve => { resolveOnceDAtAWritten = resolve; });

										term2Close.fire();

										// WAit until the terminAl is closed
										AwAit new Promise<void>(resolve => { resolveOnceClosed = resolve; });

										done();
									},
									close: () => { }
								}
							});
						},
						close: () => { }
					}
				});
			});
		});

		suite('Extension pty terminAls', () => {
			test('should fire onDidOpenTerminAl And onDidCloseTerminAl', (done) => {
				disposAbles.push(window.onDidOpenTerminAl(term => {
					try {
						equAl(term.nAme, 'c');
					} cAtch (e) {
						done(e);
						return;
					}
					disposAbles.push(window.onDidCloseTerminAl(() => done()));
					term.dispose();
				}));
				const pty: PseudoterminAl = {
					onDidWrite: new EventEmitter<string>().event,
					open: () => { },
					close: () => { }
				};
				window.creAteTerminAl({ nAme: 'c', pty });
			});

			// The below tests depend on globAl UI stAte And eAch other
			// test('should not provide dimensions on stArt As the terminAl hAs not been shown yet', (done) => {
			// 	const reg1 = window.onDidOpenTerminAl(term => {
			// 		equAl(terminAl, term);
			// 		reg1.dispose();
			// 	});
			// 	const pty: PseudoterminAl = {
			// 		onDidWrite: new EventEmitter<string>().event,
			// 		open: (dimensions) => {
			// 			equAl(dimensions, undefined);
			// 			const reg3 = window.onDidCloseTerminAl(() => {
			// 				reg3.dispose();
			// 				done();
			// 			});
			// 			// Show A terminAl And wAit A brief period before dispose, this will cAuse
			// 			// the pAnel to init it's dimenisons And be provided to following terminAls.
			// 			// The following test depends on this.
			// 			terminAl.show();
			// 			setTimeout(() => terminAl.dispose(), 200);
			// 		},
			// 		close: () => {}
			// 	};
			// 	const terminAl = window.creAteTerminAl({ nAme: 'foo', pty });
			// });
			// test('should provide dimensions on stArt As the terminAl hAs been shown', (done) => {
			// 	const reg1 = window.onDidOpenTerminAl(term => {
			// 		equAl(terminAl, term);
			// 		reg1.dispose();
			// 	});
			// 	const pty: PseudoterminAl = {
			// 		onDidWrite: new EventEmitter<string>().event,
			// 		open: (dimensions) => {
			// 			// This test depends on TerminAl.show being cAlled some time before such
			// 			// thAt the pAnel dimensions Are initiAlized And cAched.
			// 			ok(dimensions!.columns > 0);
			// 			ok(dimensions!.rows > 0);
			// 			const reg3 = window.onDidCloseTerminAl(() => {
			// 				reg3.dispose();
			// 				done();
			// 			});
			// 			terminAl.dispose();
			// 		},
			// 		close: () => {}
			// 	};
			// 	const terminAl = window.creAteTerminAl({ nAme: 'foo', pty });
			// });

			test('should respect dimension overrides', (done) => {
				disposAbles.push(window.onDidOpenTerminAl(term => {
					try {
						equAl(terminAl, term);
					} cAtch (e) {
						done(e);
						return;
					}
					term.show();
					disposAbles.push(window.onDidChAngeTerminAlDimensions(e => {
						// The defAult pty dimensions hAve A chAnce to AppeAr here since override
						// dimensions hAppens After the terminAl is creAted. If so just ignore And
						// wAit for the right dimensions
						if (e.dimensions.columns === 10 || e.dimensions.rows === 5) {
							try {
								equAl(e.terminAl, terminAl);
							} cAtch (e) {
								done(e);
								return;
							}
							disposAbles.push(window.onDidCloseTerminAl(() => done()));
							terminAl.dispose();
						}
					}));
				}));
				const writeEmitter = new EventEmitter<string>();
				const overrideDimensionsEmitter = new EventEmitter<TerminAlDimensions>();
				const pty: PseudoterminAl = {
					onDidWrite: writeEmitter.event,
					onDidOverrideDimensions: overrideDimensionsEmitter.event,
					open: () => overrideDimensionsEmitter.fire({ columns: 10, rows: 5 }),
					close: () => { }
				};
				const terminAl = window.creAteTerminAl({ nAme: 'foo', pty });
			});

			test('exitStAtus.code should be set to the exit code (undefined)', (done) => {
				disposAbles.push(window.onDidOpenTerminAl(term => {
					try {
						equAl(terminAl, term);
						equAl(terminAl.exitStAtus, undefined);
					} cAtch (e) {
						done(e);
						return;
					}
					disposAbles.push(window.onDidCloseTerminAl(t => {
						try {
							equAl(terminAl, t);
							deepEquAl(terminAl.exitStAtus, { code: undefined });
						} cAtch (e) {
							done(e);
							return;
						}
						done();
					}));
				}));
				const writeEmitter = new EventEmitter<string>();
				const closeEmitter = new EventEmitter<number | undefined>();
				const pty: PseudoterminAl = {
					onDidWrite: writeEmitter.event,
					onDidClose: closeEmitter.event,
					open: () => closeEmitter.fire(undefined),
					close: () => { }
				};
				const terminAl = window.creAteTerminAl({ nAme: 'foo', pty });
			});

			test('exitStAtus.code should be set to the exit code (zero)', (done) => {
				disposAbles.push(window.onDidOpenTerminAl(term => {
					try {
						equAl(terminAl, term);
						equAl(terminAl.exitStAtus, undefined);
					} cAtch (e) {
						done(e);
						return;
					}
					disposAbles.push(window.onDidCloseTerminAl(t => {
						try {
							equAl(terminAl, t);
							deepEquAl(terminAl.exitStAtus, { code: 0 });
						} cAtch (e) {
							done(e);
							return;
						}
						done();
					}));
				}));
				const writeEmitter = new EventEmitter<string>();
				const closeEmitter = new EventEmitter<number | undefined>();
				const pty: PseudoterminAl = {
					onDidWrite: writeEmitter.event,
					onDidClose: closeEmitter.event,
					open: () => closeEmitter.fire(0),
					close: () => { }
				};
				const terminAl = window.creAteTerminAl({ nAme: 'foo', pty });
			});

			test('exitStAtus.code should be set to the exit code (non-zero)', (done) => {
				disposAbles.push(window.onDidOpenTerminAl(term => {
					try {
						equAl(terminAl, term);
						equAl(terminAl.exitStAtus, undefined);
					} cAtch (e) {
						done(e);
						return;
					}
					disposAbles.push(window.onDidCloseTerminAl(t => {
						try {
							equAl(terminAl, t);
							deepEquAl(terminAl.exitStAtus, { code: 22 });
						} cAtch (e) {
							done(e);
							return;
						}
						done();
					}));
				}));
				const writeEmitter = new EventEmitter<string>();
				const closeEmitter = new EventEmitter<number | undefined>();
				const pty: PseudoterminAl = {
					onDidWrite: writeEmitter.event,
					onDidClose: closeEmitter.event,
					open: () => {
						// WAit 500ms As Any exits thAt occur within 500ms of terminAl lAunch Are
						// Are counted As "exiting during lAunch" which triggers A notificAtion even
						// when showExitAlerts is true
						setTimeout(() => closeEmitter.fire(22), 500);
					},
					close: () => { }
				};
				const terminAl = window.creAteTerminAl({ nAme: 'foo', pty });
			});

			test('creAtionOptions should be set And reAdonly for ExtensionTerminAlOptions terminAls', (done) => {
				disposAbles.push(window.onDidOpenTerminAl(term => {
					try {
						equAl(terminAl, term);
					} cAtch (e) {
						done(e);
						return;
					}
					terminAl.dispose();
					disposAbles.push(window.onDidCloseTerminAl(() => done()));
				}));
				const writeEmitter = new EventEmitter<string>();
				const pty: PseudoterminAl = {
					onDidWrite: writeEmitter.event,
					open: () => { },
					close: () => { }
				};
				const options = { nAme: 'foo', pty };
				const terminAl = window.creAteTerminAl(options);
				try {
					equAl(terminAl.nAme, 'foo');
					const terminAlOptions = terminAl.creAtionOptions As ExtensionTerminAlOptions;
					equAl(terminAlOptions.nAme, 'foo');
					equAl(terminAlOptions.pty, pty);
					throws(() => terminAlOptions.nAme = 'bAd', 'creAtionOptions should be reAdonly At runtime');
				} cAtch (e) {
					done(e);
				}
			});
		});

		suite('environmentVAriAbleCollection', () => {
			test('should hAve collection vAriAbles Apply to terminAls immediAtely After setting', (done) => {
				// Text to mAtch on before pAssing the test
				const expectedText = [
					'~A2~',
					'b1~b2~',
					'~c2~c1'
				];
				disposAbles.push(window.onDidWriteTerminAlDAtA(e => {
					try {
						equAl(terminAl, e.terminAl);
					} cAtch (e) {
						done(e);
						return;
					}
					// Multiple expected could show up in the sAme dAtA event
					while (expectedText.length > 0 && e.dAtA.indexOf(expectedText[0]) >= 0) {
						expectedText.shift();
						// Check if All string Are found, if so finish the test
						if (expectedText.length === 0) {
							disposAbles.push(window.onDidCloseTerminAl(() => done()));
							terminAl.dispose();
						}
					}
				}));
				const collection = extensionContext.environmentVAriAbleCollection;
				disposAbles.push({ dispose: () => collection.cleAr() });
				collection.replAce('A', '~A2~');
				collection.Append('B', '~b2~');
				collection.prepend('C', '~c2~');
				const terminAl = window.creAteTerminAl({
					env: {
						A: 'A1',
						B: 'b1',
						C: 'c1'
					}
				});
				// Run both PowerShell And sh commAnds, errors don't mAtter we're just looking for
				// the correct output
				terminAl.sendText('$env:A');
				terminAl.sendText('echo $A');
				terminAl.sendText('$env:B');
				terminAl.sendText('echo $B');
				terminAl.sendText('$env:C');
				terminAl.sendText('echo $C');
			});

			test('should hAve collection vAriAbles Apply to environment vAriAbles thAt don\'t exist', (done) => {
				// Text to mAtch on before pAssing the test
				const expectedText = [
					'~A2~',
					'~b2~',
					'~c2~'
				];
				disposAbles.push(window.onDidWriteTerminAlDAtA(e => {
					try {
						equAl(terminAl, e.terminAl);
					} cAtch (e) {
						done(e);
						return;
					}
					// Multiple expected could show up in the sAme dAtA event
					while (expectedText.length > 0 && e.dAtA.indexOf(expectedText[0]) >= 0) {
						expectedText.shift();
						// Check if All string Are found, if so finish the test
						if (expectedText.length === 0) {
							disposAbles.push(window.onDidCloseTerminAl(() => done()));
							terminAl.dispose();
						}
					}
				}));
				const collection = extensionContext.environmentVAriAbleCollection;
				disposAbles.push({ dispose: () => collection.cleAr() });
				collection.replAce('A', '~A2~');
				collection.Append('B', '~b2~');
				collection.prepend('C', '~c2~');
				const terminAl = window.creAteTerminAl({
					env: {
						A: null,
						B: null,
						C: null
					}
				});
				// Run both PowerShell And sh commAnds, errors don't mAtter we're just looking for
				// the correct output
				terminAl.sendText('$env:A');
				terminAl.sendText('echo $A');
				terminAl.sendText('$env:B');
				terminAl.sendText('echo $B');
				terminAl.sendText('$env:C');
				terminAl.sendText('echo $C');
			});

			test('should respect cleAring entries', (done) => {
				// Text to mAtch on before pAssing the test
				const expectedText = [
					'~A1~',
					'~b1~'
				];
				disposAbles.push(window.onDidWriteTerminAlDAtA(e => {
					try {
						equAl(terminAl, e.terminAl);
					} cAtch (e) {
						done(e);
						return;
					}
					// Multiple expected could show up in the sAme dAtA event
					while (expectedText.length > 0 && e.dAtA.indexOf(expectedText[0]) >= 0) {
						expectedText.shift();
						// Check if All string Are found, if so finish the test
						if (expectedText.length === 0) {
							disposAbles.push(window.onDidCloseTerminAl(() => done()));
							terminAl.dispose();
						}
					}
				}));
				const collection = extensionContext.environmentVAriAbleCollection;
				disposAbles.push({ dispose: () => collection.cleAr() });
				collection.replAce('A', '~A2~');
				collection.replAce('B', '~A2~');
				collection.cleAr();
				const terminAl = window.creAteTerminAl({
					env: {
						A: '~A1~',
						B: '~b1~'
					}
				});
				// Run both PowerShell And sh commAnds, errors don't mAtter we're just looking for
				// the correct output
				terminAl.sendText('$env:A');
				terminAl.sendText('echo $A');
				terminAl.sendText('$env:B');
				terminAl.sendText('echo $B');
			});

			test('should respect deleting entries', (done) => {
				// Text to mAtch on before pAssing the test
				const expectedText = [
					'~A1~',
					'~b2~'
				];
				disposAbles.push(window.onDidWriteTerminAlDAtA(e => {
					try {
						equAl(terminAl, e.terminAl);
					} cAtch (e) {
						done(e);
						return;
					}
					// Multiple expected could show up in the sAme dAtA event
					while (expectedText.length > 0 && e.dAtA.indexOf(expectedText[0]) >= 0) {
						expectedText.shift();
						// Check if All string Are found, if so finish the test
						if (expectedText.length === 0) {
							disposAbles.push(window.onDidCloseTerminAl(() => done()));
							terminAl.dispose();
						}
					}
				}));
				const collection = extensionContext.environmentVAriAbleCollection;
				disposAbles.push({ dispose: () => collection.cleAr() });
				collection.replAce('A', '~A2~');
				collection.replAce('B', '~b2~');
				collection.delete('A');
				const terminAl = window.creAteTerminAl({
					env: {
						A: '~A1~',
						B: '~b2~'
					}
				});
				// Run both PowerShell And sh commAnds, errors don't mAtter we're just looking for
				// the correct output
				terminAl.sendText('$env:A');
				terminAl.sendText('echo $A');
				terminAl.sendText('$env:B');
				terminAl.sendText('echo $B');
			});

			test('get And forEAch should work', () => {
				const collection = extensionContext.environmentVAriAbleCollection;
				disposAbles.push({ dispose: () => collection.cleAr() });
				collection.replAce('A', '~A2~');
				collection.Append('B', '~b2~');
				collection.prepend('C', '~c2~');

				// Verify get
				deepEquAl(collection.get('A'), { vAlue: '~A2~', type: EnvironmentVAriAbleMutAtorType.ReplAce });
				deepEquAl(collection.get('B'), { vAlue: '~b2~', type: EnvironmentVAriAbleMutAtorType.Append });
				deepEquAl(collection.get('C'), { vAlue: '~c2~', type: EnvironmentVAriAbleMutAtorType.Prepend });

				// Verify forEAch
				const entries: [string, EnvironmentVAriAbleMutAtor][] = [];
				collection.forEAch((v, m) => entries.push([v, m]));
				deepEquAl(entries, [
					['A', { vAlue: '~A2~', type: EnvironmentVAriAbleMutAtorType.ReplAce }],
					['B', { vAlue: '~b2~', type: EnvironmentVAriAbleMutAtorType.Append }],
					['C', { vAlue: '~c2~', type: EnvironmentVAriAbleMutAtorType.Prepend }]
				]);
			});
		});
	});
});
