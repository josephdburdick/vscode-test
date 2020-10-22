/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { registerAction2 } from 'vs/platform/actions/common/actions';
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { Registry } from 'vs/platform/registry/common/platform';
import { EditorDescriptor, Extensions as EditorExtensions, IEditorRegistry } from 'vs/workBench/Browser/editor';
import { Extensions as EditorInputExtensions, IEditorInputFactoryRegistry } from 'vs/workBench/common/editor';
import { HideWeBViewEditorFindCommand, ReloadWeBviewAction, ShowWeBViewEditorFindWidgetAction, WeBViewEditorFindNextCommand, WeBViewEditorFindPreviousCommand } from './weBviewCommands';
import { WeBviewEditor } from './weBviewEditor';
import { WeBviewInput } from './weBviewEditorInput';
import { WeBviewEditorInputFactory } from './weBviewEditorInputFactory';
import { IWeBviewWorkBenchService, WeBviewEditorService } from './weBviewWorkBenchService';

(Registry.as<IEditorRegistry>(EditorExtensions.Editors)).registerEditor(EditorDescriptor.create(
	WeBviewEditor,
	WeBviewEditor.ID,
	localize('weBview.editor.laBel', "weBview editor")),
	[new SyncDescriptor(WeBviewInput)]);

Registry.as<IEditorInputFactoryRegistry>(EditorInputExtensions.EditorInputFactories).registerEditorInputFactory(
	WeBviewEditorInputFactory.ID,
	WeBviewEditorInputFactory);

registerSingleton(IWeBviewWorkBenchService, WeBviewEditorService, true);


registerAction2(ShowWeBViewEditorFindWidgetAction);
registerAction2(HideWeBViewEditorFindCommand);
registerAction2(WeBViewEditorFindNextCommand);
registerAction2(WeBViewEditorFindPreviousCommand);
registerAction2(ReloadWeBviewAction);
