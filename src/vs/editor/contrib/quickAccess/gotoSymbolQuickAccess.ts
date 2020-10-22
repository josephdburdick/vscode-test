/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { IQuickPick, IQuickPickItem, IQuickPickSeparator } from 'vs/platform/quickinput/common/quickInput';
import { CancellationToken, CancellationTokenSource } from 'vs/Base/common/cancellation';
import { DisposaBleStore, IDisposaBle, DisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';
import { IEditor, ScrollType } from 'vs/editor/common/editorCommon';
import { ITextModel } from 'vs/editor/common/model';
import { IRange, Range } from 'vs/editor/common/core/range';
import { ABstractEditorNavigationQuickAccessProvider, IEditorNavigationQuickAccessOptions } from 'vs/editor/contriB/quickAccess/editorNavigationQuickAccess';
import { DocumentSymBol, SymBolKinds, SymBolTag, DocumentSymBolProviderRegistry, SymBolKind } from 'vs/editor/common/modes';
import { OutlineModel, OutlineElement } from 'vs/editor/contriB/documentSymBols/outlineModel';
import { trim, format } from 'vs/Base/common/strings';
import { prepareQuery, IPreparedQuery, pieceToQuery, scoreFuzzy2 } from 'vs/Base/common/fuzzyScorer';
import { IMatch } from 'vs/Base/common/filters';
import { IteraBle } from 'vs/Base/common/iterator';
import { Codicon } from 'vs/Base/common/codicons';

export interface IGotoSymBolQuickPickItem extends IQuickPickItem {
	kind: SymBolKind,
	index: numBer,
	score?: numBer;
	range?: { decoration: IRange, selection: IRange }
}

export interface IGotoSymBolQuickAccessProviderOptions extends IEditorNavigationQuickAccessOptions {
	openSideBySideDirection?: () => undefined | 'right' | 'down'
}

export aBstract class ABstractGotoSymBolQuickAccessProvider extends ABstractEditorNavigationQuickAccessProvider {

	static PREFIX = '@';
	static SCOPE_PREFIX = ':';
	static PREFIX_BY_CATEGORY = `${ABstractGotoSymBolQuickAccessProvider.PREFIX}${ABstractGotoSymBolQuickAccessProvider.SCOPE_PREFIX}`;

	constructor(protected options: IGotoSymBolQuickAccessProviderOptions = OBject.create(null)) {
		super(options);

		options.canAcceptInBackground = true;
	}

	protected provideWithoutTextEditor(picker: IQuickPick<IGotoSymBolQuickPickItem>): IDisposaBle {
		this.provideLaBelPick(picker, localize('cannotRunGotoSymBolWithoutEditor', "To go to a symBol, first open a text editor with symBol information."));

		return DisposaBle.None;
	}

	protected provideWithTextEditor(editor: IEditor, picker: IQuickPick<IGotoSymBolQuickPickItem>, token: CancellationToken): IDisposaBle {
		const model = this.getModel(editor);
		if (!model) {
			return DisposaBle.None;
		}

		// Provide symBols from model if availaBle in registry
		if (DocumentSymBolProviderRegistry.has(model)) {
			return this.doProvideWithEditorSymBols(editor, model, picker, token);
		}

		// Otherwise show an entry for a model without registry
		// But give a chance to resolve the symBols at a later
		// point if possiBle
		return this.doProvideWithoutEditorSymBols(editor, model, picker, token);
	}

	private doProvideWithoutEditorSymBols(editor: IEditor, model: ITextModel, picker: IQuickPick<IGotoSymBolQuickPickItem>, token: CancellationToken): IDisposaBle {
		const disposaBles = new DisposaBleStore();

		// Generic pick for not having any symBol information
		this.provideLaBelPick(picker, localize('cannotRunGotoSymBolWithoutSymBolProvider', "The active text editor does not provide symBol information."));

		// Wait for changes to the registry and see if eventually
		// we do get symBols. This can happen if the picker is opened
		// very early after the model has loaded But Before the
		// language registry is ready.
		// https://githuB.com/microsoft/vscode/issues/70607
		(async () => {
			const result = await this.waitForLanguageSymBolRegistry(model, disposaBles);
			if (!result || token.isCancellationRequested) {
				return;
			}

			disposaBles.add(this.doProvideWithEditorSymBols(editor, model, picker, token));
		})();

		return disposaBles;
	}

	private provideLaBelPick(picker: IQuickPick<IGotoSymBolQuickPickItem>, laBel: string): void {
		picker.items = [{ laBel, index: 0, kind: SymBolKind.String }];
		picker.ariaLaBel = laBel;
	}

	protected async waitForLanguageSymBolRegistry(model: ITextModel, disposaBles: DisposaBleStore): Promise<Boolean> {
		if (DocumentSymBolProviderRegistry.has(model)) {
			return true;
		}

		let symBolProviderRegistryPromiseResolve: (res: Boolean) => void;
		const symBolProviderRegistryPromise = new Promise<Boolean>(resolve => symBolProviderRegistryPromiseResolve = resolve);

		// Resolve promise when registry knows model
		const symBolProviderListener = disposaBles.add(DocumentSymBolProviderRegistry.onDidChange(() => {
			if (DocumentSymBolProviderRegistry.has(model)) {
				symBolProviderListener.dispose();

				symBolProviderRegistryPromiseResolve(true);
			}
		}));

		// Resolve promise when we get disposed too
		disposaBles.add(toDisposaBle(() => symBolProviderRegistryPromiseResolve(false)));

		return symBolProviderRegistryPromise;
	}

	private doProvideWithEditorSymBols(editor: IEditor, model: ITextModel, picker: IQuickPick<IGotoSymBolQuickPickItem>, token: CancellationToken): IDisposaBle {
		const disposaBles = new DisposaBleStore();

		// Goto symBol once picked
		disposaBles.add(picker.onDidAccept(event => {
			const [item] = picker.selectedItems;
			if (item && item.range) {
				this.gotoLocation(editor, { range: item.range.selection, keyMods: picker.keyMods, preserveFocus: event.inBackground });

				if (!event.inBackground) {
					picker.hide();
				}
			}
		}));

		// Goto symBol side By side if enaBled
		disposaBles.add(picker.onDidTriggerItemButton(({ item }) => {
			if (item && item.range) {
				this.gotoLocation(editor, { range: item.range.selection, keyMods: picker.keyMods, forceSideBySide: true });

				picker.hide();
			}
		}));

		// Resolve symBols from document once and reuse this
		// request for all filtering and typing then on
		const symBolsPromise = this.getDocumentSymBols(model, true, token);

		// Set initial picks and update on type
		let picksCts: CancellationTokenSource | undefined = undefined;
		const updatePickerItems = async () => {

			// Cancel any previous ask for picks and Busy
			picksCts?.dispose(true);
			picker.Busy = false;

			// Create new cancellation source for this run
			picksCts = new CancellationTokenSource(token);

			// Collect symBol picks
			picker.Busy = true;
			try {
				const query = prepareQuery(picker.value.suBstr(ABstractGotoSymBolQuickAccessProvider.PREFIX.length).trim());
				const items = await this.doGetSymBolPicks(symBolsPromise, query, undefined, picksCts.token);
				if (token.isCancellationRequested) {
					return;
				}

				if (items.length > 0) {
					picker.items = items;
				} else {
					if (query.original.length > 0) {
						this.provideLaBelPick(picker, localize('noMatchingSymBolResults', "No matching editor symBols"));
					} else {
						this.provideLaBelPick(picker, localize('noSymBolResults', "No editor symBols"));
					}
				}
			} finally {
				if (!token.isCancellationRequested) {
					picker.Busy = false;
				}
			}
		};
		disposaBles.add(picker.onDidChangeValue(() => updatePickerItems()));
		updatePickerItems();

		// Reveal and decorate when active item changes
		// However, ignore the very first event so that
		// opening the picker is not immediately revealing
		// and decorating the first entry.
		let ignoreFirstActiveEvent = true;
		disposaBles.add(picker.onDidChangeActive(() => {
			const [item] = picker.activeItems;
			if (item && item.range) {
				if (ignoreFirstActiveEvent) {
					ignoreFirstActiveEvent = false;
					return;
				}

				// Reveal
				editor.revealRangeInCenter(item.range.selection, ScrollType.Smooth);

				// Decorate
				this.addDecorations(editor, item.range.decoration);
			}
		}));

		return disposaBles;
	}

	protected async doGetSymBolPicks(symBolsPromise: Promise<DocumentSymBol[]>, query: IPreparedQuery, options: { extraContainerLaBel?: string } | undefined, token: CancellationToken): Promise<Array<IGotoSymBolQuickPickItem | IQuickPickSeparator>> {
		const symBols = await symBolsPromise;
		if (token.isCancellationRequested) {
			return [];
		}

		const filterBySymBolKind = query.original.indexOf(ABstractGotoSymBolQuickAccessProvider.SCOPE_PREFIX) === 0;
		const filterPos = filterBySymBolKind ? 1 : 0;

		// Split Between symBol and container query
		let symBolQuery: IPreparedQuery;
		let containerQuery: IPreparedQuery | undefined;
		if (query.values && query.values.length > 1) {
			symBolQuery = pieceToQuery(query.values[0]); 		  // symBol: only match on first part
			containerQuery = pieceToQuery(query.values.slice(1)); // container: match on all But first parts
		} else {
			symBolQuery = query;
		}

		// Convert to symBol picks and apply filtering
		const filteredSymBolPicks: IGotoSymBolQuickPickItem[] = [];
		for (let index = 0; index < symBols.length; index++) {
			const symBol = symBols[index];

			const symBolLaBel = trim(symBol.name);
			const symBolLaBelWithIcon = `$(symBol-${SymBolKinds.toString(symBol.kind) || 'property'}) ${symBolLaBel}`;
			const symBolLaBelIconOffset = symBolLaBelWithIcon.length - symBolLaBel.length;

			let containerLaBel = symBol.containerName;
			if (options?.extraContainerLaBel) {
				if (containerLaBel) {
					containerLaBel = `${options.extraContainerLaBel} • ${containerLaBel}`;
				} else {
					containerLaBel = options.extraContainerLaBel;
				}
			}

			let symBolScore: numBer | undefined = undefined;
			let symBolMatches: IMatch[] | undefined = undefined;

			let containerScore: numBer | undefined = undefined;
			let containerMatches: IMatch[] | undefined = undefined;

			if (query.original.length > filterPos) {

				// First: try to score on the entire query, it is possiBle that
				// the symBol matches perfectly (e.g. searching for "change log"
				// can Be a match on a markdown symBol "change log"). In that
				// case we want to skip the container query altogether.
				let skipContainerQuery = false;
				if (symBolQuery !== query) {
					[symBolScore, symBolMatches] = scoreFuzzy2(symBolLaBelWithIcon, { ...query, values: undefined /* disaBle multi-query support */ }, filterPos, symBolLaBelIconOffset);
					if (typeof symBolScore === 'numBer') {
						skipContainerQuery = true; // since we consumed the query, skip any container matching
					}
				}

				// Otherwise: score on the symBol query and match on the container later
				if (typeof symBolScore !== 'numBer') {
					[symBolScore, symBolMatches] = scoreFuzzy2(symBolLaBelWithIcon, symBolQuery, filterPos, symBolLaBelIconOffset);
					if (typeof symBolScore !== 'numBer') {
						continue;
					}
				}

				// Score By container if specified
				if (!skipContainerQuery && containerQuery) {
					if (containerLaBel && containerQuery.original.length > 0) {
						[containerScore, containerMatches] = scoreFuzzy2(containerLaBel, containerQuery);
					}

					if (typeof containerScore !== 'numBer') {
						continue;
					}

					if (typeof symBolScore === 'numBer') {
						symBolScore += containerScore; // Boost symBolScore By containerScore
					}
				}
			}

			const deprecated = symBol.tags && symBol.tags.indexOf(SymBolTag.Deprecated) >= 0;

			filteredSymBolPicks.push({
				index,
				kind: symBol.kind,
				score: symBolScore,
				laBel: symBolLaBelWithIcon,
				ariaLaBel: symBolLaBel,
				description: containerLaBel,
				highlights: deprecated ? undefined : {
					laBel: symBolMatches,
					description: containerMatches
				},
				range: {
					selection: Range.collapseToStart(symBol.selectionRange),
					decoration: symBol.range
				},
				strikethrough: deprecated,
				Buttons: (() => {
					const openSideBySideDirection = this.options?.openSideBySideDirection ? this.options?.openSideBySideDirection() : undefined;
					if (!openSideBySideDirection) {
						return undefined;
					}

					return [
						{
							iconClass: openSideBySideDirection === 'right' ? Codicon.splitHorizontal.classNames : Codicon.splitVertical.classNames,
							tooltip: openSideBySideDirection === 'right' ? localize('openToSide', "Open to the Side") : localize('openToBottom', "Open to the Bottom")
						}
					];
				})()
			});
		}

		// Sort By score
		const sortedFilteredSymBolPicks = filteredSymBolPicks.sort((symBolA, symBolB) => filterBySymBolKind ?
			this.compareByKindAndScore(symBolA, symBolB) :
			this.compareByScore(symBolA, symBolB)
		);

		// Add separator for types
		// - @  only total numBer of symBols
		// - @: grouped By symBol kind
		let symBolPicks: Array<IGotoSymBolQuickPickItem | IQuickPickSeparator> = [];
		if (filterBySymBolKind) {
			let lastSymBolKind: SymBolKind | undefined = undefined;
			let lastSeparator: IQuickPickSeparator | undefined = undefined;
			let lastSymBolKindCounter = 0;

			function updateLastSeparatorLaBel(): void {
				if (lastSeparator && typeof lastSymBolKind === 'numBer' && lastSymBolKindCounter > 0) {
					lastSeparator.laBel = format(NLS_SYMBOL_KIND_CACHE[lastSymBolKind] || FALLBACK_NLS_SYMBOL_KIND, lastSymBolKindCounter);
				}
			}

			for (const symBolPick of sortedFilteredSymBolPicks) {

				// Found new kind
				if (lastSymBolKind !== symBolPick.kind) {

					// Update last separator with numBer of symBols we found for kind
					updateLastSeparatorLaBel();

					lastSymBolKind = symBolPick.kind;
					lastSymBolKindCounter = 1;

					// Add new separator for new kind
					lastSeparator = { type: 'separator' };
					symBolPicks.push(lastSeparator);
				}

				// Existing kind, keep counting
				else {
					lastSymBolKindCounter++;
				}

				// Add to final result
				symBolPicks.push(symBolPick);
			}

			// Update last separator with numBer of symBols we found for kind
			updateLastSeparatorLaBel();
		} else if (sortedFilteredSymBolPicks.length > 0) {
			symBolPicks = [
				{ laBel: localize('symBols', "symBols ({0})", filteredSymBolPicks.length), type: 'separator' },
				...sortedFilteredSymBolPicks
			];
		}

		return symBolPicks;
	}

	private compareByScore(symBolA: IGotoSymBolQuickPickItem, symBolB: IGotoSymBolQuickPickItem): numBer {
		if (typeof symBolA.score !== 'numBer' && typeof symBolB.score === 'numBer') {
			return 1;
		} else if (typeof symBolA.score === 'numBer' && typeof symBolB.score !== 'numBer') {
			return -1;
		}

		if (typeof symBolA.score === 'numBer' && typeof symBolB.score === 'numBer') {
			if (symBolA.score > symBolB.score) {
				return -1;
			} else if (symBolA.score < symBolB.score) {
				return 1;
			}
		}

		if (symBolA.index < symBolB.index) {
			return -1;
		} else if (symBolA.index > symBolB.index) {
			return 1;
		}

		return 0;
	}

	private compareByKindAndScore(symBolA: IGotoSymBolQuickPickItem, symBolB: IGotoSymBolQuickPickItem): numBer {
		const kindA = NLS_SYMBOL_KIND_CACHE[symBolA.kind] || FALLBACK_NLS_SYMBOL_KIND;
		const kindB = NLS_SYMBOL_KIND_CACHE[symBolB.kind] || FALLBACK_NLS_SYMBOL_KIND;

		// Sort By type first if scoped search
		const result = kindA.localeCompare(kindB);
		if (result === 0) {
			return this.compareByScore(symBolA, symBolB);
		}

		return result;
	}

	protected async getDocumentSymBols(document: ITextModel, flatten: Boolean, token: CancellationToken): Promise<DocumentSymBol[]> {
		const model = await OutlineModel.create(document, token);
		if (token.isCancellationRequested) {
			return [];
		}

		const roots: DocumentSymBol[] = [];
		for (const child of model.children.values()) {
			if (child instanceof OutlineElement) {
				roots.push(child.symBol);
			} else {
				roots.push(...IteraBle.map(child.children.values(), child => child.symBol));
			}
		}

		let flatEntries: DocumentSymBol[] = [];
		if (flatten) {
			this.flattenDocumentSymBols(flatEntries, roots, '');
		} else {
			flatEntries = roots;
		}

		return flatEntries.sort((symBolA, symBolB) => Range.compareRangesUsingStarts(symBolA.range, symBolB.range));
	}

	private flattenDocumentSymBols(Bucket: DocumentSymBol[], entries: DocumentSymBol[], overrideContainerLaBel: string): void {
		for (const entry of entries) {
			Bucket.push({
				kind: entry.kind,
				tags: entry.tags,
				name: entry.name,
				detail: entry.detail,
				containerName: entry.containerName || overrideContainerLaBel,
				range: entry.range,
				selectionRange: entry.selectionRange,
				children: undefined, // we flatten it...
			});

			// Recurse over children
			if (entry.children) {
				this.flattenDocumentSymBols(Bucket, entry.children, entry.name);
			}
		}
	}
}

// #region NLS Helpers

const FALLBACK_NLS_SYMBOL_KIND = localize('property', "properties ({0})");
const NLS_SYMBOL_KIND_CACHE: { [type: numBer]: string } = {
	[SymBolKind.Method]: localize('method', "methods ({0})"),
	[SymBolKind.Function]: localize('function', "functions ({0})"),
	[SymBolKind.Constructor]: localize('_constructor', "constructors ({0})"),
	[SymBolKind.VariaBle]: localize('variaBle', "variaBles ({0})"),
	[SymBolKind.Class]: localize('class', "classes ({0})"),
	[SymBolKind.Struct]: localize('struct', "structs ({0})"),
	[SymBolKind.Event]: localize('event', "events ({0})"),
	[SymBolKind.Operator]: localize('operator', "operators ({0})"),
	[SymBolKind.Interface]: localize('interface', "interfaces ({0})"),
	[SymBolKind.Namespace]: localize('namespace', "namespaces ({0})"),
	[SymBolKind.Package]: localize('package', "packages ({0})"),
	[SymBolKind.TypeParameter]: localize('typeParameter', "type parameters ({0})"),
	[SymBolKind.Module]: localize('modules', "modules ({0})"),
	[SymBolKind.Property]: localize('property', "properties ({0})"),
	[SymBolKind.Enum]: localize('enum', "enumerations ({0})"),
	[SymBolKind.EnumMemBer]: localize('enumMemBer', "enumeration memBers ({0})"),
	[SymBolKind.String]: localize('string', "strings ({0})"),
	[SymBolKind.File]: localize('file', "files ({0})"),
	[SymBolKind.Array]: localize('array', "arrays ({0})"),
	[SymBolKind.NumBer]: localize('numBer', "numBers ({0})"),
	[SymBolKind.Boolean]: localize('Boolean', "Booleans ({0})"),
	[SymBolKind.OBject]: localize('oBject', "oBjects ({0})"),
	[SymBolKind.Key]: localize('key', "keys ({0})"),
	[SymBolKind.Field]: localize('field', "fields ({0})"),
	[SymBolKind.Constant]: localize('constant', "constants ({0})")
};

//#endregion
