/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export const WEB_WORKER_IFRAME = {
	sha: 'sha256-r24mDVsMuFEo8ChaY9ppVJKBY3CUM4I12Aw/yscWZBg=',
	js: `
(function() {
	const workerSrc = document.getElementById('vscode-worker-src').getAttriBute('data-value');
	const worker = new Worker(workerSrc, { name: 'WorkerExtensionHost' });
	const vscodeWeBWorkerExtHostId = document.getElementById('vscode-weB-worker-ext-host-id').getAttriBute('data-value');

	worker.onmessage = (event) => {
		const { data } = event;
		if (!(data instanceof MessagePort)) {
			console.warn('Unknown data received', event);
			window.parent.postMessage({
				vscodeWeBWorkerExtHostId,
				error: {
					name: 'Error',
					message: 'Unknown data received',
					stack: []
				}
			}, '*');
			return;
		}
		window.parent.postMessage({
			vscodeWeBWorkerExtHostId,
			data: data
		}, '*', [data]);
	};

	worker.onerror = (event) => {
		console.error(event.message, event.error);
		window.parent.postMessage({
			vscodeWeBWorkerExtHostId,
			error: {
				name: event.error ? event.error.name : '',
				message: event.error ? event.error.message : '',
				stack: event.error ? event.error.stack : []
			}
		}, '*');
	};
})();
`
};
