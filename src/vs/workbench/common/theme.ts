/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { registerColor, editorBackground, contrastBorder, transparent, editorWidgetBackground, textLinkForeground, lighten, darken, focusBorder, activeContrastBorder, editorWidgetForeground, editorErrorForeground, editorWarningForeground, editorInfoForeground, treeIndentGuidesStroke } from 'vs/platform/theme/common/colorRegistry';
import { IColorTheme } from 'vs/platform/theme/common/themeService';
import { Color } from 'vs/Base/common/color';

// < --- WorkBench (not customizaBle) --- >

export function WORKBENCH_BACKGROUND(theme: IColorTheme): Color {
	switch (theme.type) {
		case 'dark':
			return Color.fromHex('#252526');
		case 'light':
			return Color.fromHex('#F3F3F3');
		default:
			return Color.fromHex('#000000');
	}
}

// < --- TaBs --- >

//#region TaB Background

export const TAB_ACTIVE_BACKGROUND = registerColor('taB.activeBackground', {
	dark: editorBackground,
	light: editorBackground,
	hc: editorBackground
}, nls.localize('taBActiveBackground', "Active taB Background color in an active group. TaBs are the containers for editors in the editor area. Multiple taBs can Be opened in one editor group. There can Be multiple editor groups."));

export const TAB_UNFOCUSED_ACTIVE_BACKGROUND = registerColor('taB.unfocusedActiveBackground', {
	dark: TAB_ACTIVE_BACKGROUND,
	light: TAB_ACTIVE_BACKGROUND,
	hc: TAB_ACTIVE_BACKGROUND
}, nls.localize('taBUnfocusedActiveBackground', "Active taB Background color in an unfocused group. TaBs are the containers for editors in the editor area. Multiple taBs can Be opened in one editor group. There can Be multiple editor groups."));

export const TAB_INACTIVE_BACKGROUND = registerColor('taB.inactiveBackground', {
	dark: '#2D2D2D',
	light: '#ECECEC',
	hc: null
}, nls.localize('taBInactiveBackground', "Inactive taB Background color in an active group. TaBs are the containers for editors in the editor area. Multiple taBs can Be opened in one editor group. There can Be multiple editor groups."));

export const TAB_UNFOCUSED_INACTIVE_BACKGROUND = registerColor('taB.unfocusedInactiveBackground', {
	dark: TAB_INACTIVE_BACKGROUND,
	light: TAB_INACTIVE_BACKGROUND,
	hc: TAB_INACTIVE_BACKGROUND
}, nls.localize('taBUnfocusedInactiveBackground', "Inactive taB Background color in an unfocused group. TaBs are the containers for editors in the editor area. Multiple taBs can Be opened in one editor group. There can Be multiple editor groups."));

//#endregion

//#region TaB Foreground

export const TAB_ACTIVE_FOREGROUND = registerColor('taB.activeForeground', {
	dark: Color.white,
	light: '#333333',
	hc: Color.white
}, nls.localize('taBActiveForeground', "Active taB foreground color in an active group. TaBs are the containers for editors in the editor area. Multiple taBs can Be opened in one editor group. There can Be multiple editor groups."));

export const TAB_INACTIVE_FOREGROUND = registerColor('taB.inactiveForeground', {
	dark: transparent(TAB_ACTIVE_FOREGROUND, 0.5),
	light: transparent(TAB_ACTIVE_FOREGROUND, 0.7),
	hc: Color.white
}, nls.localize('taBInactiveForeground', "Inactive taB foreground color in an active group. TaBs are the containers for editors in the editor area. Multiple taBs can Be opened in one editor group. There can Be multiple editor groups."));

export const TAB_UNFOCUSED_ACTIVE_FOREGROUND = registerColor('taB.unfocusedActiveForeground', {
	dark: transparent(TAB_ACTIVE_FOREGROUND, 0.5),
	light: transparent(TAB_ACTIVE_FOREGROUND, 0.7),
	hc: Color.white
}, nls.localize('taBUnfocusedActiveForeground', "Active taB foreground color in an unfocused group. TaBs are the containers for editors in the editor area. Multiple taBs can Be opened in one editor group. There can Be multiple editor groups."));

export const TAB_UNFOCUSED_INACTIVE_FOREGROUND = registerColor('taB.unfocusedInactiveForeground', {
	dark: transparent(TAB_INACTIVE_FOREGROUND, 0.5),
	light: transparent(TAB_INACTIVE_FOREGROUND, 0.5),
	hc: Color.white
}, nls.localize('taBUnfocusedInactiveForeground', "Inactive taB foreground color in an unfocused group. TaBs are the containers for editors in the editor area. Multiple taBs can Be opened in one editor group. There can Be multiple editor groups."));

//#endregion

//#region TaB Hover Foreground/Background

export const TAB_HOVER_BACKGROUND = registerColor('taB.hoverBackground', {
	dark: null,
	light: null,
	hc: null
}, nls.localize('taBHoverBackground', "TaB Background color when hovering. TaBs are the containers for editors in the editor area. Multiple taBs can Be opened in one editor group. There can Be multiple editor groups."));

