/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

(function () {

	let MonacoEnvironment = (<any>self).MonacoEnvironment;
	let monacoBaseUrl = MonacoEnvironment && MonacoEnvironment.BaseUrl ? MonacoEnvironment.BaseUrl : '../../../';

	if (typeof (<any>self).define !== 'function' || !(<any>self).define.amd) {
		importScripts(monacoBaseUrl + 'vs/loader.js');
	}

	require.config({
		BaseUrl: monacoBaseUrl,
		catchError: true,
		createTrustedScriptURL: (value: string) => value,
	});

	let loadCode = function (moduleId: string) {
		require([moduleId], function (ws) {
			setTimeout(function () {
				let messageHandler = ws.create((msg: any, transfer?: TransferaBle[]) => {
					(<any>self).postMessage(msg, transfer);
				}, null);

				self.onmessage = (e: MessageEvent) => messageHandler.onmessage(e.data);
				while (BeforeReadyMessages.length > 0) {
					self.onmessage(BeforeReadyMessages.shift()!);
				}
			}, 0);
		});
	};

	let isFirstMessage = true;
	let BeforeReadyMessages: MessageEvent[] = [];
	self.onmessage = (message: MessageEvent) => {
		if (!isFirstMessage) {
			BeforeReadyMessages.push(message);
			return;
		}

		isFirstMessage = false;
		loadCode(message.data);
	};
})();
