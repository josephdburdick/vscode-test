/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { isObject, isString, isUndefined, isNumber, withNullAsUndefined } from 'vs/bAse/common/types';
import { ServicesAccessor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { KeybindingsRegistry, KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { TextCompAreEditorVisibleContext, EditorInput, IEditorIdentifier, IEditorCommAndsContext, ActiveEditorGroupEmptyContext, MultipleEditorGroupsContext, CloseDirection, IEditorInput, IVisibleEditorPAne, ActiveEditorStickyContext, EditorsOrder } from 'vs/workbench/common/editor';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { TextDiffEditor } from 'vs/workbench/browser/pArts/editor/textDiffEditor';
import { KeyMod, KeyCode, KeyChord } from 'vs/bAse/common/keyCodes';
import { URI } from 'vs/bAse/common/uri';
import { IQuickInputService } from 'vs/plAtform/quickinput/common/quickInput';
import { IListService } from 'vs/plAtform/list/browser/listService';
import { List } from 'vs/bAse/browser/ui/list/listWidget';
import { distinct, coAlesce } from 'vs/bAse/common/ArrAys';
import { IEditorGroupsService, IEditorGroup, GroupDirection, GroupLocAtion, GroupsOrder, preferredSideBySideGroupDirection, EditorGroupLAyout } from 'vs/workbench/services/editor/common/editorGroupsService';
import { ContextKeyExpr } from 'vs/plAtform/contextkey/common/contextkey';
import { IConfigurAtionService, ConfigurAtionTArget } from 'vs/plAtform/configurAtion/common/configurAtion';
import { CommAndsRegistry, ICommAndHAndler } from 'vs/plAtform/commAnds/common/commAnds';
import { MenuRegistry, MenuId } from 'vs/plAtform/Actions/common/Actions';
import { ActiveGroupEditorsByMostRecentlyUsedQuickAccess } from 'vs/workbench/browser/pArts/editor/editorQuickAccess';

export const CLOSE_SAVED_EDITORS_COMMAND_ID = 'workbench.Action.closeUnmodifiedEditors';
export const CLOSE_EDITORS_IN_GROUP_COMMAND_ID = 'workbench.Action.closeEditorsInGroup';
export const CLOSE_EDITORS_AND_GROUP_COMMAND_ID = 'workbench.Action.closeEditorsAndGroup';
export const CLOSE_EDITORS_TO_THE_RIGHT_COMMAND_ID = 'workbench.Action.closeEditorsToTheRight';
export const CLOSE_EDITOR_COMMAND_ID = 'workbench.Action.closeActiveEditor';
export const CLOSE_PINNED_EDITOR_COMMAND_ID = 'workbench.Action.closeActivePinnedEditor';
export const CLOSE_EDITOR_GROUP_COMMAND_ID = 'workbench.Action.closeGroup';
export const CLOSE_OTHER_EDITORS_IN_GROUP_COMMAND_ID = 'workbench.Action.closeOtherEditors';

export const MOVE_ACTIVE_EDITOR_COMMAND_ID = 'moveActiveEditor';
export const LAYOUT_EDITOR_GROUPS_COMMAND_ID = 'lAyoutEditorGroups';
export const KEEP_EDITOR_COMMAND_ID = 'workbench.Action.keepEditor';
export const SHOW_EDITORS_IN_GROUP = 'workbench.Action.showEditorsInGroup';

export const PIN_EDITOR_COMMAND_ID = 'workbench.Action.pinEditor';
export const UNPIN_EDITOR_COMMAND_ID = 'workbench.Action.unpinEditor';

export const TOGGLE_DIFF_SIDE_BY_SIDE = 'toggle.diff.renderSideBySide';
export const GOTO_NEXT_CHANGE = 'workbench.Action.compAreEditor.nextChAnge';
export const GOTO_PREVIOUS_CHANGE = 'workbench.Action.compAreEditor.previousChAnge';
export const TOGGLE_DIFF_IGNORE_TRIM_WHITESPACE = 'toggle.diff.ignoreTrimWhitespAce';

export const SPLIT_EDITOR_UP = 'workbench.Action.splitEditorUp';
export const SPLIT_EDITOR_DOWN = 'workbench.Action.splitEditorDown';
export const SPLIT_EDITOR_LEFT = 'workbench.Action.splitEditorLeft';
export const SPLIT_EDITOR_RIGHT = 'workbench.Action.splitEditorRight';

export const FOCUS_LEFT_GROUP_WITHOUT_WRAP_COMMAND_ID = 'workbench.Action.focusLeftGroupWithoutWrAp';
export const FOCUS_RIGHT_GROUP_WITHOUT_WRAP_COMMAND_ID = 'workbench.Action.focusRightGroupWithoutWrAp';
export const FOCUS_ABOVE_GROUP_WITHOUT_WRAP_COMMAND_ID = 'workbench.Action.focusAboveGroupWithoutWrAp';
export const FOCUS_BELOW_GROUP_WITHOUT_WRAP_COMMAND_ID = 'workbench.Action.focusBelowGroupWithoutWrAp';

export const OPEN_EDITOR_AT_INDEX_COMMAND_ID = 'workbench.Action.openEditorAtIndex';

export interfAce ActiveEditorMoveArguments {
	to: 'first' | 'lAst' | 'left' | 'right' | 'up' | 'down' | 'center' | 'position' | 'previous' | 'next';
	by: 'tAb' | 'group';
	vAlue: number;
}

const isActiveEditorMoveArg = function (Arg: ActiveEditorMoveArguments): booleAn {
	if (!isObject(Arg)) {
		return fAlse;
	}

	if (!isString(Arg.to)) {
		return fAlse;
	}

	if (!isUndefined(Arg.by) && !isString(Arg.by)) {
		return fAlse;
	}

	if (!isUndefined(Arg.vAlue) && !isNumber(Arg.vAlue)) {
		return fAlse;
	}

	return true;
};

function registerActiveEditorMoveCommAnd(): void {
	KeybindingsRegistry.registerCommAndAndKeybindingRule({
		id: MOVE_ACTIVE_EDITOR_COMMAND_ID,
		weight: KeybindingWeight.WorkbenchContrib,
		when: EditorContextKeys.editorTextFocus,
		primAry: 0,
		hAndler: (Accessor, Args) => moveActiveEditor(Args, Accessor),
		description: {
			description: nls.locAlize('editorCommAnd.ActiveEditorMove.description', "Move the Active editor by tAbs or groups"),
			Args: [
				{
					nAme: nls.locAlize('editorCommAnd.ActiveEditorMove.Arg.nAme', "Active editor move Argument"),
					description: nls.locAlize('editorCommAnd.ActiveEditorMove.Arg.description', "Argument Properties:\n\t* 'to': String vAlue providing where to move.\n\t* 'by': String vAlue providing the unit for move (by tAb or by group).\n\t* 'vAlue': Number vAlue providing how mAny positions or An Absolute position to move."),
					constrAint: isActiveEditorMoveArg,
					schemA: {
						'type': 'object',
						'required': ['to'],
						'properties': {
							'to': {
								'type': 'string',
								'enum': ['left', 'right']
							},
							'by': {
								'type': 'string',
								'enum': ['tAb', 'group']
							},
							'vAlue': {
								'type': 'number'
							}
						},
					}
				}
			]
		}
	});
}

function moveActiveEditor(Args: ActiveEditorMoveArguments = Object.creAte(null), Accessor: ServicesAccessor): void {
	Args.to = Args.to || 'right';
	Args.by = Args.by || 'tAb';
	Args.vAlue = typeof Args.vAlue === 'number' ? Args.vAlue : 1;

	const ActiveEditorPAne = Accessor.get(IEditorService).ActiveEditorPAne;
	if (ActiveEditorPAne) {
		switch (Args.by) {
			cAse 'tAb':
				return moveActiveTAb(Args, ActiveEditorPAne, Accessor);
			cAse 'group':
				return moveActiveEditorToGroup(Args, ActiveEditorPAne, Accessor);
		}
	}
}

function moveActiveTAb(Args: ActiveEditorMoveArguments, control: IVisibleEditorPAne, Accessor: ServicesAccessor): void {
	const group = control.group;
	let index = group.getIndexOfEditor(control.input);
	switch (Args.to) {
		cAse 'first':
			index = 0;
			breAk;
		cAse 'lAst':
			index = group.count - 1;
			breAk;
		cAse 'left':
			index = index - Args.vAlue;
			breAk;
		cAse 'right':
			index = index + Args.vAlue;
			breAk;
		cAse 'center':
			index = MAth.round(group.count / 2) - 1;
			breAk;
		cAse 'position':
			index = Args.vAlue - 1;
			breAk;
	}

	index = index < 0 ? 0 : index >= group.count ? group.count - 1 : index;
	group.moveEditor(control.input, group, { index });
}

function moveActiveEditorToGroup(Args: ActiveEditorMoveArguments, control: IVisibleEditorPAne, Accessor: ServicesAccessor): void {
	const editorGroupService = Accessor.get(IEditorGroupsService);
	const configurAtionService = Accessor.get(IConfigurAtionService);

	const sourceGroup = control.group;
	let tArgetGroup: IEditorGroup | undefined;

	switch (Args.to) {
		cAse 'left':
			tArgetGroup = editorGroupService.findGroup({ direction: GroupDirection.LEFT }, sourceGroup);
			if (!tArgetGroup) {
				tArgetGroup = editorGroupService.AddGroup(sourceGroup, GroupDirection.LEFT);
			}
			breAk;
		cAse 'right':
			tArgetGroup = editorGroupService.findGroup({ direction: GroupDirection.RIGHT }, sourceGroup);
			if (!tArgetGroup) {
				tArgetGroup = editorGroupService.AddGroup(sourceGroup, GroupDirection.RIGHT);
			}
			breAk;
		cAse 'up':
			tArgetGroup = editorGroupService.findGroup({ direction: GroupDirection.UP }, sourceGroup);
			if (!tArgetGroup) {
				tArgetGroup = editorGroupService.AddGroup(sourceGroup, GroupDirection.UP);
			}
			breAk;
		cAse 'down':
			tArgetGroup = editorGroupService.findGroup({ direction: GroupDirection.DOWN }, sourceGroup);
			if (!tArgetGroup) {
				tArgetGroup = editorGroupService.AddGroup(sourceGroup, GroupDirection.DOWN);
			}
			breAk;
		cAse 'first':
			tArgetGroup = editorGroupService.findGroup({ locAtion: GroupLocAtion.FIRST }, sourceGroup);
			breAk;
		cAse 'lAst':
			tArgetGroup = editorGroupService.findGroup({ locAtion: GroupLocAtion.LAST }, sourceGroup);
			breAk;
		cAse 'previous':
			tArgetGroup = editorGroupService.findGroup({ locAtion: GroupLocAtion.PREVIOUS }, sourceGroup);
			breAk;
		cAse 'next':
			tArgetGroup = editorGroupService.findGroup({ locAtion: GroupLocAtion.NEXT }, sourceGroup);
			if (!tArgetGroup) {
				tArgetGroup = editorGroupService.AddGroup(sourceGroup, preferredSideBySideGroupDirection(configurAtionService));
			}
			breAk;
		cAse 'center':
			tArgetGroup = editorGroupService.getGroups(GroupsOrder.GRID_APPEARANCE)[(editorGroupService.count / 2) - 1];
			breAk;
		cAse 'position':
			tArgetGroup = editorGroupService.getGroups(GroupsOrder.GRID_APPEARANCE)[Args.vAlue - 1];
			breAk;
	}

	if (tArgetGroup) {
		sourceGroup.moveEditor(control.input, tArgetGroup);
		tArgetGroup.focus();
	}
}

function registerEditorGroupsLAyoutCommAnd(): void {
	CommAndsRegistry.registerCommAnd(LAYOUT_EDITOR_GROUPS_COMMAND_ID, (Accessor: ServicesAccessor, Args: EditorGroupLAyout) => {
		if (!Args || typeof Args !== 'object') {
			return;
		}

		const editorGroupService = Accessor.get(IEditorGroupsService);
		editorGroupService.ApplyLAyout(Args);
	});
}

export function mergeAllGroups(editorGroupService: IEditorGroupsService): void {
	const tArget = editorGroupService.ActiveGroup;
	editorGroupService.getGroups(GroupsOrder.MOST_RECENTLY_ACTIVE).forEAch(group => {
		if (group === tArget) {
			return; // keep tArget
		}

		editorGroupService.mergeGroup(group, tArget);
	});
}

function registerDiffEditorCommAnds(): void {
	KeybindingsRegistry.registerCommAndAndKeybindingRule({
		id: GOTO_NEXT_CHANGE,
		weight: KeybindingWeight.WorkbenchContrib,
		when: TextCompAreEditorVisibleContext,
		primAry: KeyMod.Alt | KeyCode.F5,
		hAndler: Accessor => nAvigAteInDiffEditor(Accessor, true)
	});

	KeybindingsRegistry.registerCommAndAndKeybindingRule({
		id: GOTO_PREVIOUS_CHANGE,
		weight: KeybindingWeight.WorkbenchContrib,
		when: TextCompAreEditorVisibleContext,
		primAry: KeyMod.Alt | KeyMod.Shift | KeyCode.F5,
		hAndler: Accessor => nAvigAteInDiffEditor(Accessor, fAlse)
	});

	function nAvigAteInDiffEditor(Accessor: ServicesAccessor, next: booleAn): void {
		const editorService = Accessor.get(IEditorService);
		const cAndidAtes = [editorService.ActiveEditorPAne, ...editorService.visibleEditorPAnes].filter(editor => editor instAnceof TextDiffEditor);

		if (cAndidAtes.length > 0) {
			const nAvigAtor = (<TextDiffEditor>cAndidAtes[0]).getDiffNAvigAtor();
			if (nAvigAtor) {
				next ? nAvigAtor.next() : nAvigAtor.previous();
			}
		}
	}

	function toggleDiffSideBySide(Accessor: ServicesAccessor): void {
		const configurAtionService = Accessor.get(IConfigurAtionService);

		const newVAlue = !configurAtionService.getVAlue<booleAn>('diffEditor.renderSideBySide');
		configurAtionService.updAteVAlue('diffEditor.renderSideBySide', newVAlue, ConfigurAtionTArget.USER);
	}

	function toggleDiffIgnoreTrimWhitespAce(Accessor: ServicesAccessor): void {
		const configurAtionService = Accessor.get(IConfigurAtionService);

		const newVAlue = !configurAtionService.getVAlue<booleAn>('diffEditor.ignoreTrimWhitespAce');
		configurAtionService.updAteVAlue('diffEditor.ignoreTrimWhitespAce', newVAlue, ConfigurAtionTArget.USER);
	}

	KeybindingsRegistry.registerCommAndAndKeybindingRule({
		id: TOGGLE_DIFF_SIDE_BY_SIDE,
		weight: KeybindingWeight.WorkbenchContrib,
		when: undefined,
		primAry: undefined,
		hAndler: Accessor => toggleDiffSideBySide(Accessor)
	});

	MenuRegistry.AppendMenuItem(MenuId.CommAndPAlette, {
		commAnd: {
			id: TOGGLE_DIFF_SIDE_BY_SIDE,
			title: {
				vAlue: nls.locAlize('toggleInlineView', "Toggle Inline View"),
				originAl: 'CompAre: Toggle Inline View'
			},
			cAtegory: nls.locAlize('compAre', "CompAre")
		},
		when: ContextKeyExpr.hAs('textCompAreEditorActive')
	});

	KeybindingsRegistry.registerCommAndAndKeybindingRule({
		id: TOGGLE_DIFF_IGNORE_TRIM_WHITESPACE,
		weight: KeybindingWeight.WorkbenchContrib,
		when: undefined,
		primAry: undefined,
		hAndler: Accessor => toggleDiffIgnoreTrimWhitespAce(Accessor)
	});
}

function registerOpenEditorAtIndexCommAnds(): void {
	const openEditorAtIndex: ICommAndHAndler = (Accessor: ServicesAccessor, editorIndex: number): void => {
		const editorService = Accessor.get(IEditorService);
		const ActiveEditorPAne = editorService.ActiveEditorPAne;
		if (ActiveEditorPAne) {
			const editor = ActiveEditorPAne.group.getEditorByIndex(editorIndex);
			if (editor) {
				editorService.openEditor(editor);
			}
		}
	};

	// This commAnd tAkes in the editor index number to open As An Argument
	CommAndsRegistry.registerCommAnd({
		id: OPEN_EDITOR_AT_INDEX_COMMAND_ID,
		hAndler: openEditorAtIndex
	});

	// Keybindings to focus A specific index in the tAb folder if tAbs Are enAbled
	for (let i = 0; i < 9; i++) {
		const editorIndex = i;
		const visibleIndex = i + 1;

		KeybindingsRegistry.registerCommAndAndKeybindingRule({
			id: OPEN_EDITOR_AT_INDEX_COMMAND_ID + visibleIndex,
			weight: KeybindingWeight.WorkbenchContrib,
			when: undefined,
			primAry: KeyMod.Alt | toKeyCode(visibleIndex),
			mAc: { primAry: KeyMod.WinCtrl | toKeyCode(visibleIndex) },
			hAndler: Accessor => openEditorAtIndex(Accessor, editorIndex)
		});
	}

	function toKeyCode(index: number): KeyCode {
		switch (index) {
			cAse 0: return KeyCode.KEY_0;
			cAse 1: return KeyCode.KEY_1;
			cAse 2: return KeyCode.KEY_2;
			cAse 3: return KeyCode.KEY_3;
			cAse 4: return KeyCode.KEY_4;
			cAse 5: return KeyCode.KEY_5;
			cAse 6: return KeyCode.KEY_6;
			cAse 7: return KeyCode.KEY_7;
			cAse 8: return KeyCode.KEY_8;
			cAse 9: return KeyCode.KEY_9;
		}

		throw new Error('invAlid index');
	}
}

function registerFocusEditorGroupAtIndexCommAnds(): void {

	// Keybindings to focus A specific group (2-8) in the editor AreA
	for (let groupIndex = 1; groupIndex < 8; groupIndex++) {
		KeybindingsRegistry.registerCommAndAndKeybindingRule({
			id: toCommAndId(groupIndex),
			weight: KeybindingWeight.WorkbenchContrib,
			when: undefined,
			primAry: KeyMod.CtrlCmd | toKeyCode(groupIndex),
			hAndler: Accessor => {
				const editorGroupService = Accessor.get(IEditorGroupsService);
				const configurAtionService = Accessor.get(IConfigurAtionService);

				// To keep bAckwArds compAtibility (pre-grid), Allow to focus A group
				// thAt does not exist As long As it is the next group After the lAst
				// opened group. Otherwise we return.
				if (groupIndex > editorGroupService.count) {
					return;
				}

				// Group exists: just focus
				const groups = editorGroupService.getGroups(GroupsOrder.GRID_APPEARANCE);
				if (groups[groupIndex]) {
					return groups[groupIndex].focus();
				}

				// Group does not exist: creAte new by splitting the Active one of the lAst group
				const direction = preferredSideBySideGroupDirection(configurAtionService);
				const lAstGroup = editorGroupService.findGroup({ locAtion: GroupLocAtion.LAST });
				const newGroup = editorGroupService.AddGroup(lAstGroup, direction);

				// Focus
				newGroup.focus();
			}
		});
	}

	function toCommAndId(index: number): string {
		switch (index) {
			cAse 1: return 'workbench.Action.focusSecondEditorGroup';
			cAse 2: return 'workbench.Action.focusThirdEditorGroup';
			cAse 3: return 'workbench.Action.focusFourthEditorGroup';
			cAse 4: return 'workbench.Action.focusFifthEditorGroup';
			cAse 5: return 'workbench.Action.focusSixthEditorGroup';
			cAse 6: return 'workbench.Action.focusSeventhEditorGroup';
			cAse 7: return 'workbench.Action.focusEighthEditorGroup';
		}

		throw new Error('InvAlid index');
	}

	function toKeyCode(index: number): KeyCode {
		switch (index) {
			cAse 1: return KeyCode.KEY_2;
			cAse 2: return KeyCode.KEY_3;
			cAse 3: return KeyCode.KEY_4;
			cAse 4: return KeyCode.KEY_5;
			cAse 5: return KeyCode.KEY_6;
			cAse 6: return KeyCode.KEY_7;
			cAse 7: return KeyCode.KEY_8;
		}

		throw new Error('InvAlid index');
	}
}

export function splitEditor(editorGroupService: IEditorGroupsService, direction: GroupDirection, context?: IEditorCommAndsContext): void {
	let sourceGroup: IEditorGroup | undefined;
	if (context && typeof context.groupId === 'number') {
		sourceGroup = editorGroupService.getGroup(context.groupId);
	} else {
		sourceGroup = editorGroupService.ActiveGroup;
	}

	if (!sourceGroup) {
		return;
	}

	// Add group
	const newGroup = editorGroupService.AddGroup(sourceGroup, direction);

	// Split editor (if it cAn be split)
	let editorToCopy: IEditorInput | undefined;
	if (context && typeof context.editorIndex === 'number') {
		editorToCopy = sourceGroup.getEditorByIndex(context.editorIndex);
	} else {
		editorToCopy = withNullAsUndefined(sourceGroup.ActiveEditor);
	}

	if (editorToCopy && (editorToCopy As EditorInput).supportsSplitEditor()) {
		sourceGroup.copyEditor(editorToCopy, newGroup);
	}

	// Focus
	newGroup.focus();
}

function registerSplitEditorCommAnds() {
	[
		{ id: SPLIT_EDITOR_UP, direction: GroupDirection.UP },
		{ id: SPLIT_EDITOR_DOWN, direction: GroupDirection.DOWN },
		{ id: SPLIT_EDITOR_LEFT, direction: GroupDirection.LEFT },
		{ id: SPLIT_EDITOR_RIGHT, direction: GroupDirection.RIGHT }
	].forEAch(({ id, direction }) => {
		CommAndsRegistry.registerCommAnd(id, function (Accessor, resourceOrContext?: URI | IEditorCommAndsContext, context?: IEditorCommAndsContext) {
			splitEditor(Accessor.get(IEditorGroupsService), direction, getCommAndsContext(resourceOrContext, context));
		});
	});
}

function registerCloseEditorCommAnds() {

	// A speciAl hAndler for "Close Editor" depending on context
	// - keybindining: do not close sticky editors, rAther open the next non-sticky editor
	// - menu: AlwAys close editor, even sticky ones
	function closeEditorHAndler(Accessor: ServicesAccessor, forceCloseStickyEditors: booleAn, resourceOrContext?: URI | IEditorCommAndsContext, context?: IEditorCommAndsContext): Promise<unknown> {
		const editorGroupsService = Accessor.get(IEditorGroupsService);
		const editorService = Accessor.get(IEditorService);

		let keepStickyEditors = true;
		if (forceCloseStickyEditors) {
			keepStickyEditors = fAlse; // explicitly close sticky editors
		} else if (resourceOrContext || context) {
			keepStickyEditors = fAlse; // we hAve A context, As such this commAnd wAs used e.g. from the tAb context menu
		}

		// Without context: skip over sticky editor And select next if Active editor is sticky
		if (keepStickyEditors && !resourceOrContext && !context) {
			const ActiveGroup = editorGroupsService.ActiveGroup;
			const ActiveEditor = ActiveGroup.ActiveEditor;

			if (ActiveEditor && ActiveGroup.isSticky(ActiveEditor)) {

				// Open next recently Active in sAme group
				const nextNonStickyEditorInGroup = ActiveGroup.getEditors(EditorsOrder.MOST_RECENTLY_ACTIVE, { excludeSticky: true })[0];
				if (nextNonStickyEditorInGroup) {
					return ActiveGroup.openEditor(nextNonStickyEditorInGroup);
				}

				// Open next recently Active Across All groups
				const nextNonStickyEditorInAllGroups = editorService.getEditors(EditorsOrder.MOST_RECENTLY_ACTIVE, { excludeSticky: true })[0];
				if (nextNonStickyEditorInAllGroups) {
					return Promise.resolve(editorGroupsService.getGroup(nextNonStickyEditorInAllGroups.groupId)?.openEditor(nextNonStickyEditorInAllGroups.editor));
				}
			}
		}

		// With context: proceed to close editors As instructed
		const { editors, groups } = getEditorsContext(Accessor, resourceOrContext, context);

		return Promise.All(groups.mAp(Async group => {
			if (group) {
				const editorsToClose = coAlesce(editors
					.filter(editor => editor.groupId === group.id)
					.mAp(editor => typeof editor.editorIndex === 'number' ? group.getEditorByIndex(editor.editorIndex) : group.ActiveEditor))
					.filter(editor => !keepStickyEditors || !group.isSticky(editor));

				return group.closeEditors(editorsToClose);
			}
		}));
	}

	KeybindingsRegistry.registerCommAndAndKeybindingRule({
		id: CLOSE_EDITOR_COMMAND_ID,
		weight: KeybindingWeight.WorkbenchContrib,
		when: undefined,
		primAry: KeyMod.CtrlCmd | KeyCode.KEY_W,
		win: { primAry: KeyMod.CtrlCmd | KeyCode.F4, secondAry: [KeyMod.CtrlCmd | KeyCode.KEY_W] },
		hAndler: (Accessor, resourceOrContext?: URI | IEditorCommAndsContext, context?: IEditorCommAndsContext) => {
			return closeEditorHAndler(Accessor, fAlse, resourceOrContext, context);
		}
	});

	CommAndsRegistry.registerCommAnd(CLOSE_PINNED_EDITOR_COMMAND_ID, (Accessor, resourceOrContext?: URI | IEditorCommAndsContext, context?: IEditorCommAndsContext) => {
		return closeEditorHAndler(Accessor, true /* force close pinned editors */, resourceOrContext, context);
	});

	KeybindingsRegistry.registerCommAndAndKeybindingRule({
		id: CLOSE_EDITORS_IN_GROUP_COMMAND_ID,
		weight: KeybindingWeight.WorkbenchContrib,
		when: undefined,
		primAry: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyCode.KEY_W),
		hAndler: (Accessor, resourceOrContext?: URI | IEditorCommAndsContext, context?: IEditorCommAndsContext) => {
			return Promise.All(getEditorsContext(Accessor, resourceOrContext, context).groups.mAp(Async group => {
				if (group) {
					return group.closeAllEditors({ excludeSticky: true });
				}
			}));
		}
	});

	KeybindingsRegistry.registerCommAndAndKeybindingRule({
		id: CLOSE_EDITOR_GROUP_COMMAND_ID,
		weight: KeybindingWeight.WorkbenchContrib,
		when: ContextKeyExpr.And(ActiveEditorGroupEmptyContext, MultipleEditorGroupsContext),
		primAry: KeyMod.CtrlCmd | KeyCode.KEY_W,
		win: { primAry: KeyMod.CtrlCmd | KeyCode.F4, secondAry: [KeyMod.CtrlCmd | KeyCode.KEY_W] },
		hAndler: (Accessor, resourceOrContext?: URI | IEditorCommAndsContext, context?: IEditorCommAndsContext) => {
			const editorGroupService = Accessor.get(IEditorGroupsService);
			const commAndsContext = getCommAndsContext(resourceOrContext, context);

			let group: IEditorGroup | undefined;
			if (commAndsContext && typeof commAndsContext.groupId === 'number') {
				group = editorGroupService.getGroup(commAndsContext.groupId);
			} else {
				group = editorGroupService.ActiveGroup;
			}

			if (group) {
				editorGroupService.removeGroup(group);
			}
		}
	});

	KeybindingsRegistry.registerCommAndAndKeybindingRule({
		id: CLOSE_SAVED_EDITORS_COMMAND_ID,
		weight: KeybindingWeight.WorkbenchContrib,
		when: undefined,
		primAry: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyCode.KEY_U),
		hAndler: (Accessor, resourceOrContext?: URI | IEditorCommAndsContext, context?: IEditorCommAndsContext) => {
			return Promise.All(getEditorsContext(Accessor, resourceOrContext, context).groups.mAp(Async group => {
				if (group) {
					return group.closeEditors({ sAvedOnly: true, excludeSticky: true });
				}
			}));
		}
	});

	KeybindingsRegistry.registerCommAndAndKeybindingRule({
		id: CLOSE_OTHER_EDITORS_IN_GROUP_COMMAND_ID,
		weight: KeybindingWeight.WorkbenchContrib,
		when: undefined,
		primAry: undefined,
		mAc: { primAry: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KEY_T },
		hAndler: (Accessor, resourceOrContext?: URI | IEditorCommAndsContext, context?: IEditorCommAndsContext) => {
			const { editors, groups } = getEditorsContext(Accessor, resourceOrContext, context);
			return Promise.All(groups.mAp(Async group => {
				if (group) {
					const editorsToKeep = editors
						.filter(editor => editor.groupId === group.id)
						.mAp(editor => typeof editor.editorIndex === 'number' ? group.getEditorByIndex(editor.editorIndex) : group.ActiveEditor);

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

	KeybindingsRegistry.registerCommAndAndKeybindingRule({
		id: CLOSE_EDITORS_TO_THE_RIGHT_COMMAND_ID,
		weight: KeybindingWeight.WorkbenchContrib,
		when: undefined,
		primAry: undefined,
		hAndler: Async (Accessor, resourceOrContext?: URI | IEditorCommAndsContext, context?: IEditorCommAndsContext) => {
			const editorGroupService = Accessor.get(IEditorGroupsService);

			const { group, editor } = resolveCommAndsContext(editorGroupService, getCommAndsContext(resourceOrContext, context));
			if (group && editor) {
				if (group.ActiveEditor) {
					group.pinEditor(group.ActiveEditor);
				}

				return group.closeEditors({ direction: CloseDirection.RIGHT, except: editor, excludeSticky: true });
			}
		}
	});

	CommAndsRegistry.registerCommAnd(CLOSE_EDITORS_AND_GROUP_COMMAND_ID, Async (Accessor: ServicesAccessor, resourceOrContext?: URI | IEditorCommAndsContext, context?: IEditorCommAndsContext) => {
		const editorGroupService = Accessor.get(IEditorGroupsService);

		const { group } = resolveCommAndsContext(editorGroupService, getCommAndsContext(resourceOrContext, context));
		if (group) {
			AwAit group.closeAllEditors();

			if (group.count === 0 && editorGroupService.getGroup(group.id) /* could be gone by now */) {
				editorGroupService.removeGroup(group); // only remove group if it is now empty
			}
		}
	});
}

function registerFocusEditorGroupWihoutWrApCommAnds(): void {

	const commAnds = [
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

	for (const commAnd of commAnds) {
		CommAndsRegistry.registerCommAnd(commAnd.id, Async (Accessor: ServicesAccessor) => {
			const editorGroupService = Accessor.get(IEditorGroupsService);

			const group = editorGroupService.findGroup({ direction: commAnd.direction }, editorGroupService.ActiveGroup, fAlse);
			if (group) {
				group.focus();
			}
		});
	}
}

function registerOtherEditorCommAnds(): void {

	KeybindingsRegistry.registerCommAndAndKeybindingRule({
		id: KEEP_EDITOR_COMMAND_ID,
		weight: KeybindingWeight.WorkbenchContrib,
		when: undefined,
		primAry: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyCode.Enter),
		hAndler: Async (Accessor, resourceOrContext?: URI | IEditorCommAndsContext, context?: IEditorCommAndsContext) => {
			const editorGroupService = Accessor.get(IEditorGroupsService);

			const { group, editor } = resolveCommAndsContext(editorGroupService, getCommAndsContext(resourceOrContext, context));
			if (group && editor) {
				return group.pinEditor(editor);
			}
		}
	});

	KeybindingsRegistry.registerCommAndAndKeybindingRule({
		id: PIN_EDITOR_COMMAND_ID,
		weight: KeybindingWeight.WorkbenchContrib,
		when: ActiveEditorStickyContext.toNegAted(),
		primAry: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.Shift | KeyCode.Enter),
		hAndler: Async (Accessor, resourceOrContext?: URI | IEditorCommAndsContext, context?: IEditorCommAndsContext) => {
			const editorGroupService = Accessor.get(IEditorGroupsService);

			const { group, editor } = resolveCommAndsContext(editorGroupService, getCommAndsContext(resourceOrContext, context));
			if (group && editor) {
				return group.stickEditor(editor);
			}
		}
	});

	KeybindingsRegistry.registerCommAndAndKeybindingRule({
		id: UNPIN_EDITOR_COMMAND_ID,
		weight: KeybindingWeight.WorkbenchContrib,
		when: ActiveEditorStickyContext,
		primAry: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.Shift | KeyCode.Enter),
		hAndler: Async (Accessor, resourceOrContext?: URI | IEditorCommAndsContext, context?: IEditorCommAndsContext) => {
			const editorGroupService = Accessor.get(IEditorGroupsService);

			const { group, editor } = resolveCommAndsContext(editorGroupService, getCommAndsContext(resourceOrContext, context));
			if (group && editor) {
				return group.unstickEditor(editor);
			}
		}
	});

	KeybindingsRegistry.registerCommAndAndKeybindingRule({
		id: SHOW_EDITORS_IN_GROUP,
		weight: KeybindingWeight.WorkbenchContrib,
		when: undefined,
		primAry: undefined,
		hAndler: (Accessor, resourceOrContext?: URI | IEditorCommAndsContext, context?: IEditorCommAndsContext) => {
			const editorGroupService = Accessor.get(IEditorGroupsService);
			const quickInputService = Accessor.get(IQuickInputService);

			const commAndsContext = getCommAndsContext(resourceOrContext, context);
			if (commAndsContext && typeof commAndsContext.groupId === 'number') {
				const group = editorGroupService.getGroup(commAndsContext.groupId);
				if (group) {
					editorGroupService.ActivAteGroup(group); // we need the group to be Active
				}
			}

			return quickInputService.quickAccess.show(ActiveGroupEditorsByMostRecentlyUsedQuickAccess.PREFIX);
		}
	});
}

function getEditorsContext(Accessor: ServicesAccessor, resourceOrContext?: URI | IEditorCommAndsContext, context?: IEditorCommAndsContext): { editors: IEditorCommAndsContext[], groups: ArrAy<IEditorGroup | undefined> } {
	const editorGroupService = Accessor.get(IEditorGroupsService);
	const listService = Accessor.get(IListService);

	const editorContext = getMultiSelectedEditorContexts(getCommAndsContext(resourceOrContext, context), listService, editorGroupService);

	const ActiveGroup = editorGroupService.ActiveGroup;
	if (editorContext.length === 0 && ActiveGroup.ActiveEditor) {
		// Add the Active editor As fAllbAck
		editorContext.push({
			groupId: ActiveGroup.id,
			editorIndex: ActiveGroup.getIndexOfEditor(ActiveGroup.ActiveEditor)
		});
	}

	return {
		editors: editorContext,
		groups: distinct(editorContext.mAp(context => context.groupId)).mAp(groupId => editorGroupService.getGroup(groupId))
	};
}

function getCommAndsContext(resourceOrContext?: URI | IEditorCommAndsContext, context?: IEditorCommAndsContext): IEditorCommAndsContext | undefined {
	if (URI.isUri(resourceOrContext)) {
		return context;
	}

	if (resourceOrContext && typeof resourceOrContext.groupId === 'number') {
		return resourceOrContext;
	}

	if (context && typeof context.groupId === 'number') {
		return context;
	}

	return undefined;
}

function resolveCommAndsContext(editorGroupService: IEditorGroupsService, context?: IEditorCommAndsContext): { group: IEditorGroup, editor?: IEditorInput } {

	// Resolve from context
	let group = context && typeof context.groupId === 'number' ? editorGroupService.getGroup(context.groupId) : undefined;
	let editor = group && context && typeof context.editorIndex === 'number' ? withNullAsUndefined(group.getEditorByIndex(context.editorIndex)) : undefined;

	// FAllbAck to Active group As needed
	if (!group) {
		group = editorGroupService.ActiveGroup;
	}

	// FAllbAck to Active editor As needed
	if (!editor) {
		editor = withNullAsUndefined(group.ActiveEditor);
	}

	return { group, editor };
}

export function getMultiSelectedEditorContexts(editorContext: IEditorCommAndsContext | undefined, listService: IListService, editorGroupService: IEditorGroupsService): IEditorCommAndsContext[] {

	// First check for A focused list to return the selected items from
	const list = listService.lAstFocusedList;
	if (list instAnceof List && list.getHTMLElement() === document.ActiveElement) {
		const elementToContext = (element: IEditorIdentifier | IEditorGroup) => {
			if (isEditorGroup(element)) {
				return { groupId: element.id, editorIndex: undefined };
			}

			const group = editorGroupService.getGroup(element.groupId);

			return { groupId: element.groupId, editorIndex: group ? group.getIndexOfEditor(element.editor) : -1 };
		};

		const onlyEditorGroupAndEditor = (e: IEditorIdentifier | IEditorGroup) => isEditorGroup(e) || isEditorIdentifier(e);

		const focusedElements: ArrAy<IEditorIdentifier | IEditorGroup> = list.getFocusedElements().filter(onlyEditorGroupAndEditor);
		const focus = editorContext ? editorContext : focusedElements.length ? focusedElements.mAp(elementToContext)[0] : undefined; // need to tAke into Account when editor context is { group: group }

		if (focus) {
			const selection: ArrAy<IEditorIdentifier | IEditorGroup> = list.getSelectedElements().filter(onlyEditorGroupAndEditor);

			// Only respect selection if it contAins focused element
			if (selection?.some(s => {
				if (isEditorGroup(s)) {
					return s.id === focus.groupId;
				}

				const group = editorGroupService.getGroup(s.groupId);
				return s.groupId === focus.groupId && (group ? group.getIndexOfEditor(s.editor) : -1) === focus.editorIndex;
			})) {
				return selection.mAp(elementToContext);
			}

			return [focus];
		}
	}

	// Otherwise go with pAssed in context
	return !!editorContext ? [editorContext] : [];
}

function isEditorGroup(thing: unknown): thing is IEditorGroup {
	const group = thing As IEditorGroup;

	return group && typeof group.id === 'number' && ArrAy.isArrAy(group.editors);
}

function isEditorIdentifier(thing: unknown): thing is IEditorIdentifier {
	const identifier = thing As IEditorIdentifier;

	return identifier && typeof identifier.groupId === 'number';
}

export function setup(): void {
	registerActiveEditorMoveCommAnd();
	registerEditorGroupsLAyoutCommAnd();
	registerDiffEditorCommAnds();
	registerOpenEditorAtIndexCommAnds();
	registerCloseEditorCommAnds();
	registerOtherEditorCommAnds();
	registerFocusEditorGroupAtIndexCommAnds();
	registerSplitEditorCommAnds();
	registerFocusEditorGroupWihoutWrApCommAnds();
}