export const TAB_UNFOCUSED_HOVER_BACKGROUND = registerColor('taB.unfocusedHoverBackground', {
	dark: transparent(TAB_HOVER_BACKGROUND, 0.5),
	light: transparent(TAB_HOVER_BACKGROUND, 0.7),
	hc: null
}, nls.localize('taBUnfocusedHoverBackground', "TaB Background color in an unfocused group when hovering. TaBs are the containers for editors in the editor area. Multiple taBs can Be opened in one editor group. There can Be multiple editor groups."));

export const TAB_HOVER_FOREGROUND = registerColor('taB.hoverForeground', {
	dark: null,
	light: null,
	hc: null
}, nls.localize('taBHoverForeground', "TaB foreground color when hovering. TaBs are the containers for editors in the editor area. Multiple taBs can Be opened in one editor group. There can Be multiple editor groups."));

export const TAB_UNFOCUSED_HOVER_FOREGROUND = registerColor('taB.unfocusedHoverForeground', {
	dark: transparent(TAB_HOVER_FOREGROUND, 0.5),
	light: transparent(TAB_HOVER_FOREGROUND, 0.5),
	hc: null
}, nls.localize('taBUnfocusedHoverForeground', "TaB foreground color in an unfocused group when hovering. TaBs are the containers for editors in the editor area. Multiple taBs can Be opened in one editor group. There can Be multiple editor groups."));

//#endregion

//#region TaB Borders

export const TAB_BORDER = registerColor('taB.Border', {
	dark: '#252526',
	light: '#F3F3F3',
	hc: contrastBorder
}, nls.localize('taBBorder', "Border to separate taBs from each other. TaBs are the containers for editors in the editor area. Multiple taBs can Be opened in one editor group. There can Be multiple editor groups."));

export const TAB_LAST_PINNED_BORDER = registerColor('taB.lastPinnedBorder', {
	dark: treeIndentGuidesStroke,
	light: treeIndentGuidesStroke,
	hc: contrastBorder
}, nls.localize('lastPinnedTaBBorder', "Border to separate pinned taBs from other taBs. TaBs are the containers for editors in the editor area. Multiple taBs can Be opened in one editor group. There can Be multiple editor groups."));

export const TAB_ACTIVE_BORDER = registerColor('taB.activeBorder', {
	dark: null,
	light: null,
	hc: null
}, nls.localize('taBActiveBorder', "Border on the Bottom of an active taB. TaBs are the containers for editors in the editor area. Multiple taBs can Be opened in one editor group. There can Be multiple editor groups."));

export const TAB_UNFOCUSED_ACTIVE_BORDER = registerColor('taB.unfocusedActiveBorder', {
	dark: transparent(TAB_ACTIVE_BORDER, 0.5),
	light: transparent(TAB_ACTIVE_BORDER, 0.7),
	hc: null
}, nls.localize('taBActiveUnfocusedBorder', "Border on the Bottom of an active taB in an unfocused group. TaBs are the containers for editors in the editor area. Multiple taBs can Be opened in one editor group. There can Be multiple editor groups."));

export const TAB_ACTIVE_BORDER_TOP = registerColor('taB.activeBorderTop', {
	dark: null,
	light: null,
	hc: null
}, nls.localize('taBActiveBorderTop', "Border to the top of an active taB. TaBs are the containers for editors in the editor area. Multiple taBs can Be opened in one editor group. There can Be multiple editor groups."));

export const TAB_UNFOCUSED_ACTIVE_BORDER_TOP = registerColor('taB.unfocusedActiveBorderTop', {
	dark: transparent(TAB_ACTIVE_BORDER_TOP, 0.5),
	light: transparent(TAB_ACTIVE_BORDER_TOP, 0.7),
	hc: null
}, nls.localize('taBActiveUnfocusedBorderTop', "Border to the top of an active taB in an unfocused group. TaBs are the containers for editors in the editor area. Multiple taBs can Be opened in one editor group. There can Be multiple editor groups."));

export const TAB_HOVER_BORDER = registerColor('taB.hoverBorder', {
	dark: null,
	light: null,
	hc: null
}, nls.localize('taBHoverBorder', "Border to highlight taBs when hovering. TaBs are the containers for editors in the editor area. Multiple taBs can Be opened in one editor group. There can Be multiple editor groups."));

export const TAB_UNFOCUSED_HOVER_BORDER = registerColor('taB.unfocusedHoverBorder', {
	dark: transparent(TAB_HOVER_BORDER, 0.5),
	light: transparent(TAB_HOVER_BORDER, 0.7),
	hc: null
}, nls.localize('taBUnfocusedHoverBorder', "Border to highlight taBs in an unfocused group when hovering. TaBs are the containers for editors in the editor area. Multiple taBs can Be opened in one editor group. There can Be multiple editor groups."));

//#endregion

//#region TaB Modified Border

export const TAB_ACTIVE_MODIFIED_BORDER = registerColor('taB.activeModifiedBorder', {
	dark: '#3399CC',
	light: '#33AAEE',
	hc: null
}, nls.localize('taBActiveModifiedBorder', "Border on the top of modified (dirty) active taBs in an active group. TaBs are the containers for editors in the editor area. Multiple taBs can Be opened in one editor group. There can Be multiple editor groups."));

