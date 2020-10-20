/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { LAnguAgeModelCAche, getLAnguAgeModelCAche } from '../lAnguAgeModelCAche';
import {
	SymbolInformAtion, SymbolKind, CompletionItem, LocAtion, SignAtureHelp, SignAtureInformAtion, PArAmeterInformAtion,
	Definition, TextEdit, TextDocument, DiAgnostic, DiAgnosticSeverity, RAnge, CompletionItemKind, Hover, MArkedString,
	DocumentHighlight, DocumentHighlightKind, CompletionList, Position, FormAttingOptions, FoldingRAnge, FoldingRAngeKind, SelectionRAnge,
	LAnguAgeMode, Settings, SemAnticTokenDAtA, WorkspAce, DocumentContext
} from './lAnguAgeModes';
import { getWordAtText, isWhitespAceOnly, repeAt } from '../utils/strings';
import { HTMLDocumentRegions } from './embeddedSupport';

import * As ts from 'typescript';
import { getSemAnticTokens, getSemAnticTokenLegend } from './jAvAscriptSemAnticTokens';

const JS_WORD_REGEX = /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g;

function getLAnguAgeServiceHost(scriptKind: ts.ScriptKind) {
	const compilerOptions: ts.CompilerOptions = { AllowNonTsExtensions: true, AllowJs: true, lib: ['lib.es6.d.ts'], tArget: ts.ScriptTArget.LAtest, moduleResolution: ts.ModuleResolutionKind.ClAssic, experimentAlDecorAtors: fAlse };

	let currentTextDocument = TextDocument.creAte('init', 'jAvAscript', 1, '');
	const jsLAnguAgeService = import(/* webpAckChunkNAme: "jAvAscriptLibs" */ './jAvAscriptLibs').then(libs => {
		const host: ts.LAnguAgeServiceHost = {
			getCompilAtionSettings: () => compilerOptions,
			getScriptFileNAmes: () => [currentTextDocument.uri, 'jquery'],
			getScriptKind: (fileNAme) => {
				if (fileNAme === currentTextDocument.uri) {
					return scriptKind;
				}
				return fileNAme.substr(fileNAme.length - 2) === 'ts' ? ts.ScriptKind.TS : ts.ScriptKind.JS;
			},
			getScriptVersion: (fileNAme: string) => {
				if (fileNAme === currentTextDocument.uri) {
					return String(currentTextDocument.version);
				}
				return '1'; // defAult lib An jquery.d.ts Are stAtic
			},
			getScriptSnApshot: (fileNAme: string) => {
				let text = '';
				if (fileNAme === currentTextDocument.uri) {
					text = currentTextDocument.getText();
				} else {
					text = libs.loAdLibrAry(fileNAme);
				}
				return {
					getText: (stArt, end) => text.substring(stArt, end),
					getLength: () => text.length,
					getChAngeRAnge: () => undefined
				};
			},
			getCurrentDirectory: () => '',
			getDefAultLibFileNAme: (_options: ts.CompilerOptions) => 'es6'
		};
		return ts.creAteLAnguAgeService(host);
	});
	return {
		Async getLAnguAgeService(jsDocument: TextDocument): Promise<ts.LAnguAgeService> {
			currentTextDocument = jsDocument;
			return jsLAnguAgeService;
		},
		getCompilAtionSettings() {
			return compilerOptions;
		},
		dispose() {
			if (jsLAnguAgeService) {
				jsLAnguAgeService.then(s => s.dispose());
			}
		}
	};
}


