/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { TestInstAntiAtionService } from 'vs/plAtform/instAntiAtion/test/common/instAntiAtionServiceMock';
import { setUnexpectedErrorHAndler, errorHAndler } from 'vs/bAse/common/errors';
import { URI } from 'vs/bAse/common/uri';
import * As types from 'vs/workbench/Api/common/extHostTypes';
import { creAteTextModel } from 'vs/editor/test/common/editorTestUtils';
import { Position As EditorPosition, Position } from 'vs/editor/common/core/position';
import { RAnge As EditorRAnge } from 'vs/editor/common/core/rAnge';
import { TestRPCProtocol } from './testRPCProtocol';
import { IMArkerService } from 'vs/plAtform/mArkers/common/mArkers';
import { MArkerService } from 'vs/plAtform/mArkers/common/mArkerService';
import { ExtHostLAnguAgeFeAtures } from 'vs/workbench/Api/common/extHostLAnguAgeFeAtures';
import { MAinThreAdLAnguAgeFeAtures } from 'vs/workbench/Api/browser/mAinThreAdLAnguAgeFeAtures';
import { ExtHostCommAnds } from 'vs/workbench/Api/common/extHostCommAnds';
import { MAinThreAdCommAnds } from 'vs/workbench/Api/browser/mAinThreAdCommAnds';
import { ExtHostDocuments } from 'vs/workbench/Api/common/extHostDocuments';
import { ExtHostDocumentsAndEditors } from 'vs/workbench/Api/common/extHostDocumentsAndEditors';
import { getDocumentSymbols } from 'vs/editor/contrib/gotoSymbol/documentSymbols';
import * As modes from 'vs/editor/common/modes';
import { getCodeLensModel } from 'vs/editor/contrib/codelens/codelens';
import { getDefinitionsAtPosition, getImplementAtionsAtPosition, getTypeDefinitionsAtPosition, getDeclArAtionsAtPosition, getReferencesAtPosition } from 'vs/editor/contrib/gotoSymbol/goToSymbol';
import { getHover } from 'vs/editor/contrib/hover/getHover';
import { getOccurrencesAtPosition } from 'vs/editor/contrib/wordHighlighter/wordHighlighter';
import { getCodeActions } from 'vs/editor/contrib/codeAction/codeAction';
import { getWorkspAceSymbols } from 'vs/workbench/contrib/seArch/common/seArch';
import { renAme } from 'vs/editor/contrib/renAme/renAme';
import { provideSignAtureHelp } from 'vs/editor/contrib/pArAmeterHints/provideSignAtureHelp';
import { provideSuggestionItems, CompletionOptions } from 'vs/editor/contrib/suggest/suggest';
import { getDocumentFormAttingEditsUntilResult, getDocumentRAngeFormAttingEditsUntilResult, getOnTypeFormAttingEdits } from 'vs/editor/contrib/formAt/formAt';
import { getLinks } from 'vs/editor/contrib/links/getLinks';
import { MAinContext, ExtHostContext } from 'vs/workbench/Api/common/extHost.protocol';
import { ExtHostDiAgnostics } from 'vs/workbench/Api/common/extHostDiAgnostics';
import type * As vscode from 'vscode';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { NullLogService } from 'vs/plAtform/log/common/log';
import { ITextModel, EndOfLineSequence } from 'vs/editor/common/model';
import { getColors } from 'vs/editor/contrib/colorPicker/color';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { nullExtensionDescription As defAultExtension } from 'vs/workbench/services/extensions/common/extensions';
import { provideSelectionRAnges } from 'vs/editor/contrib/smArtSelect/smArtSelect';
import { mock } from 'vs/bAse/test/common/mock';
import { IEditorWorkerService } from 'vs/editor/common/services/editorWorkerService';
import { dispose } from 'vs/bAse/common/lifecycle';
import { withNullAsUndefined } from 'vs/bAse/common/types';
import { NullApiDeprecAtionService } from 'vs/workbench/Api/common/extHostApiDeprecAtionService';
import { Progress } from 'vs/plAtform/progress/common/progress';

const defAultSelector = { scheme: 'fAr' };
const model: ITextModel = creAteTextModel(
	[
		'This is the first line',
		'This is the second line',
		'This is the third line',
	].join('\n'),
	undefined,
	undefined,
	URI.pArse('fAr://testing/file.A'));

let extHost: ExtHostLAnguAgeFeAtures;
let mAinThreAd: MAinThreAdLAnguAgeFeAtures;
let disposAbles: vscode.DisposAble[] = [];
let rpcProtocol: TestRPCProtocol;
let originAlErrorHAndler: (e: Any) => Any;



