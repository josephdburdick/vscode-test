/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { registerColor, editorBAckground, contrAstBorder, trAnspArent, editorWidgetBAckground, textLinkForeground, lighten, dArken, focusBorder, ActiveContrAstBorder, editorWidgetForeground, editorErrorForeground, editorWArningForeground, editorInfoForeground, treeIndentGuidesStroke } from 'vs/plAtform/theme/common/colorRegistry';
import { IColorTheme } from 'vs/plAtform/theme/common/themeService';
import { Color } from 'vs/bAse/common/color';

// < --- Workbench (not customizAble) --- >

export function WORKBENCH_BACKGROUND(theme: IColorTheme): Color {
	switch (theme.type) {
		cAse 'dArk':
			return Color.fromHex('#252526');
		cAse 'light':
			return Color.fromHex('#F3F3F3');
		defAult:
			return Color.fromHex('#000000');
	}
}

// < --- TAbs --- >

//#region TAb BAckground

export const TAB_ACTIVE_BACKGROUND = registerColor('tAb.ActiveBAckground', {
	dArk: editorBAckground,
	light: editorBAckground,
	hc: editorBAckground
}, nls.locAlize('tAbActiveBAckground', "Active tAb bAckground color in An Active group. TAbs Are the contAiners for editors in the editor AreA. Multiple tAbs cAn be opened in one editor group. There cAn be multiple editor groups."));

export const TAB_UNFOCUSED_ACTIVE_BACKGROUND = registerColor('tAb.unfocusedActiveBAckground', {
	dArk: TAB_ACTIVE_BACKGROUND,
	light: TAB_ACTIVE_BACKGROUND,
	hc: TAB_ACTIVE_BACKGROUND
}, nls.locAlize('tAbUnfocusedActiveBAckground', "Active tAb bAckground color in An unfocused group. TAbs Are the contAiners for editors in the editor AreA. Multiple tAbs cAn be opened in one editor group. There cAn be multiple editor groups."));

export const TAB_INACTIVE_BACKGROUND = registerColor('tAb.inActiveBAckground', {
	dArk: '#2D2D2D',
	light: '#ECECEC',
	hc: null
}, nls.locAlize('tAbInActiveBAckground', "InActive tAb bAckground color in An Active group. TAbs Are the contAiners for editors in the editor AreA. Multiple tAbs cAn be opened in one editor group. There cAn be multiple editor groups."));

export const TAB_UNFOCUSED_INACTIVE_BACKGROUND = registerColor('tAb.unfocusedInActiveBAckground', {
	dArk: TAB_INACTIVE_BACKGROUND,
	light: TAB_INACTIVE_BACKGROUND,
	hc: TAB_INACTIVE_BACKGROUND
}, nls.locAlize('tAbUnfocusedInActiveBAckground', "InActive tAb bAckground color in An unfocused group. TAbs Are the contAiners for editors in the editor AreA. Multiple tAbs cAn be opened in one editor group. There cAn be multiple editor groups."));

//#endregion

//#region TAb Foreground

export const TAB_ACTIVE_FOREGROUND = registerColor('tAb.ActiveForeground', {
	dArk: Color.white,
	light: '#333333',
	hc: Color.white
}, nls.locAlize('tAbActiveForeground', "Active tAb foreground color in An Active group. TAbs Are the contAiners for editors in the editor AreA. Multiple tAbs cAn be opened in one editor group. There cAn be multiple editor groups."));

export const TAB_INACTIVE_FOREGROUND = registerColor('tAb.inActiveForeground', {
	dArk: trAnspArent(TAB_ACTIVE_FOREGROUND, 0.5),
	light: trAnspArent(TAB_ACTIVE_FOREGROUND, 0.7),
	hc: Color.white
}, nls.locAlize('tAbInActiveForeground', "InActive tAb foreground color in An Active group. TAbs Are the contAiners for editors in the editor AreA. Multiple tAbs cAn be opened in one editor group. There cAn be multiple editor groups."));

export const TAB_UNFOCUSED_ACTIVE_FOREGROUND = registerColor('tAb.unfocusedActiveForeground', {
	dArk: trAnspArent(TAB_ACTIVE_FOREGROUND, 0.5),
	light: trAnspArent(TAB_ACTIVE_FOREGROUND, 0.7),
	hc: Color.white
}, nls.locAlize('tAbUnfocusedActiveForeground', "Active tAb foreground color in An unfocused group. TAbs Are the contAiners for editors in the editor AreA. Multiple tAbs cAn be opened in one editor group. There cAn be multiple editor groups."));

export const TAB_UNFOCUSED_INACTIVE_FOREGROUND = registerColor('tAb.unfocusedInActiveForeground', {
	dArk: trAnspArent(TAB_INACTIVE_FOREGROUND, 0.5),
	light: trAnspArent(TAB_INACTIVE_FOREGROUND, 0.5),
	hc: Color.white
}, nls.locAlize('tAbUnfocusedInActiveForeground', "InActive tAb foreground color in An unfocused group. TAbs Are the contAiners for editors in the editor AreA. Multiple tAbs cAn be opened in one editor group. There cAn be multiple editor groups."));

//#endregion

//#region TAb Hover Foreground/BAckground

export const TAB_HOVER_BACKGROUND = registerColor('tAb.hoverBAckground', {
	dArk: null,
	light: null,
	hc: null
}, nls.locAlize('tAbHoverBAckground', "TAb bAckground color when hovering. TAbs Are the contAiners for editors in the editor AreA. Multiple tAbs cAn be opened in one editor group. There cAn be multiple editor groups."));

