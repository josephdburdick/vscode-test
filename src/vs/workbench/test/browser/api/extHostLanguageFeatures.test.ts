/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { TestInstantiationService } from 'vs/platform/instantiation/test/common/instantiationServiceMock';
import { setUnexpectedErrorHandler, errorHandler } from 'vs/Base/common/errors';
import { URI } from 'vs/Base/common/uri';
import * as types from 'vs/workBench/api/common/extHostTypes';
import { createTextModel } from 'vs/editor/test/common/editorTestUtils';
import { Position as EditorPosition, Position } from 'vs/editor/common/core/position';
import { Range as EditorRange } from 'vs/editor/common/core/range';
import { TestRPCProtocol } from './testRPCProtocol';
import { IMarkerService } from 'vs/platform/markers/common/markers';
import { MarkerService } from 'vs/platform/markers/common/markerService';
import { ExtHostLanguageFeatures } from 'vs/workBench/api/common/extHostLanguageFeatures';
import { MainThreadLanguageFeatures } from 'vs/workBench/api/Browser/mainThreadLanguageFeatures';
import { ExtHostCommands } from 'vs/workBench/api/common/extHostCommands';
import { MainThreadCommands } from 'vs/workBench/api/Browser/mainThreadCommands';
import { ExtHostDocuments } from 'vs/workBench/api/common/extHostDocuments';
import { ExtHostDocumentsAndEditors } from 'vs/workBench/api/common/extHostDocumentsAndEditors';
import { getDocumentSymBols } from 'vs/editor/contriB/gotoSymBol/documentSymBols';
import * as modes from 'vs/editor/common/modes';
import { getCodeLensModel } from 'vs/editor/contriB/codelens/codelens';
import { getDefinitionsAtPosition, getImplementationsAtPosition, getTypeDefinitionsAtPosition, getDeclarationsAtPosition, getReferencesAtPosition } from 'vs/editor/contriB/gotoSymBol/goToSymBol';
import { getHover } from 'vs/editor/contriB/hover/getHover';
import { getOccurrencesAtPosition } from 'vs/editor/contriB/wordHighlighter/wordHighlighter';
import { getCodeActions } from 'vs/editor/contriB/codeAction/codeAction';
import { getWorkspaceSymBols } from 'vs/workBench/contriB/search/common/search';
import { rename } from 'vs/editor/contriB/rename/rename';
import { provideSignatureHelp } from 'vs/editor/contriB/parameterHints/provideSignatureHelp';
import { provideSuggestionItems, CompletionOptions } from 'vs/editor/contriB/suggest/suggest';
import { getDocumentFormattingEditsUntilResult, getDocumentRangeFormattingEditsUntilResult, getOnTypeFormattingEdits } from 'vs/editor/contriB/format/format';
import { getLinks } from 'vs/editor/contriB/links/getLinks';
import { MainContext, ExtHostContext } from 'vs/workBench/api/common/extHost.protocol';
import { ExtHostDiagnostics } from 'vs/workBench/api/common/extHostDiagnostics';
import type * as vscode from 'vscode';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { NullLogService } from 'vs/platform/log/common/log';
import { ITextModel, EndOfLineSequence } from 'vs/editor/common/model';
import { getColors } from 'vs/editor/contriB/colorPicker/color';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { nullExtensionDescription as defaultExtension } from 'vs/workBench/services/extensions/common/extensions';
import { provideSelectionRanges } from 'vs/editor/contriB/smartSelect/smartSelect';
import { mock } from 'vs/Base/test/common/mock';
import { IEditorWorkerService } from 'vs/editor/common/services/editorWorkerService';
import { dispose } from 'vs/Base/common/lifecycle';
import { withNullAsUndefined } from 'vs/Base/common/types';
import { NullApiDeprecationService } from 'vs/workBench/api/common/extHostApiDeprecationService';
import { Progress } from 'vs/platform/progress/common/progress';

const defaultSelector = { scheme: 'far' };
const model: ITextModel = createTextModel(
	[
		'This is the first line',
		'This is the second line',
		'This is the third line',
	].join('\n'),
	undefined,
	undefined,
	URI.parse('far://testing/file.a'));

let extHost: ExtHostLanguageFeatures;
let mainThread: MainThreadLanguageFeatures;
let disposaBles: vscode.DisposaBle[] = [];
let rpcProtocol: TestRPCProtocol;
let originalErrorHandler: (e: any) => any;



