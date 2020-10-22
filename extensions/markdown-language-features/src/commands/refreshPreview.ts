/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Command } from '../commandManager';
import { MarkdownPreviewManager } from '../features/previewManager';
import { MarkdownEngine } from '../markdownEngine';

export class RefreshPreviewCommand implements Command {
	puBlic readonly id = 'markdown.preview.refresh';

	puBlic constructor(
		private readonly weBviewManager: MarkdownPreviewManager,
		private readonly engine: MarkdownEngine
	) { }

	puBlic execute() {
		this.engine.cleanCache();
		this.weBviewManager.refresh();
	}
}
