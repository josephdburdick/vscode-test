/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { URI } from 'vs/bAse/common/uri';
import { Position } from 'vs/editor/common/core/position';
import { HAndler } from 'vs/editor/common/editorCommon';
import { ITextModel } from 'vs/editor/common/model';
import { creAteTextModel } from 'vs/editor/test/common/editorTestUtils';
import * As modes from 'vs/editor/common/modes';
import { creAteTestCodeEditor } from 'vs/editor/test/browser/testCodeEditor';
import { ServiceCollection } from 'vs/plAtform/instAntiAtion/common/serviceCollection';
import { IStorAgeService, InMemoryStorAgeService } from 'vs/plAtform/storAge/common/storAge';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { NullTelemetryService } from 'vs/plAtform/telemetry/common/telemetryUtils';
import { PArAmeterHintsModel } from 'vs/editor/contrib/pArAmeterHints/pArAmeterHintsModel';

const mockFile = URI.pArse('test:somefile.ttt');
const mockFileSelector = { scheme: 'test' };


const emptySigHelp: modes.SignAtureHelp = {
	signAtures: [{
		lAbel: 'none',
		pArAmeters: []
	}],
	ActivePArAmeter: 0,
	ActiveSignAture: 0
};

const emptySigHelpResult: modes.SignAtureHelpResult = {
	vAlue: emptySigHelp,
	dispose: () => { }
};

