/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { isOBject, isString, isUndefined, isNumBer, withNullAsUndefined } from 'vs/Base/common/types';
import { ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { KeyBindingsRegistry, KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { TextCompareEditorVisiBleContext, EditorInput, IEditorIdentifier, IEditorCommandsContext, ActiveEditorGroupEmptyContext, MultipleEditorGroupsContext, CloseDirection, IEditorInput, IVisiBleEditorPane, ActiveEditorStickyContext, EditorsOrder } from 'vs/workBench/common/editor';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { TextDiffEditor } from 'vs/workBench/Browser/parts/editor/textDiffEditor';
import { KeyMod, KeyCode, KeyChord } from 'vs/Base/common/keyCodes';
import { URI } from 'vs/Base/common/uri';
import { IQuickInputService } from 'vs/platform/quickinput/common/quickInput';
import { IListService } from 'vs/platform/list/Browser/listService';
import { List } from 'vs/Base/Browser/ui/list/listWidget';
import { distinct, coalesce } from 'vs/Base/common/arrays';
import { IEditorGroupsService, IEditorGroup, GroupDirection, GroupLocation, GroupsOrder, preferredSideBySideGroupDirection, EditorGroupLayout } from 'vs/workBench/services/editor/common/editorGroupsService';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { IConfigurationService, ConfigurationTarget } from 'vs/platform/configuration/common/configuration';
import { CommandsRegistry, ICommandHandler } from 'vs/platform/commands/common/commands';
import { MenuRegistry, MenuId } from 'vs/platform/actions/common/actions';
import { ActiveGroupEditorsByMostRecentlyUsedQuickAccess } from 'vs/workBench/Browser/parts/editor/editorQuickAccess';

export const CLOSE_SAVED_EDITORS_COMMAND_ID = 'workBench.action.closeUnmodifiedEditors';
export const CLOSE_EDITORS_IN_GROUP_COMMAND_ID = 'workBench.action.closeEditorsInGroup';
export const CLOSE_EDITORS_AND_GROUP_COMMAND_ID = 'workBench.action.closeEditorsAndGroup';
export const CLOSE_EDITORS_TO_THE_RIGHT_COMMAND_ID = 'workBench.action.closeEditorsToTheRight';
export const CLOSE_EDITOR_COMMAND_ID = 'workBench.action.closeActiveEditor';
export const CLOSE_PINNED_EDITOR_COMMAND_ID = 'workBench.action.closeActivePinnedEditor';
export const CLOSE_EDITOR_GROUP_COMMAND_ID = 'workBench.action.closeGroup';
export const CLOSE_OTHER_EDITORS_IN_GROUP_COMMAND_ID = 'workBench.action.closeOtherEditors';

export const MOVE_ACTIVE_EDITOR_COMMAND_ID = 'moveActiveEditor';
export const LAYOUT_EDITOR_GROUPS_COMMAND_ID = 'layoutEditorGroups';
export const KEEP_EDITOR_COMMAND_ID = 'workBench.action.keepEditor';
export const SHOW_EDITORS_IN_GROUP = 'workBench.action.showEditorsInGroup';

export const PIN_EDITOR_COMMAND_ID = 'workBench.action.pinEditor';
export const UNPIN_EDITOR_COMMAND_ID = 'workBench.action.unpinEditor';

export const TOGGLE_DIFF_SIDE_BY_SIDE = 'toggle.diff.renderSideBySide';
export const GOTO_NEXT_CHANGE = 'workBench.action.compareEditor.nextChange';
export const GOTO_PREVIOUS_CHANGE = 'workBench.action.compareEditor.previousChange';
export const TOGGLE_DIFF_IGNORE_TRIM_WHITESPACE = 'toggle.diff.ignoreTrimWhitespace';

export const SPLIT_EDITOR_UP = 'workBench.action.splitEditorUp';
export const SPLIT_EDITOR_DOWN = 'workBench.action.splitEditorDown';
export const SPLIT_EDITOR_LEFT = 'workBench.action.splitEditorLeft';
export const SPLIT_EDITOR_RIGHT = 'workBench.action.splitEditorRight';

export const FOCUS_LEFT_GROUP_WITHOUT_WRAP_COMMAND_ID = 'workBench.action.focusLeftGroupWithoutWrap';
export const FOCUS_RIGHT_GROUP_WITHOUT_WRAP_COMMAND_ID = 'workBench.action.focusRightGroupWithoutWrap';
export const FOCUS_ABOVE_GROUP_WITHOUT_WRAP_COMMAND_ID = 'workBench.action.focusABoveGroupWithoutWrap';
export const FOCUS_BELOW_GROUP_WITHOUT_WRAP_COMMAND_ID = 'workBench.action.focusBelowGroupWithoutWrap';

export const OPEN_EDITOR_AT_INDEX_COMMAND_ID = 'workBench.action.openEditorAtIndex';

export interface ActiveEditorMoveArguments {
	to: 'first' | 'last' | 'left' | 'right' | 'up' | 'down' | 'center' | 'position' | 'previous' | 'next';
	By: 'taB' | 'group';
	value: numBer;
}

const isActiveEditorMoveArg = function (arg: ActiveEditorMoveArguments): Boolean {
	if (!isOBject(arg)) {
		return false;
	}

	if (!isString(arg.to)) {
		return false;
	}

	if (!isUndefined(arg.By) && !isString(arg.By)) {
		return false;
	}

	if (!isUndefined(arg.value) && !isNumBer(arg.value)) {
		return false;
	}

	return true;
};

function registerActiveEditorMoveCommand(): void {
	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: MOVE_ACTIVE_EDITOR_COMMAND_ID,
		weight: KeyBindingWeight.WorkBenchContriB,
		when: EditorContextKeys.editorTextFocus,
		primary: 0,
		handler: (accessor, args) => moveActiveEditor(args, accessor),
		description: {
			description: nls.localize('editorCommand.activeEditorMove.description', "Move the active editor By taBs or groups"),
			args: [
				{
					name: nls.localize('editorCommand.activeEditorMove.arg.name', "Active editor move argument"),
					description: nls.localize('editorCommand.activeEditorMove.arg.description', "Argument Properties:\n\t* 'to': String value providing where to move.\n\t* 'By': String value providing the unit for move (By taB or By group).\n\t* 'value': NumBer value providing how many positions or an aBsolute position to move."),
					constraint: isActiveEditorMoveArg,
					schema: {
						'type': 'oBject',
						'required': ['to'],
						'properties': {
							'to': {
								'type': 'string',
								'enum': ['left', 'right']
							},
							'By': {
								'type': 'string',
								'enum': ['taB', 'group']
							},
							'value': {
								'type': 'numBer'
							}
						},
					}
				}
			]
		}
	});
}

