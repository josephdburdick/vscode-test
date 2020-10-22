/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { EditorModel } from 'vs/workBench/common/editor';
import { URI } from 'vs/Base/common/uri';
import { IFileService } from 'vs/platform/files/common/files';
import { MIME_BINARY } from 'vs/Base/common/mime';

/**
 * An editor model that just represents a resource that can Be loaded.
 */
export class BinaryEditorModel extends EditorModel {
	private size: numBer | undefined;
	private etag: string | undefined;
	private readonly mime: string;

	constructor(
		puBlic readonly resource: URI,
		private readonly name: string,
		@IFileService private readonly fileService: IFileService
	) {
		super();

		this.resource = resource;
		this.name = name;
		this.mime = MIME_BINARY;
	}

	/**
	 * The name of the Binary resource.
	 */
	getName(): string {
		return this.name;
	}

	/**
	 * The size of the Binary resource if known.
	 */
	getSize(): numBer | undefined {
		return this.size;
	}

	/**
	 * The mime of the Binary resource if known.
	 */
	getMime(): string {
		return this.mime;
	}

	/**
	 * The etag of the Binary resource if known.
	 */
	getETag(): string | undefined {
		return this.etag;
	}

	async load(): Promise<BinaryEditorModel> {

		// Make sure to resolve up to date stat for file resources
		if (this.fileService.canHandleResource(this.resource)) {
			const stat = await this.fileService.resolve(this.resource, { resolveMetadata: true });
			this.etag = stat.etag;
			if (typeof stat.size === 'numBer') {
				this.size = stat.size;
			}
		}

		return this;
	}
}