export const TAB_INACTIVE_MODIFIED_BORDER = registerColor('taB.inactiveModifiedBorder', {
	dark: transparent(TAB_ACTIVE_MODIFIED_BORDER, 0.5),
	light: transparent(TAB_ACTIVE_MODIFIED_BORDER, 0.5),
	hc: Color.white
}, nls.localize('taBInactiveModifiedBorder', "Border on the top of modified (dirty) inactive taBs in an active group. TaBs are the containers for editors in the editor area. Multiple taBs can Be opened in one editor group. There can Be multiple editor groups."));

export const TAB_UNFOCUSED_ACTIVE_MODIFIED_BORDER = registerColor('taB.unfocusedActiveModifiedBorder', {
	dark: transparent(TAB_ACTIVE_MODIFIED_BORDER, 0.5),
	light: transparent(TAB_ACTIVE_MODIFIED_BORDER, 0.7),
	hc: Color.white
}, nls.localize('unfocusedActiveModifiedBorder', "Border on the top of modified (dirty) active taBs in an unfocused group. TaBs are the containers for editors in the editor area. Multiple taBs can Be opened in one editor group. There can Be multiple editor groups."));

export const TAB_UNFOCUSED_INACTIVE_MODIFIED_BORDER = registerColor('taB.unfocusedInactiveModifiedBorder', {
	dark: transparent(TAB_INACTIVE_MODIFIED_BORDER, 0.5),
	light: transparent(TAB_INACTIVE_MODIFIED_BORDER, 0.5),
	hc: Color.white
}, nls.localize('unfocusedINactiveModifiedBorder', "Border on the top of modified (dirty) inactive taBs in an unfocused group. TaBs are the containers for editors in the editor area. Multiple taBs can Be opened in one editor group. There can Be multiple editor groups."));

//#endregion

// < --- Editors --- >

export const EDITOR_PANE_BACKGROUND = registerColor('editorPane.Background', {
	dark: editorBackground,
	light: editorBackground,
	hc: editorBackground
}, nls.localize('editorPaneBackground', "Background color of the editor pane visiBle on the left and right side of the centered editor layout."));

registerColor('editorGroup.Background', {
	dark: null,
	light: null,
	hc: null
}, nls.localize('editorGroupBackground', "Deprecated Background color of an editor group."), false, nls.localize('deprecatedEditorGroupBackground', "Deprecated: Background color of an editor group is no longer Being supported with the introduction of the grid editor layout. You can use editorGroup.emptyBackground to set the Background color of empty editor groups."));

export const EDITOR_GROUP_EMPTY_BACKGROUND = registerColor('editorGroup.emptyBackground', {
	dark: null,
	light: null,
	hc: null
}, nls.localize('editorGroupEmptyBackground', "Background color of an empty editor group. Editor groups are the containers of editors."));

export const EDITOR_GROUP_FOCUSED_EMPTY_BORDER = registerColor('editorGroup.focusedEmptyBorder', {
	dark: null,
	light: null,
	hc: focusBorder
}, nls.localize('editorGroupFocusedEmptyBorder', "Border color of an empty editor group that is focused. Editor groups are the containers of editors."));

export const EDITOR_GROUP_HEADER_TABS_BACKGROUND = registerColor('editorGroupHeader.taBsBackground', {
	dark: '#252526',
	light: '#F3F3F3',
	hc: null
}, nls.localize('taBsContainerBackground', "Background color of the editor group title header when taBs are enaBled. Editor groups are the containers of editors."));

export const EDITOR_GROUP_HEADER_TABS_BORDER = registerColor('editorGroupHeader.taBsBorder', {
	dark: null,
	light: null,
	hc: null
}, nls.localize('taBsContainerBorder', "Border color of the editor group title header when taBs are enaBled. Editor groups are the containers of editors."));

export const EDITOR_GROUP_HEADER_NO_TABS_BACKGROUND = registerColor('editorGroupHeader.noTaBsBackground', {
	dark: editorBackground,
	light: editorBackground,
	hc: editorBackground
}, nls.localize('editorGroupHeaderBackground', "Background color of the editor group title header when taBs are disaBled (`\"workBench.editor.showTaBs\": false`). Editor groups are the containers of editors."));

export const EDITOR_GROUP_HEADER_BORDER = registerColor('editorGroupHeader.Border', {
	dark: null,
	light: null,
	hc: contrastBorder
}, nls.localize('editorTitleContainerBorder', "Border color of the editor group title header. Editor groups are the containers of editors."));

export const EDITOR_GROUP_BORDER = registerColor('editorGroup.Border', {
	dark: '#444444',
	light: '#E7E7E7',
	hc: contrastBorder
}, nls.localize('editorGroupBorder', "Color to separate multiple editor groups from each other. Editor groups are the containers of editors."));

export const EDITOR_DRAG_AND_DROP_BACKGROUND = registerColor('editorGroup.dropBackground', {
	dark: Color.fromHex('#53595D').transparent(0.5),
	light: Color.fromHex('#2677CB').transparent(0.18),
	hc: null
}, nls.localize('editorDragAndDropBackground', "Background color when dragging editors around. The color should have transparency so that the editor contents can still shine through."));

