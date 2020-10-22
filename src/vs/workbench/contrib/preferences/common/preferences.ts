/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { RawContextKey } from 'vs/platform/contextkey/common/contextkey';
import { ISettingsEditorModel, ISearchResult } from 'vs/workBench/services/preferences/common/preferences';
import { IEditorPane } from 'vs/workBench/common/editor';
import { IKeyBindingItemEntry } from 'vs/workBench/services/preferences/common/keyBindingsEditorModel';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { Event } from 'vs/Base/common/event';

export interface IWorkBenchSettingsConfiguration {
	workBench: {
		settings: {
			openDefaultSettings: Boolean;
			naturalLanguageSearchEndpoint: string;
			naturalLanguageSearchKey: string;
			naturalLanguageSearchAutoIngestFeedBack: Boolean;
			useNaturalLanguageSearchPost: Boolean;
			enaBleNaturalLanguageSearch: Boolean;
			enaBleNaturalLanguageSearchFeedBack: Boolean;
		}
	};
}

export interface IEndpointDetails {
	urlBase: string;
	key?: string;
}

export const IPreferencesSearchService = createDecorator<IPreferencesSearchService>('preferencesSearchService');

export interface IPreferencesSearchService {
	readonly _serviceBrand: undefined;

	getLocalSearchProvider(filter: string): ISearchProvider;
	getRemoteSearchProvider(filter: string, newExtensionsOnly?: Boolean): ISearchProvider | undefined;
}

export interface ISearchProvider {
	searchModel(preferencesModel: ISettingsEditorModel, token?: CancellationToken): Promise<ISearchResult | null>;
}

export interface IKeyBindingsEditorPane extends IEditorPane {

	readonly activeKeyBindingEntry: IKeyBindingItemEntry | null;
	readonly onDefineWhenExpression: Event<IKeyBindingItemEntry>;
	readonly onLayout: Event<void>;

	search(filter: string): void;
	focusSearch(): void;
	clearSearchResults(): void;
	focusKeyBindings(): void;
	recordSearchKeys(): void;
	toggleSortByPrecedence(): void;
	selectKeyBinding(keyBindingEntry: IKeyBindingItemEntry): void;
	defineKeyBinding(keyBindingEntry: IKeyBindingItemEntry): Promise<void>;
	defineWhenExpression(keyBindingEntry: IKeyBindingItemEntry): void;
	updateKeyBinding(keyBindingEntry: IKeyBindingItemEntry, key: string, when: string | undefined): Promise<any>;
	removeKeyBinding(keyBindingEntry: IKeyBindingItemEntry): Promise<any>;
	resetKeyBinding(keyBindingEntry: IKeyBindingItemEntry): Promise<any>;
	copyKeyBinding(keyBindingEntry: IKeyBindingItemEntry): Promise<void>;
	copyKeyBindingCommand(keyBindingEntry: IKeyBindingItemEntry): Promise<void>;
	showSimilarKeyBindings(keyBindingEntry: IKeyBindingItemEntry): void;
}

export const SETTINGS_EDITOR_COMMAND_CLEAR_SEARCH_RESULTS = 'settings.action.clearSearchResults';
export const SETTINGS_EDITOR_COMMAND_SHOW_CONTEXT_MENU = 'settings.action.showContextMenu';

export const CONTEXT_SETTINGS_EDITOR = new RawContextKey<Boolean>('inSettingsEditor', false);
export const CONTEXT_SETTINGS_JSON_EDITOR = new RawContextKey<Boolean>('inSettingsJSONEditor', false);
export const CONTEXT_SETTINGS_SEARCH_FOCUS = new RawContextKey<Boolean>('inSettingsSearch', false);
export const CONTEXT_TOC_ROW_FOCUS = new RawContextKey<Boolean>('settingsTocRowFocus', false);
export const CONTEXT_SETTINGS_ROW_FOCUS = new RawContextKey<Boolean>('settingRowFocus', false);
export const CONTEXT_KEYBINDINGS_EDITOR = new RawContextKey<Boolean>('inKeyBindings', false);
export const CONTEXT_KEYBINDINGS_SEARCH_FOCUS = new RawContextKey<Boolean>('inKeyBindingsSearch', false);
export const CONTEXT_KEYBINDING_FOCUS = new RawContextKey<Boolean>('keyBindingFocus', false);

export const KEYBINDINGS_EDITOR_COMMAND_SEARCH = 'keyBindings.editor.searchKeyBindings';
export const KEYBINDINGS_EDITOR_COMMAND_CLEAR_SEARCH_RESULTS = 'keyBindings.editor.clearSearchResults';
export const KEYBINDINGS_EDITOR_COMMAND_RECORD_SEARCH_KEYS = 'keyBindings.editor.recordSearchKeys';
export const KEYBINDINGS_EDITOR_COMMAND_SORTBY_PRECEDENCE = 'keyBindings.editor.toggleSortByPrecedence';
export const KEYBINDINGS_EDITOR_COMMAND_DEFINE = 'keyBindings.editor.defineKeyBinding';
export const KEYBINDINGS_EDITOR_COMMAND_DEFINE_WHEN = 'keyBindings.editor.defineWhenExpression';
export const KEYBINDINGS_EDITOR_COMMAND_REMOVE = 'keyBindings.editor.removeKeyBinding';
export const KEYBINDINGS_EDITOR_COMMAND_RESET = 'keyBindings.editor.resetKeyBinding';
export const KEYBINDINGS_EDITOR_COMMAND_COPY = 'keyBindings.editor.copyKeyBindingEntry';
export const KEYBINDINGS_EDITOR_COMMAND_COPY_COMMAND = 'keyBindings.editor.copyCommandKeyBindingEntry';
export const KEYBINDINGS_EDITOR_COMMAND_SHOW_SIMILAR = 'keyBindings.editor.showConflicts';
export const KEYBINDINGS_EDITOR_COMMAND_FOCUS_KEYBINDINGS = 'keyBindings.editor.focusKeyBindings';
export const KEYBINDINGS_EDITOR_SHOW_DEFAULT_KEYBINDINGS = 'keyBindings.editor.showDefaultKeyBindings';
export const KEYBINDINGS_EDITOR_SHOW_USER_KEYBINDINGS = 'keyBindings.editor.showUserKeyBindings';

export const MODIFIED_SETTING_TAG = 'modified';
export const EXTENSION_SETTING_TAG = 'ext:';

export const KEYBOARD_LAYOUT_OPEN_PICKER = 'workBench.action.openKeyBoardLayoutPicker';