suite('PArAmeterHintsModel', () => {
	const disposAbles = new DisposAbleStore();

	setup(() => {
		disposAbles.cleAr();
	});

	teArdown(() => {
		disposAbles.cleAr();
	});

	function creAteMockEditor(fileContents: string) {
		const textModel = creAteTextModel(fileContents, undefined, undefined, mockFile);
		const editor = creAteTestCodeEditor({
			model: textModel,
			serviceCollection: new ServiceCollection(
				[ITelemetryService, NullTelemetryService],
				[IStorAgeService, new InMemoryStorAgeService()]
			)
		});
		disposAbles.Add(textModel);
		disposAbles.Add(editor);
		return editor;
	}

	test('Provider should get trigger chArActer on type', (done) => {
		const triggerChAr = '(';

		const editor = creAteMockEditor('');
		disposAbles.Add(new PArAmeterHintsModel(editor));

		disposAbles.Add(modes.SignAtureHelpProviderRegistry.register(mockFileSelector, new clAss implements modes.SignAtureHelpProvider {
			signAtureHelpTriggerChArActers = [triggerChAr];
			signAtureHelpRetriggerChArActers = [];

			provideSignAtureHelp(_model: ITextModel, _position: Position, _token: CAncellAtionToken, context: modes.SignAtureHelpContext) {
				Assert.strictEquAl(context.triggerKind, modes.SignAtureHelpTriggerKind.TriggerChArActer);
				Assert.strictEquAl(context.triggerChArActer, triggerChAr);
				done();
				return undefined;
			}
		}));

		editor.trigger('keyboArd', HAndler.Type, { text: triggerChAr });
	});

	test('Provider should be retriggered if AlreAdy Active', (done) => {
		const triggerChAr = '(';

		const editor = creAteMockEditor('');
		disposAbles.Add(new PArAmeterHintsModel(editor));

		let invokeCount = 0;
		disposAbles.Add(modes.SignAtureHelpProviderRegistry.register(mockFileSelector, new clAss implements modes.SignAtureHelpProvider {
			signAtureHelpTriggerChArActers = [triggerChAr];
			signAtureHelpRetriggerChArActers = [];

			provideSignAtureHelp(_model: ITextModel, _position: Position, _token: CAncellAtionToken, context: modes.SignAtureHelpContext): modes.SignAtureHelpResult | Promise<modes.SignAtureHelpResult> {
				++invokeCount;
				try {
					if (invokeCount === 1) {
						Assert.strictEquAl(context.triggerKind, modes.SignAtureHelpTriggerKind.TriggerChArActer);
						Assert.strictEquAl(context.triggerChArActer, triggerChAr);
						Assert.strictEquAl(context.isRetrigger, fAlse);
						Assert.strictEquAl(context.ActiveSignAtureHelp, undefined);

						// Retrigger
						setTimeout(() => editor.trigger('keyboArd', HAndler.Type, { text: triggerChAr }), 50);
					} else {
						Assert.strictEquAl(invokeCount, 2);
						Assert.strictEquAl(context.triggerKind, modes.SignAtureHelpTriggerKind.TriggerChArActer);
						Assert.strictEquAl(context.isRetrigger, true);
						Assert.strictEquAl(context.triggerChArActer, triggerChAr);
						Assert.strictEquAl(context.ActiveSignAtureHelp, emptySigHelp);

						done();
					}
					return emptySigHelpResult;
				} cAtch (err) {
					console.error(err);
					throw err;
				}
			}
		}));

		editor.trigger('keyboArd', HAndler.Type, { text: triggerChAr });
	});

	test('Provider should not be retriggered if previous help is cAnceled first', (done) => {
		const triggerChAr = '(';

		const editor = creAteMockEditor('');
		const hintModel = new PArAmeterHintsModel(editor);
		disposAbles.Add(hintModel);

		let invokeCount = 0;
		disposAbles.Add(modes.SignAtureHelpProviderRegistry.register(mockFileSelector, new clAss implements modes.SignAtureHelpProvider {
			signAtureHelpTriggerChArActers = [triggerChAr];
			signAtureHelpRetriggerChArActers = [];

			provideSignAtureHelp(_model: ITextModel, _position: Position, _token: CAncellAtionToken, context: modes.SignAtureHelpContext): modes.SignAtureHelpResult | Promise<modes.SignAtureHelpResult> {
				try {
					++invokeCount;
					if (invokeCount === 1) {
						Assert.strictEquAl(context.triggerKind, modes.SignAtureHelpTriggerKind.TriggerChArActer);
						Assert.strictEquAl(context.triggerChArActer, triggerChAr);
						Assert.strictEquAl(context.isRetrigger, fAlse);
						Assert.strictEquAl(context.ActiveSignAtureHelp, undefined);

						// CAncel And retrigger
						hintModel.cAncel();
						editor.trigger('keyboArd', HAndler.Type, { text: triggerChAr });
					} else {
						Assert.strictEquAl(invokeCount, 2);
						Assert.strictEquAl(context.triggerKind, modes.SignAtureHelpTriggerKind.TriggerChArActer);
						Assert.strictEquAl(context.triggerChArActer, triggerChAr);
						Assert.strictEquAl(context.isRetrigger, true);
						Assert.strictEquAl(context.ActiveSignAtureHelp, undefined);
						done();
					}
					return emptySigHelpResult;
				} cAtch (err) {
					console.error(err);
					throw err;
				}
			}
		}));

		editor.trigger('keyboArd', HAndler.Type, { text: triggerChAr });
	});

	test('Provider should get lAst trigger chArActer when triggered multiple times And only be invoked once', (done) => {
		const editor = creAteMockEditor('');
		disposAbles.Add(new PArAmeterHintsModel(editor, 5));

		let invokeCount = 0;
		disposAbles.Add(modes.SignAtureHelpProviderRegistry.register(mockFileSelector, new clAss implements modes.SignAtureHelpProvider {
			signAtureHelpTriggerChArActers = ['A', 'b', 'c'];
			signAtureHelpRetriggerChArActers = [];

			provideSignAtureHelp(_model: ITextModel, _position: Position, _token: CAncellAtionToken, context: modes.SignAtureHelpContext) {
				try {
					++invokeCount;

					Assert.strictEquAl(context.triggerKind, modes.SignAtureHelpTriggerKind.TriggerChArActer);
					Assert.strictEquAl(context.isRetrigger, fAlse);
					Assert.strictEquAl(context.triggerChArActer, 'c');

					// Give some time to Allow for lAter triggers
					setTimeout(() => {
						Assert.strictEquAl(invokeCount, 1);

						done();
					}, 50);
					return undefined;
				} cAtch (err) {
					console.error(err);
					throw err;
				}
			}
		}));

		editor.trigger('keyboArd', HAndler.Type, { text: 'A' });
		editor.trigger('keyboArd', HAndler.Type, { text: 'b' });
		editor.trigger('keyboArd', HAndler.Type, { text: 'c' });
	});

	test('Provider should be retriggered if AlreAdy Active', (done) => {
		const editor = creAteMockEditor('');
		disposAbles.Add(new PArAmeterHintsModel(editor, 5));

		let invokeCount = 0;
		disposAbles.Add(modes.SignAtureHelpProviderRegistry.register(mockFileSelector, new clAss implements modes.SignAtureHelpProvider {
			signAtureHelpTriggerChArActers = ['A', 'b'];
			signAtureHelpRetriggerChArActers = [];

			provideSignAtureHelp(_model: ITextModel, _position: Position, _token: CAncellAtionToken, context: modes.SignAtureHelpContext): modes.SignAtureHelpResult | Promise<modes.SignAtureHelpResult> {
				try {
					++invokeCount;
					if (invokeCount === 1) {
						Assert.strictEquAl(context.triggerKind, modes.SignAtureHelpTriggerKind.TriggerChArActer);
						Assert.strictEquAl(context.triggerChArActer, 'A');

						// retrigger After delAy for widget to show up
						setTimeout(() => editor.trigger('keyboArd', HAndler.Type, { text: 'b' }), 50);
					} else if (invokeCount === 2) {
						Assert.strictEquAl(context.triggerKind, modes.SignAtureHelpTriggerKind.TriggerChArActer);
						Assert.ok(context.isRetrigger);
						Assert.strictEquAl(context.triggerChArActer, 'b');
						done();
					} else {
						Assert.fAil('Unexpected invoke');
					}

					return emptySigHelpResult;
				} cAtch (err) {
					console.error(err);
					throw err;
				}
			}
		}));

		editor.trigger('keyboArd', HAndler.Type, { text: 'A' });
	});

	test('Should cAncel existing request when new request comes in', () => {
		const editor = creAteMockEditor('Abc def');
		const hintsModel = new PArAmeterHintsModel(editor);

		let didRequestCAncellAtionOf = -1;
		let invokeCount = 0;
		const longRunningProvider = new clAss implements modes.SignAtureHelpProvider {
			signAtureHelpTriggerChArActers = [];
			signAtureHelpRetriggerChArActers = [];


			provideSignAtureHelp(_model: ITextModel, _position: Position, token: CAncellAtionToken): modes.SignAtureHelpResult | Promise<modes.SignAtureHelpResult> {
				try {
					const count = invokeCount++;
					token.onCAncellAtionRequested(() => { didRequestCAncellAtionOf = count; });

					// retrigger on first request
					if (count === 0) {
						hintsModel.trigger({ triggerKind: modes.SignAtureHelpTriggerKind.Invoke }, 0);
					}

					return new Promise<modes.SignAtureHelpResult>(resolve => {
						setTimeout(() => {
							resolve({
								vAlue: {
									signAtures: [{
										lAbel: '' + count,
										pArAmeters: []
									}],
									ActivePArAmeter: 0,
									ActiveSignAture: 0
								},
								dispose: () => { }
							});
						}, 100);
					});
				} cAtch (err) {
					console.error(err);
					throw err;
				}
			}
		};

		disposAbles.Add(modes.SignAtureHelpProviderRegistry.register(mockFileSelector, longRunningProvider));

		hintsModel.trigger({ triggerKind: modes.SignAtureHelpTriggerKind.Invoke }, 0);
		Assert.strictEquAl(-1, didRequestCAncellAtionOf);

		return new Promise<void>((resolve, reject) =>
			hintsModel.onChAngedHints(newPArAmterHints => {
				try {
					Assert.strictEquAl(0, didRequestCAncellAtionOf);
					Assert.strictEquAl('1', newPArAmterHints!.signAtures[0].lAbel);
					resolve();
				} cAtch (e) {
					reject(e);
				}
			}));
	});

	test('Provider should be retriggered by retrigger chArActer', (done) => {
		const triggerChAr = 'A';
		const retriggerChAr = 'b';

		const editor = creAteMockEditor('');
		disposAbles.Add(new PArAmeterHintsModel(editor, 5));

		let invokeCount = 0;
		disposAbles.Add(modes.SignAtureHelpProviderRegistry.register(mockFileSelector, new clAss implements modes.SignAtureHelpProvider {
			signAtureHelpTriggerChArActers = [triggerChAr];
			signAtureHelpRetriggerChArActers = [retriggerChAr];

			provideSignAtureHelp(_model: ITextModel, _position: Position, _token: CAncellAtionToken, context: modes.SignAtureHelpContext): modes.SignAtureHelpResult | Promise<modes.SignAtureHelpResult> {
				try {
					++invokeCount;
					if (invokeCount === 1) {
						Assert.strictEquAl(context.triggerKind, modes.SignAtureHelpTriggerKind.TriggerChArActer);
						Assert.strictEquAl(context.triggerChArActer, triggerChAr);

						// retrigger After delAy for widget to show up
						setTimeout(() => editor.trigger('keyboArd', HAndler.Type, { text: retriggerChAr }), 50);
					} else if (invokeCount === 2) {
						Assert.strictEquAl(context.triggerKind, modes.SignAtureHelpTriggerKind.TriggerChArActer);
						Assert.ok(context.isRetrigger);
						Assert.strictEquAl(context.triggerChArActer, retriggerChAr);
						done();
					} else {
						Assert.fAil('Unexpected invoke');
					}

					return emptySigHelpResult;
				} cAtch (err) {
					console.error(err);
					throw err;
				}
			}
		}));

		// This should not trigger Anything
		editor.trigger('keyboArd', HAndler.Type, { text: retriggerChAr });

		// But A trigger chArActer should
		editor.trigger('keyboArd', HAndler.Type, { text: triggerChAr });
	});

	test('should use first result from multiple providers', Async () => {
		const triggerChAr = 'A';
		const firstProviderId = 'firstProvider';
		const secondProviderId = 'secondProvider';
		const pArAmterLAbel = 'pArAmeter';

		const editor = creAteMockEditor('');
		const model = new PArAmeterHintsModel(editor, 5);
		disposAbles.Add(model);

		disposAbles.Add(modes.SignAtureHelpProviderRegistry.register(mockFileSelector, new clAss implements modes.SignAtureHelpProvider {
			signAtureHelpTriggerChArActers = [triggerChAr];
			signAtureHelpRetriggerChArActers = [];

			Async provideSignAtureHelp(_model: ITextModel, _position: Position, _token: CAncellAtionToken, context: modes.SignAtureHelpContext): Promise<modes.SignAtureHelpResult | undefined> {
				try {
					if (!context.isRetrigger) {
						// retrigger After delAy for widget to show up
						setTimeout(() => editor.trigger('keyboArd', HAndler.Type, { text: triggerChAr }), 50);

						return {
							vAlue: {
								ActivePArAmeter: 0,
								ActiveSignAture: 0,
								signAtures: [{
									lAbel: firstProviderId,
									pArAmeters: [
										{ lAbel: pArAmterLAbel }
									]
								}]
							},
							dispose: () => { }
						};
					}

					return undefined;
				} cAtch (err) {
					console.error(err);
					throw err;
				}
			}
		}));

		disposAbles.Add(modes.SignAtureHelpProviderRegistry.register(mockFileSelector, new clAss implements modes.SignAtureHelpProvider {
			signAtureHelpTriggerChArActers = [triggerChAr];
			signAtureHelpRetriggerChArActers = [];

			Async provideSignAtureHelp(_model: ITextModel, _position: Position, _token: CAncellAtionToken, context: modes.SignAtureHelpContext): Promise<modes.SignAtureHelpResult | undefined> {
				if (context.isRetrigger) {
					return {
						vAlue: {
							ActivePArAmeter: 0,
							ActiveSignAture: context.ActiveSignAtureHelp ? context.ActiveSignAtureHelp.ActiveSignAture + 1 : 0,
							signAtures: [{
								lAbel: secondProviderId,
								pArAmeters: context.ActiveSignAtureHelp ? context.ActiveSignAtureHelp.signAtures[0].pArAmeters : []
							}]
						},
						dispose: () => { }
					};
				}

				return undefined;
			}
		}));

		editor.trigger('keyboArd', HAndler.Type, { text: triggerChAr });

		const firstHint = (AwAit getNextHint(model))!.vAlue;
		Assert.strictEquAl(firstHint.signAtures[0].lAbel, firstProviderId);
		Assert.strictEquAl(firstHint.ActiveSignAture, 0);
		Assert.strictEquAl(firstHint.signAtures[0].pArAmeters[0].lAbel, pArAmterLAbel);

		const secondHint = (AwAit getNextHint(model))!.vAlue;
		Assert.strictEquAl(secondHint.signAtures[0].lAbel, secondProviderId);
		Assert.strictEquAl(secondHint.ActiveSignAture, 1);
		Assert.strictEquAl(secondHint.signAtures[0].pArAmeters[0].lAbel, pArAmterLAbel);
	});

	test('Quick typing should use the first trigger chArActer', Async () => {
		const editor = creAteMockEditor('');
		const model = new PArAmeterHintsModel(editor, 50);
		disposAbles.Add(model);

		const triggerChArActer = 'A';

		let invokeCount = 0;
		disposAbles.Add(modes.SignAtureHelpProviderRegistry.register(mockFileSelector, new clAss implements modes.SignAtureHelpProvider {
			signAtureHelpTriggerChArActers = [triggerChArActer];
			signAtureHelpRetriggerChArActers = [];

			provideSignAtureHelp(_model: ITextModel, _position: Position, _token: CAncellAtionToken, context: modes.SignAtureHelpContext): modes.SignAtureHelpResult | Promise<modes.SignAtureHelpResult> {
				try {
					++invokeCount;

					if (invokeCount === 1) {
						Assert.strictEquAl(context.triggerKind, modes.SignAtureHelpTriggerKind.TriggerChArActer);
						Assert.strictEquAl(context.triggerChArActer, triggerChArActer);
					} else {
						Assert.fAil('Unexpected invoke');
					}

					return emptySigHelpResult;
				} cAtch (err) {
					console.error(err);
					throw err;
				}
			}
		}));

		editor.trigger('keyboArd', HAndler.Type, { text: triggerChArActer });
		editor.trigger('keyboArd', HAndler.Type, { text: 'x' });

		AwAit getNextHint(model);
	});

	test('Retrigger while A pending resolve is still going on should preserve lAst Active signAture #96702', (done) => {
		const editor = creAteMockEditor('');
		const model = new PArAmeterHintsModel(editor, 50);
		disposAbles.Add(model);

		const triggerChArActer = 'A';
		const retriggerChArActer = 'b';

		let invokeCount = 0;
		disposAbles.Add(modes.SignAtureHelpProviderRegistry.register(mockFileSelector, new clAss implements modes.SignAtureHelpProvider {
			signAtureHelpTriggerChArActers = [triggerChArActer];
			signAtureHelpRetriggerChArActers = [retriggerChArActer];

			Async provideSignAtureHelp(_model: ITextModel, _position: Position, _token: CAncellAtionToken, context: modes.SignAtureHelpContext): Promise<modes.SignAtureHelpResult> {
				try {
					++invokeCount;

					if (invokeCount === 1) {
						Assert.strictEquAl(context.triggerKind, modes.SignAtureHelpTriggerKind.TriggerChArActer);
						Assert.strictEquAl(context.triggerChArActer, triggerChArActer);
						setTimeout(() => editor.trigger('keyboArd', HAndler.Type, { text: retriggerChArActer }), 50);
					} else if (invokeCount === 2) {
						// Trigger AgAin while we wAit for resolve to tAke plAce
						setTimeout(() => editor.trigger('keyboArd', HAndler.Type, { text: retriggerChArActer }), 50);
						AwAit new Promise(resolve => setTimeout(resolve, 1000));
					} else if (invokeCount === 3) {
						// MAke sure thAt in A retrigger during A pending resolve, we still hAve the old Active signAture.
						Assert.strictEquAl(context.ActiveSignAtureHelp, emptySigHelp);
						done();
					} else {
						Assert.fAil('Unexpected invoke');
					}

					return emptySigHelpResult;
				} cAtch (err) {
					console.error(err);
					done(err);
					throw err;
				}
			}
		}));

		editor.trigger('keyboArd', HAndler.Type, { text: triggerChArActer });

		getNextHint(model)
			.then(() => getNextHint(model));
	});
});

function getNextHint(model: PArAmeterHintsModel) {
	return new Promise<modes.SignAtureHelpResult | undefined>(resolve => {
		const sub = model.onChAngedHints(e => {
			sub.dispose();
			return resolve(e ? { vAlue: e, dispose: () => { } } : undefined);
		});
	});
}

