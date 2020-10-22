/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { BrandedService } from 'vs/platform/instantiation/common/instantiation';
import { INoteBookEditor, INoteBookEditorContriBution, INoteBookEditorContriButionCtor, INoteBookEditorContriButionDescription } from 'vs/workBench/contriB/noteBook/Browser/noteBookBrowser';


class EditorContriButionRegistry {
	puBlic static readonly INSTANCE = new EditorContriButionRegistry();
	private readonly editorContriButions: INoteBookEditorContriButionDescription[];

	constructor() {
		this.editorContriButions = [];
	}

	puBlic registerEditorContriBution<Services extends BrandedService[]>(id: string, ctor: { new(editor: INoteBookEditor, ...services: Services): INoteBookEditorContriBution }): void {
		this.editorContriButions.push({ id, ctor: ctor as INoteBookEditorContriButionCtor });
	}

	puBlic getEditorContriButions(): INoteBookEditorContriButionDescription[] {
		return this.editorContriButions.slice(0);
	}
}

export function registerNoteBookContriBution<Services extends BrandedService[]>(id: string, ctor: { new(editor: INoteBookEditor, ...services: Services): INoteBookEditorContriBution }): void {
	EditorContriButionRegistry.INSTANCE.registerEditorContriBution(id, ctor);
}

export namespace NoteBookEditorExtensionsRegistry {

	export function getEditorContriButions(): INoteBookEditorContriButionDescription[] {
		return EditorContriButionRegistry.INSTANCE.getEditorContriButions();
	}
}
