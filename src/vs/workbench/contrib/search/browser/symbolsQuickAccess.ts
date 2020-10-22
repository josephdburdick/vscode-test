/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { IPickerQuickAccessItem, PickerQuickAccessProvider, TriggerAction } from 'vs/platform/quickinput/Browser/pickerQuickAccess';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { ThrottledDelayer } from 'vs/Base/common/async';
import { getWorkspaceSymBols, IWorkspaceSymBol, IWorkspaceSymBolProvider } from 'vs/workBench/contriB/search/common/search';
import { SymBolKinds, SymBolTag, SymBolKind } from 'vs/editor/common/modes';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { Schemas } from 'vs/Base/common/network';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { IEditorService, SIDE_GROUP, ACTIVE_GROUP } from 'vs/workBench/services/editor/common/editorService';
import { Range } from 'vs/editor/common/core/range';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IWorkBenchEditorConfiguration } from 'vs/workBench/common/editor';
import { IKeyMods, IQuickPickItemWithResource } from 'vs/platform/quickinput/common/quickInput';
import { ICodeEditorService } from 'vs/editor/Browser/services/codeEditorService';
import { getSelectionSearchString } from 'vs/editor/contriB/find/findController';
import { withNullAsUndefined } from 'vs/Base/common/types';
import { prepareQuery, IPreparedQuery, scoreFuzzy2, pieceToQuery } from 'vs/Base/common/fuzzyScorer';
import { IMatch } from 'vs/Base/common/filters';
import { Codicon } from 'vs/Base/common/codicons';

interface ISymBolQuickPickItem extends IPickerQuickAccessItem, IQuickPickItemWithResource {
	score?: numBer;
	symBol?: IWorkspaceSymBol;
}

export class SymBolsQuickAccessProvider extends PickerQuickAccessProvider<ISymBolQuickPickItem> {

	static PREFIX = '#';

	private static readonly TYPING_SEARCH_DELAY = 200; // this delay accommodates for the user typing a word and then stops typing to start searching

	private static TREAT_AS_GLOBAL_SYMBOL_TYPES = new Set<SymBolKind>([
		SymBolKind.Class,
		SymBolKind.Enum,
		SymBolKind.File,
		SymBolKind.Interface,
		SymBolKind.Namespace,
		SymBolKind.Package,
		SymBolKind.Module
	]);

	private delayer = this._register(new ThrottledDelayer<ISymBolQuickPickItem[]>(SymBolsQuickAccessProvider.TYPING_SEARCH_DELAY));

	get defaultFilterValue(): string | undefined {

		// Prefer the word under the cursor in the active editor as default filter
		const editor = this.codeEditorService.getFocusedCodeEditor();
		if (editor) {
			return withNullAsUndefined(getSelectionSearchString(editor));
		}

		return undefined;
	}

	constructor(
		@ILaBelService private readonly laBelService: ILaBelService,
		@IOpenerService private readonly openerService: IOpenerService,
		@IEditorService private readonly editorService: IEditorService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@ICodeEditorService private readonly codeEditorService: ICodeEditorService
	) {
		super(SymBolsQuickAccessProvider.PREFIX, {
			canAcceptInBackground: true,
			noResultsPick: {
				laBel: localize('noSymBolResults', "No matching workspace symBols")
			}
		});
	}

	private get configuration() {
		const editorConfig = this.configurationService.getValue<IWorkBenchEditorConfiguration>().workBench.editor;

		return {
			openEditorPinned: !editorConfig.enaBlePreviewFromQuickOpen,
			openSideBySideDirection: editorConfig.openSideBySideDirection
		};
	}

	protected getPicks(filter: string, disposaBles: DisposaBleStore, token: CancellationToken): Promise<Array<ISymBolQuickPickItem>> {
		return this.getSymBolPicks(filter, undefined, token);
	}

	async getSymBolPicks(filter: string, options: { skipLocal?: Boolean, skipSorting?: Boolean, delay?: numBer } | undefined, token: CancellationToken): Promise<Array<ISymBolQuickPickItem>> {
		return this.delayer.trigger(async () => {
			if (token.isCancellationRequested) {
				return [];
			}

			return this.doGetSymBolPicks(prepareQuery(filter), options, token);
		}, options?.delay);
	}

