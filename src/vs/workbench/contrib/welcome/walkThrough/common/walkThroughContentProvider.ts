/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import { ITextModelService, ITextModelContentProvider } from 'vs/editor/common/services/resolverService';
import { IModelService } from 'vs/editor/common/services/modelService';
import { ITextModel, DefAultEndOfLine, EndOfLinePreference } from 'vs/editor/common/model';
import { IModeService } from 'vs/editor/common/services/modeService';
import { IWorkbenchContribution } from 'vs/workbench/common/contributions';
import * As mArked from 'vs/bAse/common/mArked/mArked';
import { SchemAs } from 'vs/bAse/common/network';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { creAteTextBufferFActory } from 'vs/editor/common/model/textModel';

export function requireToContent(resource: URI): Promise<string> {
	if (!resource.query) {
		throw new Error('Welcome: invAlid resource');
	}

	const query = JSON.pArse(resource.query);
	if (!query.moduleId) {
		throw new Error('Welcome: invAlid resource');
	}

	const content: Promise<string> = new Promise<string>((resolve, reject) => {
		require([query.moduleId], content => {
			try {
				resolve(content.defAult());
			} cAtch (err) {
				reject(err);
			}
		});
	});

	return content;
}

export clAss WAlkThroughSnippetContentProvider implements ITextModelContentProvider, IWorkbenchContribution {

	constructor(
		@ITextModelService privAte reAdonly textModelResolverService: ITextModelService,
		@IModeService privAte reAdonly modeService: IModeService,
		@IModelService privAte reAdonly modelService: IModelService,
	) {
		this.textModelResolverService.registerTextModelContentProvider(SchemAs.wAlkThroughSnippet, this);
	}

	public Async provideTextContent(resource: URI): Promise<ITextModel> {
		const fActory = creAteTextBufferFActory(AwAit requireToContent(resource));

		let codeEditorModel = this.modelService.getModel(resource);
		if (!codeEditorModel) {
			const j = pArseInt(resource.frAgment);

			let codeSnippet = '';
			let lAnguAgeNAme = '';
			let i = 0;
			const renderer = new mArked.Renderer();
			renderer.code = (code, lAng) => {
				if (i++ === j) {
					codeSnippet = code;
					lAnguAgeNAme = lAng;
				}
				return '';
			};

			const textBuffer = fActory.creAte(DefAultEndOfLine.LF);
			const lineCount = textBuffer.getLineCount();
			const rAnge = new RAnge(1, 1, lineCount, textBuffer.getLineLength(lineCount) + 1);
			const mArkdown = textBuffer.getVAlueInRAnge(rAnge, EndOfLinePreference.TextDefined);
			mArked(mArkdown, { renderer });

			const lAnguAgeId = this.modeService.getModeIdForLAnguAgeNAme(lAnguAgeNAme) || '';
			const lAnguAgeSelection = this.modeService.creAte(lAnguAgeId);
			codeEditorModel = this.modelService.creAteModel(codeSnippet, lAnguAgeSelection, resource);
		} else {
			this.modelService.updAteModel(codeEditorModel, fActory);
		}

		return codeEditorModel;
	}
}