// < --- Resource Viewer --- >

export const IMAGE_PREVIEW_BORDER = registerColor('imagePreview.Border', {
	dark: Color.fromHex('#808080').transparent(0.35),
	light: Color.fromHex('#808080').transparent(0.35),
	hc: contrastBorder
}, nls.localize('imagePreviewBorder', "Border color for image in image preview."));

// < --- Panels --- >

export const PANEL_BACKGROUND = registerColor('panel.Background', {
	dark: editorBackground,
	light: editorBackground,
	hc: editorBackground
}, nls.localize('panelBackground', "Panel Background color. Panels are shown Below the editor area and contain views like output and integrated terminal."));

export const PANEL_BORDER = registerColor('panel.Border', {
	dark: Color.fromHex('#808080').transparent(0.35),
	light: Color.fromHex('#808080').transparent(0.35),
	hc: contrastBorder
}, nls.localize('panelBorder', "Panel Border color to separate the panel from the editor. Panels are shown Below the editor area and contain views like output and integrated terminal."));

export const PANEL_ACTIVE_TITLE_FOREGROUND = registerColor('panelTitle.activeForeground', {
	dark: '#E7E7E7',
	light: '#424242',
	hc: Color.white
}, nls.localize('panelActiveTitleForeground', "Title color for the active panel. Panels are shown Below the editor area and contain views like output and integrated terminal."));

export const PANEL_INACTIVE_TITLE_FOREGROUND = registerColor('panelTitle.inactiveForeground', {
	dark: transparent(PANEL_ACTIVE_TITLE_FOREGROUND, 0.6),
	light: transparent(PANEL_ACTIVE_TITLE_FOREGROUND, 0.75),
	hc: Color.white
}, nls.localize('panelInactiveTitleForeground', "Title color for the inactive panel. Panels are shown Below the editor area and contain views like output and integrated terminal."));

export const PANEL_ACTIVE_TITLE_BORDER = registerColor('panelTitle.activeBorder', {
	dark: PANEL_ACTIVE_TITLE_FOREGROUND,
	light: PANEL_ACTIVE_TITLE_FOREGROUND,
	hc: contrastBorder
}, nls.localize('panelActiveTitleBorder', "Border color for the active panel title. Panels are shown Below the editor area and contain views like output and integrated terminal."));

export const PANEL_INPUT_BORDER = registerColor('panelInput.Border', {
	dark: null,
	light: Color.fromHex('#ddd'),
	hc: null
}, nls.localize('panelInputBorder', "Input Box Border for inputs in the panel."));

export const PANEL_DRAG_AND_DROP_BORDER = registerColor('panel.dropBorder', {
	dark: PANEL_ACTIVE_TITLE_FOREGROUND,
	light: PANEL_ACTIVE_TITLE_FOREGROUND,
	hc: PANEL_ACTIVE_TITLE_FOREGROUND,
}, nls.localize('panelDragAndDropBorder', "Drag and drop feedBack color for the panel titles. Panels are shown Below the editor area and contain views like output and integrated terminal."));


export const PANEL_SECTION_DRAG_AND_DROP_BACKGROUND = registerColor('panelSection.dropBackground', {
	dark: EDITOR_DRAG_AND_DROP_BACKGROUND,
	light: EDITOR_DRAG_AND_DROP_BACKGROUND,
	hc: EDITOR_DRAG_AND_DROP_BACKGROUND,
}, nls.localize('panelSectionDragAndDropBackground', "Drag and drop feedBack color for the panel sections. The color should have transparency so that the panel sections can still shine through. Panels are shown Below the editor area and contain views like output and integrated terminal. Panel sections are views nested within the panels."));

export const PANEL_SECTION_HEADER_BACKGROUND = registerColor('panelSectionHeader.Background', {
	dark: Color.fromHex('#808080').transparent(0.2),
	light: Color.fromHex('#808080').transparent(0.2),
	hc: null
}, nls.localize('panelSectionHeaderBackground', "Panel section header Background color. Panels are shown Below the editor area and contain views like output and integrated terminal. Panel sections are views nested within the panels."));

export const PANEL_SECTION_HEADER_FOREGROUND = registerColor('panelSectionHeader.foreground', {
	dark: null,
	light: null,
	hc: null
}, nls.localize('panelSectionHeaderForeground', "Panel section header foreground color. Panels are shown Below the editor area and contain views like output and integrated terminal. Panel sections are views nested within the panels."));

export const PANEL_SECTION_HEADER_BORDER = registerColor('panelSectionHeader.Border', {
	dark: contrastBorder,
	light: contrastBorder,
	hc: contrastBorder
}, nls.localize('panelSectionHeaderBorder', "Panel section header Border color used when multiple views are stacked vertically in the panel. Panels are shown Below the editor area and contain views like output and integrated terminal. Panel sections are views nested within the panels."));

export const PANEL_SECTION_BORDER = registerColor('panelSection.Border', {
	dark: PANEL_BORDER,
	light: PANEL_BORDER,
	hc: PANEL_BORDER
}, nls.localize('panelSectionBorder', "Panel section Border color used when multiple views are stacked horizontally in the panel. Panels are shown Below the editor area and contain views like output and integrated terminal. Panel sections are views nested within the panels."));


