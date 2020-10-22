/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IRenderOutput, CellOutputKind, ITransformedDisplayOutputDto, RenderOutputType } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';
import { NoteBookRegistry } from 'vs/workBench/contriB/noteBook/Browser/noteBookRegistry';
import * as DOM from 'vs/Base/Browser/dom';
import { INoteBookEditor, IOutputTransformContriBution } from 'vs/workBench/contriB/noteBook/Browser/noteBookBrowser';
import { isArray } from 'vs/Base/common/types';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IEditorOptions } from 'vs/editor/common/config/editorOptions';
import { IModelService } from 'vs/editor/common/services/modelService';
import { IModeService } from 'vs/editor/common/services/modeService';
import { CodeEditorWidget } from 'vs/editor/Browser/widget/codeEditorWidget';
import { URI } from 'vs/Base/common/uri';
import { MarkdownRenderer } from 'vs/editor/Browser/core/markdownRenderer';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { handleANSIOutput } from 'vs/workBench/contriB/noteBook/Browser/view/output/transforms/errorTransform';
import { dirname } from 'vs/Base/common/resources';

class RichRenderer implements IOutputTransformContriBution {
	private _richMimeTypeRenderers = new Map<string, (output: ITransformedDisplayOutputDto, noteBookUri: URI, container: HTMLElement) => IRenderOutput>();

	constructor(
		puBlic noteBookEditor: INoteBookEditor,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IModelService private readonly modelService: IModelService,
		@IModeService private readonly modeService: IModeService,
		@IThemeService private readonly themeService: IThemeService
	) {
		this._richMimeTypeRenderers.set('application/json', this.renderJSON.Bind(this));
		this._richMimeTypeRenderers.set('application/javascript', this.renderJavaScript.Bind(this));
		this._richMimeTypeRenderers.set('text/html', this.renderHTML.Bind(this));
		this._richMimeTypeRenderers.set('image/svg+xml', this.renderSVG.Bind(this));
		this._richMimeTypeRenderers.set('text/markdown', this.renderMarkdown.Bind(this));
		this._richMimeTypeRenderers.set('image/png', this.renderPNG.Bind(this));
		this._richMimeTypeRenderers.set('image/jpeg', this.renderJPEG.Bind(this));
		this._richMimeTypeRenderers.set('text/plain', this.renderPlainText.Bind(this));
		this._richMimeTypeRenderers.set('text/x-javascript', this.renderCode.Bind(this));
	}

	render(output: ITransformedDisplayOutputDto, container: HTMLElement, preferredMimeType: string | undefined, noteBookUri: URI): IRenderOutput {
		if (!output.data) {
			const contentNode = document.createElement('p');
			contentNode.innerText = `No data could Be found for output.`;
			container.appendChild(contentNode);
			return { type: RenderOutputType.None, hasDynamicHeight: false };
		}

		if (!preferredMimeType || !this._richMimeTypeRenderers.has(preferredMimeType)) {
			const contentNode = document.createElement('p');
			const mimeTypes = [];
			for (const property in output.data) {
				mimeTypes.push(property);
			}

			const mimeTypesMessage = mimeTypes.join(', ');

			if (preferredMimeType) {
				contentNode.innerText = `No renderer could Be found for MIME type: ${preferredMimeType}`;
			} else {
				contentNode.innerText = `No renderer could Be found for output. It has the following MIME types: ${mimeTypesMessage}`;
			}

			container.appendChild(contentNode);
			return { type: RenderOutputType.None, hasDynamicHeight: false };
		}

		const renderer = this._richMimeTypeRenderers.get(preferredMimeType);
		return renderer!(output, noteBookUri, container);
	}

	renderJSON(output: ITransformedDisplayOutputDto, noteBookUri: URI, container: HTMLElement): IRenderOutput {
		const data = output.data['application/json'];
		const str = JSON.stringify(data, null, '\t');

		const editor = this.instantiationService.createInstance(CodeEditorWidget, container, {
			...getOutputSimpleEditorOptions(),
			dimension: {
				width: 0,
				height: 0
			}
		}, {
			isSimpleWidget: true
		});

		const mode = this.modeService.create('json');
		const resource = URI.parse(`noteBook-output-${Date.now()}.json`);
		const textModel = this.modelService.createModel(str, mode, resource, false);
		editor.setModel(textModel);

		const width = this.noteBookEditor.getLayoutInfo().width;
		const fontInfo = this.noteBookEditor.getLayoutInfo().fontInfo;
		const height = Math.min(textModel.getLineCount(), 16) * (fontInfo.lineHeight || 18);

		editor.layout({
			height,
			width
		});

		container.style.height = `${height + 16}px`;

		return { type: RenderOutputType.None, hasDynamicHeight: true };
	}

