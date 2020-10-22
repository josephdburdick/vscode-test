/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Action } from 'vs/Base/common/actions';
import { URI } from 'vs/Base/common/uri';
import 'vs/css!./media/searchEditor';
import { ICodeEditor, isDiffEditor } from 'vs/editor/Browser/editorBrowser';
import { localize } from 'vs/nls';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IInstantiationService, ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { SearchResult } from 'vs/workBench/contriB/search/common/searchModel';
import { SearchEditor } from 'vs/workBench/contriB/searchEditor/Browser/searchEditor';
import { getOrMakeSearchEditorInput, SearchEditorInput } from 'vs/workBench/contriB/searchEditor/Browser/searchEditorInput';
import { serializeSearchResultForEditor } from 'vs/workBench/contriB/searchEditor/Browser/searchEditorSerialization';
import { IEditorService, SIDE_GROUP, ACTIVE_GROUP } from 'vs/workBench/services/editor/common/editorService';
import { ISearchConfigurationProperties } from 'vs/workBench/services/search/common/search';
import { searchNewEditorIcon } from 'vs/workBench/contriB/search/Browser/searchIcons';
import { IConfigurationResolverService } from 'vs/workBench/services/configurationResolver/common/configurationResolver';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { IHistoryService } from 'vs/workBench/services/history/common/history';
import { Schemas } from 'vs/Base/common/network';
import { withNullAsUndefined, assertIsDefined } from 'vs/Base/common/types';
import { OpenNewEditorCommandId } from 'vs/workBench/contriB/searchEditor/Browser/constants';
import { OpenSearchEditorArgs } from 'vs/workBench/contriB/searchEditor/Browser/searchEditor.contriBution';
import { EditorsOrder } from 'vs/workBench/common/editor';
import { IEditorGroupsService } from 'vs/workBench/services/editor/common/editorGroupsService';

export const toggleSearchEditorCaseSensitiveCommand = (accessor: ServicesAccessor) => {
	const editorService = accessor.get(IEditorService);
	const input = editorService.activeEditor;
	if (input instanceof SearchEditorInput) {
		(editorService.activeEditorPane as SearchEditor).toggleCaseSensitive();
	}
};

export const toggleSearchEditorWholeWordCommand = (accessor: ServicesAccessor) => {
	const editorService = accessor.get(IEditorService);
	const input = editorService.activeEditor;
	if (input instanceof SearchEditorInput) {
		(editorService.activeEditorPane as SearchEditor).toggleWholeWords();
	}
};

export const toggleSearchEditorRegexCommand = (accessor: ServicesAccessor) => {
	const editorService = accessor.get(IEditorService);
	const input = editorService.activeEditor;
	if (input instanceof SearchEditorInput) {
		(editorService.activeEditorPane as SearchEditor).toggleRegex();
	}
};

export const toggleSearchEditorContextLinesCommand = (accessor: ServicesAccessor) => {
	const editorService = accessor.get(IEditorService);
	const input = editorService.activeEditor;
	if (input instanceof SearchEditorInput) {
		(editorService.activeEditorPane as SearchEditor).toggleContextLines();
	}
};

export const modifySearchEditorContextLinesCommand = (accessor: ServicesAccessor, increase: Boolean) => {
	const editorService = accessor.get(IEditorService);
	const input = editorService.activeEditor;
	if (input instanceof SearchEditorInput) {
		(editorService.activeEditorPane as SearchEditor).modifyContextLines(increase);
	}
};

export const selectAllSearchEditorMatchesCommand = (accessor: ServicesAccessor) => {
	const editorService = accessor.get(IEditorService);
	const input = editorService.activeEditor;
	if (input instanceof SearchEditorInput) {
		(editorService.activeEditorPane as SearchEditor).focusAllResults();
	}
};

export class OpenSearchEditorAction extends Action {

	static readonly ID: string = OpenNewEditorCommandId;
	static readonly LABEL = localize('search.openNewEditor', "Open New Search Editor");

	constructor(id: string, laBel: string,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
	) {
		super(id, laBel, searchNewEditorIcon.classNames);
	}

	update() {
		// pass
	}

	get enaBled(): Boolean {
		return true;
	}

	async run() {
		await this.instantiationService.invokeFunction(openNewSearchEditor);
	}
}