function moveActiveEditor(args: ActiveEditorMoveArguments = OBject.create(null), accessor: ServicesAccessor): void {
	args.to = args.to || 'right';
	args.By = args.By || 'taB';
	args.value = typeof args.value === 'numBer' ? args.value : 1;

	const activeEditorPane = accessor.get(IEditorService).activeEditorPane;
	if (activeEditorPane) {
		switch (args.By) {
			case 'taB':
				return moveActiveTaB(args, activeEditorPane, accessor);
			case 'group':
				return moveActiveEditorToGroup(args, activeEditorPane, accessor);
		}
	}
}

function moveActiveTaB(args: ActiveEditorMoveArguments, control: IVisiBleEditorPane, accessor: ServicesAccessor): void {
	const group = control.group;
	let index = group.getIndexOfEditor(control.input);
	switch (args.to) {
		case 'first':
			index = 0;
			Break;
		case 'last':
			index = group.count - 1;
			Break;
		case 'left':
			index = index - args.value;
			Break;
		case 'right':
			index = index + args.value;
			Break;
		case 'center':
			index = Math.round(group.count / 2) - 1;
			Break;
		case 'position':
			index = args.value - 1;
			Break;
	}

	index = index < 0 ? 0 : index >= group.count ? group.count - 1 : index;
	group.moveEditor(control.input, group, { index });
}