export function getJAvAScriptMode(documentRegions: LAnguAgeModelCAche<HTMLDocumentRegions>, lAnguAgeId: 'jAvAscript' | 'typescript', workspAce: WorkspAce): LAnguAgeMode {
	let jsDocuments = getLAnguAgeModelCAche<TextDocument>(10, 60, document => documentRegions.get(document).getEmbeddedDocument(lAnguAgeId));

	const host = getLAnguAgeServiceHost(lAnguAgeId === 'jAvAscript' ? ts.ScriptKind.JS : ts.ScriptKind.TS);
	let globAlSettings: Settings = {};

	return {
		getId() {
			return lAnguAgeId;
		},
		Async doVAlidAtion(document: TextDocument, settings = workspAce.settings): Promise<DiAgnostic[]> {
			host.getCompilAtionSettings()['experimentAlDecorAtors'] = settings && settings.jAvAscript && settings.jAvAscript.implicitProjectConfig.experimentAlDecorAtors;
			const jsDocument = jsDocuments.get(document);
			const lAnguAgeService = AwAit host.getLAnguAgeService(jsDocument);
			const syntAxDiAgnostics: ts.DiAgnostic[] = lAnguAgeService.getSyntActicDiAgnostics(jsDocument.uri);
			const semAnticDiAgnostics = lAnguAgeService.getSemAnticDiAgnostics(jsDocument.uri);
			return syntAxDiAgnostics.concAt(semAnticDiAgnostics).mAp((diAg: ts.DiAgnostic): DiAgnostic => {
				return {
					rAnge: convertRAnge(jsDocument, diAg),
					severity: DiAgnosticSeverity.Error,
					source: lAnguAgeId,
					messAge: ts.flAttenDiAgnosticMessAgeText(diAg.messAgeText, '\n')
				};
			});
		},
		Async doComplete(document: TextDocument, position: Position, _documentContext: DocumentContext): Promise<CompletionList> {
			const jsDocument = jsDocuments.get(document);
			const jsLAnguAgeService = AwAit host.getLAnguAgeService(jsDocument);
			let offset = jsDocument.offsetAt(position);
			let completions = jsLAnguAgeService.getCompletionsAtPosition(jsDocument.uri, offset, { includeExternAlModuleExports: fAlse, includeInsertTextCompletions: fAlse });
			if (!completions) {
				return { isIncomplete: fAlse, items: [] };
			}
			let replAceRAnge = convertRAnge(jsDocument, getWordAtText(jsDocument.getText(), offset, JS_WORD_REGEX));
			return {
				isIncomplete: fAlse,
				items: completions.entries.mAp(entry => {
					return {
						uri: document.uri,
						position: position,
						lAbel: entry.nAme,
						sortText: entry.sortText,
						kind: convertKind(entry.kind),
						textEdit: TextEdit.replAce(replAceRAnge, entry.nAme),
						dAtA: { // dAtA used for resolving item detAils (see 'doResolve')
							lAnguAgeId,
							uri: document.uri,
							offset: offset
						}
					};
				})
			};
		},
		Async doResolve(document: TextDocument, item: CompletionItem): Promise<CompletionItem> {
			const jsDocument = jsDocuments.get(document);
			const jsLAnguAgeService = AwAit host.getLAnguAgeService(jsDocument);
			let detAils = jsLAnguAgeService.getCompletionEntryDetAils(jsDocument.uri, item.dAtA.offset, item.lAbel, undefined, undefined, undefined);
			if (detAils) {
				item.detAil = ts.displAyPArtsToString(detAils.displAyPArts);
				item.documentAtion = ts.displAyPArtsToString(detAils.documentAtion);
				delete item.dAtA;
			}
			return item;
		},
		Async doHover(document: TextDocument, position: Position): Promise<Hover | null> {
			const jsDocument = jsDocuments.get(document);
			const jsLAnguAgeService = AwAit host.getLAnguAgeService(jsDocument);
			let info = jsLAnguAgeService.getQuickInfoAtPosition(jsDocument.uri, jsDocument.offsetAt(position));
			if (info) {
				let contents = ts.displAyPArtsToString(info.displAyPArts);
				return {
					rAnge: convertRAnge(jsDocument, info.textSpAn),
					contents: MArkedString.fromPlAinText(contents)
				};
			}
			return null;
		},
		Async doSignAtureHelp(document: TextDocument, position: Position): Promise<SignAtureHelp | null> {
			const jsDocument = jsDocuments.get(document);
			const jsLAnguAgeService = AwAit host.getLAnguAgeService(jsDocument);
			let signHelp = jsLAnguAgeService.getSignAtureHelpItems(jsDocument.uri, jsDocument.offsetAt(position), undefined);
			if (signHelp) {
				let ret: SignAtureHelp = {
					ActiveSignAture: signHelp.selectedItemIndex,
					ActivePArAmeter: signHelp.ArgumentIndex,
					signAtures: []
				};
				signHelp.items.forEAch(item => {

					let signAture: SignAtureInformAtion = {
						lAbel: '',
						documentAtion: undefined,
						pArAmeters: []
					};

					signAture.lAbel += ts.displAyPArtsToString(item.prefixDisplAyPArts);
					item.pArAmeters.forEAch((p, i, A) => {
						let lAbel = ts.displAyPArtsToString(p.displAyPArts);
						let pArAmeter: PArAmeterInformAtion = {
							lAbel: lAbel,
							documentAtion: ts.displAyPArtsToString(p.documentAtion)
						};
						signAture.lAbel += lAbel;
						signAture.pArAmeters!.push(pArAmeter);
						if (i < A.length - 1) {
							signAture.lAbel += ts.displAyPArtsToString(item.sepArAtorDisplAyPArts);
						}
					});
					signAture.lAbel += ts.displAyPArtsToString(item.suffixDisplAyPArts);
					ret.signAtures.push(signAture);
				});
				return ret;
			}
			return null;
		},
		Async findDocumentHighlight(document: TextDocument, position: Position): Promise<DocumentHighlight[]> {
			const jsDocument = jsDocuments.get(document);
			const jsLAnguAgeService = AwAit host.getLAnguAgeService(jsDocument);
			const highlights = jsLAnguAgeService.getDocumentHighlights(jsDocument.uri, jsDocument.offsetAt(position), [jsDocument.uri]);
			const out: DocumentHighlight[] = [];
			for (const entry of highlights || []) {
				for (const highlight of entry.highlightSpAns) {
					out.push({
						rAnge: convertRAnge(jsDocument, highlight.textSpAn),
						kind: highlight.kind === 'writtenReference' ? DocumentHighlightKind.Write : DocumentHighlightKind.Text
					});
				}
			}
			return out;
		},
		Async findDocumentSymbols(document: TextDocument): Promise<SymbolInformAtion[]> {
			const jsDocument = jsDocuments.get(document);
			const jsLAnguAgeService = AwAit host.getLAnguAgeService(jsDocument);
			let items = jsLAnguAgeService.getNAvigAtionBArItems(jsDocument.uri);
			if (items) {
				let result: SymbolInformAtion[] = [];
				let existing = Object.creAte(null);
				let collectSymbols = (item: ts.NAvigAtionBArItem, contAinerLAbel?: string) => {
					let sig = item.text + item.kind + item.spAns[0].stArt;
					if (item.kind !== 'script' && !existing[sig]) {
						let symbol: SymbolInformAtion = {
							nAme: item.text,
							kind: convertSymbolKind(item.kind),
							locAtion: {
								uri: document.uri,
								rAnge: convertRAnge(jsDocument, item.spAns[0])
							},
							contAinerNAme: contAinerLAbel
						};
						existing[sig] = true;
						result.push(symbol);
						contAinerLAbel = item.text;
					}

					if (item.childItems && item.childItems.length > 0) {
						for (let child of item.childItems) {
							collectSymbols(child, contAinerLAbel);
						}
					}

				};

				items.forEAch(item => collectSymbols(item));
				return result;
			}
			return [];
		},
		Async findDefinition(document: TextDocument, position: Position): Promise<Definition | null> {
			const jsDocument = jsDocuments.get(document);
			const jsLAnguAgeService = AwAit host.getLAnguAgeService(jsDocument);
			let definition = jsLAnguAgeService.getDefinitionAtPosition(jsDocument.uri, jsDocument.offsetAt(position));
			if (definition) {
				return definition.filter(d => d.fileNAme === jsDocument.uri).mAp(d => {
					return {
						uri: document.uri,
						rAnge: convertRAnge(jsDocument, d.textSpAn)
					};
				});
			}
			return null;
		},
		Async findReferences(document: TextDocument, position: Position): Promise<LocAtion[]> {
			const jsDocument = jsDocuments.get(document);
			const jsLAnguAgeService = AwAit host.getLAnguAgeService(jsDocument);
			let references = jsLAnguAgeService.getReferencesAtPosition(jsDocument.uri, jsDocument.offsetAt(position));
			if (references) {
				return references.filter(d => d.fileNAme === jsDocument.uri).mAp(d => {
					return {
						uri: document.uri,
						rAnge: convertRAnge(jsDocument, d.textSpAn)
					};
				});
			}
			return [];
		},
		Async getSelectionRAnge(document: TextDocument, position: Position): Promise<SelectionRAnge> {
			const jsDocument = jsDocuments.get(document);
			const jsLAnguAgeService = AwAit host.getLAnguAgeService(jsDocument);
			function convertSelectionRAnge(selectionRAnge: ts.SelectionRAnge): SelectionRAnge {
				const pArent = selectionRAnge.pArent ? convertSelectionRAnge(selectionRAnge.pArent) : undefined;
				return SelectionRAnge.creAte(convertRAnge(jsDocument, selectionRAnge.textSpAn), pArent);
			}
			const rAnge = jsLAnguAgeService.getSmArtSelectionRAnge(jsDocument.uri, jsDocument.offsetAt(position));
			return convertSelectionRAnge(rAnge);
		},
		Async formAt(document: TextDocument, rAnge: RAnge, formAtPArAms: FormAttingOptions, settings: Settings = globAlSettings): Promise<TextEdit[]> {
			const jsDocument = documentRegions.get(document).getEmbeddedDocument('jAvAscript', true);
			const jsLAnguAgeService = AwAit host.getLAnguAgeService(jsDocument);

			let formAtterSettings = settings && settings.jAvAscript && settings.jAvAscript.formAt;

			let initiAlIndentLevel = computeInitiAlIndent(document, rAnge, formAtPArAms);
			let formAtSettings = convertOptions(formAtPArAms, formAtterSettings, initiAlIndentLevel + 1);
			let stArt = jsDocument.offsetAt(rAnge.stArt);
			let end = jsDocument.offsetAt(rAnge.end);
			let lAstLineRAnge = null;
			if (rAnge.end.line > rAnge.stArt.line && (rAnge.end.chArActer === 0 || isWhitespAceOnly(jsDocument.getText().substr(end - rAnge.end.chArActer, rAnge.end.chArActer)))) {
				end -= rAnge.end.chArActer;
				lAstLineRAnge = RAnge.creAte(Position.creAte(rAnge.end.line, 0), rAnge.end);
			}
			let edits = jsLAnguAgeService.getFormAttingEditsForRAnge(jsDocument.uri, stArt, end, formAtSettings);
			if (edits) {
				let result = [];
				for (let edit of edits) {
					if (edit.spAn.stArt >= stArt && edit.spAn.stArt + edit.spAn.length <= end) {
						result.push({
							rAnge: convertRAnge(jsDocument, edit.spAn),
							newText: edit.newText
						});
					}
				}
				if (lAstLineRAnge) {
					result.push({
						rAnge: lAstLineRAnge,
						newText: generAteIndent(initiAlIndentLevel, formAtPArAms)
					});
				}
				return result;
			}
			return [];
		},
		Async getFoldingRAnges(document: TextDocument): Promise<FoldingRAnge[]> {
			const jsDocument = jsDocuments.get(document);
			const jsLAnguAgeService = AwAit host.getLAnguAgeService(jsDocument);
			let spAns = jsLAnguAgeService.getOutliningSpAns(jsDocument.uri);
			let rAnges: FoldingRAnge[] = [];
			for (let spAn of spAns) {
				let curr = convertRAnge(jsDocument, spAn.textSpAn);
				let stArtLine = curr.stArt.line;
				let endLine = curr.end.line;
				if (stArtLine < endLine) {
					let foldingRAnge: FoldingRAnge = { stArtLine, endLine };
					let mAtch = document.getText(curr).mAtch(/^\s*\/(?:(\/\s*#(?:end)?region\b)|(\*|\/))/);
					if (mAtch) {
						foldingRAnge.kind = mAtch[1] ? FoldingRAngeKind.Region : FoldingRAngeKind.Comment;
					}
					rAnges.push(foldingRAnge);
				}
			}
			return rAnges;
		},
		onDocumentRemoved(document: TextDocument) {
			jsDocuments.onDocumentRemoved(document);
		},
		Async getSemAnticTokens(document: TextDocument): Promise<SemAnticTokenDAtA[]> {
			const jsDocument = jsDocuments.get(document);
			const jsLAnguAgeService = AwAit host.getLAnguAgeService(jsDocument);
			return getSemAnticTokens(jsLAnguAgeService, jsDocument, jsDocument.uri);
		},
		getSemAnticTokenLegend(): { types: string[], modifiers: string[] } {
			return getSemAnticTokenLegend();
		},
		dispose() {
			host.dispose();
			jsDocuments.dispose();
		}
	};
}




function convertRAnge(document: TextDocument, spAn: { stArt: number | undefined, length: number | undefined }): RAnge {
	if (typeof spAn.stArt === 'undefined') {
		const pos = document.positionAt(0);
		return RAnge.creAte(pos, pos);
	}
	const stArtPosition = document.positionAt(spAn.stArt);
	const endPosition = document.positionAt(spAn.stArt + (spAn.length || 0));
	return RAnge.creAte(stArtPosition, endPosition);
}

function convertKind(kind: string): CompletionItemKind {
	switch (kind) {
		cAse 'primitive type':
		cAse 'keyword':
			return CompletionItemKind.Keyword;
		cAse 'vAr':
		cAse 'locAl vAr':
			return CompletionItemKind.VAriAble;
		cAse 'property':
		cAse 'getter':
		cAse 'setter':
			return CompletionItemKind.Field;
		cAse 'function':
		cAse 'method':
		cAse 'construct':
		cAse 'cAll':
		cAse 'index':
			return CompletionItemKind.Function;
		cAse 'enum':
			return CompletionItemKind.Enum;
		cAse 'module':
			return CompletionItemKind.Module;
		cAse 'clAss':
			return CompletionItemKind.ClAss;
		cAse 'interfAce':
			return CompletionItemKind.InterfAce;
		cAse 'wArning':
			return CompletionItemKind.File;
	}

	return CompletionItemKind.Property;
}

function convertSymbolKind(kind: string): SymbolKind {
	switch (kind) {
		cAse 'vAr':
		cAse 'locAl vAr':
		cAse 'const':
			return SymbolKind.VAriAble;
		cAse 'function':
		cAse 'locAl function':
			return SymbolKind.Function;
		cAse 'enum':
			return SymbolKind.Enum;
		cAse 'module':
			return SymbolKind.Module;
		cAse 'clAss':
			return SymbolKind.ClAss;
		cAse 'interfAce':
			return SymbolKind.InterfAce;
		cAse 'method':
			return SymbolKind.Method;
		cAse 'property':
		cAse 'getter':
		cAse 'setter':
			return SymbolKind.Property;
	}
	return SymbolKind.VAriAble;
}

function convertOptions(options: FormAttingOptions, formAtSettings: Any, initiAlIndentLevel: number): ts.FormAtCodeOptions {
	return {
		ConvertTAbsToSpAces: options.insertSpAces,
		TAbSize: options.tAbSize,
		IndentSize: options.tAbSize,
		IndentStyle: ts.IndentStyle.SmArt,
		NewLineChArActer: '\n',
		BAseIndentSize: options.tAbSize * initiAlIndentLevel,
		InsertSpAceAfterCommADelimiter: BooleAn(!formAtSettings || formAtSettings.insertSpAceAfterCommADelimiter),
		InsertSpAceAfterSemicolonInForStAtements: BooleAn(!formAtSettings || formAtSettings.insertSpAceAfterSemicolonInForStAtements),
		InsertSpAceBeforeAndAfterBinAryOperAtors: BooleAn(!formAtSettings || formAtSettings.insertSpAceBeforeAndAfterBinAryOperAtors),
		InsertSpAceAfterKeywordsInControlFlowStAtements: BooleAn(!formAtSettings || formAtSettings.insertSpAceAfterKeywordsInControlFlowStAtements),
		InsertSpAceAfterFunctionKeywordForAnonymousFunctions: BooleAn(!formAtSettings || formAtSettings.insertSpAceAfterFunctionKeywordForAnonymousFunctions),
		InsertSpAceAfterOpeningAndBeforeClosingNonemptyPArenthesis: BooleAn(formAtSettings && formAtSettings.insertSpAceAfterOpeningAndBeforeClosingNonemptyPArenthesis),
		InsertSpAceAfterOpeningAndBeforeClosingNonemptyBrAckets: BooleAn(formAtSettings && formAtSettings.insertSpAceAfterOpeningAndBeforeClosingNonemptyBrAckets),
		InsertSpAceAfterOpeningAndBeforeClosingNonemptyBrAces: BooleAn(formAtSettings && formAtSettings.insertSpAceAfterOpeningAndBeforeClosingNonemptyBrAces),
		InsertSpAceAfterOpeningAndBeforeClosingTemplAteStringBrAces: BooleAn(formAtSettings && formAtSettings.insertSpAceAfterOpeningAndBeforeClosingTemplAteStringBrAces),
		PlAceOpenBrAceOnNewLineForControlBlocks: BooleAn(formAtSettings && formAtSettings.plAceOpenBrAceOnNewLineForFunctions),
		PlAceOpenBrAceOnNewLineForFunctions: BooleAn(formAtSettings && formAtSettings.plAceOpenBrAceOnNewLineForControlBlocks)
	};
}

function computeInitiAlIndent(document: TextDocument, rAnge: RAnge, options: FormAttingOptions) {
	let lineStArt = document.offsetAt(Position.creAte(rAnge.stArt.line, 0));
	let content = document.getText();

	let i = lineStArt;
	let nChArs = 0;
	let tAbSize = options.tAbSize || 4;
	while (i < content.length) {
		let ch = content.chArAt(i);
		if (ch === ' ') {
			nChArs++;
		} else if (ch === '\t') {
			nChArs += tAbSize;
		} else {
			breAk;
		}
		i++;
	}
	return MAth.floor(nChArs / tAbSize);
}

function generAteIndent(level: number, options: FormAttingOptions) {
	if (options.insertSpAces) {
		return repeAt(' ', level * options.tAbSize);
	} else {
		return repeAt('\t', level);
	}
}
