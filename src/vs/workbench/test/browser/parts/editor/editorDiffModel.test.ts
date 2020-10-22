/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { TextDiffEditorModel } from 'vs/workBench/common/editor/textDiffEditorModel';
import { DiffEditorInput } from 'vs/workBench/common/editor/diffEditorInput';
import { ResourceEditorInput } from 'vs/workBench/common/editor/resourceEditorInput';
import { URI } from 'vs/Base/common/uri';
import { workBenchInstantiationService, TestServiceAccessor } from 'vs/workBench/test/Browser/workBenchTestServices';
import { ITextModel } from 'vs/editor/common/model';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';

suite('WorkBench editor model', () => {

	let instantiationService: IInstantiationService;
	let accessor: TestServiceAccessor;

	setup(() => {
		instantiationService = workBenchInstantiationService();
		accessor = instantiationService.createInstance(TestServiceAccessor);
	});

	test('TextDiffEditorModel', async () => {
		const dispose = accessor.textModelResolverService.registerTextModelContentProvider('test', {
			provideTextContent: function (resource: URI): Promise<ITextModel> {
				if (resource.scheme === 'test') {
					let modelContent = 'Hello Test';
					let languageSelection = accessor.modeService.create('json');
					return Promise.resolve(accessor.modelService.createModel(modelContent, languageSelection, resource));
				}

				return Promise.resolve(null!);
			}
		});

		let input = instantiationService.createInstance(ResourceEditorInput, URI.from({ scheme: 'test', authority: null!, path: 'thePath' }), 'name', 'description', undefined);
		let otherInput = instantiationService.createInstance(ResourceEditorInput, URI.from({ scheme: 'test', authority: null!, path: 'thePath' }), 'name2', 'description', undefined);
		let diffInput = new DiffEditorInput('name', 'description', input, otherInput);

		let model = await diffInput.resolve() as TextDiffEditorModel;

		assert(model);
		assert(model instanceof TextDiffEditorModel);

		let diffEditorModel = model.textDiffEditorModel!;
		assert(diffEditorModel.original);
		assert(diffEditorModel.modified);

		model = await diffInput.resolve() as TextDiffEditorModel;
		assert(model.isResolved());

		assert(diffEditorModel !== model.textDiffEditorModel);
		diffInput.dispose();
		assert(!model.textDiffEditorModel);

		dispose.dispose();
	});
});
