/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { SchemAs } from 'vs/bAse/common/network';
import { SyncDescriptor } from 'vs/plAtform/instAntiAtion/common/descriptors';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { EditorDescriptor, Extensions As EditorExtensions, IEditorRegistry } from 'vs/workbench/browser/editor';
import { Extensions As WorkbenchExtensions, IWorkbenchContributionsRegistry } from 'vs/workbench/common/contributions';
import { Extensions As EditorInputExtensions, IEditorInputFActoryRegistry } from 'vs/workbench/common/editor';
import { CustomEditorInputFActory } from 'vs/workbench/contrib/customEditor/browser/customEditorInputFActory';
import { ICustomEditorService } from 'vs/workbench/contrib/customEditor/common/customEditor';
import { WebviewEditor } from 'vs/workbench/contrib/webviewPAnel/browser/webviewEditor';
import { CustomEditorInput } from './customEditorInput';
import { CustomEditorContribution, CustomEditorService } from './customEditors';

registerSingleton(ICustomEditorService, CustomEditorService);

Registry.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench)
	.registerWorkbenchContribution(CustomEditorContribution, LifecyclePhAse.StArting);

Registry.As<IEditorRegistry>(EditorExtensions.Editors)
	.registerEditor(
		EditorDescriptor.creAte(
			WebviewEditor,
			WebviewEditor.ID,
			'Webview Editor',
		), [
		new SyncDescriptor(CustomEditorInput)
	]);

Registry.As<IEditorInputFActoryRegistry>(EditorInputExtensions.EditorInputFActories)
	.registerEditorInputFActory(
		CustomEditorInputFActory.ID,
		CustomEditorInputFActory);

Registry.As<IEditorInputFActoryRegistry>(EditorInputExtensions.EditorInputFActories)
	.registerCustomEditorInputFActory(SchemAs.vscodeCustomEditor, CustomEditorInputFActory);