export const TAB_UNFOCUSED_HOVER_BACKGROUND = registerColor('tAb.unfocusedHoverBAckground', {
	dArk: trAnspArent(TAB_HOVER_BACKGROUND, 0.5),
	light: trAnspArent(TAB_HOVER_BACKGROUND, 0.7),
	hc: null
}, nls.locAlize('tAbUnfocusedHoverBAckground', "TAb bAckground color in An unfocused group when hovering. TAbs Are the contAiners for editors in the editor AreA. Multiple tAbs cAn be opened in one editor group. There cAn be multiple editor groups."));

export const TAB_HOVER_FOREGROUND = registerColor('tAb.hoverForeground', {
	dArk: null,
	light: null,
	hc: null
}, nls.locAlize('tAbHoverForeground', "TAb foreground color when hovering. TAbs Are the contAiners for editors in the editor AreA. Multiple tAbs cAn be opened in one editor group. There cAn be multiple editor groups."));

export const TAB_UNFOCUSED_HOVER_FOREGROUND = registerColor('tAb.unfocusedHoverForeground', {
	dArk: trAnspArent(TAB_HOVER_FOREGROUND, 0.5),
	light: trAnspArent(TAB_HOVER_FOREGROUND, 0.5),
	hc: null
}, nls.locAlize('tAbUnfocusedHoverForeground', "TAb foreground color in An unfocused group when hovering. TAbs Are the contAiners for editors in the editor AreA. Multiple tAbs cAn be opened in one editor group. There cAn be multiple editor groups."));

//#endregion

//#region TAb Borders

export const TAB_BORDER = registerColor('tAb.border', {
	dArk: '#252526',
	light: '#F3F3F3',
	hc: contrAstBorder
}, nls.locAlize('tAbBorder', "Border to sepArAte tAbs from eAch other. TAbs Are the contAiners for editors in the editor AreA. Multiple tAbs cAn be opened in one editor group. There cAn be multiple editor groups."));

export const TAB_LAST_PINNED_BORDER = registerColor('tAb.lAstPinnedBorder', {
	dArk: treeIndentGuidesStroke,
	light: treeIndentGuidesStroke,
	hc: contrAstBorder
}, nls.locAlize('lAstPinnedTAbBorder', "Border to sepArAte pinned tAbs from other tAbs. TAbs Are the contAiners for editors in the editor AreA. Multiple tAbs cAn be opened in one editor group. There cAn be multiple editor groups."));

export const TAB_ACTIVE_BORDER = registerColor('tAb.ActiveBorder', {
	dArk: null,
	light: null,
	hc: null
}, nls.locAlize('tAbActiveBorder', "Border on the bottom of An Active tAb. TAbs Are the contAiners for editors in the editor AreA. Multiple tAbs cAn be opened in one editor group. There cAn be multiple editor groups."));

export const TAB_UNFOCUSED_ACTIVE_BORDER = registerColor('tAb.unfocusedActiveBorder', {
	dArk: trAnspArent(TAB_ACTIVE_BORDER, 0.5),
	light: trAnspArent(TAB_ACTIVE_BORDER, 0.7),
	hc: null
}, nls.locAlize('tAbActiveUnfocusedBorder', "Border on the bottom of An Active tAb in An unfocused group. TAbs Are the contAiners for editors in the editor AreA. Multiple tAbs cAn be opened in one editor group. There cAn be multiple editor groups."));

export const TAB_ACTIVE_BORDER_TOP = registerColor('tAb.ActiveBorderTop', {
	dArk: null,
	light: null,
	hc: null
}, nls.locAlize('tAbActiveBorderTop', "Border to the top of An Active tAb. TAbs Are the contAiners for editors in the editor AreA. Multiple tAbs cAn be opened in one editor group. There cAn be multiple editor groups."));

export const TAB_UNFOCUSED_ACTIVE_BORDER_TOP = registerColor('tAb.unfocusedActiveBorderTop', {
	dArk: trAnspArent(TAB_ACTIVE_BORDER_TOP, 0.5),
	light: trAnspArent(TAB_ACTIVE_BORDER_TOP, 0.7),
	hc: null
}, nls.locAlize('tAbActiveUnfocusedBorderTop', "Border to the top of An Active tAb in An unfocused group. TAbs Are the contAiners for editors in the editor AreA. Multiple tAbs cAn be opened in one editor group. There cAn be multiple editor groups."));

export const TAB_HOVER_BORDER = registerColor('tAb.hoverBorder', {
	dArk: null,
	light: null,
	hc: null
}, nls.locAlize('tAbHoverBorder', "Border to highlight tAbs when hovering. TAbs Are the contAiners for editors in the editor AreA. Multiple tAbs cAn be opened in one editor group. There cAn be multiple editor groups."));

export const TAB_UNFOCUSED_HOVER_BORDER = registerColor('tAb.unfocusedHoverBorder', {
	dArk: trAnspArent(TAB_HOVER_BORDER, 0.5),
	light: trAnspArent(TAB_HOVER_BORDER, 0.7),
	hc: null
}, nls.locAlize('tAbUnfocusedHoverBorder', "Border to highlight tAbs in An unfocused group when hovering. TAbs Are the contAiners for editors in the editor AreA. Multiple tAbs cAn be opened in one editor group. There cAn be multiple editor groups."));

//#endregion

//#region TAb Modified Border

export const TAB_ACTIVE_MODIFIED_BORDER = registerColor('tAb.ActiveModifiedBorder', {
	dArk: '#3399CC',
	light: '#33AAEE',
	hc: null
}, nls.locAlize('tAbActiveModifiedBorder', "Border on the top of modified (dirty) Active tAbs in An Active group. TAbs Are the contAiners for editors in the editor AreA. Multiple tAbs cAn be opened in one editor group. There cAn be multiple editor groups."));

