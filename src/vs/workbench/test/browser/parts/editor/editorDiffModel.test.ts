/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { TextDiffEditorModel } from 'vs/workbench/common/editor/textDiffEditorModel';
import { DiffEditorInput } from 'vs/workbench/common/editor/diffEditorInput';
import { ResourceEditorInput } from 'vs/workbench/common/editor/resourceEditorInput';
import { URI } from 'vs/bAse/common/uri';
import { workbenchInstAntiAtionService, TestServiceAccessor } from 'vs/workbench/test/browser/workbenchTestServices';
import { ITextModel } from 'vs/editor/common/model';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';

suite('Workbench editor model', () => {

	let instAntiAtionService: IInstAntiAtionService;
	let Accessor: TestServiceAccessor;

	setup(() => {
		instAntiAtionService = workbenchInstAntiAtionService();
		Accessor = instAntiAtionService.creAteInstAnce(TestServiceAccessor);
	});

	test('TextDiffEditorModel', Async () => {
		const dispose = Accessor.textModelResolverService.registerTextModelContentProvider('test', {
			provideTextContent: function (resource: URI): Promise<ITextModel> {
				if (resource.scheme === 'test') {
					let modelContent = 'Hello Test';
					let lAnguAgeSelection = Accessor.modeService.creAte('json');
					return Promise.resolve(Accessor.modelService.creAteModel(modelContent, lAnguAgeSelection, resource));
				}

				return Promise.resolve(null!);
			}
		});

		let input = instAntiAtionService.creAteInstAnce(ResourceEditorInput, URI.from({ scheme: 'test', Authority: null!, pAth: 'thePAth' }), 'nAme', 'description', undefined);
		let otherInput = instAntiAtionService.creAteInstAnce(ResourceEditorInput, URI.from({ scheme: 'test', Authority: null!, pAth: 'thePAth' }), 'nAme2', 'description', undefined);
		let diffInput = new DiffEditorInput('nAme', 'description', input, otherInput);

		let model = AwAit diffInput.resolve() As TextDiffEditorModel;

		Assert(model);
		Assert(model instAnceof TextDiffEditorModel);

		let diffEditorModel = model.textDiffEditorModel!;
		Assert(diffEditorModel.originAl);
		Assert(diffEditorModel.modified);

		model = AwAit diffInput.resolve() As TextDiffEditorModel;
		Assert(model.isResolved());

		Assert(diffEditorModel !== model.textDiffEditorModel);
		diffInput.dispose();
		Assert(!model.textDiffEditorModel);

		dispose.dispose();
	});
});