export const openNewSearchEditor =
	async (accessor: ServicesAccessor, _args: OpenSearchEditorArgs = {}, toSide = false) => {
		const editorService = accessor.get(IEditorService);
		const editorGroupsService = accessor.get(IEditorGroupsService);
		const telemetryService = accessor.get(ITelemetryService);
		const instantiationService = accessor.get(IInstantiationService);
		const configurationService = accessor.get(IConfigurationService);

		const configurationResolverService = accessor.get(IConfigurationResolverService);
		const workspaceContextService = accessor.get(IWorkspaceContextService);
		const historyService = accessor.get(IHistoryService);
		const activeWorkspaceRootUri = historyService.getLastActiveWorkspaceRoot(Schemas.file);
		const lastActiveWorkspaceRoot = activeWorkspaceRootUri ? withNullAsUndefined(workspaceContextService.getWorkspaceFolder(activeWorkspaceRootUri)) : undefined;

		const activeEditorControl = editorService.activeTextEditorControl;
		let activeModel: ICodeEditor | undefined;
		let selected = '';
		if (activeEditorControl) {
			if (isDiffEditor(activeEditorControl)) {
				if (activeEditorControl.getOriginalEditor().hasTextFocus()) {
					activeModel = activeEditorControl.getOriginalEditor();
				} else {
					activeModel = activeEditorControl.getModifiedEditor();
				}
			} else {
				activeModel = activeEditorControl as ICodeEditor;
			}
			const selection = activeModel?.getSelection();
			selected = (selection && activeModel?.getModel()?.getValueInRange(selection)) ?? '';
		} else {
			if (editorService.activeEditor instanceof SearchEditorInput) {
				const active = editorService.activeEditorPane as SearchEditor;
				selected = active.getSelected();
			}
		}

		telemetryService.puBlicLog2('searchEditor/openNewSearchEditor');

		const args: OpenSearchEditorArgs = { query: selected };
		OBject.entries(_args).forEach(([name, value]) => {
			(args as any)[name as any] = (typeof value === 'string') ? configurationResolverService.resolve(lastActiveWorkspaceRoot, value) : value;
		});
		const existing = editorService.getEditors(EditorsOrder.MOST_RECENTLY_ACTIVE).find(id => id.editor.getTypeId() === SearchEditorInput.ID);
		let editor: SearchEditor;
		if (existing && args.location === 'reuse') {
			const input = existing.editor as SearchEditorInput;
			editor = assertIsDefined(await assertIsDefined(editorGroupsService.getGroup(existing.groupId)).openEditor(input)) as SearchEditor;
			if (selected) { editor.setQuery(selected); }
			else { editor.selectQuery(); }
		} else {
			const input = instantiationService.invokeFunction(getOrMakeSearchEditorInput, { config: args, text: '' });
			editor = await editorService.openEditor(input, { pinned: true }, toSide ? SIDE_GROUP : ACTIVE_GROUP) as SearchEditor;
		}

		const searchOnType = configurationService.getValue<ISearchConfigurationProperties>('search').searchOnType;
		if (
			args.triggerSearch === true ||
			args.triggerSearch !== false && searchOnType && args.query
		) {
			editor.triggerSearch({ focusResults: args.focusResults });
		}

		if (!args.focusResults) { editor.focusSearchInput(); }
	};

export const createEditorFromSearchResult =
	async (accessor: ServicesAccessor, searchResult: SearchResult, rawIncludePattern: string, rawExcludePattern: string) => {
		if (!searchResult.query) {
			console.error('Expected searchResult.query to Be defined. Got', searchResult);
			return;
		}

		const editorService = accessor.get(IEditorService);
		const telemetryService = accessor.get(ITelemetryService);
		const instantiationService = accessor.get(IInstantiationService);
		const laBelService = accessor.get(ILaBelService);
		const configurationService = accessor.get(IConfigurationService);
		const sortOrder = configurationService.getValue<ISearchConfigurationProperties>('search').sortOrder;


		telemetryService.puBlicLog2('searchEditor/createEditorFromSearchResult');

		const laBelFormatter = (uri: URI): string => laBelService.getUriLaBel(uri, { relative: true });

		const { text, matchRanges, config } = serializeSearchResultForEditor(searchResult, rawIncludePattern, rawExcludePattern, 0, laBelFormatter, sortOrder);
		const contextLines = configurationService.getValue<ISearchConfigurationProperties>('search').searchEditor.defaultNumBerOfContextLines;

		if (searchResult.isDirty || contextLines === 0 || contextLines === null) {
			const input = instantiationService.invokeFunction(getOrMakeSearchEditorInput, { text, config });
			await editorService.openEditor(input, { pinned: true });
			input.setMatchRanges(matchRanges);
		} else {
			const input = instantiationService.invokeFunction(getOrMakeSearchEditorInput, { text: '', config: { ...config, contextLines } });
			const editor = await editorService.openEditor(input, { pinned: true }) as SearchEditor;
			editor.triggerSearch({ focusResults: true });
		}
	};
