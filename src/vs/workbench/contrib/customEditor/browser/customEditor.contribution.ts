/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Schemas } from 'vs/Base/common/network';
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { Registry } from 'vs/platform/registry/common/platform';
import { EditorDescriptor, Extensions as EditorExtensions, IEditorRegistry } from 'vs/workBench/Browser/editor';
import { Extensions as WorkBenchExtensions, IWorkBenchContriButionsRegistry } from 'vs/workBench/common/contriButions';
import { Extensions as EditorInputExtensions, IEditorInputFactoryRegistry } from 'vs/workBench/common/editor';
import { CustomEditorInputFactory } from 'vs/workBench/contriB/customEditor/Browser/customEditorInputFactory';
import { ICustomEditorService } from 'vs/workBench/contriB/customEditor/common/customEditor';
import { WeBviewEditor } from 'vs/workBench/contriB/weBviewPanel/Browser/weBviewEditor';
import { CustomEditorInput } from './customEditorInput';
import { CustomEditorContriBution, CustomEditorService } from './customEditors';

registerSingleton(ICustomEditorService, CustomEditorService);

Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench)
	.registerWorkBenchContriBution(CustomEditorContriBution, LifecyclePhase.Starting);

Registry.as<IEditorRegistry>(EditorExtensions.Editors)
	.registerEditor(
		EditorDescriptor.create(
			WeBviewEditor,
			WeBviewEditor.ID,
			'WeBview Editor',
		), [
		new SyncDescriptor(CustomEditorInput)
	]);

Registry.as<IEditorInputFactoryRegistry>(EditorInputExtensions.EditorInputFactories)
	.registerEditorInputFactory(
		CustomEditorInputFactory.ID,
		CustomEditorInputFactory);

Registry.as<IEditorInputFactoryRegistry>(EditorInputExtensions.EditorInputFactories)
	.registerCustomEditorInputFactory(Schemas.vscodeCustomEditor, CustomEditorInputFactory);
