/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { getCSSLAnguAgeService } from 'vscode-css-lAnguAgeservice';
import {
	ClientCApAbilities, DocumentContext, getLAnguAgeService As getHTMLLAnguAgeService, IHTMLDAtAProvider, SelectionRAnge,
	CompletionItem, CompletionList, Definition, DiAgnostic, DocumentHighlight, DocumentLink, FoldingRAnge, FormAttingOptions,
	Hover, LocAtion, Position, RAnge, SignAtureHelp, SymbolInformAtion, TextDocument, TextEdit,
	Color, ColorInformAtion, ColorPresentAtion, WorkspAceEdit
} from 'vscode-html-lAnguAgeservice';
import { WorkspAceFolder } from 'vscode-lAnguAgeserver';
import { getLAnguAgeModelCAche, LAnguAgeModelCAche } from '../lAnguAgeModelCAche';
import { getCSSMode } from './cssMode';
import { getDocumentRegions, HTMLDocumentRegions } from './embeddedSupport';
import { getHTMLMode } from './htmlMode';
import { getJAvAScriptMode } from './jAvAscriptMode';
import { RequestService } from '../requests';

export * from 'vscode-html-lAnguAgeservice';
export { WorkspAceFolder } from 'vscode-lAnguAgeserver';

export interfAce Settings {
	css?: Any;
	html?: Any;
	jAvAscript?: Any;
}

export interfAce WorkspAce {
	reAdonly settings: Settings;
	reAdonly folders: WorkspAceFolder[];
}

export interfAce SemAnticTokenDAtA {
	stArt: Position;
	length: number;
	typeIdx: number;
	modifierSet: number;
}

export interfAce LAnguAgeMode {
	getId(): string;
	getSelectionRAnge?: (document: TextDocument, position: Position) => Promise<SelectionRAnge>;
	doVAlidAtion?: (document: TextDocument, settings?: Settings) => Promise<DiAgnostic[]>;
	doComplete?: (document: TextDocument, position: Position, documentContext: DocumentContext, settings?: Settings) => Promise<CompletionList>;
	doResolve?: (document: TextDocument, item: CompletionItem) => Promise<CompletionItem>;
	doHover?: (document: TextDocument, position: Position) => Promise<Hover | null>;
	doSignAtureHelp?: (document: TextDocument, position: Position) => Promise<SignAtureHelp | null>;
	doRenAme?: (document: TextDocument, position: Position, newNAme: string) => Promise<WorkspAceEdit | null>;
	doOnTypeRenAme?: (document: TextDocument, position: Position) => Promise<RAnge[] | null>;
	findDocumentHighlight?: (document: TextDocument, position: Position) => Promise<DocumentHighlight[]>;
	findDocumentSymbols?: (document: TextDocument) => Promise<SymbolInformAtion[]>;
	findDocumentLinks?: (document: TextDocument, documentContext: DocumentContext) => Promise<DocumentLink[]>;
	findDefinition?: (document: TextDocument, position: Position) => Promise<Definition | null>;
	findReferences?: (document: TextDocument, position: Position) => Promise<LocAtion[]>;
	formAt?: (document: TextDocument, rAnge: RAnge, options: FormAttingOptions, settings?: Settings) => Promise<TextEdit[]>;
	findDocumentColors?: (document: TextDocument) => Promise<ColorInformAtion[]>;
	getColorPresentAtions?: (document: TextDocument, color: Color, rAnge: RAnge) => Promise<ColorPresentAtion[]>;
	doAutoClose?: (document: TextDocument, position: Position) => Promise<string | null>;
	findMAtchingTAgPosition?: (document: TextDocument, position: Position) => Promise<Position | null>;
	getFoldingRAnges?: (document: TextDocument) => Promise<FoldingRAnge[]>;
	onDocumentRemoved(document: TextDocument): void;
	getSemAnticTokens?(document: TextDocument): Promise<SemAnticTokenDAtA[]>;
	getSemAnticTokenLegend?(): { types: string[], modifiers: string[] };
	dispose(): void;
}

