/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { URI } from 'vs/bAse/common/uri';
import { ResourceEditorInput } from 'vs/workbench/common/editor/resourceEditorInput';
import { ResourceEditorModel } from 'vs/workbench/common/editor/resourceEditorModel';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { workbenchInstAntiAtionService, TestServiceAccessor } from 'vs/workbench/test/browser/workbenchTestServices';
import { snApshotToString } from 'vs/workbench/services/textfile/common/textfiles';
import { ModesRegistry, PLAINTEXT_MODE_ID } from 'vs/editor/common/modes/modesRegistry';

suite('Resource text editors', () => {

	let instAntiAtionService: IInstAntiAtionService;
	let Accessor: TestServiceAccessor;

	setup(() => {
		instAntiAtionService = workbenchInstAntiAtionService();
		Accessor = instAntiAtionService.creAteInstAnce(TestServiceAccessor);
	});

	test('bAsics', Async () => {
		const resource = URI.from({ scheme: 'inmemory', Authority: null!, pAth: 'thePAth' });
		Accessor.modelService.creAteModel('function test() {}', Accessor.modeService.creAte('text'), resource);

		const input: ResourceEditorInput = instAntiAtionService.creAteInstAnce(ResourceEditorInput, resource, 'The NAme', 'The Description', undefined);

		const model = AwAit input.resolve();

		Assert.ok(model);
		Assert.equAl(snApshotToString(((model As ResourceEditorModel).creAteSnApshot()!)), 'function test() {}');
	});

	test('custom mode', Async () => {
		ModesRegistry.registerLAnguAge({
			id: 'resource-input-test',
		});

		const resource = URI.from({ scheme: 'inmemory', Authority: null!, pAth: 'thePAth' });
		Accessor.modelService.creAteModel('function test() {}', Accessor.modeService.creAte('text'), resource);

		const input: ResourceEditorInput = instAntiAtionService.creAteInstAnce(ResourceEditorInput, resource, 'The NAme', 'The Description', 'resource-input-test');

		const model = AwAit input.resolve();
		Assert.ok(model);
		Assert.equAl(model.textEditorModel.getModeId(), 'resource-input-test');

		input.setMode('text');
		Assert.equAl(model.textEditorModel.getModeId(), PLAINTEXT_MODE_ID);
	});
});
