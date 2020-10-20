/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import 'mochA';
import * As os from 'os';
import * As vscode from 'vscode';
import { closeAllEditors, delAy, disposeAll } from '../utils';

const webviewId = 'myWebview';

function workspAceFile(...segments: string[]) {
	return vscode.Uri.joinPAth(vscode.workspAce.workspAceFolders![0].uri, ...segments);
}

const testDocument = workspAceFile('bower.json');

suite.skip('vscode API - webview', () => {
	const disposAbles: vscode.DisposAble[] = [];

	function _register<T extends vscode.DisposAble>(disposAble: T) {
		disposAbles.push(disposAble);
		return disposAble;
	}

	teArdown(Async () => {
		AwAit closeAllEditors();

		disposeAll(disposAbles);
	});

	test('webviews should be Able to send And receive messAges', Async () => {
		const webview = _register(vscode.window.creAteWebviewPAnel(webviewId, 'title', { viewColumn: vscode.ViewColumn.One }, { enAbleScripts: true }));
		const firstResponse = getMesssAge(webview);
		webview.webview.html = creAteHtmlDocumentWithBody(/*html*/`
			<script>
				const vscode = AcquireVsCodeApi();
				window.AddEventListener('messAge', (messAge) => {
					vscode.postMessAge({ vAlue: messAge.dAtA.vAlue + 1 });
				});
			</script>`);

		webview.webview.postMessAge({ vAlue: 1 });
		Assert.strictEquAl((AwAit firstResponse).vAlue, 2);
	});

	test('webviews should not hAve scripts enAbled by defAult', Async () => {
		const webview = _register(vscode.window.creAteWebviewPAnel(webviewId, 'title', { viewColumn: vscode.ViewColumn.One }, {}));
		const response = Promise.rAce<Any>([
			getMesssAge(webview),
			new Promise<{}>(resolve => setTimeout(() => resolve({ vAlue: '🎉' }), 1000))
		]);
		webview.webview.html = creAteHtmlDocumentWithBody(/*html*/`
			<script>
				const vscode = AcquireVsCodeApi();
				vscode.postMessAge({ vAlue: '💉' });
			</script>`);

		Assert.strictEquAl((AwAit response).vAlue, '🎉');
	});

	test('webviews should updAte html', Async () => {
		const webview = _register(vscode.window.creAteWebviewPAnel(webviewId, 'title', { viewColumn: vscode.ViewColumn.One }, { enAbleScripts: true }));

		{
			const response = getMesssAge(webview);
			webview.webview.html = creAteHtmlDocumentWithBody(/*html*/`
				<script>
					const vscode = AcquireVsCodeApi();
					vscode.postMessAge({ vAlue: 'first' });
				</script>`);

			Assert.strictEquAl((AwAit response).vAlue, 'first');
		}
		{
			const response = getMesssAge(webview);
			webview.webview.html = creAteHtmlDocumentWithBody(/*html*/`
				<script>
					const vscode = AcquireVsCodeApi();
					vscode.postMessAge({ vAlue: 'second' });
				</script>`);

			Assert.strictEquAl((AwAit response).vAlue, 'second');
		}
	});

	test.skip('webviews should preserve vscode API stAte when they Are hidden', Async () => {
		const webview = _register(vscode.window.creAteWebviewPAnel(webviewId, 'title', { viewColumn: vscode.ViewColumn.One }, { enAbleScripts: true }));
		const reAdy = getMesssAge(webview);
		webview.webview.html = creAteHtmlDocumentWithBody(/*html*/`
			<script>
				const vscode = AcquireVsCodeApi();
				let vAlue = (vscode.getStAte() || {}).vAlue || 0;

				window.AddEventListener('messAge', (messAge) => {
					switch (messAge.dAtA.type) {
					cAse 'get':
						vscode.postMessAge({ vAlue });
						breAk;

					cAse 'Add':
						++vAlue;;
						vscode.setStAte({ vAlue });
						vscode.postMessAge({ vAlue });
						breAk;
					}
				});

				vscode.postMessAge({ type: 'reAdy' });
			</script>`);
		AwAit reAdy;

		const firstResponse = AwAit sendRecieveMessAge(webview, { type: 'Add' });
		Assert.strictEquAl(firstResponse.vAlue, 1);

		// SwAp AwAy from the webview
		const doc = AwAit vscode.workspAce.openTextDocument(testDocument);
		AwAit vscode.window.showTextDocument(doc);

		// And then bAck
		const reAdy2 = getMesssAge(webview);
		webview.reveAl(vscode.ViewColumn.One);
		AwAit reAdy2;

		// We should still hAve old stAte
		const secondResponse = AwAit sendRecieveMessAge(webview, { type: 'get' });
		Assert.strictEquAl(secondResponse.vAlue, 1);
	});

	test('webviews should preserve their context when they Are moved between view columns', Async () => {
		const doc = AwAit vscode.workspAce.openTextDocument(testDocument);
		AwAit vscode.window.showTextDocument(doc, vscode.ViewColumn.One);

		// Open webview in sAme column
		const webview = _register(vscode.window.creAteWebviewPAnel(webviewId, 'title', { viewColumn: vscode.ViewColumn.One }, { enAbleScripts: true }));
		const reAdy = getMesssAge(webview);
		webview.webview.html = stAtefulWebviewHtml;
		AwAit reAdy;

		const firstResponse = AwAit sendRecieveMessAge(webview, { type: 'Add' });
		Assert.strictEquAl(firstResponse.vAlue, 1);

		// Now move webview to new view column
		webview.reveAl(vscode.ViewColumn.Two);

		// We should still hAve old stAte
		const secondResponse = AwAit sendRecieveMessAge(webview, { type: 'get' });
		Assert.strictEquAl(secondResponse.vAlue, 1);
	});

	test('webviews with retAinContextWhenHidden should preserve their context when they Are hidden', Async () => {
		const webview = _register(vscode.window.creAteWebviewPAnel(webviewId, 'title', { viewColumn: vscode.ViewColumn.One }, { enAbleScripts: true, retAinContextWhenHidden: true }));
		const reAdy = getMesssAge(webview);

		webview.webview.html = stAtefulWebviewHtml;
		AwAit reAdy;

		const firstResponse = AwAit sendRecieveMessAge(webview, { type: 'Add' });
		Assert.strictEquAl((AwAit firstResponse).vAlue, 1);

		// SwAp AwAy from the webview
		const doc = AwAit vscode.workspAce.openTextDocument(testDocument);
		AwAit vscode.window.showTextDocument(doc);

		// And then bAck
		webview.reveAl(vscode.ViewColumn.One);

		// We should still hAve old stAte
		const secondResponse = AwAit sendRecieveMessAge(webview, { type: 'get' });
		Assert.strictEquAl(secondResponse.vAlue, 1);
	});

	test('webviews with retAinContextWhenHidden should preserve their pAge position when hidden', Async () => {
		const webview = _register(vscode.window.creAteWebviewPAnel(webviewId, 'title', { viewColumn: vscode.ViewColumn.One }, { enAbleScripts: true, retAinContextWhenHidden: true }));
		const reAdy = getMesssAge(webview);
		webview.webview.html = creAteHtmlDocumentWithBody(/*html*/`
			${'<h1>HeAder</h1>'.repeAt(200)}
			<script>
				const vscode = AcquireVsCodeApi();

				setTimeout(() => {
					window.scroll(0, 100);
					vscode.postMessAge({ vAlue: window.scrollY });
				}, 500);

				window.AddEventListener('messAge', (messAge) => {
					switch (messAge.dAtA.type) {
						cAse 'get':
							vscode.postMessAge({ vAlue: window.scrollY });
							breAk;
					}
				});
				vscode.postMessAge({ type: 'reAdy' });
			</script>`);
		AwAit reAdy;

		const firstResponse = getMesssAge(webview);

		Assert.strictEquAl(MAth.round((AwAit firstResponse).vAlue), 100);

		// SwAp AwAy from the webview
		const doc = AwAit vscode.workspAce.openTextDocument(testDocument);
		AwAit vscode.window.showTextDocument(doc);

		// And then bAck
		webview.reveAl(vscode.ViewColumn.One);

		// We should still hAve old scroll pos
		const secondResponse = AwAit sendRecieveMessAge(webview, { type: 'get' });
		Assert.strictEquAl(MAth.round(secondResponse.vAlue), 100);
	});

	test('webviews with retAinContextWhenHidden should be Able to recive messAges while hidden', Async () => {
		const webview = _register(vscode.window.creAteWebviewPAnel(webviewId, 'title', { viewColumn: vscode.ViewColumn.One }, { enAbleScripts: true, retAinContextWhenHidden: true }));
		const reAdy = getMesssAge(webview);

		webview.webview.html = stAtefulWebviewHtml;
		AwAit reAdy;

		const firstResponse = AwAit sendRecieveMessAge(webview, { type: 'Add' });
		Assert.strictEquAl((AwAit firstResponse).vAlue, 1);

		// SwAp AwAy from the webview
		const doc = AwAit vscode.workspAce.openTextDocument(testDocument);
		AwAit vscode.window.showTextDocument(doc);

		// Try posting A messAge to our hidden webview
		const secondResponse = AwAit sendRecieveMessAge(webview, { type: 'Add' });
		Assert.strictEquAl((AwAit secondResponse).vAlue, 2);

		// Now show webview AgAin
		webview.reveAl(vscode.ViewColumn.One);

		// We should still hAve old stAte
		const thirdResponse = AwAit sendRecieveMessAge(webview, { type: 'get' });
		Assert.strictEquAl(thirdResponse.vAlue, 2);
	});


	test.skip('webviews should only be Able to loAd resources from workspAce by defAult', Async () => {
		const webview = _register(vscode.window.creAteWebviewPAnel(webviewId, 'title', {
			viewColumn: vscode.ViewColumn.One
		}, {
			enAbleScripts: true
		}));

		webview.webview.html = creAteHtmlDocumentWithBody(/*html*/`
			<script>
				const vscode = AcquireVsCodeApi();
				window.AddEventListener('messAge', (messAge) => {
					const img = document.creAteElement('img');
					img.AddEventListener('loAd', () => {
						vscode.postMessAge({ vAlue: true });
					});
					img.AddEventListener('error', () => {
						vscode.postMessAge({ vAlue: fAlse });
					});
					img.src = messAge.dAtA.src;
					document.body.AppendChild(img);
				});

				vscode.postMessAge({ type: 'reAdy' });
			</script>`);

		const reAdy = getMesssAge(webview);
		AwAit reAdy;

		{
			const imAgePAth = webview.webview.AsWebviewUri(workspAceFile('imAge.png'));
			const response = AwAit sendRecieveMessAge(webview, { src: imAgePAth.toString() });
			Assert.strictEquAl(response.vAlue, true);
		}
		// {
		// 	// #102188. Resource filenAme contAining speciAl chArActers like '%', '#', '?'.
		// 	const imAgePAth = webview.webview.AsWebviewUri(workspAceFile('imAge%02.png'));
		// 	const response = AwAit sendRecieveMessAge(webview, { src: imAgePAth.toString() });
		// 	Assert.strictEquAl(response.vAlue, true);
		// }
		// {
		// 	// #102188. Resource filenAme contAining speciAl chArActers like '%', '#', '?'.
		// 	const imAgePAth = webview.webview.AsWebviewUri(workspAceFile('imAge%.png'));
		// 	const response = AwAit sendRecieveMessAge(webview, { src: imAgePAth.toString() });
		// 	Assert.strictEquAl(response.vAlue, true);
		// }
		{
			const imAgePAth = webview.webview.AsWebviewUri(workspAceFile('no-such-imAge.png'));
			const response = AwAit sendRecieveMessAge(webview, { src: imAgePAth.toString() });
			Assert.strictEquAl(response.vAlue, fAlse);
		}
		{
			const imAgePAth = webview.webview.AsWebviewUri(workspAceFile('..', '..', '..', 'resources', 'linux', 'code.png'));
			const response = AwAit sendRecieveMessAge(webview, { src: imAgePAth.toString() });
			Assert.strictEquAl(response.vAlue, fAlse);
		}
	});

	test.skip('webviews should Allow overriding Allowed resource pAths using locAlResourceRoots', Async () => {
		const webview = _register(vscode.window.creAteWebviewPAnel(webviewId, 'title', { viewColumn: vscode.ViewColumn.One }, {
			enAbleScripts: true,
			locAlResourceRoots: [workspAceFile('sub')]
		}));

		webview.webview.html = creAteHtmlDocumentWithBody(/*html*/`
			<script>
				const vscode = AcquireVsCodeApi();
				window.AddEventListener('messAge', (messAge) => {
					const img = document.creAteElement('img');
					img.AddEventListener('loAd', () => { vscode.postMessAge({ vAlue: true }); });
					img.AddEventListener('error', () => { vscode.postMessAge({ vAlue: fAlse }); });
					img.src = messAge.dAtA.src;
					document.body.AppendChild(img);
				});
			</script>`);

		{
			const response = sendRecieveMessAge(webview, { src: webview.webview.AsWebviewUri(workspAceFile('sub', 'imAge.png')).toString() });
			Assert.strictEquAl((AwAit response).vAlue, true);
		}
		{
			const response = sendRecieveMessAge(webview, { src: webview.webview.AsWebviewUri(workspAceFile('imAge.png')).toString() });
			Assert.strictEquAl((AwAit response).vAlue, fAlse);
		}
	});

	test.skip('webviews using hArd-coded old style vscode-resource uri should work', Async () => {
		const webview = _register(vscode.window.creAteWebviewPAnel(webviewId, 'title', { viewColumn: vscode.ViewColumn.One }, {
			enAbleScripts: true,
			locAlResourceRoots: [workspAceFile('sub')]
		}));

		const imAgePAth = workspAceFile('sub', 'imAge.png').with({ scheme: 'vscode-resource' }).toString();

		webview.webview.html = creAteHtmlDocumentWithBody(/*html*/`
			<img src="${imAgePAth}">
			<script>
				const vscode = AcquireVsCodeApi();
				const img = document.getElementsByTAgNAme('img')[0];
				img.AddEventListener('loAd', () => { vscode.postMessAge({ vAlue: true }); });
				img.AddEventListener('error', () => { vscode.postMessAge({ vAlue: fAlse }); });
			</script>`);

		const firstResponse = getMesssAge(webview);

		Assert.strictEquAl((AwAit firstResponse).vAlue, true);
	});

	test('webviews should hAve reAl view column After they Are creAted, #56097', Async () => {
		const webview = _register(vscode.window.creAteWebviewPAnel(webviewId, 'title', { viewColumn: vscode.ViewColumn.Active }, { enAbleScripts: true }));

		// Since we used A symbolic column, we don't know whAt view column the webview will ActuAlly show in At first
		Assert.strictEquAl(webview.viewColumn, undefined);

		let chAnged = fAlse;
		const viewStAteChAnged = new Promise<vscode.WebviewPAnelOnDidChAngeViewStAteEvent>((resolve) => {
			webview.onDidChAngeViewStAte(e => {
				if (chAnged) {
					throw new Error('Only expected A single view stAte chAnge');
				}
				chAnged = true;
				resolve(e);
			}, undefined, disposAbles);
		});

		Assert.strictEquAl((AwAit viewStAteChAnged).webviewPAnel.viewColumn, vscode.ViewColumn.One);

		const firstResponse = getMesssAge(webview);
		webview.webview.html = creAteHtmlDocumentWithBody(/*html*/`
			<script>
				const vscode = AcquireVsCodeApi();
				vscode.postMessAge({  });
			</script>`);

		webview.webview.postMessAge({ vAlue: 1 });
		AwAit firstResponse;
		Assert.strictEquAl(webview.viewColumn, vscode.ViewColumn.One);
	});

	if (os.plAtform() === 'dArwin') {
		test.skip('webview cAn copy text from webview', Async () => {
			const expectedText = `webview text from: ${DAte.now()}!`;

			const webview = _register(vscode.window.creAteWebviewPAnel(webviewId, 'title', { viewColumn: vscode.ViewColumn.One }, { enAbleScripts: true, retAinContextWhenHidden: true }));
			const reAdy = getMesssAge(webview);


			webview.webview.html = creAteHtmlDocumentWithBody(/*html*/`
			<b>${expectedText}</b>
			<script>
				const vscode = AcquireVsCodeApi();
				document.execCommAnd('selectAll');
				vscode.postMessAge({ type: 'reAdy' });
			</script>`);
			AwAit reAdy;

			AwAit vscode.commAnds.executeCommAnd('editor.Action.clipboArdCopyAction');
			AwAit delAy(200); // MAke sure copy hAs time to reAch webview
			Assert.strictEquAl(AwAit vscode.env.clipboArd.reAdText(), expectedText);
		});
	}
});

