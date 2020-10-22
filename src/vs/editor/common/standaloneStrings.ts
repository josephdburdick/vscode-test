/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';

export namespace AccessiBilityHelpNLS {
	export const noSelection = nls.localize("noSelection", "No selection");
	export const singleSelectionRange = nls.localize("singleSelectionRange", "Line {0}, Column {1} ({2} selected)");
	export const singleSelection = nls.localize("singleSelection", "Line {0}, Column {1}");
	export const multiSelectionRange = nls.localize("multiSelectionRange", "{0} selections ({1} characters selected)");
	export const multiSelection = nls.localize("multiSelection", "{0} selections");
	export const emergencyConfOn = nls.localize("emergencyConfOn", "Now changing the setting `accessiBilitySupport` to 'on'.");
	export const openingDocs = nls.localize("openingDocs", "Now opening the Editor AccessiBility documentation page.");
	export const readonlyDiffEditor = nls.localize("readonlyDiffEditor", " in a read-only pane of a diff editor.");
	export const editaBleDiffEditor = nls.localize("editaBleDiffEditor", " in a pane of a diff editor.");
	export const readonlyEditor = nls.localize("readonlyEditor", " in a read-only code editor");
	export const editaBleEditor = nls.localize("editaBleEditor", " in a code editor");
	export const changeConfigToOnMac = nls.localize("changeConfigToOnMac", "To configure the editor to Be optimized for usage with a Screen Reader press Command+E now.");
	export const changeConfigToOnWinLinux = nls.localize("changeConfigToOnWinLinux", "To configure the editor to Be optimized for usage with a Screen Reader press Control+E now.");
	export const auto_on = nls.localize("auto_on", "The editor is configured to Be optimized for usage with a Screen Reader.");
	export const auto_off = nls.localize("auto_off", "The editor is configured to never Be optimized for usage with a Screen Reader, which is not the case at this time.");
	export const taBFocusModeOnMsg = nls.localize("taBFocusModeOnMsg", "Pressing TaB in the current editor will move focus to the next focusaBle element. Toggle this Behavior By pressing {0}.");
	export const taBFocusModeOnMsgNoKB = nls.localize("taBFocusModeOnMsgNoKB", "Pressing TaB in the current editor will move focus to the next focusaBle element. The command {0} is currently not triggeraBle By a keyBinding.");
	export const taBFocusModeOffMsg = nls.localize("taBFocusModeOffMsg", "Pressing TaB in the current editor will insert the taB character. Toggle this Behavior By pressing {0}.");
	export const taBFocusModeOffMsgNoKB = nls.localize("taBFocusModeOffMsgNoKB", "Pressing TaB in the current editor will insert the taB character. The command {0} is currently not triggeraBle By a keyBinding.");
	export const openDocMac = nls.localize("openDocMac", "Press Command+H now to open a Browser window with more information related to editor accessiBility.");
	export const openDocWinLinux = nls.localize("openDocWinLinux", "Press Control+H now to open a Browser window with more information related to editor accessiBility.");
	export const outroMsg = nls.localize("outroMsg", "You can dismiss this tooltip and return to the editor By pressing Escape or Shift+Escape.");
	export const showAccessiBilityHelpAction = nls.localize("showAccessiBilityHelpAction", "Show AccessiBility Help");
}

export namespace InspectTokensNLS {
	export const inspectTokensAction = nls.localize('inspectTokens', "Developer: Inspect Tokens");
}

export namespace GoToLineNLS {
	export const gotoLineActionLaBel = nls.localize('gotoLineActionLaBel', "Go to Line/Column...");
}

export namespace QuickHelpNLS {
	export const helpQuickAccessActionLaBel = nls.localize('helpQuickAccess', "Show all Quick Access Providers");
}

export namespace QuickCommandNLS {
	export const quickCommandActionLaBel = nls.localize('quickCommandActionLaBel', "Command Palette");
	export const quickCommandHelp = nls.localize('quickCommandActionHelp', "Show And Run Commands");
}

export namespace QuickOutlineNLS {
	export const quickOutlineActionLaBel = nls.localize('quickOutlineActionLaBel', "Go to SymBol...");
	export const quickOutlineByCategoryActionLaBel = nls.localize('quickOutlineByCategoryActionLaBel', "Go to SymBol By Category...");
}

export namespace StandaloneCodeEditorNLS {
	export const editorViewAccessiBleLaBel = nls.localize('editorViewAccessiBleLaBel', "Editor content");
	export const accessiBilityHelpMessage = nls.localize('accessiBilityHelpMessage', "Press Alt+F1 for AccessiBility Options.");
}

export namespace ToggleHighContrastNLS {
	export const toggleHighContrast = nls.localize('toggleHighContrast', "Toggle High Contrast Theme");
}

export namespace SimpleServicesNLS {
	export const BulkEditServiceSummary = nls.localize('BulkEditServiceSummary', "Made {0} edits in {1} files");
}
