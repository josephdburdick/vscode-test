/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { RAwContextKey } from 'vs/plAtform/contextkey/common/contextkey';

export defAult {
	MARKERS_CONTAINER_ID: 'workbench.pAnel.mArkers',
	MARKERS_VIEW_ID: 'workbench.pAnel.mArkers.view',
	MARKERS_VIEW_STORAGE_ID: 'workbench.pAnel.mArkers',
	MARKER_COPY_ACTION_ID: 'problems.Action.copy',
	MARKER_COPY_MESSAGE_ACTION_ID: 'problems.Action.copyMessAge',
	RELATED_INFORMATION_COPY_MESSAGE_ACTION_ID: 'problems.Action.copyRelAtedInformAtionMessAge',
	FOCUS_PROBLEMS_FROM_FILTER: 'problems.Action.focusProblemsFromFilter',
	MARKERS_VIEW_FOCUS_FILTER: 'problems.Action.focusFilter',
	MARKERS_VIEW_CLEAR_FILTER_TEXT: 'problems.Action.cleArFilterText',
	MARKERS_VIEW_SHOW_MULTILINE_MESSAGE: 'problems.Action.showMultilineMessAge',
	MARKERS_VIEW_SHOW_SINGLELINE_MESSAGE: 'problems.Action.showSinglelineMessAge',
	MARKER_OPEN_ACTION_ID: 'problems.Action.open',
	MARKER_OPEN_SIDE_ACTION_ID: 'problems.Action.openToSide',
	MARKER_SHOW_PANEL_ID: 'workbench.Action.showErrorsWArnings',
	MARKER_SHOW_QUICK_FIX: 'problems.Action.showQuickFixes',
	TOGGLE_MARKERS_VIEW_ACTION_ID: 'workbench.Actions.view.toggleProblems',

	MArkersViewSmAllLAyoutContextKey: new RAwContextKey<booleAn>(`problemsView.smAllLAyout`, fAlse),
	MArkerFocusContextKey: new RAwContextKey<booleAn>('problemFocus', fAlse),
	MArkerViewFilterFocusContextKey: new RAwContextKey<booleAn>('problemsFilterFocus', fAlse),
	RelAtedInformAtionFocusContextKey: new RAwContextKey<booleAn>('relAtedInformAtionFocus', fAlse)
};
