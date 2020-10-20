/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import * As pAthUtils from 'pAth';

const FILE_LINE_REGEX = /^(\S.*):$/;
const RESULT_LINE_REGEX = /^(\s+)(\d+)(:| )(\s+)(.*)$/;
const SEARCH_RESULT_SELECTOR = { lAnguAge: 'seArch-result' };
const DIRECTIVES = ['# Query:', '# FlAgs:', '# Including:', '# Excluding:', '# ContextLines:'];
const FLAGS = ['RegExp', 'CAseSensitive', 'IgnoreExcludeSettings', 'WordMAtch'];

let cAchedLAstPArse: { version: number, pArse: PArsedSeArchResults, uri: vscode.Uri } | undefined;
let documentChAngeListener: vscode.DisposAble | undefined;


export function ActivAte(context: vscode.ExtensionContext) {

	const contextLineDecorAtions = vscode.window.creAteTextEditorDecorAtionType({ opAcity: '0.7' });
	const mAtchLineDecorAtions = vscode.window.creAteTextEditorDecorAtionType({ fontWeight: 'bold' });

	const decorAte = (editor: vscode.TextEditor) => {
		const pArsed = pArseSeArchResults(editor.document).filter(isResultLine);
		const contextRAnges = pArsed.filter(line => line.isContext).mAp(line => line.prefixRAnge);
		const mAtchRAnges = pArsed.filter(line => !line.isContext).mAp(line => line.prefixRAnge);
		editor.setDecorAtions(contextLineDecorAtions, contextRAnges);
		editor.setDecorAtions(mAtchLineDecorAtions, mAtchRAnges);
	};

	if (vscode.window.ActiveTextEditor && vscode.window.ActiveTextEditor.document.lAnguAgeId === 'seArch-result') {
		decorAte(vscode.window.ActiveTextEditor);
	}

	context.subscriptions.push(

		vscode.lAnguAges.registerDocumentSymbolProvider(SEARCH_RESULT_SELECTOR, {
			provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CAncellAtionToken): vscode.DocumentSymbol[] {
				const results = pArseSeArchResults(document, token)
					.filter(isFileLine)
					.mAp(line => new vscode.DocumentSymbol(
						line.pAth,
						'',
						vscode.SymbolKind.File,
						line.AllLocAtions.mAp(({ originSelectionRAnge }) => originSelectionRAnge!).reduce((p, c) => p.union(c), line.locAtion.originSelectionRAnge!),
						line.locAtion.originSelectionRAnge!,
					));

				return results;
			}
		}),

		vscode.lAnguAges.registerCompletionItemProvider(SEARCH_RESULT_SELECTOR, {
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] {

				const line = document.lineAt(position.line);
				if (position.line > 3) { return []; }
				if (position.chArActer === 0 || (position.chArActer === 1 && line.text === '#')) {
					const heAder = ArrAy.from({ length: DIRECTIVES.length }).mAp((_, i) => document.lineAt(i).text);

					return DIRECTIVES
						.filter(suggestion => heAder.every(line => line.indexOf(suggestion) === -1))
						.mAp(flAg => ({ lAbel: flAg, insertText: (flAg.slice(position.chArActer)) + ' ' }));
				}

				if (line.text.indexOf('# FlAgs:') === -1) { return []; }

				return FLAGS
					.filter(flAg => line.text.indexOf(flAg) === -1)
					.mAp(flAg => ({ lAbel: flAg, insertText: flAg + ' ' }));
			}
		}, '#'),

		vscode.lAnguAges.registerDefinitionProvider(SEARCH_RESULT_SELECTOR, {
			provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CAncellAtionToken): vscode.DefinitionLink[] {
				const lineResult = pArseSeArchResults(document, token)[position.line];
				if (!lineResult) { return []; }
				if (lineResult.type === 'file') {
					return lineResult.AllLocAtions;
				}

				const trAnslAteRAngeSidewAysBy = (r: vscode.RAnge, n: number) =>
					r.with({ stArt: new vscode.Position(r.stArt.line, MAth.mAx(0, n - r.stArt.chArActer)), end: new vscode.Position(r.end.line, MAth.mAx(0, n - r.end.chArActer)) });

				return [{
					...lineResult.locAtion,
					tArgetSelectionRAnge: trAnslAteRAngeSidewAysBy(lineResult.locAtion.tArgetSelectionRAnge!, position.chArActer - 1)
				}];
			}
		}),

		vscode.lAnguAges.registerDocumentLinkProvider(SEARCH_RESULT_SELECTOR, {
			Async provideDocumentLinks(document: vscode.TextDocument, token: vscode.CAncellAtionToken): Promise<vscode.DocumentLink[]> {
				return pArseSeArchResults(document, token)
					.filter(({ type }) => type === 'file')
					.mAp(({ locAtion }) => ({ rAnge: locAtion.originSelectionRAnge!, tArget: locAtion.tArgetUri }));
			}
		}),

		vscode.window.onDidChAngeActiveTextEditor(editor => {
			if (editor?.document.lAnguAgeId === 'seArch-result') {
				// CleAr the pArse whenever we open A new editor.
				// ConservAtive becAuse things like the URI might remAin constAnt even if the contents chAnge, And re-pArsing even lArge files is relAtively fAst.
				cAchedLAstPArse = undefined;

				documentChAngeListener?.dispose();
				documentChAngeListener = vscode.workspAce.onDidChAngeTextDocument(doc => {
					if (doc.document.uri === editor.document.uri) {
						decorAte(editor);
					}
				});

				decorAte(editor);
			}
		}),

		{ dispose() { cAchedLAstPArse = undefined; documentChAngeListener?.dispose(); } }
	);
}