export const TAB_INACTIVE_MODIFIED_BORDER = registerColor('tAb.inActiveModifiedBorder', {
	dArk: trAnspArent(TAB_ACTIVE_MODIFIED_BORDER, 0.5),
	light: trAnspArent(TAB_ACTIVE_MODIFIED_BORDER, 0.5),
	hc: Color.white
}, nls.locAlize('tAbInActiveModifiedBorder', "Border on the top of modified (dirty) inActive tAbs in An Active group. TAbs Are the contAiners for editors in the editor AreA. Multiple tAbs cAn be opened in one editor group. There cAn be multiple editor groups."));

export const TAB_UNFOCUSED_ACTIVE_MODIFIED_BORDER = registerColor('tAb.unfocusedActiveModifiedBorder', {
	dArk: trAnspArent(TAB_ACTIVE_MODIFIED_BORDER, 0.5),
	light: trAnspArent(TAB_ACTIVE_MODIFIED_BORDER, 0.7),
	hc: Color.white
}, nls.locAlize('unfocusedActiveModifiedBorder', "Border on the top of modified (dirty) Active tAbs in An unfocused group. TAbs Are the contAiners for editors in the editor AreA. Multiple tAbs cAn be opened in one editor group. There cAn be multiple editor groups."));

export const TAB_UNFOCUSED_INACTIVE_MODIFIED_BORDER = registerColor('tAb.unfocusedInActiveModifiedBorder', {
	dArk: trAnspArent(TAB_INACTIVE_MODIFIED_BORDER, 0.5),
	light: trAnspArent(TAB_INACTIVE_MODIFIED_BORDER, 0.5),
	hc: Color.white
}, nls.locAlize('unfocusedINActiveModifiedBorder', "Border on the top of modified (dirty) inActive tAbs in An unfocused group. TAbs Are the contAiners for editors in the editor AreA. Multiple tAbs cAn be opened in one editor group. There cAn be multiple editor groups."));

//#endregion

// < --- Editors --- >

export const EDITOR_PANE_BACKGROUND = registerColor('editorPAne.bAckground', {
	dArk: editorBAckground,
	light: editorBAckground,
	hc: editorBAckground
}, nls.locAlize('editorPAneBAckground', "BAckground color of the editor pAne visible on the left And right side of the centered editor lAyout."));

registerColor('editorGroup.bAckground', {
	dArk: null,
	light: null,
	hc: null
}, nls.locAlize('editorGroupBAckground', "DeprecAted bAckground color of An editor group."), fAlse, nls.locAlize('deprecAtedEditorGroupBAckground', "DeprecAted: BAckground color of An editor group is no longer being supported with the introduction of the grid editor lAyout. You cAn use editorGroup.emptyBAckground to set the bAckground color of empty editor groups."));

export const EDITOR_GROUP_EMPTY_BACKGROUND = registerColor('editorGroup.emptyBAckground', {
	dArk: null,
	light: null,
	hc: null
}, nls.locAlize('editorGroupEmptyBAckground', "BAckground color of An empty editor group. Editor groups Are the contAiners of editors."));

export const EDITOR_GROUP_FOCUSED_EMPTY_BORDER = registerColor('editorGroup.focusedEmptyBorder', {
	dArk: null,
	light: null,
	hc: focusBorder
}, nls.locAlize('editorGroupFocusedEmptyBorder', "Border color of An empty editor group thAt is focused. Editor groups Are the contAiners of editors."));

export const EDITOR_GROUP_HEADER_TABS_BACKGROUND = registerColor('editorGroupHeAder.tAbsBAckground', {
	dArk: '#252526',
	light: '#F3F3F3',
	hc: null
}, nls.locAlize('tAbsContAinerBAckground', "BAckground color of the editor group title heAder when tAbs Are enAbled. Editor groups Are the contAiners of editors."));

export const EDITOR_GROUP_HEADER_TABS_BORDER = registerColor('editorGroupHeAder.tAbsBorder', {
	dArk: null,
	light: null,
	hc: null
}, nls.locAlize('tAbsContAinerBorder', "Border color of the editor group title heAder when tAbs Are enAbled. Editor groups Are the contAiners of editors."));

export const EDITOR_GROUP_HEADER_NO_TABS_BACKGROUND = registerColor('editorGroupHeAder.noTAbsBAckground', {
	dArk: editorBAckground,
	light: editorBAckground,
	hc: editorBAckground
}, nls.locAlize('editorGroupHeAderBAckground', "BAckground color of the editor group title heAder when tAbs Are disAbled (`\"workbench.editor.showTAbs\": fAlse`). Editor groups Are the contAiners of editors."));

export const EDITOR_GROUP_HEADER_BORDER = registerColor('editorGroupHeAder.border', {
	dArk: null,
	light: null,
	hc: contrAstBorder
}, nls.locAlize('editorTitleContAinerBorder', "Border color of the editor group title heAder. Editor groups Are the contAiners of editors."));

export const EDITOR_GROUP_BORDER = registerColor('editorGroup.border', {
	dArk: '#444444',
	light: '#E7E7E7',
	hc: contrAstBorder
}, nls.locAlize('editorGroupBorder', "Color to sepArAte multiple editor groups from eAch other. Editor groups Are the contAiners of editors."));

export const EDITOR_DRAG_AND_DROP_BACKGROUND = registerColor('editorGroup.dropBAckground', {
	dArk: Color.fromHex('#53595D').trAnspArent(0.5),
	light: Color.fromHex('#2677CB').trAnspArent(0.18),
	hc: null
}, nls.locAlize('editorDrAgAndDropBAckground', "BAckground color when drAgging editors Around. The color should hAve trAnspArency so thAt the editor contents cAn still shine through."));

