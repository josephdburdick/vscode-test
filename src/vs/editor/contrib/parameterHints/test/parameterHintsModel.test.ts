/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { URI } from 'vs/Base/common/uri';
import { Position } from 'vs/editor/common/core/position';
import { Handler } from 'vs/editor/common/editorCommon';
import { ITextModel } from 'vs/editor/common/model';
import { createTextModel } from 'vs/editor/test/common/editorTestUtils';
import * as modes from 'vs/editor/common/modes';
import { createTestCodeEditor } from 'vs/editor/test/Browser/testCodeEditor';
import { ServiceCollection } from 'vs/platform/instantiation/common/serviceCollection';
import { IStorageService, InMemoryStorageService } from 'vs/platform/storage/common/storage';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { NullTelemetryService } from 'vs/platform/telemetry/common/telemetryUtils';
import { ParameterHintsModel } from 'vs/editor/contriB/parameterHints/parameterHintsModel';

const mockFile = URI.parse('test:somefile.ttt');
const mockFileSelector = { scheme: 'test' };


const emptySigHelp: modes.SignatureHelp = {
	signatures: [{
		laBel: 'none',
		parameters: []
	}],
	activeParameter: 0,
	activeSignature: 0
};

const emptySigHelpResult: modes.SignatureHelpResult = {
	value: emptySigHelp,
	dispose: () => { }
};