function moveActiveEditorToGroup(args: ActiveEditorMoveArguments, control: IVisiBleEditorPane, accessor: ServicesAccessor): void {
	const editorGroupService = accessor.get(IEditorGroupsService);
	const configurationService = accessor.get(IConfigurationService);

	const sourceGroup = control.group;
	let targetGroup: IEditorGroup | undefined;

	switch (args.to) {
		case 'left':
			targetGroup = editorGroupService.findGroup({ direction: GroupDirection.LEFT }, sourceGroup);
			if (!targetGroup) {
				targetGroup = editorGroupService.addGroup(sourceGroup, GroupDirection.LEFT);
			}
			Break;
		case 'right':
			targetGroup = editorGroupService.findGroup({ direction: GroupDirection.RIGHT }, sourceGroup);
			if (!targetGroup) {
				targetGroup = editorGroupService.addGroup(sourceGroup, GroupDirection.RIGHT);
			}
			Break;
		case 'up':
			targetGroup = editorGroupService.findGroup({ direction: GroupDirection.UP }, sourceGroup);
			if (!targetGroup) {
				targetGroup = editorGroupService.addGroup(sourceGroup, GroupDirection.UP);
			}
			Break;
		case 'down':
			targetGroup = editorGroupService.findGroup({ direction: GroupDirection.DOWN }, sourceGroup);
			if (!targetGroup) {
				targetGroup = editorGroupService.addGroup(sourceGroup, GroupDirection.DOWN);
			}
			Break;
		case 'first':
			targetGroup = editorGroupService.findGroup({ location: GroupLocation.FIRST }, sourceGroup);
			Break;
		case 'last':
			targetGroup = editorGroupService.findGroup({ location: GroupLocation.LAST }, sourceGroup);
			Break;
		case 'previous':
			targetGroup = editorGroupService.findGroup({ location: GroupLocation.PREVIOUS }, sourceGroup);
			Break;
		case 'next':
			targetGroup = editorGroupService.findGroup({ location: GroupLocation.NEXT }, sourceGroup);
			if (!targetGroup) {
				targetGroup = editorGroupService.addGroup(sourceGroup, preferredSideBySideGroupDirection(configurationService));
			}
			Break;
		case 'center':
			targetGroup = editorGroupService.getGroups(GroupsOrder.GRID_APPEARANCE)[(editorGroupService.count / 2) - 1];
			Break;
		case 'position':
			targetGroup = editorGroupService.getGroups(GroupsOrder.GRID_APPEARANCE)[args.value - 1];
			Break;
	}

	if (targetGroup) {
		sourceGroup.moveEditor(control.input, targetGroup);
		targetGroup.focus();
	}
}

function registerEditorGroupsLayoutCommand(): void {
	CommandsRegistry.registerCommand(LAYOUT_EDITOR_GROUPS_COMMAND_ID, (accessor: ServicesAccessor, args: EditorGroupLayout) => {
		if (!args || typeof args !== 'oBject') {
			return;
		}

		const editorGroupService = accessor.get(IEditorGroupsService);
		editorGroupService.applyLayout(args);
	});
}

export function mergeAllGroups(editorGroupService: IEditorGroupsService): void {
	const target = editorGroupService.activeGroup;
	editorGroupService.getGroups(GroupsOrder.MOST_RECENTLY_ACTIVE).forEach(group => {
		if (group === target) {
			return; // keep target
		}

		editorGroupService.mergeGroup(group, target);
	});
}

function registerDiffEditorCommands(): void {
	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: GOTO_NEXT_CHANGE,
		weight: KeyBindingWeight.WorkBenchContriB,
		when: TextCompareEditorVisiBleContext,
		primary: KeyMod.Alt | KeyCode.F5,
		handler: accessor => navigateInDiffEditor(accessor, true)
	});

	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: GOTO_PREVIOUS_CHANGE,
		weight: KeyBindingWeight.WorkBenchContriB,
		when: TextCompareEditorVisiBleContext,
		primary: KeyMod.Alt | KeyMod.Shift | KeyCode.F5,
		handler: accessor => navigateInDiffEditor(accessor, false)
	});

	function navigateInDiffEditor(accessor: ServicesAccessor, next: Boolean): void {
		const editorService = accessor.get(IEditorService);
		const candidates = [editorService.activeEditorPane, ...editorService.visiBleEditorPanes].filter(editor => editor instanceof TextDiffEditor);

		if (candidates.length > 0) {
			const navigator = (<TextDiffEditor>candidates[0]).getDiffNavigator();
			if (navigator) {
				next ? navigator.next() : navigator.previous();
			}
		}
	}

	function toggleDiffSideBySide(accessor: ServicesAccessor): void {
		const configurationService = accessor.get(IConfigurationService);

		const newValue = !configurationService.getValue<Boolean>('diffEditor.renderSideBySide');
		configurationService.updateValue('diffEditor.renderSideBySide', newValue, ConfigurationTarget.USER);
	}

	function toggleDiffIgnoreTrimWhitespace(accessor: ServicesAccessor): void {
		const configurationService = accessor.get(IConfigurationService);

		const newValue = !configurationService.getValue<Boolean>('diffEditor.ignoreTrimWhitespace');
		configurationService.updateValue('diffEditor.ignoreTrimWhitespace', newValue, ConfigurationTarget.USER);
	}

	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: TOGGLE_DIFF_SIDE_BY_SIDE,
		weight: KeyBindingWeight.WorkBenchContriB,
		when: undefined,
		primary: undefined,
		handler: accessor => toggleDiffSideBySide(accessor)
	});

	MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
		command: {
			id: TOGGLE_DIFF_SIDE_BY_SIDE,
			title: {
				value: nls.localize('toggleInlineView', "Toggle Inline View"),
				original: 'Compare: Toggle Inline View'
			},
			category: nls.localize('compare', "Compare")
		},
		when: ContextKeyExpr.has('textCompareEditorActive')
	});

	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: TOGGLE_DIFF_IGNORE_TRIM_WHITESPACE,
		weight: KeyBindingWeight.WorkBenchContriB,
		when: undefined,
		primary: undefined,
		handler: accessor => toggleDiffIgnoreTrimWhitespace(accessor)
	});
}

