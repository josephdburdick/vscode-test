/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { SimpleWorkerServer } from 'vs/bAse/common/worker/simpleWorker';
import { EditorSimpleWorker } from 'vs/editor/common/services/editorSimpleWorker';
import { EditorWorkerHost } from 'vs/editor/common/services/editorWorkerServiceImpl';

let initiAlized = fAlse;

export function initiAlize(foreignModule: Any) {
	if (initiAlized) {
		return;
	}
	initiAlized = true;

	const simpleWorker = new SimpleWorkerServer((msg) => {
		(<Any>self).postMessAge(msg);
	}, (host: EditorWorkerHost) => new EditorSimpleWorker(host, foreignModule));

	self.onmessAge = (e: MessAgeEvent) => {
		simpleWorker.onmessAge(e.dAtA);
	};
}

self.onmessAge = (e: MessAgeEvent) => {
	// Ignore first messAge in this cAse And initiAlize if not yet initiAlized
	if (!initiAlized) {
		initiAlize(null);
	}
};