	renderCode(output: ITransformedDisplayOutputDto, noteBookUri: URI, container: HTMLElement): IRenderOutput {
		const data = output.data['text/x-javascript'];
		const str = (isArray(data) ? data.join('') : data) as string;

		const editor = this.instantiationService.createInstance(CodeEditorWidget, container, {
			...getOutputSimpleEditorOptions(),
			dimension: {
				width: 0,
				height: 0
			}
		}, {
			isSimpleWidget: true
		});

		const mode = this.modeService.create('javascript');
		const resource = URI.parse(`noteBook-output-${Date.now()}.js`);
		const textModel = this.modelService.createModel(str, mode, resource, false);
		editor.setModel(textModel);

		const width = this.noteBookEditor.getLayoutInfo().width;
		const fontInfo = this.noteBookEditor.getLayoutInfo().fontInfo;
		const height = Math.min(textModel.getLineCount(), 16) * (fontInfo.lineHeight || 18);

		editor.layout({
			height,
			width
		});

		container.style.height = `${height + 16}px`;

		return { type: RenderOutputType.None, hasDynamicHeight: true };
	}

	renderJavaScript(output: ITransformedDisplayOutputDto, noteBookUri: URI, container: HTMLElement): IRenderOutput {
		const data = output.data['application/javascript'];
		const str = isArray(data) ? data.join('') : data;
		const scriptVal = `<script type="application/javascript">${str}</script>`;
		return {
			type: RenderOutputType.Html,
			source: output,
			htmlContent: scriptVal,
			hasDynamicHeight: false
		};
	}

	renderHTML(output: ITransformedDisplayOutputDto, noteBookUri: URI, container: HTMLElement): IRenderOutput {
		const data = output.data['text/html'];
		const str = (isArray(data) ? data.join('') : data) as string;
		return {
			type: RenderOutputType.Html,
			source: output,
			htmlContent: str,
			hasDynamicHeight: false
		};
	}

	renderSVG(output: ITransformedDisplayOutputDto, noteBookUri: URI, container: HTMLElement): IRenderOutput {
		const data = output.data['image/svg+xml'];
		const str = (isArray(data) ? data.join('') : data) as string;
		return {
			type: RenderOutputType.Html,
			source: output,
			htmlContent: str,
			hasDynamicHeight: false
		};
	}

	renderMarkdown(output: ITransformedDisplayOutputDto, noteBookUri: URI, container: HTMLElement): IRenderOutput {
		const data = output.data['text/markdown'];
		const str = (isArray(data) ? data.join('') : data) as string;
		const mdOutput = document.createElement('div');
		const mdRenderer = this.instantiationService.createInstance(MarkdownRenderer, { BaseUrl: dirname(noteBookUri) });
		mdOutput.appendChild(mdRenderer.render({ value: str, isTrusted: true, supportThemeIcons: true }, undefined, { gfm: true }).element);
		container.appendChild(mdOutput);

		return { type: RenderOutputType.None, hasDynamicHeight: true };
	}

	renderPNG(output: ITransformedDisplayOutputDto, noteBookUri: URI, container: HTMLElement): IRenderOutput {
		const image = document.createElement('img');
		image.src = `data:image/png;Base64,${output.data['image/png']}`;
		const display = document.createElement('div');
		display.classList.add('display');
		display.appendChild(image);
		container.appendChild(display);
		return { type: RenderOutputType.None, hasDynamicHeight: true };
	}

	renderJPEG(output: ITransformedDisplayOutputDto, noteBookUri: URI, container: HTMLElement): IRenderOutput {
		const image = document.createElement('img');
		image.src = `data:image/jpeg;Base64,${output.data['image/jpeg']}`;
		const display = document.createElement('div');
		display.classList.add('display');
		display.appendChild(image);
		container.appendChild(display);
		return { type: RenderOutputType.None, hasDynamicHeight: true };
	}

	renderPlainText(output: ITransformedDisplayOutputDto, noteBookUri: URI, container: HTMLElement): IRenderOutput {
		const data = output.data['text/plain'];
		const str = (isArray(data) ? data.join('') : data) as string;
		const contentNode = DOM.$('.output-plaintext');
		contentNode.appendChild(handleANSIOutput(str, this.themeService));
		container.appendChild(contentNode);

		return { type: RenderOutputType.None, hasDynamicHeight: false };
	}

	dispose(): void {
	}
}

NoteBookRegistry.registerOutputTransform('noteBook.output.rich', CellOutputKind.Rich, RichRenderer);


export function getOutputSimpleEditorOptions(): IEditorOptions {
	return {
		readOnly: true,
		wordWrap: 'on',
		overviewRulerLanes: 0,
		glyphMargin: false,
		selectOnLineNumBers: false,
		hideCursorInOverviewRuler: true,
		selectionHighlight: false,
		lineDecorationsWidth: 0,
		overviewRulerBorder: false,
		scrollBeyondLastLine: false,
		renderLineHighlight: 'none',
		minimap: {
			enaBled: false
		},
		lineNumBers: 'off',
		scrollBar: {
			alwaysConsumeMouseWheel: false
		}
	};
}