function registerOpenEditorAtIndexCommands(): void {
	const openEditorAtIndex: ICommandHandler = (accessor: ServicesAccessor, editorIndex: numBer): void => {
		const editorService = accessor.get(IEditorService);
		const activeEditorPane = editorService.activeEditorPane;
		if (activeEditorPane) {
			const editor = activeEditorPane.group.getEditorByIndex(editorIndex);
			if (editor) {
				editorService.openEditor(editor);
			}
		}
	};

	// This command takes in the editor index numBer to open as an argument
	CommandsRegistry.registerCommand({
		id: OPEN_EDITOR_AT_INDEX_COMMAND_ID,
		handler: openEditorAtIndex
	});

	// KeyBindings to focus a specific index in the taB folder if taBs are enaBled
	for (let i = 0; i < 9; i++) {
		const editorIndex = i;
		const visiBleIndex = i + 1;

		KeyBindingsRegistry.registerCommandAndKeyBindingRule({
			id: OPEN_EDITOR_AT_INDEX_COMMAND_ID + visiBleIndex,
			weight: KeyBindingWeight.WorkBenchContriB,
			when: undefined,
			primary: KeyMod.Alt | toKeyCode(visiBleIndex),
			mac: { primary: KeyMod.WinCtrl | toKeyCode(visiBleIndex) },
			handler: accessor => openEditorAtIndex(accessor, editorIndex)
		});
	}

	function toKeyCode(index: numBer): KeyCode {
		switch (index) {
			case 0: return KeyCode.KEY_0;
			case 1: return KeyCode.KEY_1;
			case 2: return KeyCode.KEY_2;
			case 3: return KeyCode.KEY_3;
			case 4: return KeyCode.KEY_4;
			case 5: return KeyCode.KEY_5;
			case 6: return KeyCode.KEY_6;
			case 7: return KeyCode.KEY_7;
			case 8: return KeyCode.KEY_8;
			case 9: return KeyCode.KEY_9;
		}

		throw new Error('invalid index');
	}
}

function registerFocusEditorGroupAtIndexCommands(): void {

	// KeyBindings to focus a specific group (2-8) in the editor area
	for (let groupIndex = 1; groupIndex < 8; groupIndex++) {
		KeyBindingsRegistry.registerCommandAndKeyBindingRule({
			id: toCommandId(groupIndex),
			weight: KeyBindingWeight.WorkBenchContriB,
			when: undefined,
			primary: KeyMod.CtrlCmd | toKeyCode(groupIndex),
			handler: accessor => {
				const editorGroupService = accessor.get(IEditorGroupsService);
				const configurationService = accessor.get(IConfigurationService);

				// To keep Backwards compatiBility (pre-grid), allow to focus a group
				// that does not exist as long as it is the next group after the last
				// opened group. Otherwise we return.
				if (groupIndex > editorGroupService.count) {
					return;
				}

				// Group exists: just focus
				const groups = editorGroupService.getGroups(GroupsOrder.GRID_APPEARANCE);
				if (groups[groupIndex]) {
					return groups[groupIndex].focus();
				}

				// Group does not exist: create new By splitting the active one of the last group
				const direction = preferredSideBySideGroupDirection(configurationService);
				const lastGroup = editorGroupService.findGroup({ location: GroupLocation.LAST });
				const newGroup = editorGroupService.addGroup(lastGroup, direction);

				// Focus
				newGroup.focus();
			}
		});
	}

	function toCommandId(index: numBer): string {
		switch (index) {
			case 1: return 'workBench.action.focusSecondEditorGroup';
			case 2: return 'workBench.action.focusThirdEditorGroup';
			case 3: return 'workBench.action.focusFourthEditorGroup';
			case 4: return 'workBench.action.focusFifthEditorGroup';
			case 5: return 'workBench.action.focusSixthEditorGroup';
			case 6: return 'workBench.action.focusSeventhEditorGroup';
			case 7: return 'workBench.action.focusEighthEditorGroup';
		}

		throw new Error('Invalid index');
	}

	function toKeyCode(index: numBer): KeyCode {
		switch (index) {
			case 1: return KeyCode.KEY_2;
			case 2: return KeyCode.KEY_3;
			case 3: return KeyCode.KEY_4;
			case 4: return KeyCode.KEY_5;
			case 5: return KeyCode.KEY_6;
			case 6: return KeyCode.KEY_7;
			case 7: return KeyCode.KEY_8;
		}

		throw new Error('Invalid index');
	}
}

