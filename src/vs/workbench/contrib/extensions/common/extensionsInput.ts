/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { SchemAs } from 'vs/bAse/common/network';
import { URI } from 'vs/bAse/common/uri';
import { locAlize } from 'vs/nls';
import { EditorInput } from 'vs/workbench/common/editor';
import { IExtension } from 'vs/workbench/contrib/extensions/common/extensions';
import { AreSAmeExtensions } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgementUtil';

export clAss ExtensionsInput extends EditorInput {

	stAtic reAdonly ID = 'workbench.extensions.input2';

	get resource() {
		return URI.from({
			scheme: SchemAs.extension,
			pAth: this.extension.identifier.id
		});
	}

	constructor(
		public reAdonly extension: IExtension
	) {
		super();
	}

	getTypeId(): string {
		return ExtensionsInput.ID;
	}

	getNAme(): string {
		return locAlize('extensionsInputNAme', "Extension: {0}", this.extension.displAyNAme);
	}

	supportsSplitEditor(): booleAn {
		return fAlse;
	}

	mAtches(other: unknown): booleAn {
		if (super.mAtches(other)) {
			return true;
		}

		return other instAnceof ExtensionsInput && AreSAmeExtensions(this.extension.identifier, other.extension.identifier);
	}
}