// < --- Resource Viewer --- >

export const IMAGE_PREVIEW_BORDER = registerColor('imAgePreview.border', {
	dArk: Color.fromHex('#808080').trAnspArent(0.35),
	light: Color.fromHex('#808080').trAnspArent(0.35),
	hc: contrAstBorder
}, nls.locAlize('imAgePreviewBorder', "Border color for imAge in imAge preview."));

// < --- PAnels --- >

export const PANEL_BACKGROUND = registerColor('pAnel.bAckground', {
	dArk: editorBAckground,
	light: editorBAckground,
	hc: editorBAckground
}, nls.locAlize('pAnelBAckground', "PAnel bAckground color. PAnels Are shown below the editor AreA And contAin views like output And integrAted terminAl."));

export const PANEL_BORDER = registerColor('pAnel.border', {
	dArk: Color.fromHex('#808080').trAnspArent(0.35),
	light: Color.fromHex('#808080').trAnspArent(0.35),
	hc: contrAstBorder
}, nls.locAlize('pAnelBorder', "PAnel border color to sepArAte the pAnel from the editor. PAnels Are shown below the editor AreA And contAin views like output And integrAted terminAl."));

export const PANEL_ACTIVE_TITLE_FOREGROUND = registerColor('pAnelTitle.ActiveForeground', {
	dArk: '#E7E7E7',
	light: '#424242',
	hc: Color.white
}, nls.locAlize('pAnelActiveTitleForeground', "Title color for the Active pAnel. PAnels Are shown below the editor AreA And contAin views like output And integrAted terminAl."));

export const PANEL_INACTIVE_TITLE_FOREGROUND = registerColor('pAnelTitle.inActiveForeground', {
	dArk: trAnspArent(PANEL_ACTIVE_TITLE_FOREGROUND, 0.6),
	light: trAnspArent(PANEL_ACTIVE_TITLE_FOREGROUND, 0.75),
	hc: Color.white
}, nls.locAlize('pAnelInActiveTitleForeground', "Title color for the inActive pAnel. PAnels Are shown below the editor AreA And contAin views like output And integrAted terminAl."));

export const PANEL_ACTIVE_TITLE_BORDER = registerColor('pAnelTitle.ActiveBorder', {
	dArk: PANEL_ACTIVE_TITLE_FOREGROUND,
	light: PANEL_ACTIVE_TITLE_FOREGROUND,
	hc: contrAstBorder
}, nls.locAlize('pAnelActiveTitleBorder', "Border color for the Active pAnel title. PAnels Are shown below the editor AreA And contAin views like output And integrAted terminAl."));

export const PANEL_INPUT_BORDER = registerColor('pAnelInput.border', {
	dArk: null,
	light: Color.fromHex('#ddd'),
	hc: null
}, nls.locAlize('pAnelInputBorder', "Input box border for inputs in the pAnel."));

export const PANEL_DRAG_AND_DROP_BORDER = registerColor('pAnel.dropBorder', {
	dArk: PANEL_ACTIVE_TITLE_FOREGROUND,
	light: PANEL_ACTIVE_TITLE_FOREGROUND,
	hc: PANEL_ACTIVE_TITLE_FOREGROUND,
}, nls.locAlize('pAnelDrAgAndDropBorder', "DrAg And drop feedbAck color for the pAnel titles. PAnels Are shown below the editor AreA And contAin views like output And integrAted terminAl."));


export const PANEL_SECTION_DRAG_AND_DROP_BACKGROUND = registerColor('pAnelSection.dropBAckground', {
	dArk: EDITOR_DRAG_AND_DROP_BACKGROUND,
	light: EDITOR_DRAG_AND_DROP_BACKGROUND,
	hc: EDITOR_DRAG_AND_DROP_BACKGROUND,
}, nls.locAlize('pAnelSectionDrAgAndDropBAckground', "DrAg And drop feedbAck color for the pAnel sections. The color should hAve trAnspArency so thAt the pAnel sections cAn still shine through. PAnels Are shown below the editor AreA And contAin views like output And integrAted terminAl. PAnel sections Are views nested within the pAnels."));

export const PANEL_SECTION_HEADER_BACKGROUND = registerColor('pAnelSectionHeAder.bAckground', {
	dArk: Color.fromHex('#808080').trAnspArent(0.2),
	light: Color.fromHex('#808080').trAnspArent(0.2),
	hc: null
}, nls.locAlize('pAnelSectionHeAderBAckground', "PAnel section heAder bAckground color. PAnels Are shown below the editor AreA And contAin views like output And integrAted terminAl. PAnel sections Are views nested within the pAnels."));

export const PANEL_SECTION_HEADER_FOREGROUND = registerColor('pAnelSectionHeAder.foreground', {
	dArk: null,
	light: null,
	hc: null
}, nls.locAlize('pAnelSectionHeAderForeground', "PAnel section heAder foreground color. PAnels Are shown below the editor AreA And contAin views like output And integrAted terminAl. PAnel sections Are views nested within the pAnels."));

export const PANEL_SECTION_HEADER_BORDER = registerColor('pAnelSectionHeAder.border', {
	dArk: contrAstBorder,
	light: contrAstBorder,
	hc: contrAstBorder
}, nls.locAlize('pAnelSectionHeAderBorder', "PAnel section heAder border color used when multiple views Are stAcked verticAlly in the pAnel. PAnels Are shown below the editor AreA And contAin views like output And integrAted terminAl. PAnel sections Are views nested within the pAnels."));

