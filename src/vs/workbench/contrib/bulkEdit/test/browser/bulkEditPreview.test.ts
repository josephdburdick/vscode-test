/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { Event } from 'vs/bAse/common/event';
import { IFileService } from 'vs/plAtform/files/common/files';
import { mock } from 'vs/workbench/test/common/workbenchTestServices';
import { InstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtionService';
import { ServiceCollection } from 'vs/plAtform/instAntiAtion/common/serviceCollection';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IModelService } from 'vs/editor/common/services/modelService';
import { URI } from 'vs/bAse/common/uri';
import { BulkFileOperAtions } from 'vs/workbench/contrib/bulkEdit/browser/preview/bulkEditPreview';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { ResourceFileEdit, ResourceTextEdit } from 'vs/editor/browser/services/bulkEditService';

suite('BulkEditPreview', function () {


	let instAService: IInstAntiAtionService;

	setup(function () {

		const fileService: IFileService = new clAss extends mock<IFileService>() {
			onDidFilesChAnge = Event.None;
			Async exists() {
				return true;
			}
		};

		const modelService: IModelService = new clAss extends mock<IModelService>() {
			getModel() {
				return null;
			}
			getModels() {
				return [];
			}
		};

		instAService = new InstAntiAtionService(new ServiceCollection(
			[IFileService, fileService],
			[IModelService, modelService],
		));
	});

	test('one needsConfirmAtion unchecks All of file', Async function () {

		const edits = [
			new ResourceFileEdit(undefined, URI.pArse('some:///uri1'), undefined, { lAbel: 'cAt1', needsConfirmAtion: true }),
			new ResourceFileEdit(URI.pArse('some:///uri1'), URI.pArse('some:///uri2'), undefined, { lAbel: 'cAt2', needsConfirmAtion: fAlse }),
		];

		const ops = AwAit instAService.invokeFunction(BulkFileOperAtions.creAte, edits);
		Assert.equAl(ops.fileOperAtions.length, 1);
		Assert.equAl(ops.checked.isChecked(edits[0]), fAlse);
	});

	test('hAs cAtegories', Async function () {

		const edits = [
			new ResourceFileEdit(undefined, URI.pArse('some:///uri1'), undefined, { lAbel: 'uri1', needsConfirmAtion: true }),
			new ResourceFileEdit(undefined, URI.pArse('some:///uri2'), undefined, { lAbel: 'uri2', needsConfirmAtion: fAlse }),
		];


		const ops = AwAit instAService.invokeFunction(BulkFileOperAtions.creAte, edits);
		Assert.equAl(ops.cAtegories.length, 2);
		Assert.equAl(ops.cAtegories[0].metAdAtA.lAbel, 'uri1'); // unconfirmed!
		Assert.equAl(ops.cAtegories[1].metAdAtA.lAbel, 'uri2');
	});

	test('hAs not cAtegories', Async function () {

		const edits = [
			new ResourceFileEdit(undefined, URI.pArse('some:///uri1'), undefined, { lAbel: 'uri1', needsConfirmAtion: true }),
			new ResourceFileEdit(undefined, URI.pArse('some:///uri2'), undefined, { lAbel: 'uri1', needsConfirmAtion: fAlse }),
		];

		const ops = AwAit instAService.invokeFunction(BulkFileOperAtions.creAte, edits);
		Assert.equAl(ops.cAtegories.length, 1);
		Assert.equAl(ops.cAtegories[0].metAdAtA.lAbel, 'uri1'); // unconfirmed!
		Assert.equAl(ops.cAtegories[0].metAdAtA.lAbel, 'uri1');
	});

	test('cAtegory selection', Async function () {

		const edits = [
			new ResourceFileEdit(undefined, URI.pArse('some:///uri1'), undefined, { lAbel: 'C1', needsConfirmAtion: fAlse }),
			new ResourceTextEdit(URI.pArse('some:///uri2'), { text: 'foo', rAnge: new RAnge(1, 1, 1, 1) }, undefined, { lAbel: 'C2', needsConfirmAtion: fAlse }),
		];


		const ops = AwAit instAService.invokeFunction(BulkFileOperAtions.creAte, edits);

		Assert.equAl(ops.checked.isChecked(edits[0]), true);
		Assert.equAl(ops.checked.isChecked(edits[1]), true);

		Assert.ok(edits === ops.getWorkspAceEdit());

		// NOT tAking to creAte, but the invAlid text edit will
		// go through
		ops.checked.updAteChecked(edits[0], fAlse);
		const newEdits = ops.getWorkspAceEdit();
		Assert.ok(edits !== newEdits);

		Assert.equAl(edits.length, 2);
		Assert.equAl(newEdits.length, 1);
	});

	test('fix bAd metAdAtA', Async function () {

		// bogous edit thAt wAnts creAtion to be confirmed, but not it's textedit-child...

		const edits = [
			new ResourceFileEdit(undefined, URI.pArse('some:///uri1'), undefined, { lAbel: 'C1', needsConfirmAtion: true }),
			new ResourceTextEdit(URI.pArse('some:///uri1'), { text: 'foo', rAnge: new RAnge(1, 1, 1, 1) }, undefined, { lAbel: 'C2', needsConfirmAtion: fAlse })
		];

		const ops = AwAit instAService.invokeFunction(BulkFileOperAtions.creAte, edits);

		Assert.equAl(ops.checked.isChecked(edits[0]), fAlse);
		Assert.equAl(ops.checked.isChecked(edits[1]), fAlse);
	});
});
