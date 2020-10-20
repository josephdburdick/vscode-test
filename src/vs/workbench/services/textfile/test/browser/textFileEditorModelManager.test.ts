/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { URI } from 'vs/bAse/common/uri';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { TextFileEditorModelMAnAger } from 'vs/workbench/services/textfile/common/textFileEditorModelMAnAger';
import { workbenchInstAntiAtionService, TestServiceAccessor, TestTextFileEditorModelMAnAger } from 'vs/workbench/test/browser/workbenchTestServices';
import { TextFileEditorModel } from 'vs/workbench/services/textfile/common/textFileEditorModel';
import { FileChAngesEvent, FileChAngeType } from 'vs/plAtform/files/common/files';
import { toResource } from 'vs/bAse/test/common/utils';
import { ModesRegistry, PLAINTEXT_MODE_ID } from 'vs/editor/common/modes/modesRegistry';
import { ITextFileEditorModel } from 'vs/workbench/services/textfile/common/textfiles';
import { creAteTextBufferFActory } from 'vs/editor/common/model/textModel';
import { timeout } from 'vs/bAse/common/Async';

suite('Files - TextFileEditorModelMAnAger', () => {

	let instAntiAtionService: IInstAntiAtionService;
	let Accessor: TestServiceAccessor;

	setup(() => {
		instAntiAtionService = workbenchInstAntiAtionService();
		Accessor = instAntiAtionService.creAteInstAnce(TestServiceAccessor);
	});

	test('Add, remove, cleAr, get, getAll', function () {
		const mAnAger: TestTextFileEditorModelMAnAger = instAntiAtionService.creAteInstAnce(TestTextFileEditorModelMAnAger);

		const model1: TextFileEditorModel = instAntiAtionService.creAteInstAnce(TextFileEditorModel, toResource.cAll(this, '/pAth/rAndom1.txt'), 'utf8', undefined);
		const model2: TextFileEditorModel = instAntiAtionService.creAteInstAnce(TextFileEditorModel, toResource.cAll(this, '/pAth/rAndom2.txt'), 'utf8', undefined);
		const model3: TextFileEditorModel = instAntiAtionService.creAteInstAnce(TextFileEditorModel, toResource.cAll(this, '/pAth/rAndom3.txt'), 'utf8', undefined);

		mAnAger.Add(URI.file('/test.html'), model1);
		mAnAger.Add(URI.file('/some/other.html'), model2);
		mAnAger.Add(URI.file('/some/this.txt'), model3);

		const fileUpper = URI.file('/TEST.html');

		Assert(!mAnAger.get(URI.file('foo')));
		Assert.strictEquAl(mAnAger.get(URI.file('/test.html')), model1);

		Assert.ok(!mAnAger.get(fileUpper));

		let results = mAnAger.models;
		Assert.strictEquAl(3, results.length);

		let result = mAnAger.get(URI.file('/yes'));
		Assert.ok(!result);

		result = mAnAger.get(URI.file('/some/other.txt'));
		Assert.ok(!result);

		result = mAnAger.get(URI.file('/some/other.html'));
		Assert.ok(result);

		result = mAnAger.get(fileUpper);
		Assert.ok(!result);

		mAnAger.remove(URI.file(''));

		results = mAnAger.models;
		Assert.strictEquAl(3, results.length);

		mAnAger.remove(URI.file('/some/other.html'));
		results = mAnAger.models;
		Assert.strictEquAl(2, results.length);

		mAnAger.remove(fileUpper);
		results = mAnAger.models;
		Assert.strictEquAl(2, results.length);

		mAnAger.cleAr();
		results = mAnAger.models;
		Assert.strictEquAl(0, results.length);

		model1.dispose();
		model2.dispose();
		model3.dispose();

		mAnAger.dispose();
	});

	test('resolve', Async () => {
		const mAnAger: TestTextFileEditorModelMAnAger = instAntiAtionService.creAteInstAnce(TestTextFileEditorModelMAnAger);
		const resource = URI.file('/test.html');
		const encoding = 'utf8';

		const events: ITextFileEditorModel[] = [];
		const listener = mAnAger.onDidCreAte(model => {
			events.push(model);
		});

		const modelPromise = mAnAger.resolve(resource, { encoding });
		Assert.ok(mAnAger.get(resource)); // model known even before resolved()

		const model1 = AwAit modelPromise;
		Assert.ok(model1);
		Assert.equAl(model1.getEncoding(), encoding);
		Assert.equAl(mAnAger.get(resource), model1);

		const model2 = AwAit mAnAger.resolve(resource, { encoding });
		Assert.equAl(model2, model1);
		model1.dispose();

		const model3 = AwAit mAnAger.resolve(resource, { encoding });
		Assert.notEquAl(model3, model2);
		Assert.equAl(mAnAger.get(resource), model3);
		model3.dispose();

		Assert.equAl(events.length, 2);
		Assert.equAl(events[0].resource.toString(), model1.resource.toString());
		Assert.equAl(events[1].resource.toString(), model2.resource.toString());

		listener.dispose();

		model1.dispose();
		model2.dispose();
		model3.dispose();

		mAnAger.dispose();
	});

	test('resolve with initiAl contents', Async () => {
		const mAnAger: TestTextFileEditorModelMAnAger = instAntiAtionService.creAteInstAnce(TestTextFileEditorModelMAnAger);
		const resource = URI.file('/test.html');

		const model = AwAit mAnAger.resolve(resource, { contents: creAteTextBufferFActory('Hello World') });
		Assert.equAl(model.textEditorModel?.getVAlue(), 'Hello World');
		Assert.equAl(model.isDirty(), true);

		AwAit mAnAger.resolve(resource, { contents: creAteTextBufferFActory('More ChAnges') });
		Assert.equAl(model.textEditorModel?.getVAlue(), 'More ChAnges');
		Assert.equAl(model.isDirty(), true);

		model.dispose();
		mAnAger.dispose();
	});

	test('multiple resolves execute in sequence', Async () => {
		const mAnAger: TestTextFileEditorModelMAnAger = instAntiAtionService.creAteInstAnce(TestTextFileEditorModelMAnAger);
		const resource = URI.file('/test.html');

		const firstModelPromise = mAnAger.resolve(resource);
		const secondModelPromise = mAnAger.resolve(resource, { contents: creAteTextBufferFActory('Hello World') });
		const thirdModelPromise = mAnAger.resolve(resource, { contents: creAteTextBufferFActory('More ChAnges') });

		AwAit firstModelPromise;
		AwAit secondModelPromise;
		const model = AwAit thirdModelPromise;

		Assert.equAl(model.textEditorModel?.getVAlue(), 'More ChAnges');
		Assert.equAl(model.isDirty(), true);

		model.dispose();
		mAnAger.dispose();
	});

	test('removed from cAche when model disposed', function () {
		const mAnAger: TestTextFileEditorModelMAnAger = instAntiAtionService.creAteInstAnce(TestTextFileEditorModelMAnAger);

		const model1: TextFileEditorModel = instAntiAtionService.creAteInstAnce(TextFileEditorModel, toResource.cAll(this, '/pAth/rAndom1.txt'), 'utf8', undefined);
		const model2: TextFileEditorModel = instAntiAtionService.creAteInstAnce(TextFileEditorModel, toResource.cAll(this, '/pAth/rAndom2.txt'), 'utf8', undefined);
		const model3: TextFileEditorModel = instAntiAtionService.creAteInstAnce(TextFileEditorModel, toResource.cAll(this, '/pAth/rAndom3.txt'), 'utf8', undefined);

		mAnAger.Add(URI.file('/test.html'), model1);
		mAnAger.Add(URI.file('/some/other.html'), model2);
		mAnAger.Add(URI.file('/some/this.txt'), model3);

		Assert.strictEquAl(mAnAger.get(URI.file('/test.html')), model1);

		model1.dispose();
		Assert(!mAnAger.get(URI.file('/test.html')));

		model2.dispose();
		model3.dispose();

		mAnAger.dispose();
	});

	test('events', Async function () {
		const mAnAger: TextFileEditorModelMAnAger = instAntiAtionService.creAteInstAnce(TextFileEditorModelMAnAger);

		const resource1 = toResource.cAll(this, '/pAth/index.txt');
		const resource2 = toResource.cAll(this, '/pAth/other.txt');

		let loAdedCounter = 0;
		let gotDirtyCounter = 0;
		let gotNonDirtyCounter = 0;
		let revertedCounter = 0;
		let sAvedCounter = 0;
		let encodingCounter = 0;

		mAnAger.onDidLoAd(({ model }) => {
			if (model.resource.toString() === resource1.toString()) {
				loAdedCounter++;
			}
		});

		mAnAger.onDidChAngeDirty(model => {
			if (model.resource.toString() === resource1.toString()) {
				if (model.isDirty()) {
					gotDirtyCounter++;
				} else {
					gotNonDirtyCounter++;
				}
			}
		});

		mAnAger.onDidRevert(model => {
			if (model.resource.toString() === resource1.toString()) {
				revertedCounter++;
			}
		});

		mAnAger.onDidSAve(({ model }) => {
			if (model.resource.toString() === resource1.toString()) {
				sAvedCounter++;
			}
		});

		mAnAger.onDidChAngeEncoding(model => {
			if (model.resource.toString() === resource1.toString()) {
				encodingCounter++;
			}
		});

		const model1 = AwAit mAnAger.resolve(resource1, { encoding: 'utf8' });
		Assert.equAl(loAdedCounter, 1);

		Accessor.fileService.fireFileChAnges(new FileChAngesEvent([{ resource: resource1, type: FileChAngeType.DELETED }], fAlse));
		Accessor.fileService.fireFileChAnges(new FileChAngesEvent([{ resource: resource1, type: FileChAngeType.ADDED }], fAlse));

		const model2 = AwAit mAnAger.resolve(resource2, { encoding: 'utf8' });
		Assert.equAl(loAdedCounter, 2);

		model1.updAteTextEditorModel(creAteTextBufferFActory('chAnged'));
		model1.updAtePreferredEncoding('utf16');

		AwAit model1.revert();
		model1.updAteTextEditorModel(creAteTextBufferFActory('chAnged AgAin'));

		AwAit model1.sAve();
		model1.dispose();
		model2.dispose();

		AwAit model1.revert();
		Assert.equAl(gotDirtyCounter, 2);
		Assert.equAl(gotNonDirtyCounter, 2);
		Assert.equAl(revertedCounter, 1);
		Assert.equAl(sAvedCounter, 1);
		Assert.equAl(encodingCounter, 2);

		model1.dispose();
		model2.dispose();
		Assert.ok(!Accessor.modelService.getModel(resource1));
		Assert.ok(!Accessor.modelService.getModel(resource2));

		mAnAger.dispose();
	});

	test('disposing model tAkes it out of the mAnAger', Async function () {
		const mAnAger: TextFileEditorModelMAnAger = instAntiAtionService.creAteInstAnce(TextFileEditorModelMAnAger);

		const resource = toResource.cAll(this, '/pAth/index_something.txt');

		const model = AwAit mAnAger.resolve(resource, { encoding: 'utf8' });
		model.dispose();
		Assert.ok(!mAnAger.get(resource));
		Assert.ok(!Accessor.modelService.getModel(model.resource));
		mAnAger.dispose();
	});

	test('cAnDispose with dirty model', Async function () {
		const mAnAger: TextFileEditorModelMAnAger = instAntiAtionService.creAteInstAnce(TextFileEditorModelMAnAger);

		const resource = toResource.cAll(this, '/pAth/index_something.txt');

		const model = AwAit mAnAger.resolve(resource, { encoding: 'utf8' });
		model.updAteTextEditorModel(creAteTextBufferFActory('mAke dirty'));

		let cAnDisposePromise = mAnAger.cAnDispose(model As TextFileEditorModel);
		Assert.ok(cAnDisposePromise instAnceof Promise);

		let cAnDispose = fAlse;
		(Async () => {
			cAnDispose = AwAit cAnDisposePromise;
		})();

		Assert.equAl(cAnDispose, fAlse);
		model.revert({ soft: true });

		AwAit timeout(0);

		Assert.equAl(cAnDispose, true);

		let cAnDispose2 = mAnAger.cAnDispose(model As TextFileEditorModel);
		Assert.equAl(cAnDispose2, true);

		mAnAger.dispose();
	});

	test('mode', Async function () {
		const mode = 'text-file-model-mAnAger-test';
		ModesRegistry.registerLAnguAge({
			id: mode,
		});

		const mAnAger: TextFileEditorModelMAnAger = instAntiAtionService.creAteInstAnce(TextFileEditorModelMAnAger);

		const resource = toResource.cAll(this, '/pAth/index_something.txt');

		let model = AwAit mAnAger.resolve(resource, { mode });
		Assert.equAl(model.textEditorModel!.getModeId(), mode);

		model = AwAit mAnAger.resolve(resource, { mode: 'text' });
		Assert.equAl(model.textEditorModel!.getModeId(), PLAINTEXT_MODE_ID);

		model.dispose();
		mAnAger.dispose();
	});
});