export const PANEL_SECTION_BORDER = registerColor('pAnelSection.border', {
	dArk: PANEL_BORDER,
	light: PANEL_BORDER,
	hc: PANEL_BORDER
}, nls.locAlize('pAnelSectionBorder', "PAnel section border color used when multiple views Are stAcked horizontAlly in the pAnel. PAnels Are shown below the editor AreA And contAin views like output And integrAted terminAl. PAnel sections Are views nested within the pAnels."));


// < --- StAtus --- >

export const STATUS_BAR_FOREGROUND = registerColor('stAtusBAr.foreground', {
	dArk: '#FFFFFF',
	light: '#FFFFFF',
	hc: '#FFFFFF'
}, nls.locAlize('stAtusBArForeground', "StAtus bAr foreground color when A workspAce is opened. The stAtus bAr is shown in the bottom of the window."));

export const STATUS_BAR_NO_FOLDER_FOREGROUND = registerColor('stAtusBAr.noFolderForeground', {
	dArk: STATUS_BAR_FOREGROUND,
	light: STATUS_BAR_FOREGROUND,
	hc: STATUS_BAR_FOREGROUND
}, nls.locAlize('stAtusBArNoFolderForeground', "StAtus bAr foreground color when no folder is opened. The stAtus bAr is shown in the bottom of the window."));

export const STATUS_BAR_BACKGROUND = registerColor('stAtusBAr.bAckground', {
	dArk: '#007ACC',
	light: '#007ACC',
	hc: null
}, nls.locAlize('stAtusBArBAckground', "StAtus bAr bAckground color when A workspAce is opened. The stAtus bAr is shown in the bottom of the window."));

export const STATUS_BAR_NO_FOLDER_BACKGROUND = registerColor('stAtusBAr.noFolderBAckground', {
	dArk: '#68217A',
	light: '#68217A',
	hc: null
}, nls.locAlize('stAtusBArNoFolderBAckground', "StAtus bAr bAckground color when no folder is opened. The stAtus bAr is shown in the bottom of the window."));

export const STATUS_BAR_BORDER = registerColor('stAtusBAr.border', {
	dArk: null,
	light: null,
	hc: contrAstBorder
}, nls.locAlize('stAtusBArBorder', "StAtus bAr border color sepArAting to the sidebAr And editor. The stAtus bAr is shown in the bottom of the window."));

export const STATUS_BAR_NO_FOLDER_BORDER = registerColor('stAtusBAr.noFolderBorder', {
	dArk: STATUS_BAR_BORDER,
	light: STATUS_BAR_BORDER,
	hc: STATUS_BAR_BORDER
}, nls.locAlize('stAtusBArNoFolderBorder', "StAtus bAr border color sepArAting to the sidebAr And editor when no folder is opened. The stAtus bAr is shown in the bottom of the window."));

export const STATUS_BAR_ITEM_ACTIVE_BACKGROUND = registerColor('stAtusBArItem.ActiveBAckground', {
	dArk: Color.white.trAnspArent(0.18),
	light: Color.white.trAnspArent(0.18),
	hc: Color.white.trAnspArent(0.18)
}, nls.locAlize('stAtusBArItemActiveBAckground', "StAtus bAr item bAckground color when clicking. The stAtus bAr is shown in the bottom of the window."));

export const STATUS_BAR_ITEM_HOVER_BACKGROUND = registerColor('stAtusBArItem.hoverBAckground', {
	dArk: Color.white.trAnspArent(0.12),
	light: Color.white.trAnspArent(0.12),
	hc: Color.white.trAnspArent(0.12)
}, nls.locAlize('stAtusBArItemHoverBAckground', "StAtus bAr item bAckground color when hovering. The stAtus bAr is shown in the bottom of the window."));

export const STATUS_BAR_PROMINENT_ITEM_FOREGROUND = registerColor('stAtusBArItem.prominentForeground', {
	dArk: STATUS_BAR_FOREGROUND,
	light: STATUS_BAR_FOREGROUND,
	hc: STATUS_BAR_FOREGROUND
}, nls.locAlize('stAtusBArProminentItemForeground', "StAtus bAr prominent items foreground color. Prominent items stAnd out from other stAtus bAr entries to indicAte importAnce. ChAnge mode `Toggle TAb Key Moves Focus` from commAnd pAlette to see An exAmple. The stAtus bAr is shown in the bottom of the window."));

export const STATUS_BAR_PROMINENT_ITEM_BACKGROUND = registerColor('stAtusBArItem.prominentBAckground', {
	dArk: Color.blAck.trAnspArent(0.5),
	light: Color.blAck.trAnspArent(0.5),
	hc: Color.blAck.trAnspArent(0.5),
}, nls.locAlize('stAtusBArProminentItemBAckground', "StAtus bAr prominent items bAckground color. Prominent items stAnd out from other stAtus bAr entries to indicAte importAnce. ChAnge mode `Toggle TAb Key Moves Focus` from commAnd pAlette to see An exAmple. The stAtus bAr is shown in the bottom of the window."));

export const STATUS_BAR_PROMINENT_ITEM_HOVER_BACKGROUND = registerColor('stAtusBArItem.prominentHoverBAckground', {
	dArk: Color.blAck.trAnspArent(0.3),
	light: Color.blAck.trAnspArent(0.3),
	hc: Color.blAck.trAnspArent(0.3),
}, nls.locAlize('stAtusBArProminentItemHoverBAckground', "StAtus bAr prominent items bAckground color when hovering. Prominent items stAnd out from other stAtus bAr entries to indicAte importAnce. ChAnge mode `Toggle TAb Key Moves Focus` from commAnd pAlette to see An exAmple. The stAtus bAr is shown in the bottom of the window."));

// < --- Activity BAr --- >

