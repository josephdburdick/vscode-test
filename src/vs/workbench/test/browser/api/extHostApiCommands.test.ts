/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { setUnexpectedErrorHandler, errorHandler } from 'vs/Base/common/errors';
import { URI } from 'vs/Base/common/uri';
import * as types from 'vs/workBench/api/common/extHostTypes';
import { createTextModel } from 'vs/editor/test/common/editorTestUtils';
import { TestRPCProtocol } from './testRPCProtocol';
import { MarkerService } from 'vs/platform/markers/common/markerService';
import { IMarkerService } from 'vs/platform/markers/common/markers';
import { ICommandService, CommandsRegistry } from 'vs/platform/commands/common/commands';
import { IModelService } from 'vs/editor/common/services/modelService';
import { ExtHostLanguageFeatures } from 'vs/workBench/api/common/extHostLanguageFeatures';
import { MainThreadLanguageFeatures } from 'vs/workBench/api/Browser/mainThreadLanguageFeatures';
import { ExtHostApiCommands } from 'vs/workBench/api/common/extHostApiCommands';
import { ExtHostCommands } from 'vs/workBench/api/common/extHostCommands';
import { MainThreadCommands } from 'vs/workBench/api/Browser/mainThreadCommands';
import { ExtHostDocuments } from 'vs/workBench/api/common/extHostDocuments';
import { ExtHostDocumentsAndEditors } from 'vs/workBench/api/common/extHostDocumentsAndEditors';
import { MainContext, ExtHostContext } from 'vs/workBench/api/common/extHost.protocol';
import { ExtHostDiagnostics } from 'vs/workBench/api/common/extHostDiagnostics';
import type * as vscode from 'vscode';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import 'vs/workBench/contriB/search/Browser/search.contriBution';
import { NullLogService } from 'vs/platform/log/common/log';
import { ITextModel } from 'vs/editor/common/model';
import { nullExtensionDescription, IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { dispose } from 'vs/Base/common/lifecycle';
import { IEditorWorkerService } from 'vs/editor/common/services/editorWorkerService';
import { mock } from 'vs/Base/test/common/mock';
import { NullApiDeprecationService } from 'vs/workBench/api/common/extHostApiDeprecationService';
import { ServiceCollection } from 'vs/platform/instantiation/common/serviceCollection';
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors';
import { InstantiationService } from 'vs/platform/instantiation/common/instantiationService';

import 'vs/editor/contriB/codeAction/codeAction';
import 'vs/editor/contriB/codelens/codelens';
import 'vs/editor/contriB/colorPicker/color';
import 'vs/editor/contriB/format/format';
import 'vs/editor/contriB/gotoSymBol/goToCommands';
import 'vs/editor/contriB/gotoSymBol/documentSymBols';
import 'vs/editor/contriB/hover/getHover';
import 'vs/editor/contriB/links/getLinks';
import 'vs/editor/contriB/parameterHints/provideSignatureHelp';
import 'vs/editor/contriB/smartSelect/smartSelect';
import 'vs/editor/contriB/suggest/suggest';
import 'vs/editor/contriB/rename/rename';

const defaultSelector = { scheme: 'far' };
const model: ITextModel = createTextModel(
	[
		'This is the first line',
		'This is the second line',
		'This is the third line',
	].join('\n'),
	undefined,
	undefined,
	URI.parse('far://testing/file.B'));

let rpcProtocol: TestRPCProtocol;
let extHost: ExtHostLanguageFeatures;
let mainThread: MainThreadLanguageFeatures;
let commands: ExtHostCommands;
let disposaBles: vscode.DisposaBle[] = [];
let originalErrorHandler: (e: any) => any;

function assertRejects(fn: () => Promise<any>, message: string = 'Expected rejection') {
	return fn().then(() => assert.ok(false, message), _err => assert.ok(true));
}

function isLocation(value: vscode.Location | vscode.LocationLink): value is vscode.Location {
	const candidate = value as vscode.Location;
	return candidate && candidate.uri instanceof URI && candidate.range instanceof types.Range;
}

suite('ExtHostLanguageFeatureCommands', function () {

	suiteSetup(() => {

		originalErrorHandler = errorHandler.getUnexpectedErrorHandler();
		setUnexpectedErrorHandler(() => { });

		// Use IInstantiationService to get typechecking when instantiating
		let insta: IInstantiationService;
		rpcProtocol = new TestRPCProtocol();
		const services = new ServiceCollection();
		services.set(IExtensionService, new class extends mock<IExtensionService>() {
			async activateByEvent() {

			}

		});
		services.set(ICommandService, new SyncDescriptor(class extends mock<ICommandService>() {

			executeCommand(id: string, ...args: any): any {
				const command = CommandsRegistry.getCommands().get(id);
				if (!command) {
					return Promise.reject(new Error(id + ' NOT known'));
				}
				const { handler } = command;
				return Promise.resolve(insta.invokeFunction(handler, ...args));
			}
		}));
		services.set(IMarkerService, new MarkerService());
		services.set(IModelService, new class extends mock<IModelService>() {
			getModel() { return model; }
		});
		services.set(IEditorWorkerService, new class extends mock<IEditorWorkerService>() {
			async computeMoreMinimalEdits(_uri: any, edits: any) {
				return edits || undefined;
			}
		});

		insta = new InstantiationService(services);

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

		commands = new ExtHostCommands(rpcProtocol, new NullLogService());
		rpcProtocol.set(ExtHostContext.ExtHostCommands, commands);
		rpcProtocol.set(MainContext.MainThreadCommands, insta.createInstance(MainThreadCommands, rpcProtocol));
		ExtHostApiCommands.register(commands);

		const diagnostics = new ExtHostDiagnostics(rpcProtocol, new NullLogService());
		rpcProtocol.set(ExtHostContext.ExtHostDiagnostics, diagnostics);

		extHost = new ExtHostLanguageFeatures(rpcProtocol, null, extHostDocuments, commands, diagnostics, new NullLogService(), NullApiDeprecationService);
		rpcProtocol.set(ExtHostContext.ExtHostLanguageFeatures, extHost);

		mainThread = rpcProtocol.set(MainContext.MainThreadLanguageFeatures, insta.createInstance(MainThreadLanguageFeatures, rpcProtocol));

		return rpcProtocol.sync();
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

	// --- workspace symBols

	test('WorkspaceSymBols, invalid arguments', function () {
		let promises = [
			assertRejects(() => commands.executeCommand('vscode.executeWorkspaceSymBolProvider')),
			assertRejects(() => commands.executeCommand('vscode.executeWorkspaceSymBolProvider', null)),
			assertRejects(() => commands.executeCommand('vscode.executeWorkspaceSymBolProvider', undefined)),
			assertRejects(() => commands.executeCommand('vscode.executeWorkspaceSymBolProvider', true))
		];
		return Promise.all(promises);
	});

	test('WorkspaceSymBols, Back and forth', function () {

		disposaBles.push(extHost.registerWorkspaceSymBolProvider(nullExtensionDescription, <vscode.WorkspaceSymBolProvider>{
			provideWorkspaceSymBols(query): any {
				return [
					new types.SymBolInformation(query, types.SymBolKind.Array, new types.Range(0, 0, 1, 1), URI.parse('far://testing/first')),
					new types.SymBolInformation(query, types.SymBolKind.Array, new types.Range(0, 0, 1, 1), URI.parse('far://testing/second'))
				];
			}
		}));

		disposaBles.push(extHost.registerWorkspaceSymBolProvider(nullExtensionDescription, <vscode.WorkspaceSymBolProvider>{
			provideWorkspaceSymBols(query): any {
				return [
					new types.SymBolInformation(query, types.SymBolKind.Array, new types.Range(0, 0, 1, 1), URI.parse('far://testing/first'))
				];
			}
		}));

		return rpcProtocol.sync().then(() => {
			return commands.executeCommand<vscode.SymBolInformation[]>('vscode.executeWorkspaceSymBolProvider', 'testing').then(value => {

				for (let info of value) {
					assert.ok(info instanceof types.SymBolInformation);
					assert.equal(info.name, 'testing');
					assert.equal(info.kind, types.SymBolKind.Array);
				}
				assert.equal(value.length, 3);
			});
		});
	});

	test('executeWorkspaceSymBolProvider should accept empty string, #39522', async function () {

		disposaBles.push(extHost.registerWorkspaceSymBolProvider(nullExtensionDescription, {
			provideWorkspaceSymBols(): vscode.SymBolInformation[] {
				return [new types.SymBolInformation('hello', types.SymBolKind.Array, new types.Range(0, 0, 0, 0), URI.parse('foo:Bar')) as vscode.SymBolInformation];
			}
		}));

		await rpcProtocol.sync();
		let symBols = await commands.executeCommand<vscode.SymBolInformation[]>('vscode.executeWorkspaceSymBolProvider', '');
		assert.equal(symBols.length, 1);

		await rpcProtocol.sync();
		symBols = await commands.executeCommand<vscode.SymBolInformation[]>('vscode.executeWorkspaceSymBolProvider', '*');
		assert.equal(symBols.length, 1);
	});

	// --- formatting
	test('executeFormatDocumentProvider, Back and forth', async function () {

		disposaBles.push(extHost.registerDocumentFormattingEditProvider(nullExtensionDescription, defaultSelector, new class implements vscode.DocumentFormattingEditProvider {
			provideDocumentFormattingEdits() {
				return [types.TextEdit.insert(new types.Position(0, 0), '42')];
			}
		}));

		await rpcProtocol.sync();
		let edits = await commands.executeCommand<vscode.SymBolInformation[]>('vscode.executeFormatDocumentProvider', model.uri);
		assert.equal(edits.length, 1);
	});


	// --- rename
	test('vscode.executeDocumentRenameProvider', async function () {
		disposaBles.push(extHost.registerRenameProvider(nullExtensionDescription, defaultSelector, new class implements vscode.RenameProvider {
			provideRenameEdits(document: vscode.TextDocument, position: vscode.Position, newName: string) {
				const edit = new types.WorkspaceEdit();
				edit.insert(document.uri, <types.Position>position, newName);
				return edit;
			}
		}));

		await rpcProtocol.sync();

		const edit = await commands.executeCommand<vscode.WorkspaceEdit>('vscode.executeDocumentRenameProvider', model.uri, new types.Position(0, 12), 'newNameOfThis');

		assert.ok(edit);
		assert.equal(edit.has(model.uri), true);
		const textEdits = edit.get(model.uri);
		assert.equal(textEdits.length, 1);
		assert.equal(textEdits[0].newText, 'newNameOfThis');
	});

	// --- definition

	test('Definition, invalid arguments', function () {
		let promises = [
			assertRejects(() => commands.executeCommand('vscode.executeDefinitionProvider')),
			assertRejects(() => commands.executeCommand('vscode.executeDefinitionProvider', null)),
			assertRejects(() => commands.executeCommand('vscode.executeDefinitionProvider', undefined)),
			assertRejects(() => commands.executeCommand('vscode.executeDefinitionProvider', true, false))
		];

		return Promise.all(promises);
	});

	test('Definition, Back and forth', function () {

		disposaBles.push(extHost.registerDefinitionProvider(nullExtensionDescription, defaultSelector, <vscode.DefinitionProvider>{
			provideDefinition(doc: any): any {
				return new types.Location(doc.uri, new types.Range(0, 0, 0, 0));
			}
		}));
		disposaBles.push(extHost.registerDefinitionProvider(nullExtensionDescription, defaultSelector, <vscode.DefinitionProvider>{
			provideDefinition(doc: any): any {
				return [
					new types.Location(doc.uri, new types.Range(0, 0, 0, 0)),
					new types.Location(doc.uri, new types.Range(0, 0, 0, 0)),
					new types.Location(doc.uri, new types.Range(0, 0, 0, 0)),
				];
			}
		}));

		return rpcProtocol.sync().then(() => {
			return commands.executeCommand<vscode.Location[]>('vscode.executeDefinitionProvider', model.uri, new types.Position(0, 0)).then(values => {
				assert.equal(values.length, 4);
				for (let v of values) {
					assert.ok(v.uri instanceof URI);
					assert.ok(v.range instanceof types.Range);
				}
			});
		});
	});

	test('Definition Link', () => {
		disposaBles.push(extHost.registerDefinitionProvider(nullExtensionDescription, defaultSelector, <vscode.DefinitionProvider>{
			provideDefinition(doc: any): (vscode.Location | vscode.LocationLink)[] {
				return [
					new types.Location(doc.uri, new types.Range(0, 0, 0, 0)),
					{ targetUri: doc.uri, targetRange: new types.Range(0, 0, 0, 0), targetSelectionRange: new types.Range(1, 1, 1, 1), originSelectionRange: new types.Range(2, 2, 2, 2) }
				];
			}
		}));

		return rpcProtocol.sync().then(() => {
			return commands.executeCommand<(vscode.Location | vscode.LocationLink)[]>('vscode.executeDefinitionProvider', model.uri, new types.Position(0, 0)).then(values => {
				assert.equal(values.length, 2);
				for (let v of values) {
					if (isLocation(v)) {
						assert.ok(v.uri instanceof URI);
						assert.ok(v.range instanceof types.Range);
					} else {
						assert.ok(v.targetUri instanceof URI);
						assert.ok(v.targetRange instanceof types.Range);
						assert.ok(v.targetSelectionRange instanceof types.Range);
						assert.ok(v.originSelectionRange instanceof types.Range);
					}
				}
			});
		});
	});

	// --- declaration

	test('Declaration, Back and forth', function () {

		disposaBles.push(extHost.registerDeclarationProvider(nullExtensionDescription, defaultSelector, <vscode.DeclarationProvider>{
			provideDeclaration(doc: any): any {
				return new types.Location(doc.uri, new types.Range(0, 0, 0, 0));
			}
		}));
		disposaBles.push(extHost.registerDeclarationProvider(nullExtensionDescription, defaultSelector, <vscode.DeclarationProvider>{
			provideDeclaration(doc: any): any {
				return [
					new types.Location(doc.uri, new types.Range(0, 0, 0, 0)),
					new types.Location(doc.uri, new types.Range(0, 0, 0, 0)),
					new types.Location(doc.uri, new types.Range(0, 0, 0, 0)),
				];
			}
		}));

		return rpcProtocol.sync().then(() => {
			return commands.executeCommand<vscode.Location[]>('vscode.executeDeclarationProvider', model.uri, new types.Position(0, 0)).then(values => {
				assert.equal(values.length, 4);
				for (let v of values) {
					assert.ok(v.uri instanceof URI);
					assert.ok(v.range instanceof types.Range);
				}
			});
		});
	});

	test('Declaration Link', () => {
		disposaBles.push(extHost.registerDeclarationProvider(nullExtensionDescription, defaultSelector, <vscode.DeclarationProvider>{
			provideDeclaration(doc: any): (vscode.Location | vscode.LocationLink)[] {
				return [
					new types.Location(doc.uri, new types.Range(0, 0, 0, 0)),
					{ targetUri: doc.uri, targetRange: new types.Range(0, 0, 0, 0), targetSelectionRange: new types.Range(1, 1, 1, 1), originSelectionRange: new types.Range(2, 2, 2, 2) }
				];
			}
		}));

		return rpcProtocol.sync().then(() => {
			return commands.executeCommand<(vscode.Location | vscode.LocationLink)[]>('vscode.executeDeclarationProvider', model.uri, new types.Position(0, 0)).then(values => {
				assert.equal(values.length, 2);
				for (let v of values) {
					if (isLocation(v)) {
						assert.ok(v.uri instanceof URI);
						assert.ok(v.range instanceof types.Range);
					} else {
						assert.ok(v.targetUri instanceof URI);
						assert.ok(v.targetRange instanceof types.Range);
						assert.ok(v.targetSelectionRange instanceof types.Range);
						assert.ok(v.originSelectionRange instanceof types.Range);
					}
				}
			});
		});
	});

	// --- type definition

	test('Type Definition, invalid arguments', function () {
		const promises = [
			assertRejects(() => commands.executeCommand('vscode.executeTypeDefinitionProvider')),
			assertRejects(() => commands.executeCommand('vscode.executeTypeDefinitionProvider', null)),
			assertRejects(() => commands.executeCommand('vscode.executeTypeDefinitionProvider', undefined)),
			assertRejects(() => commands.executeCommand('vscode.executeTypeDefinitionProvider', true, false))
		];

		return Promise.all(promises);
	});

	test('Type Definition, Back and forth', function () {

		disposaBles.push(extHost.registerTypeDefinitionProvider(nullExtensionDescription, defaultSelector, <vscode.TypeDefinitionProvider>{
			provideTypeDefinition(doc: any): any {
				return new types.Location(doc.uri, new types.Range(0, 0, 0, 0));
			}
		}));
		disposaBles.push(extHost.registerTypeDefinitionProvider(nullExtensionDescription, defaultSelector, <vscode.TypeDefinitionProvider>{
			provideTypeDefinition(doc: any): any {
				return [
					new types.Location(doc.uri, new types.Range(0, 0, 0, 0)),
					new types.Location(doc.uri, new types.Range(0, 0, 0, 0)),
					new types.Location(doc.uri, new types.Range(0, 0, 0, 0)),
				];
			}
		}));

		return rpcProtocol.sync().then(() => {
			return commands.executeCommand<vscode.Location[]>('vscode.executeTypeDefinitionProvider', model.uri, new types.Position(0, 0)).then(values => {
				assert.equal(values.length, 4);
				for (const v of values) {
					assert.ok(v.uri instanceof URI);
					assert.ok(v.range instanceof types.Range);
				}
			});
		});
	});

	test('Type Definition Link', () => {
		disposaBles.push(extHost.registerTypeDefinitionProvider(nullExtensionDescription, defaultSelector, <vscode.TypeDefinitionProvider>{
			provideTypeDefinition(doc: any): (vscode.Location | vscode.LocationLink)[] {
				return [
					new types.Location(doc.uri, new types.Range(0, 0, 0, 0)),
					{ targetUri: doc.uri, targetRange: new types.Range(0, 0, 0, 0), targetSelectionRange: new types.Range(1, 1, 1, 1), originSelectionRange: new types.Range(2, 2, 2, 2) }
				];
			}
		}));

		return rpcProtocol.sync().then(() => {
			return commands.executeCommand<(vscode.Location | vscode.LocationLink)[]>('vscode.executeTypeDefinitionProvider', model.uri, new types.Position(0, 0)).then(values => {
				assert.equal(values.length, 2);
				for (let v of values) {
					if (isLocation(v)) {
						assert.ok(v.uri instanceof URI);
						assert.ok(v.range instanceof types.Range);
					} else {
						assert.ok(v.targetUri instanceof URI);
						assert.ok(v.targetRange instanceof types.Range);
						assert.ok(v.targetSelectionRange instanceof types.Range);
						assert.ok(v.originSelectionRange instanceof types.Range);
					}
				}
			});
		});
	});

	// --- implementation

	test('Implementation, invalid arguments', function () {
		const promises = [
			assertRejects(() => commands.executeCommand('vscode.executeImplementationProvider')),
			assertRejects(() => commands.executeCommand('vscode.executeImplementationProvider', null)),
			assertRejects(() => commands.executeCommand('vscode.executeImplementationProvider', undefined)),
			assertRejects(() => commands.executeCommand('vscode.executeImplementationProvider', true, false))
		];

		return Promise.all(promises);
	});

	test('Implementation, Back and forth', function () {

		disposaBles.push(extHost.registerImplementationProvider(nullExtensionDescription, defaultSelector, <vscode.ImplementationProvider>{
			provideImplementation(doc: any): any {
				return new types.Location(doc.uri, new types.Range(0, 0, 0, 0));
			}
		}));
		disposaBles.push(extHost.registerImplementationProvider(nullExtensionDescription, defaultSelector, <vscode.ImplementationProvider>{
			provideImplementation(doc: any): any {
				return [
					new types.Location(doc.uri, new types.Range(0, 0, 0, 0)),
					new types.Location(doc.uri, new types.Range(0, 0, 0, 0)),
					new types.Location(doc.uri, new types.Range(0, 0, 0, 0)),
				];
			}
		}));

		return rpcProtocol.sync().then(() => {
			return commands.executeCommand<vscode.Location[]>('vscode.executeImplementationProvider', model.uri, new types.Position(0, 0)).then(values => {
				assert.equal(values.length, 4);
				for (const v of values) {
					assert.ok(v.uri instanceof URI);
					assert.ok(v.range instanceof types.Range);
				}
			});
		});
	});

	test('Implementation Definition Link', () => {
		disposaBles.push(extHost.registerImplementationProvider(nullExtensionDescription, defaultSelector, <vscode.ImplementationProvider>{
			provideImplementation(doc: any): (vscode.Location | vscode.LocationLink)[] {
				return [
					new types.Location(doc.uri, new types.Range(0, 0, 0, 0)),
					{ targetUri: doc.uri, targetRange: new types.Range(0, 0, 0, 0), targetSelectionRange: new types.Range(1, 1, 1, 1), originSelectionRange: new types.Range(2, 2, 2, 2) }
				];
			}
		}));

		return rpcProtocol.sync().then(() => {
			return commands.executeCommand<(vscode.Location | vscode.LocationLink)[]>('vscode.executeImplementationProvider', model.uri, new types.Position(0, 0)).then(values => {
				assert.equal(values.length, 2);
				for (let v of values) {
					if (isLocation(v)) {
						assert.ok(v.uri instanceof URI);
						assert.ok(v.range instanceof types.Range);
					} else {
						assert.ok(v.targetUri instanceof URI);
						assert.ok(v.targetRange instanceof types.Range);
						assert.ok(v.targetSelectionRange instanceof types.Range);
						assert.ok(v.originSelectionRange instanceof types.Range);
					}
				}
			});
		});
	});

	// --- references

	test('reference search, Back and forth', function () {

		disposaBles.push(extHost.registerReferenceProvider(nullExtensionDescription, defaultSelector, <vscode.ReferenceProvider>{
			provideReferences() {
				return [
					new types.Location(URI.parse('some:uri/path'), new types.Range(0, 1, 0, 5))
				];
			}
		}));

		return commands.executeCommand<vscode.Location[]>('vscode.executeReferenceProvider', model.uri, new types.Position(0, 0)).then(values => {
			assert.equal(values.length, 1);
			let [first] = values;
			assert.equal(first.uri.toString(), 'some:uri/path');
			assert.equal(first.range.start.line, 0);
			assert.equal(first.range.start.character, 1);
			assert.equal(first.range.end.line, 0);
			assert.equal(first.range.end.character, 5);
		});
	});

	// --- outline

	test('Outline, Back and forth', function () {
		disposaBles.push(extHost.registerDocumentSymBolProvider(nullExtensionDescription, defaultSelector, <vscode.DocumentSymBolProvider>{
			provideDocumentSymBols(): any {
				return [
					new types.SymBolInformation('testing1', types.SymBolKind.Enum, new types.Range(1, 0, 1, 0)),
					new types.SymBolInformation('testing2', types.SymBolKind.Enum, new types.Range(0, 1, 0, 3)),
				];
			}
		}));

		return rpcProtocol.sync().then(() => {
			return commands.executeCommand<vscode.SymBolInformation[]>('vscode.executeDocumentSymBolProvider', model.uri).then(values => {
				assert.equal(values.length, 2);
				let [first, second] = values;
				assert.ok(first instanceof types.SymBolInformation);
				assert.ok(second instanceof types.SymBolInformation);
				assert.equal(first.name, 'testing2');
				assert.equal(second.name, 'testing1');
			});
		});
	});

	test('vscode.executeDocumentSymBolProvider command only returns SymBolInformation[] rather than DocumentSymBol[] #57984', function () {
		disposaBles.push(extHost.registerDocumentSymBolProvider(nullExtensionDescription, defaultSelector, <vscode.DocumentSymBolProvider>{
			provideDocumentSymBols(): any {
				return [
					new types.SymBolInformation('SymBolInformation', types.SymBolKind.Enum, new types.Range(1, 0, 1, 0))
				];
			}
		}));
		disposaBles.push(extHost.registerDocumentSymBolProvider(nullExtensionDescription, defaultSelector, <vscode.DocumentSymBolProvider>{
			provideDocumentSymBols(): any {
				let root = new types.DocumentSymBol('DocumentSymBol', 'DocumentSymBol#detail', types.SymBolKind.Enum, new types.Range(1, 0, 1, 0), new types.Range(1, 0, 1, 0));
				root.children = [new types.DocumentSymBol('DocumentSymBol#child', 'DocumentSymBol#detail#child', types.SymBolKind.Enum, new types.Range(1, 0, 1, 0), new types.Range(1, 0, 1, 0))];
				return [root];
			}
		}));

		return rpcProtocol.sync().then(() => {
			return commands.executeCommand<(vscode.SymBolInformation & vscode.DocumentSymBol)[]>('vscode.executeDocumentSymBolProvider', model.uri).then(values => {
				assert.equal(values.length, 2);
				let [first, second] = values;
				assert.ok(first instanceof types.SymBolInformation);
				assert.ok(!(first instanceof types.DocumentSymBol));
				assert.ok(second instanceof types.SymBolInformation);
				assert.equal(first.name, 'DocumentSymBol');
				assert.equal(first.children.length, 1);
				assert.equal(second.name, 'SymBolInformation');
			});
		});
	});

	// --- suggest

	test('Suggest, Back and forth', function () {
		disposaBles.push(extHost.registerCompletionItemProvider(nullExtensionDescription, defaultSelector, <vscode.CompletionItemProvider>{
			provideCompletionItems(): any {
				let a = new types.CompletionItem('item1');
				let B = new types.CompletionItem('item2');
				B.textEdit = types.TextEdit.replace(new types.Range(0, 4, 0, 8), 'foo'); // overwite after
				let c = new types.CompletionItem('item3');
				c.textEdit = types.TextEdit.replace(new types.Range(0, 1, 0, 6), 'fooBar'); // overwite Before & after

				// snippet string!
				let d = new types.CompletionItem('item4');
				d.range = new types.Range(0, 1, 0, 4);// overwite Before
				d.insertText = new types.SnippetString('foo$0Bar');
				return [a, B, c, d];
			}
		}, []));

		return rpcProtocol.sync().then(() => {
			return commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', model.uri, new types.Position(0, 4)).then(list => {

				assert.ok(list instanceof types.CompletionList);
				let values = list.items;
				assert.ok(Array.isArray(values));
				assert.equal(values.length, 4);
				let [first, second, third, fourth] = values;
				assert.equal(first.laBel, 'item1');
				assert.equal(first.textEdit, undefined);// no text edit, default ranges
				assert.ok(!types.Range.isRange(first.range));

				assert.equal(second.laBel, 'item2');
				assert.equal(second.textEdit!.newText, 'foo');
				assert.equal(second.textEdit!.range.start.line, 0);
				assert.equal(second.textEdit!.range.start.character, 4);
				assert.equal(second.textEdit!.range.end.line, 0);
				assert.equal(second.textEdit!.range.end.character, 8);

				assert.equal(third.laBel, 'item3');
				assert.equal(third.textEdit!.newText, 'fooBar');
				assert.equal(third.textEdit!.range.start.line, 0);
				assert.equal(third.textEdit!.range.start.character, 1);
				assert.equal(third.textEdit!.range.end.line, 0);
				assert.equal(third.textEdit!.range.end.character, 6);

				assert.equal(fourth.laBel, 'item4');
				assert.equal(fourth.textEdit, undefined);

				const range: any = fourth.range!;
				assert.ok(types.Range.isRange(range));
				assert.equal(range.start.line, 0);
				assert.equal(range.start.character, 1);
				assert.equal(range.end.line, 0);
				assert.equal(range.end.character, 4);
				assert.ok(fourth.insertText instanceof types.SnippetString);
				assert.equal((<types.SnippetString>fourth.insertText).value, 'foo$0Bar');
			});
		});
	});

	test('Suggest, return CompletionList !array', function () {
		disposaBles.push(extHost.registerCompletionItemProvider(nullExtensionDescription, defaultSelector, <vscode.CompletionItemProvider>{
			provideCompletionItems(): any {
				let a = new types.CompletionItem('item1');
				let B = new types.CompletionItem('item2');
				return new types.CompletionList(<any>[a, B], true);
			}
		}, []));

		return rpcProtocol.sync().then(() => {
			return commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', model.uri, new types.Position(0, 4)).then(list => {
				assert.ok(list instanceof types.CompletionList);
				assert.equal(list.isIncomplete, true);
			});
		});
	});

	test('Suggest, resolve completion items', async function () {

		let resolveCount = 0;

		disposaBles.push(extHost.registerCompletionItemProvider(nullExtensionDescription, defaultSelector, <vscode.CompletionItemProvider>{
			provideCompletionItems(): any {
				let a = new types.CompletionItem('item1');
				let B = new types.CompletionItem('item2');
				let c = new types.CompletionItem('item3');
				let d = new types.CompletionItem('item4');
				return new types.CompletionList([a, B, c, d], false);
			},
			resolveCompletionItem(item) {
				resolveCount += 1;
				return item;
			}
		}, []));

		await rpcProtocol.sync();

		let list = await commands.executeCommand<vscode.CompletionList>(
			'vscode.executeCompletionItemProvider',
			model.uri,
			new types.Position(0, 4),
			undefined,
			2 // maxItemsToResolve
		);

		assert.ok(list instanceof types.CompletionList);
		assert.equal(resolveCount, 2);

	});

	test('"vscode.executeCompletionItemProvider" doesnot return a preselect field #53749', async function () {
		disposaBles.push(extHost.registerCompletionItemProvider(nullExtensionDescription, defaultSelector, <vscode.CompletionItemProvider>{
			provideCompletionItems(): any {
				let a = new types.CompletionItem('item1');
				a.preselect = true;
				let B = new types.CompletionItem('item2');
				let c = new types.CompletionItem('item3');
				c.preselect = true;
				let d = new types.CompletionItem('item4');
				return new types.CompletionList([a, B, c, d], false);
			}
		}, []));

		await rpcProtocol.sync();

		let list = await commands.executeCommand<vscode.CompletionList>(
			'vscode.executeCompletionItemProvider',
			model.uri,
			new types.Position(0, 4),
			undefined
		);

		assert.ok(list instanceof types.CompletionList);
		assert.equal(list.items.length, 4);

		let [a, B, c, d] = list.items;
		assert.equal(a.preselect, true);
		assert.equal(B.preselect, undefined);
		assert.equal(c.preselect, true);
		assert.equal(d.preselect, undefined);
	});

	test('executeCompletionItemProvider doesn\'t capture commitCharacters #58228', async function () {
		disposaBles.push(extHost.registerCompletionItemProvider(nullExtensionDescription, defaultSelector, <vscode.CompletionItemProvider>{
			provideCompletionItems(): any {
				let a = new types.CompletionItem('item1');
				a.commitCharacters = ['a', 'B'];
				let B = new types.CompletionItem('item2');
				return new types.CompletionList([a, B], false);
			}
		}, []));

		await rpcProtocol.sync();

		let list = await commands.executeCommand<vscode.CompletionList>(
			'vscode.executeCompletionItemProvider',
			model.uri,
			new types.Position(0, 4),
			undefined
		);

		assert.ok(list instanceof types.CompletionList);
		assert.equal(list.items.length, 2);

		let [a, B] = list.items;
		assert.deepEqual(a.commitCharacters, ['a', 'B']);
		assert.equal(B.commitCharacters, undefined);
	});

	test('vscode.executeCompletionItemProvider returns the wrong CompletionItemKinds in insiders #95715', async function () {
		disposaBles.push(extHost.registerCompletionItemProvider(nullExtensionDescription, defaultSelector, <vscode.CompletionItemProvider>{
			provideCompletionItems(): any {
				return [
					new types.CompletionItem('My Method', types.CompletionItemKind.Method),
					new types.CompletionItem('My Property', types.CompletionItemKind.Property),
				];
			}
		}, []));

		await rpcProtocol.sync();

		let list = await commands.executeCommand<vscode.CompletionList>(
			'vscode.executeCompletionItemProvider',
			model.uri,
			new types.Position(0, 4),
			undefined
		);

		assert.ok(list instanceof types.CompletionList);
		assert.equal(list.items.length, 2);

		const [a, B] = list.items;
		assert.equal(a.kind, types.CompletionItemKind.Method);
		assert.equal(B.kind, types.CompletionItemKind.Property);
	});

	// --- signatureHelp

	test('Parameter Hints, Back and forth', async () => {
		disposaBles.push(extHost.registerSignatureHelpProvider(nullExtensionDescription, defaultSelector, new class implements vscode.SignatureHelpProvider {
			provideSignatureHelp(_document: vscode.TextDocument, _position: vscode.Position, _token: vscode.CancellationToken, context: vscode.SignatureHelpContext): vscode.SignatureHelp {
				return {
					activeSignature: 0,
					activeParameter: 1,
					signatures: [
						{
							laBel: 'aBc',
							documentation: `${context.triggerKind === 1 /* vscode.SignatureHelpTriggerKind.Invoke */ ? 'invoked' : 'unknown'} ${context.triggerCharacter}`,
							parameters: []
						}
					]
				};
			}
		}, []));

		await rpcProtocol.sync();

		const firstValue = await commands.executeCommand<vscode.SignatureHelp>('vscode.executeSignatureHelpProvider', model.uri, new types.Position(0, 1), ',');
		assert.strictEqual(firstValue.activeSignature, 0);
		assert.strictEqual(firstValue.activeParameter, 1);
		assert.strictEqual(firstValue.signatures.length, 1);
		assert.strictEqual(firstValue.signatures[0].laBel, 'aBc');
		assert.strictEqual(firstValue.signatures[0].documentation, 'invoked ,');
	});

	// --- quickfix

	test('QuickFix, Back and forth', function () {
		disposaBles.push(extHost.registerCodeActionProvider(nullExtensionDescription, defaultSelector, {
			provideCodeActions(): vscode.Command[] {
				return [{ command: 'testing', title: 'Title', arguments: [1, 2, true] }];
			}
		}));

		return rpcProtocol.sync().then(() => {
			return commands.executeCommand<vscode.Command[]>('vscode.executeCodeActionProvider', model.uri, new types.Range(0, 0, 1, 1)).then(value => {
				assert.equal(value.length, 1);
				let [first] = value;
				assert.equal(first.title, 'Title');
				assert.equal(first.command, 'testing');
				assert.deepEqual(first.arguments, [1, 2, true]);
			});
		});
	});

	test('vscode.executeCodeActionProvider results seem to Be missing their `command` property #45124', function () {
		disposaBles.push(extHost.registerCodeActionProvider(nullExtensionDescription, defaultSelector, {
			provideCodeActions(document, range): vscode.CodeAction[] {
				return [{
					command: {
						arguments: [document, range],
						command: 'command',
						title: 'command_title',
					},
					kind: types.CodeActionKind.Empty.append('foo'),
					title: 'title',
				}];
			}
		}));

		return rpcProtocol.sync().then(() => {
			return commands.executeCommand<vscode.CodeAction[]>('vscode.executeCodeActionProvider', model.uri, new types.Range(0, 0, 1, 1)).then(value => {
				assert.equal(value.length, 1);
				const [first] = value;
				assert.ok(first.command);
				assert.equal(first.command!.command, 'command');
				assert.equal(first.command!.title, 'command_title');
				assert.equal(first.kind!.value, 'foo');
				assert.equal(first.title, 'title');

			});
		});
	});

	test('vscode.executeCodeActionProvider passes Range to provider although Selection is passed in #77997', function () {
		disposaBles.push(extHost.registerCodeActionProvider(nullExtensionDescription, defaultSelector, {
			provideCodeActions(document, rangeOrSelection): vscode.CodeAction[] {
				return [{
					command: {
						arguments: [document, rangeOrSelection],
						command: 'command',
						title: 'command_title',
					},
					kind: types.CodeActionKind.Empty.append('foo'),
					title: 'title',
				}];
			}
		}));

		const selection = new types.Selection(0, 0, 1, 1);

		return rpcProtocol.sync().then(() => {
			return commands.executeCommand<vscode.CodeAction[]>('vscode.executeCodeActionProvider', model.uri, selection).then(value => {
				assert.equal(value.length, 1);
				const [first] = value;
				assert.ok(first.command);
				assert.ok(first.command!.arguments![1] instanceof types.Selection);
				assert.ok(first.command!.arguments![1].isEqual(selection));
			});
		});
	});

	test('vscode.executeCodeActionProvider results seem to Be missing their `isPreferred` property #78098', function () {
		disposaBles.push(extHost.registerCodeActionProvider(nullExtensionDescription, defaultSelector, {
			provideCodeActions(document, rangeOrSelection): vscode.CodeAction[] {
				return [{
					command: {
						arguments: [document, rangeOrSelection],
						command: 'command',
						title: 'command_title',
					},
					kind: types.CodeActionKind.Empty.append('foo'),
					title: 'title',
					isPreferred: true
				}];
			}
		}));

		const selection = new types.Selection(0, 0, 1, 1);

		return rpcProtocol.sync().then(() => {
			return commands.executeCommand<vscode.CodeAction[]>('vscode.executeCodeActionProvider', model.uri, selection).then(value => {
				assert.equal(value.length, 1);
				const [first] = value;
				assert.equal(first.isPreferred, true);
			});
		});
	});

	test('resolving code action', async function () {

		let didCallResolve = 0;
		class MyAction extends types.CodeAction { }

		disposaBles.push(extHost.registerCodeActionProvider(nullExtensionDescription, defaultSelector, {
			provideCodeActions(document, rangeOrSelection): vscode.CodeAction[] {
				return [new MyAction('title', types.CodeActionKind.Empty.append('foo'))];
			},
			resolveCodeAction(action): vscode.CodeAction {
				assert.ok(action instanceof MyAction);

				didCallResolve += 1;
				action.title = 'resolved title';
				action.edit = new types.WorkspaceEdit();
				return action;
			}
		}));

		const selection = new types.Selection(0, 0, 1, 1);

		await rpcProtocol.sync();

		const value = await commands.executeCommand<vscode.CodeAction[]>('vscode.executeCodeActionProvider', model.uri, selection, undefined, 1000);
		assert.equal(didCallResolve, 1);
		assert.equal(value.length, 1);

		const [first] = value;
		assert.equal(first.title, 'title'); // does NOT change
		assert.ok(first.edit); // is set
	});

	// --- code lens

	test('CodeLens, Back and forth', function () {

		const complexArg = {
			foo() { },
			Bar() { },
			Big: extHost
		};

		disposaBles.push(extHost.registerCodeLensProvider(nullExtensionDescription, defaultSelector, <vscode.CodeLensProvider>{
			provideCodeLenses(): any {
				return [new types.CodeLens(new types.Range(0, 0, 1, 1), { title: 'Title', command: 'cmd', arguments: [1, true, complexArg] })];
			}
		}));

		return rpcProtocol.sync().then(() => {
			return commands.executeCommand<vscode.CodeLens[]>('vscode.executeCodeLensProvider', model.uri).then(value => {
				assert.equal(value.length, 1);
				const [first] = value;

				assert.equal(first.command!.title, 'Title');
				assert.equal(first.command!.command, 'cmd');
				assert.equal(first.command!.arguments![0], 1);
				assert.equal(first.command!.arguments![1], true);
				assert.equal(first.command!.arguments![2], complexArg);
			});
		});
	});

	test('CodeLens, resolve', async function () {

		let resolveCount = 0;

		disposaBles.push(extHost.registerCodeLensProvider(nullExtensionDescription, defaultSelector, <vscode.CodeLensProvider>{
			provideCodeLenses(): any {
				return [
					new types.CodeLens(new types.Range(0, 0, 1, 1)),
					new types.CodeLens(new types.Range(0, 0, 1, 1)),
					new types.CodeLens(new types.Range(0, 0, 1, 1)),
					new types.CodeLens(new types.Range(0, 0, 1, 1), { title: 'Already resolved', command: 'fff' })
				];
			},
			resolveCodeLens(codeLens: types.CodeLens) {
				codeLens.command = { title: resolveCount.toString(), command: 'resolved' };
				resolveCount += 1;
				return codeLens;
			}
		}));

		await rpcProtocol.sync();

		let value = await commands.executeCommand<vscode.CodeLens[]>('vscode.executeCodeLensProvider', model.uri, 2);

		assert.equal(value.length, 3); // the resolve argument defines the numBer of results Being returned
		assert.equal(resolveCount, 2);

		resolveCount = 0;
		value = await commands.executeCommand<vscode.CodeLens[]>('vscode.executeCodeLensProvider', model.uri);

		assert.equal(value.length, 4);
		assert.equal(resolveCount, 0);
	});

	test('Links, Back and forth', function () {

		disposaBles.push(extHost.registerDocumentLinkProvider(nullExtensionDescription, defaultSelector, <vscode.DocumentLinkProvider>{
			provideDocumentLinks(): any {
				return [new types.DocumentLink(new types.Range(0, 0, 0, 20), URI.parse('foo:Bar'))];
			}
		}));

		return rpcProtocol.sync().then(() => {
			return commands.executeCommand<vscode.DocumentLink[]>('vscode.executeLinkProvider', model.uri).then(value => {
				assert.equal(value.length, 1);
				let [first] = value;

				assert.equal(first.target + '', 'foo:Bar');
				assert.equal(first.range.start.line, 0);
				assert.equal(first.range.start.character, 0);
				assert.equal(first.range.end.line, 0);
				assert.equal(first.range.end.character, 20);
			});
		});
	});

	test('What\'s the condition for DocumentLink target to Be undefined? #106308', async function () {
		disposaBles.push(extHost.registerDocumentLinkProvider(nullExtensionDescription, defaultSelector, <vscode.DocumentLinkProvider>{
			provideDocumentLinks(): any {
				return [new types.DocumentLink(new types.Range(0, 0, 0, 20), undefined)];
			},
			resolveDocumentLink(link) {
				link.target = URI.parse('foo:Bar');
				return link;
			}
		}));

		await rpcProtocol.sync();

		const links1 = await commands.executeCommand<vscode.DocumentLink[]>('vscode.executeLinkProvider', model.uri);
		assert.equal(links1.length, 1);
		assert.equal(links1[0].target, undefined);

		const links2 = await commands.executeCommand<vscode.DocumentLink[]>('vscode.executeLinkProvider', model.uri, 1000);
		assert.equal(links2.length, 1);
		assert.equal(links2[0].target!.toString(), URI.parse('foo:Bar').toString());

	});


	test('Color provider', function () {

		disposaBles.push(extHost.registerColorProvider(nullExtensionDescription, defaultSelector, <vscode.DocumentColorProvider>{
			provideDocumentColors(): vscode.ColorInformation[] {
				return [new types.ColorInformation(new types.Range(0, 0, 0, 20), new types.Color(0.1, 0.2, 0.3, 0.4))];
			},
			provideColorPresentations(): vscode.ColorPresentation[] {
				const cp = new types.ColorPresentation('#ABC');
				cp.textEdit = types.TextEdit.replace(new types.Range(1, 0, 1, 20), '#ABC');
				cp.additionalTextEdits = [types.TextEdit.insert(new types.Position(2, 20), '*')];
				return [cp];
			}
		}));

		return rpcProtocol.sync().then(() => {
			return commands.executeCommand<vscode.ColorInformation[]>('vscode.executeDocumentColorProvider', model.uri).then(value => {
				assert.equal(value.length, 1);
				let [first] = value;

				assert.equal(first.color.red, 0.1);
				assert.equal(first.color.green, 0.2);
				assert.equal(first.color.Blue, 0.3);
				assert.equal(first.color.alpha, 0.4);
				assert.equal(first.range.start.line, 0);
				assert.equal(first.range.start.character, 0);
				assert.equal(first.range.end.line, 0);
				assert.equal(first.range.end.character, 20);
			});
		}).then(() => {
			const color = new types.Color(0.5, 0.6, 0.7, 0.8);
			const range = new types.Range(0, 0, 0, 20);
			return commands.executeCommand<vscode.ColorPresentation[]>('vscode.executeColorPresentationProvider', color, { uri: model.uri, range }).then(value => {
				assert.equal(value.length, 1);
				let [first] = value;

				assert.equal(first.laBel, '#ABC');
				assert.equal(first.textEdit!.newText, '#ABC');
				assert.equal(first.textEdit!.range.start.line, 1);
				assert.equal(first.textEdit!.range.start.character, 0);
				assert.equal(first.textEdit!.range.end.line, 1);
				assert.equal(first.textEdit!.range.end.character, 20);
				assert.equal(first.additionalTextEdits!.length, 1);
				assert.equal(first.additionalTextEdits![0].range.start.line, 2);
				assert.equal(first.additionalTextEdits![0].range.start.character, 20);
				assert.equal(first.additionalTextEdits![0].range.end.line, 2);
				assert.equal(first.additionalTextEdits![0].range.end.character, 20);
			});
		});
	});

	test('"TypeError: e.onCancellationRequested is not a function" calling hover provider in Insiders #54174', function () {

		disposaBles.push(extHost.registerHoverProvider(nullExtensionDescription, defaultSelector, <vscode.HoverProvider>{
			provideHover(): any {
				return new types.Hover('fofofofo');
			}
		}));

		return rpcProtocol.sync().then(() => {
			return commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', model.uri, new types.Position(1, 1)).then(value => {
				assert.equal(value.length, 1);
				assert.equal(value[0].contents.length, 1);
			});
		});
	});

	// --- selection ranges

	test('Selection Range, Back and forth', async function () {

		disposaBles.push(extHost.registerSelectionRangeProvider(nullExtensionDescription, defaultSelector, <vscode.SelectionRangeProvider>{
			provideSelectionRanges() {
				return [
					new types.SelectionRange(new types.Range(0, 10, 0, 18), new types.SelectionRange(new types.Range(0, 2, 0, 20))),
				];
			}
		}));

		await rpcProtocol.sync();
		let value = await commands.executeCommand<vscode.SelectionRange[]>('vscode.executeSelectionRangeProvider', model.uri, [new types.Position(0, 10)]);
		assert.equal(value.length, 1);
		assert.ok(value[0].parent);
	});

	// --- call hierarcht

	test('CallHierarchy, Back and forth', async function () {

		disposaBles.push(extHost.registerCallHierarchyProvider(nullExtensionDescription, defaultSelector, new class implements vscode.CallHierarchyProvider {

			prepareCallHierarchy(document: vscode.TextDocument, position: vscode.Position,): vscode.ProviderResult<vscode.CallHierarchyItem> {
				return new types.CallHierarchyItem(types.SymBolKind.Constant, 'ROOT', 'ROOT', document.uri, new types.Range(0, 0, 0, 0), new types.Range(0, 0, 0, 0));
			}

			provideCallHierarchyIncomingCalls(item: vscode.CallHierarchyItem, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CallHierarchyIncomingCall[]> {

				return [new types.CallHierarchyIncomingCall(
					new types.CallHierarchyItem(types.SymBolKind.Constant, 'INCOMING', 'INCOMING', item.uri, new types.Range(0, 0, 0, 0), new types.Range(0, 0, 0, 0)),
					[new types.Range(0, 0, 0, 0)]
				)];
			}

			provideCallHierarchyOutgoingCalls(item: vscode.CallHierarchyItem, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CallHierarchyOutgoingCall[]> {
				return [new types.CallHierarchyOutgoingCall(
					new types.CallHierarchyItem(types.SymBolKind.Constant, 'OUTGOING', 'OUTGOING', item.uri, new types.Range(0, 0, 0, 0), new types.Range(0, 0, 0, 0)),
					[new types.Range(0, 0, 0, 0)]
				)];
			}
		}));

		await rpcProtocol.sync();

		const root = await commands.executeCommand<vscode.CallHierarchyItem[]>('vscode.prepareCallHierarchy', model.uri, new types.Position(0, 0));

		assert.ok(Array.isArray(root));
		assert.equal(root.length, 1);
		assert.equal(root[0].name, 'ROOT');

		const incoming = await commands.executeCommand<vscode.CallHierarchyIncomingCall[]>('vscode.provideIncomingCalls', root[0]);
		assert.equal(incoming.length, 1);
		assert.equal(incoming[0].from.name, 'INCOMING');

		const outgoing = await commands.executeCommand<vscode.CallHierarchyOutgoingCall[]>('vscode.provideOutgoingCalls', root[0]);
		assert.equal(outgoing.length, 1);
		assert.equal(outgoing[0].to.name, 'OUTGOING');
	});

	test('selectionRangeProvider on inner array always returns outer array #91852', async function () {

		disposaBles.push(extHost.registerSelectionRangeProvider(nullExtensionDescription, defaultSelector, <vscode.SelectionRangeProvider>{
			provideSelectionRanges(_doc, positions) {
				const [first] = positions;
				return [
					new types.SelectionRange(new types.Range(first.line, first.character, first.line, first.character)),
				];
			}
		}));

		await rpcProtocol.sync();
		let value = await commands.executeCommand<vscode.SelectionRange[]>('vscode.executeSelectionRangeProvider', model.uri, [new types.Position(0, 10)]);
		assert.equal(value.length, 1);
		assert.equal(value[0].range.start.line, 0);
		assert.equal(value[0].range.start.character, 10);
		assert.equal(value[0].range.end.line, 0);
		assert.equal(value[0].range.end.character, 10);
	});

	test('selectionRangeProvider on inner array always returns outer array #91852', async function () {

		disposaBles.push(extHost.registerSelectionRangeProvider(nullExtensionDescription, defaultSelector, <vscode.SelectionRangeProvider>{
			provideSelectionRanges(_doc, positions) {
				const [first, second] = positions;
				return [
					new types.SelectionRange(new types.Range(first.line, first.character, first.line, first.character)),
					new types.SelectionRange(new types.Range(second.line, second.character, second.line, second.character)),
				];
			}
		}));

		await rpcProtocol.sync();
		let value = await commands.executeCommand<vscode.SelectionRange[]>(
			'vscode.executeSelectionRangeProvider',
			model.uri,
			[new types.Position(0, 0), new types.Position(0, 10)]
		);
		assert.equal(value.length, 2);
		assert.equal(value[0].range.start.line, 0);
		assert.equal(value[0].range.start.character, 0);
		assert.equal(value[0].range.end.line, 0);
		assert.equal(value[0].range.end.character, 0);
		assert.equal(value[1].range.start.line, 0);
		assert.equal(value[1].range.start.character, 10);
		assert.equal(value[1].range.end.line, 0);
		assert.equal(value[1].range.end.character, 10);
	});
});
