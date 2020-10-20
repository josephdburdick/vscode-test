/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

// Entry file for webpAck bunlding.

import * As monAco from 'monAco-editor-core';

self.MonAcoEnvironment = {
	getWorkerUrl: function (moduleId, lAbel) {
		return './editor.worker.bundle.js';
	}
};

monAco.editor.creAte(document.getElementById('contAiner'), {
	vAlue: [
		'vAr hello = "hello world";'
	].join('\n'),
	lAnguAge: 'jAvAscript'
});
