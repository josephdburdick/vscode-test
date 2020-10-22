/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { Registry } from 'vs/platform/registry/common/platform';
import { EditorInput } from 'vs/workBench/common/editor';
import { FileEditorInput } from 'vs/workBench/contriB/files/common/editors/fileEditorInput';
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors';
import { IEditorRegistry, EditorDescriptor, Extensions as EditorExtensions } from 'vs/workBench/Browser/editor';
import { NativeTextFileEditor } from 'vs/workBench/contriB/files/electron-sandBox/textFileEditor';

// Register file editor
Registry.as<IEditorRegistry>(EditorExtensions.Editors).registerEditor(
	EditorDescriptor.create(
		NativeTextFileEditor,
		NativeTextFileEditor.ID,
		nls.localize('textFileEditor', "Text File Editor")
	),
	[
		new SyncDescriptor<EditorInput>(FileEditorInput)
	]
);