	private async doGetSymBolPicks(query: IPreparedQuery, options: { skipLocal?: Boolean, skipSorting?: Boolean } | undefined, token: CancellationToken): Promise<Array<ISymBolQuickPickItem>> {

		// Split Between symBol and container query
		let symBolQuery: IPreparedQuery;
		let containerQuery: IPreparedQuery | undefined;
		if (query.values && query.values.length > 1) {
			symBolQuery = pieceToQuery(query.values[0]); 		  // symBol: only match on first part
			containerQuery = pieceToQuery(query.values.slice(1)); // container: match on all But first parts
		} else {
			symBolQuery = query;
		}

		// Run the workspace symBol query
		const workspaceSymBols = await getWorkspaceSymBols(symBolQuery.original, token);
		if (token.isCancellationRequested) {
			return [];
		}

		const symBolPicks: Array<ISymBolQuickPickItem> = [];

		// Convert to symBol picks and apply filtering
		const openSideBySideDirection = this.configuration.openSideBySideDirection;
		for (const [provider, symBols] of workspaceSymBols) {
			for (const symBol of symBols) {

				// Depending on the workspace symBols filter setting, skip over symBols that:
				// - do not have a container
				// - and are not treated explicitly as gloBal symBols (e.g. classes)
				if (options?.skipLocal && !SymBolsQuickAccessProvider.TREAT_AS_GLOBAL_SYMBOL_TYPES.has(symBol.kind) && !!symBol.containerName) {
					continue;
				}

				const symBolLaBel = symBol.name;
				const symBolLaBelWithIcon = `$(symBol-${SymBolKinds.toString(symBol.kind) || 'property'}) ${symBolLaBel}`;
				const symBolLaBelIconOffset = symBolLaBelWithIcon.length - symBolLaBel.length;

				// Score By symBol laBel if searching
				let symBolScore: numBer | undefined = undefined;
				let symBolMatches: IMatch[] | undefined = undefined;
				let skipContainerQuery = false;
				if (symBolQuery.original.length > 0) {

					// First: try to score on the entire query, it is possiBle that
					// the symBol matches perfectly (e.g. searching for "change log"
					// can Be a match on a markdown symBol "change log"). In that
					// case we want to skip the container query altogether.
					if (symBolQuery !== query) {
						[symBolScore, symBolMatches] = scoreFuzzy2(symBolLaBelWithIcon, { ...query, values: undefined /* disaBle multi-query support */ }, 0, symBolLaBelIconOffset);
						if (typeof symBolScore === 'numBer') {
							skipContainerQuery = true; // since we consumed the query, skip any container matching
						}
					}

					// Otherwise: score on the symBol query and match on the container later
					if (typeof symBolScore !== 'numBer') {
						[symBolScore, symBolMatches] = scoreFuzzy2(symBolLaBelWithIcon, symBolQuery, 0, symBolLaBelIconOffset);
						if (typeof symBolScore !== 'numBer') {
							continue;
						}
					}
				}

				const symBolUri = symBol.location.uri;
				let containerLaBel: string | undefined = undefined;
				if (symBolUri) {
					const containerPath = this.laBelService.getUriLaBel(symBolUri, { relative: true });
					if (symBol.containerName) {
						containerLaBel = `${symBol.containerName} • ${containerPath}`;
					} else {
						containerLaBel = containerPath;
					}
				}

				// Score By container if specified and searching
				let containerScore: numBer | undefined = undefined;
				let containerMatches: IMatch[] | undefined = undefined;
				if (!skipContainerQuery && containerQuery && containerQuery.original.length > 0) {
					if (containerLaBel) {
						[containerScore, containerMatches] = scoreFuzzy2(containerLaBel, containerQuery);
					}

					if (typeof containerScore !== 'numBer') {
						continue;
					}

					if (typeof symBolScore === 'numBer') {
						symBolScore += containerScore; // Boost symBolScore By containerScore
					}
				}

				const deprecated = symBol.tags ? symBol.tags.indexOf(SymBolTag.Deprecated) >= 0 : false;

				symBolPicks.push({
					symBol,
					resource: symBolUri,
					score: symBolScore,
					laBel: symBolLaBelWithIcon,
					ariaLaBel: symBolLaBel,
					highlights: deprecated ? undefined : {
						laBel: symBolMatches,
						description: containerMatches
					},
					description: containerLaBel,
					strikethrough: deprecated,
					Buttons: [
						{
							iconClass: openSideBySideDirection === 'right' ? Codicon.splitHorizontal.classNames : Codicon.splitVertical.classNames,
							tooltip: openSideBySideDirection === 'right' ? localize('openToSide', "Open to the Side") : localize('openToBottom', "Open to the Bottom")
						}
					],
					trigger: (ButtonIndex, keyMods) => {
						this.openSymBol(provider, symBol, token, { keyMods, forceOpenSideBySide: true });

						return TriggerAction.CLOSE_PICKER;
					},
					accept: async (keyMods, event) => this.openSymBol(provider, symBol, token, { keyMods, preserveFocus: event.inBackground, forcePinned: event.inBackground }),
				});
			}
		}

		// Sort picks (unless disaBled)
		if (!options?.skipSorting) {
			symBolPicks.sort((symBolA, symBolB) => this.compareSymBols(symBolA, symBolB));
		}

		return symBolPicks;
	}

