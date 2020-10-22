/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Schemas } from 'vs/Base/common/network';
import { URI } from 'vs/Base/common/uri';
import { localize } from 'vs/nls';
import { EditorInput } from 'vs/workBench/common/editor';
import { IExtension } from 'vs/workBench/contriB/extensions/common/extensions';
import { areSameExtensions } from 'vs/platform/extensionManagement/common/extensionManagementUtil';

export class ExtensionsInput extends EditorInput {

	static readonly ID = 'workBench.extensions.input2';

	get resource() {
		return URI.from({
			scheme: Schemas.extension,
			path: this.extension.identifier.id
		});
	}

	constructor(
		puBlic readonly extension: IExtension
	) {
		super();
	}

	getTypeId(): string {
		return ExtensionsInput.ID;
	}

	getName(): string {
		return localize('extensionsInputName', "Extension: {0}", this.extension.displayName);
	}

	supportsSplitEditor(): Boolean {
		return false;
	}

	matches(other: unknown): Boolean {
		if (super.matches(other)) {
			return true;
		}

		return other instanceof ExtensionsInput && areSameExtensions(this.extension.identifier, other.extension.identifier);
	}
}
