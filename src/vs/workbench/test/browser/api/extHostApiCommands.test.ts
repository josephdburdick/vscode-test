/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { setUnexpectedErrorHAndler, errorHAndler } from 'vs/bAse/common/errors';
import { URI } from 'vs/bAse/common/uri';
import * As types from 'vs/workbench/Api/common/extHostTypes';
import { creAteTextModel } from 'vs/editor/test/common/editorTestUtils';
import { TestRPCProtocol } from './testRPCProtocol';
import { MArkerService } from 'vs/plAtform/mArkers/common/mArkerService';
import { IMArkerService } from 'vs/plAtform/mArkers/common/mArkers';
import { ICommAndService, CommAndsRegistry } from 'vs/plAtform/commAnds/common/commAnds';
import { IModelService } from 'vs/editor/common/services/modelService';
import { ExtHostLAnguAgeFeAtures } from 'vs/workbench/Api/common/extHostLAnguAgeFeAtures';
import { MAinThreAdLAnguAgeFeAtures } from 'vs/workbench/Api/browser/mAinThreAdLAnguAgeFeAtures';
import { ExtHostApiCommAnds } from 'vs/workbench/Api/common/extHostApiCommAnds';
import { ExtHostCommAnds } from 'vs/workbench/Api/common/extHostCommAnds';
import { MAinThreAdCommAnds } from 'vs/workbench/Api/browser/mAinThreAdCommAnds';
import { ExtHostDocuments } from 'vs/workbench/Api/common/extHostDocuments';
import { ExtHostDocumentsAndEditors } from 'vs/workbench/Api/common/extHostDocumentsAndEditors';
import { MAinContext, ExtHostContext } from 'vs/workbench/Api/common/extHost.protocol';
import { ExtHostDiAgnostics } from 'vs/workbench/Api/common/extHostDiAgnostics';
import type * As vscode from 'vscode';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import 'vs/workbench/contrib/seArch/browser/seArch.contribution';
import { NullLogService } from 'vs/plAtform/log/common/log';
import { ITextModel } from 'vs/editor/common/model';
import { nullExtensionDescription, IExtensionService } from 'vs/workbench/services/extensions/common/extensions';
import { dispose } from 'vs/bAse/common/lifecycle';
import { IEditorWorkerService } from 'vs/editor/common/services/editorWorkerService';
import { mock } from 'vs/bAse/test/common/mock';
import { NullApiDeprecAtionService } from 'vs/workbench/Api/common/extHostApiDeprecAtionService';
import { ServiceCollection } from 'vs/plAtform/instAntiAtion/common/serviceCollection';
import { SyncDescriptor } from 'vs/plAtform/instAntiAtion/common/descriptors';
import { InstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtionService';

import 'vs/editor/contrib/codeAction/codeAction';
import 'vs/editor/contrib/codelens/codelens';
import 'vs/editor/contrib/colorPicker/color';
import 'vs/editor/contrib/formAt/formAt';
import 'vs/editor/contrib/gotoSymbol/goToCommAnds';
import 'vs/editor/contrib/gotoSymbol/documentSymbols';
import 'vs/editor/contrib/hover/getHover';
import 'vs/editor/contrib/links/getLinks';
import 'vs/editor/contrib/pArAmeterHints/provideSignAtureHelp';
import 'vs/editor/contrib/smArtSelect/smArtSelect';
import 'vs/editor/contrib/suggest/suggest';
import 'vs/editor/contrib/renAme/renAme';

const defAultSelector = { scheme: 'fAr' };
const model: ITextModel = creAteTextModel(
	[
		'This is the first line',
		'This is the second line',
		'This is the third line',
	].join('\n'),
	undefined,
	undefined,
	URI.pArse('fAr://testing/file.b'));

let rpcProtocol: TestRPCProtocol;
let extHost: ExtHostLAnguAgeFeAtures;
let mAinThreAd: MAinThreAdLAnguAgeFeAtures;
let commAnds: ExtHostCommAnds;
let disposAbles: vscode.DisposAble[] = [];
let originAlErrorHAndler: (e: Any) => Any;

function AssertRejects(fn: () => Promise<Any>, messAge: string = 'Expected rejection') {
	return fn().then(() => Assert.ok(fAlse, messAge), _err => Assert.ok(true));
}

function isLocAtion(vAlue: vscode.LocAtion | vscode.LocAtionLink): vAlue is vscode.LocAtion {
	const cAndidAte = vAlue As vscode.LocAtion;
	return cAndidAte && cAndidAte.uri instAnceof URI && cAndidAte.rAnge instAnceof types.RAnge;
}

suite('ExtHostLAnguAgeFeAtureCommAnds', function () {

	suiteSetup(() => {

		originAlErrorHAndler = errorHAndler.getUnexpectedErrorHAndler();
		setUnexpectedErrorHAndler(() => { });

		// Use IInstAntiAtionService to get typechecking when instAntiAting
		let instA: IInstAntiAtionService;
		rpcProtocol = new TestRPCProtocol();
		const services = new ServiceCollection();
		services.set(IExtensionService, new clAss extends mock<IExtensionService>() {
			Async ActivAteByEvent() {

			}

		});
		services.set(ICommAndService, new SyncDescriptor(clAss extends mock<ICommAndService>() {

			executeCommAnd(id: string, ...Args: Any): Any {
				const commAnd = CommAndsRegistry.getCommAnds().get(id);
				if (!commAnd) {
					return Promise.reject(new Error(id + ' NOT known'));
				}
				const { hAndler } = commAnd;
				return Promise.resolve(instA.invokeFunction(hAndler, ...Args));
			}
		}));
		services.set(IMArkerService, new MArkerService());
		services.set(IModelService, new clAss extends mock<IModelService>() {
			getModel() { return model; }
		});
		services.set(IEditorWorkerService, new clAss extends mock<IEditorWorkerService>() {
			Async computeMoreMinimAlEdits(_uri: Any, edits: Any) {
				return edits || undefined;
			}
		});

		instA = new InstAntiAtionService(services);

		const extHostDocumentsAndEditors = new ExtHostDocumentsAndEditors(rpcProtocol, new NullLogService());
		extHostDocumentsAndEditors.$AcceptDocumentsAndEditorsDeltA({
			AddedDocuments: [{
				isDirty: fAlse,
				versionId: model.getVersionId(),
				modeId: model.getLAnguAgeIdentifier().lAnguAge,
				uri: model.uri,
				lines: model.getVAlue().split(model.getEOL()),
				EOL: model.getEOL(),
			}]
		});
		const extHostDocuments = new ExtHostDocuments(rpcProtocol, extHostDocumentsAndEditors);
		rpcProtocol.set(ExtHostContext.ExtHostDocuments, extHostDocuments);

		commAnds = new ExtHostCommAnds(rpcProtocol, new NullLogService());
		rpcProtocol.set(ExtHostContext.ExtHostCommAnds, commAnds);
		rpcProtocol.set(MAinContext.MAinThreAdCommAnds, instA.creAteInstAnce(MAinThreAdCommAnds, rpcProtocol));
		ExtHostApiCommAnds.register(commAnds);

		const diAgnostics = new ExtHostDiAgnostics(rpcProtocol, new NullLogService());
		rpcProtocol.set(ExtHostContext.ExtHostDiAgnostics, diAgnostics);

		extHost = new ExtHostLAnguAgeFeAtures(rpcProtocol, null, extHostDocuments, commAnds, diAgnostics, new NullLogService(), NullApiDeprecAtionService);
		rpcProtocol.set(ExtHostContext.ExtHostLAnguAgeFeAtures, extHost);

		mAinThreAd = rpcProtocol.set(MAinContext.MAinThreAdLAnguAgeFeAtures, instA.creAteInstAnce(MAinThreAdLAnguAgeFeAtures, rpcProtocol));

		return rpcProtocol.sync();
	});

	suiteTeArdown(() => {
		setUnexpectedErrorHAndler(originAlErrorHAndler);
		model.dispose();
		mAinThreAd.dispose();
	});

	teArdown(() => {
		disposAbles = dispose(disposAbles);
		return rpcProtocol.sync();
	});

	// --- workspAce symbols

	test('WorkspAceSymbols, invAlid Arguments', function () {
		let promises = [
			AssertRejects(() => commAnds.executeCommAnd('vscode.executeWorkspAceSymbolProvider')),
			AssertRejects(() => commAnds.executeCommAnd('vscode.executeWorkspAceSymbolProvider', null)),
			AssertRejects(() => commAnds.executeCommAnd('vscode.executeWorkspAceSymbolProvider', undefined)),
			AssertRejects(() => commAnds.executeCommAnd('vscode.executeWorkspAceSymbolProvider', true))
		];
		return Promise.All(promises);
	});

	test('WorkspAceSymbols, bAck And forth', function () {

		disposAbles.push(extHost.registerWorkspAceSymbolProvider(nullExtensionDescription, <vscode.WorkspAceSymbolProvider>{
			provideWorkspAceSymbols(query): Any {
				return [
					new types.SymbolInformAtion(query, types.SymbolKind.ArrAy, new types.RAnge(0, 0, 1, 1), URI.pArse('fAr://testing/first')),
					new types.SymbolInformAtion(query, types.SymbolKind.ArrAy, new types.RAnge(0, 0, 1, 1), URI.pArse('fAr://testing/second'))
				];
			}
		}));

		disposAbles.push(extHost.registerWorkspAceSymbolProvider(nullExtensionDescription, <vscode.WorkspAceSymbolProvider>{
			provideWorkspAceSymbols(query): Any {
				return [
					new types.SymbolInformAtion(query, types.SymbolKind.ArrAy, new types.RAnge(0, 0, 1, 1), URI.pArse('fAr://testing/first'))
				];
			}
		}));

		return rpcProtocol.sync().then(() => {
			return commAnds.executeCommAnd<vscode.SymbolInformAtion[]>('vscode.executeWorkspAceSymbolProvider', 'testing').then(vAlue => {

				for (let info of vAlue) {
					Assert.ok(info instAnceof types.SymbolInformAtion);
					Assert.equAl(info.nAme, 'testing');
					Assert.equAl(info.kind, types.SymbolKind.ArrAy);
				}
				Assert.equAl(vAlue.length, 3);
			});
		});
	});

	test('executeWorkspAceSymbolProvider should Accept empty string, #39522', Async function () {

		disposAbles.push(extHost.registerWorkspAceSymbolProvider(nullExtensionDescription, {
			provideWorkspAceSymbols(): vscode.SymbolInformAtion[] {
				return [new types.SymbolInformAtion('hello', types.SymbolKind.ArrAy, new types.RAnge(0, 0, 0, 0), URI.pArse('foo:bAr')) As vscode.SymbolInformAtion];
			}
		}));

		AwAit rpcProtocol.sync();
		let symbols = AwAit commAnds.executeCommAnd<vscode.SymbolInformAtion[]>('vscode.executeWorkspAceSymbolProvider', '');
		Assert.equAl(symbols.length, 1);

		AwAit rpcProtocol.sync();
		symbols = AwAit commAnds.executeCommAnd<vscode.SymbolInformAtion[]>('vscode.executeWorkspAceSymbolProvider', '*');
		Assert.equAl(symbols.length, 1);
	});

	// --- formAtting
	test('executeFormAtDocumentProvider, bAck And forth', Async function () {

		disposAbles.push(extHost.registerDocumentFormAttingEditProvider(nullExtensionDescription, defAultSelector, new clAss implements vscode.DocumentFormAttingEditProvider {
			provideDocumentFormAttingEdits() {
				return [types.TextEdit.insert(new types.Position(0, 0), '42')];
			}
		}));

		AwAit rpcProtocol.sync();
		let edits = AwAit commAnds.executeCommAnd<vscode.SymbolInformAtion[]>('vscode.executeFormAtDocumentProvider', model.uri);
		Assert.equAl(edits.length, 1);
	});


	// --- renAme
	test('vscode.executeDocumentRenAmeProvider', Async function () {
		disposAbles.push(extHost.registerRenAmeProvider(nullExtensionDescription, defAultSelector, new clAss implements vscode.RenAmeProvider {
			provideRenAmeEdits(document: vscode.TextDocument, position: vscode.Position, newNAme: string) {
				const edit = new types.WorkspAceEdit();
				edit.insert(document.uri, <types.Position>position, newNAme);
				return edit;
			}
		}));

		AwAit rpcProtocol.sync();

		const edit = AwAit commAnds.executeCommAnd<vscode.WorkspAceEdit>('vscode.executeDocumentRenAmeProvider', model.uri, new types.Position(0, 12), 'newNAmeOfThis');

		Assert.ok(edit);
		Assert.equAl(edit.hAs(model.uri), true);
		const textEdits = edit.get(model.uri);
		Assert.equAl(textEdits.length, 1);
		Assert.equAl(textEdits[0].newText, 'newNAmeOfThis');
	});

	// --- definition

	test('Definition, invAlid Arguments', function () {
		let promises = [
			AssertRejects(() => commAnds.executeCommAnd('vscode.executeDefinitionProvider')),
			AssertRejects(() => commAnds.executeCommAnd('vscode.executeDefinitionProvider', null)),
			AssertRejects(() => commAnds.executeCommAnd('vscode.executeDefinitionProvider', undefined)),
			AssertRejects(() => commAnds.executeCommAnd('vscode.executeDefinitionProvider', true, fAlse))
		];

		return Promise.All(promises);
	});

	test('Definition, bAck And forth', function () {

		disposAbles.push(extHost.registerDefinitionProvider(nullExtensionDescription, defAultSelector, <vscode.DefinitionProvider>{
			provideDefinition(doc: Any): Any {
				return new types.LocAtion(doc.uri, new types.RAnge(0, 0, 0, 0));
			}
		}));
		disposAbles.push(extHost.registerDefinitionProvider(nullExtensionDescription, defAultSelector, <vscode.DefinitionProvider>{
			provideDefinition(doc: Any): Any {
				return [
					new types.LocAtion(doc.uri, new types.RAnge(0, 0, 0, 0)),
					new types.LocAtion(doc.uri, new types.RAnge(0, 0, 0, 0)),
					new types.LocAtion(doc.uri, new types.RAnge(0, 0, 0, 0)),
				];
			}
		}));

		return rpcProtocol.sync().then(() => {
			return commAnds.executeCommAnd<vscode.LocAtion[]>('vscode.executeDefinitionProvider', model.uri, new types.Position(0, 0)).then(vAlues => {
				Assert.equAl(vAlues.length, 4);
				for (let v of vAlues) {
					Assert.ok(v.uri instAnceof URI);
					Assert.ok(v.rAnge instAnceof types.RAnge);
				}
			});
		});
	});

	test('Definition Link', () => {
		disposAbles.push(extHost.registerDefinitionProvider(nullExtensionDescription, defAultSelector, <vscode.DefinitionProvider>{
			provideDefinition(doc: Any): (vscode.LocAtion | vscode.LocAtionLink)[] {
				return [
					new types.LocAtion(doc.uri, new types.RAnge(0, 0, 0, 0)),
					{ tArgetUri: doc.uri, tArgetRAnge: new types.RAnge(0, 0, 0, 0), tArgetSelectionRAnge: new types.RAnge(1, 1, 1, 1), originSelectionRAnge: new types.RAnge(2, 2, 2, 2) }
				];
			}
		}));

		return rpcProtocol.sync().then(() => {
			return commAnds.executeCommAnd<(vscode.LocAtion | vscode.LocAtionLink)[]>('vscode.executeDefinitionProvider', model.uri, new types.Position(0, 0)).then(vAlues => {
				Assert.equAl(vAlues.length, 2);
				for (let v of vAlues) {
					if (isLocAtion(v)) {
						Assert.ok(v.uri instAnceof URI);
						Assert.ok(v.rAnge instAnceof types.RAnge);
					} else {
						Assert.ok(v.tArgetUri instAnceof URI);
						Assert.ok(v.tArgetRAnge instAnceof types.RAnge);
						Assert.ok(v.tArgetSelectionRAnge instAnceof types.RAnge);
						Assert.ok(v.originSelectionRAnge instAnceof types.RAnge);
					}
				}
			});
		});
	});

	// --- declArAtion

	test('DeclArAtion, bAck And forth', function () {

		disposAbles.push(extHost.registerDeclArAtionProvider(nullExtensionDescription, defAultSelector, <vscode.DeclArAtionProvider>{
			provideDeclArAtion(doc: Any): Any {
				return new types.LocAtion(doc.uri, new types.RAnge(0, 0, 0, 0));
			}
		}));
		disposAbles.push(extHost.registerDeclArAtionProvider(nullExtensionDescription, defAultSelector, <vscode.DeclArAtionProvider>{
			provideDeclArAtion(doc: Any): Any {
				return [
					new types.LocAtion(doc.uri, new types.RAnge(0, 0, 0, 0)),
					new types.LocAtion(doc.uri, new types.RAnge(0, 0, 0, 0)),
					new types.LocAtion(doc.uri, new types.RAnge(0, 0, 0, 0)),
				];
			}
		}));

		return rpcProtocol.sync().then(() => {
			return commAnds.executeCommAnd<vscode.LocAtion[]>('vscode.executeDeclArAtionProvider', model.uri, new types.Position(0, 0)).then(vAlues => {
				Assert.equAl(vAlues.length, 4);
				for (let v of vAlues) {
					Assert.ok(v.uri instAnceof URI);
					Assert.ok(v.rAnge instAnceof types.RAnge);
				}
			});
		});
	});

	test('DeclArAtion Link', () => {
		disposAbles.push(extHost.registerDeclArAtionProvider(nullExtensionDescription, defAultSelector, <vscode.DeclArAtionProvider>{
			provideDeclArAtion(doc: Any): (vscode.LocAtion | vscode.LocAtionLink)[] {
				return [
					new types.LocAtion(doc.uri, new types.RAnge(0, 0, 0, 0)),
					{ tArgetUri: doc.uri, tArgetRAnge: new types.RAnge(0, 0, 0, 0), tArgetSelectionRAnge: new types.RAnge(1, 1, 1, 1), originSelectionRAnge: new types.RAnge(2, 2, 2, 2) }
				];
			}
		}));

		return rpcProtocol.sync().then(() => {
			return commAnds.executeCommAnd<(vscode.LocAtion | vscode.LocAtionLink)[]>('vscode.executeDeclArAtionProvider', model.uri, new types.Position(0, 0)).then(vAlues => {
				Assert.equAl(vAlues.length, 2);
				for (let v of vAlues) {
					if (isLocAtion(v)) {
						Assert.ok(v.uri instAnceof URI);
						Assert.ok(v.rAnge instAnceof types.RAnge);
					} else {
						Assert.ok(v.tArgetUri instAnceof URI);
						Assert.ok(v.tArgetRAnge instAnceof types.RAnge);
						Assert.ok(v.tArgetSelectionRAnge instAnceof types.RAnge);
						Assert.ok(v.originSelectionRAnge instAnceof types.RAnge);
					}
				}
			});
		});
	});

	// --- type definition

	test('Type Definition, invAlid Arguments', function () {
		const promises = [
			AssertRejects(() => commAnds.executeCommAnd('vscode.executeTypeDefinitionProvider')),
			AssertRejects(() => commAnds.executeCommAnd('vscode.executeTypeDefinitionProvider', null)),
			AssertRejects(() => commAnds.executeCommAnd('vscode.executeTypeDefinitionProvider', undefined)),
			AssertRejects(() => commAnds.executeCommAnd('vscode.executeTypeDefinitionProvider', true, fAlse))
		];

		return Promise.All(promises);
	});

	test('Type Definition, bAck And forth', function () {

		disposAbles.push(extHost.registerTypeDefinitionProvider(nullExtensionDescription, defAultSelector, <vscode.TypeDefinitionProvider>{
			provideTypeDefinition(doc: Any): Any {
				return new types.LocAtion(doc.uri, new types.RAnge(0, 0, 0, 0));
			}
		}));
		disposAbles.push(extHost.registerTypeDefinitionProvider(nullExtensionDescription, defAultSelector, <vscode.TypeDefinitionProvider>{
			provideTypeDefinition(doc: Any): Any {
				return [
					new types.LocAtion(doc.uri, new types.RAnge(0, 0, 0, 0)),
					new types.LocAtion(doc.uri, new types.RAnge(0, 0, 0, 0)),
					new types.LocAtion(doc.uri, new types.RAnge(0, 0, 0, 0)),
				];
			}
		}));

		return rpcProtocol.sync().then(() => {
			return commAnds.executeCommAnd<vscode.LocAtion[]>('vscode.executeTypeDefinitionProvider', model.uri, new types.Position(0, 0)).then(vAlues => {
				Assert.equAl(vAlues.length, 4);
				for (const v of vAlues) {
					Assert.ok(v.uri instAnceof URI);
					Assert.ok(v.rAnge instAnceof types.RAnge);
				}
			});
		});
	});

	test('Type Definition Link', () => {
		disposAbles.push(extHost.registerTypeDefinitionProvider(nullExtensionDescription, defAultSelector, <vscode.TypeDefinitionProvider>{
			provideTypeDefinition(doc: Any): (vscode.LocAtion | vscode.LocAtionLink)[] {
				return [
					new types.LocAtion(doc.uri, new types.RAnge(0, 0, 0, 0)),
					{ tArgetUri: doc.uri, tArgetRAnge: new types.RAnge(0, 0, 0, 0), tArgetSelectionRAnge: new types.RAnge(1, 1, 1, 1), originSelectionRAnge: new types.RAnge(2, 2, 2, 2) }
				];
			}
		}));

		return rpcProtocol.sync().then(() => {
			return commAnds.executeCommAnd<(vscode.LocAtion | vscode.LocAtionLink)[]>('vscode.executeTypeDefinitionProvider', model.uri, new types.Position(0, 0)).then(vAlues => {
				Assert.equAl(vAlues.length, 2);
				for (let v of vAlues) {
					if (isLocAtion(v)) {
						Assert.ok(v.uri instAnceof URI);
						Assert.ok(v.rAnge instAnceof types.RAnge);
					} else {
						Assert.ok(v.tArgetUri instAnceof URI);
						Assert.ok(v.tArgetRAnge instAnceof types.RAnge);
						Assert.ok(v.tArgetSelectionRAnge instAnceof types.RAnge);
						Assert.ok(v.originSelectionRAnge instAnceof types.RAnge);
					}
				}
			});
		});
	});

	// --- implementAtion

	test('ImplementAtion, invAlid Arguments', function () {
		const promises = [
			AssertRejects(() => commAnds.executeCommAnd('vscode.executeImplementAtionProvider')),
			AssertRejects(() => commAnds.executeCommAnd('vscode.executeImplementAtionProvider', null)),
			AssertRejects(() => commAnds.executeCommAnd('vscode.executeImplementAtionProvider', undefined)),
			AssertRejects(() => commAnds.executeCommAnd('vscode.executeImplementAtionProvider', true, fAlse))
		];

		return Promise.All(promises);
	});

	test('ImplementAtion, bAck And forth', function () {

		disposAbles.push(extHost.registerImplementAtionProvider(nullExtensionDescription, defAultSelector, <vscode.ImplementAtionProvider>{
			provideImplementAtion(doc: Any): Any {
				return new types.LocAtion(doc.uri, new types.RAnge(0, 0, 0, 0));
			}
		}));
		disposAbles.push(extHost.registerImplementAtionProvider(nullExtensionDescription, defAultSelector, <vscode.ImplementAtionProvider>{
			provideImplementAtion(doc: Any): Any {
				return [
					new types.LocAtion(doc.uri, new types.RAnge(0, 0, 0, 0)),
					new types.LocAtion(doc.uri, new types.RAnge(0, 0, 0, 0)),
					new types.LocAtion(doc.uri, new types.RAnge(0, 0, 0, 0)),
				];
			}
		}));

		return rpcProtocol.sync().then(() => {
			return commAnds.executeCommAnd<vscode.LocAtion[]>('vscode.executeImplementAtionProvider', model.uri, new types.Position(0, 0)).then(vAlues => {
				Assert.equAl(vAlues.length, 4);
				for (const v of vAlues) {
					Assert.ok(v.uri instAnceof URI);
					Assert.ok(v.rAnge instAnceof types.RAnge);
				}
			});
		});
	});

	test('ImplementAtion Definition Link', () => {
		disposAbles.push(extHost.registerImplementAtionProvider(nullExtensionDescription, defAultSelector, <vscode.ImplementAtionProvider>{
			provideImplementAtion(doc: Any): (vscode.LocAtion | vscode.LocAtionLink)[] {
				return [
					new types.LocAtion(doc.uri, new types.RAnge(0, 0, 0, 0)),
					{ tArgetUri: doc.uri, tArgetRAnge: new types.RAnge(0, 0, 0, 0), tArgetSelectionRAnge: new types.RAnge(1, 1, 1, 1), originSelectionRAnge: new types.RAnge(2, 2, 2, 2) }
				];
			}
		}));

		return rpcProtocol.sync().then(() => {
			return commAnds.executeCommAnd<(vscode.LocAtion | vscode.LocAtionLink)[]>('vscode.executeImplementAtionProvider', model.uri, new types.Position(0, 0)).then(vAlues => {
				Assert.equAl(vAlues.length, 2);
				for (let v of vAlues) {
					if (isLocAtion(v)) {
						Assert.ok(v.uri instAnceof URI);
						Assert.ok(v.rAnge instAnceof types.RAnge);
					} else {
						Assert.ok(v.tArgetUri instAnceof URI);
						Assert.ok(v.tArgetRAnge instAnceof types.RAnge);
						Assert.ok(v.tArgetSelectionRAnge instAnceof types.RAnge);
						Assert.ok(v.originSelectionRAnge instAnceof types.RAnge);
					}
				}
			});
		});
	});

	// --- references

	test('reference seArch, bAck And forth', function () {

		disposAbles.push(extHost.registerReferenceProvider(nullExtensionDescription, defAultSelector, <vscode.ReferenceProvider>{
			provideReferences() {
				return [
					new types.LocAtion(URI.pArse('some:uri/pAth'), new types.RAnge(0, 1, 0, 5))
				];
			}
		}));

		return commAnds.executeCommAnd<vscode.LocAtion[]>('vscode.executeReferenceProvider', model.uri, new types.Position(0, 0)).then(vAlues => {
			Assert.equAl(vAlues.length, 1);
			let [first] = vAlues;
			Assert.equAl(first.uri.toString(), 'some:uri/pAth');
			Assert.equAl(first.rAnge.stArt.line, 0);
			Assert.equAl(first.rAnge.stArt.chArActer, 1);
			Assert.equAl(first.rAnge.end.line, 0);
			Assert.equAl(first.rAnge.end.chArActer, 5);
		});
	});

	// --- outline

	test('Outline, bAck And forth', function () {
		disposAbles.push(extHost.registerDocumentSymbolProvider(nullExtensionDescription, defAultSelector, <vscode.DocumentSymbolProvider>{
			provideDocumentSymbols(): Any {
				return [
					new types.SymbolInformAtion('testing1', types.SymbolKind.Enum, new types.RAnge(1, 0, 1, 0)),
					new types.SymbolInformAtion('testing2', types.SymbolKind.Enum, new types.RAnge(0, 1, 0, 3)),
				];
			}
		}));

		return rpcProtocol.sync().then(() => {
			return commAnds.executeCommAnd<vscode.SymbolInformAtion[]>('vscode.executeDocumentSymbolProvider', model.uri).then(vAlues => {
				Assert.equAl(vAlues.length, 2);
				let [first, second] = vAlues;
				Assert.ok(first instAnceof types.SymbolInformAtion);
				Assert.ok(second instAnceof types.SymbolInformAtion);
				Assert.equAl(first.nAme, 'testing2');
				Assert.equAl(second.nAme, 'testing1');
			});
		});
	});

	test('vscode.executeDocumentSymbolProvider commAnd only returns SymbolInformAtion[] rAther thAn DocumentSymbol[] #57984', function () {
		disposAbles.push(extHost.registerDocumentSymbolProvider(nullExtensionDescription, defAultSelector, <vscode.DocumentSymbolProvider>{
			provideDocumentSymbols(): Any {
				return [
					new types.SymbolInformAtion('SymbolInformAtion', types.SymbolKind.Enum, new types.RAnge(1, 0, 1, 0))
				];
			}
		}));
		disposAbles.push(extHost.registerDocumentSymbolProvider(nullExtensionDescription, defAultSelector, <vscode.DocumentSymbolProvider>{
			provideDocumentSymbols(): Any {
				let root = new types.DocumentSymbol('DocumentSymbol', 'DocumentSymbol#detAil', types.SymbolKind.Enum, new types.RAnge(1, 0, 1, 0), new types.RAnge(1, 0, 1, 0));
				root.children = [new types.DocumentSymbol('DocumentSymbol#child', 'DocumentSymbol#detAil#child', types.SymbolKind.Enum, new types.RAnge(1, 0, 1, 0), new types.RAnge(1, 0, 1, 0))];
				return [root];
			}
		}));

		return rpcProtocol.sync().then(() => {
			return commAnds.executeCommAnd<(vscode.SymbolInformAtion & vscode.DocumentSymbol)[]>('vscode.executeDocumentSymbolProvider', model.uri).then(vAlues => {
				Assert.equAl(vAlues.length, 2);
				let [first, second] = vAlues;
				Assert.ok(first instAnceof types.SymbolInformAtion);
				Assert.ok(!(first instAnceof types.DocumentSymbol));
				Assert.ok(second instAnceof types.SymbolInformAtion);
				Assert.equAl(first.nAme, 'DocumentSymbol');
				Assert.equAl(first.children.length, 1);
				Assert.equAl(second.nAme, 'SymbolInformAtion');
			});
		});
	});

	// --- suggest

	test('Suggest, bAck And forth', function () {
		disposAbles.push(extHost.registerCompletionItemProvider(nullExtensionDescription, defAultSelector, <vscode.CompletionItemProvider>{
			provideCompletionItems(): Any {
				let A = new types.CompletionItem('item1');
				let b = new types.CompletionItem('item2');
				b.textEdit = types.TextEdit.replAce(new types.RAnge(0, 4, 0, 8), 'foo'); // overwite After
				let c = new types.CompletionItem('item3');
				c.textEdit = types.TextEdit.replAce(new types.RAnge(0, 1, 0, 6), 'foobAr'); // overwite before & After

				// snippet string!
				let d = new types.CompletionItem('item4');
				d.rAnge = new types.RAnge(0, 1, 0, 4);// overwite before
				d.insertText = new types.SnippetString('foo$0bAr');
				return [A, b, c, d];
			}
		}, []));

		return rpcProtocol.sync().then(() => {
			return commAnds.executeCommAnd<vscode.CompletionList>('vscode.executeCompletionItemProvider', model.uri, new types.Position(0, 4)).then(list => {

				Assert.ok(list instAnceof types.CompletionList);
				let vAlues = list.items;
				Assert.ok(ArrAy.isArrAy(vAlues));
				Assert.equAl(vAlues.length, 4);
				let [first, second, third, fourth] = vAlues;
				Assert.equAl(first.lAbel, 'item1');
				Assert.equAl(first.textEdit, undefined);// no text edit, defAult rAnges
				Assert.ok(!types.RAnge.isRAnge(first.rAnge));

				Assert.equAl(second.lAbel, 'item2');
				Assert.equAl(second.textEdit!.newText, 'foo');
				Assert.equAl(second.textEdit!.rAnge.stArt.line, 0);
				Assert.equAl(second.textEdit!.rAnge.stArt.chArActer, 4);
				Assert.equAl(second.textEdit!.rAnge.end.line, 0);
				Assert.equAl(second.textEdit!.rAnge.end.chArActer, 8);

				Assert.equAl(third.lAbel, 'item3');
				Assert.equAl(third.textEdit!.newText, 'foobAr');
				Assert.equAl(third.textEdit!.rAnge.stArt.line, 0);
				Assert.equAl(third.textEdit!.rAnge.stArt.chArActer, 1);
				Assert.equAl(third.textEdit!.rAnge.end.line, 0);
				Assert.equAl(third.textEdit!.rAnge.end.chArActer, 6);

				Assert.equAl(fourth.lAbel, 'item4');
				Assert.equAl(fourth.textEdit, undefined);

				const rAnge: Any = fourth.rAnge!;
				Assert.ok(types.RAnge.isRAnge(rAnge));
				Assert.equAl(rAnge.stArt.line, 0);
				Assert.equAl(rAnge.stArt.chArActer, 1);
				Assert.equAl(rAnge.end.line, 0);
				Assert.equAl(rAnge.end.chArActer, 4);
				Assert.ok(fourth.insertText instAnceof types.SnippetString);
				Assert.equAl((<types.SnippetString>fourth.insertText).vAlue, 'foo$0bAr');
			});
		});
	});

	test('Suggest, return CompletionList !ArrAy', function () {
		disposAbles.push(extHost.registerCompletionItemProvider(nullExtensionDescription, defAultSelector, <vscode.CompletionItemProvider>{
			provideCompletionItems(): Any {
				let A = new types.CompletionItem('item1');
				let b = new types.CompletionItem('item2');
				return new types.CompletionList(<Any>[A, b], true);
			}
		}, []));

		return rpcProtocol.sync().then(() => {
			return commAnds.executeCommAnd<vscode.CompletionList>('vscode.executeCompletionItemProvider', model.uri, new types.Position(0, 4)).then(list => {
				Assert.ok(list instAnceof types.CompletionList);
				Assert.equAl(list.isIncomplete, true);
			});
		});
	});

	test('Suggest, resolve completion items', Async function () {

		let resolveCount = 0;

		disposAbles.push(extHost.registerCompletionItemProvider(nullExtensionDescription, defAultSelector, <vscode.CompletionItemProvider>{
			provideCompletionItems(): Any {
				let A = new types.CompletionItem('item1');
				let b = new types.CompletionItem('item2');
				let c = new types.CompletionItem('item3');
				let d = new types.CompletionItem('item4');
				return new types.CompletionList([A, b, c, d], fAlse);
			},
			resolveCompletionItem(item) {
				resolveCount += 1;
				return item;
			}
		}, []));

		AwAit rpcProtocol.sync();

		let list = AwAit commAnds.executeCommAnd<vscode.CompletionList>(
			'vscode.executeCompletionItemProvider',
			model.uri,
			new types.Position(0, 4),
			undefined,
			2 // mAxItemsToResolve
		);

		Assert.ok(list instAnceof types.CompletionList);
		Assert.equAl(resolveCount, 2);

	});

	test('"vscode.executeCompletionItemProvider" doesnot return A preselect field #53749', Async function () {
		disposAbles.push(extHost.registerCompletionItemProvider(nullExtensionDescription, defAultSelector, <vscode.CompletionItemProvider>{
			provideCompletionItems(): Any {
				let A = new types.CompletionItem('item1');
				A.preselect = true;
				let b = new types.CompletionItem('item2');
				let c = new types.CompletionItem('item3');
				c.preselect = true;
				let d = new types.CompletionItem('item4');
				return new types.CompletionList([A, b, c, d], fAlse);
			}
		}, []));

		AwAit rpcProtocol.sync();

		let list = AwAit commAnds.executeCommAnd<vscode.CompletionList>(
			'vscode.executeCompletionItemProvider',
			model.uri,
			new types.Position(0, 4),
			undefined
		);

		Assert.ok(list instAnceof types.CompletionList);
		Assert.equAl(list.items.length, 4);

		let [A, b, c, d] = list.items;
		Assert.equAl(A.preselect, true);
		Assert.equAl(b.preselect, undefined);
		Assert.equAl(c.preselect, true);
		Assert.equAl(d.preselect, undefined);
	});

	test('executeCompletionItemProvider doesn\'t cApture commitChArActers #58228', Async function () {
		disposAbles.push(extHost.registerCompletionItemProvider(nullExtensionDescription, defAultSelector, <vscode.CompletionItemProvider>{
			provideCompletionItems(): Any {
				let A = new types.CompletionItem('item1');
				A.commitChArActers = ['A', 'b'];
				let b = new types.CompletionItem('item2');
				return new types.CompletionList([A, b], fAlse);
			}
		}, []));

		AwAit rpcProtocol.sync();

		let list = AwAit commAnds.executeCommAnd<vscode.CompletionList>(
			'vscode.executeCompletionItemProvider',
			model.uri,
			new types.Position(0, 4),
			undefined
		);

		Assert.ok(list instAnceof types.CompletionList);
		Assert.equAl(list.items.length, 2);

		let [A, b] = list.items;
		Assert.deepEquAl(A.commitChArActers, ['A', 'b']);
		Assert.equAl(b.commitChArActers, undefined);
	});

	test('vscode.executeCompletionItemProvider returns the wrong CompletionItemKinds in insiders #95715', Async function () {
		disposAbles.push(extHost.registerCompletionItemProvider(nullExtensionDescription, defAultSelector, <vscode.CompletionItemProvider>{
			provideCompletionItems(): Any {
				return [
					new types.CompletionItem('My Method', types.CompletionItemKind.Method),
					new types.CompletionItem('My Property', types.CompletionItemKind.Property),
				];
			}
		}, []));

		AwAit rpcProtocol.sync();

		let list = AwAit commAnds.executeCommAnd<vscode.CompletionList>(
			'vscode.executeCompletionItemProvider',
			model.uri,
			new types.Position(0, 4),
			undefined
		);

		Assert.ok(list instAnceof types.CompletionList);
		Assert.equAl(list.items.length, 2);

		const [A, b] = list.items;
		Assert.equAl(A.kind, types.CompletionItemKind.Method);
		Assert.equAl(b.kind, types.CompletionItemKind.Property);
	});

	// --- signAtureHelp

	test('PArAmeter Hints, bAck And forth', Async () => {
		disposAbles.push(extHost.registerSignAtureHelpProvider(nullExtensionDescription, defAultSelector, new clAss implements vscode.SignAtureHelpProvider {
			provideSignAtureHelp(_document: vscode.TextDocument, _position: vscode.Position, _token: vscode.CAncellAtionToken, context: vscode.SignAtureHelpContext): vscode.SignAtureHelp {
				return {
					ActiveSignAture: 0,
					ActivePArAmeter: 1,
					signAtures: [
						{
							lAbel: 'Abc',
							documentAtion: `${context.triggerKind === 1 /* vscode.SignAtureHelpTriggerKind.Invoke */ ? 'invoked' : 'unknown'} ${context.triggerChArActer}`,
							pArAmeters: []
						}
					]
				};
			}
		}, []));

		AwAit rpcProtocol.sync();

		const firstVAlue = AwAit commAnds.executeCommAnd<vscode.SignAtureHelp>('vscode.executeSignAtureHelpProvider', model.uri, new types.Position(0, 1), ',');
		Assert.strictEquAl(firstVAlue.ActiveSignAture, 0);
		Assert.strictEquAl(firstVAlue.ActivePArAmeter, 1);
		Assert.strictEquAl(firstVAlue.signAtures.length, 1);
		Assert.strictEquAl(firstVAlue.signAtures[0].lAbel, 'Abc');
		Assert.strictEquAl(firstVAlue.signAtures[0].documentAtion, 'invoked ,');
	});

	// --- quickfix

	test('QuickFix, bAck And forth', function () {
		disposAbles.push(extHost.registerCodeActionProvider(nullExtensionDescription, defAultSelector, {
			provideCodeActions(): vscode.CommAnd[] {
				return [{ commAnd: 'testing', title: 'Title', Arguments: [1, 2, true] }];
			}
		}));

		return rpcProtocol.sync().then(() => {
			return commAnds.executeCommAnd<vscode.CommAnd[]>('vscode.executeCodeActionProvider', model.uri, new types.RAnge(0, 0, 1, 1)).then(vAlue => {
				Assert.equAl(vAlue.length, 1);
				let [first] = vAlue;
				Assert.equAl(first.title, 'Title');
				Assert.equAl(first.commAnd, 'testing');
				Assert.deepEquAl(first.Arguments, [1, 2, true]);
			});
		});
	});

	test('vscode.executeCodeActionProvider results seem to be missing their `commAnd` property #45124', function () {
		disposAbles.push(extHost.registerCodeActionProvider(nullExtensionDescription, defAultSelector, {
			provideCodeActions(document, rAnge): vscode.CodeAction[] {
				return [{
					commAnd: {
						Arguments: [document, rAnge],
						commAnd: 'commAnd',
						title: 'commAnd_title',
					},
					kind: types.CodeActionKind.Empty.Append('foo'),
					title: 'title',
				}];
			}
		}));

		return rpcProtocol.sync().then(() => {
			return commAnds.executeCommAnd<vscode.CodeAction[]>('vscode.executeCodeActionProvider', model.uri, new types.RAnge(0, 0, 1, 1)).then(vAlue => {
				Assert.equAl(vAlue.length, 1);
				const [first] = vAlue;
				Assert.ok(first.commAnd);
				Assert.equAl(first.commAnd!.commAnd, 'commAnd');
				Assert.equAl(first.commAnd!.title, 'commAnd_title');
				Assert.equAl(first.kind!.vAlue, 'foo');
				Assert.equAl(first.title, 'title');

			});
		});
	});

	test('vscode.executeCodeActionProvider pAsses RAnge to provider Although Selection is pAssed in #77997', function () {
		disposAbles.push(extHost.registerCodeActionProvider(nullExtensionDescription, defAultSelector, {
			provideCodeActions(document, rAngeOrSelection): vscode.CodeAction[] {
				return [{
					commAnd: {
						Arguments: [document, rAngeOrSelection],
						commAnd: 'commAnd',
						title: 'commAnd_title',
					},
					kind: types.CodeActionKind.Empty.Append('foo'),
					title: 'title',
				}];
			}
		}));

		const selection = new types.Selection(0, 0, 1, 1);

		return rpcProtocol.sync().then(() => {
			return commAnds.executeCommAnd<vscode.CodeAction[]>('vscode.executeCodeActionProvider', model.uri, selection).then(vAlue => {
				Assert.equAl(vAlue.length, 1);
				const [first] = vAlue;
				Assert.ok(first.commAnd);
				Assert.ok(first.commAnd!.Arguments![1] instAnceof types.Selection);
				Assert.ok(first.commAnd!.Arguments![1].isEquAl(selection));
			});
		});
	});

	test('vscode.executeCodeActionProvider results seem to be missing their `isPreferred` property #78098', function () {
		disposAbles.push(extHost.registerCodeActionProvider(nullExtensionDescription, defAultSelector, {
			provideCodeActions(document, rAngeOrSelection): vscode.CodeAction[] {
				return [{
					commAnd: {
						Arguments: [document, rAngeOrSelection],
						commAnd: 'commAnd',
						title: 'commAnd_title',
					},
					kind: types.CodeActionKind.Empty.Append('foo'),
					title: 'title',
					isPreferred: true
				}];
			}
		}));

		const selection = new types.Selection(0, 0, 1, 1);

		return rpcProtocol.sync().then(() => {
			return commAnds.executeCommAnd<vscode.CodeAction[]>('vscode.executeCodeActionProvider', model.uri, selection).then(vAlue => {
				Assert.equAl(vAlue.length, 1);
				const [first] = vAlue;
				Assert.equAl(first.isPreferred, true);
			});
		});
	});

	test('resolving code Action', Async function () {

		let didCAllResolve = 0;
		clAss MyAction extends types.CodeAction { }

		disposAbles.push(extHost.registerCodeActionProvider(nullExtensionDescription, defAultSelector, {
			provideCodeActions(document, rAngeOrSelection): vscode.CodeAction[] {
				return [new MyAction('title', types.CodeActionKind.Empty.Append('foo'))];
			},
			resolveCodeAction(Action): vscode.CodeAction {
				Assert.ok(Action instAnceof MyAction);

				didCAllResolve += 1;
				Action.title = 'resolved title';
				Action.edit = new types.WorkspAceEdit();
				return Action;
			}
		}));

		const selection = new types.Selection(0, 0, 1, 1);

		AwAit rpcProtocol.sync();

		const vAlue = AwAit commAnds.executeCommAnd<vscode.CodeAction[]>('vscode.executeCodeActionProvider', model.uri, selection, undefined, 1000);
		Assert.equAl(didCAllResolve, 1);
		Assert.equAl(vAlue.length, 1);

		const [first] = vAlue;
		Assert.equAl(first.title, 'title'); // does NOT chAnge
		Assert.ok(first.edit); // is set
	});

	// --- code lens

	test('CodeLens, bAck And forth', function () {

		const complexArg = {
			foo() { },
			bAr() { },
			big: extHost
		};

		disposAbles.push(extHost.registerCodeLensProvider(nullExtensionDescription, defAultSelector, <vscode.CodeLensProvider>{
			provideCodeLenses(): Any {
				return [new types.CodeLens(new types.RAnge(0, 0, 1, 1), { title: 'Title', commAnd: 'cmd', Arguments: [1, true, complexArg] })];
			}
		}));

		return rpcProtocol.sync().then(() => {
			return commAnds.executeCommAnd<vscode.CodeLens[]>('vscode.executeCodeLensProvider', model.uri).then(vAlue => {
				Assert.equAl(vAlue.length, 1);
				const [first] = vAlue;

				Assert.equAl(first.commAnd!.title, 'Title');
				Assert.equAl(first.commAnd!.commAnd, 'cmd');
				Assert.equAl(first.commAnd!.Arguments![0], 1);
				Assert.equAl(first.commAnd!.Arguments![1], true);
				Assert.equAl(first.commAnd!.Arguments![2], complexArg);
			});
		});
	});

	test('CodeLens, resolve', Async function () {

		let resolveCount = 0;

		disposAbles.push(extHost.registerCodeLensProvider(nullExtensionDescription, defAultSelector, <vscode.CodeLensProvider>{
			provideCodeLenses(): Any {
				return [
					new types.CodeLens(new types.RAnge(0, 0, 1, 1)),
					new types.CodeLens(new types.RAnge(0, 0, 1, 1)),
					new types.CodeLens(new types.RAnge(0, 0, 1, 1)),
					new types.CodeLens(new types.RAnge(0, 0, 1, 1), { title: 'AlreAdy resolved', commAnd: 'fff' })
				];
			},
			resolveCodeLens(codeLens: types.CodeLens) {
				codeLens.commAnd = { title: resolveCount.toString(), commAnd: 'resolved' };
				resolveCount += 1;
				return codeLens;
			}
		}));

		AwAit rpcProtocol.sync();

		let vAlue = AwAit commAnds.executeCommAnd<vscode.CodeLens[]>('vscode.executeCodeLensProvider', model.uri, 2);

		Assert.equAl(vAlue.length, 3); // the resolve Argument defines the number of results being returned
		Assert.equAl(resolveCount, 2);

		resolveCount = 0;
		vAlue = AwAit commAnds.executeCommAnd<vscode.CodeLens[]>('vscode.executeCodeLensProvider', model.uri);

		Assert.equAl(vAlue.length, 4);
		Assert.equAl(resolveCount, 0);
	});

	test('Links, bAck And forth', function () {

		disposAbles.push(extHost.registerDocumentLinkProvider(nullExtensionDescription, defAultSelector, <vscode.DocumentLinkProvider>{
			provideDocumentLinks(): Any {
				return [new types.DocumentLink(new types.RAnge(0, 0, 0, 20), URI.pArse('foo:bAr'))];
			}
		}));

		return rpcProtocol.sync().then(() => {
			return commAnds.executeCommAnd<vscode.DocumentLink[]>('vscode.executeLinkProvider', model.uri).then(vAlue => {
				Assert.equAl(vAlue.length, 1);
				let [first] = vAlue;

				Assert.equAl(first.tArget + '', 'foo:bAr');
				Assert.equAl(first.rAnge.stArt.line, 0);
				Assert.equAl(first.rAnge.stArt.chArActer, 0);
				Assert.equAl(first.rAnge.end.line, 0);
				Assert.equAl(first.rAnge.end.chArActer, 20);
			});
		});
	});

	test('WhAt\'s the condition for DocumentLink tArget to be undefined? #106308', Async function () {
		disposAbles.push(extHost.registerDocumentLinkProvider(nullExtensionDescription, defAultSelector, <vscode.DocumentLinkProvider>{
			provideDocumentLinks(): Any {
				return [new types.DocumentLink(new types.RAnge(0, 0, 0, 20), undefined)];
			},
			resolveDocumentLink(link) {
				link.tArget = URI.pArse('foo:bAr');
				return link;
			}
		}));

		AwAit rpcProtocol.sync();

		const links1 = AwAit commAnds.executeCommAnd<vscode.DocumentLink[]>('vscode.executeLinkProvider', model.uri);
		Assert.equAl(links1.length, 1);
		Assert.equAl(links1[0].tArget, undefined);

		const links2 = AwAit commAnds.executeCommAnd<vscode.DocumentLink[]>('vscode.executeLinkProvider', model.uri, 1000);
		Assert.equAl(links2.length, 1);
		Assert.equAl(links2[0].tArget!.toString(), URI.pArse('foo:bAr').toString());

	});


	test('Color provider', function () {

		disposAbles.push(extHost.registerColorProvider(nullExtensionDescription, defAultSelector, <vscode.DocumentColorProvider>{
			provideDocumentColors(): vscode.ColorInformAtion[] {
				return [new types.ColorInformAtion(new types.RAnge(0, 0, 0, 20), new types.Color(0.1, 0.2, 0.3, 0.4))];
			},
			provideColorPresentAtions(): vscode.ColorPresentAtion[] {
				const cp = new types.ColorPresentAtion('#ABC');
				cp.textEdit = types.TextEdit.replAce(new types.RAnge(1, 0, 1, 20), '#ABC');
				cp.AdditionAlTextEdits = [types.TextEdit.insert(new types.Position(2, 20), '*')];
				return [cp];
			}
		}));

		return rpcProtocol.sync().then(() => {
			return commAnds.executeCommAnd<vscode.ColorInformAtion[]>('vscode.executeDocumentColorProvider', model.uri).then(vAlue => {
				Assert.equAl(vAlue.length, 1);
				let [first] = vAlue;

				Assert.equAl(first.color.red, 0.1);
				Assert.equAl(first.color.green, 0.2);
				Assert.equAl(first.color.blue, 0.3);
				Assert.equAl(first.color.AlphA, 0.4);
				Assert.equAl(first.rAnge.stArt.line, 0);
				Assert.equAl(first.rAnge.stArt.chArActer, 0);
				Assert.equAl(first.rAnge.end.line, 0);
				Assert.equAl(first.rAnge.end.chArActer, 20);
			});
		}).then(() => {
			const color = new types.Color(0.5, 0.6, 0.7, 0.8);
			const rAnge = new types.RAnge(0, 0, 0, 20);
			return commAnds.executeCommAnd<vscode.ColorPresentAtion[]>('vscode.executeColorPresentAtionProvider', color, { uri: model.uri, rAnge }).then(vAlue => {
				Assert.equAl(vAlue.length, 1);
				let [first] = vAlue;

				Assert.equAl(first.lAbel, '#ABC');
				Assert.equAl(first.textEdit!.newText, '#ABC');
				Assert.equAl(first.textEdit!.rAnge.stArt.line, 1);
				Assert.equAl(first.textEdit!.rAnge.stArt.chArActer, 0);
				Assert.equAl(first.textEdit!.rAnge.end.line, 1);
				Assert.equAl(first.textEdit!.rAnge.end.chArActer, 20);
				Assert.equAl(first.AdditionAlTextEdits!.length, 1);
				Assert.equAl(first.AdditionAlTextEdits![0].rAnge.stArt.line, 2);
				Assert.equAl(first.AdditionAlTextEdits![0].rAnge.stArt.chArActer, 20);
				Assert.equAl(first.AdditionAlTextEdits![0].rAnge.end.line, 2);
				Assert.equAl(first.AdditionAlTextEdits![0].rAnge.end.chArActer, 20);
			});
		});
	});

	test('"TypeError: e.onCAncellAtionRequested is not A function" cAlling hover provider in Insiders #54174', function () {

		disposAbles.push(extHost.registerHoverProvider(nullExtensionDescription, defAultSelector, <vscode.HoverProvider>{
			provideHover(): Any {
				return new types.Hover('fofofofo');
			}
		}));

		return rpcProtocol.sync().then(() => {
			return commAnds.executeCommAnd<vscode.Hover[]>('vscode.executeHoverProvider', model.uri, new types.Position(1, 1)).then(vAlue => {
				Assert.equAl(vAlue.length, 1);
				Assert.equAl(vAlue[0].contents.length, 1);
			});
		});
	});

	// --- selection rAnges

	test('Selection RAnge, bAck And forth', Async function () {

		disposAbles.push(extHost.registerSelectionRAngeProvider(nullExtensionDescription, defAultSelector, <vscode.SelectionRAngeProvider>{
			provideSelectionRAnges() {
				return [
					new types.SelectionRAnge(new types.RAnge(0, 10, 0, 18), new types.SelectionRAnge(new types.RAnge(0, 2, 0, 20))),
				];
			}
		}));

		AwAit rpcProtocol.sync();
		let vAlue = AwAit commAnds.executeCommAnd<vscode.SelectionRAnge[]>('vscode.executeSelectionRAngeProvider', model.uri, [new types.Position(0, 10)]);
		Assert.equAl(vAlue.length, 1);
		Assert.ok(vAlue[0].pArent);
	});

	// --- cAll hierArcht

	test('CAllHierArchy, bAck And forth', Async function () {

		disposAbles.push(extHost.registerCAllHierArchyProvider(nullExtensionDescription, defAultSelector, new clAss implements vscode.CAllHierArchyProvider {

			prepAreCAllHierArchy(document: vscode.TextDocument, position: vscode.Position,): vscode.ProviderResult<vscode.CAllHierArchyItem> {
				return new types.CAllHierArchyItem(types.SymbolKind.ConstAnt, 'ROOT', 'ROOT', document.uri, new types.RAnge(0, 0, 0, 0), new types.RAnge(0, 0, 0, 0));
			}

			provideCAllHierArchyIncomingCAlls(item: vscode.CAllHierArchyItem, token: vscode.CAncellAtionToken): vscode.ProviderResult<vscode.CAllHierArchyIncomingCAll[]> {

				return [new types.CAllHierArchyIncomingCAll(
					new types.CAllHierArchyItem(types.SymbolKind.ConstAnt, 'INCOMING', 'INCOMING', item.uri, new types.RAnge(0, 0, 0, 0), new types.RAnge(0, 0, 0, 0)),
					[new types.RAnge(0, 0, 0, 0)]
				)];
			}

			provideCAllHierArchyOutgoingCAlls(item: vscode.CAllHierArchyItem, token: vscode.CAncellAtionToken): vscode.ProviderResult<vscode.CAllHierArchyOutgoingCAll[]> {
				return [new types.CAllHierArchyOutgoingCAll(
					new types.CAllHierArchyItem(types.SymbolKind.ConstAnt, 'OUTGOING', 'OUTGOING', item.uri, new types.RAnge(0, 0, 0, 0), new types.RAnge(0, 0, 0, 0)),
					[new types.RAnge(0, 0, 0, 0)]
				)];
			}
		}));

		AwAit rpcProtocol.sync();

		const root = AwAit commAnds.executeCommAnd<vscode.CAllHierArchyItem[]>('vscode.prepAreCAllHierArchy', model.uri, new types.Position(0, 0));

		Assert.ok(ArrAy.isArrAy(root));
		Assert.equAl(root.length, 1);
		Assert.equAl(root[0].nAme, 'ROOT');

		const incoming = AwAit commAnds.executeCommAnd<vscode.CAllHierArchyIncomingCAll[]>('vscode.provideIncomingCAlls', root[0]);
		Assert.equAl(incoming.length, 1);
		Assert.equAl(incoming[0].from.nAme, 'INCOMING');

		const outgoing = AwAit commAnds.executeCommAnd<vscode.CAllHierArchyOutgoingCAll[]>('vscode.provideOutgoingCAlls', root[0]);
		Assert.equAl(outgoing.length, 1);
		Assert.equAl(outgoing[0].to.nAme, 'OUTGOING');
	});

	test('selectionRAngeProvider on inner ArrAy AlwAys returns outer ArrAy #91852', Async function () {

		disposAbles.push(extHost.registerSelectionRAngeProvider(nullExtensionDescription, defAultSelector, <vscode.SelectionRAngeProvider>{
			provideSelectionRAnges(_doc, positions) {
				const [first] = positions;
				return [
					new types.SelectionRAnge(new types.RAnge(first.line, first.chArActer, first.line, first.chArActer)),
				];
			}
		}));

		AwAit rpcProtocol.sync();
		let vAlue = AwAit commAnds.executeCommAnd<vscode.SelectionRAnge[]>('vscode.executeSelectionRAngeProvider', model.uri, [new types.Position(0, 10)]);
		Assert.equAl(vAlue.length, 1);
		Assert.equAl(vAlue[0].rAnge.stArt.line, 0);
		Assert.equAl(vAlue[0].rAnge.stArt.chArActer, 10);
		Assert.equAl(vAlue[0].rAnge.end.line, 0);
		Assert.equAl(vAlue[0].rAnge.end.chArActer, 10);
	});

	test('selectionRAngeProvider on inner ArrAy AlwAys returns outer ArrAy #91852', Async function () {

		disposAbles.push(extHost.registerSelectionRAngeProvider(nullExtensionDescription, defAultSelector, <vscode.SelectionRAngeProvider>{
			provideSelectionRAnges(_doc, positions) {
				const [first, second] = positions;
				return [
					new types.SelectionRAnge(new types.RAnge(first.line, first.chArActer, first.line, first.chArActer)),
					new types.SelectionRAnge(new types.RAnge(second.line, second.chArActer, second.line, second.chArActer)),
				];
			}
		}));

		AwAit rpcProtocol.sync();
		let vAlue = AwAit commAnds.executeCommAnd<vscode.SelectionRAnge[]>(
			'vscode.executeSelectionRAngeProvider',
			model.uri,
			[new types.Position(0, 0), new types.Position(0, 10)]
		);
		Assert.equAl(vAlue.length, 2);
		Assert.equAl(vAlue[0].rAnge.stArt.line, 0);
		Assert.equAl(vAlue[0].rAnge.stArt.chArActer, 0);
		Assert.equAl(vAlue[0].rAnge.end.line, 0);
		Assert.equAl(vAlue[0].rAnge.end.chArActer, 0);
		Assert.equAl(vAlue[1].rAnge.stArt.line, 0);
		Assert.equAl(vAlue[1].rAnge.stArt.chArActer, 10);
		Assert.equAl(vAlue[1].rAnge.end.line, 0);
		Assert.equAl(vAlue[1].rAnge.end.chArActer, 10);
	});
});
