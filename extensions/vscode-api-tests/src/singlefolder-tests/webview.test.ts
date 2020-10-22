/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import 'mocha';
import * as os from 'os';
import * as vscode from 'vscode';
import { closeAllEditors, delay, disposeAll } from '../utils';

const weBviewId = 'myWeBview';

function workspaceFile(...segments: string[]) {
	return vscode.Uri.joinPath(vscode.workspace.workspaceFolders![0].uri, ...segments);
}

const testDocument = workspaceFile('Bower.json');

suite.skip('vscode API - weBview', () => {
	const disposaBles: vscode.DisposaBle[] = [];

	function _register<T extends vscode.DisposaBle>(disposaBle: T) {
		disposaBles.push(disposaBle);
		return disposaBle;
	}

	teardown(async () => {
		await closeAllEditors();

		disposeAll(disposaBles);
	});

	test('weBviews should Be aBle to send and receive messages', async () => {
		const weBview = _register(vscode.window.createWeBviewPanel(weBviewId, 'title', { viewColumn: vscode.ViewColumn.One }, { enaBleScripts: true }));
		const firstResponse = getMesssage(weBview);
		weBview.weBview.html = createHtmlDocumentWithBody(/*html*/`
			<script>
				const vscode = acquireVsCodeApi();
				window.addEventListener('message', (message) => {
					vscode.postMessage({ value: message.data.value + 1 });
				});
			</script>`);

		weBview.weBview.postMessage({ value: 1 });
		assert.strictEqual((await firstResponse).value, 2);
	});

	test('weBviews should not have scripts enaBled By default', async () => {
		const weBview = _register(vscode.window.createWeBviewPanel(weBviewId, 'title', { viewColumn: vscode.ViewColumn.One }, {}));
		const response = Promise.race<any>([
			getMesssage(weBview),
			new Promise<{}>(resolve => setTimeout(() => resolve({ value: '🎉' }), 1000))
		]);
		weBview.weBview.html = createHtmlDocumentWithBody(/*html*/`
			<script>
				const vscode = acquireVsCodeApi();
				vscode.postMessage({ value: '💉' });
			</script>`);

		assert.strictEqual((await response).value, '🎉');
	});

	test('weBviews should update html', async () => {
		const weBview = _register(vscode.window.createWeBviewPanel(weBviewId, 'title', { viewColumn: vscode.ViewColumn.One }, { enaBleScripts: true }));

		{
			const response = getMesssage(weBview);
			weBview.weBview.html = createHtmlDocumentWithBody(/*html*/`
				<script>
					const vscode = acquireVsCodeApi();
					vscode.postMessage({ value: 'first' });
				</script>`);

			assert.strictEqual((await response).value, 'first');
		}
		{
			const response = getMesssage(weBview);
			weBview.weBview.html = createHtmlDocumentWithBody(/*html*/`
				<script>
					const vscode = acquireVsCodeApi();
					vscode.postMessage({ value: 'second' });
				</script>`);

			assert.strictEqual((await response).value, 'second');
		}
	});

	test.skip('weBviews should preserve vscode API state when they are hidden', async () => {
		const weBview = _register(vscode.window.createWeBviewPanel(weBviewId, 'title', { viewColumn: vscode.ViewColumn.One }, { enaBleScripts: true }));
		const ready = getMesssage(weBview);
		weBview.weBview.html = createHtmlDocumentWithBody(/*html*/`
			<script>
				const vscode = acquireVsCodeApi();
				let value = (vscode.getState() || {}).value || 0;

				window.addEventListener('message', (message) => {
					switch (message.data.type) {
					case 'get':
						vscode.postMessage({ value });
						Break;

					case 'add':
						++value;;
						vscode.setState({ value });
						vscode.postMessage({ value });
						Break;
					}
				});

				vscode.postMessage({ type: 'ready' });
			</script>`);
		await ready;

		const firstResponse = await sendRecieveMessage(weBview, { type: 'add' });
		assert.strictEqual(firstResponse.value, 1);

		// Swap away from the weBview
		const doc = await vscode.workspace.openTextDocument(testDocument);
		await vscode.window.showTextDocument(doc);

		// And then Back
		const ready2 = getMesssage(weBview);
		weBview.reveal(vscode.ViewColumn.One);
		await ready2;

		// We should still have old state
		const secondResponse = await sendRecieveMessage(weBview, { type: 'get' });
		assert.strictEqual(secondResponse.value, 1);
	});

	test('weBviews should preserve their context when they are moved Between view columns', async () => {
		const doc = await vscode.workspace.openTextDocument(testDocument);
		await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);

		// Open weBview in same column
		const weBview = _register(vscode.window.createWeBviewPanel(weBviewId, 'title', { viewColumn: vscode.ViewColumn.One }, { enaBleScripts: true }));
		const ready = getMesssage(weBview);
		weBview.weBview.html = statefulWeBviewHtml;
		await ready;

		const firstResponse = await sendRecieveMessage(weBview, { type: 'add' });
		assert.strictEqual(firstResponse.value, 1);

		// Now move weBview to new view column
		weBview.reveal(vscode.ViewColumn.Two);

		// We should still have old state
		const secondResponse = await sendRecieveMessage(weBview, { type: 'get' });
		assert.strictEqual(secondResponse.value, 1);
	});

	test('weBviews with retainContextWhenHidden should preserve their context when they are hidden', async () => {
		const weBview = _register(vscode.window.createWeBviewPanel(weBviewId, 'title', { viewColumn: vscode.ViewColumn.One }, { enaBleScripts: true, retainContextWhenHidden: true }));
		const ready = getMesssage(weBview);

		weBview.weBview.html = statefulWeBviewHtml;
		await ready;

		const firstResponse = await sendRecieveMessage(weBview, { type: 'add' });
		assert.strictEqual((await firstResponse).value, 1);

		// Swap away from the weBview
		const doc = await vscode.workspace.openTextDocument(testDocument);
		await vscode.window.showTextDocument(doc);

		// And then Back
		weBview.reveal(vscode.ViewColumn.One);

		// We should still have old state
		const secondResponse = await sendRecieveMessage(weBview, { type: 'get' });
		assert.strictEqual(secondResponse.value, 1);
	});

	test('weBviews with retainContextWhenHidden should preserve their page position when hidden', async () => {
		const weBview = _register(vscode.window.createWeBviewPanel(weBviewId, 'title', { viewColumn: vscode.ViewColumn.One }, { enaBleScripts: true, retainContextWhenHidden: true }));
		const ready = getMesssage(weBview);
		weBview.weBview.html = createHtmlDocumentWithBody(/*html*/`
			${'<h1>Header</h1>'.repeat(200)}
			<script>
				const vscode = acquireVsCodeApi();

				setTimeout(() => {
					window.scroll(0, 100);
					vscode.postMessage({ value: window.scrollY });
				}, 500);

				window.addEventListener('message', (message) => {
					switch (message.data.type) {
						case 'get':
							vscode.postMessage({ value: window.scrollY });
							Break;
					}
				});
				vscode.postMessage({ type: 'ready' });
			</script>`);
		await ready;

		const firstResponse = getMesssage(weBview);

		assert.strictEqual(Math.round((await firstResponse).value), 100);

		// Swap away from the weBview
		const doc = await vscode.workspace.openTextDocument(testDocument);
		await vscode.window.showTextDocument(doc);

		// And then Back
		weBview.reveal(vscode.ViewColumn.One);

		// We should still have old scroll pos
		const secondResponse = await sendRecieveMessage(weBview, { type: 'get' });
		assert.strictEqual(Math.round(secondResponse.value), 100);
	});

	test('weBviews with retainContextWhenHidden should Be aBle to recive messages while hidden', async () => {
		const weBview = _register(vscode.window.createWeBviewPanel(weBviewId, 'title', { viewColumn: vscode.ViewColumn.One }, { enaBleScripts: true, retainContextWhenHidden: true }));
		const ready = getMesssage(weBview);

		weBview.weBview.html = statefulWeBviewHtml;
		await ready;

		const firstResponse = await sendRecieveMessage(weBview, { type: 'add' });
		assert.strictEqual((await firstResponse).value, 1);

		// Swap away from the weBview
		const doc = await vscode.workspace.openTextDocument(testDocument);
		await vscode.window.showTextDocument(doc);

		// Try posting a message to our hidden weBview
		const secondResponse = await sendRecieveMessage(weBview, { type: 'add' });
		assert.strictEqual((await secondResponse).value, 2);

		// Now show weBview again
		weBview.reveal(vscode.ViewColumn.One);

		// We should still have old state
		const thirdResponse = await sendRecieveMessage(weBview, { type: 'get' });
		assert.strictEqual(thirdResponse.value, 2);
	});


	test.skip('weBviews should only Be aBle to load resources from workspace By default', async () => {
		const weBview = _register(vscode.window.createWeBviewPanel(weBviewId, 'title', {
			viewColumn: vscode.ViewColumn.One
		}, {
			enaBleScripts: true
		}));

		weBview.weBview.html = createHtmlDocumentWithBody(/*html*/`
			<script>
				const vscode = acquireVsCodeApi();
				window.addEventListener('message', (message) => {
					const img = document.createElement('img');
					img.addEventListener('load', () => {
						vscode.postMessage({ value: true });
					});
					img.addEventListener('error', () => {
						vscode.postMessage({ value: false });
					});
					img.src = message.data.src;
					document.Body.appendChild(img);
				});

				vscode.postMessage({ type: 'ready' });
			</script>`);

		const ready = getMesssage(weBview);
		await ready;

		{
			const imagePath = weBview.weBview.asWeBviewUri(workspaceFile('image.png'));
			const response = await sendRecieveMessage(weBview, { src: imagePath.toString() });
			assert.strictEqual(response.value, true);
		}
		// {
		// 	// #102188. Resource filename containing special characters like '%', '#', '?'.
		// 	const imagePath = weBview.weBview.asWeBviewUri(workspaceFile('image%02.png'));
		// 	const response = await sendRecieveMessage(weBview, { src: imagePath.toString() });
		// 	assert.strictEqual(response.value, true);
		// }
		// {
		// 	// #102188. Resource filename containing special characters like '%', '#', '?'.
		// 	const imagePath = weBview.weBview.asWeBviewUri(workspaceFile('image%.png'));
		// 	const response = await sendRecieveMessage(weBview, { src: imagePath.toString() });
		// 	assert.strictEqual(response.value, true);
		// }
		{
			const imagePath = weBview.weBview.asWeBviewUri(workspaceFile('no-such-image.png'));
			const response = await sendRecieveMessage(weBview, { src: imagePath.toString() });
			assert.strictEqual(response.value, false);
		}
		{
			const imagePath = weBview.weBview.asWeBviewUri(workspaceFile('..', '..', '..', 'resources', 'linux', 'code.png'));
			const response = await sendRecieveMessage(weBview, { src: imagePath.toString() });
			assert.strictEqual(response.value, false);
		}
	});

	test.skip('weBviews should allow overriding allowed resource paths using localResourceRoots', async () => {
		const weBview = _register(vscode.window.createWeBviewPanel(weBviewId, 'title', { viewColumn: vscode.ViewColumn.One }, {
			enaBleScripts: true,
			localResourceRoots: [workspaceFile('suB')]
		}));

		weBview.weBview.html = createHtmlDocumentWithBody(/*html*/`
			<script>
				const vscode = acquireVsCodeApi();
				window.addEventListener('message', (message) => {
					const img = document.createElement('img');
					img.addEventListener('load', () => { vscode.postMessage({ value: true }); });
					img.addEventListener('error', () => { vscode.postMessage({ value: false }); });
					img.src = message.data.src;
					document.Body.appendChild(img);
				});
			</script>`);

		{
			const response = sendRecieveMessage(weBview, { src: weBview.weBview.asWeBviewUri(workspaceFile('suB', 'image.png')).toString() });
			assert.strictEqual((await response).value, true);
		}
		{
			const response = sendRecieveMessage(weBview, { src: weBview.weBview.asWeBviewUri(workspaceFile('image.png')).toString() });
			assert.strictEqual((await response).value, false);
		}
	});

	test.skip('weBviews using hard-coded old style vscode-resource uri should work', async () => {
		const weBview = _register(vscode.window.createWeBviewPanel(weBviewId, 'title', { viewColumn: vscode.ViewColumn.One }, {
			enaBleScripts: true,
			localResourceRoots: [workspaceFile('suB')]
		}));

		const imagePath = workspaceFile('suB', 'image.png').with({ scheme: 'vscode-resource' }).toString();

		weBview.weBview.html = createHtmlDocumentWithBody(/*html*/`
			<img src="${imagePath}">
			<script>
				const vscode = acquireVsCodeApi();
				const img = document.getElementsByTagName('img')[0];
				img.addEventListener('load', () => { vscode.postMessage({ value: true }); });
				img.addEventListener('error', () => { vscode.postMessage({ value: false }); });
			</script>`);

		const firstResponse = getMesssage(weBview);

		assert.strictEqual((await firstResponse).value, true);
	});

	test('weBviews should have real view column after they are created, #56097', async () => {
		const weBview = _register(vscode.window.createWeBviewPanel(weBviewId, 'title', { viewColumn: vscode.ViewColumn.Active }, { enaBleScripts: true }));

		// Since we used a symBolic column, we don't know what view column the weBview will actually show in at first
		assert.strictEqual(weBview.viewColumn, undefined);

		let changed = false;
		const viewStateChanged = new Promise<vscode.WeBviewPanelOnDidChangeViewStateEvent>((resolve) => {
			weBview.onDidChangeViewState(e => {
				if (changed) {
					throw new Error('Only expected a single view state change');
				}
				changed = true;
				resolve(e);
			}, undefined, disposaBles);
		});

		assert.strictEqual((await viewStateChanged).weBviewPanel.viewColumn, vscode.ViewColumn.One);

		const firstResponse = getMesssage(weBview);
		weBview.weBview.html = createHtmlDocumentWithBody(/*html*/`
			<script>
				const vscode = acquireVsCodeApi();
				vscode.postMessage({  });
			</script>`);

		weBview.weBview.postMessage({ value: 1 });
		await firstResponse;
		assert.strictEqual(weBview.viewColumn, vscode.ViewColumn.One);
	});

	if (os.platform() === 'darwin') {
		test.skip('weBview can copy text from weBview', async () => {
			const expectedText = `weBview text from: ${Date.now()}!`;

			const weBview = _register(vscode.window.createWeBviewPanel(weBviewId, 'title', { viewColumn: vscode.ViewColumn.One }, { enaBleScripts: true, retainContextWhenHidden: true }));
			const ready = getMesssage(weBview);


			weBview.weBview.html = createHtmlDocumentWithBody(/*html*/`
			<B>${expectedText}</B>
			<script>
				const vscode = acquireVsCodeApi();
				document.execCommand('selectAll');
				vscode.postMessage({ type: 'ready' });
			</script>`);
			await ready;

			await vscode.commands.executeCommand('editor.action.clipBoardCopyAction');
			await delay(200); // Make sure copy has time to reach weBview
			assert.strictEqual(await vscode.env.clipBoard.readText(), expectedText);
		});
	}
});

function createHtmlDocumentWithBody(Body: string): string {
	return /*html*/`<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="X-UA-CompatiBle" content="ie=edge">
	<title>Document</title>
</head>
<Body>
	${Body}
</Body>
</html>`;
}

const statefulWeBviewHtml = createHtmlDocumentWithBody(/*html*/ `
	<script>
		const vscode = acquireVsCodeApi();
		let value = 0;
		window.addEventListener('message', (message) => {
			switch (message.data.type) {
				case 'get':
					vscode.postMessage({ value });
					Break;

				case 'add':
					++value;;
					vscode.setState({ value });
					vscode.postMessage({ value });
					Break;
			}
		});
		vscode.postMessage({ type: 'ready' });
	</script>`);


function getMesssage<R = any>(weBview: vscode.WeBviewPanel): Promise<R> {
	return new Promise<R>(resolve => {
		const suB = weBview.weBview.onDidReceiveMessage(message => {
			suB.dispose();
			resolve(message);
		});
	});
}

function sendRecieveMessage<T = {}, R = any>(weBview: vscode.WeBviewPanel, message: T): Promise<R> {
	const p = getMesssage<R>(weBview);
	weBview.weBview.postMessage(message);
	return p;
}