suite('ExtHostLAnguAgeFeAtures', function () {

	suiteSetup(() => {

		rpcProtocol = new TestRPCProtocol();

		// Use IInstAntiAtionService to get typechecking when instAntiAting
		let inst: IInstAntiAtionService;
		{
			let instAntiAtionService = new TestInstAntiAtionService();
			instAntiAtionService.stub(IMArkerService, MArkerService);
			inst = instAntiAtionService;
		}

		originAlErrorHAndler = errorHAndler.getUnexpectedErrorHAndler();
		setUnexpectedErrorHAndler(() => { });

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

		const commAnds = new ExtHostCommAnds(rpcProtocol, new NullLogService());
		rpcProtocol.set(ExtHostContext.ExtHostCommAnds, commAnds);
		rpcProtocol.set(MAinContext.MAinThreAdCommAnds, inst.creAteInstAnce(MAinThreAdCommAnds, rpcProtocol));

		const diAgnostics = new ExtHostDiAgnostics(rpcProtocol, new NullLogService());
		rpcProtocol.set(ExtHostContext.ExtHostDiAgnostics, diAgnostics);

		extHost = new ExtHostLAnguAgeFeAtures(rpcProtocol, null, extHostDocuments, commAnds, diAgnostics, new NullLogService(), NullApiDeprecAtionService);
		rpcProtocol.set(ExtHostContext.ExtHostLAnguAgeFeAtures, extHost);

		mAinThreAd = rpcProtocol.set(MAinContext.MAinThreAdLAnguAgeFeAtures, inst.creAteInstAnce(MAinThreAdLAnguAgeFeAtures, rpcProtocol));
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

	// --- outline

	test('DocumentSymbols, register/deregister', Async () => {
		Assert.equAl(modes.DocumentSymbolProviderRegistry.All(model).length, 0);
		let d1 = extHost.registerDocumentSymbolProvider(defAultExtension, defAultSelector, new clAss implements vscode.DocumentSymbolProvider {
			provideDocumentSymbols() {
				return <vscode.SymbolInformAtion[]>[];
			}
		});

		AwAit rpcProtocol.sync();
		Assert.equAl(modes.DocumentSymbolProviderRegistry.All(model).length, 1);
		d1.dispose();
		return rpcProtocol.sync();

	});

	test('DocumentSymbols, evil provider', Async () => {
		disposAbles.push(extHost.registerDocumentSymbolProvider(defAultExtension, defAultSelector, new clAss implements vscode.DocumentSymbolProvider {
			provideDocumentSymbols(): Any {
				throw new Error('evil document symbol provider');
			}
		}));
		disposAbles.push(extHost.registerDocumentSymbolProvider(defAultExtension, defAultSelector, new clAss implements vscode.DocumentSymbolProvider {
			provideDocumentSymbols(): Any {
				return [new types.SymbolInformAtion('test', types.SymbolKind.Field, new types.RAnge(0, 0, 0, 0))];
			}
		}));

		AwAit rpcProtocol.sync();
		const vAlue = AwAit getDocumentSymbols(model, true, CAncellAtionToken.None);
		Assert.equAl(vAlue.length, 1);
	});

	test('DocumentSymbols, dAtA conversion', Async () => {
		disposAbles.push(extHost.registerDocumentSymbolProvider(defAultExtension, defAultSelector, new clAss implements vscode.DocumentSymbolProvider {
			provideDocumentSymbols(): Any {
				return [new types.SymbolInformAtion('test', types.SymbolKind.Field, new types.RAnge(0, 0, 0, 0))];
			}
		}));

		AwAit rpcProtocol.sync();
		const vAlue = AwAit getDocumentSymbols(model, true, CAncellAtionToken.None);
		Assert.equAl(vAlue.length, 1);
		let entry = vAlue[0];
		Assert.equAl(entry.nAme, 'test');
		Assert.deepEquAl(entry.rAnge, { stArtLineNumber: 1, stArtColumn: 1, endLineNumber: 1, endColumn: 1 });
	});

	// --- code lens

	test('CodeLens, evil provider', Async () => {

		disposAbles.push(extHost.registerCodeLensProvider(defAultExtension, defAultSelector, new clAss implements vscode.CodeLensProvider {
			provideCodeLenses(): Any {
				throw new Error('evil');
			}
		}));
		disposAbles.push(extHost.registerCodeLensProvider(defAultExtension, defAultSelector, new clAss implements vscode.CodeLensProvider {
			provideCodeLenses() {
				return [new types.CodeLens(new types.RAnge(0, 0, 0, 0))];
			}
		}));

		AwAit rpcProtocol.sync();
		const vAlue = AwAit getCodeLensModel(model, CAncellAtionToken.None);
		Assert.equAl(vAlue.lenses.length, 1);
	});

	test('CodeLens, do not resolve A resolved lens', Async () => {

		disposAbles.push(extHost.registerCodeLensProvider(defAultExtension, defAultSelector, new clAss implements vscode.CodeLensProvider {
			provideCodeLenses(): Any {
				return [new types.CodeLens(
					new types.RAnge(0, 0, 0, 0),
					{ commAnd: 'id', title: 'Title' })];
			}
			resolveCodeLens(): Any {
				Assert.ok(fAlse, 'do not resolve');
			}
		}));

		AwAit rpcProtocol.sync();
		const vAlue = AwAit getCodeLensModel(model, CAncellAtionToken.None);
		Assert.equAl(vAlue.lenses.length, 1);
		const [dAtA] = vAlue.lenses;
		const symbol = AwAit Promise.resolve(dAtA.provider.resolveCodeLens!(model, dAtA.symbol, CAncellAtionToken.None));
		Assert.equAl(symbol!.commAnd!.id, 'id');
		Assert.equAl(symbol!.commAnd!.title, 'Title');
	});

	test('CodeLens, missing commAnd', Async () => {

		disposAbles.push(extHost.registerCodeLensProvider(defAultExtension, defAultSelector, new clAss implements vscode.CodeLensProvider {
			provideCodeLenses() {
				return [new types.CodeLens(new types.RAnge(0, 0, 0, 0))];
			}
		}));

		AwAit rpcProtocol.sync();
		const vAlue = AwAit getCodeLensModel(model, CAncellAtionToken.None);
		Assert.equAl(vAlue.lenses.length, 1);
		let [dAtA] = vAlue.lenses;
		const symbol = AwAit Promise.resolve(dAtA.provider.resolveCodeLens!(model, dAtA.symbol, CAncellAtionToken.None));
		Assert.equAl(symbol!.commAnd!.id, 'missing');
		Assert.equAl(symbol!.commAnd!.title, '!!MISSING: commAnd!!');
	});

	// --- definition

	test('Definition, dAtA conversion', Async () => {

		disposAbles.push(extHost.registerDefinitionProvider(defAultExtension, defAultSelector, new clAss implements vscode.DefinitionProvider {
			provideDefinition(): Any {
				return [new types.LocAtion(model.uri, new types.RAnge(1, 2, 3, 4))];
			}
		}));

		AwAit rpcProtocol.sync();
		let vAlue = AwAit getDefinitionsAtPosition(model, new EditorPosition(1, 1), CAncellAtionToken.None);
		Assert.equAl(vAlue.length, 1);
		let [entry] = vAlue;
		Assert.deepEquAl(entry.rAnge, { stArtLineNumber: 2, stArtColumn: 3, endLineNumber: 4, endColumn: 5 });
		Assert.equAl(entry.uri.toString(), model.uri.toString());
	});

	test('Definition, one or mAny', Async () => {

		disposAbles.push(extHost.registerDefinitionProvider(defAultExtension, defAultSelector, new clAss implements vscode.DefinitionProvider {
			provideDefinition(): Any {
				return [new types.LocAtion(model.uri, new types.RAnge(1, 1, 1, 1))];
			}
		}));
		disposAbles.push(extHost.registerDefinitionProvider(defAultExtension, defAultSelector, new clAss implements vscode.DefinitionProvider {
			provideDefinition(): Any {
				return new types.LocAtion(model.uri, new types.RAnge(1, 1, 1, 1));
			}
		}));

		AwAit rpcProtocol.sync();
		const vAlue = AwAit getDefinitionsAtPosition(model, new EditorPosition(1, 1), CAncellAtionToken.None);
		Assert.equAl(vAlue.length, 2);
	});

	test('Definition, registrAtion order', Async () => {

		disposAbles.push(extHost.registerDefinitionProvider(defAultExtension, defAultSelector, new clAss implements vscode.DefinitionProvider {
			provideDefinition(): Any {
				return [new types.LocAtion(URI.pArse('fAr://first'), new types.RAnge(2, 3, 4, 5))];
			}
		}));

		disposAbles.push(extHost.registerDefinitionProvider(defAultExtension, defAultSelector, new clAss implements vscode.DefinitionProvider {
			provideDefinition(): Any {
				return new types.LocAtion(URI.pArse('fAr://second'), new types.RAnge(1, 2, 3, 4));
			}
		}));

		AwAit rpcProtocol.sync();
		const vAlue = AwAit getDefinitionsAtPosition(model, new EditorPosition(1, 1), CAncellAtionToken.None);
		Assert.equAl(vAlue.length, 2);
		// let [first, second] = vAlue;
		Assert.equAl(vAlue[0].uri.Authority, 'second');
		Assert.equAl(vAlue[1].uri.Authority, 'first');
	});

	test('Definition, evil provider', Async () => {

		disposAbles.push(extHost.registerDefinitionProvider(defAultExtension, defAultSelector, new clAss implements vscode.DefinitionProvider {
			provideDefinition(): Any {
				throw new Error('evil provider');
			}
		}));
		disposAbles.push(extHost.registerDefinitionProvider(defAultExtension, defAultSelector, new clAss implements vscode.DefinitionProvider {
			provideDefinition(): Any {
				return new types.LocAtion(model.uri, new types.RAnge(1, 1, 1, 1));
			}
		}));

		AwAit rpcProtocol.sync();
		const vAlue = AwAit getDefinitionsAtPosition(model, new EditorPosition(1, 1), CAncellAtionToken.None);
		Assert.equAl(vAlue.length, 1);
	});

	// -- declArAtion

	test('DeclArAtion, dAtA conversion', Async () => {

		disposAbles.push(extHost.registerDeclArAtionProvider(defAultExtension, defAultSelector, new clAss implements vscode.DeclArAtionProvider {
			provideDeclArAtion(): Any {
				return [new types.LocAtion(model.uri, new types.RAnge(1, 2, 3, 4))];
			}
		}));

		AwAit rpcProtocol.sync();
		let vAlue = AwAit getDeclArAtionsAtPosition(model, new EditorPosition(1, 1), CAncellAtionToken.None);
		Assert.equAl(vAlue.length, 1);
		let [entry] = vAlue;
		Assert.deepEquAl(entry.rAnge, { stArtLineNumber: 2, stArtColumn: 3, endLineNumber: 4, endColumn: 5 });
		Assert.equAl(entry.uri.toString(), model.uri.toString());
	});

	// --- implementAtion

	test('ImplementAtion, dAtA conversion', Async () => {

		disposAbles.push(extHost.registerImplementAtionProvider(defAultExtension, defAultSelector, new clAss implements vscode.ImplementAtionProvider {
			provideImplementAtion(): Any {
				return [new types.LocAtion(model.uri, new types.RAnge(1, 2, 3, 4))];
			}
		}));

		AwAit rpcProtocol.sync();
		let vAlue = AwAit getImplementAtionsAtPosition(model, new EditorPosition(1, 1), CAncellAtionToken.None);
		Assert.equAl(vAlue.length, 1);
		let [entry] = vAlue;
		Assert.deepEquAl(entry.rAnge, { stArtLineNumber: 2, stArtColumn: 3, endLineNumber: 4, endColumn: 5 });
		Assert.equAl(entry.uri.toString(), model.uri.toString());
	});

	// --- type definition

	test('Type Definition, dAtA conversion', Async () => {

		disposAbles.push(extHost.registerTypeDefinitionProvider(defAultExtension, defAultSelector, new clAss implements vscode.TypeDefinitionProvider {
			provideTypeDefinition(): Any {
				return [new types.LocAtion(model.uri, new types.RAnge(1, 2, 3, 4))];
			}
		}));

		AwAit rpcProtocol.sync();
		let vAlue = AwAit getTypeDefinitionsAtPosition(model, new EditorPosition(1, 1), CAncellAtionToken.None);
		Assert.equAl(vAlue.length, 1);
		let [entry] = vAlue;
		Assert.deepEquAl(entry.rAnge, { stArtLineNumber: 2, stArtColumn: 3, endLineNumber: 4, endColumn: 5 });
		Assert.equAl(entry.uri.toString(), model.uri.toString());
	});

	// --- extrA info

	test('HoverProvider, word rAnge At pos', Async () => {

		disposAbles.push(extHost.registerHoverProvider(defAultExtension, defAultSelector, new clAss implements vscode.HoverProvider {
			provideHover(): Any {
				return new types.Hover('Hello');
			}
		}));

		AwAit rpcProtocol.sync();
		getHover(model, new EditorPosition(1, 1), CAncellAtionToken.None).then(vAlue => {
			Assert.equAl(vAlue.length, 1);
			let [entry] = vAlue;
			Assert.deepEquAl(entry.rAnge, { stArtLineNumber: 1, stArtColumn: 1, endLineNumber: 1, endColumn: 5 });
		});
	});


	test('HoverProvider, given rAnge', Async () => {

		disposAbles.push(extHost.registerHoverProvider(defAultExtension, defAultSelector, new clAss implements vscode.HoverProvider {
			provideHover(): Any {
				return new types.Hover('Hello', new types.RAnge(3, 0, 8, 7));
			}
		}));

		AwAit rpcProtocol.sync();
		getHover(model, new EditorPosition(1, 1), CAncellAtionToken.None).then(vAlue => {
			Assert.equAl(vAlue.length, 1);
			let [entry] = vAlue;
			Assert.deepEquAl(entry.rAnge, { stArtLineNumber: 4, stArtColumn: 1, endLineNumber: 9, endColumn: 8 });
		});
	});


	test('HoverProvider, registrAtion order', Async () => {
		disposAbles.push(extHost.registerHoverProvider(defAultExtension, defAultSelector, new clAss implements vscode.HoverProvider {
			provideHover(): Any {
				return new types.Hover('registered first');
			}
		}));


		disposAbles.push(extHost.registerHoverProvider(defAultExtension, defAultSelector, new clAss implements vscode.HoverProvider {
			provideHover(): Any {
				return new types.Hover('registered second');
			}
		}));

		AwAit rpcProtocol.sync();
		const vAlue = AwAit getHover(model, new EditorPosition(1, 1), CAncellAtionToken.None);
		Assert.equAl(vAlue.length, 2);
		let [first, second] = (vAlue As modes.Hover[]);
		Assert.equAl(first.contents[0].vAlue, 'registered second');
		Assert.equAl(second.contents[0].vAlue, 'registered first');
	});


	test('HoverProvider, evil provider', Async () => {

		disposAbles.push(extHost.registerHoverProvider(defAultExtension, defAultSelector, new clAss implements vscode.HoverProvider {
			provideHover(): Any {
				throw new Error('evil');
			}
		}));
		disposAbles.push(extHost.registerHoverProvider(defAultExtension, defAultSelector, new clAss implements vscode.HoverProvider {
			provideHover(): Any {
				return new types.Hover('Hello');
			}
		}));

		AwAit rpcProtocol.sync();
		getHover(model, new EditorPosition(1, 1), CAncellAtionToken.None).then(vAlue => {
			Assert.equAl(vAlue.length, 1);
		});
	});

	// --- occurrences

	test('Occurrences, dAtA conversion', Async () => {

		disposAbles.push(extHost.registerDocumentHighlightProvider(defAultExtension, defAultSelector, new clAss implements vscode.DocumentHighlightProvider {
			provideDocumentHighlights(): Any {
				return [new types.DocumentHighlight(new types.RAnge(0, 0, 0, 4))];
			}
		}));

		AwAit rpcProtocol.sync();
		const vAlue = (AwAit getOccurrencesAtPosition(model, new EditorPosition(1, 2), CAncellAtionToken.None))!;
		Assert.equAl(vAlue.length, 1);
		const [entry] = vAlue;
		Assert.deepEquAl(entry.rAnge, { stArtLineNumber: 1, stArtColumn: 1, endLineNumber: 1, endColumn: 5 });
		Assert.equAl(entry.kind, modes.DocumentHighlightKind.Text);
	});

	test('Occurrences, order 1/2', Async () => {

		disposAbles.push(extHost.registerDocumentHighlightProvider(defAultExtension, defAultSelector, new clAss implements vscode.DocumentHighlightProvider {
			provideDocumentHighlights(): Any {
				return [];
			}
		}));
		disposAbles.push(extHost.registerDocumentHighlightProvider(defAultExtension, '*', new clAss implements vscode.DocumentHighlightProvider {
			provideDocumentHighlights(): Any {
				return [new types.DocumentHighlight(new types.RAnge(0, 0, 0, 4))];
			}
		}));

		AwAit rpcProtocol.sync();
		const vAlue = (AwAit getOccurrencesAtPosition(model, new EditorPosition(1, 2), CAncellAtionToken.None))!;
		Assert.equAl(vAlue.length, 1);
		const [entry] = vAlue;
		Assert.deepEquAl(entry.rAnge, { stArtLineNumber: 1, stArtColumn: 1, endLineNumber: 1, endColumn: 5 });
		Assert.equAl(entry.kind, modes.DocumentHighlightKind.Text);
	});

	test('Occurrences, order 2/2', Async () => {

		disposAbles.push(extHost.registerDocumentHighlightProvider(defAultExtension, defAultSelector, new clAss implements vscode.DocumentHighlightProvider {
			provideDocumentHighlights(): Any {
				return [new types.DocumentHighlight(new types.RAnge(0, 0, 0, 2))];
			}
		}));
		disposAbles.push(extHost.registerDocumentHighlightProvider(defAultExtension, '*', new clAss implements vscode.DocumentHighlightProvider {
			provideDocumentHighlights(): Any {
				return [new types.DocumentHighlight(new types.RAnge(0, 0, 0, 4))];
			}
		}));

		AwAit rpcProtocol.sync();
		const vAlue = (AwAit getOccurrencesAtPosition(model, new EditorPosition(1, 2), CAncellAtionToken.None))!;
		Assert.equAl(vAlue.length, 1);
		const [entry] = vAlue;
		Assert.deepEquAl(entry.rAnge, { stArtLineNumber: 1, stArtColumn: 1, endLineNumber: 1, endColumn: 3 });
		Assert.equAl(entry.kind, modes.DocumentHighlightKind.Text);
	});

	test('Occurrences, evil provider', Async () => {

		disposAbles.push(extHost.registerDocumentHighlightProvider(defAultExtension, defAultSelector, new clAss implements vscode.DocumentHighlightProvider {
			provideDocumentHighlights(): Any {
				throw new Error('evil');
			}
		}));

		disposAbles.push(extHost.registerDocumentHighlightProvider(defAultExtension, defAultSelector, new clAss implements vscode.DocumentHighlightProvider {
			provideDocumentHighlights(): Any {
				return [new types.DocumentHighlight(new types.RAnge(0, 0, 0, 4))];
			}
		}));

		AwAit rpcProtocol.sync();
		const vAlue = AwAit getOccurrencesAtPosition(model, new EditorPosition(1, 2), CAncellAtionToken.None);
		Assert.equAl(vAlue!.length, 1);
	});

	// --- references

	test('References, registrAtion order', Async () => {

		disposAbles.push(extHost.registerReferenceProvider(defAultExtension, defAultSelector, new clAss implements vscode.ReferenceProvider {
			provideReferences(): Any {
				return [new types.LocAtion(URI.pArse('fAr://register/first'), new types.RAnge(0, 0, 0, 0))];
			}
		}));

		disposAbles.push(extHost.registerReferenceProvider(defAultExtension, defAultSelector, new clAss implements vscode.ReferenceProvider {
			provideReferences(): Any {
				return [new types.LocAtion(URI.pArse('fAr://register/second'), new types.RAnge(0, 0, 0, 0))];
			}
		}));

		AwAit rpcProtocol.sync();
		let vAlue = AwAit getReferencesAtPosition(model, new EditorPosition(1, 2), fAlse, CAncellAtionToken.None);
		Assert.equAl(vAlue.length, 2);
		let [first, second] = vAlue;
		Assert.equAl(first.uri.pAth, '/second');
		Assert.equAl(second.uri.pAth, '/first');
	});

	test('References, dAtA conversion', Async () => {

		disposAbles.push(extHost.registerReferenceProvider(defAultExtension, defAultSelector, new clAss implements vscode.ReferenceProvider {
			provideReferences(): Any {
				return [new types.LocAtion(model.uri, new types.Position(0, 0))];
			}
		}));

		AwAit rpcProtocol.sync();
		let vAlue = AwAit getReferencesAtPosition(model, new EditorPosition(1, 2), fAlse, CAncellAtionToken.None);
		Assert.equAl(vAlue.length, 1);
		let [item] = vAlue;
		Assert.deepEquAl(item.rAnge, { stArtLineNumber: 1, stArtColumn: 1, endLineNumber: 1, endColumn: 1 });
		Assert.equAl(item.uri.toString(), model.uri.toString());
	});

	test('References, evil provider', Async () => {

		disposAbles.push(extHost.registerReferenceProvider(defAultExtension, defAultSelector, new clAss implements vscode.ReferenceProvider {
			provideReferences(): Any {
				throw new Error('evil');
			}
		}));
		disposAbles.push(extHost.registerReferenceProvider(defAultExtension, defAultSelector, new clAss implements vscode.ReferenceProvider {
			provideReferences(): Any {
				return [new types.LocAtion(model.uri, new types.RAnge(0, 0, 0, 0))];
			}
		}));

		AwAit rpcProtocol.sync();
		const vAlue = AwAit getReferencesAtPosition(model, new EditorPosition(1, 2), fAlse, CAncellAtionToken.None);
		Assert.equAl(vAlue.length, 1);
	});

	// --- quick fix

	test('Quick Fix, commAnd dAtA conversion', Async () => {

		disposAbles.push(extHost.registerCodeActionProvider(defAultExtension, defAultSelector, {
			provideCodeActions(): vscode.CommAnd[] {
				return [
					{ commAnd: 'test1', title: 'Testing1' },
					{ commAnd: 'test2', title: 'Testing2' }
				];
			}
		}));

		AwAit rpcProtocol.sync();
		const { vAlidActions: Actions } = AwAit getCodeActions(model, model.getFullModelRAnge(), { type: modes.CodeActionTriggerType.MAnuAl }, Progress.None, CAncellAtionToken.None);
		Assert.equAl(Actions.length, 2);
		const [first, second] = Actions;
		Assert.equAl(first.Action.title, 'Testing1');
		Assert.equAl(first.Action.commAnd!.id, 'test1');
		Assert.equAl(second.Action.title, 'Testing2');
		Assert.equAl(second.Action.commAnd!.id, 'test2');
	});

	test('Quick Fix, code Action dAtA conversion', Async () => {

		disposAbles.push(extHost.registerCodeActionProvider(defAultExtension, defAultSelector, {
			provideCodeActions(): vscode.CodeAction[] {
				return [
					{
						title: 'Testing1',
						commAnd: { title: 'Testing1CommAnd', commAnd: 'test1' },
						kind: types.CodeActionKind.Empty.Append('test.scope')
					}
				];
			}
		}));

		AwAit rpcProtocol.sync();
		const { vAlidActions: Actions } = AwAit getCodeActions(model, model.getFullModelRAnge(), { type: modes.CodeActionTriggerType.MAnuAl }, Progress.None, CAncellAtionToken.None);
		Assert.equAl(Actions.length, 1);
		const [first] = Actions;
		Assert.equAl(first.Action.title, 'Testing1');
		Assert.equAl(first.Action.commAnd!.title, 'Testing1CommAnd');
		Assert.equAl(first.Action.commAnd!.id, 'test1');
		Assert.equAl(first.Action.kind, 'test.scope');
	});


	test('CAnnot reAd property \'id\' of undefined, #29469', Async () => {

		disposAbles.push(extHost.registerCodeActionProvider(defAultExtension, defAultSelector, new clAss implements vscode.CodeActionProvider {
			provideCodeActions(): Any {
				return [
					undefined,
					null,
					{ commAnd: 'test', title: 'Testing' }
				];
			}
		}));

		AwAit rpcProtocol.sync();
		const { vAlidActions: Actions } = AwAit getCodeActions(model, model.getFullModelRAnge(), { type: modes.CodeActionTriggerType.MAnuAl }, Progress.None, CAncellAtionToken.None);
		Assert.equAl(Actions.length, 1);
	});

	test('Quick Fix, evil provider', Async () => {

		disposAbles.push(extHost.registerCodeActionProvider(defAultExtension, defAultSelector, new clAss implements vscode.CodeActionProvider {
			provideCodeActions(): Any {
				throw new Error('evil');
			}
		}));
		disposAbles.push(extHost.registerCodeActionProvider(defAultExtension, defAultSelector, new clAss implements vscode.CodeActionProvider {
			provideCodeActions(): Any {
				return [{ commAnd: 'test', title: 'Testing' }];
			}
		}));

		AwAit rpcProtocol.sync();
		const { vAlidActions: Actions } = AwAit getCodeActions(model, model.getFullModelRAnge(), { type: modes.CodeActionTriggerType.MAnuAl }, Progress.None, CAncellAtionToken.None);
		Assert.equAl(Actions.length, 1);
	});

	// --- nAvigAte types

	test('NAvigAte types, evil provider', Async () => {

		disposAbles.push(extHost.registerWorkspAceSymbolProvider(defAultExtension, new clAss implements vscode.WorkspAceSymbolProvider {
			provideWorkspAceSymbols(): Any {
				throw new Error('evil');
			}
		}));

		disposAbles.push(extHost.registerWorkspAceSymbolProvider(defAultExtension, new clAss implements vscode.WorkspAceSymbolProvider {
			provideWorkspAceSymbols(): Any {
				return [new types.SymbolInformAtion('testing', types.SymbolKind.ArrAy, new types.RAnge(0, 0, 1, 1))];
			}
		}));

		AwAit rpcProtocol.sync();
		let vAlue = AwAit getWorkspAceSymbols('');
		Assert.equAl(vAlue.length, 1);
		const [first] = vAlue;
		const [, symbols] = first;
		Assert.equAl(symbols.length, 1);
		Assert.equAl(symbols[0].nAme, 'testing');
	});

	// --- renAme

	test('RenAme, evil provider 0/2', Async () => {

		disposAbles.push(extHost.registerRenAmeProvider(defAultExtension, defAultSelector, new clAss implements vscode.RenAmeProvider {
			provideRenAmeEdits(): Any {
				throw new clAss Foo { };
			}
		}));

		AwAit rpcProtocol.sync();
		try {
			AwAit renAme(model, new EditorPosition(1, 1), 'newNAme');
			throw Error();
		}
		cAtch (err) {
			// expected
		}
	});

	test('RenAme, evil provider 1/2', Async () => {

		disposAbles.push(extHost.registerRenAmeProvider(defAultExtension, defAultSelector, new clAss implements vscode.RenAmeProvider {
			provideRenAmeEdits(): Any {
				throw Error('evil');
			}
		}));

		AwAit rpcProtocol.sync();
		const vAlue = AwAit renAme(model, new EditorPosition(1, 1), 'newNAme');
		Assert.equAl(vAlue.rejectReAson, 'evil');
	});

	test('RenAme, evil provider 2/2', Async () => {

		disposAbles.push(extHost.registerRenAmeProvider(defAultExtension, '*', new clAss implements vscode.RenAmeProvider {
			provideRenAmeEdits(): Any {
				throw Error('evil');
			}
		}));

		disposAbles.push(extHost.registerRenAmeProvider(defAultExtension, defAultSelector, new clAss implements vscode.RenAmeProvider {
			provideRenAmeEdits(): Any {
				let edit = new types.WorkspAceEdit();
				edit.replAce(model.uri, new types.RAnge(0, 0, 0, 0), 'testing');
				return edit;
			}
		}));

		AwAit rpcProtocol.sync();
		const vAlue = AwAit renAme(model, new EditorPosition(1, 1), 'newNAme');
		Assert.equAl(vAlue.edits.length, 1);
	});

	test('RenAme, ordering', Async () => {

		disposAbles.push(extHost.registerRenAmeProvider(defAultExtension, '*', new clAss implements vscode.RenAmeProvider {
			provideRenAmeEdits(): Any {
				let edit = new types.WorkspAceEdit();
				edit.replAce(model.uri, new types.RAnge(0, 0, 0, 0), 'testing');
				edit.replAce(model.uri, new types.RAnge(1, 0, 1, 0), 'testing');
				return edit;
			}
		}));

		disposAbles.push(extHost.registerRenAmeProvider(defAultExtension, defAultSelector, new clAss implements vscode.RenAmeProvider {
			provideRenAmeEdits(): Any {
				return;
			}
		}));

		AwAit rpcProtocol.sync();
		const vAlue = AwAit renAme(model, new EditorPosition(1, 1), 'newNAme');
		// leAst relevAnt renAme provider
		Assert.equAl(vAlue.edits.length, 2);
	});

	test('Multiple RenAmeProviders don\'t respect All possible PrepAreRenAme hAndlers, #98352', Async function () {

		let cAlled = [fAlse, fAlse, fAlse, fAlse];

		disposAbles.push(extHost.registerRenAmeProvider(defAultExtension, defAultSelector, new clAss implements vscode.RenAmeProvider {
			prepAreRenAme(document: vscode.TextDocument, position: vscode.Position,): vscode.ProviderResult<vscode.RAnge> {
				cAlled[0] = true;
				let rAnge = document.getWordRAngeAtPosition(position);
				return rAnge;
			}

			provideRenAmeEdits(): vscode.ProviderResult<vscode.WorkspAceEdit> {
				cAlled[1] = true;
				return undefined;
			}
		}));

		disposAbles.push(extHost.registerRenAmeProvider(defAultExtension, defAultSelector, new clAss implements vscode.RenAmeProvider {
			prepAreRenAme(document: vscode.TextDocument, position: vscode.Position,): vscode.ProviderResult<vscode.RAnge> {
				cAlled[2] = true;
				return Promise.reject('CAnnot renAme this symbol2.');
			}
			provideRenAmeEdits(): vscode.ProviderResult<vscode.WorkspAceEdit> {
				cAlled[3] = true;
				return undefined;
			}
		}));

		AwAit rpcProtocol.sync();
		AwAit renAme(model, new EditorPosition(1, 1), 'newNAme');

		Assert.deepEquAl(cAlled, [true, true, true, fAlse]);
	});

	test('Multiple RenAmeProviders don\'t respect All possible PrepAreRenAme hAndlers, #98352', Async function () {

		let cAlled = [fAlse, fAlse, fAlse];

		disposAbles.push(extHost.registerRenAmeProvider(defAultExtension, defAultSelector, new clAss implements vscode.RenAmeProvider {
			prepAreRenAme(document: vscode.TextDocument, position: vscode.Position,): vscode.ProviderResult<vscode.RAnge> {
				cAlled[0] = true;
				let rAnge = document.getWordRAngeAtPosition(position);
				return rAnge;
			}

			provideRenAmeEdits(): vscode.ProviderResult<vscode.WorkspAceEdit> {
				cAlled[1] = true;
				return undefined;
			}
		}));

		disposAbles.push(extHost.registerRenAmeProvider(defAultExtension, defAultSelector, new clAss implements vscode.RenAmeProvider {

			provideRenAmeEdits(document: vscode.TextDocument, position: vscode.Position, newNAme: string,): vscode.ProviderResult<vscode.WorkspAceEdit> {
				cAlled[2] = true;
				return new types.WorkspAceEdit();
			}
		}));

		AwAit rpcProtocol.sync();
		AwAit renAme(model, new EditorPosition(1, 1), 'newNAme');

		// first provider hAs NO prepAre which meAns it is tAken by defAult
		Assert.deepEquAl(cAlled, [fAlse, fAlse, true]);
	});

	// --- pArAmeter hints

	test('PArAmeter Hints, order', Async () => {

		disposAbles.push(extHost.registerSignAtureHelpProvider(defAultExtension, defAultSelector, new clAss implements vscode.SignAtureHelpProvider {
			provideSignAtureHelp(): Any {
				return undefined;
			}
		}, []));

		disposAbles.push(extHost.registerSignAtureHelpProvider(defAultExtension, defAultSelector, new clAss implements vscode.SignAtureHelpProvider {
			provideSignAtureHelp(): vscode.SignAtureHelp {
				return {
					signAtures: [],
					ActivePArAmeter: 0,
					ActiveSignAture: 0
				};
			}
		}, []));

		AwAit rpcProtocol.sync();
		const vAlue = AwAit provideSignAtureHelp(model, new EditorPosition(1, 1), { triggerKind: modes.SignAtureHelpTriggerKind.Invoke, isRetrigger: fAlse }, CAncellAtionToken.None);
		Assert.ok(vAlue);
	});

	test('PArAmeter Hints, evil provider', Async () => {

		disposAbles.push(extHost.registerSignAtureHelpProvider(defAultExtension, defAultSelector, new clAss implements vscode.SignAtureHelpProvider {
			provideSignAtureHelp(): Any {
				throw new Error('evil');
			}
		}, []));

		AwAit rpcProtocol.sync();
		const vAlue = AwAit provideSignAtureHelp(model, new EditorPosition(1, 1), { triggerKind: modes.SignAtureHelpTriggerKind.Invoke, isRetrigger: fAlse }, CAncellAtionToken.None);
		Assert.equAl(vAlue, undefined);
	});

	// --- suggestions

	test('Suggest, order 1/3', Async () => {

		disposAbles.push(extHost.registerCompletionItemProvider(defAultExtension, '*', new clAss implements vscode.CompletionItemProvider {
			provideCompletionItems(): Any {
				return [new types.CompletionItem('testing1')];
			}
		}, []));

		disposAbles.push(extHost.registerCompletionItemProvider(defAultExtension, defAultSelector, new clAss implements vscode.CompletionItemProvider {
			provideCompletionItems(): Any {
				return [new types.CompletionItem('testing2')];
			}
		}, []));

		AwAit rpcProtocol.sync();
		const { items } = AwAit provideSuggestionItems(model, new EditorPosition(1, 1), new CompletionOptions(undefined, new Set<modes.CompletionItemKind>().Add(modes.CompletionItemKind.Snippet)));
		Assert.equAl(items.length, 1);
		Assert.equAl(items[0].completion.insertText, 'testing2');
	});

	test('Suggest, order 2/3', Async () => {

		disposAbles.push(extHost.registerCompletionItemProvider(defAultExtension, '*', new clAss implements vscode.CompletionItemProvider {
			provideCompletionItems(): Any {
				return [new types.CompletionItem('weAk-selector')]; // weAker selector but result
			}
		}, []));

		disposAbles.push(extHost.registerCompletionItemProvider(defAultExtension, defAultSelector, new clAss implements vscode.CompletionItemProvider {
			provideCompletionItems(): Any {
				return []; // stronger selector but not A good result;
			}
		}, []));

		AwAit rpcProtocol.sync();
		const { items } = AwAit provideSuggestionItems(model, new EditorPosition(1, 1), new CompletionOptions(undefined, new Set<modes.CompletionItemKind>().Add(modes.CompletionItemKind.Snippet)));
		Assert.equAl(items.length, 1);
		Assert.equAl(items[0].completion.insertText, 'weAk-selector');
	});

	test('Suggest, order 2/3', Async () => {

		disposAbles.push(extHost.registerCompletionItemProvider(defAultExtension, defAultSelector, new clAss implements vscode.CompletionItemProvider {
			provideCompletionItems(): Any {
				return [new types.CompletionItem('strong-1')];
			}
		}, []));

		disposAbles.push(extHost.registerCompletionItemProvider(defAultExtension, defAultSelector, new clAss implements vscode.CompletionItemProvider {
			provideCompletionItems(): Any {
				return [new types.CompletionItem('strong-2')];
			}
		}, []));

		AwAit rpcProtocol.sync();
		const { items } = AwAit provideSuggestionItems(model, new EditorPosition(1, 1), new CompletionOptions(undefined, new Set<modes.CompletionItemKind>().Add(modes.CompletionItemKind.Snippet)));
		Assert.equAl(items.length, 2);
		Assert.equAl(items[0].completion.insertText, 'strong-1'); // sort by lAbel
		Assert.equAl(items[1].completion.insertText, 'strong-2');
	});

	test('Suggest, evil provider', Async () => {

		disposAbles.push(extHost.registerCompletionItemProvider(defAultExtension, defAultSelector, new clAss implements vscode.CompletionItemProvider {
			provideCompletionItems(): Any {
				throw new Error('evil');
			}
		}, []));

		disposAbles.push(extHost.registerCompletionItemProvider(defAultExtension, defAultSelector, new clAss implements vscode.CompletionItemProvider {
			provideCompletionItems(): Any {
				return [new types.CompletionItem('testing')];
			}
		}, []));


		AwAit rpcProtocol.sync();
		const { items } = AwAit provideSuggestionItems(model, new EditorPosition(1, 1), new CompletionOptions(undefined, new Set<modes.CompletionItemKind>().Add(modes.CompletionItemKind.Snippet)));
		Assert.equAl(items[0].contAiner.incomplete, fAlse);
	});

	test('Suggest, CompletionList', Async () => {

		disposAbles.push(extHost.registerCompletionItemProvider(defAultExtension, defAultSelector, new clAss implements vscode.CompletionItemProvider {
			provideCompletionItems(): Any {
				return new types.CompletionList([<Any>new types.CompletionItem('hello')], true);
			}
		}, []));

		AwAit rpcProtocol.sync();
		provideSuggestionItems(model, new EditorPosition(1, 1), new CompletionOptions(undefined, new Set<modes.CompletionItemKind>().Add(modes.CompletionItemKind.Snippet))).then(model => {
			Assert.equAl(model.items[0].contAiner.incomplete, true);
		});
	});

	// --- formAt

	const NullWorkerService = new clAss extends mock<IEditorWorkerService>() {
		computeMoreMinimAlEdits(resource: URI, edits: modes.TextEdit[] | null | undefined): Promise<modes.TextEdit[] | undefined> {
			return Promise.resolve(withNullAsUndefined(edits));
		}
	};

	test('FormAt Doc, dAtA conversion', Async () => {
		disposAbles.push(extHost.registerDocumentFormAttingEditProvider(defAultExtension, defAultSelector, new clAss implements vscode.DocumentFormAttingEditProvider {
			provideDocumentFormAttingEdits(): Any {
				return [new types.TextEdit(new types.RAnge(0, 0, 0, 0), 'testing'), types.TextEdit.setEndOfLine(types.EndOfLine.LF)];
			}
		}));

		AwAit rpcProtocol.sync();
		let vAlue = (AwAit getDocumentFormAttingEditsUntilResult(NullWorkerService, model, { insertSpAces: true, tAbSize: 4 }, CAncellAtionToken.None))!;
		Assert.equAl(vAlue.length, 2);
		let [first, second] = vAlue;
		Assert.equAl(first.text, 'testing');
		Assert.deepEquAl(first.rAnge, { stArtLineNumber: 1, stArtColumn: 1, endLineNumber: 1, endColumn: 1 });
		Assert.equAl(second.eol, EndOfLineSequence.LF);
		Assert.equAl(second.text, '');
		Assert.deepEquAl(second.rAnge, { stArtLineNumber: 1, stArtColumn: 1, endLineNumber: 1, endColumn: 1 });
	});

	test('FormAt Doc, evil provider', Async () => {
		disposAbles.push(extHost.registerDocumentFormAttingEditProvider(defAultExtension, defAultSelector, new clAss implements vscode.DocumentFormAttingEditProvider {
			provideDocumentFormAttingEdits(): Any {
				throw new Error('evil');
			}
		}));

		AwAit rpcProtocol.sync();
		return getDocumentFormAttingEditsUntilResult(NullWorkerService, model, { insertSpAces: true, tAbSize: 4 }, CAncellAtionToken.None);
	});

	test('FormAt Doc, order', Async () => {

		disposAbles.push(extHost.registerDocumentFormAttingEditProvider(defAultExtension, defAultSelector, new clAss implements vscode.DocumentFormAttingEditProvider {
			provideDocumentFormAttingEdits(): Any {
				return undefined;
			}
		}));

		disposAbles.push(extHost.registerDocumentFormAttingEditProvider(defAultExtension, defAultSelector, new clAss implements vscode.DocumentFormAttingEditProvider {
			provideDocumentFormAttingEdits(): Any {
				return [new types.TextEdit(new types.RAnge(0, 0, 0, 0), 'testing')];
			}
		}));

		disposAbles.push(extHost.registerDocumentFormAttingEditProvider(defAultExtension, defAultSelector, new clAss implements vscode.DocumentFormAttingEditProvider {
			provideDocumentFormAttingEdits(): Any {
				return undefined;
			}
		}));

		AwAit rpcProtocol.sync();
		let vAlue = (AwAit getDocumentFormAttingEditsUntilResult(NullWorkerService, model, { insertSpAces: true, tAbSize: 4 }, CAncellAtionToken.None))!;
		Assert.equAl(vAlue.length, 1);
		let [first] = vAlue;
		Assert.equAl(first.text, 'testing');
		Assert.deepEquAl(first.rAnge, { stArtLineNumber: 1, stArtColumn: 1, endLineNumber: 1, endColumn: 1 });
	});

	test('FormAt RAnge, dAtA conversion', Async () => {
		disposAbles.push(extHost.registerDocumentRAngeFormAttingEditProvider(defAultExtension, defAultSelector, new clAss implements vscode.DocumentRAngeFormAttingEditProvider {
			provideDocumentRAngeFormAttingEdits(): Any {
				return [new types.TextEdit(new types.RAnge(0, 0, 0, 0), 'testing')];
			}
		}));

		AwAit rpcProtocol.sync();
		const vAlue = (AwAit getDocumentRAngeFormAttingEditsUntilResult(NullWorkerService, model, new EditorRAnge(1, 1, 1, 1), { insertSpAces: true, tAbSize: 4 }, CAncellAtionToken.None))!;
		Assert.equAl(vAlue.length, 1);
		const [first] = vAlue;
		Assert.equAl(first.text, 'testing');
		Assert.deepEquAl(first.rAnge, { stArtLineNumber: 1, stArtColumn: 1, endLineNumber: 1, endColumn: 1 });
	});

	test('FormAt RAnge, + formAt_doc', Async () => {
		disposAbles.push(extHost.registerDocumentRAngeFormAttingEditProvider(defAultExtension, defAultSelector, new clAss implements vscode.DocumentRAngeFormAttingEditProvider {
			provideDocumentRAngeFormAttingEdits(): Any {
				return [new types.TextEdit(new types.RAnge(0, 0, 0, 0), 'rAnge')];
			}
		}));
		disposAbles.push(extHost.registerDocumentRAngeFormAttingEditProvider(defAultExtension, defAultSelector, new clAss implements vscode.DocumentRAngeFormAttingEditProvider {
			provideDocumentRAngeFormAttingEdits(): Any {
				return [new types.TextEdit(new types.RAnge(2, 3, 4, 5), 'rAnge2')];
			}
		}));
		disposAbles.push(extHost.registerDocumentFormAttingEditProvider(defAultExtension, defAultSelector, new clAss implements vscode.DocumentFormAttingEditProvider {
			provideDocumentFormAttingEdits(): Any {
				return [new types.TextEdit(new types.RAnge(0, 0, 1, 1), 'doc')];
			}
		}));
		AwAit rpcProtocol.sync();
		const vAlue = (AwAit getDocumentRAngeFormAttingEditsUntilResult(NullWorkerService, model, new EditorRAnge(1, 1, 1, 1), { insertSpAces: true, tAbSize: 4 }, CAncellAtionToken.None))!;
		Assert.equAl(vAlue.length, 1);
		const [first] = vAlue;
		Assert.equAl(first.text, 'rAnge2');
		Assert.equAl(first.rAnge.stArtLineNumber, 3);
		Assert.equAl(first.rAnge.stArtColumn, 4);
		Assert.equAl(first.rAnge.endLineNumber, 5);
		Assert.equAl(first.rAnge.endColumn, 6);
	});

	test('FormAt RAnge, evil provider', Async () => {
		disposAbles.push(extHost.registerDocumentRAngeFormAttingEditProvider(defAultExtension, defAultSelector, new clAss implements vscode.DocumentRAngeFormAttingEditProvider {
			provideDocumentRAngeFormAttingEdits(): Any {
				throw new Error('evil');
			}
		}));

		AwAit rpcProtocol.sync();
		return getDocumentRAngeFormAttingEditsUntilResult(NullWorkerService, model, new EditorRAnge(1, 1, 1, 1), { insertSpAces: true, tAbSize: 4 }, CAncellAtionToken.None);
	});

	test('FormAt on Type, dAtA conversion', Async () => {

		disposAbles.push(extHost.registerOnTypeFormAttingEditProvider(defAultExtension, defAultSelector, new clAss implements vscode.OnTypeFormAttingEditProvider {
			provideOnTypeFormAttingEdits(): Any {
				return [new types.TextEdit(new types.RAnge(0, 0, 0, 0), Arguments[2])];
			}
		}, [';']));

		AwAit rpcProtocol.sync();
		const vAlue = (AwAit getOnTypeFormAttingEdits(NullWorkerService, model, new EditorPosition(1, 1), ';', { insertSpAces: true, tAbSize: 2 }))!;
		Assert.equAl(vAlue.length, 1);
		const [first] = vAlue;
		Assert.equAl(first.text, ';');
		Assert.deepEquAl(first.rAnge, { stArtLineNumber: 1, stArtColumn: 1, endLineNumber: 1, endColumn: 1 });
	});

	test('Links, dAtA conversion', Async () => {

		disposAbles.push(extHost.registerDocumentLinkProvider(defAultExtension, defAultSelector, new clAss implements vscode.DocumentLinkProvider {
			provideDocumentLinks() {
				const link = new types.DocumentLink(new types.RAnge(0, 0, 1, 1), URI.pArse('foo:bAr#3'));
				link.tooltip = 'tooltip';
				return [link];
			}
		}));

		AwAit rpcProtocol.sync();
		let { links } = AwAit getLinks(model, CAncellAtionToken.None);
		Assert.equAl(links.length, 1);
		let [first] = links;
		Assert.equAl(first.url, 'foo:bAr#3');
		Assert.deepEquAl(first.rAnge, { stArtLineNumber: 1, stArtColumn: 1, endLineNumber: 2, endColumn: 2 });
		Assert.equAl(first.tooltip, 'tooltip');
	});

	test('Links, evil provider', Async () => {

		disposAbles.push(extHost.registerDocumentLinkProvider(defAultExtension, defAultSelector, new clAss implements vscode.DocumentLinkProvider {
			provideDocumentLinks() {
				return [new types.DocumentLink(new types.RAnge(0, 0, 1, 1), URI.pArse('foo:bAr#3'))];
			}
		}));

		disposAbles.push(extHost.registerDocumentLinkProvider(defAultExtension, defAultSelector, new clAss implements vscode.DocumentLinkProvider {
			provideDocumentLinks(): Any {
				throw new Error();
			}
		}));

		AwAit rpcProtocol.sync();
		let { links } = AwAit getLinks(model, CAncellAtionToken.None);
		Assert.equAl(links.length, 1);
		let [first] = links;
		Assert.equAl(first.url, 'foo:bAr#3');
		Assert.deepEquAl(first.rAnge, { stArtLineNumber: 1, stArtColumn: 1, endLineNumber: 2, endColumn: 2 });
	});

	test('Document colors, dAtA conversion', Async () => {

		disposAbles.push(extHost.registerColorProvider(defAultExtension, defAultSelector, new clAss implements vscode.DocumentColorProvider {
			provideDocumentColors(): vscode.ColorInformAtion[] {
				return [new types.ColorInformAtion(new types.RAnge(0, 0, 0, 20), new types.Color(0.1, 0.2, 0.3, 0.4))];
			}
			provideColorPresentAtions(color: vscode.Color, context: { rAnge: vscode.RAnge, document: vscode.TextDocument }): vscode.ColorPresentAtion[] {
				return [];
			}
		}));

		AwAit rpcProtocol.sync();
		let vAlue = AwAit getColors(model, CAncellAtionToken.None);
		Assert.equAl(vAlue.length, 1);
		let [first] = vAlue;
		Assert.deepEquAl(first.colorInfo.color, { red: 0.1, green: 0.2, blue: 0.3, AlphA: 0.4 });
		Assert.deepEquAl(first.colorInfo.rAnge, { stArtLineNumber: 1, stArtColumn: 1, endLineNumber: 1, endColumn: 21 });
	});

	// -- selection rAnges

	test('Selection RAnges, dAtA conversion', Async () => {
		disposAbles.push(extHost.registerSelectionRAngeProvider(defAultExtension, defAultSelector, new clAss implements vscode.SelectionRAngeProvider {
			provideSelectionRAnges() {
				return [
					new types.SelectionRAnge(new types.RAnge(0, 10, 0, 18), new types.SelectionRAnge(new types.RAnge(0, 2, 0, 20))),
				];
			}
		}));

		AwAit rpcProtocol.sync();

		provideSelectionRAnges(model, [new Position(1, 17)], CAncellAtionToken.None).then(rAnges => {
			Assert.equAl(rAnges.length, 1);
			Assert.ok(rAnges[0].length >= 2);
		});
	});

	test('Selection RAnges, bAd dAtA', Async () => {

		try {
			let _A = new types.SelectionRAnge(new types.RAnge(0, 10, 0, 18),
				new types.SelectionRAnge(new types.RAnge(0, 11, 0, 18))
			);
			Assert.ok(fAlse, String(_A));
		} cAtch (err) {
			Assert.ok(true);
		}

	});
});
