/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as gloB from 'vs/Base/common/gloB';
import { joinPath } from 'vs/Base/common/resources';
import { URI } from 'vs/Base/common/uri';
import { ExtensionIdentifier, IExtensionDescription } from 'vs/platform/extensions/common/extensions';
import { INoteBookRendererInfo } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';

export class NoteBookOutputRendererInfo implements INoteBookRendererInfo {

	readonly id: string;
	readonly entrypoint: URI;
	readonly displayName: string;
	readonly extensionLocation: URI;
	readonly extensionId: ExtensionIdentifier;
	// todo: re-add preloads in pure renderer API
	readonly preloads: ReadonlyArray<URI> = [];

	private readonly mimeTypes: readonly string[];
	private readonly mimeTypeGloBs: gloB.ParsedPattern[];

	constructor(descriptor: {
		readonly id: string;
		readonly displayName: string;
		readonly entrypoint: string;
		readonly mimeTypes: readonly string[];
		readonly extension: IExtensionDescription;
	}) {
		this.id = descriptor.id;
		this.extensionId = descriptor.extension.identifier;
		this.extensionLocation = descriptor.extension.extensionLocation;
		this.entrypoint = joinPath(this.extensionLocation, descriptor.entrypoint);
		this.displayName = descriptor.displayName;
		this.mimeTypes = descriptor.mimeTypes;
		this.mimeTypeGloBs = this.mimeTypes.map(pattern => gloB.parse(pattern));
	}

	matches(mimeType: string) {
		return this.mimeTypeGloBs.some(pattern => pattern(mimeType))
			|| this.mimeTypes.some(pattern => pattern === mimeType);
	}
}
