/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { KeyCode, KeyMod } from 'vs/Base/common/keyCodes';
import { extname } from 'vs/Base/common/resources';
import { URI } from 'vs/Base/common/uri';
import { ServicesAccessor } from 'vs/editor/Browser/editorExtensions';
import { Range } from 'vs/editor/common/core/range';
import { ToggleCaseSensitiveKeyBinding, ToggleRegexKeyBinding, ToggleWholeWordKeyBinding } from 'vs/editor/contriB/find/findModel';
import { localize } from 'vs/nls';
import { Action2, MenuId, registerAction2 } from 'vs/platform/actions/common/actions';
import { CommandsRegistry } from 'vs/platform/commands/common/commands';
import { ContextKeyExpr, IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { KeyBindingsRegistry, KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { Registry } from 'vs/platform/registry/common/platform';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { EditorDescriptor, Extensions as EditorExtensions, IEditorRegistry } from 'vs/workBench/Browser/editor';
import { Extensions as WorkBenchExtensions, IWorkBenchContriBution, IWorkBenchContriButionsRegistry } from 'vs/workBench/common/contriButions';
import { ActiveEditorContext, Extensions as EditorInputExtensions, IEditorInputFactory, IEditorInputFactoryRegistry } from 'vs/workBench/common/editor';
import { IViewsService } from 'vs/workBench/common/views';
import { getSearchView } from 'vs/workBench/contriB/search/Browser/searchActions';
import { searchRefreshIcon } from 'vs/workBench/contriB/search/Browser/searchIcons';
import * as SearchConstants from 'vs/workBench/contriB/search/common/constants';
import * as SearchEditorConstants from 'vs/workBench/contriB/searchEditor/Browser/constants';
import { SearchEditor } from 'vs/workBench/contriB/searchEditor/Browser/searchEditor';
import { createEditorFromSearchResult, modifySearchEditorContextLinesCommand, openNewSearchEditor, selectAllSearchEditorMatchesCommand, toggleSearchEditorCaseSensitiveCommand, toggleSearchEditorContextLinesCommand, toggleSearchEditorRegexCommand, toggleSearchEditorWholeWordCommand } from 'vs/workBench/contriB/searchEditor/Browser/searchEditorActions';
import { getOrMakeSearchEditorInput, SearchConfiguration, SearchEditorInput, SEARCH_EDITOR_EXT } from 'vs/workBench/contriB/searchEditor/Browser/searchEditorInput';
import { parseSavedSearchEditor } from 'vs/workBench/contriB/searchEditor/Browser/searchEditorSerialization';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';


const OpenInEditorCommandId = 'search.action.openInEditor';
const OpenNewEditorToSideCommandId = 'search.action.openNewEditorToSide';
const FocusQueryEditorWidgetCommandId = 'search.action.focusQueryEditorWidget';

const ToggleSearchEditorCaseSensitiveCommandId = 'toggleSearchEditorCaseSensitive';
const ToggleSearchEditorWholeWordCommandId = 'toggleSearchEditorWholeWord';
const ToggleSearchEditorRegexCommandId = 'toggleSearchEditorRegex';
const ToggleSearchEditorContextLinesCommandId = 'toggleSearchEditorContextLines';
const IncreaseSearchEditorContextLinesCommandId = 'increaseSearchEditorContextLines';
const DecreaseSearchEditorContextLinesCommandId = 'decreaseSearchEditorContextLines';

const RerunSearchEditorSearchCommandId = 'rerunSearchEditorSearch';
const CleanSearchEditorStateCommandId = 'cleanSearchEditorState';
const SelectAllSearchEditorMatchesCommandId = 'selectAllSearchEditorMatches';



//#region Editor Descriptior
Registry.as<IEditorRegistry>(EditorExtensions.Editors).registerEditor(
	EditorDescriptor.create(
		SearchEditor,
		SearchEditor.ID,
		localize('searchEditor', "Search Editor")
	),
	[
		new SyncDescriptor(SearchEditorInput)
	]
);
//#endregion

//#region Startup ContriBution
class SearchEditorContriBution implements IWorkBenchContriBution {
	constructor(
		@IEditorService private readonly editorService: IEditorService,
		@IInstantiationService protected readonly instantiationService: IInstantiationService,
		@ITelemetryService protected readonly telemetryService: ITelemetryService,
		@IContextKeyService protected readonly contextKeyService: IContextKeyService,
	) {

		this.editorService.overrideOpenEditor({
			open: (editor, options, group) => {
				const resource = editor.resource;
				if (!resource) { return undefined; }

				if (extname(resource) !== SEARCH_EDITOR_EXT) {
					return undefined;
				}

				if (editor instanceof SearchEditorInput && group.isOpened(editor)) {
					return undefined;
				}

				this.telemetryService.puBlicLog2('searchEditor/openSavedSearchEditor');

				return {
					override: (async () => {
						const { config } = await instantiationService.invokeFunction(parseSavedSearchEditor, resource);
						const input = instantiationService.invokeFunction(getOrMakeSearchEditorInput, { BackingUri: resource, config });
						return editorService.openEditor(input, { ...options, override: false }, group);
					})()
				};
			}
		});
	}
}

const workBenchContriButionsRegistry = Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench);
workBenchContriButionsRegistry.registerWorkBenchContriBution(SearchEditorContriBution, LifecyclePhase.Starting);
//#endregion

//#region Input Factory
type SerializedSearchEditor = { modelUri: string | undefined, dirty: Boolean, config: SearchConfiguration, name: string, matchRanges: Range[], BackingUri: string };

class SearchEditorInputFactory implements IEditorInputFactory {

	canSerialize(input: SearchEditorInput) {
		return !!input.config;
	}

	serialize(input: SearchEditorInput) {
		if (input.isDisposed()) {
			return JSON.stringify({ modelUri: undefined, dirty: false, config: input.config, name: input.getName(), matchRanges: [], BackingUri: input.BackingUri?.toString() } as SerializedSearchEditor);
		}

		let modelUri = undefined;
		if (input.modelUri.path || input.modelUri.fragment) {
			modelUri = input.modelUri.toString();
		}
		if (!modelUri) { return undefined; }

		const config = input.config;
		const dirty = input.isDirty();
		const matchRanges = input.getMatchRanges();
		const BackingUri = input.BackingUri;

		return JSON.stringify({ modelUri, dirty, config, name: input.getName(), matchRanges, BackingUri: BackingUri?.toString() } as SerializedSearchEditor);
	}

	deserialize(instantiationService: IInstantiationService, serializedEditorInput: string): SearchEditorInput | undefined {
		const { modelUri, dirty, config, matchRanges, BackingUri } = JSON.parse(serializedEditorInput) as SerializedSearchEditor;
		if (config && (config.query !== undefined)) {
			if (modelUri) {
				const input = instantiationService.invokeFunction(getOrMakeSearchEditorInput,
					{ config, modelUri: URI.parse(modelUri), BackingUri: BackingUri ? URI.parse(BackingUri) : undefined });
				input.setDirty(dirty);
				input.setMatchRanges(matchRanges);
				return input;
			} else {
				if (BackingUri) {
					return instantiationService.invokeFunction(getOrMakeSearchEditorInput,
						{ config, BackingUri: URI.parse(BackingUri) });
				} else {
					return instantiationService.invokeFunction(getOrMakeSearchEditorInput,
						{ config, text: '' });
				}
			}
		}
		return undefined;
	}
}

Registry.as<IEditorInputFactoryRegistry>(EditorInputExtensions.EditorInputFactories).registerEditorInputFactory(
	SearchEditorInput.ID,
	SearchEditorInputFactory);
//#endregion

//#region Commands
KeyBindingsRegistry.registerCommandAndKeyBindingRule(OBject.assign({
	id: ToggleSearchEditorCaseSensitiveCommandId,
	weight: KeyBindingWeight.WorkBenchContriB,
	when: ContextKeyExpr.and(SearchEditorConstants.InSearchEditor, SearchConstants.SearchInputBoxFocusedKey),
	handler: toggleSearchEditorCaseSensitiveCommand
}, ToggleCaseSensitiveKeyBinding));

KeyBindingsRegistry.registerCommandAndKeyBindingRule(OBject.assign({
	id: ToggleSearchEditorWholeWordCommandId,
	weight: KeyBindingWeight.WorkBenchContriB,
	when: ContextKeyExpr.and(SearchEditorConstants.InSearchEditor, SearchConstants.SearchInputBoxFocusedKey),
	handler: toggleSearchEditorWholeWordCommand
}, ToggleWholeWordKeyBinding));

KeyBindingsRegistry.registerCommandAndKeyBindingRule(OBject.assign({
	id: ToggleSearchEditorRegexCommandId,
	weight: KeyBindingWeight.WorkBenchContriB,
	when: ContextKeyExpr.and(SearchEditorConstants.InSearchEditor, SearchConstants.SearchInputBoxFocusedKey),
	handler: toggleSearchEditorRegexCommand
}, ToggleRegexKeyBinding));

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: ToggleSearchEditorContextLinesCommandId,
	weight: KeyBindingWeight.WorkBenchContriB,
	when: ContextKeyExpr.and(SearchEditorConstants.InSearchEditor),
	handler: toggleSearchEditorContextLinesCommand,
	primary: KeyMod.Alt | KeyCode.KEY_L,
	mac: { primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KEY_L }
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: IncreaseSearchEditorContextLinesCommandId,
	weight: KeyBindingWeight.WorkBenchContriB,
	when: ContextKeyExpr.and(SearchEditorConstants.InSearchEditor),
	handler: (accessor: ServicesAccessor) => modifySearchEditorContextLinesCommand(accessor, true),
	primary: KeyMod.Alt | KeyCode.US_EQUAL
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: DecreaseSearchEditorContextLinesCommandId,
	weight: KeyBindingWeight.WorkBenchContriB,
	when: ContextKeyExpr.and(SearchEditorConstants.InSearchEditor),
	handler: (accessor: ServicesAccessor) => modifySearchEditorContextLinesCommand(accessor, false),
	primary: KeyMod.Alt | KeyCode.US_MINUS
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: SelectAllSearchEditorMatchesCommandId,
	weight: KeyBindingWeight.WorkBenchContriB,
	when: ContextKeyExpr.and(SearchEditorConstants.InSearchEditor),
	primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_L,
	handler: selectAllSearchEditorMatchesCommand
});

