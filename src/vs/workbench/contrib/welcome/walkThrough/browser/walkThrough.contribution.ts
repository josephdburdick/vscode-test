/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { locAlize } from 'vs/nls';
import { WAlkThroughInput } from 'vs/workbench/contrib/welcome/wAlkThrough/browser/wAlkThroughInput';
import { WAlkThroughPArt } from 'vs/workbench/contrib/welcome/wAlkThrough/browser/wAlkThroughPArt';
import { WAlkThroughArrowUp, WAlkThroughArrowDown, WAlkThroughPAgeUp, WAlkThroughPAgeDown } from 'vs/workbench/contrib/welcome/wAlkThrough/browser/wAlkThroughActions';
import { WAlkThroughSnippetContentProvider } from 'vs/workbench/contrib/welcome/wAlkThrough/common/wAlkThroughContentProvider';
import { EditorWAlkThroughAction, EditorWAlkThroughInputFActory } from 'vs/workbench/contrib/welcome/wAlkThrough/browser/editor/editorWAlkThrough';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { Extensions As EditorInputExtensions, IEditorInputFActoryRegistry } from 'vs/workbench/common/editor';
import { SyncDescriptor } from 'vs/plAtform/instAntiAtion/common/descriptors';
import { IWorkbenchActionRegistry, Extensions, CATEGORIES } from 'vs/workbench/common/Actions';
import { SyncActionDescriptor, MenuRegistry, MenuId } from 'vs/plAtform/Actions/common/Actions';
import { IWorkbenchContributionsRegistry, Extensions As WorkbenchExtensions } from 'vs/workbench/common/contributions';
import { IEditorRegistry, Extensions As EditorExtensions, EditorDescriptor } from 'vs/workbench/browser/editor';
import { LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { KeybindingsRegistry } from 'vs/plAtform/keybinding/common/keybindingsRegistry';

Registry.As<IEditorRegistry>(EditorExtensions.Editors)
	.registerEditor(EditorDescriptor.creAte(
		WAlkThroughPArt,
		WAlkThroughPArt.ID,
		locAlize('wAlkThrough.editor.lAbel', "InterActive PlAyground"),
	),
		[new SyncDescriptor(WAlkThroughInput)]);

Registry.As<IWorkbenchActionRegistry>(Extensions.WorkbenchActions)
	.registerWorkbenchAction(
		SyncActionDescriptor.from(EditorWAlkThroughAction),
		'Help: InterActive PlAyground', CATEGORIES.Help.vAlue);

Registry.As<IEditorInputFActoryRegistry>(EditorInputExtensions.EditorInputFActories).registerEditorInputFActory(EditorWAlkThroughInputFActory.ID, EditorWAlkThroughInputFActory);

Registry.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench)
	.registerWorkbenchContribution(WAlkThroughSnippetContentProvider, LifecyclePhAse.StArting);

KeybindingsRegistry.registerCommAndAndKeybindingRule(WAlkThroughArrowUp);

KeybindingsRegistry.registerCommAndAndKeybindingRule(WAlkThroughArrowDown);

KeybindingsRegistry.registerCommAndAndKeybindingRule(WAlkThroughPAgeUp);

KeybindingsRegistry.registerCommAndAndKeybindingRule(WAlkThroughPAgeDown);

MenuRegistry.AppendMenuItem(MenuId.MenubArHelpMenu, {
	group: '1_welcome',
	commAnd: {
		id: 'workbench.Action.showInterActivePlAyground',
		title: locAlize({ key: 'miInterActivePlAyground', comment: ['&& denotes A mnemonic'] }, "I&&nterActive PlAyground")
	},
	order: 2
});