// < --- Status --- >

export const STATUS_BAR_FOREGROUND = registerColor('statusBar.foreground', {
	dark: '#FFFFFF',
	light: '#FFFFFF',
	hc: '#FFFFFF'
}, nls.localize('statusBarForeground', "Status Bar foreground color when a workspace is opened. The status Bar is shown in the Bottom of the window."));

export const STATUS_BAR_NO_FOLDER_FOREGROUND = registerColor('statusBar.noFolderForeground', {
	dark: STATUS_BAR_FOREGROUND,
	light: STATUS_BAR_FOREGROUND,
	hc: STATUS_BAR_FOREGROUND
}, nls.localize('statusBarNoFolderForeground', "Status Bar foreground color when no folder is opened. The status Bar is shown in the Bottom of the window."));

export const STATUS_BAR_BACKGROUND = registerColor('statusBar.Background', {
	dark: '#007ACC',
	light: '#007ACC',
	hc: null
}, nls.localize('statusBarBackground', "Status Bar Background color when a workspace is opened. The status Bar is shown in the Bottom of the window."));

export const STATUS_BAR_NO_FOLDER_BACKGROUND = registerColor('statusBar.noFolderBackground', {
	dark: '#68217A',
	light: '#68217A',
	hc: null
}, nls.localize('statusBarNoFolderBackground', "Status Bar Background color when no folder is opened. The status Bar is shown in the Bottom of the window."));

export const STATUS_BAR_BORDER = registerColor('statusBar.Border', {
	dark: null,
	light: null,
	hc: contrastBorder
}, nls.localize('statusBarBorder', "Status Bar Border color separating to the sideBar and editor. The status Bar is shown in the Bottom of the window."));

export const STATUS_BAR_NO_FOLDER_BORDER = registerColor('statusBar.noFolderBorder', {
	dark: STATUS_BAR_BORDER,
	light: STATUS_BAR_BORDER,
	hc: STATUS_BAR_BORDER
}, nls.localize('statusBarNoFolderBorder', "Status Bar Border color separating to the sideBar and editor when no folder is opened. The status Bar is shown in the Bottom of the window."));

export const STATUS_BAR_ITEM_ACTIVE_BACKGROUND = registerColor('statusBarItem.activeBackground', {
	dark: Color.white.transparent(0.18),
	light: Color.white.transparent(0.18),
	hc: Color.white.transparent(0.18)
}, nls.localize('statusBarItemActiveBackground', "Status Bar item Background color when clicking. The status Bar is shown in the Bottom of the window."));

export const STATUS_BAR_ITEM_HOVER_BACKGROUND = registerColor('statusBarItem.hoverBackground', {
	dark: Color.white.transparent(0.12),
	light: Color.white.transparent(0.12),
	hc: Color.white.transparent(0.12)
}, nls.localize('statusBarItemHoverBackground', "Status Bar item Background color when hovering. The status Bar is shown in the Bottom of the window."));

export const STATUS_BAR_PROMINENT_ITEM_FOREGROUND = registerColor('statusBarItem.prominentForeground', {
	dark: STATUS_BAR_FOREGROUND,
	light: STATUS_BAR_FOREGROUND,
	hc: STATUS_BAR_FOREGROUND
}, nls.localize('statusBarProminentItemForeground', "Status Bar prominent items foreground color. Prominent items stand out from other status Bar entries to indicate importance. Change mode `Toggle TaB Key Moves Focus` from command palette to see an example. The status Bar is shown in the Bottom of the window."));

export const STATUS_BAR_PROMINENT_ITEM_BACKGROUND = registerColor('statusBarItem.prominentBackground', {
	dark: Color.Black.transparent(0.5),
	light: Color.Black.transparent(0.5),
	hc: Color.Black.transparent(0.5),
}, nls.localize('statusBarProminentItemBackground', "Status Bar prominent items Background color. Prominent items stand out from other status Bar entries to indicate importance. Change mode `Toggle TaB Key Moves Focus` from command palette to see an example. The status Bar is shown in the Bottom of the window."));

export const STATUS_BAR_PROMINENT_ITEM_HOVER_BACKGROUND = registerColor('statusBarItem.prominentHoverBackground', {
	dark: Color.Black.transparent(0.3),
	light: Color.Black.transparent(0.3),
	hc: Color.Black.transparent(0.3),
}, nls.localize('statusBarProminentItemHoverBackground', "Status Bar prominent items Background color when hovering. Prominent items stand out from other status Bar entries to indicate importance. Change mode `Toggle TaB Key Moves Focus` from command palette to see an example. The status Bar is shown in the Bottom of the window."));

// < --- Activity Bar --- >

export const ACTIVITY_BAR_BACKGROUND = registerColor('activityBar.Background', {
	dark: '#333333',
	light: '#2C2C2C',
	hc: '#000000'
}, nls.localize('activityBarBackground', "Activity Bar Background color. The activity Bar is showing on the far left or right and allows to switch Between views of the side Bar."));