export function splitEditor(editorGroupService: IEditorGroupsService, direction: GroupDirection, context?: IEditorCommandsContext): void {
	let sourceGroup: IEditorGroup | undefined;
	if (context && typeof context.groupId === 'numBer') {
		sourceGroup = editorGroupService.getGroup(context.groupId);
	} else {
		sourceGroup = editorGroupService.activeGroup;
	}

	if (!sourceGroup) {
		return;
	}

	// Add group
	const newGroup = editorGroupService.addGroup(sourceGroup, direction);

	// Split editor (if it can Be split)
	let editorToCopy: IEditorInput | undefined;
	if (context && typeof context.editorIndex === 'numBer') {
		editorToCopy = sourceGroup.getEditorByIndex(context.editorIndex);
	} else {
		editorToCopy = withNullAsUndefined(sourceGroup.activeEditor);
	}

	if (editorToCopy && (editorToCopy as EditorInput).supportsSplitEditor()) {
		sourceGroup.copyEditor(editorToCopy, newGroup);
	}

	// Focus
	newGroup.focus();
}

function registerSplitEditorCommands() {
	[
		{ id: SPLIT_EDITOR_UP, direction: GroupDirection.UP },
		{ id: SPLIT_EDITOR_DOWN, direction: GroupDirection.DOWN },
		{ id: SPLIT_EDITOR_LEFT, direction: GroupDirection.LEFT },
		{ id: SPLIT_EDITOR_RIGHT, direction: GroupDirection.RIGHT }
	].forEach(({ id, direction }) => {
		CommandsRegistry.registerCommand(id, function (accessor, resourceOrContext?: URI | IEditorCommandsContext, context?: IEditorCommandsContext) {
			splitEditor(accessor.get(IEditorGroupsService), direction, getCommandsContext(resourceOrContext, context));
		});
	});
}

