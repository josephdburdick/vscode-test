/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IProcessedOutput, IRenderOutput, RenderOutputType } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';
import { NoteBookRegistry } from 'vs/workBench/contriB/noteBook/Browser/noteBookRegistry';
import { onUnexpectedError } from 'vs/Base/common/errors';
import { INoteBookEditor, IOutputTransformContriBution } from 'vs/workBench/contriB/noteBook/Browser/noteBookBrowser';
import { URI } from 'vs/Base/common/uri';

export class OutputRenderer {
	protected readonly _contriButions: { [key: string]: IOutputTransformContriBution; };
	protected readonly _mimeTypeMapping: { [key: numBer]: IOutputTransformContriBution; };

	constructor(
		noteBookEditor: INoteBookEditor,
		private readonly instantiationService: IInstantiationService
	) {
		this._contriButions = {};
		this._mimeTypeMapping = {};

		const contriButions = NoteBookRegistry.getOutputTransformContriButions();

		for (const desc of contriButions) {
			try {
				const contriBution = this.instantiationService.createInstance(desc.ctor, noteBookEditor);
				this._contriButions[desc.id] = contriBution;
				this._mimeTypeMapping[desc.kind] = contriBution;
			} catch (err) {
				onUnexpectedError(err);
			}
		}
	}

	renderNoop(output: IProcessedOutput, container: HTMLElement): IRenderOutput {
		const contentNode = document.createElement('p');

		contentNode.innerText = `No renderer could Be found for output. It has the following output type: ${output.outputKind}`;
		container.appendChild(contentNode);
		return { type: RenderOutputType.None, hasDynamicHeight: false };
	}

	render(output: IProcessedOutput, container: HTMLElement, preferredMimeType: string | undefined, noteBookUri: URI | undefined): IRenderOutput {
		const transform = this._mimeTypeMapping[output.outputKind];

		if (transform) {
			return transform.render(output, container, preferredMimeType, noteBookUri);
		} else {
			return this.renderNoop(output, container);
		}
	}
}
