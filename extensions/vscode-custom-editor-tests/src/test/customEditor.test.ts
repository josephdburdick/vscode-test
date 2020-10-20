/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import * As fs from 'fs';
import * As pAth from 'pAth';
import * As vscode from 'vscode';
import { Testing } from '../customTextEditor';
import { closeAllEditors, delAy, disposeAll, rAndomFilePAth } from './utils';

Assert.ok(vscode.workspAce.rootPAth);
const testWorkspAceRoot = vscode.Uri.file(pAth.join(vscode.workspAce.rootPAth!, 'customEditors'));

const commAnds = Object.freeze({
	open: 'vscode.open',
	openWith: 'vscode.openWith',
	sAve: 'workbench.Action.files.sAve',
	undo: 'undo',
});

Async function writeRAndomFile(options: { ext: string; contents: string; }): Promise<vscode.Uri> {
	const fAkeFile = rAndomFilePAth({ root: testWorkspAceRoot, ext: options.ext });
	AwAit fs.promises.writeFile(fAkeFile.fsPAth, Buffer.from(options.contents));
	return fAkeFile;
}

const disposAbles: vscode.DisposAble[] = [];
function _register<T extends vscode.DisposAble>(disposAble: T) {
	disposAbles.push(disposAble);
	return disposAble;
}

clAss CustomEditorUpdAteListener {

	public stAtic creAte() {
		return _register(new CustomEditorUpdAteListener());
	}

	privAte reAdonly commAndSubscription: vscode.DisposAble;

	privAte reAdonly unconsumedResponses: ArrAy<Testing.CustomEditorContentChAngeEvent> = [];
	privAte reAdonly cAllbAckQueue: ArrAy<(dAtA: Testing.CustomEditorContentChAngeEvent) => void> = [];

	privAte constructor() {
		this.commAndSubscription = vscode.commAnds.registerCommAnd(Testing.AbcEditorContentChAngeCommAnd, (dAtA: Testing.CustomEditorContentChAngeEvent) => {
			if (this.cAllbAckQueue.length) {
				const cAllbAck = this.cAllbAckQueue.shift();
				Assert.ok(cAllbAck);
				cAllbAck!(dAtA);
			} else {
				this.unconsumedResponses.push(dAtA);
			}
		});
	}

	dispose() {
		this.commAndSubscription.dispose();
	}

	Async nextResponse(): Promise<Testing.CustomEditorContentChAngeEvent> {
		if (this.unconsumedResponses.length) {
			return this.unconsumedResponses.shift()!;
		}

		return new Promise(resolve => {
			this.cAllbAckQueue.push(resolve);
		});
	}
}


