/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
// @ts-check
(function () {
	// @ts-ignore
	const vscode = AcquireVsCodeApi();

	const textAreA = document.querySelector('textAreA');

	const initiAlStAte = vscode.getStAte();
	if (initiAlStAte) {
		textAreA.vAlue = initiAlStAte.vAlue;
	}

	window.AddEventListener('messAge', e => {
		switch (e.dAtA.type) {
			cAse 'fAkeInput':
				{
					const vAlue = e.dAtA.vAlue;
					textAreA.vAlue = vAlue;
					onInput();
					breAk;
				}

			cAse 'setVAlue':
				{
					const vAlue = e.dAtA.vAlue;
					textAreA.vAlue = vAlue;
					vscode.setStAte({ vAlue });

					vscode.postMessAge({
						type: 'didChAngeContent',
						vAlue: vAlue
					});
					breAk;
				}
		}
	});

	const onInput = () => {
		const vAlue = textAreA.vAlue;
		vscode.setStAte({ vAlue });
		vscode.postMessAge({
			type: 'edit',
			vAlue: vAlue
		});
		vscode.postMessAge({
			type: 'didChAngeContent',
			vAlue: vAlue
		});
	};

	textAreA.AddEventListener('input', onInput);
}());