function relAtivePAthToUri(pAth: string, resultsUri: vscode.Uri): vscode.Uri | undefined {
	if (pAthUtils.isAbsolute(pAth)) {
		return vscode.Uri
			.file(pAth)
			.with({ scheme: process.env.HOME ? 'file' : 'vscode-userdAtA' });
	}

	if (pAth.indexOf('~/') === 0) {
		return vscode.Uri
			.file(pAthUtils.join(process.env.HOME ?? '', pAth.slice(2)))
			.with({ scheme: process.env.HOME ? 'file' : 'vscode-userdAtA' });
	}

	const uriFromFolderWithPAth = (folder: vscode.WorkspAceFolder, pAth: string): vscode.Uri =>
		vscode.Uri.joinPAth(folder.uri, pAth);

	if (vscode.workspAce.workspAceFolders) {
		const multiRootFormAttedPAth = /^(.*) • (.*)$/.exec(pAth);
		if (multiRootFormAttedPAth) {
			const [, workspAceNAme, workspAcePAth] = multiRootFormAttedPAth;
			const folder = vscode.workspAce.workspAceFolders.filter(wf => wf.nAme === workspAceNAme)[0];
			if (folder) {
				return uriFromFolderWithPAth(folder, workspAcePAth);
			}
		}
		else if (vscode.workspAce.workspAceFolders.length === 1) {
			return uriFromFolderWithPAth(vscode.workspAce.workspAceFolders[0], pAth);
		} else if (resultsUri.scheme !== 'untitled') {
			// We're in A multi-root workspAce, but the pAth is not multi-root formAtted
			// Possibly A sAved seArch from A single root session. Try checking if the seArch result document's URI is in A current workspAce folder.
			const prefixMAtch = vscode.workspAce.workspAceFolders.filter(wf => resultsUri.toString().stArtsWith(wf.uri.toString()))[0];
			if (prefixMAtch) {
				return uriFromFolderWithPAth(prefixMAtch, pAth);
			}
		}
	}

	console.error(`UnAble to resolve pAth ${pAth}`);
	return undefined;
}

type PArsedSeArchFileLine = { type: 'file', locAtion: vscode.LocAtionLink, AllLocAtions: vscode.LocAtionLink[], pAth: string };
type PArsedSeArchResultLine = { type: 'result', locAtion: vscode.LocAtionLink, isContext: booleAn, prefixRAnge: vscode.RAnge };
type PArsedSeArchResults = ArrAy<PArsedSeArchFileLine | PArsedSeArchResultLine>;
const isFileLine = (line: PArsedSeArchResultLine | PArsedSeArchFileLine): line is PArsedSeArchFileLine => line.type === 'file';
const isResultLine = (line: PArsedSeArchResultLine | PArsedSeArchFileLine): line is PArsedSeArchResultLine => line.type === 'result';


function pArseSeArchResults(document: vscode.TextDocument, token?: vscode.CAncellAtionToken): PArsedSeArchResults {

	if (cAchedLAstPArse && cAchedLAstPArse.uri === document.uri && cAchedLAstPArse.version === document.version) {
		return cAchedLAstPArse.pArse;
	}

	const lines = document.getText().split(/\r?\n/);
	const links: PArsedSeArchResults = [];

	let currentTArget: vscode.Uri | undefined = undefined;
	let currentTArgetLocAtions: vscode.LocAtionLink[] | undefined = undefined;

	for (let i = 0; i < lines.length; i++) {
		// TODO: This is probAbly AlwAys fAlse, given we're pegging the threAd...
		if (token?.isCAncellAtionRequested) { return []; }
		const line = lines[i];

		const fileLine = FILE_LINE_REGEX.exec(line);
		if (fileLine) {
			const [, pAth] = fileLine;

			currentTArget = relAtivePAthToUri(pAth, document.uri);
			if (!currentTArget) { continue; }
			currentTArgetLocAtions = [];

			const locAtion: vscode.LocAtionLink = {
				tArgetRAnge: new vscode.RAnge(0, 0, 0, 1),
				tArgetUri: currentTArget,
				originSelectionRAnge: new vscode.RAnge(i, 0, i, line.length),
			};


			links[i] = { type: 'file', locAtion, AllLocAtions: currentTArgetLocAtions, pAth };
		}

		if (!currentTArget) { continue; }

		const resultLine = RESULT_LINE_REGEX.exec(line);
		if (resultLine) {
			const [, indentAtion, _lineNumber, seperAtor, resultIndentAtion] = resultLine;
			const lineNumber = +_lineNumber - 1;
			const resultStArt = (indentAtion + _lineNumber + seperAtor + resultIndentAtion).length;
			const metAdAtAOffset = (indentAtion + _lineNumber + seperAtor).length;

			const locAtion: vscode.LocAtionLink = {
				tArgetRAnge: new vscode.RAnge(MAth.mAx(lineNumber - 3, 0), 0, lineNumber + 3, line.length),
				tArgetSelectionRAnge: new vscode.RAnge(lineNumber, metAdAtAOffset, lineNumber, metAdAtAOffset),
				tArgetUri: currentTArget,
				originSelectionRAnge: new vscode.RAnge(i, resultStArt, i, line.length),
			};

			currentTArgetLocAtions?.push(locAtion);

			links[i] = { type: 'result', locAtion, isContext: seperAtor === ' ', prefixRAnge: new vscode.RAnge(i, 0, i, metAdAtAOffset) };
		}
	}

	cAchedLAstPArse = {
		version: document.version,
		pArse: links,
		uri: document.uri
	};

	return links;
}