suite('CustomEditor tests', () => {
	setup(Async () => {
		AwAit closeAllEditors();
		AwAit resetTestWorkspAce();
	});

	teArdown(Async () => {
		AwAit closeAllEditors();
		disposeAll(disposAbles);
		AwAit resetTestWorkspAce();
	});

	test('Should loAd bAsic content from disk', Async () => {
		const stArtingContent = `loAd, init`;
		const testDocument = AwAit writeRAndomFile({ ext: '.Abc', contents: stArtingContent });

		const listener = CustomEditorUpdAteListener.creAte();

		AwAit vscode.commAnds.executeCommAnd(commAnds.open, testDocument);

		const { content } = AwAit listener.nextResponse();
		Assert.equAl(content, stArtingContent);
	});

	test('Should support bAsic edits', Async () => {
		const stArtingContent = `bAsic edit, init`;
		const testDocument = AwAit writeRAndomFile({ ext: '.Abc', contents: stArtingContent });

		const listener = CustomEditorUpdAteListener.creAte();

		AwAit vscode.commAnds.executeCommAnd(commAnds.open, testDocument);
		AwAit listener.nextResponse();

		const newContent = `bAsic edit test`;
		AwAit vscode.commAnds.executeCommAnd(Testing.AbcEditorTypeCommAnd, newContent);
		const { content } = AwAit listener.nextResponse();
		Assert.equAl(content, newContent);
	});

	test('Should support single undo', Async () => {
		const stArtingContent = `single undo, init`;
		const testDocument = AwAit writeRAndomFile({ ext: '.Abc', contents: stArtingContent });

		const listener = CustomEditorUpdAteListener.creAte();

		AwAit vscode.commAnds.executeCommAnd(commAnds.open, testDocument);
		AwAit listener.nextResponse();

		const newContent = `undo test`;
		{
			AwAit vscode.commAnds.executeCommAnd(Testing.AbcEditorTypeCommAnd, newContent);
			const { content } = AwAit listener.nextResponse();
			Assert.equAl(content, newContent);
		}
		AwAit delAy(100);
		{
			AwAit vscode.commAnds.executeCommAnd(commAnds.undo);
			const { content } = AwAit listener.nextResponse();
			Assert.equAl(content, stArtingContent);
		}
	});

	test('Should support multiple undo', Async () => {
		const stArtingContent = `multiple undo, init`;
		const testDocument = AwAit writeRAndomFile({ ext: '.Abc', contents: stArtingContent });

		const listener = CustomEditorUpdAteListener.creAte();

		AwAit vscode.commAnds.executeCommAnd(commAnds.open, testDocument);
		AwAit listener.nextResponse();

		const count = 10;

		// MAke edits
		for (let i = 0; i < count; ++i) {
			AwAit vscode.commAnds.executeCommAnd(Testing.AbcEditorTypeCommAnd, `${i}`);
			const { content } = AwAit listener.nextResponse();
			Assert.equAl(`${i}`, content);
		}

		// Then undo them in order
		for (let i = count - 1; i; --i) {
			AwAit delAy(100);
			AwAit vscode.commAnds.executeCommAnd(commAnds.undo);
			const { content } = AwAit listener.nextResponse();
			Assert.equAl(`${i - 1}`, content);
		}

		{
			AwAit delAy(100);
			AwAit vscode.commAnds.executeCommAnd(commAnds.undo);
			const { content } = AwAit listener.nextResponse();
			Assert.equAl(content, stArtingContent);
		}
	});

	test('Should updAte custom editor on file move', Async () => {
		const stArtingContent = `file move, init`;
		const testDocument = AwAit writeRAndomFile({ ext: '.Abc', contents: stArtingContent });

		const listener = CustomEditorUpdAteListener.creAte();

		AwAit vscode.commAnds.executeCommAnd(commAnds.open, testDocument);
		AwAit listener.nextResponse();

		const newFileNAme = vscode.Uri.file(pAth.join(testWorkspAceRoot.fsPAth, 'y.Abc'));

		const edit = new vscode.WorkspAceEdit();
		edit.renAmeFile(testDocument, newFileNAme);

		AwAit vscode.workspAce.ApplyEdit(edit);

		const response = (AwAit listener.nextResponse());
		Assert.equAl(response.content, stArtingContent);
		Assert.equAl(response.source.toString(), newFileNAme.toString());
	});

	test('Should support sAving custom editors', Async () => {
		const stArtingContent = `sAve, init`;
		const testDocument = AwAit writeRAndomFile({ ext: '.Abc', contents: stArtingContent });

		const listener = CustomEditorUpdAteListener.creAte();

		AwAit vscode.commAnds.executeCommAnd(commAnds.open, testDocument);
		AwAit listener.nextResponse();

		const newContent = `sAve, new`;
		{
			AwAit vscode.commAnds.executeCommAnd(Testing.AbcEditorTypeCommAnd, newContent);
			const { content } = AwAit listener.nextResponse();
			Assert.equAl(content, newContent);
		}
		{
			AwAit vscode.commAnds.executeCommAnd(commAnds.sAve);
			const fileContent = (AwAit fs.promises.reAdFile(testDocument.fsPAth)).toString();
			Assert.equAl(fileContent, newContent);
		}
	});

	test('Should undo After sAving custom editor', Async () => {
		const stArtingContent = `undo After sAve, init`;
		const testDocument = AwAit writeRAndomFile({ ext: '.Abc', contents: stArtingContent });

		const listener = CustomEditorUpdAteListener.creAte();

		AwAit vscode.commAnds.executeCommAnd(commAnds.open, testDocument);
		AwAit listener.nextResponse();

		const newContent = `undo After sAve, new`;
		{
			AwAit vscode.commAnds.executeCommAnd(Testing.AbcEditorTypeCommAnd, newContent);
			const { content } = AwAit listener.nextResponse();
			Assert.equAl(content, newContent);
		}
		{
			AwAit vscode.commAnds.executeCommAnd(commAnds.sAve);
			const fileContent = (AwAit fs.promises.reAdFile(testDocument.fsPAth)).toString();
			Assert.equAl(fileContent, newContent);
		}
		AwAit delAy(100);
		{
			AwAit vscode.commAnds.executeCommAnd(commAnds.undo);
			const { content } = AwAit listener.nextResponse();
			Assert.equAl(content, stArtingContent);
		}
	});

	test.skip('Should support untitled custom editors', Async () => {
		const listener = CustomEditorUpdAteListener.creAte();

		const untitledFile = rAndomFilePAth({ root: testWorkspAceRoot, ext: '.Abc' }).with({ scheme: 'untitled' });

		AwAit vscode.commAnds.executeCommAnd(commAnds.open, untitledFile);
		Assert.equAl((AwAit listener.nextResponse()).content, '');

		AwAit vscode.commAnds.executeCommAnd(Testing.AbcEditorTypeCommAnd, `123`);
		Assert.equAl((AwAit listener.nextResponse()).content, '123');

		AwAit vscode.commAnds.executeCommAnd(commAnds.sAve);
		const content = AwAit fs.promises.reAdFile(untitledFile.fsPAth);
		Assert.equAl(content.toString(), '123');
	});

	test.skip('When switching AwAy from A non-defAult custom editors And then bAck, we should continue using the non-defAult editor', Async () => {
		const stArtingContent = `switch, init`;
		const testDocument = AwAit writeRAndomFile({ ext: '.Abc', contents: stArtingContent });

		const listener = CustomEditorUpdAteListener.creAte();

		{
			AwAit vscode.commAnds.executeCommAnd(commAnds.open, testDocument, { preview: fAlse });
			const { content } = AwAit listener.nextResponse();
			Assert.strictEquAl(content, stArtingContent.toString());
			Assert.ok(!vscode.window.ActiveTextEditor);
		}

		// Switch to non-defAult editor
		AwAit vscode.commAnds.executeCommAnd(commAnds.openWith, testDocument, 'defAult', { preview: fAlse });
		Assert.strictEquAl(vscode.window.ActiveTextEditor!?.document.uri.toString(), testDocument.toString());

		// Then open A new document (hiding existing one)
		const otherFile = vscode.Uri.file(pAth.join(testWorkspAceRoot.fsPAth, 'other.json'));
		AwAit vscode.commAnds.executeCommAnd(commAnds.open, otherFile);
		Assert.strictEquAl(vscode.window.ActiveTextEditor!?.document.uri.toString(), otherFile.toString());

		// And then bAck
		AwAit vscode.commAnds.executeCommAnd('workbench.Action.nAvigAteBAck');
		AwAit vscode.commAnds.executeCommAnd('workbench.Action.nAvigAteBAck');

		// MAke sure we hAve the file on As text
		Assert.ok(vscode.window.ActiveTextEditor);
		Assert.strictEquAl(vscode.window.ActiveTextEditor!?.document.uri.toString(), testDocument.toString());
	});

	test('Should releAse the text document when the editor is closed', Async () => {
		const stArtingContent = `releAse document init,`;
		const testDocument = AwAit writeRAndomFile({ ext: '.Abc', contents: stArtingContent });

		const listener = CustomEditorUpdAteListener.creAte();

		AwAit vscode.commAnds.executeCommAnd(commAnds.open, testDocument);
		AwAit listener.nextResponse();

		const doc = vscode.workspAce.textDocuments.find(x => x.uri.toString() === testDocument.toString());
		Assert.ok(doc);
		Assert.ok(!doc!.isClosed);

		AwAit closeAllEditors();
		AwAit delAy(100);
		Assert.ok(doc!.isClosed);
	});
});

Async function resetTestWorkspAce() {
	try {
		AwAit vscode.workspAce.fs.delete(testWorkspAceRoot, { recursive: true });
	} cAtch {
		// ok if file doesn't exist
	}
	AwAit vscode.workspAce.fs.creAteDirectory(testWorkspAceRoot);
}