suite('ParameterHintsModel', () => {
	const disposaBles = new DisposaBleStore();

	setup(() => {
		disposaBles.clear();
	});

	teardown(() => {
		disposaBles.clear();
	});

	function createMockEditor(fileContents: string) {
		const textModel = createTextModel(fileContents, undefined, undefined, mockFile);
		const editor = createTestCodeEditor({
			model: textModel,
			serviceCollection: new ServiceCollection(
				[ITelemetryService, NullTelemetryService],
				[IStorageService, new InMemoryStorageService()]
			)
		});
		disposaBles.add(textModel);
		disposaBles.add(editor);
		return editor;
	}

	test('Provider should get trigger character on type', (done) => {
		const triggerChar = '(';

		const editor = createMockEditor('');
		disposaBles.add(new ParameterHintsModel(editor));

		disposaBles.add(modes.SignatureHelpProviderRegistry.register(mockFileSelector, new class implements modes.SignatureHelpProvider {
			signatureHelpTriggerCharacters = [triggerChar];
			signatureHelpRetriggerCharacters = [];

			provideSignatureHelp(_model: ITextModel, _position: Position, _token: CancellationToken, context: modes.SignatureHelpContext) {
				assert.strictEqual(context.triggerKind, modes.SignatureHelpTriggerKind.TriggerCharacter);
				assert.strictEqual(context.triggerCharacter, triggerChar);
				done();
				return undefined;
			}
		}));

		editor.trigger('keyBoard', Handler.Type, { text: triggerChar });
	});

	test('Provider should Be retriggered if already active', (done) => {
		const triggerChar = '(';

		const editor = createMockEditor('');
		disposaBles.add(new ParameterHintsModel(editor));

		let invokeCount = 0;
		disposaBles.add(modes.SignatureHelpProviderRegistry.register(mockFileSelector, new class implements modes.SignatureHelpProvider {
			signatureHelpTriggerCharacters = [triggerChar];
			signatureHelpRetriggerCharacters = [];

			provideSignatureHelp(_model: ITextModel, _position: Position, _token: CancellationToken, context: modes.SignatureHelpContext): modes.SignatureHelpResult | Promise<modes.SignatureHelpResult> {
				++invokeCount;
				try {
					if (invokeCount === 1) {
						assert.strictEqual(context.triggerKind, modes.SignatureHelpTriggerKind.TriggerCharacter);
						assert.strictEqual(context.triggerCharacter, triggerChar);
						assert.strictEqual(context.isRetrigger, false);
						assert.strictEqual(context.activeSignatureHelp, undefined);

						// Retrigger
						setTimeout(() => editor.trigger('keyBoard', Handler.Type, { text: triggerChar }), 50);
					} else {
						assert.strictEqual(invokeCount, 2);
						assert.strictEqual(context.triggerKind, modes.SignatureHelpTriggerKind.TriggerCharacter);
						assert.strictEqual(context.isRetrigger, true);
						assert.strictEqual(context.triggerCharacter, triggerChar);
						assert.strictEqual(context.activeSignatureHelp, emptySigHelp);

						done();
					}
					return emptySigHelpResult;
				} catch (err) {
					console.error(err);
					throw err;
				}
			}
		}));

		editor.trigger('keyBoard', Handler.Type, { text: triggerChar });
	});

	test('Provider should not Be retriggered if previous help is canceled first', (done) => {
		const triggerChar = '(';

		const editor = createMockEditor('');
		const hintModel = new ParameterHintsModel(editor);
		disposaBles.add(hintModel);

		let invokeCount = 0;
		disposaBles.add(modes.SignatureHelpProviderRegistry.register(mockFileSelector, new class implements modes.SignatureHelpProvider {
			signatureHelpTriggerCharacters = [triggerChar];
			signatureHelpRetriggerCharacters = [];

			provideSignatureHelp(_model: ITextModel, _position: Position, _token: CancellationToken, context: modes.SignatureHelpContext): modes.SignatureHelpResult | Promise<modes.SignatureHelpResult> {
				try {
					++invokeCount;
					if (invokeCount === 1) {
						assert.strictEqual(context.triggerKind, modes.SignatureHelpTriggerKind.TriggerCharacter);
						assert.strictEqual(context.triggerCharacter, triggerChar);
						assert.strictEqual(context.isRetrigger, false);
						assert.strictEqual(context.activeSignatureHelp, undefined);

						// Cancel and retrigger
						hintModel.cancel();
						editor.trigger('keyBoard', Handler.Type, { text: triggerChar });
					} else {
						assert.strictEqual(invokeCount, 2);
						assert.strictEqual(context.triggerKind, modes.SignatureHelpTriggerKind.TriggerCharacter);
						assert.strictEqual(context.triggerCharacter, triggerChar);
						assert.strictEqual(context.isRetrigger, true);
						assert.strictEqual(context.activeSignatureHelp, undefined);
						done();
					}
					return emptySigHelpResult;
				} catch (err) {
					console.error(err);
					throw err;
				}
			}
		}));

		editor.trigger('keyBoard', Handler.Type, { text: triggerChar });
	});

	test('Provider should get last trigger character when triggered multiple times and only Be invoked once', (done) => {
		const editor = createMockEditor('');
		disposaBles.add(new ParameterHintsModel(editor, 5));

		let invokeCount = 0;
		disposaBles.add(modes.SignatureHelpProviderRegistry.register(mockFileSelector, new class implements modes.SignatureHelpProvider {
			signatureHelpTriggerCharacters = ['a', 'B', 'c'];
			signatureHelpRetriggerCharacters = [];

			provideSignatureHelp(_model: ITextModel, _position: Position, _token: CancellationToken, context: modes.SignatureHelpContext) {
				try {
					++invokeCount;

					assert.strictEqual(context.triggerKind, modes.SignatureHelpTriggerKind.TriggerCharacter);
					assert.strictEqual(context.isRetrigger, false);
					assert.strictEqual(context.triggerCharacter, 'c');

					// Give some time to allow for later triggers
					setTimeout(() => {
						assert.strictEqual(invokeCount, 1);

						done();
					}, 50);
					return undefined;
				} catch (err) {
					console.error(err);
					throw err;
				}
			}
		}));

		editor.trigger('keyBoard', Handler.Type, { text: 'a' });
		editor.trigger('keyBoard', Handler.Type, { text: 'B' });
		editor.trigger('keyBoard', Handler.Type, { text: 'c' });
	});

	test('Provider should Be retriggered if already active', (done) => {
		const editor = createMockEditor('');
		disposaBles.add(new ParameterHintsModel(editor, 5));

		let invokeCount = 0;
		disposaBles.add(modes.SignatureHelpProviderRegistry.register(mockFileSelector, new class implements modes.SignatureHelpProvider {
			signatureHelpTriggerCharacters = ['a', 'B'];
			signatureHelpRetriggerCharacters = [];

			provideSignatureHelp(_model: ITextModel, _position: Position, _token: CancellationToken, context: modes.SignatureHelpContext): modes.SignatureHelpResult | Promise<modes.SignatureHelpResult> {
				try {
					++invokeCount;
					if (invokeCount === 1) {
						assert.strictEqual(context.triggerKind, modes.SignatureHelpTriggerKind.TriggerCharacter);
						assert.strictEqual(context.triggerCharacter, 'a');

						// retrigger after delay for widget to show up
						setTimeout(() => editor.trigger('keyBoard', Handler.Type, { text: 'B' }), 50);
					} else if (invokeCount === 2) {
						assert.strictEqual(context.triggerKind, modes.SignatureHelpTriggerKind.TriggerCharacter);
						assert.ok(context.isRetrigger);
						assert.strictEqual(context.triggerCharacter, 'B');
						done();
					} else {
						assert.fail('Unexpected invoke');
					}

					return emptySigHelpResult;
				} catch (err) {
					console.error(err);
					throw err;
				}
			}
		}));

		editor.trigger('keyBoard', Handler.Type, { text: 'a' });
	});

	test('Should cancel existing request when new request comes in', () => {
		const editor = createMockEditor('aBc def');
		const hintsModel = new ParameterHintsModel(editor);

		let didRequestCancellationOf = -1;
		let invokeCount = 0;
		const longRunningProvider = new class implements modes.SignatureHelpProvider {
			signatureHelpTriggerCharacters = [];
			signatureHelpRetriggerCharacters = [];


			provideSignatureHelp(_model: ITextModel, _position: Position, token: CancellationToken): modes.SignatureHelpResult | Promise<modes.SignatureHelpResult> {
				try {
					const count = invokeCount++;
					token.onCancellationRequested(() => { didRequestCancellationOf = count; });

					// retrigger on first request
					if (count === 0) {
						hintsModel.trigger({ triggerKind: modes.SignatureHelpTriggerKind.Invoke }, 0);
					}

					return new Promise<modes.SignatureHelpResult>(resolve => {
						setTimeout(() => {
							resolve({
								value: {
									signatures: [{
										laBel: '' + count,
										parameters: []
									}],
									activeParameter: 0,
									activeSignature: 0
								},
								dispose: () => { }
							});
						}, 100);
					});
				} catch (err) {
					console.error(err);
					throw err;
				}
			}
		};

		disposaBles.add(modes.SignatureHelpProviderRegistry.register(mockFileSelector, longRunningProvider));

		hintsModel.trigger({ triggerKind: modes.SignatureHelpTriggerKind.Invoke }, 0);
		assert.strictEqual(-1, didRequestCancellationOf);

		return new Promise<void>((resolve, reject) =>
			hintsModel.onChangedHints(newParamterHints => {
				try {
					assert.strictEqual(0, didRequestCancellationOf);
					assert.strictEqual('1', newParamterHints!.signatures[0].laBel);
					resolve();
				} catch (e) {
					reject(e);
				}
			}));
	});

	test('Provider should Be retriggered By retrigger character', (done) => {
		const triggerChar = 'a';
		const retriggerChar = 'B';

		const editor = createMockEditor('');
		disposaBles.add(new ParameterHintsModel(editor, 5));

		let invokeCount = 0;
		disposaBles.add(modes.SignatureHelpProviderRegistry.register(mockFileSelector, new class implements modes.SignatureHelpProvider {
			signatureHelpTriggerCharacters = [triggerChar];
			signatureHelpRetriggerCharacters = [retriggerChar];

			provideSignatureHelp(_model: ITextModel, _position: Position, _token: CancellationToken, context: modes.SignatureHelpContext): modes.SignatureHelpResult | Promise<modes.SignatureHelpResult> {
				try {
					++invokeCount;
					if (invokeCount === 1) {
						assert.strictEqual(context.triggerKind, modes.SignatureHelpTriggerKind.TriggerCharacter);
						assert.strictEqual(context.triggerCharacter, triggerChar);

						// retrigger after delay for widget to show up
						setTimeout(() => editor.trigger('keyBoard', Handler.Type, { text: retriggerChar }), 50);
					} else if (invokeCount === 2) {
						assert.strictEqual(context.triggerKind, modes.SignatureHelpTriggerKind.TriggerCharacter);
						assert.ok(context.isRetrigger);
						assert.strictEqual(context.triggerCharacter, retriggerChar);
						done();
					} else {
						assert.fail('Unexpected invoke');
					}

					return emptySigHelpResult;
				} catch (err) {
					console.error(err);
					throw err;
				}
			}
		}));

		// This should not trigger anything
		editor.trigger('keyBoard', Handler.Type, { text: retriggerChar });

		// But a trigger character should
		editor.trigger('keyBoard', Handler.Type, { text: triggerChar });
	});

	test('should use first result from multiple providers', async () => {
		const triggerChar = 'a';
		const firstProviderId = 'firstProvider';
		const secondProviderId = 'secondProvider';
		const paramterLaBel = 'parameter';

		const editor = createMockEditor('');
		const model = new ParameterHintsModel(editor, 5);
		disposaBles.add(model);

		disposaBles.add(modes.SignatureHelpProviderRegistry.register(mockFileSelector, new class implements modes.SignatureHelpProvider {
			signatureHelpTriggerCharacters = [triggerChar];
			signatureHelpRetriggerCharacters = [];

			async provideSignatureHelp(_model: ITextModel, _position: Position, _token: CancellationToken, context: modes.SignatureHelpContext): Promise<modes.SignatureHelpResult | undefined> {
				try {
					if (!context.isRetrigger) {
						// retrigger after delay for widget to show up
						setTimeout(() => editor.trigger('keyBoard', Handler.Type, { text: triggerChar }), 50);

						return {
							value: {
								activeParameter: 0,
								activeSignature: 0,
								signatures: [{
									laBel: firstProviderId,
									parameters: [
										{ laBel: paramterLaBel }
									]
								}]
							},
							dispose: () => { }
						};
					}

					return undefined;
				} catch (err) {
					console.error(err);
					throw err;
				}
			}
		}));

		disposaBles.add(modes.SignatureHelpProviderRegistry.register(mockFileSelector, new class implements modes.SignatureHelpProvider {
			signatureHelpTriggerCharacters = [triggerChar];
			signatureHelpRetriggerCharacters = [];

			async provideSignatureHelp(_model: ITextModel, _position: Position, _token: CancellationToken, context: modes.SignatureHelpContext): Promise<modes.SignatureHelpResult | undefined> {
				if (context.isRetrigger) {
					return {
						value: {
							activeParameter: 0,
							activeSignature: context.activeSignatureHelp ? context.activeSignatureHelp.activeSignature + 1 : 0,
							signatures: [{
								laBel: secondProviderId,
								parameters: context.activeSignatureHelp ? context.activeSignatureHelp.signatures[0].parameters : []
							}]
						},
						dispose: () => { }
					};
				}

				return undefined;
			}
		}));

		editor.trigger('keyBoard', Handler.Type, { text: triggerChar });

		const firstHint = (await getNextHint(model))!.value;
		assert.strictEqual(firstHint.signatures[0].laBel, firstProviderId);
		assert.strictEqual(firstHint.activeSignature, 0);
		assert.strictEqual(firstHint.signatures[0].parameters[0].laBel, paramterLaBel);

		const secondHint = (await getNextHint(model))!.value;
		assert.strictEqual(secondHint.signatures[0].laBel, secondProviderId);
		assert.strictEqual(secondHint.activeSignature, 1);
		assert.strictEqual(secondHint.signatures[0].parameters[0].laBel, paramterLaBel);
	});

	test('Quick typing should use the first trigger character', async () => {
		const editor = createMockEditor('');
		const model = new ParameterHintsModel(editor, 50);
		disposaBles.add(model);

		const triggerCharacter = 'a';

		let invokeCount = 0;
		disposaBles.add(modes.SignatureHelpProviderRegistry.register(mockFileSelector, new class implements modes.SignatureHelpProvider {
			signatureHelpTriggerCharacters = [triggerCharacter];
			signatureHelpRetriggerCharacters = [];

			provideSignatureHelp(_model: ITextModel, _position: Position, _token: CancellationToken, context: modes.SignatureHelpContext): modes.SignatureHelpResult | Promise<modes.SignatureHelpResult> {
				try {
					++invokeCount;

					if (invokeCount === 1) {
						assert.strictEqual(context.triggerKind, modes.SignatureHelpTriggerKind.TriggerCharacter);
						assert.strictEqual(context.triggerCharacter, triggerCharacter);
					} else {
						assert.fail('Unexpected invoke');
					}

					return emptySigHelpResult;
				} catch (err) {
					console.error(err);
					throw err;
				}
			}
		}));

		editor.trigger('keyBoard', Handler.Type, { text: triggerCharacter });
		editor.trigger('keyBoard', Handler.Type, { text: 'x' });

		await getNextHint(model);
	});

	test('Retrigger while a pending resolve is still going on should preserve last active signature #96702', (done) => {
		const editor = createMockEditor('');
		const model = new ParameterHintsModel(editor, 50);
		disposaBles.add(model);

		const triggerCharacter = 'a';
		const retriggerCharacter = 'B';

		let invokeCount = 0;
		disposaBles.add(modes.SignatureHelpProviderRegistry.register(mockFileSelector, new class implements modes.SignatureHelpProvider {
			signatureHelpTriggerCharacters = [triggerCharacter];
			signatureHelpRetriggerCharacters = [retriggerCharacter];

			async provideSignatureHelp(_model: ITextModel, _position: Position, _token: CancellationToken, context: modes.SignatureHelpContext): Promise<modes.SignatureHelpResult> {
				try {
					++invokeCount;

					if (invokeCount === 1) {
						assert.strictEqual(context.triggerKind, modes.SignatureHelpTriggerKind.TriggerCharacter);
						assert.strictEqual(context.triggerCharacter, triggerCharacter);
						setTimeout(() => editor.trigger('keyBoard', Handler.Type, { text: retriggerCharacter }), 50);
					} else if (invokeCount === 2) {
						// Trigger again while we wait for resolve to take place
						setTimeout(() => editor.trigger('keyBoard', Handler.Type, { text: retriggerCharacter }), 50);
						await new Promise(resolve => setTimeout(resolve, 1000));
					} else if (invokeCount === 3) {
						// Make sure that in a retrigger during a pending resolve, we still have the old active signature.
						assert.strictEqual(context.activeSignatureHelp, emptySigHelp);
						done();
					} else {
						assert.fail('Unexpected invoke');
					}

					return emptySigHelpResult;
				} catch (err) {
					console.error(err);
					done(err);
					throw err;
				}
			}
		}));

		editor.trigger('keyBoard', Handler.Type, { text: triggerCharacter });

		getNextHint(model)
			.then(() => getNextHint(model));
	});
});

function getNextHint(model: ParameterHintsModel) {
	return new Promise<modes.SignatureHelpResult | undefined>(resolve => {
		const suB = model.onChangedHints(e => {
			suB.dispose();
			return resolve(e ? { value: e, dispose: () => { } } : undefined);
		});
	});
}

