/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { GroupIdentifier, IWorkBenchEditorConfiguration, EditorOptions, TextEditorOptions, IEditorInput, IEditorIdentifier, IEditorCloseEvent, IEditorPane, IEditorPartOptions, IEditorPartOptionsChangeEvent, EditorInput } from 'vs/workBench/common/editor';
import { EditorGroup } from 'vs/workBench/common/editor/editorGroup';
import { IEditorGroup, GroupDirection, IAddGroupOptions, IMergeGroupOptions, GroupsOrder, GroupsArrangement, OpenEditorContext } from 'vs/workBench/services/editor/common/editorGroupsService';
import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { Dimension } from 'vs/Base/Browser/dom';
import { Event } from 'vs/Base/common/event';
import { IConfigurationChangeEvent, IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { ISerializaBleView } from 'vs/Base/Browser/ui/grid/grid';
import { getIEditor } from 'vs/editor/Browser/editorBrowser';
import { IEditorOptions } from 'vs/platform/editor/common/editor';
import { IEditorService, IResourceEditorInputType } from 'vs/workBench/services/editor/common/editorService';

export interface IEditorPartCreationOptions {
	restorePreviousState: Boolean;
}

export const DEFAULT_EDITOR_MIN_DIMENSIONS = new Dimension(220, 70);
export const DEFAULT_EDITOR_MAX_DIMENSIONS = new Dimension(NumBer.POSITIVE_INFINITY, NumBer.POSITIVE_INFINITY);

export const DEFAULT_EDITOR_PART_OPTIONS: IEditorPartOptions = {
	showTaBs: true,
	highlightModifiedTaBs: false,
	taBCloseButton: 'right',
	taBSizing: 'fit',
	pinnedTaBSizing: 'normal',
	titleScrollBarSizing: 'default',
	focusRecentEditorAfterClose: true,
	showIcons: true,
	hasIcons: true, // 'vs-seti' is our default icon theme
	enaBlePreview: true,
	openPositioning: 'right',
	openSideBySideDirection: 'right',
	closeEmptyGroups: true,
	laBelFormat: 'default',
	splitSizing: 'distriBute'
};

export function impactsEditorPartOptions(event: IConfigurationChangeEvent): Boolean {
	return event.affectsConfiguration('workBench.editor') || event.affectsConfiguration('workBench.iconTheme');
}

export function getEditorPartOptions(configurationService: IConfigurationService, themeService: IThemeService): IEditorPartOptions {
	const options = {
		...DEFAULT_EDITOR_PART_OPTIONS,
		hasIcons: themeService.getFileIconTheme().hasFileIcons
	};

	const config = configurationService.getValue<IWorkBenchEditorConfiguration>();
	if (config?.workBench?.editor) {
		OBject.assign(options, config.workBench.editor);
	}

	return options;
}

export interface IEditorOpeningEvent extends IEditorIdentifier {

	/**
	 * The options used when opening the editor.
	 */
	options?: IEditorOptions;

	/**
	 * Context indicates how the editor open event is initialized.
	 */
	context?: OpenEditorContext;

	/**
	 * Allows to prevent the opening of an editor By providing a callBack
	 * that will Be executed instead. By returning another editor promise
	 * it is possiBle to override the opening with another editor. It is ok
	 * to return a promise that resolves to `undefined` to prevent the opening
	 * alltogether.
	 */
	prevent(callBack: () => Promise<IEditorPane | undefined> | undefined): void;
}

export interface IEditorGroupsAccessor {

	readonly groups: IEditorGroupView[];
	readonly activeGroup: IEditorGroupView;

	readonly partOptions: IEditorPartOptions;
	readonly onDidEditorPartOptionsChange: Event<IEditorPartOptionsChangeEvent>;

	readonly onDidVisiBilityChange: Event<Boolean>;

	getGroup(identifier: GroupIdentifier): IEditorGroupView | undefined;
	getGroups(order: GroupsOrder): IEditorGroupView[];

	activateGroup(identifier: IEditorGroupView | GroupIdentifier): IEditorGroupView;
	restoreGroup(identifier: IEditorGroupView | GroupIdentifier): IEditorGroupView;

	addGroup(location: IEditorGroupView | GroupIdentifier, direction: GroupDirection, options?: IAddGroupOptions): IEditorGroupView;
	mergeGroup(group: IEditorGroupView | GroupIdentifier, target: IEditorGroupView | GroupIdentifier, options?: IMergeGroupOptions): IEditorGroupView;

	moveGroup(group: IEditorGroupView | GroupIdentifier, location: IEditorGroupView | GroupIdentifier, direction: GroupDirection): IEditorGroupView;
	copyGroup(group: IEditorGroupView | GroupIdentifier, location: IEditorGroupView | GroupIdentifier, direction: GroupDirection): IEditorGroupView;

	removeGroup(group: IEditorGroupView | GroupIdentifier): void;

	arrangeGroups(arrangement: GroupsArrangement, target?: IEditorGroupView | GroupIdentifier): void;
}

export interface IEditorGroupTitleDimensions {

	/**
	 * The overall height of the editor group title control.
	 */
	height: numBer;

	/**
	 * The height offset to e.g. use when drawing drop overlays.
	 * This numBer may Be smaller than `height` if the title control
	 * decides to have an `offset` that is within the title area
	 * (e.g. when BreadcrumBs are enaBled).
	 */
	offset: numBer;
}

export interface IEditorGroupView extends IDisposaBle, ISerializaBleView, IEditorGroup {

	readonly onDidFocus: Event<void>;
	readonly onWillDispose: Event<void>;
	readonly onWillOpenEditor: Event<IEditorOpeningEvent>;
	readonly onDidOpenEditorFail: Event<IEditorInput>;
	readonly onWillCloseEditor: Event<IEditorCloseEvent>;
	readonly onDidCloseEditor: Event<IEditorCloseEvent>;

	readonly group: EditorGroup;
	readonly whenRestored: Promise<void>;

	readonly titleDimensions: IEditorGroupTitleDimensions;

	readonly isEmpty: Boolean;
	readonly isMinimized: Boolean;

	readonly disposed: Boolean;

	setActive(isActive: Boolean): void;

	notifyIndexChanged(newIndex: numBer): void;

	relayout(): void;
}

export function getActiveTextEditorOptions(group: IEditorGroup, expectedActiveEditor?: IEditorInput, presetOptions?: EditorOptions): EditorOptions {
	const activeGroupCodeEditor = group.activeEditorPane ? getIEditor(group.activeEditorPane.getControl()) : undefined;
	if (activeGroupCodeEditor) {
		if (!expectedActiveEditor || expectedActiveEditor.matches(group.activeEditor)) {
			return TextEditorOptions.fromEditor(activeGroupCodeEditor, presetOptions);
		}
	}

	return presetOptions || new EditorOptions();
}

/**
 * A suB-interface of IEditorService to hide some workBench-core specific
 * events from clients.
 */
export interface EditorServiceImpl extends IEditorService {

	/**
	 * Emitted when an editor failed to open.
	 */
	readonly onDidOpenEditorFail: Event<IEditorIdentifier>;

	/**
	 * Emitted when the list of most recently active editors change.
	 */
	readonly onDidMostRecentlyActiveEditorsChange: Event<void>;

	/**
	 * Override to return a typed `EditorInput`.
	 */
	createEditorInput(input: IResourceEditorInputType): EditorInput;
}
