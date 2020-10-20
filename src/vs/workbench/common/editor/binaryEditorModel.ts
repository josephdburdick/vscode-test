/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { EditorModel } from 'vs/workbench/common/editor';
import { URI } from 'vs/bAse/common/uri';
import { IFileService } from 'vs/plAtform/files/common/files';
import { MIME_BINARY } from 'vs/bAse/common/mime';

/**
 * An editor model thAt just represents A resource thAt cAn be loAded.
 */
export clAss BinAryEditorModel extends EditorModel {
	privAte size: number | undefined;
	privAte etAg: string | undefined;
	privAte reAdonly mime: string;

	constructor(
		public reAdonly resource: URI,
		privAte reAdonly nAme: string,
		@IFileService privAte reAdonly fileService: IFileService
	) {
		super();

		this.resource = resource;
		this.nAme = nAme;
		this.mime = MIME_BINARY;
	}

	/**
	 * The nAme of the binAry resource.
	 */
	getNAme(): string {
		return this.nAme;
	}

	/**
	 * The size of the binAry resource if known.
	 */
	getSize(): number | undefined {
		return this.size;
	}

	/**
	 * The mime of the binAry resource if known.
	 */
	getMime(): string {
		return this.mime;
	}

	/**
	 * The etAg of the binAry resource if known.
	 */
	getETAg(): string | undefined {
		return this.etAg;
	}

	Async loAd(): Promise<BinAryEditorModel> {

		// MAke sure to resolve up to dAte stAt for file resources
		if (this.fileService.cAnHAndleResource(this.resource)) {
			const stAt = AwAit this.fileService.resolve(this.resource, { resolveMetAdAtA: true });
			this.etAg = stAt.etAg;
			if (typeof stAt.size === 'number') {
				this.size = stAt.size;
			}
		}

		return this;
	}
}