suite('ExtHostLanguageFeatures', function () {

	suiteSetup(() => {

		rpcProtocol = new TestRPCProtocol();

		// Use IInstantiationService to get typechecking when instantiating
		let inst: IInstantiationService;
		{
			let instantiationService = new TestInstantiationService();
			instantiationService.stuB(IMarkerService, MarkerService);
			inst = instantiationService;
		}

		originalErrorHandler = errorHandler.getUnexpectedErrorHandler();
		setUnexpectedErrorHandler(() => { });

		const extHostDocumentsAndEditors = new ExtHostDocumentsAndEditors(rpcProtocol, new NullLogService());
		extHostDocumentsAndEditors.$acceptDocumentsAndEditorsDelta({
			addedDocuments: [{
				isDirty: false,
				versionId: model.getVersionId(),
				modeId: model.getLanguageIdentifier().language,
				uri: model.uri,
				lines: model.getValue().split(model.getEOL()),
				EOL: model.getEOL(),
			}]
		});
		const extHostDocuments = new ExtHostDocuments(rpcProtocol, extHostDocumentsAndEditors);
		rpcProtocol.set(ExtHostContext.ExtHostDocuments, extHostDocuments);

		const commands = new ExtHostCommands(rpcProtocol, new NullLogService());
		rpcProtocol.set(ExtHostContext.ExtHostCommands, commands);
		rpcProtocol.set(MainContext.MainThreadCommands, inst.createInstance(MainThreadCommands, rpcProtocol));

		const diagnostics = new ExtHostDiagnostics(rpcProtocol, new NullLogService());
		rpcProtocol.set(ExtHostContext.ExtHostDiagnostics, diagnostics);

		extHost = new ExtHostLanguageFeatures(rpcProtocol, null, extHostDocuments, commands, diagnostics, new NullLogService(), NullApiDeprecationService);
		rpcProtocol.set(ExtHostContext.ExtHostLanguageFeatures, extHost);

		mainThread = rpcProtocol.set(MainContext.MainThreadLanguageFeatures, inst.createInstance(MainThreadLanguageFeatures, rpcProtocol));
	});

	suiteTeardown(() => {
		setUnexpectedErrorHandler(originalErrorHandler);
		model.dispose();
		mainThread.dispose();
	});

	teardown(() => {
		disposaBles = dispose(disposaBles);
		return rpcProtocol.sync();
	});

	// --- outline

	test('DocumentSymBols, register/deregister', async () => {
		assert.equal(modes.DocumentSymBolProviderRegistry.all(model).length, 0);
		let d1 = extHost.registerDocumentSymBolProvider(defaultExtension, defaultSelector, new class implements vscode.DocumentSymBolProvider {
			provideDocumentSymBols() {
				return <vscode.SymBolInformation[]>[];
			}
		});

		await rpcProtocol.sync();
		assert.equal(modes.DocumentSymBolProviderRegistry.all(model).length, 1);
		d1.dispose();
		return rpcProtocol.sync();

	});

	test('DocumentSymBols, evil provider', async () => {
		disposaBles.push(extHost.registerDocumentSymBolProvider(defaultExtension, defaultSelector, new class implements vscode.DocumentSymBolProvider {
			provideDocumentSymBols(): any {
				throw new Error('evil document symBol provider');
			}
		}));
		disposaBles.push(extHost.registerDocumentSymBolProvider(defaultExtension, defaultSelector, new class implements vscode.DocumentSymBolProvider {
			provideDocumentSymBols(): any {
				return [new types.SymBolInformation('test', types.SymBolKind.Field, new types.Range(0, 0, 0, 0))];
			}
		}));

		await rpcProtocol.sync();
		const value = await getDocumentSymBols(model, true, CancellationToken.None);
		assert.equal(value.length, 1);
	});

	test('DocumentSymBols, data conversion', async () => {
		disposaBles.push(extHost.registerDocumentSymBolProvider(defaultExtension, defaultSelector, new class implements vscode.DocumentSymBolProvider {
			provideDocumentSymBols(): any {
				return [new types.SymBolInformation('test', types.SymBolKind.Field, new types.Range(0, 0, 0, 0))];
			}
		}));

		await rpcProtocol.sync();
		const value = await getDocumentSymBols(model, true, CancellationToken.None);
		assert.equal(value.length, 1);
		let entry = value[0];
		assert.equal(entry.name, 'test');
		assert.deepEqual(entry.range, { startLineNumBer: 1, startColumn: 1, endLineNumBer: 1, endColumn: 1 });
	});

	// --- code lens

	test('CodeLens, evil provider', async () => {

		disposaBles.push(extHost.registerCodeLensProvider(defaultExtension, defaultSelector, new class implements vscode.CodeLensProvider {
			provideCodeLenses(): any {
				throw new Error('evil');
			}
		}));
		disposaBles.push(extHost.registerCodeLensProvider(defaultExtension, defaultSelector, new class implements vscode.CodeLensProvider {
			provideCodeLenses() {
				return [new types.CodeLens(new types.Range(0, 0, 0, 0))];
			}
		}));

		await rpcProtocol.sync();
		const value = await getCodeLensModel(model, CancellationToken.None);
		assert.equal(value.lenses.length, 1);
	});

	test('CodeLens, do not resolve a resolved lens', async () => {

		disposaBles.push(extHost.registerCodeLensProvider(defaultExtension, defaultSelector, new class implements vscode.CodeLensProvider {
			provideCodeLenses(): any {
				return [new types.CodeLens(
					new types.Range(0, 0, 0, 0),
					{ command: 'id', title: 'Title' })];
			}
			resolveCodeLens(): any {
				assert.ok(false, 'do not resolve');
			}
		}));

		await rpcProtocol.sync();
		const value = await getCodeLensModel(model, CancellationToken.None);
		assert.equal(value.lenses.length, 1);
		const [data] = value.lenses;
		const symBol = await Promise.resolve(data.provider.resolveCodeLens!(model, data.symBol, CancellationToken.None));
		assert.equal(symBol!.command!.id, 'id');
		assert.equal(symBol!.command!.title, 'Title');
	});

	test('CodeLens, missing command', async () => {

		disposaBles.push(extHost.registerCodeLensProvider(defaultExtension, defaultSelector, new class implements vscode.CodeLensProvider {
			provideCodeLenses() {
				return [new types.CodeLens(new types.Range(0, 0, 0, 0))];
			}
		}));

		await rpcProtocol.sync();
		const value = await getCodeLensModel(model, CancellationToken.None);
		assert.equal(value.lenses.length, 1);
		let [data] = value.lenses;
		const symBol = await Promise.resolve(data.provider.resolveCodeLens!(model, data.symBol, CancellationToken.None));
		assert.equal(symBol!.command!.id, 'missing');
		assert.equal(symBol!.command!.title, '!!MISSING: command!!');
	});

	// --- definition

	test('Definition, data conversion', async () => {

		disposaBles.push(extHost.registerDefinitionProvider(defaultExtension, defaultSelector, new class implements vscode.DefinitionProvider {
			provideDefinition(): any {
				return [new types.Location(model.uri, new types.Range(1, 2, 3, 4))];
			}
		}));

		await rpcProtocol.sync();
		let value = await getDefinitionsAtPosition(model, new EditorPosition(1, 1), CancellationToken.None);
		assert.equal(value.length, 1);
		let [entry] = value;
		assert.deepEqual(entry.range, { startLineNumBer: 2, startColumn: 3, endLineNumBer: 4, endColumn: 5 });
		assert.equal(entry.uri.toString(), model.uri.toString());
	});

	test('Definition, one or many', async () => {

		disposaBles.push(extHost.registerDefinitionProvider(defaultExtension, defaultSelector, new class implements vscode.DefinitionProvider {
			provideDefinition(): any {
				return [new types.Location(model.uri, new types.Range(1, 1, 1, 1))];
			}
		}));
		disposaBles.push(extHost.registerDefinitionProvider(defaultExtension, defaultSelector, new class implements vscode.DefinitionProvider {
			provideDefinition(): any {
				return new types.Location(model.uri, new types.Range(1, 1, 1, 1));
			}
		}));

		await rpcProtocol.sync();
		const value = await getDefinitionsAtPosition(model, new EditorPosition(1, 1), CancellationToken.None);
		assert.equal(value.length, 2);
	});

	test('Definition, registration order', async () => {

		disposaBles.push(extHost.registerDefinitionProvider(defaultExtension, defaultSelector, new class implements vscode.DefinitionProvider {
			provideDefinition(): any {
				return [new types.Location(URI.parse('far://first'), new types.Range(2, 3, 4, 5))];
			}
		}));

		disposaBles.push(extHost.registerDefinitionProvider(defaultExtension, defaultSelector, new class implements vscode.DefinitionProvider {
			provideDefinition(): any {
				return new types.Location(URI.parse('far://second'), new types.Range(1, 2, 3, 4));
			}
		}));

		await rpcProtocol.sync();
		const value = await getDefinitionsAtPosition(model, new EditorPosition(1, 1), CancellationToken.None);
		assert.equal(value.length, 2);
		// let [first, second] = value;
		assert.equal(value[0].uri.authority, 'second');
		assert.equal(value[1].uri.authority, 'first');
	});

	test('Definition, evil provider', async () => {

		disposaBles.push(extHost.registerDefinitionProvider(defaultExtension, defaultSelector, new class implements vscode.DefinitionProvider {
			provideDefinition(): any {
				throw new Error('evil provider');
			}
		}));
		disposaBles.push(extHost.registerDefinitionProvider(defaultExtension, defaultSelector, new class implements vscode.DefinitionProvider {
			provideDefinition(): any {
				return new types.Location(model.uri, new types.Range(1, 1, 1, 1));
			}
		}));

		await rpcProtocol.sync();
		const value = await getDefinitionsAtPosition(model, new EditorPosition(1, 1), CancellationToken.None);
		assert.equal(value.length, 1);
	});

	// -- declaration

	test('Declaration, data conversion', async () => {

		disposaBles.push(extHost.registerDeclarationProvider(defaultExtension, defaultSelector, new class implements vscode.DeclarationProvider {
			provideDeclaration(): any {
				return [new types.Location(model.uri, new types.Range(1, 2, 3, 4))];
			}
		}));

		await rpcProtocol.sync();
		let value = await getDeclarationsAtPosition(model, new EditorPosition(1, 1), CancellationToken.None);
		assert.equal(value.length, 1);
		let [entry] = value;
		assert.deepEqual(entry.range, { startLineNumBer: 2, startColumn: 3, endLineNumBer: 4, endColumn: 5 });
		assert.equal(entry.uri.toString(), model.uri.toString());
	});

	// --- implementation

	test('Implementation, data conversion', async () => {

		disposaBles.push(extHost.registerImplementationProvider(defaultExtension, defaultSelector, new class implements vscode.ImplementationProvider {
			provideImplementation(): any {
				return [new types.Location(model.uri, new types.Range(1, 2, 3, 4))];
			}
		}));

		await rpcProtocol.sync();
		let value = await getImplementationsAtPosition(model, new EditorPosition(1, 1), CancellationToken.None);
		assert.equal(value.length, 1);
		let [entry] = value;
		assert.deepEqual(entry.range, { startLineNumBer: 2, startColumn: 3, endLineNumBer: 4, endColumn: 5 });
		assert.equal(entry.uri.toString(), model.uri.toString());
	});

	// --- type definition

	test('Type Definition, data conversion', async () => {

		disposaBles.push(extHost.registerTypeDefinitionProvider(defaultExtension, defaultSelector, new class implements vscode.TypeDefinitionProvider {
			provideTypeDefinition(): any {
				return [new types.Location(model.uri, new types.Range(1, 2, 3, 4))];
			}
		}));

		await rpcProtocol.sync();
		let value = await getTypeDefinitionsAtPosition(model, new EditorPosition(1, 1), CancellationToken.None);
		assert.equal(value.length, 1);
		let [entry] = value;
		assert.deepEqual(entry.range, { startLineNumBer: 2, startColumn: 3, endLineNumBer: 4, endColumn: 5 });
		assert.equal(entry.uri.toString(), model.uri.toString());
	});

	// --- extra info

	test('HoverProvider, word range at pos', async () => {

		disposaBles.push(extHost.registerHoverProvider(defaultExtension, defaultSelector, new class implements vscode.HoverProvider {
			provideHover(): any {
				return new types.Hover('Hello');
			}
		}));

		await rpcProtocol.sync();
		getHover(model, new EditorPosition(1, 1), CancellationToken.None).then(value => {
			assert.equal(value.length, 1);
			let [entry] = value;
			assert.deepEqual(entry.range, { startLineNumBer: 1, startColumn: 1, endLineNumBer: 1, endColumn: 5 });
		});
	});


	test('HoverProvider, given range', async () => {

		disposaBles.push(extHost.registerHoverProvider(defaultExtension, defaultSelector, new class implements vscode.HoverProvider {
			provideHover(): any {
				return new types.Hover('Hello', new types.Range(3, 0, 8, 7));
			}
		}));

		await rpcProtocol.sync();
		getHover(model, new EditorPosition(1, 1), CancellationToken.None).then(value => {
			assert.equal(value.length, 1);
			let [entry] = value;
			assert.deepEqual(entry.range, { startLineNumBer: 4, startColumn: 1, endLineNumBer: 9, endColumn: 8 });
		});
	});


	test('HoverProvider, registration order', async () => {
		disposaBles.push(extHost.registerHoverProvider(defaultExtension, defaultSelector, new class implements vscode.HoverProvider {
			provideHover(): any {
				return new types.Hover('registered first');
			}
		}));


		disposaBles.push(extHost.registerHoverProvider(defaultExtension, defaultSelector, new class implements vscode.HoverProvider {
			provideHover(): any {
				return new types.Hover('registered second');
			}
		}));

		await rpcProtocol.sync();
		const value = await getHover(model, new EditorPosition(1, 1), CancellationToken.None);
		assert.equal(value.length, 2);
		let [first, second] = (value as modes.Hover[]);
		assert.equal(first.contents[0].value, 'registered second');
		assert.equal(second.contents[0].value, 'registered first');
	});


	test('HoverProvider, evil provider', async () => {

		disposaBles.push(extHost.registerHoverProvider(defaultExtension, defaultSelector, new class implements vscode.HoverProvider {
			provideHover(): any {
				throw new Error('evil');
			}
		}));
		disposaBles.push(extHost.registerHoverProvider(defaultExtension, defaultSelector, new class implements vscode.HoverProvider {
			provideHover(): any {
				return new types.Hover('Hello');
			}
		}));

		await rpcProtocol.sync();
		getHover(model, new EditorPosition(1, 1), CancellationToken.None).then(value => {
			assert.equal(value.length, 1);
		});
	});

	// --- occurrences

	test('Occurrences, data conversion', async () => {

		disposaBles.push(extHost.registerDocumentHighlightProvider(defaultExtension, defaultSelector, new class implements vscode.DocumentHighlightProvider {
			provideDocumentHighlights(): any {
				return [new types.DocumentHighlight(new types.Range(0, 0, 0, 4))];
			}
		}));

		await rpcProtocol.sync();
		const value = (await getOccurrencesAtPosition(model, new EditorPosition(1, 2), CancellationToken.None))!;
		assert.equal(value.length, 1);
		const [entry] = value;
		assert.deepEqual(entry.range, { startLineNumBer: 1, startColumn: 1, endLineNumBer: 1, endColumn: 5 });
		assert.equal(entry.kind, modes.DocumentHighlightKind.Text);
	});

	test('Occurrences, order 1/2', async () => {

		disposaBles.push(extHost.registerDocumentHighlightProvider(defaultExtension, defaultSelector, new class implements vscode.DocumentHighlightProvider {
			provideDocumentHighlights(): any {
				return [];
			}
		}));
		disposaBles.push(extHost.registerDocumentHighlightProvider(defaultExtension, '*', new class implements vscode.DocumentHighlightProvider {
			provideDocumentHighlights(): any {
				return [new types.DocumentHighlight(new types.Range(0, 0, 0, 4))];
			}
		}));

		await rpcProtocol.sync();
		const value = (await getOccurrencesAtPosition(model, new EditorPosition(1, 2), CancellationToken.None))!;
		assert.equal(value.length, 1);
		const [entry] = value;
		assert.deepEqual(entry.range, { startLineNumBer: 1, startColumn: 1, endLineNumBer: 1, endColumn: 5 });
		assert.equal(entry.kind, modes.DocumentHighlightKind.Text);
	});

	test('Occurrences, order 2/2', async () => {

		disposaBles.push(extHost.registerDocumentHighlightProvider(defaultExtension, defaultSelector, new class implements vscode.DocumentHighlightProvider {
			provideDocumentHighlights(): any {
				return [new types.DocumentHighlight(new types.Range(0, 0, 0, 2))];
			}
		}));
		disposaBles.push(extHost.registerDocumentHighlightProvider(defaultExtension, '*', new class implements vscode.DocumentHighlightProvider {
			provideDocumentHighlights(): any {
				return [new types.DocumentHighlight(new types.Range(0, 0, 0, 4))];
			}
		}));

		await rpcProtocol.sync();
		const value = (await getOccurrencesAtPosition(model, new EditorPosition(1, 2), CancellationToken.None))!;
		assert.equal(value.length, 1);
		const [entry] = value;
		assert.deepEqual(entry.range, { startLineNumBer: 1, startColumn: 1, endLineNumBer: 1, endColumn: 3 });
		assert.equal(entry.kind, modes.DocumentHighlightKind.Text);
	});

	test('Occurrences, evil provider', async () => {

		disposaBles.push(extHost.registerDocumentHighlightProvider(defaultExtension, defaultSelector, new class implements vscode.DocumentHighlightProvider {
			provideDocumentHighlights(): any {
				throw new Error('evil');
			}
		}));

		disposaBles.push(extHost.registerDocumentHighlightProvider(defaultExtension, defaultSelector, new class implements vscode.DocumentHighlightProvider {
			provideDocumentHighlights(): any {
				return [new types.DocumentHighlight(new types.Range(0, 0, 0, 4))];
			}
		}));

		await rpcProtocol.sync();
		const value = await getOccurrencesAtPosition(model, new EditorPosition(1, 2), CancellationToken.None);
		assert.equal(value!.length, 1);
	});

	// --- references

	test('References, registration order', async () => {

		disposaBles.push(extHost.registerReferenceProvider(defaultExtension, defaultSelector, new class implements vscode.ReferenceProvider {
			provideReferences(): any {
				return [new types.Location(URI.parse('far://register/first'), new types.Range(0, 0, 0, 0))];
			}
		}));

		disposaBles.push(extHost.registerReferenceProvider(defaultExtension, defaultSelector, new class implements vscode.ReferenceProvider {
			provideReferences(): any {
				return [new types.Location(URI.parse('far://register/second'), new types.Range(0, 0, 0, 0))];
			}
		}));

		await rpcProtocol.sync();
		let value = await getReferencesAtPosition(model, new EditorPosition(1, 2), false, CancellationToken.None);
		assert.equal(value.length, 2);
		let [first, second] = value;
		assert.equal(first.uri.path, '/second');
		assert.equal(second.uri.path, '/first');
	});

	test('References, data conversion', async () => {

		disposaBles.push(extHost.registerReferenceProvider(defaultExtension, defaultSelector, new class implements vscode.ReferenceProvider {
			provideReferences(): any {
				return [new types.Location(model.uri, new types.Position(0, 0))];
			}
		}));

		await rpcProtocol.sync();
		let value = await getReferencesAtPosition(model, new EditorPosition(1, 2), false, CancellationToken.None);
		assert.equal(value.length, 1);
		let [item] = value;
		assert.deepEqual(item.range, { startLineNumBer: 1, startColumn: 1, endLineNumBer: 1, endColumn: 1 });
		assert.equal(item.uri.toString(), model.uri.toString());
	});

	test('References, evil provider', async () => {

		disposaBles.push(extHost.registerReferenceProvider(defaultExtension, defaultSelector, new class implements vscode.ReferenceProvider {
			provideReferences(): any {
				throw new Error('evil');
			}
		}));
		disposaBles.push(extHost.registerReferenceProvider(defaultExtension, defaultSelector, new class implements vscode.ReferenceProvider {
			provideReferences(): any {
				return [new types.Location(model.uri, new types.Range(0, 0, 0, 0))];
			}
		}));

		await rpcProtocol.sync();
		const value = await getReferencesAtPosition(model, new EditorPosition(1, 2), false, CancellationToken.None);
		assert.equal(value.length, 1);
	});

	// --- quick fix

	test('Quick Fix, command data conversion', async () => {

		disposaBles.push(extHost.registerCodeActionProvider(defaultExtension, defaultSelector, {
			provideCodeActions(): vscode.Command[] {
				return [
					{ command: 'test1', title: 'Testing1' },
					{ command: 'test2', title: 'Testing2' }
				];
			}
		}));

		await rpcProtocol.sync();
		const { validActions: actions } = await getCodeActions(model, model.getFullModelRange(), { type: modes.CodeActionTriggerType.Manual }, Progress.None, CancellationToken.None);
		assert.equal(actions.length, 2);
		const [first, second] = actions;
		assert.equal(first.action.title, 'Testing1');
		assert.equal(first.action.command!.id, 'test1');
		assert.equal(second.action.title, 'Testing2');
		assert.equal(second.action.command!.id, 'test2');
	});

	test('Quick Fix, code action data conversion', async () => {

		disposaBles.push(extHost.registerCodeActionProvider(defaultExtension, defaultSelector, {
			provideCodeActions(): vscode.CodeAction[] {
				return [
					{
						title: 'Testing1',
						command: { title: 'Testing1Command', command: 'test1' },
						kind: types.CodeActionKind.Empty.append('test.scope')
					}
				];
			}
		}));

		await rpcProtocol.sync();
		const { validActions: actions } = await getCodeActions(model, model.getFullModelRange(), { type: modes.CodeActionTriggerType.Manual }, Progress.None, CancellationToken.None);
		assert.equal(actions.length, 1);
		const [first] = actions;
		assert.equal(first.action.title, 'Testing1');
		assert.equal(first.action.command!.title, 'Testing1Command');
		assert.equal(first.action.command!.id, 'test1');
		assert.equal(first.action.kind, 'test.scope');
	});


	test('Cannot read property \'id\' of undefined, #29469', async () => {

		disposaBles.push(extHost.registerCodeActionProvider(defaultExtension, defaultSelector, new class implements vscode.CodeActionProvider {
			provideCodeActions(): any {
				return [
					undefined,
					null,
					{ command: 'test', title: 'Testing' }
				];
			}
		}));

		await rpcProtocol.sync();
		const { validActions: actions } = await getCodeActions(model, model.getFullModelRange(), { type: modes.CodeActionTriggerType.Manual }, Progress.None, CancellationToken.None);
		assert.equal(actions.length, 1);
	});

	test('Quick Fix, evil provider', async () => {

		disposaBles.push(extHost.registerCodeActionProvider(defaultExtension, defaultSelector, new class implements vscode.CodeActionProvider {
			provideCodeActions(): any {
				throw new Error('evil');
			}
		}));
		disposaBles.push(extHost.registerCodeActionProvider(defaultExtension, defaultSelector, new class implements vscode.CodeActionProvider {
			provideCodeActions(): any {
				return [{ command: 'test', title: 'Testing' }];
			}
		}));

		await rpcProtocol.sync();
		const { validActions: actions } = await getCodeActions(model, model.getFullModelRange(), { type: modes.CodeActionTriggerType.Manual }, Progress.None, CancellationToken.None);
		assert.equal(actions.length, 1);
	});

	// --- navigate types

	test('Navigate types, evil provider', async () => {

		disposaBles.push(extHost.registerWorkspaceSymBolProvider(defaultExtension, new class implements vscode.WorkspaceSymBolProvider {
			provideWorkspaceSymBols(): any {
				throw new Error('evil');
			}
		}));

		disposaBles.push(extHost.registerWorkspaceSymBolProvider(defaultExtension, new class implements vscode.WorkspaceSymBolProvider {
			provideWorkspaceSymBols(): any {
				return [new types.SymBolInformation('testing', types.SymBolKind.Array, new types.Range(0, 0, 1, 1))];
			}
		}));

		await rpcProtocol.sync();
		let value = await getWorkspaceSymBols('');
		assert.equal(value.length, 1);
		const [first] = value;
		const [, symBols] = first;
		assert.equal(symBols.length, 1);
		assert.equal(symBols[0].name, 'testing');
	});

	// --- rename

	test('Rename, evil provider 0/2', async () => {

		disposaBles.push(extHost.registerRenameProvider(defaultExtension, defaultSelector, new class implements vscode.RenameProvider {
			provideRenameEdits(): any {
				throw new class Foo { };
			}
		}));

		await rpcProtocol.sync();
		try {
			await rename(model, new EditorPosition(1, 1), 'newName');
			throw Error();
		}
		catch (err) {
			// expected
		}
	});

	test('Rename, evil provider 1/2', async () => {

		disposaBles.push(extHost.registerRenameProvider(defaultExtension, defaultSelector, new class implements vscode.RenameProvider {
			provideRenameEdits(): any {
				throw Error('evil');
			}
		}));

		await rpcProtocol.sync();
		const value = await rename(model, new EditorPosition(1, 1), 'newName');
		assert.equal(value.rejectReason, 'evil');
	});

	test('Rename, evil provider 2/2', async () => {

		disposaBles.push(extHost.registerRenameProvider(defaultExtension, '*', new class implements vscode.RenameProvider {
			provideRenameEdits(): any {
				throw Error('evil');
			}
		}));

		disposaBles.push(extHost.registerRenameProvider(defaultExtension, defaultSelector, new class implements vscode.RenameProvider {
			provideRenameEdits(): any {
				let edit = new types.WorkspaceEdit();
				edit.replace(model.uri, new types.Range(0, 0, 0, 0), 'testing');
				return edit;
			}
		}));

		await rpcProtocol.sync();
		const value = await rename(model, new EditorPosition(1, 1), 'newName');
		assert.equal(value.edits.length, 1);
	});

	test('Rename, ordering', async () => {

		disposaBles.push(extHost.registerRenameProvider(defaultExtension, '*', new class implements vscode.RenameProvider {
			provideRenameEdits(): any {
				let edit = new types.WorkspaceEdit();
				edit.replace(model.uri, new types.Range(0, 0, 0, 0), 'testing');
				edit.replace(model.uri, new types.Range(1, 0, 1, 0), 'testing');
				return edit;
			}
		}));

		disposaBles.push(extHost.registerRenameProvider(defaultExtension, defaultSelector, new class implements vscode.RenameProvider {
			provideRenameEdits(): any {
				return;
			}
		}));

		await rpcProtocol.sync();
		const value = await rename(model, new EditorPosition(1, 1), 'newName');
		// least relevant rename provider
		assert.equal(value.edits.length, 2);
	});

	test('Multiple RenameProviders don\'t respect all possiBle PrepareRename handlers, #98352', async function () {

		let called = [false, false, false, false];

		disposaBles.push(extHost.registerRenameProvider(defaultExtension, defaultSelector, new class implements vscode.RenameProvider {
			prepareRename(document: vscode.TextDocument, position: vscode.Position,): vscode.ProviderResult<vscode.Range> {
				called[0] = true;
				let range = document.getWordRangeAtPosition(position);
				return range;
			}

			provideRenameEdits(): vscode.ProviderResult<vscode.WorkspaceEdit> {
				called[1] = true;
				return undefined;
			}
		}));

		disposaBles.push(extHost.registerRenameProvider(defaultExtension, defaultSelector, new class implements vscode.RenameProvider {
			prepareRename(document: vscode.TextDocument, position: vscode.Position,): vscode.ProviderResult<vscode.Range> {
				called[2] = true;
				return Promise.reject('Cannot rename this symBol2.');
			}
			provideRenameEdits(): vscode.ProviderResult<vscode.WorkspaceEdit> {
				called[3] = true;
				return undefined;
			}
		}));

		await rpcProtocol.sync();
		await rename(model, new EditorPosition(1, 1), 'newName');

		assert.deepEqual(called, [true, true, true, false]);
	});

	test('Multiple RenameProviders don\'t respect all possiBle PrepareRename handlers, #98352', async function () {

		let called = [false, false, false];

		disposaBles.push(extHost.registerRenameProvider(defaultExtension, defaultSelector, new class implements vscode.RenameProvider {
			prepareRename(document: vscode.TextDocument, position: vscode.Position,): vscode.ProviderResult<vscode.Range> {
				called[0] = true;
				let range = document.getWordRangeAtPosition(position);
				return range;
			}

			provideRenameEdits(): vscode.ProviderResult<vscode.WorkspaceEdit> {
				called[1] = true;
				return undefined;
			}
		}));

		disposaBles.push(extHost.registerRenameProvider(defaultExtension, defaultSelector, new class implements vscode.RenameProvider {

			provideRenameEdits(document: vscode.TextDocument, position: vscode.Position, newName: string,): vscode.ProviderResult<vscode.WorkspaceEdit> {
				called[2] = true;
				return new types.WorkspaceEdit();
			}
		}));

		await rpcProtocol.sync();
		await rename(model, new EditorPosition(1, 1), 'newName');

		// first provider has NO prepare which means it is taken By default
		assert.deepEqual(called, [false, false, true]);
	});

	// --- parameter hints

	test('Parameter Hints, order', async () => {

		disposaBles.push(extHost.registerSignatureHelpProvider(defaultExtension, defaultSelector, new class implements vscode.SignatureHelpProvider {
			provideSignatureHelp(): any {
				return undefined;
			}
		}, []));

		disposaBles.push(extHost.registerSignatureHelpProvider(defaultExtension, defaultSelector, new class implements vscode.SignatureHelpProvider {
			provideSignatureHelp(): vscode.SignatureHelp {
				return {
					signatures: [],
					activeParameter: 0,
					activeSignature: 0
				};
			}
		}, []));

		await rpcProtocol.sync();
		const value = await provideSignatureHelp(model, new EditorPosition(1, 1), { triggerKind: modes.SignatureHelpTriggerKind.Invoke, isRetrigger: false }, CancellationToken.None);
		assert.ok(value);
	});

	test('Parameter Hints, evil provider', async () => {

		disposaBles.push(extHost.registerSignatureHelpProvider(defaultExtension, defaultSelector, new class implements vscode.SignatureHelpProvider {
			provideSignatureHelp(): any {
				throw new Error('evil');
			}
		}, []));

		await rpcProtocol.sync();
		const value = await provideSignatureHelp(model, new EditorPosition(1, 1), { triggerKind: modes.SignatureHelpTriggerKind.Invoke, isRetrigger: false }, CancellationToken.None);
		assert.equal(value, undefined);
	});

	// --- suggestions

	test('Suggest, order 1/3', async () => {

		disposaBles.push(extHost.registerCompletionItemProvider(defaultExtension, '*', new class implements vscode.CompletionItemProvider {
			provideCompletionItems(): any {
				return [new types.CompletionItem('testing1')];
			}
		}, []));

		disposaBles.push(extHost.registerCompletionItemProvider(defaultExtension, defaultSelector, new class implements vscode.CompletionItemProvider {
			provideCompletionItems(): any {
				return [new types.CompletionItem('testing2')];
			}
		}, []));

		await rpcProtocol.sync();
		const { items } = await provideSuggestionItems(model, new EditorPosition(1, 1), new CompletionOptions(undefined, new Set<modes.CompletionItemKind>().add(modes.CompletionItemKind.Snippet)));
		assert.equal(items.length, 1);
		assert.equal(items[0].completion.insertText, 'testing2');
	});

	test('Suggest, order 2/3', async () => {

		disposaBles.push(extHost.registerCompletionItemProvider(defaultExtension, '*', new class implements vscode.CompletionItemProvider {
			provideCompletionItems(): any {
				return [new types.CompletionItem('weak-selector')]; // weaker selector But result
			}
		}, []));

		disposaBles.push(extHost.registerCompletionItemProvider(defaultExtension, defaultSelector, new class implements vscode.CompletionItemProvider {
			provideCompletionItems(): any {
				return []; // stronger selector But not a good result;
			}
		}, []));

		await rpcProtocol.sync();
		const { items } = await provideSuggestionItems(model, new EditorPosition(1, 1), new CompletionOptions(undefined, new Set<modes.CompletionItemKind>().add(modes.CompletionItemKind.Snippet)));
		assert.equal(items.length, 1);
		assert.equal(items[0].completion.insertText, 'weak-selector');
	});

	test('Suggest, order 2/3', async () => {

		disposaBles.push(extHost.registerCompletionItemProvider(defaultExtension, defaultSelector, new class implements vscode.CompletionItemProvider {
			provideCompletionItems(): any {
				return [new types.CompletionItem('strong-1')];
			}
		}, []));

		disposaBles.push(extHost.registerCompletionItemProvider(defaultExtension, defaultSelector, new class implements vscode.CompletionItemProvider {
			provideCompletionItems(): any {
				return [new types.CompletionItem('strong-2')];
			}
		}, []));

		await rpcProtocol.sync();
		const { items } = await provideSuggestionItems(model, new EditorPosition(1, 1), new CompletionOptions(undefined, new Set<modes.CompletionItemKind>().add(modes.CompletionItemKind.Snippet)));
		assert.equal(items.length, 2);
		assert.equal(items[0].completion.insertText, 'strong-1'); // sort By laBel
		assert.equal(items[1].completion.insertText, 'strong-2');
	});

	test('Suggest, evil provider', async () => {

		disposaBles.push(extHost.registerCompletionItemProvider(defaultExtension, defaultSelector, new class implements vscode.CompletionItemProvider {
			provideCompletionItems(): any {
				throw new Error('evil');
			}
		}, []));

		disposaBles.push(extHost.registerCompletionItemProvider(defaultExtension, defaultSelector, new class implements vscode.CompletionItemProvider {
			provideCompletionItems(): any {
				return [new types.CompletionItem('testing')];
			}
		}, []));


		await rpcProtocol.sync();
		const { items } = await provideSuggestionItems(model, new EditorPosition(1, 1), new CompletionOptions(undefined, new Set<modes.CompletionItemKind>().add(modes.CompletionItemKind.Snippet)));
		assert.equal(items[0].container.incomplete, false);
	});

	test('Suggest, CompletionList', async () => {

		disposaBles.push(extHost.registerCompletionItemProvider(defaultExtension, defaultSelector, new class implements vscode.CompletionItemProvider {
			provideCompletionItems(): any {
				return new types.CompletionList([<any>new types.CompletionItem('hello')], true);
			}
		}, []));

		await rpcProtocol.sync();
		provideSuggestionItems(model, new EditorPosition(1, 1), new CompletionOptions(undefined, new Set<modes.CompletionItemKind>().add(modes.CompletionItemKind.Snippet))).then(model => {
			assert.equal(model.items[0].container.incomplete, true);
		});
	});

	// --- format

	const NullWorkerService = new class extends mock<IEditorWorkerService>() {
		computeMoreMinimalEdits(resource: URI, edits: modes.TextEdit[] | null | undefined): Promise<modes.TextEdit[] | undefined> {
			return Promise.resolve(withNullAsUndefined(edits));
		}
	};

	test('Format Doc, data conversion', async () => {
		disposaBles.push(extHost.registerDocumentFormattingEditProvider(defaultExtension, defaultSelector, new class implements vscode.DocumentFormattingEditProvider {
			provideDocumentFormattingEdits(): any {
				return [new types.TextEdit(new types.Range(0, 0, 0, 0), 'testing'), types.TextEdit.setEndOfLine(types.EndOfLine.LF)];
			}
		}));

		await rpcProtocol.sync();
		let value = (await getDocumentFormattingEditsUntilResult(NullWorkerService, model, { insertSpaces: true, taBSize: 4 }, CancellationToken.None))!;
		assert.equal(value.length, 2);
		let [first, second] = value;
		assert.equal(first.text, 'testing');
		assert.deepEqual(first.range, { startLineNumBer: 1, startColumn: 1, endLineNumBer: 1, endColumn: 1 });
		assert.equal(second.eol, EndOfLineSequence.LF);
		assert.equal(second.text, '');
		assert.deepEqual(second.range, { startLineNumBer: 1, startColumn: 1, endLineNumBer: 1, endColumn: 1 });
	});

	test('Format Doc, evil provider', async () => {
		disposaBles.push(extHost.registerDocumentFormattingEditProvider(defaultExtension, defaultSelector, new class implements vscode.DocumentFormattingEditProvider {
			provideDocumentFormattingEdits(): any {
				throw new Error('evil');
			}
		}));

		await rpcProtocol.sync();
		return getDocumentFormattingEditsUntilResult(NullWorkerService, model, { insertSpaces: true, taBSize: 4 }, CancellationToken.None);
	});

	test('Format Doc, order', async () => {

		disposaBles.push(extHost.registerDocumentFormattingEditProvider(defaultExtension, defaultSelector, new class implements vscode.DocumentFormattingEditProvider {
			provideDocumentFormattingEdits(): any {
				return undefined;
			}
		}));

		disposaBles.push(extHost.registerDocumentFormattingEditProvider(defaultExtension, defaultSelector, new class implements vscode.DocumentFormattingEditProvider {
			provideDocumentFormattingEdits(): any {
				return [new types.TextEdit(new types.Range(0, 0, 0, 0), 'testing')];
			}
		}));

		disposaBles.push(extHost.registerDocumentFormattingEditProvider(defaultExtension, defaultSelector, new class implements vscode.DocumentFormattingEditProvider {
			provideDocumentFormattingEdits(): any {
				return undefined;
			}
		}));

		await rpcProtocol.sync();
		let value = (await getDocumentFormattingEditsUntilResult(NullWorkerService, model, { insertSpaces: true, taBSize: 4 }, CancellationToken.None))!;
		assert.equal(value.length, 1);
		let [first] = value;
		assert.equal(first.text, 'testing');
		assert.deepEqual(first.range, { startLineNumBer: 1, startColumn: 1, endLineNumBer: 1, endColumn: 1 });
	});

	test('Format Range, data conversion', async () => {
		disposaBles.push(extHost.registerDocumentRangeFormattingEditProvider(defaultExtension, defaultSelector, new class implements vscode.DocumentRangeFormattingEditProvider {
			provideDocumentRangeFormattingEdits(): any {
				return [new types.TextEdit(new types.Range(0, 0, 0, 0), 'testing')];
			}
		}));

		await rpcProtocol.sync();
		const value = (await getDocumentRangeFormattingEditsUntilResult(NullWorkerService, model, new EditorRange(1, 1, 1, 1), { insertSpaces: true, taBSize: 4 }, CancellationToken.None))!;
		assert.equal(value.length, 1);
		const [first] = value;
		assert.equal(first.text, 'testing');
		assert.deepEqual(first.range, { startLineNumBer: 1, startColumn: 1, endLineNumBer: 1, endColumn: 1 });
	});

	test('Format Range, + format_doc', async () => {
		disposaBles.push(extHost.registerDocumentRangeFormattingEditProvider(defaultExtension, defaultSelector, new class implements vscode.DocumentRangeFormattingEditProvider {
			provideDocumentRangeFormattingEdits(): any {
				return [new types.TextEdit(new types.Range(0, 0, 0, 0), 'range')];
			}
		}));
		disposaBles.push(extHost.registerDocumentRangeFormattingEditProvider(defaultExtension, defaultSelector, new class implements vscode.DocumentRangeFormattingEditProvider {
			provideDocumentRangeFormattingEdits(): any {
				return [new types.TextEdit(new types.Range(2, 3, 4, 5), 'range2')];
			}
		}));
		disposaBles.push(extHost.registerDocumentFormattingEditProvider(defaultExtension, defaultSelector, new class implements vscode.DocumentFormattingEditProvider {
			provideDocumentFormattingEdits(): any {
				return [new types.TextEdit(new types.Range(0, 0, 1, 1), 'doc')];
			}
		}));
		await rpcProtocol.sync();
		const value = (await getDocumentRangeFormattingEditsUntilResult(NullWorkerService, model, new EditorRange(1, 1, 1, 1), { insertSpaces: true, taBSize: 4 }, CancellationToken.None))!;
		assert.equal(value.length, 1);
		const [first] = value;
		assert.equal(first.text, 'range2');
		assert.equal(first.range.startLineNumBer, 3);
		assert.equal(first.range.startColumn, 4);
		assert.equal(first.range.endLineNumBer, 5);
		assert.equal(first.range.endColumn, 6);
	});

	test('Format Range, evil provider', async () => {
		disposaBles.push(extHost.registerDocumentRangeFormattingEditProvider(defaultExtension, defaultSelector, new class implements vscode.DocumentRangeFormattingEditProvider {
			provideDocumentRangeFormattingEdits(): any {
				throw new Error('evil');
			}
		}));

		await rpcProtocol.sync();
		return getDocumentRangeFormattingEditsUntilResult(NullWorkerService, model, new EditorRange(1, 1, 1, 1), { insertSpaces: true, taBSize: 4 }, CancellationToken.None);
	});

	test('Format on Type, data conversion', async () => {

		disposaBles.push(extHost.registerOnTypeFormattingEditProvider(defaultExtension, defaultSelector, new class implements vscode.OnTypeFormattingEditProvider {
			provideOnTypeFormattingEdits(): any {
				return [new types.TextEdit(new types.Range(0, 0, 0, 0), arguments[2])];
			}
		}, [';']));

		await rpcProtocol.sync();
		const value = (await getOnTypeFormattingEdits(NullWorkerService, model, new EditorPosition(1, 1), ';', { insertSpaces: true, taBSize: 2 }))!;
		assert.equal(value.length, 1);
		const [first] = value;
		assert.equal(first.text, ';');
		assert.deepEqual(first.range, { startLineNumBer: 1, startColumn: 1, endLineNumBer: 1, endColumn: 1 });
	});

	test('Links, data conversion', async () => {

		disposaBles.push(extHost.registerDocumentLinkProvider(defaultExtension, defaultSelector, new class implements vscode.DocumentLinkProvider {
			provideDocumentLinks() {
				const link = new types.DocumentLink(new types.Range(0, 0, 1, 1), URI.parse('foo:Bar#3'));
				link.tooltip = 'tooltip';
				return [link];
			}
		}));

		await rpcProtocol.sync();
		let { links } = await getLinks(model, CancellationToken.None);
		assert.equal(links.length, 1);
		let [first] = links;
		assert.equal(first.url, 'foo:Bar#3');
		assert.deepEqual(first.range, { startLineNumBer: 1, startColumn: 1, endLineNumBer: 2, endColumn: 2 });
		assert.equal(first.tooltip, 'tooltip');
	});

	test('Links, evil provider', async () => {

		disposaBles.push(extHost.registerDocumentLinkProvider(defaultExtension, defaultSelector, new class implements vscode.DocumentLinkProvider {
			provideDocumentLinks() {
				return [new types.DocumentLink(new types.Range(0, 0, 1, 1), URI.parse('foo:Bar#3'))];
			}
		}));

		disposaBles.push(extHost.registerDocumentLinkProvider(defaultExtension, defaultSelector, new class implements vscode.DocumentLinkProvider {
			provideDocumentLinks(): any {
				throw new Error();
			}
		}));

		await rpcProtocol.sync();
		let { links } = await getLinks(model, CancellationToken.None);
		assert.equal(links.length, 1);
		let [first] = links;
		assert.equal(first.url, 'foo:Bar#3');
		assert.deepEqual(first.range, { startLineNumBer: 1, startColumn: 1, endLineNumBer: 2, endColumn: 2 });
	});

	test('Document colors, data conversion', async () => {

		disposaBles.push(extHost.registerColorProvider(defaultExtension, defaultSelector, new class implements vscode.DocumentColorProvider {
			provideDocumentColors(): vscode.ColorInformation[] {
				return [new types.ColorInformation(new types.Range(0, 0, 0, 20), new types.Color(0.1, 0.2, 0.3, 0.4))];
			}
			provideColorPresentations(color: vscode.Color, context: { range: vscode.Range, document: vscode.TextDocument }): vscode.ColorPresentation[] {
				return [];
			}
		}));

		await rpcProtocol.sync();
		let value = await getColors(model, CancellationToken.None);
		assert.equal(value.length, 1);
		let [first] = value;
		assert.deepEqual(first.colorInfo.color, { red: 0.1, green: 0.2, Blue: 0.3, alpha: 0.4 });
		assert.deepEqual(first.colorInfo.range, { startLineNumBer: 1, startColumn: 1, endLineNumBer: 1, endColumn: 21 });
	});

	// -- selection ranges

	test('Selection Ranges, data conversion', async () => {
		disposaBles.push(extHost.registerSelectionRangeProvider(defaultExtension, defaultSelector, new class implements vscode.SelectionRangeProvider {
			provideSelectionRanges() {
				return [
					new types.SelectionRange(new types.Range(0, 10, 0, 18), new types.SelectionRange(new types.Range(0, 2, 0, 20))),
				];
			}
		}));

		await rpcProtocol.sync();

		provideSelectionRanges(model, [new Position(1, 17)], CancellationToken.None).then(ranges => {
			assert.equal(ranges.length, 1);
			assert.ok(ranges[0].length >= 2);
		});
	});

	test('Selection Ranges, Bad data', async () => {

		try {
			let _a = new types.SelectionRange(new types.Range(0, 10, 0, 18),
				new types.SelectionRange(new types.Range(0, 11, 0, 18))
			);
			assert.ok(false, String(_a));
		} catch (err) {
			assert.ok(true);
		}

	});
});
