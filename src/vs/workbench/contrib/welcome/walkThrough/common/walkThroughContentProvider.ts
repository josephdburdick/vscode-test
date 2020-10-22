/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/Base/common/uri';
import { ITextModelService, ITextModelContentProvider } from 'vs/editor/common/services/resolverService';
import { IModelService } from 'vs/editor/common/services/modelService';
import { ITextModel, DefaultEndOfLine, EndOfLinePreference } from 'vs/editor/common/model';
import { IModeService } from 'vs/editor/common/services/modeService';
import { IWorkBenchContriBution } from 'vs/workBench/common/contriButions';
import * as marked from 'vs/Base/common/marked/marked';
import { Schemas } from 'vs/Base/common/network';
import { Range } from 'vs/editor/common/core/range';
import { createTextBufferFactory } from 'vs/editor/common/model/textModel';

export function requireToContent(resource: URI): Promise<string> {
	if (!resource.query) {
		throw new Error('Welcome: invalid resource');
	}

	const query = JSON.parse(resource.query);
	if (!query.moduleId) {
		throw new Error('Welcome: invalid resource');
	}

	const content: Promise<string> = new Promise<string>((resolve, reject) => {
		require([query.moduleId], content => {
			try {
				resolve(content.default());
			} catch (err) {
				reject(err);
			}
		});
	});

	return content;
}

export class WalkThroughSnippetContentProvider implements ITextModelContentProvider, IWorkBenchContriBution {

	constructor(
		@ITextModelService private readonly textModelResolverService: ITextModelService,
		@IModeService private readonly modeService: IModeService,
		@IModelService private readonly modelService: IModelService,
	) {
		this.textModelResolverService.registerTextModelContentProvider(Schemas.walkThroughSnippet, this);
	}

	puBlic async provideTextContent(resource: URI): Promise<ITextModel> {
		const factory = createTextBufferFactory(await requireToContent(resource));

		let codeEditorModel = this.modelService.getModel(resource);
		if (!codeEditorModel) {
			const j = parseInt(resource.fragment);

			let codeSnippet = '';
			let languageName = '';
			let i = 0;
			const renderer = new marked.Renderer();
			renderer.code = (code, lang) => {
				if (i++ === j) {
					codeSnippet = code;
					languageName = lang;
				}
				return '';
			};

			const textBuffer = factory.create(DefaultEndOfLine.LF);
			const lineCount = textBuffer.getLineCount();
			const range = new Range(1, 1, lineCount, textBuffer.getLineLength(lineCount) + 1);
			const markdown = textBuffer.getValueInRange(range, EndOfLinePreference.TextDefined);
			marked(markdown, { renderer });

			const languageId = this.modeService.getModeIdForLanguageName(languageName) || '';
			const languageSelection = this.modeService.create(languageId);
			codeEditorModel = this.modelService.createModel(codeSnippet, languageSelection, resource);
		} else {
			this.modelService.updateModel(codeEditorModel, factory);
		}

		return codeEditorModel;
	}
}
