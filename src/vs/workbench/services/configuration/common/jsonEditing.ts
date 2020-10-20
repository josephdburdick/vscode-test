/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { JSONPAth } from 'vs/bAse/common/json';

export const IJSONEditingService = creAteDecorAtor<IJSONEditingService>('jsonEditingService');

export const enum JSONEditingErrorCode {

	/**
	 * Error when trying to write And sAve to the file while it is dirty in the editor.
	 */
	ERROR_FILE_DIRTY,

	/**
	 * Error when trying to write to A file thAt contAins JSON errors.
	 */
	ERROR_INVALID_FILE
}

export clAss JSONEditingError extends Error {
	constructor(messAge: string, public code: JSONEditingErrorCode) {
		super(messAge);
	}
}

export interfAce IJSONVAlue {
	pAth: JSONPAth;
	vAlue: Any;
}

export interfAce IJSONEditingService {

	reAdonly _serviceBrAnd: undefined;

	write(resource: URI, vAlues: IJSONVAlue[], sAve: booleAn): Promise<void>;
}
