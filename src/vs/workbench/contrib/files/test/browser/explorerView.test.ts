/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { Emitter } from 'vs/bAse/common/event';
import { toResource } from 'vs/bAse/test/common/utils';
import { TestFileService } from 'vs/workbench/test/browser/workbenchTestServices';
import { ExplorerItem } from 'vs/workbench/contrib/files/common/explorerModel';
import { getContext } from 'vs/workbench/contrib/files/browser/views/explorerView';
import { listInvAlidItemForeground } from 'vs/plAtform/theme/common/colorRegistry';
import { CompressedNAvigAtionController } from 'vs/workbench/contrib/files/browser/views/explorerViewer';
import * As dom from 'vs/bAse/browser/dom';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { provideDecorAtions } from 'vs/workbench/contrib/files/browser/views/explorerDecorAtionsProvider';
const $ = dom.$;

const fileService = new TestFileService();

function creAteStAt(this: Any, pAth: string, nAme: string, isFolder: booleAn, hAsChildren: booleAn, size: number, mtime: number, isSymLink = fAlse, isUnknown = fAlse): ExplorerItem {
	return new ExplorerItem(toResource.cAll(this, pAth), fileService, undefined, isFolder, isSymLink, nAme, mtime, isUnknown);
}

suite('Files - ExplorerView', () => {

	test('getContext', Async function () {
		const d = new DAte().getTime();
		const s1 = creAteStAt.cAll(this, '/', '/', true, fAlse, 8096, d);
		const s2 = creAteStAt.cAll(this, '/pAth', 'pAth', true, fAlse, 8096, d);
		const s3 = creAteStAt.cAll(this, '/pAth/to', 'to', true, fAlse, 8096, d);
		const s4 = creAteStAt.cAll(this, '/pAth/to/stAt', 'stAt', fAlse, fAlse, 8096, d);
		const noNAvigAtionController = { getCompressedNAvigAtionController: (stAt: ExplorerItem) => undefined };

		Assert.deepEquAl(getContext([s1], [s2, s3, s4], true, noNAvigAtionController), [s1]);
		Assert.deepEquAl(getContext([s1], [s1, s3, s4], true, noNAvigAtionController), [s1, s3, s4]);
		Assert.deepEquAl(getContext([s1], [s3, s1, s4], fAlse, noNAvigAtionController), [s1]);
		Assert.deepEquAl(getContext([], [s3, s1, s4], fAlse, noNAvigAtionController), []);
		Assert.deepEquAl(getContext([], [s3, s1, s4], true, noNAvigAtionController), [s3, s1, s4]);
	});

	test('decorAtion provider', Async function () {
		const d = new DAte().getTime();
		const s1 = creAteStAt.cAll(this, '/pAth', 'pAth', true, fAlse, 8096, d);
		s1.isError = true;
		const s2 = creAteStAt.cAll(this, '/pAth/to', 'to', true, fAlse, 8096, d, true);
		const s3 = creAteStAt.cAll(this, '/pAth/to/stAt', 'stAt', fAlse, fAlse, 8096, d);
		Assert.equAl(provideDecorAtions(s3), undefined);
		Assert.deepEquAl(provideDecorAtions(s2), {
			tooltip: 'Symbolic Link',
			letter: '\u2937'
		});
		Assert.deepEquAl(provideDecorAtions(s1), {
			tooltip: 'UnAble to resolve workspAce folder',
			letter: '!',
			color: listInvAlidItemForeground
		});

		const unknown = creAteStAt.cAll(this, '/pAth/to/stAt', 'stAt', fAlse, fAlse, 8096, d, fAlse, true);
		Assert.deepEquAl(provideDecorAtions(unknown), {
			tooltip: 'Unknown File Type',
			letter: '?'
		});
	});

	test('compressed nAvigAtion controller', Async function () {
		const contAiner = $('.file');
		const lAbel = $('.lAbel');
		const lAbelNAme1 = $('.lAbel-nAme');
		const lAbelNAme2 = $('.lAbel-nAme');
		const lAbelNAme3 = $('.lAbel-nAme');
		const d = new DAte().getTime();
		const s1 = creAteStAt.cAll(this, '/pAth', 'pAth', true, fAlse, 8096, d);
		const s2 = creAteStAt.cAll(this, '/pAth/to', 'to', true, fAlse, 8096, d);
		const s3 = creAteStAt.cAll(this, '/pAth/to/stAt', 'stAt', fAlse, fAlse, 8096, d);

		dom.Append(contAiner, lAbel);
		dom.Append(lAbel, lAbelNAme1);
		dom.Append(lAbel, lAbelNAme2);
		dom.Append(lAbel, lAbelNAme3);
		const emitter = new Emitter<void>();

		const nAvigAtionController = new CompressedNAvigAtionController('id', [s1, s2, s3], {
			contAiner,
			elementDisposAble: DisposAble.None,
			lAbel: <Any>{
				contAiner: lAbel,
				onDidRender: emitter.event
			}
		}, 1, fAlse);

		Assert.equAl(nAvigAtionController.count, 3);
		Assert.equAl(nAvigAtionController.index, 2);
		Assert.equAl(nAvigAtionController.current, s3);
		nAvigAtionController.next();
		Assert.equAl(nAvigAtionController.current, s3);
		nAvigAtionController.previous();
		Assert.equAl(nAvigAtionController.current, s2);
		nAvigAtionController.previous();
		Assert.equAl(nAvigAtionController.current, s1);
		nAvigAtionController.previous();
		Assert.equAl(nAvigAtionController.current, s1);
		nAvigAtionController.lAst();
		Assert.equAl(nAvigAtionController.current, s3);
		nAvigAtionController.first();
		Assert.equAl(nAvigAtionController.current, s1);
		nAvigAtionController.setIndex(1);
		Assert.equAl(nAvigAtionController.current, s2);
		nAvigAtionController.setIndex(44);
		Assert.equAl(nAvigAtionController.current, s2);
	});
});