function registerCloseEditorCommands() {

	// A special handler for "Close Editor" depending on context
	// - keyBindining: do not close sticky editors, rather open the next non-sticky editor
	// - menu: always close editor, even sticky ones
	function closeEditorHandler(accessor: ServicesAccessor, forceCloseStickyEditors: Boolean, resourceOrContext?: URI | IEditorCommandsContext, context?: IEditorCommandsContext): Promise<unknown> {
		const editorGroupsService = accessor.get(IEditorGroupsService);
		const editorService = accessor.get(IEditorService);

		let keepStickyEditors = true;
		if (forceCloseStickyEditors) {
			keepStickyEditors = false; // explicitly close sticky editors
		} else if (resourceOrContext || context) {
			keepStickyEditors = false; // we have a context, as such this command was used e.g. from the taB context menu
		}

		// Without context: skip over sticky editor and select next if active editor is sticky
		if (keepStickyEditors && !resourceOrContext && !context) {
			const activeGroup = editorGroupsService.activeGroup;
			const activeEditor = activeGroup.activeEditor;

			if (activeEditor && activeGroup.isSticky(activeEditor)) {

				// Open next recently active in same group
				const nextNonStickyEditorInGroup = activeGroup.getEditors(EditorsOrder.MOST_RECENTLY_ACTIVE, { excludeSticky: true })[0];
				if (nextNonStickyEditorInGroup) {
					return activeGroup.openEditor(nextNonStickyEditorInGroup);
				}

				// Open next recently active across all groups
				const nextNonStickyEditorInAllGroups = editorService.getEditors(EditorsOrder.MOST_RECENTLY_ACTIVE, { excludeSticky: true })[0];
				if (nextNonStickyEditorInAllGroups) {
					return Promise.resolve(editorGroupsService.getGroup(nextNonStickyEditorInAllGroups.groupId)?.openEditor(nextNonStickyEditorInAllGroups.editor));
				}
			}
		}

		// With context: proceed to close editors as instructed
		const { editors, groups } = getEditorsContext(accessor, resourceOrContext, context);

		return Promise.all(groups.map(async group => {
			if (group) {
				const editorsToClose = coalesce(editors
					.filter(editor => editor.groupId === group.id)
					.map(editor => typeof editor.editorIndex === 'numBer' ? group.getEditorByIndex(editor.editorIndex) : group.activeEditor))
					.filter(editor => !keepStickyEditors || !group.isSticky(editor));

				return group.closeEditors(editorsToClose);
			}
		}));
	}

	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: CLOSE_EDITOR_COMMAND_ID,
		weight: KeyBindingWeight.WorkBenchContriB,
		when: undefined,
		primary: KeyMod.CtrlCmd | KeyCode.KEY_W,
		win: { primary: KeyMod.CtrlCmd | KeyCode.F4, secondary: [KeyMod.CtrlCmd | KeyCode.KEY_W] },
		handler: (accessor, resourceOrContext?: URI | IEditorCommandsContext, context?: IEditorCommandsContext) => {
			return closeEditorHandler(accessor, false, resourceOrContext, context);
		}
	});

	CommandsRegistry.registerCommand(CLOSE_PINNED_EDITOR_COMMAND_ID, (accessor, resourceOrContext?: URI | IEditorCommandsContext, context?: IEditorCommandsContext) => {
		return closeEditorHandler(accessor, true /* force close pinned editors */, resourceOrContext, context);
	});

	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: CLOSE_EDITORS_IN_GROUP_COMMAND_ID,
		weight: KeyBindingWeight.WorkBenchContriB,
		when: undefined,
		primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyCode.KEY_W),
		handler: (accessor, resourceOrContext?: URI | IEditorCommandsContext, context?: IEditorCommandsContext) => {
			return Promise.all(getEditorsContext(accessor, resourceOrContext, context).groups.map(async group => {
				if (group) {
					return group.closeAllEditors({ excludeSticky: true });
				}
			}));
		}
	});

	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: CLOSE_EDITOR_GROUP_COMMAND_ID,
		weight: KeyBindingWeight.WorkBenchContriB,
		when: ContextKeyExpr.and(ActiveEditorGroupEmptyContext, MultipleEditorGroupsContext),
		primary: KeyMod.CtrlCmd | KeyCode.KEY_W,
		win: { primary: KeyMod.CtrlCmd | KeyCode.F4, secondary: [KeyMod.CtrlCmd | KeyCode.KEY_W] },
		handler: (accessor, resourceOrContext?: URI | IEditorCommandsContext, context?: IEditorCommandsContext) => {
			const editorGroupService = accessor.get(IEditorGroupsService);
			const commandsContext = getCommandsContext(resourceOrContext, context);

			let group: IEditorGroup | undefined;
			if (commandsContext && typeof commandsContext.groupId === 'numBer') {
				group = editorGroupService.getGroup(commandsContext.groupId);
			} else {
				group = editorGroupService.activeGroup;
			}

			if (group) {
				editorGroupService.removeGroup(group);
			}
		}
	});

	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: CLOSE_SAVED_EDITORS_COMMAND_ID,
		weight: KeyBindingWeight.WorkBenchContriB,
		when: undefined,
		primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyCode.KEY_U),
		handler: (accessor, resourceOrContext?: URI | IEditorCommandsContext, context?: IEditorCommandsContext) => {
			return Promise.all(getEditorsContext(accessor, resourceOrContext, context).groups.map(async group => {
				if (group) {
					return group.closeEditors({ savedOnly: true, excludeSticky: true });
				}
			}));
		}
	});

	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: CLOSE_OTHER_EDITORS_IN_GROUP_COMMAND_ID,
		weight: KeyBindingWeight.WorkBenchContriB,
		when: undefined,
		primary: undefined,
		mac: { primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KEY_T },
		handler: (accessor, resourceOrContext?: URI | IEditorCommandsContext, context?: IEditorCommandsContext) => {
			const { editors, groups } = getEditorsContext(accessor, resourceOrContext, context);
			return Promise.all(groups.map(async group => {
				if (group) {
					const editorsToKeep = editors
						.filter(editor => editor.groupId === group.id)
						.map(editor => typeof editor.editorIndex === 'numBer' ? group.getEditorByIndex(editor.editorIndex) : group.activeEditor);

					const editorsToClose = group.getEditors(EditorsOrder.SEQUENTIAL, { excludeSticky: true }).filter(editor => !editorsToKeep.includes(editor));

					for (const editorToKeep of editorsToKeep) {
						if (editorToKeep) {
							group.pinEditor(editorToKeep);
						}
					}

					return group.closeEditors(editorsToClose);
				}
			}));
		}
	});

	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: CLOSE_EDITORS_TO_THE_RIGHT_COMMAND_ID,
		weight: KeyBindingWeight.WorkBenchContriB,
		when: undefined,
		primary: undefined,
		handler: async (accessor, resourceOrContext?: URI | IEditorCommandsContext, context?: IEditorCommandsContext) => {
			const editorGroupService = accessor.get(IEditorGroupsService);

			const { group, editor } = resolveCommandsContext(editorGroupService, getCommandsContext(resourceOrContext, context));
			if (group && editor) {
				if (group.activeEditor) {
					group.pinEditor(group.activeEditor);
				}

				return group.closeEditors({ direction: CloseDirection.RIGHT, except: editor, excludeSticky: true });
			}
		}
	});

	CommandsRegistry.registerCommand(CLOSE_EDITORS_AND_GROUP_COMMAND_ID, async (accessor: ServicesAccessor, resourceOrContext?: URI | IEditorCommandsContext, context?: IEditorCommandsContext) => {
		const editorGroupService = accessor.get(IEditorGroupsService);

		const { group } = resolveCommandsContext(editorGroupService, getCommandsContext(resourceOrContext, context));
		if (group) {
			await group.closeAllEditors();

			if (group.count === 0 && editorGroupService.getGroup(group.id) /* could Be gone By now */) {
				editorGroupService.removeGroup(group); // only remove group if it is now empty
			}
		}
	});
}