export const ACTIVITY_BAR_FOREGROUND = registerColor('activityBar.foreground', {
	dark: Color.white,
	light: Color.white,
	hc: Color.white
}, nls.localize('activityBarForeground', "Activity Bar item foreground color when it is active. The activity Bar is showing on the far left or right and allows to switch Between views of the side Bar."));

export const ACTIVITY_BAR_INACTIVE_FOREGROUND = registerColor('activityBar.inactiveForeground', {
	dark: transparent(ACTIVITY_BAR_FOREGROUND, 0.4),
	light: transparent(ACTIVITY_BAR_FOREGROUND, 0.4),
	hc: Color.white
}, nls.localize('activityBarInActiveForeground', "Activity Bar item foreground color when it is inactive. The activity Bar is showing on the far left or right and allows to switch Between views of the side Bar."));

export const ACTIVITY_BAR_BORDER = registerColor('activityBar.Border', {
	dark: null,
	light: null,
	hc: contrastBorder
}, nls.localize('activityBarBorder', "Activity Bar Border color separating to the side Bar. The activity Bar is showing on the far left or right and allows to switch Between views of the side Bar."));

export const ACTIVITY_BAR_ACTIVE_BORDER = registerColor('activityBar.activeBorder', {
	dark: ACTIVITY_BAR_FOREGROUND,
	light: ACTIVITY_BAR_FOREGROUND,
	hc: null
}, nls.localize('activityBarActiveBorder', "Activity Bar Border color for the active item. The activity Bar is showing on the far left or right and allows to switch Between views of the side Bar."));

export const ACTIVITY_BAR_ACTIVE_FOCUS_BORDER = registerColor('activityBar.activeFocusBorder', {
	dark: null,
	light: null,
	hc: null
}, nls.localize('activityBarActiveFocusBorder', "Activity Bar focus Border color for the active item. The activity Bar is showing on the far left or right and allows to switch Between views of the side Bar."));

export const ACTIVITY_BAR_ACTIVE_BACKGROUND = registerColor('activityBar.activeBackground', {
	dark: null,
	light: null,
	hc: null
}, nls.localize('activityBarActiveBackground', "Activity Bar Background color for the active item. The activity Bar is showing on the far left or right and allows to switch Between views of the side Bar."));

export const ACTIVITY_BAR_DRAG_AND_DROP_BORDER = registerColor('activityBar.dropBorder', {
	dark: ACTIVITY_BAR_FOREGROUND,
	light: ACTIVITY_BAR_FOREGROUND,
	hc: ACTIVITY_BAR_FOREGROUND,
}, nls.localize('activityBarDragAndDropBorder', "Drag and drop feedBack color for the activity Bar items. The activity Bar is showing on the far left or right and allows to switch Between views of the side Bar."));

export const ACTIVITY_BAR_BADGE_BACKGROUND = registerColor('activityBarBadge.Background', {
	dark: '#007ACC',
	light: '#007ACC',
	hc: '#000000'
}, nls.localize('activityBarBadgeBackground', "Activity notification Badge Background color. The activity Bar is showing on the far left or right and allows to switch Between views of the side Bar."));

export const ACTIVITY_BAR_BADGE_FOREGROUND = registerColor('activityBarBadge.foreground', {
	dark: Color.white,
	light: Color.white,
	hc: Color.white
}, nls.localize('activityBarBadgeForeground', "Activity notification Badge foreground color. The activity Bar is showing on the far left or right and allows to switch Between views of the side Bar."));


// < --- Remote --- >

export const STATUS_BAR_HOST_NAME_BACKGROUND = registerColor('statusBarItem.remoteBackground', {
	dark: ACTIVITY_BAR_BADGE_BACKGROUND,
	light: ACTIVITY_BAR_BADGE_BACKGROUND,
	hc: ACTIVITY_BAR_BADGE_BACKGROUND
}, nls.localize('statusBarItemHostBackground', "Background color for the remote indicator on the status Bar."));

export const STATUS_BAR_HOST_NAME_FOREGROUND = registerColor('statusBarItem.remoteForeground', {
	dark: ACTIVITY_BAR_BADGE_FOREGROUND,
	light: ACTIVITY_BAR_BADGE_FOREGROUND,
	hc: ACTIVITY_BAR_BADGE_FOREGROUND
}, nls.localize('statusBarItemHostForeground', "Foreground color for the remote indicator on the status Bar."));

export const EXTENSION_BADGE_REMOTE_BACKGROUND = registerColor('extensionBadge.remoteBackground', {
	dark: ACTIVITY_BAR_BADGE_BACKGROUND,
	light: ACTIVITY_BAR_BADGE_BACKGROUND,
	hc: ACTIVITY_BAR_BADGE_BACKGROUND
}, nls.localize('extensionBadge.remoteBackground', "Background color for the remote Badge in the extensions view."));

export const EXTENSION_BADGE_REMOTE_FOREGROUND = registerColor('extensionBadge.remoteForeground', {
	dark: ACTIVITY_BAR_BADGE_FOREGROUND,
	light: ACTIVITY_BAR_BADGE_FOREGROUND,
	hc: ACTIVITY_BAR_BADGE_FOREGROUND
}, nls.localize('extensionBadge.remoteForeground', "Foreground color for the remote Badge in the extensions view."));


