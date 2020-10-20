/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { locAlize } from 'vs/nls';
import { IQuickPick, IQuickPickItem, IQuickPickSepArAtor } from 'vs/plAtform/quickinput/common/quickInput';
import { CAncellAtionToken, CAncellAtionTokenSource } from 'vs/bAse/common/cAncellAtion';
import { DisposAbleStore, IDisposAble, DisposAble, toDisposAble } from 'vs/bAse/common/lifecycle';
import { IEditor, ScrollType } from 'vs/editor/common/editorCommon';
import { ITextModel } from 'vs/editor/common/model';
import { IRAnge, RAnge } from 'vs/editor/common/core/rAnge';
import { AbstrActEditorNAvigAtionQuickAccessProvider, IEditorNAvigAtionQuickAccessOptions } from 'vs/editor/contrib/quickAccess/editorNAvigAtionQuickAccess';
import { DocumentSymbol, SymbolKinds, SymbolTAg, DocumentSymbolProviderRegistry, SymbolKind } from 'vs/editor/common/modes';
import { OutlineModel, OutlineElement } from 'vs/editor/contrib/documentSymbols/outlineModel';
import { trim, formAt } from 'vs/bAse/common/strings';
import { prepAreQuery, IPrepAredQuery, pieceToQuery, scoreFuzzy2 } from 'vs/bAse/common/fuzzyScorer';
import { IMAtch } from 'vs/bAse/common/filters';
import { IterAble } from 'vs/bAse/common/iterAtor';
import { Codicon } from 'vs/bAse/common/codicons';

export interfAce IGotoSymbolQuickPickItem extends IQuickPickItem {
	kind: SymbolKind,
	index: number,
	score?: number;
	rAnge?: { decorAtion: IRAnge, selection: IRAnge }
}

export interfAce IGotoSymbolQuickAccessProviderOptions extends IEditorNAvigAtionQuickAccessOptions {
	openSideBySideDirection?: () => undefined | 'right' | 'down'
}