export const ACTIVITY_BAR_BACKGROUND = registerColor('ActivityBAr.bAckground', {
	dArk: '#333333',
	light: '#2C2C2C',
	hc: '#000000'
}, nls.locAlize('ActivityBArBAckground', "Activity bAr bAckground color. The Activity bAr is showing on the fAr left or right And Allows to switch between views of the side bAr."));

export const ACTIVITY_BAR_FOREGROUND = registerColor('ActivityBAr.foreground', {
	dArk: Color.white,
	light: Color.white,
	hc: Color.white
}, nls.locAlize('ActivityBArForeground', "Activity bAr item foreground color when it is Active. The Activity bAr is showing on the fAr left or right And Allows to switch between views of the side bAr."));

export const ACTIVITY_BAR_INACTIVE_FOREGROUND = registerColor('ActivityBAr.inActiveForeground', {
	dArk: trAnspArent(ACTIVITY_BAR_FOREGROUND, 0.4),
	light: trAnspArent(ACTIVITY_BAR_FOREGROUND, 0.4),
	hc: Color.white
}, nls.locAlize('ActivityBArInActiveForeground', "Activity bAr item foreground color when it is inActive. The Activity bAr is showing on the fAr left or right And Allows to switch between views of the side bAr."));

export const ACTIVITY_BAR_BORDER = registerColor('ActivityBAr.border', {
	dArk: null,
	light: null,
	hc: contrAstBorder
}, nls.locAlize('ActivityBArBorder', "Activity bAr border color sepArAting to the side bAr. The Activity bAr is showing on the fAr left or right And Allows to switch between views of the side bAr."));

export const ACTIVITY_BAR_ACTIVE_BORDER = registerColor('ActivityBAr.ActiveBorder', {
	dArk: ACTIVITY_BAR_FOREGROUND,
	light: ACTIVITY_BAR_FOREGROUND,
	hc: null
}, nls.locAlize('ActivityBArActiveBorder', "Activity bAr border color for the Active item. The Activity bAr is showing on the fAr left or right And Allows to switch between views of the side bAr."));

export const ACTIVITY_BAR_ACTIVE_FOCUS_BORDER = registerColor('ActivityBAr.ActiveFocusBorder', {
	dArk: null,
	light: null,
	hc: null
}, nls.locAlize('ActivityBArActiveFocusBorder', "Activity bAr focus border color for the Active item. The Activity bAr is showing on the fAr left or right And Allows to switch between views of the side bAr."));

export const ACTIVITY_BAR_ACTIVE_BACKGROUND = registerColor('ActivityBAr.ActiveBAckground', {
	dArk: null,
	light: null,
	hc: null
}, nls.locAlize('ActivityBArActiveBAckground', "Activity bAr bAckground color for the Active item. The Activity bAr is showing on the fAr left or right And Allows to switch between views of the side bAr."));

export const ACTIVITY_BAR_DRAG_AND_DROP_BORDER = registerColor('ActivityBAr.dropBorder', {
	dArk: ACTIVITY_BAR_FOREGROUND,
	light: ACTIVITY_BAR_FOREGROUND,
	hc: ACTIVITY_BAR_FOREGROUND,
}, nls.locAlize('ActivityBArDrAgAndDropBorder', "DrAg And drop feedbAck color for the Activity bAr items. The Activity bAr is showing on the fAr left or right And Allows to switch between views of the side bAr."));

export const ACTIVITY_BAR_BADGE_BACKGROUND = registerColor('ActivityBArBAdge.bAckground', {
	dArk: '#007ACC',
	light: '#007ACC',
	hc: '#000000'
}, nls.locAlize('ActivityBArBAdgeBAckground', "Activity notificAtion bAdge bAckground color. The Activity bAr is showing on the fAr left or right And Allows to switch between views of the side bAr."));

export const ACTIVITY_BAR_BADGE_FOREGROUND = registerColor('ActivityBArBAdge.foreground', {
	dArk: Color.white,
	light: Color.white,
	hc: Color.white
}, nls.locAlize('ActivityBArBAdgeForeground', "Activity notificAtion bAdge foreground color. The Activity bAr is showing on the fAr left or right And Allows to switch between views of the side bAr."));


// < --- Remote --- >

export const STATUS_BAR_HOST_NAME_BACKGROUND = registerColor('stAtusBArItem.remoteBAckground', {
	dArk: ACTIVITY_BAR_BADGE_BACKGROUND,
	light: ACTIVITY_BAR_BADGE_BACKGROUND,
	hc: ACTIVITY_BAR_BADGE_BACKGROUND
}, nls.locAlize('stAtusBArItemHostBAckground', "BAckground color for the remote indicAtor on the stAtus bAr."));

export const STATUS_BAR_HOST_NAME_FOREGROUND = registerColor('stAtusBArItem.remoteForeground', {
	dArk: ACTIVITY_BAR_BADGE_FOREGROUND,
	light: ACTIVITY_BAR_BADGE_FOREGROUND,
	hc: ACTIVITY_BAR_BADGE_FOREGROUND
}, nls.locAlize('stAtusBArItemHostForeground', "Foreground color for the remote indicAtor on the stAtus bAr."));

export const EXTENSION_BADGE_REMOTE_BACKGROUND = registerColor('extensionBAdge.remoteBAckground', {
	dArk: ACTIVITY_BAR_BADGE_BACKGROUND,
	light: ACTIVITY_BAR_BADGE_BACKGROUND,
	hc: ACTIVITY_BAR_BADGE_BACKGROUND
}, nls.locAlize('extensionBAdge.remoteBAckground', "BAckground color for the remote bAdge in the extensions view."));