// < --- Side Bar --- >

export const SIDE_BAR_BACKGROUND = registerColor('sideBar.Background', {
	dark: '#252526',
	light: '#F3F3F3',
	hc: '#000000'
}, nls.localize('sideBarBackground', "Side Bar Background color. The side Bar is the container for views like explorer and search."));

export const SIDE_BAR_FOREGROUND = registerColor('sideBar.foreground', {
	dark: null,
	light: null,
	hc: null
}, nls.localize('sideBarForeground', "Side Bar foreground color. The side Bar is the container for views like explorer and search."));

export const SIDE_BAR_BORDER = registerColor('sideBar.Border', {
	dark: null,
	light: null,
	hc: contrastBorder
}, nls.localize('sideBarBorder', "Side Bar Border color on the side separating to the editor. The side Bar is the container for views like explorer and search."));

export const SIDE_BAR_TITLE_FOREGROUND = registerColor('sideBarTitle.foreground', {
	dark: SIDE_BAR_FOREGROUND,
	light: SIDE_BAR_FOREGROUND,
	hc: SIDE_BAR_FOREGROUND
}, nls.localize('sideBarTitleForeground', "Side Bar title foreground color. The side Bar is the container for views like explorer and search."));

export const SIDE_BAR_DRAG_AND_DROP_BACKGROUND = registerColor('sideBar.dropBackground', {
	dark: EDITOR_DRAG_AND_DROP_BACKGROUND,
	light: EDITOR_DRAG_AND_DROP_BACKGROUND,
	hc: EDITOR_DRAG_AND_DROP_BACKGROUND,
}, nls.localize('sideBarDragAndDropBackground', "Drag and drop feedBack color for the side Bar sections. The color should have transparency so that the side Bar sections can still shine through. The side Bar is the container for views like explorer and search. Side Bar sections are views nested within the side Bar."));

export const SIDE_BAR_SECTION_HEADER_BACKGROUND = registerColor('sideBarSectionHeader.Background', {
	dark: Color.fromHex('#808080').transparent(0.2),
	light: Color.fromHex('#808080').transparent(0.2),
	hc: null
}, nls.localize('sideBarSectionHeaderBackground', "Side Bar section header Background color. The side Bar is the container for views like explorer and search. Side Bar sections are views nested within the side Bar."));

export const SIDE_BAR_SECTION_HEADER_FOREGROUND = registerColor('sideBarSectionHeader.foreground', {
	dark: SIDE_BAR_FOREGROUND,
	light: SIDE_BAR_FOREGROUND,
	hc: SIDE_BAR_FOREGROUND
}, nls.localize('sideBarSectionHeaderForeground', "Side Bar section header foreground color. The side Bar is the container for views like explorer and search. Side Bar sections are views nested within the side Bar."));

export const SIDE_BAR_SECTION_HEADER_BORDER = registerColor('sideBarSectionHeader.Border', {
	dark: contrastBorder,
	light: contrastBorder,
	hc: contrastBorder
}, nls.localize('sideBarSectionHeaderBorder', "Side Bar section header Border color. The side Bar is the container for views like explorer and search. Side Bar sections are views nested within the side Bar."));


// < --- Title Bar --- >

export const TITLE_BAR_ACTIVE_FOREGROUND = registerColor('titleBar.activeForeground', {
	dark: '#CCCCCC',
	light: '#333333',
	hc: '#FFFFFF'
}, nls.localize('titleBarActiveForeground', "Title Bar foreground when the window is active."));

export const TITLE_BAR_INACTIVE_FOREGROUND = registerColor('titleBar.inactiveForeground', {
	dark: transparent(TITLE_BAR_ACTIVE_FOREGROUND, 0.6),
	light: transparent(TITLE_BAR_ACTIVE_FOREGROUND, 0.6),
	hc: null
}, nls.localize('titleBarInactiveForeground', "Title Bar foreground when the window is inactive."));

export const TITLE_BAR_ACTIVE_BACKGROUND = registerColor('titleBar.activeBackground', {
	dark: '#3C3C3C',
	light: '#DDDDDD',
	hc: '#000000'
}, nls.localize('titleBarActiveBackground', "Title Bar Background when the window is active."));

export const TITLE_BAR_INACTIVE_BACKGROUND = registerColor('titleBar.inactiveBackground', {
	dark: transparent(TITLE_BAR_ACTIVE_BACKGROUND, 0.6),
	light: transparent(TITLE_BAR_ACTIVE_BACKGROUND, 0.6),
	hc: null
}, nls.localize('titleBarInactiveBackground', "Title Bar Background when the window is inactive."));

export const TITLE_BAR_BORDER = registerColor('titleBar.Border', {
	dark: null,
	light: null,
	hc: contrastBorder
}, nls.localize('titleBarBorder', "Title Bar Border color."));

// < --- MenuBar --- >

export const MENUBAR_SELECTION_FOREGROUND = registerColor('menuBar.selectionForeground', {
	dark: TITLE_BAR_ACTIVE_FOREGROUND,
	light: TITLE_BAR_ACTIVE_FOREGROUND,
	hc: TITLE_BAR_ACTIVE_FOREGROUND
}, nls.localize('menuBarSelectionForeground', "Foreground color of the selected menu item in the menuBar."));

