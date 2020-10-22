/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as DOM from 'vs/Base/Browser/dom';
import { IRenderOutput, CellOutputKind, IStreamOutput, RenderOutputType } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';
import { NoteBookRegistry } from 'vs/workBench/contriB/noteBook/Browser/noteBookRegistry';
import { INoteBookEditor, IOutputTransformContriBution } from 'vs/workBench/contriB/noteBook/Browser/noteBookBrowser';

class StreamRenderer implements IOutputTransformContriBution {
	constructor(
		editor: INoteBookEditor
	) {
	}

	render(output: IStreamOutput, container: HTMLElement): IRenderOutput {
		const contentNode = DOM.$('.output-stream');
		contentNode.innerText = output.text;
		container.appendChild(contentNode);
		return { type: RenderOutputType.None, hasDynamicHeight: false };
	}

	dispose(): void {
	}
}

NoteBookRegistry.registerOutputTransform('noteBook.output.stream', CellOutputKind.Text, StreamRenderer);