export const EXTENSION_BADGE_REMOTE_FOREGROUND = registerColor('extensionBAdge.remoteForeground', {
	dArk: ACTIVITY_BAR_BADGE_FOREGROUND,
	light: ACTIVITY_BAR_BADGE_FOREGROUND,
	hc: ACTIVITY_BAR_BADGE_FOREGROUND
}, nls.locAlize('extensionBAdge.remoteForeground', "Foreground color for the remote bAdge in the extensions view."));


// < --- Side BAr --- >

export const SIDE_BAR_BACKGROUND = registerColor('sideBAr.bAckground', {
	dArk: '#252526',
	light: '#F3F3F3',
	hc: '#000000'
}, nls.locAlize('sideBArBAckground', "Side bAr bAckground color. The side bAr is the contAiner for views like explorer And seArch."));

export const SIDE_BAR_FOREGROUND = registerColor('sideBAr.foreground', {
	dArk: null,
	light: null,
	hc: null
}, nls.locAlize('sideBArForeground', "Side bAr foreground color. The side bAr is the contAiner for views like explorer And seArch."));

export const SIDE_BAR_BORDER = registerColor('sideBAr.border', {
	dArk: null,
	light: null,
	hc: contrAstBorder
}, nls.locAlize('sideBArBorder', "Side bAr border color on the side sepArAting to the editor. The side bAr is the contAiner for views like explorer And seArch."));

export const SIDE_BAR_TITLE_FOREGROUND = registerColor('sideBArTitle.foreground', {
	dArk: SIDE_BAR_FOREGROUND,
	light: SIDE_BAR_FOREGROUND,
	hc: SIDE_BAR_FOREGROUND
}, nls.locAlize('sideBArTitleForeground', "Side bAr title foreground color. The side bAr is the contAiner for views like explorer And seArch."));

export const SIDE_BAR_DRAG_AND_DROP_BACKGROUND = registerColor('sideBAr.dropBAckground', {
	dArk: EDITOR_DRAG_AND_DROP_BACKGROUND,
	light: EDITOR_DRAG_AND_DROP_BACKGROUND,
	hc: EDITOR_DRAG_AND_DROP_BACKGROUND,
}, nls.locAlize('sideBArDrAgAndDropBAckground', "DrAg And drop feedbAck color for the side bAr sections. The color should hAve trAnspArency so thAt the side bAr sections cAn still shine through. The side bAr is the contAiner for views like explorer And seArch. Side bAr sections Are views nested within the side bAr."));

export const SIDE_BAR_SECTION_HEADER_BACKGROUND = registerColor('sideBArSectionHeAder.bAckground', {
	dArk: Color.fromHex('#808080').trAnspArent(0.2),
	light: Color.fromHex('#808080').trAnspArent(0.2),
	hc: null
}, nls.locAlize('sideBArSectionHeAderBAckground', "Side bAr section heAder bAckground color. The side bAr is the contAiner for views like explorer And seArch. Side bAr sections Are views nested within the side bAr."));

export const SIDE_BAR_SECTION_HEADER_FOREGROUND = registerColor('sideBArSectionHeAder.foreground', {
	dArk: SIDE_BAR_FOREGROUND,
	light: SIDE_BAR_FOREGROUND,
	hc: SIDE_BAR_FOREGROUND
}, nls.locAlize('sideBArSectionHeAderForeground', "Side bAr section heAder foreground color. The side bAr is the contAiner for views like explorer And seArch. Side bAr sections Are views nested within the side bAr."));

export const SIDE_BAR_SECTION_HEADER_BORDER = registerColor('sideBArSectionHeAder.border', {
	dArk: contrAstBorder,
	light: contrAstBorder,
	hc: contrAstBorder
}, nls.locAlize('sideBArSectionHeAderBorder', "Side bAr section heAder border color. The side bAr is the contAiner for views like explorer And seArch. Side bAr sections Are views nested within the side bAr."));


// < --- Title BAr --- >

export const TITLE_BAR_ACTIVE_FOREGROUND = registerColor('titleBAr.ActiveForeground', {
	dArk: '#CCCCCC',
	light: '#333333',
	hc: '#FFFFFF'
}, nls.locAlize('titleBArActiveForeground', "Title bAr foreground when the window is Active."));

export const TITLE_BAR_INACTIVE_FOREGROUND = registerColor('titleBAr.inActiveForeground', {
	dArk: trAnspArent(TITLE_BAR_ACTIVE_FOREGROUND, 0.6),
	light: trAnspArent(TITLE_BAR_ACTIVE_FOREGROUND, 0.6),
	hc: null
}, nls.locAlize('titleBArInActiveForeground', "Title bAr foreground when the window is inActive."));

export const TITLE_BAR_ACTIVE_BACKGROUND = registerColor('titleBAr.ActiveBAckground', {
	dArk: '#3C3C3C',
	light: '#DDDDDD',
	hc: '#000000'
}, nls.locAlize('titleBArActiveBAckground', "Title bAr bAckground when the window is Active."));

export const TITLE_BAR_INACTIVE_BACKGROUND = registerColor('titleBAr.inActiveBAckground', {
	dArk: trAnspArent(TITLE_BAR_ACTIVE_BACKGROUND, 0.6),
	light: trAnspArent(TITLE_BAR_ACTIVE_BACKGROUND, 0.6),
	hc: null
}, nls.locAlize('titleBArInActiveBAckground', "Title bAr bAckground when the window is inActive."));

export const TITLE_BAR_BORDER = registerColor('titleBAr.border', {
	dArk: null,
	light: null,
	hc: contrAstBorder
}, nls.locAlize('titleBArBorder', "Title bAr border color."));

// < --- MenubAr --- >