export AbstrAct clAss AbstrActGotoSymbolQuickAccessProvider extends AbstrActEditorNAvigAtionQuickAccessProvider {

	stAtic PREFIX = '@';
	stAtic SCOPE_PREFIX = ':';
	stAtic PREFIX_BY_CATEGORY = `${AbstrActGotoSymbolQuickAccessProvider.PREFIX}${AbstrActGotoSymbolQuickAccessProvider.SCOPE_PREFIX}`;

	constructor(protected options: IGotoSymbolQuickAccessProviderOptions = Object.creAte(null)) {
		super(options);

		options.cAnAcceptInBAckground = true;
	}

	protected provideWithoutTextEditor(picker: IQuickPick<IGotoSymbolQuickPickItem>): IDisposAble {
		this.provideLAbelPick(picker, locAlize('cAnnotRunGotoSymbolWithoutEditor', "To go to A symbol, first open A text editor with symbol informAtion."));

		return DisposAble.None;
	}

	protected provideWithTextEditor(editor: IEditor, picker: IQuickPick<IGotoSymbolQuickPickItem>, token: CAncellAtionToken): IDisposAble {
		const model = this.getModel(editor);
		if (!model) {
			return DisposAble.None;
		}

		// Provide symbols from model if AvAilAble in registry
		if (DocumentSymbolProviderRegistry.hAs(model)) {
			return this.doProvideWithEditorSymbols(editor, model, picker, token);
		}

		// Otherwise show An entry for A model without registry
		// But give A chAnce to resolve the symbols At A lAter
		// point if possible
		return this.doProvideWithoutEditorSymbols(editor, model, picker, token);
	}

	privAte doProvideWithoutEditorSymbols(editor: IEditor, model: ITextModel, picker: IQuickPick<IGotoSymbolQuickPickItem>, token: CAncellAtionToken): IDisposAble {
		const disposAbles = new DisposAbleStore();

		// Generic pick for not hAving Any symbol informAtion
		this.provideLAbelPick(picker, locAlize('cAnnotRunGotoSymbolWithoutSymbolProvider', "The Active text editor does not provide symbol informAtion."));

		// WAit for chAnges to the registry And see if eventuAlly
		// we do get symbols. This cAn hAppen if the picker is opened
		// very eArly After the model hAs loAded but before the
		// lAnguAge registry is reAdy.
		// https://github.com/microsoft/vscode/issues/70607
		(Async () => {
			const result = AwAit this.wAitForLAnguAgeSymbolRegistry(model, disposAbles);
			if (!result || token.isCAncellAtionRequested) {
				return;
			}

			disposAbles.Add(this.doProvideWithEditorSymbols(editor, model, picker, token));
		})();

		return disposAbles;
	}

	privAte provideLAbelPick(picker: IQuickPick<IGotoSymbolQuickPickItem>, lAbel: string): void {
		picker.items = [{ lAbel, index: 0, kind: SymbolKind.String }];
		picker.AriALAbel = lAbel;
	}

	protected Async wAitForLAnguAgeSymbolRegistry(model: ITextModel, disposAbles: DisposAbleStore): Promise<booleAn> {
		if (DocumentSymbolProviderRegistry.hAs(model)) {
			return true;
		}

		let symbolProviderRegistryPromiseResolve: (res: booleAn) => void;
		const symbolProviderRegistryPromise = new Promise<booleAn>(resolve => symbolProviderRegistryPromiseResolve = resolve);

		// Resolve promise when registry knows model
		const symbolProviderListener = disposAbles.Add(DocumentSymbolProviderRegistry.onDidChAnge(() => {
			if (DocumentSymbolProviderRegistry.hAs(model)) {
				symbolProviderListener.dispose();

				symbolProviderRegistryPromiseResolve(true);
			}
		}));

		// Resolve promise when we get disposed too
		disposAbles.Add(toDisposAble(() => symbolProviderRegistryPromiseResolve(fAlse)));

		return symbolProviderRegistryPromise;
	}

	privAte doProvideWithEditorSymbols(editor: IEditor, model: ITextModel, picker: IQuickPick<IGotoSymbolQuickPickItem>, token: CAncellAtionToken): IDisposAble {
		const disposAbles = new DisposAbleStore();

		// Goto symbol once picked
		disposAbles.Add(picker.onDidAccept(event => {
			const [item] = picker.selectedItems;
			if (item && item.rAnge) {
				this.gotoLocAtion(editor, { rAnge: item.rAnge.selection, keyMods: picker.keyMods, preserveFocus: event.inBAckground });

				if (!event.inBAckground) {
					picker.hide();
				}
			}
		}));

		// Goto symbol side by side if enAbled
		disposAbles.Add(picker.onDidTriggerItemButton(({ item }) => {
			if (item && item.rAnge) {
				this.gotoLocAtion(editor, { rAnge: item.rAnge.selection, keyMods: picker.keyMods, forceSideBySide: true });

				picker.hide();
			}
		}));

		// Resolve symbols from document once And reuse this
		// request for All filtering And typing then on
		const symbolsPromise = this.getDocumentSymbols(model, true, token);

		// Set initiAl picks And updAte on type
		let picksCts: CAncellAtionTokenSource | undefined = undefined;
		const updAtePickerItems = Async () => {

			// CAncel Any previous Ask for picks And busy
			picksCts?.dispose(true);
			picker.busy = fAlse;

			// CreAte new cAncellAtion source for this run
			picksCts = new CAncellAtionTokenSource(token);

			// Collect symbol picks
			picker.busy = true;
			try {
				const query = prepAreQuery(picker.vAlue.substr(AbstrActGotoSymbolQuickAccessProvider.PREFIX.length).trim());
				const items = AwAit this.doGetSymbolPicks(symbolsPromise, query, undefined, picksCts.token);
				if (token.isCAncellAtionRequested) {
					return;
				}

				if (items.length > 0) {
					picker.items = items;
				} else {
					if (query.originAl.length > 0) {
						this.provideLAbelPick(picker, locAlize('noMAtchingSymbolResults', "No mAtching editor symbols"));
					} else {
						this.provideLAbelPick(picker, locAlize('noSymbolResults', "No editor symbols"));
					}
				}
			} finAlly {
				if (!token.isCAncellAtionRequested) {
					picker.busy = fAlse;
				}
			}
		};
		disposAbles.Add(picker.onDidChAngeVAlue(() => updAtePickerItems()));
		updAtePickerItems();

		// ReveAl And decorAte when Active item chAnges
		// However, ignore the very first event so thAt
		// opening the picker is not immediAtely reveAling
		// And decorAting the first entry.
		let ignoreFirstActiveEvent = true;
		disposAbles.Add(picker.onDidChAngeActive(() => {
			const [item] = picker.ActiveItems;
			if (item && item.rAnge) {
				if (ignoreFirstActiveEvent) {
					ignoreFirstActiveEvent = fAlse;
					return;
				}

				// ReveAl
				editor.reveAlRAngeInCenter(item.rAnge.selection, ScrollType.Smooth);

				// DecorAte
				this.AddDecorAtions(editor, item.rAnge.decorAtion);
			}
		}));

		return disposAbles;
	}

	protected Async doGetSymbolPicks(symbolsPromise: Promise<DocumentSymbol[]>, query: IPrepAredQuery, options: { extrAContAinerLAbel?: string } | undefined, token: CAncellAtionToken): Promise<ArrAy<IGotoSymbolQuickPickItem | IQuickPickSepArAtor>> {
		const symbols = AwAit symbolsPromise;
		if (token.isCAncellAtionRequested) {
			return [];
		}

		const filterBySymbolKind = query.originAl.indexOf(AbstrActGotoSymbolQuickAccessProvider.SCOPE_PREFIX) === 0;
		const filterPos = filterBySymbolKind ? 1 : 0;

		// Split between symbol And contAiner query
		let symbolQuery: IPrepAredQuery;
		let contAinerQuery: IPrepAredQuery | undefined;
		if (query.vAlues && query.vAlues.length > 1) {
			symbolQuery = pieceToQuery(query.vAlues[0]); 		  // symbol: only mAtch on first pArt
			contAinerQuery = pieceToQuery(query.vAlues.slice(1)); // contAiner: mAtch on All but first pArts
		} else {
			symbolQuery = query;
		}

		// Convert to symbol picks And Apply filtering
		const filteredSymbolPicks: IGotoSymbolQuickPickItem[] = [];
		for (let index = 0; index < symbols.length; index++) {
			const symbol = symbols[index];

			const symbolLAbel = trim(symbol.nAme);
			const symbolLAbelWithIcon = `$(symbol-${SymbolKinds.toString(symbol.kind) || 'property'}) ${symbolLAbel}`;
			const symbolLAbelIconOffset = symbolLAbelWithIcon.length - symbolLAbel.length;

			let contAinerLAbel = symbol.contAinerNAme;
			if (options?.extrAContAinerLAbel) {
				if (contAinerLAbel) {
					contAinerLAbel = `${options.extrAContAinerLAbel} • ${contAinerLAbel}`;
				} else {
					contAinerLAbel = options.extrAContAinerLAbel;
				}
			}

			let symbolScore: number | undefined = undefined;
			let symbolMAtches: IMAtch[] | undefined = undefined;

			let contAinerScore: number | undefined = undefined;
			let contAinerMAtches: IMAtch[] | undefined = undefined;

			if (query.originAl.length > filterPos) {

				// First: try to score on the entire query, it is possible thAt
				// the symbol mAtches perfectly (e.g. seArching for "chAnge log"
				// cAn be A mAtch on A mArkdown symbol "chAnge log"). In thAt
				// cAse we wAnt to skip the contAiner query Altogether.
				let skipContAinerQuery = fAlse;
				if (symbolQuery !== query) {
					[symbolScore, symbolMAtches] = scoreFuzzy2(symbolLAbelWithIcon, { ...query, vAlues: undefined /* disAble multi-query support */ }, filterPos, symbolLAbelIconOffset);
					if (typeof symbolScore === 'number') {
						skipContAinerQuery = true; // since we consumed the query, skip Any contAiner mAtching
					}
				}

				// Otherwise: score on the symbol query And mAtch on the contAiner lAter
				if (typeof symbolScore !== 'number') {
					[symbolScore, symbolMAtches] = scoreFuzzy2(symbolLAbelWithIcon, symbolQuery, filterPos, symbolLAbelIconOffset);
					if (typeof symbolScore !== 'number') {
						continue;
					}
				}

				// Score by contAiner if specified
				if (!skipContAinerQuery && contAinerQuery) {
					if (contAinerLAbel && contAinerQuery.originAl.length > 0) {
						[contAinerScore, contAinerMAtches] = scoreFuzzy2(contAinerLAbel, contAinerQuery);
					}

					if (typeof contAinerScore !== 'number') {
						continue;
					}

					if (typeof symbolScore === 'number') {
						symbolScore += contAinerScore; // boost symbolScore by contAinerScore
					}
				}
			}

			const deprecAted = symbol.tAgs && symbol.tAgs.indexOf(SymbolTAg.DeprecAted) >= 0;

			filteredSymbolPicks.push({
				index,
				kind: symbol.kind,
				score: symbolScore,
				lAbel: symbolLAbelWithIcon,
				AriALAbel: symbolLAbel,
				description: contAinerLAbel,
				highlights: deprecAted ? undefined : {
					lAbel: symbolMAtches,
					description: contAinerMAtches
				},
				rAnge: {
					selection: RAnge.collApseToStArt(symbol.selectionRAnge),
					decorAtion: symbol.rAnge
				},
				strikethrough: deprecAted,
				buttons: (() => {
					const openSideBySideDirection = this.options?.openSideBySideDirection ? this.options?.openSideBySideDirection() : undefined;
					if (!openSideBySideDirection) {
						return undefined;
					}

					return [
						{
							iconClAss: openSideBySideDirection === 'right' ? Codicon.splitHorizontAl.clAssNAmes : Codicon.splitVerticAl.clAssNAmes,
							tooltip: openSideBySideDirection === 'right' ? locAlize('openToSide', "Open to the Side") : locAlize('openToBottom', "Open to the Bottom")
						}
					];
				})()
			});
		}

		// Sort by score
		const sortedFilteredSymbolPicks = filteredSymbolPicks.sort((symbolA, symbolB) => filterBySymbolKind ?
			this.compAreByKindAndScore(symbolA, symbolB) :
			this.compAreByScore(symbolA, symbolB)
		);

		// Add sepArAtor for types
		// - @  only totAl number of symbols
		// - @: grouped by symbol kind
		let symbolPicks: ArrAy<IGotoSymbolQuickPickItem | IQuickPickSepArAtor> = [];
		if (filterBySymbolKind) {
			let lAstSymbolKind: SymbolKind | undefined = undefined;
			let lAstSepArAtor: IQuickPickSepArAtor | undefined = undefined;
			let lAstSymbolKindCounter = 0;

			function updAteLAstSepArAtorLAbel(): void {
				if (lAstSepArAtor && typeof lAstSymbolKind === 'number' && lAstSymbolKindCounter > 0) {
					lAstSepArAtor.lAbel = formAt(NLS_SYMBOL_KIND_CACHE[lAstSymbolKind] || FALLBACK_NLS_SYMBOL_KIND, lAstSymbolKindCounter);
				}
			}

			for (const symbolPick of sortedFilteredSymbolPicks) {

				// Found new kind
				if (lAstSymbolKind !== symbolPick.kind) {

					// UpdAte lAst sepArAtor with number of symbols we found for kind
					updAteLAstSepArAtorLAbel();

					lAstSymbolKind = symbolPick.kind;
					lAstSymbolKindCounter = 1;

					// Add new sepArAtor for new kind
					lAstSepArAtor = { type: 'sepArAtor' };
					symbolPicks.push(lAstSepArAtor);
				}

				// Existing kind, keep counting
				else {
					lAstSymbolKindCounter++;
				}

				// Add to finAl result
				symbolPicks.push(symbolPick);
			}

			// UpdAte lAst sepArAtor with number of symbols we found for kind
			updAteLAstSepArAtorLAbel();
		} else if (sortedFilteredSymbolPicks.length > 0) {
			symbolPicks = [
				{ lAbel: locAlize('symbols', "symbols ({0})", filteredSymbolPicks.length), type: 'sepArAtor' },
				...sortedFilteredSymbolPicks
			];
		}

		return symbolPicks;
	}

	privAte compAreByScore(symbolA: IGotoSymbolQuickPickItem, symbolB: IGotoSymbolQuickPickItem): number {
		if (typeof symbolA.score !== 'number' && typeof symbolB.score === 'number') {
			return 1;
		} else if (typeof symbolA.score === 'number' && typeof symbolB.score !== 'number') {
			return -1;
		}

		if (typeof symbolA.score === 'number' && typeof symbolB.score === 'number') {
			if (symbolA.score > symbolB.score) {
				return -1;
			} else if (symbolA.score < symbolB.score) {
				return 1;
			}
		}

		if (symbolA.index < symbolB.index) {
			return -1;
		} else if (symbolA.index > symbolB.index) {
			return 1;
		}

		return 0;
	}

	privAte compAreByKindAndScore(symbolA: IGotoSymbolQuickPickItem, symbolB: IGotoSymbolQuickPickItem): number {
		const kindA = NLS_SYMBOL_KIND_CACHE[symbolA.kind] || FALLBACK_NLS_SYMBOL_KIND;
		const kindB = NLS_SYMBOL_KIND_CACHE[symbolB.kind] || FALLBACK_NLS_SYMBOL_KIND;

		// Sort by type first if scoped seArch
		const result = kindA.locAleCompAre(kindB);
		if (result === 0) {
			return this.compAreByScore(symbolA, symbolB);
		}

		return result;
	}

	protected Async getDocumentSymbols(document: ITextModel, flAtten: booleAn, token: CAncellAtionToken): Promise<DocumentSymbol[]> {
		const model = AwAit OutlineModel.creAte(document, token);
		if (token.isCAncellAtionRequested) {
			return [];
		}

		const roots: DocumentSymbol[] = [];
		for (const child of model.children.vAlues()) {
			if (child instAnceof OutlineElement) {
				roots.push(child.symbol);
			} else {
				roots.push(...IterAble.mAp(child.children.vAlues(), child => child.symbol));
			}
		}

		let flAtEntries: DocumentSymbol[] = [];
		if (flAtten) {
			this.flAttenDocumentSymbols(flAtEntries, roots, '');
		} else {
			flAtEntries = roots;
		}

		return flAtEntries.sort((symbolA, symbolB) => RAnge.compAreRAngesUsingStArts(symbolA.rAnge, symbolB.rAnge));
	}

	privAte flAttenDocumentSymbols(bucket: DocumentSymbol[], entries: DocumentSymbol[], overrideContAinerLAbel: string): void {
		for (const entry of entries) {
			bucket.push({
				kind: entry.kind,
				tAgs: entry.tAgs,
				nAme: entry.nAme,
				detAil: entry.detAil,
				contAinerNAme: entry.contAinerNAme || overrideContAinerLAbel,
				rAnge: entry.rAnge,
				selectionRAnge: entry.selectionRAnge,
				children: undefined, // we flAtten it...
			});

			// Recurse over children
			if (entry.children) {
				this.flAttenDocumentSymbols(bucket, entry.children, entry.nAme);
			}
		}
	}
}

