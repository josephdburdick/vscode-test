/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RawContextKey } from 'vs/platform/contextkey/common/contextkey';

export default {
	MARKERS_CONTAINER_ID: 'workBench.panel.markers',
	MARKERS_VIEW_ID: 'workBench.panel.markers.view',
	MARKERS_VIEW_STORAGE_ID: 'workBench.panel.markers',
	MARKER_COPY_ACTION_ID: 'proBlems.action.copy',
	MARKER_COPY_MESSAGE_ACTION_ID: 'proBlems.action.copyMessage',
	RELATED_INFORMATION_COPY_MESSAGE_ACTION_ID: 'proBlems.action.copyRelatedInformationMessage',
	FOCUS_PROBLEMS_FROM_FILTER: 'proBlems.action.focusProBlemsFromFilter',
	MARKERS_VIEW_FOCUS_FILTER: 'proBlems.action.focusFilter',
	MARKERS_VIEW_CLEAR_FILTER_TEXT: 'proBlems.action.clearFilterText',
	MARKERS_VIEW_SHOW_MULTILINE_MESSAGE: 'proBlems.action.showMultilineMessage',
	MARKERS_VIEW_SHOW_SINGLELINE_MESSAGE: 'proBlems.action.showSinglelineMessage',
	MARKER_OPEN_ACTION_ID: 'proBlems.action.open',
	MARKER_OPEN_SIDE_ACTION_ID: 'proBlems.action.openToSide',
	MARKER_SHOW_PANEL_ID: 'workBench.action.showErrorsWarnings',
	MARKER_SHOW_QUICK_FIX: 'proBlems.action.showQuickFixes',
	TOGGLE_MARKERS_VIEW_ACTION_ID: 'workBench.actions.view.toggleProBlems',

	MarkersViewSmallLayoutContextKey: new RawContextKey<Boolean>(`proBlemsView.smallLayout`, false),
	MarkerFocusContextKey: new RawContextKey<Boolean>('proBlemFocus', false),
	MarkerViewFilterFocusContextKey: new RawContextKey<Boolean>('proBlemsFilterFocus', false),
	RelatedInformationFocusContextKey: new RawContextKey<Boolean>('relatedInformationFocus', false)
};