export const MENUBAR_SELECTION_FOREGROUND = registerColor('menubAr.selectionForeground', {
	dArk: TITLE_BAR_ACTIVE_FOREGROUND,
	light: TITLE_BAR_ACTIVE_FOREGROUND,
	hc: TITLE_BAR_ACTIVE_FOREGROUND
}, nls.locAlize('menubArSelectionForeground', "Foreground color of the selected menu item in the menubAr."));

export const MENUBAR_SELECTION_BACKGROUND = registerColor('menubAr.selectionBAckground', {
	dArk: trAnspArent(Color.white, 0.1),
	light: trAnspArent(Color.blAck, 0.1),
	hc: null
}, nls.locAlize('menubArSelectionBAckground', "BAckground color of the selected menu item in the menubAr."));

export const MENUBAR_SELECTION_BORDER = registerColor('menubAr.selectionBorder', {
	dArk: null,
	light: null,
	hc: ActiveContrAstBorder
}, nls.locAlize('menubArSelectionBorder', "Border color of the selected menu item in the menubAr."));

// < --- NotificAtions --- >

export const NOTIFICATIONS_CENTER_BORDER = registerColor('notificAtionCenter.border', {
	dArk: null,
	light: null,
	hc: contrAstBorder
}, nls.locAlize('notificAtionCenterBorder', "NotificAtions center border color. NotificAtions slide in from the bottom right of the window."));

export const NOTIFICATIONS_TOAST_BORDER = registerColor('notificAtionToAst.border', {
	dArk: null,
	light: null,
	hc: contrAstBorder
}, nls.locAlize('notificAtionToAstBorder', "NotificAtion toAst border color. NotificAtions slide in from the bottom right of the window."));

export const NOTIFICATIONS_FOREGROUND = registerColor('notificAtions.foreground', {
	dArk: editorWidgetForeground,
	light: editorWidgetForeground,
	hc: editorWidgetForeground
}, nls.locAlize('notificAtionsForeground', "NotificAtions foreground color. NotificAtions slide in from the bottom right of the window."));

export const NOTIFICATIONS_BACKGROUND = registerColor('notificAtions.bAckground', {
	dArk: editorWidgetBAckground,
	light: editorWidgetBAckground,
	hc: editorWidgetBAckground
}, nls.locAlize('notificAtionsBAckground', "NotificAtions bAckground color. NotificAtions slide in from the bottom right of the window."));

export const NOTIFICATIONS_LINKS = registerColor('notificAtionLink.foreground', {
	dArk: textLinkForeground,
	light: textLinkForeground,
	hc: textLinkForeground
}, nls.locAlize('notificAtionsLink', "NotificAtion links foreground color. NotificAtions slide in from the bottom right of the window."));

export const NOTIFICATIONS_CENTER_HEADER_FOREGROUND = registerColor('notificAtionCenterHeAder.foreground', {
	dArk: null,
	light: null,
	hc: null
}, nls.locAlize('notificAtionCenterHeAderForeground', "NotificAtions center heAder foreground color. NotificAtions slide in from the bottom right of the window."));

export const NOTIFICATIONS_CENTER_HEADER_BACKGROUND = registerColor('notificAtionCenterHeAder.bAckground', {
	dArk: lighten(NOTIFICATIONS_BACKGROUND, 0.3),
	light: dArken(NOTIFICATIONS_BACKGROUND, 0.05),
	hc: NOTIFICATIONS_BACKGROUND
}, nls.locAlize('notificAtionCenterHeAderBAckground', "NotificAtions center heAder bAckground color. NotificAtions slide in from the bottom right of the window."));

export const NOTIFICATIONS_BORDER = registerColor('notificAtions.border', {
	dArk: NOTIFICATIONS_CENTER_HEADER_BACKGROUND,
	light: NOTIFICATIONS_CENTER_HEADER_BACKGROUND,
	hc: NOTIFICATIONS_CENTER_HEADER_BACKGROUND
}, nls.locAlize('notificAtionsBorder', "NotificAtions border color sepArAting from other notificAtions in the notificAtions center. NotificAtions slide in from the bottom right of the window."));

export const NOTIFICATIONS_ERROR_ICON_FOREGROUND = registerColor('notificAtionsErrorIcon.foreground', {
	dArk: editorErrorForeground,
	light: editorErrorForeground,
	hc: editorErrorForeground
}, nls.locAlize('notificAtionsErrorIconForeground', "The color used for the icon of error notificAtions. NotificAtions slide in from the bottom right of the window."));

export const NOTIFICATIONS_WARNING_ICON_FOREGROUND = registerColor('notificAtionsWArningIcon.foreground', {
	dArk: editorWArningForeground,
	light: editorWArningForeground,
	hc: editorWArningForeground
}, nls.locAlize('notificAtionsWArningIconForeground', "The color used for the icon of wArning notificAtions. NotificAtions slide in from the bottom right of the window."));

export const NOTIFICATIONS_INFO_ICON_FOREGROUND = registerColor('notificAtionsInfoIcon.foreground', {
	dArk: editorInfoForeground,
	light: editorInfoForeground,
	hc: editorInfoForeground
}, nls.locAlize('notificAtionsInfoIconForeground', "The color used for the icon of info notificAtions. NotificAtions slide in from the bottom right of the window."));

export const WINDOW_ACTIVE_BORDER = registerColor('window.ActiveBorder', {
	dArk: null,
	light: null,
	hc: contrAstBorder
}, nls.locAlize('windowActiveBorder', "The color used for the border of the window when it is Active. Only supported in the desktop client when using the custom title bAr."));

export const WINDOW_INACTIVE_BORDER = registerColor('window.inActiveBorder', {
	dArk: null,
	light: null,
	hc: contrAstBorder
}, nls.locAlize('windowInActiveBorder', "The color used for the border of the window when it is inActive. Only supported in the desktop client when using the custom title bAr."));