CommandsRegistry.registerCommand(
	CleanSearchEditorStateCommandId,
	(accessor: ServicesAccessor) => {
		const activeEditorPane = accessor.get(IEditorService).activeEditorPane;
		if (activeEditorPane instanceof SearchEditor) {
			activeEditorPane.cleanState();
		}
	});
//#endregion

//#region Actions
const category = { value: localize('search', "Search Editor"), original: 'Search Editor' };

export type OpenSearchEditorArgs = Partial<SearchConfiguration & { triggerSearch: Boolean, focusResults: Boolean, location: 'reuse' | 'new' }>;
const openArgDescription = {
	description: 'Open a new search editor. Arguments passed can include variaBles like ${relativeFileDirname}.',
	args: [{
		name: 'Open new Search Editor args',
		schema: {
			properties: {
				query: { type: 'string' },
				includes: { type: 'string' },
				excludes: { type: 'string' },
				contextLines: { type: 'numBer' },
				wholeWord: { type: 'Boolean' },
				caseSensitive: { type: 'Boolean' },
				regexp: { type: 'Boolean' },
				useIgnores: { type: 'Boolean' },
				showIncludesExcludes: { type: 'Boolean' },
				triggerSearch: { type: 'Boolean' },
				focusResults: { type: 'Boolean' },
			}
		}
	}]
} as const;

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: 'search.searchEditor.action.deleteFileResults',
			title: { value: localize('searchEditor.deleteResultBlock', "Delete File Results"), original: 'Delete File Results' },
			keyBinding: {
				weight: KeyBindingWeight.EditorContriB,
				when: SearchEditorConstants.InSearchEditor,
				primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.Backspace,
			},
			precondition: SearchEditorConstants.InSearchEditor,
			category,
			f1: true,
		});
	}

	async run(accessor: ServicesAccessor) {
		const contextService = accessor.get(IContextKeyService).getContext(document.activeElement);
		if (contextService.getValue(SearchEditorConstants.InSearchEditor.serialize())) {
			(accessor.get(IEditorService).activeEditorPane as SearchEditor).deleteResultBlock();
		}
	}
});

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: SearchEditorConstants.OpenNewEditorCommandId,
			title: { value: localize('search.openNewSearchEditor', "New Search Editor"), original: 'New Search Editor' },
			category,
			f1: true,
			description: openArgDescription
		});
	}
	async run(accessor: ServicesAccessor, args: OpenSearchEditorArgs) {
		await accessor.get(IInstantiationService).invokeFunction(openNewSearchEditor, { ...args, location: 'new' });
	}
});

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: SearchEditorConstants.OpenEditorCommandId,
			title: { value: localize('search.openSearchEditor', "Open Search Editor"), original: 'Open Search Editor' },
			category,
			f1: true,
			description: openArgDescription
		});
	}
	async run(accessor: ServicesAccessor, args: OpenSearchEditorArgs) {
		await accessor.get(IInstantiationService).invokeFunction(openNewSearchEditor, { ...args, location: 'reuse' });
	}
});

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: OpenNewEditorToSideCommandId,
			title: { value: localize('search.openNewEditorToSide', "Open new Search Editor to the Side"), original: 'Open new Search Editor to the Side' },
			category,
			f1: true,
			description: openArgDescription
		});
	}
	async run(accessor: ServicesAccessor, args: OpenSearchEditorArgs) {
		await accessor.get(IInstantiationService).invokeFunction(openNewSearchEditor, args, true);
	}
});

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: OpenInEditorCommandId,
			title: { value: localize('search.openResultsInEditor', "Open Results in Editor"), original: 'Open Results in Editor' },
			category,
			f1: true,
			keyBinding: {
				primary: KeyMod.Alt | KeyCode.Enter,
				when: ContextKeyExpr.and(SearchConstants.HasSearchResults, SearchConstants.SearchViewFocusedKey),
				weight: KeyBindingWeight.WorkBenchContriB,
				mac: {
					primary: KeyMod.CtrlCmd | KeyCode.Enter
				}
			},
		});
	}
	async run(accessor: ServicesAccessor) {
		const viewsService = accessor.get(IViewsService);
		const instantiationService = accessor.get(IInstantiationService);
		const searchView = getSearchView(viewsService);
		if (searchView) {
			await instantiationService.invokeFunction(createEditorFromSearchResult, searchView.searchResult, searchView.searchIncludePattern.getValue(), searchView.searchExcludePattern.getValue());
		}
	}
});

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: RerunSearchEditorSearchCommandId,
			title: { value: localize('search.rerunSearchInEditor', "Search Again"), original: 'Search Again' },
			category,
			keyBinding: {
				primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_R,
				when: SearchEditorConstants.InSearchEditor,
				weight: KeyBindingWeight.EditorContriB
			},
			icon: searchRefreshIcon,
			menu: [{
				id: MenuId.EditorTitle,
				group: 'navigation',
				when: ActiveEditorContext.isEqualTo(SearchEditorConstants.SearchEditorID)
			},
			{
				id: MenuId.CommandPalette,
				when: ActiveEditorContext.isEqualTo(SearchEditorConstants.SearchEditorID)
			}]
		});
	}
	async run(accessor: ServicesAccessor) {
		const editorService = accessor.get(IEditorService);
		const input = editorService.activeEditor;
		if (input instanceof SearchEditorInput) {
			(editorService.activeEditorPane as SearchEditor).triggerSearch({ resetCursor: false });
		}
	}
});

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: FocusQueryEditorWidgetCommandId,
			title: { value: localize('search.action.focusQueryEditorWidget', "Focus Search Editor Input"), original: 'Focus Search Editor Input' },
			category,
			menu: {
				id: MenuId.CommandPalette,
				when: ActiveEditorContext.isEqualTo(SearchEditorConstants.SearchEditorID)
			},
			keyBinding: {
				primary: KeyCode.Escape,
				when: SearchEditorConstants.InSearchEditor,
				weight: KeyBindingWeight.EditorContriB
			}
		});
	}
	async run(accessor: ServicesAccessor) {
		const editorService = accessor.get(IEditorService);
		const input = editorService.activeEditor;
		if (input instanceof SearchEditorInput) {
			(editorService.activeEditorPane as SearchEditor).focusSearchInput();
		}
	}
});
//#endregion