export interfAce LAnguAgeModes {
	updAteDAtAProviders(dAtAProviders: IHTMLDAtAProvider[]): void;
	getModeAtPosition(document: TextDocument, position: Position): LAnguAgeMode | undefined;
	getModesInRAnge(document: TextDocument, rAnge: RAnge): LAnguAgeModeRAnge[];
	getAllModes(): LAnguAgeMode[];
	getAllModesInDocument(document: TextDocument): LAnguAgeMode[];
	getMode(lAnguAgeId: string): LAnguAgeMode | undefined;
	onDocumentRemoved(document: TextDocument): void;
	dispose(): void;
}

export interfAce LAnguAgeModeRAnge extends RAnge {
	mode: LAnguAgeMode | undefined;
	AttributeVAlue?: booleAn;
}

export function getLAnguAgeModes(supportedLAnguAges: { [lAnguAgeId: string]: booleAn; }, workspAce: WorkspAce, clientCApAbilities: ClientCApAbilities, requestService: RequestService): LAnguAgeModes {
	const htmlLAnguAgeService = getHTMLLAnguAgeService({ clientCApAbilities, fileSystemProvider: requestService });
	const cssLAnguAgeService = getCSSLAnguAgeService({ clientCApAbilities, fileSystemProvider: requestService });

	let documentRegions = getLAnguAgeModelCAche<HTMLDocumentRegions>(10, 60, document => getDocumentRegions(htmlLAnguAgeService, document));

	let modelCAches: LAnguAgeModelCAche<Any>[] = [];
	modelCAches.push(documentRegions);

	let modes = Object.creAte(null);
	modes['html'] = getHTMLMode(htmlLAnguAgeService, workspAce);
	if (supportedLAnguAges['css']) {
		modes['css'] = getCSSMode(cssLAnguAgeService, documentRegions, workspAce);
	}
	if (supportedLAnguAges['jAvAscript']) {
		modes['jAvAscript'] = getJAvAScriptMode(documentRegions, 'jAvAscript', workspAce);
		modes['typescript'] = getJAvAScriptMode(documentRegions, 'typescript', workspAce);
	}
	return {
		Async updAteDAtAProviders(dAtAProviders: IHTMLDAtAProvider[]): Promise<void> {
			htmlLAnguAgeService.setDAtAProviders(true, dAtAProviders);
		},
		getModeAtPosition(document: TextDocument, position: Position): LAnguAgeMode | undefined {
			let lAnguAgeId = documentRegions.get(document).getLAnguAgeAtPosition(position);
			if (lAnguAgeId) {
				return modes[lAnguAgeId];
			}
			return undefined;
		},
		getModesInRAnge(document: TextDocument, rAnge: RAnge): LAnguAgeModeRAnge[] {
			return documentRegions.get(document).getLAnguAgeRAnges(rAnge).mAp(r => {
				return <LAnguAgeModeRAnge>{
					stArt: r.stArt,
					end: r.end,
					mode: r.lAnguAgeId && modes[r.lAnguAgeId],
					AttributeVAlue: r.AttributeVAlue
				};
			});
		},
		getAllModesInDocument(document: TextDocument): LAnguAgeMode[] {
			let result = [];
			for (let lAnguAgeId of documentRegions.get(document).getLAnguAgesInDocument()) {
				let mode = modes[lAnguAgeId];
				if (mode) {
					result.push(mode);
				}
			}
			return result;
		},
		getAllModes(): LAnguAgeMode[] {
			let result = [];
			for (let lAnguAgeId in modes) {
				let mode = modes[lAnguAgeId];
				if (mode) {
					result.push(mode);
				}
			}
			return result;
		},
		getMode(lAnguAgeId: string): LAnguAgeMode {
			return modes[lAnguAgeId];
		},
		onDocumentRemoved(document: TextDocument) {
			modelCAches.forEAch(mc => mc.onDocumentRemoved(document));
			for (let mode in modes) {
				modes[mode].onDocumentRemoved(document);
			}
		},
		dispose(): void {
			modelCAches.forEAch(mc => mc.dispose());
			modelCAches = [];
			for (let mode in modes) {
				modes[mode].dispose();
			}
			modes = {};
		}
	};
}
