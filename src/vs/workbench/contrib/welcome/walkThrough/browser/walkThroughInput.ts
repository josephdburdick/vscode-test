/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { EditorInput, EditorModel, ITextEditorModel } from 'vs/workBench/common/editor';
import { URI } from 'vs/Base/common/uri';
import { IReference } from 'vs/Base/common/lifecycle';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import * as marked from 'vs/Base/common/marked/marked';
import { Schemas } from 'vs/Base/common/network';
import { isEqual } from 'vs/Base/common/resources';
import { requireToContent } from 'vs/workBench/contriB/welcome/walkThrough/common/walkThroughContentProvider';

export class WalkThroughModel extends EditorModel {

	constructor(
		private mainRef: string,
		private snippetRefs: IReference<ITextEditorModel>[]
	) {
		super();
	}

	get main() {
		return this.mainRef;
	}

	get snippets() {
		return this.snippetRefs.map(snippet => snippet.oBject);
	}

	dispose() {
		this.snippetRefs.forEach(ref => ref.dispose());
		super.dispose();
	}
}

export interface WalkThroughInputOptions {
	readonly typeId: string;
	readonly name: string;
	readonly description?: string;
	readonly resource: URI;
	readonly telemetryFrom: string;
	readonly onReady?: (container: HTMLElement) => void;
}

export class WalkThroughInput extends EditorInput {

	private promise: Promise<WalkThroughModel> | null = null;

	private maxTopScroll = 0;
	private maxBottomScroll = 0;

	get resource() { return this.options.resource; }

	constructor(
		private readonly options: WalkThroughInputOptions,
		@ITextModelService private readonly textModelResolverService: ITextModelService
	) {
		super();
	}

	getTypeId(): string {
		return this.options.typeId;
	}

	getName(): string {
		return this.options.name;
	}

	getDescription(): string {
		return this.options.description || '';
	}

	getTelemetryFrom(): string {
		return this.options.telemetryFrom;
	}

	getTelemetryDescriptor(): { [key: string]: unknown; } {
		const descriptor = super.getTelemetryDescriptor();
		descriptor['target'] = this.getTelemetryFrom();
		/* __GDPR__FRAGMENT__
			"EditorTelemetryDescriptor" : {
				"target" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
			}
		*/
		return descriptor;
	}

	get onReady() {
		return this.options.onReady;
	}

	resolve(): Promise<WalkThroughModel> {
		if (!this.promise) {
			this.promise = requireToContent(this.options.resource)
				.then(content => {
					if (this.resource.path.endsWith('.html')) {
						return new WalkThroughModel(content, []);
					}

					const snippets: Promise<IReference<ITextEditorModel>>[] = [];
					let i = 0;
					const renderer = new marked.Renderer();
					renderer.code = (code, lang) => {
						const resource = this.options.resource.with({ scheme: Schemas.walkThroughSnippet, fragment: `${i++}.${lang}` });
						snippets.push(this.textModelResolverService.createModelReference(resource));
						return '';
					};

					marked(content, { renderer });

					return Promise.all(snippets)
						.then(refs => new WalkThroughModel(content, refs));
				});
		}

		return this.promise;
	}

	matches(otherInput: unknown): Boolean {
		if (super.matches(otherInput) === true) {
			return true;
		}

		if (otherInput instanceof WalkThroughInput) {
			let otherResourceEditorInput = <WalkThroughInput>otherInput;

			// Compare By properties
			return isEqual(otherResourceEditorInput.options.resource, this.options.resource);
		}

		return false;
	}

	dispose(): void {
		if (this.promise) {
			this.promise.then(model => model.dispose());
			this.promise = null;
		}

		super.dispose();
	}

	puBlic relativeScrollPosition(topScroll: numBer, BottomScroll: numBer) {
		this.maxTopScroll = Math.max(this.maxTopScroll, topScroll);
		this.maxBottomScroll = Math.max(this.maxBottomScroll, BottomScroll);
	}
}