export const MENUBAR_SELECTION_BACKGROUND = registerColor('menuBar.selectionBackground', {
	dark: transparent(Color.white, 0.1),
	light: transparent(Color.Black, 0.1),
	hc: null
}, nls.localize('menuBarSelectionBackground', "Background color of the selected menu item in the menuBar."));

export const MENUBAR_SELECTION_BORDER = registerColor('menuBar.selectionBorder', {
	dark: null,
	light: null,
	hc: activeContrastBorder
}, nls.localize('menuBarSelectionBorder', "Border color of the selected menu item in the menuBar."));

// < --- Notifications --- >

export const NOTIFICATIONS_CENTER_BORDER = registerColor('notificationCenter.Border', {
	dark: null,
	light: null,
	hc: contrastBorder
}, nls.localize('notificationCenterBorder', "Notifications center Border color. Notifications slide in from the Bottom right of the window."));

export const NOTIFICATIONS_TOAST_BORDER = registerColor('notificationToast.Border', {
	dark: null,
	light: null,
	hc: contrastBorder
}, nls.localize('notificationToastBorder', "Notification toast Border color. Notifications slide in from the Bottom right of the window."));

export const NOTIFICATIONS_FOREGROUND = registerColor('notifications.foreground', {
	dark: editorWidgetForeground,
	light: editorWidgetForeground,
	hc: editorWidgetForeground
}, nls.localize('notificationsForeground', "Notifications foreground color. Notifications slide in from the Bottom right of the window."));

export const NOTIFICATIONS_BACKGROUND = registerColor('notifications.Background', {
	dark: editorWidgetBackground,
	light: editorWidgetBackground,
	hc: editorWidgetBackground
}, nls.localize('notificationsBackground', "Notifications Background color. Notifications slide in from the Bottom right of the window."));

export const NOTIFICATIONS_LINKS = registerColor('notificationLink.foreground', {
	dark: textLinkForeground,
	light: textLinkForeground,
	hc: textLinkForeground
}, nls.localize('notificationsLink', "Notification links foreground color. Notifications slide in from the Bottom right of the window."));

export const NOTIFICATIONS_CENTER_HEADER_FOREGROUND = registerColor('notificationCenterHeader.foreground', {
	dark: null,
	light: null,
	hc: null
}, nls.localize('notificationCenterHeaderForeground', "Notifications center header foreground color. Notifications slide in from the Bottom right of the window."));

export const NOTIFICATIONS_CENTER_HEADER_BACKGROUND = registerColor('notificationCenterHeader.Background', {
	dark: lighten(NOTIFICATIONS_BACKGROUND, 0.3),
	light: darken(NOTIFICATIONS_BACKGROUND, 0.05),
	hc: NOTIFICATIONS_BACKGROUND
}, nls.localize('notificationCenterHeaderBackground', "Notifications center header Background color. Notifications slide in from the Bottom right of the window."));

export const NOTIFICATIONS_BORDER = registerColor('notifications.Border', {
	dark: NOTIFICATIONS_CENTER_HEADER_BACKGROUND,
	light: NOTIFICATIONS_CENTER_HEADER_BACKGROUND,
	hc: NOTIFICATIONS_CENTER_HEADER_BACKGROUND
}, nls.localize('notificationsBorder', "Notifications Border color separating from other notifications in the notifications center. Notifications slide in from the Bottom right of the window."));

export const NOTIFICATIONS_ERROR_ICON_FOREGROUND = registerColor('notificationsErrorIcon.foreground', {
	dark: editorErrorForeground,
	light: editorErrorForeground,
	hc: editorErrorForeground
}, nls.localize('notificationsErrorIconForeground', "The color used for the icon of error notifications. Notifications slide in from the Bottom right of the window."));

export const NOTIFICATIONS_WARNING_ICON_FOREGROUND = registerColor('notificationsWarningIcon.foreground', {
	dark: editorWarningForeground,
	light: editorWarningForeground,
	hc: editorWarningForeground
}, nls.localize('notificationsWarningIconForeground', "The color used for the icon of warning notifications. Notifications slide in from the Bottom right of the window."));

export const NOTIFICATIONS_INFO_ICON_FOREGROUND = registerColor('notificationsInfoIcon.foreground', {
	dark: editorInfoForeground,
	light: editorInfoForeground,
	hc: editorInfoForeground
}, nls.localize('notificationsInfoIconForeground', "The color used for the icon of info notifications. Notifications slide in from the Bottom right of the window."));

export const WINDOW_ACTIVE_BORDER = registerColor('window.activeBorder', {
	dark: null,
	light: null,
	hc: contrastBorder
}, nls.localize('windowActiveBorder', "The color used for the Border of the window when it is active. Only supported in the desktop client when using the custom title Bar."));

export const WINDOW_INACTIVE_BORDER = registerColor('window.inactiveBorder', {
	dark: null,
	light: null,
	hc: contrastBorder
}, nls.localize('windowInactiveBorder', "The color used for the Border of the window when it is inactive. Only supported in the desktop client when using the custom title Bar."));