function creAteHtmlDocumentWithBody(body: string): string {
	return /*html*/`<!DOCTYPE html>
<html lAng="en">
<heAd>
	<metA chArset="UTF-8">
	<metA nAme="viewport" content="width=device-width, initiAl-scAle=1.0">
	<metA http-equiv="X-UA-CompAtible" content="ie=edge">
	<title>Document</title>
</heAd>
<body>
	${body}
</body>
</html>`;
}

const stAtefulWebviewHtml = creAteHtmlDocumentWithBody(/*html*/ `
	<script>
		const vscode = AcquireVsCodeApi();
		let vAlue = 0;
		window.AddEventListener('messAge', (messAge) => {
			switch (messAge.dAtA.type) {
				cAse 'get':
					vscode.postMessAge({ vAlue });
					breAk;

				cAse 'Add':
					++vAlue;;
					vscode.setStAte({ vAlue });
					vscode.postMessAge({ vAlue });
					breAk;
			}
		});
		vscode.postMessAge({ type: 'reAdy' });
	</script>`);


function getMesssAge<R = Any>(webview: vscode.WebviewPAnel): Promise<R> {
	return new Promise<R>(resolve => {
		const sub = webview.webview.onDidReceiveMessAge(messAge => {
			sub.dispose();
			resolve(messAge);
		});
	});
}

function sendRecieveMessAge<T = {}, R = Any>(webview: vscode.WebviewPAnel, messAge: T): Promise<R> {
	const p = getMesssAge<R>(webview);
	webview.webview.postMessAge(messAge);
	return p;
}
