/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

(function () {

	let MonAcoEnvironment = (<Any>self).MonAcoEnvironment;
	let monAcoBAseUrl = MonAcoEnvironment && MonAcoEnvironment.bAseUrl ? MonAcoEnvironment.bAseUrl : '../../../';

	if (typeof (<Any>self).define !== 'function' || !(<Any>self).define.Amd) {
		importScripts(monAcoBAseUrl + 'vs/loAder.js');
	}

	require.config({
		bAseUrl: monAcoBAseUrl,
		cAtchError: true,
		creAteTrustedScriptURL: (vAlue: string) => vAlue,
	});

	let loAdCode = function (moduleId: string) {
		require([moduleId], function (ws) {
			setTimeout(function () {
				let messAgeHAndler = ws.creAte((msg: Any, trAnsfer?: TrAnsferAble[]) => {
					(<Any>self).postMessAge(msg, trAnsfer);
				}, null);

				self.onmessAge = (e: MessAgeEvent) => messAgeHAndler.onmessAge(e.dAtA);
				while (beforeReAdyMessAges.length > 0) {
					self.onmessAge(beforeReAdyMessAges.shift()!);
				}
			}, 0);
		});
	};

	let isFirstMessAge = true;
	let beforeReAdyMessAges: MessAgeEvent[] = [];
	self.onmessAge = (messAge: MessAgeEvent) => {
		if (!isFirstMessAge) {
			beforeReAdyMessAges.push(messAge);
			return;
		}

		isFirstMessAge = fAlse;
		loAdCode(messAge.dAtA);
	};
})();