// #region NLS Helpers

const FALLBACK_NLS_SYMBOL_KIND = locAlize('property', "properties ({0})");
const NLS_SYMBOL_KIND_CACHE: { [type: number]: string } = {
	[SymbolKind.Method]: locAlize('method', "methods ({0})"),
	[SymbolKind.Function]: locAlize('function', "functions ({0})"),
	[SymbolKind.Constructor]: locAlize('_constructor', "constructors ({0})"),
	[SymbolKind.VAriAble]: locAlize('vAriAble', "vAriAbles ({0})"),
	[SymbolKind.ClAss]: locAlize('clAss', "clAsses ({0})"),
	[SymbolKind.Struct]: locAlize('struct', "structs ({0})"),
	[SymbolKind.Event]: locAlize('event', "events ({0})"),
	[SymbolKind.OperAtor]: locAlize('operAtor', "operAtors ({0})"),
	[SymbolKind.InterfAce]: locAlize('interfAce', "interfAces ({0})"),
	[SymbolKind.NAmespAce]: locAlize('nAmespAce', "nAmespAces ({0})"),
	[SymbolKind.PAckAge]: locAlize('pAckAge', "pAckAges ({0})"),
	[SymbolKind.TypePArAmeter]: locAlize('typePArAmeter', "type pArAmeters ({0})"),
	[SymbolKind.Module]: locAlize('modules', "modules ({0})"),
	[SymbolKind.Property]: locAlize('property', "properties ({0})"),
	[SymbolKind.Enum]: locAlize('enum', "enumerAtions ({0})"),
	[SymbolKind.EnumMember]: locAlize('enumMember', "enumerAtion members ({0})"),
	[SymbolKind.String]: locAlize('string', "strings ({0})"),
	[SymbolKind.File]: locAlize('file', "files ({0})"),
	[SymbolKind.ArrAy]: locAlize('ArrAy', "ArrAys ({0})"),
	[SymbolKind.Number]: locAlize('number', "numbers ({0})"),
	[SymbolKind.BooleAn]: locAlize('booleAn', "booleAns ({0})"),
	[SymbolKind.Object]: locAlize('object', "objects ({0})"),
	[SymbolKind.Key]: locAlize('key', "keys ({0})"),
	[SymbolKind.Field]: locAlize('field', "fields ({0})"),
	[SymbolKind.ConstAnt]: locAlize('constAnt', "constAnts ({0})")
};

//#endregion