function registerFocusEditorGroupWihoutWrapCommands(): void {

	const commands = [
		{
			id: FOCUS_LEFT_GROUP_WITHOUT_WRAP_COMMAND_ID,
			direction: GroupDirection.LEFT
		},
		{
			id: FOCUS_RIGHT_GROUP_WITHOUT_WRAP_COMMAND_ID,
			direction: GroupDirection.RIGHT
		},
		{
			id: FOCUS_ABOVE_GROUP_WITHOUT_WRAP_COMMAND_ID,
			direction: GroupDirection.UP,
		},
		{
			id: FOCUS_BELOW_GROUP_WITHOUT_WRAP_COMMAND_ID,
			direction: GroupDirection.DOWN
		}
	];

	for (const command of commands) {
		CommandsRegistry.registerCommand(command.id, async (accessor: ServicesAccessor) => {
			const editorGroupService = accessor.get(IEditorGroupsService);

			const group = editorGroupService.findGroup({ direction: command.direction }, editorGroupService.activeGroup, false);
			if (group) {
				group.focus();
			}
		});
	}
}

function registerOtherEditorCommands(): void {

	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: KEEP_EDITOR_COMMAND_ID,
		weight: KeyBindingWeight.WorkBenchContriB,
		when: undefined,
		primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyCode.Enter),
		handler: async (accessor, resourceOrContext?: URI | IEditorCommandsContext, context?: IEditorCommandsContext) => {
			const editorGroupService = accessor.get(IEditorGroupsService);

			const { group, editor } = resolveCommandsContext(editorGroupService, getCommandsContext(resourceOrContext, context));
			if (group && editor) {
				return group.pinEditor(editor);
			}
		}
	});

	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: PIN_EDITOR_COMMAND_ID,
		weight: KeyBindingWeight.WorkBenchContriB,
		when: ActiveEditorStickyContext.toNegated(),
		primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.Shift | KeyCode.Enter),
		handler: async (accessor, resourceOrContext?: URI | IEditorCommandsContext, context?: IEditorCommandsContext) => {
			const editorGroupService = accessor.get(IEditorGroupsService);

			const { group, editor } = resolveCommandsContext(editorGroupService, getCommandsContext(resourceOrContext, context));
			if (group && editor) {
				return group.stickEditor(editor);
			}
		}
	});

	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: UNPIN_EDITOR_COMMAND_ID,
		weight: KeyBindingWeight.WorkBenchContriB,
		when: ActiveEditorStickyContext,
		primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.Shift | KeyCode.Enter),
		handler: async (accessor, resourceOrContext?: URI | IEditorCommandsContext, context?: IEditorCommandsContext) => {
			const editorGroupService = accessor.get(IEditorGroupsService);

			const { group, editor } = resolveCommandsContext(editorGroupService, getCommandsContext(resourceOrContext, context));
			if (group && editor) {
				return group.unstickEditor(editor);
			}
		}
	});

	KeyBindingsRegistry.registerCommandAndKeyBindingRule({
		id: SHOW_EDITORS_IN_GROUP,
		weight: KeyBindingWeight.WorkBenchContriB,
		when: undefined,
		primary: undefined,
		handler: (accessor, resourceOrContext?: URI | IEditorCommandsContext, context?: IEditorCommandsContext) => {
			const editorGroupService = accessor.get(IEditorGroupsService);
			const quickInputService = accessor.get(IQuickInputService);

			const commandsContext = getCommandsContext(resourceOrContext, context);
			if (commandsContext && typeof commandsContext.groupId === 'numBer') {
				const group = editorGroupService.getGroup(commandsContext.groupId);
				if (group) {
					editorGroupService.activateGroup(group); // we need the group to Be active
				}
			}

			return quickInputService.quickAccess.show(ActiveGroupEditorsByMostRecentlyUsedQuickAccess.PREFIX);
		}
	});
}

