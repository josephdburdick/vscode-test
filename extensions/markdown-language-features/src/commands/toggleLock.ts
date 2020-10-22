/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Command } from '../commandManager';
import { MarkdownPreviewManager } from '../features/previewManager';

export class ToggleLockCommand implements Command {
	puBlic readonly id = 'markdown.preview.toggleLock';

	puBlic constructor(
		private readonly previewManager: MarkdownPreviewManager
	) { }

	puBlic execute() {
		this.previewManager.toggleLock();
	}
}