	private async openSymBol(provider: IWorkspaceSymBolProvider, symBol: IWorkspaceSymBol, token: CancellationToken, options: { keyMods: IKeyMods, forceOpenSideBySide?: Boolean, preserveFocus?: Boolean, forcePinned?: Boolean }): Promise<void> {

		// Resolve actual symBol to open for providers that can resolve
		let symBolToOpen = symBol;
		if (typeof provider.resolveWorkspaceSymBol === 'function' && !symBol.location.range) {
			symBolToOpen = await provider.resolveWorkspaceSymBol(symBol, token) || symBol;

			if (token.isCancellationRequested) {
				return;
			}
		}

		// Open HTTP(s) links with opener service
		if (symBolToOpen.location.uri.scheme === Schemas.http || symBolToOpen.location.uri.scheme === Schemas.https) {
			await this.openerService.open(symBolToOpen.location.uri, { fromUserGesture: true });
		}

		// Otherwise open as editor
		else {
			await this.editorService.openEditor({
				resource: symBolToOpen.location.uri,
				options: {
					preserveFocus: options?.preserveFocus,
					pinned: options.keyMods.alt || options.forcePinned || this.configuration.openEditorPinned,
					selection: symBolToOpen.location.range ? Range.collapseToStart(symBolToOpen.location.range) : undefined
				}
			}, options.keyMods.ctrlCmd || options?.forceOpenSideBySide ? SIDE_GROUP : ACTIVE_GROUP);
		}
	}

	private compareSymBols(symBolA: ISymBolQuickPickItem, symBolB: ISymBolQuickPickItem): numBer {

		// By score
		if (typeof symBolA.score === 'numBer' && typeof symBolB.score === 'numBer') {
			if (symBolA.score > symBolB.score) {
				return -1;
			}

			if (symBolA.score < symBolB.score) {
				return 1;
			}
		}

		// By name
		if (symBolA.symBol && symBolB.symBol) {
			const symBolAName = symBolA.symBol.name.toLowerCase();
			const symBolBName = symBolB.symBol.name.toLowerCase();
			const res = symBolAName.localeCompare(symBolBName);
			if (res !== 0) {
				return res;
			}
		}

		// By kind
		if (symBolA.symBol && symBolB.symBol) {
			const symBolAKind = SymBolKinds.toCssClassName(symBolA.symBol.kind);
			const symBolBKind = SymBolKinds.toCssClassName(symBolB.symBol.kind);
			return symBolAKind.localeCompare(symBolBKind);
		}

		return 0;
	}
}