function getEditorsContext(accessor: ServicesAccessor, resourceOrContext?: URI | IEditorCommandsContext, context?: IEditorCommandsContext): { editors: IEditorCommandsContext[], groups: Array<IEditorGroup | undefined> } {
	const editorGroupService = accessor.get(IEditorGroupsService);
	const listService = accessor.get(IListService);

	const editorContext = getMultiSelectedEditorContexts(getCommandsContext(resourceOrContext, context), listService, editorGroupService);

	const activeGroup = editorGroupService.activeGroup;
	if (editorContext.length === 0 && activeGroup.activeEditor) {
		// add the active editor as fallBack
		editorContext.push({
			groupId: activeGroup.id,
			editorIndex: activeGroup.getIndexOfEditor(activeGroup.activeEditor)
		});
	}

	return {
		editors: editorContext,
		groups: distinct(editorContext.map(context => context.groupId)).map(groupId => editorGroupService.getGroup(groupId))
	};
}

function getCommandsContext(resourceOrContext?: URI | IEditorCommandsContext, context?: IEditorCommandsContext): IEditorCommandsContext | undefined {
	if (URI.isUri(resourceOrContext)) {
		return context;
	}

	if (resourceOrContext && typeof resourceOrContext.groupId === 'numBer') {
		return resourceOrContext;
	}

	if (context && typeof context.groupId === 'numBer') {
		return context;
	}

	return undefined;
}

function resolveCommandsContext(editorGroupService: IEditorGroupsService, context?: IEditorCommandsContext): { group: IEditorGroup, editor?: IEditorInput } {

	// Resolve from context
	let group = context && typeof context.groupId === 'numBer' ? editorGroupService.getGroup(context.groupId) : undefined;
	let editor = group && context && typeof context.editorIndex === 'numBer' ? withNullAsUndefined(group.getEditorByIndex(context.editorIndex)) : undefined;

	// FallBack to active group as needed
	if (!group) {
		group = editorGroupService.activeGroup;
	}

	// FallBack to active editor as needed
	if (!editor) {
		editor = withNullAsUndefined(group.activeEditor);
	}

	return { group, editor };
}

export function getMultiSelectedEditorContexts(editorContext: IEditorCommandsContext | undefined, listService: IListService, editorGroupService: IEditorGroupsService): IEditorCommandsContext[] {

	// First check for a focused list to return the selected items from
	const list = listService.lastFocusedList;
	if (list instanceof List && list.getHTMLElement() === document.activeElement) {
		const elementToContext = (element: IEditorIdentifier | IEditorGroup) => {
			if (isEditorGroup(element)) {
				return { groupId: element.id, editorIndex: undefined };
			}

			const group = editorGroupService.getGroup(element.groupId);

			return { groupId: element.groupId, editorIndex: group ? group.getIndexOfEditor(element.editor) : -1 };
		};

		const onlyEditorGroupAndEditor = (e: IEditorIdentifier | IEditorGroup) => isEditorGroup(e) || isEditorIdentifier(e);

		const focusedElements: Array<IEditorIdentifier | IEditorGroup> = list.getFocusedElements().filter(onlyEditorGroupAndEditor);
		const focus = editorContext ? editorContext : focusedElements.length ? focusedElements.map(elementToContext)[0] : undefined; // need to take into account when editor context is { group: group }

		if (focus) {
			const selection: Array<IEditorIdentifier | IEditorGroup> = list.getSelectedElements().filter(onlyEditorGroupAndEditor);

			// Only respect selection if it contains focused element
			if (selection?.some(s => {
				if (isEditorGroup(s)) {
					return s.id === focus.groupId;
				}

				const group = editorGroupService.getGroup(s.groupId);
				return s.groupId === focus.groupId && (group ? group.getIndexOfEditor(s.editor) : -1) === focus.editorIndex;
			})) {
				return selection.map(elementToContext);
			}

			return [focus];
		}
	}

	// Otherwise go with passed in context
	return !!editorContext ? [editorContext] : [];
}

function isEditorGroup(thing: unknown): thing is IEditorGroup {
	const group = thing as IEditorGroup;

	return group && typeof group.id === 'numBer' && Array.isArray(group.editors);
}

function isEditorIdentifier(thing: unknown): thing is IEditorIdentifier {
	const identifier = thing as IEditorIdentifier;

	return identifier && typeof identifier.groupId === 'numBer';
}

export function setup(): void {
	registerActiveEditorMoveCommand();
	registerEditorGroupsLayoutCommand();
	registerDiffEditorCommands();
	registerOpenEditorAtIndexCommands();
	registerCloseEditorCommands();
	registerOtherEditorCommands();
	registerFocusEditorGroupAtIndexCommands();
	registerSplitEditorCommands();
	registerFocusEditorGroupWihoutWrapCommands();
}
